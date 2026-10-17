import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatch, codeHash, isCorrect } from '../supabase/functions/_shared/domain.mjs';
import { seed } from '../supabase/functions/_shared/seed.mjs';
const pepper = 'test-secret';
const ctx = { pepper, client: 'test-client', now: 1000000 };
async function setup() { const state = seed(); state.assessments[1].accessHash = await codeHash('АКАДЕМИЯ', pepper); return state; }
const examInput = { assessmentId: 'exam-demo', code: 'АКАДЕМИЯ', fullName: 'Иван Иванов', rank: 'Рядовой', certificate: '123-456' };

test('public catalog and in-progress attempt never expose answer keys or access hash', async () => {
  const state = await setup(); const catalog = await dispatch(state, 'catalog', {}, ctx);
  assert.ok(catalog.assessments.every(a => !('accessHash' in a) && a.questionIds === undefined));
  const start = await dispatch(state, 'attempt.start', examInput, ctx);
  assert.ok(start.attempt.questions.every(q => !('correct' in q) && !('explanation' in q)));
  assert.equal(start.attempt.tokenHash, undefined);
});
test('admin operations reject unauthenticated access', async () => {
  const state = await setup();
  for (const action of ['admin.data', 'admin.saveQuestion', 'admin.delete']) await assert.rejects(dispatch(state, action, {}, ctx), e => e.status === 401);
});
test('code validation, certificate and throttling are enforced by the server', async () => {
  const state = await setup();
  assert.equal((await dispatch(state, 'attempt.start', { ...examInput, code: 'wrong' }, ctx)).status, 403);
  await assert.rejects(dispatch(state, 'attempt.start', { ...examInput, certificate: '123-4567' }, ctx), /123-456/);
  for (let n = 0; n < 10; n++) await dispatch(state, 'attempt.start', { ...examInput, code: 'wrong' }, ctx);
  assert.equal((await dispatch(state, 'attempt.start', examInput, ctx)).status, 429);
  assert.equal(state.attempts.length, 0);
});
test('tokens protect attempts; server computes score and completion is idempotent', async () => {
  const state = await setup(); const { attempt, token } = await dispatch(state, 'attempt.start', examInput, ctx);
  await assert.rejects(dispatch(state, 'attempt.get', { id: attempt.id, token: 'wrong' }, ctx), e => e.status === 404);
  const privateAttempt = state.attempts[0];
  for (let i = 0; i < privateAttempt.questions.length; i++) await dispatch(state, 'attempt.answer', { id: attempt.id, token, index: i, answer: privateAttempt.questions[i].correct }, ctx);
  const result = await dispatch(state, 'attempt.finish', { id: attempt.id, token, score: 0 }, { ...ctx, now: ctx.now + 12000 });
  assert.equal(result.attempt.score, 100); assert.equal(privateAttempt.passed, true); assert.equal(privateAttempt.timeSpent, 12);
  await dispatch(state, 'attempt.answer', { id: attempt.id, token, index: 0, answer: 0 }, ctx);
  const again = await dispatch(state, 'attempt.finish', { id: attempt.id, token }, ctx);
  assert.equal(again.attempt.score, 100); assert.equal(state.attempts.length, 1);
});
test('time limit is authoritative and abandoned attempts expire', async () => {
  const state = await setup(); const result = await dispatch(state, 'attempt.start', examInput, ctx);
  const after = { ...ctx, now: result.attempt.deadline + 999999 };
  await dispatch(state, 'catalog', {}, after);
  const finished = await dispatch(state, 'attempt.answer', { id: result.attempt.id, token: result.token, index: 0, answer: 0 }, after);
  assert.equal(finished.attempt.status, 'expired'); assert.equal(finished.attempt.score, 0); assert.equal(state.attempts[0].timeSpent, 600);
});
test('editing or deleting a question cannot alter historical attempt snapshots', async () => {
  const state = await setup(); await dispatch(state, 'attempt.start', examInput, ctx);
  const snapshot = structuredClone(state.attempts[0].questions);
  await dispatch(state, 'admin.saveQuestion', { ...state.questions[0], text: 'Изменённый вопрос' }, { ...ctx, admin: true });
  assert.deepEqual(state.attempts[0].questions, snapshot);
  await assert.rejects(dispatch(state, 'admin.delete', { collection: 'questions', id: 'q1' }, { ...ctx, admin: true }), /используется/);
});
test('public practice is saved without employee identity', async () => {
  const state = await setup(); const start = await dispatch(state, 'attempt.start', { assessmentId: 'practice-demo' }, ctx);
  assert.equal(start.attempt.cadet, null); assert.equal(start.attempt.type, 'test');
  const end = await dispatch(state, 'attempt.finish', { id: start.attempt.id, token: start.token }, ctx);
  assert.equal(end.attempt.questions, undefined);
});

test('completed public results expose only score; full answers stay admin-only for exams and tests', async () => {
  for (const type of ['exam', 'test']) {
    const state = await setup();
    const start = await dispatch(state, 'attempt.start', type === 'exam' ? examInput : { assessmentId: 'practice-demo' }, ctx);
    const credentials = { id: start.attempt.id, token: start.token };
    for (const action of ['attempt.finish', 'attempt.get', 'attempt.answer']) {
      const result = await dispatch(state, action, { ...credentials, index: 0, answer: 0 }, ctx);
      assert.deepEqual(Object.keys(result.attempt).sort(), ['id', 'title', 'type', 'status', 'score'].sort());
      assert.equal(result.attempt.questions, undefined); assert.equal(result.attempt.answers, undefined);
    }
    const admin = await dispatch(state, 'admin.data', {}, { ...ctx, admin: true });
    assert.equal(admin.attempts[0].answers.length, 3);
    assert.ok(admin.attempts[0].questions.every(q => Number.isInteger(q.correct) && q.explanation === undefined));
  }
});
test('structured legislation and charter preserve groups, article fields and order', async () => {
  const state = await setup(), admin = { ...ctx, admin: true };
  for (const section of ['legislation', 'charter']) {
    const result = await dispatch(state, 'admin.saveMaterial', {
      section, title: 'Документ', published: true,
      groups: [{ title: 'Общие положения', articles: [{ num: '1.1', title: 'Статья', text: 'Текст', part2: 'Часть 2', hint: 'Примечание', severity: 'Норма', penalty: 'Штраф', tags: ['служба'], isFsoMain: true }] }, { title: 'Глава 2', articles: [] }]
    }, admin);
    const catalog = await dispatch(state, 'catalog', {}, ctx);
    const saved = catalog.materials.find(m => m.id === result.id);
    assert.equal(saved.groups[0].articles[0].num, '1.1'); assert.deepEqual(Object.keys(saved.groups[0].articles[0]).sort(), ['id','num','title','text','important'].sort());
    assert.equal(saved.groups[1].title, 'Глава 2'); assert.ok(saved.groups[0].articles[0].id);
    await assert.rejects(dispatch(state, 'admin.saveMaterial', { section, title: 'Пустая статья', published: true, groups: [{ title: 'Блок', articles: [{ num: '1', title: 'Нет текста' }] }] }, admin), /Краткая расшифровка/);
  }
});
test('instruction blocks are validated, persisted and unsafe images are rejected', async () => {
  const state = await setup(), admin = { ...ctx, admin: true };
  const blocks = [{ type: 'title', content: 'Инструкция' }, { type: 'text', content: 'Текст' }, { type: 'steps', title: 'Порядок', steps: ['Первый', 'Второй'] }, { type: 'list', items: ['А', 'Б'] }, { type: 'warning', content: 'Внимание' }, { type: 'info', content: 'Справка' }, { type: 'danger', content: 'Опасно' }, { type: 'image', src: 'https://example.com/image.png', alt: 'Схема' }, { type: 'divider' }];
  const m = await dispatch(state, 'admin.saveMaterial', { section: 'instructions', title: 'Инструкция', blocks, published: true }, admin);
  assert.deepEqual(m.blocks, [{ type: 'title', content: 'Инструкция' }, { type: 'text', content: 'Текст' }, { type: 'steps', title: 'Порядок', steps: ['Первый', 'Второй'] }, { type: 'list', title: '', items: ['А', 'Б'] }, ...blocks.slice(4)]);
  for (const src of ['javascript:alert(1)', 'data:image/svg+xml;base64,AAAA', 'file:///etc/passwd']) await assert.rejects(dispatch(state, 'admin.saveMaterial', { section: 'instructions', title: 'Bad', blocks: [{ type: 'image', src }] }, admin), /HTTPS/);
  assert.equal((await dispatch(state, 'catalog', {}, ctx)).materials.find(x => x.id === m.id).blocks.length, 9);
  // Legacy plain-text records remain valid and visible.
  assert.ok((await dispatch(state, 'catalog', {}, ctx)).materials.some(x => x.id === 'welcome' && x.body));
});
test('admin can create materials, questions and coded exams; hashes are never returned', async () => {
  const state = await setup(), admin = { ...ctx, admin: true };
  const material = await dispatch(state, 'admin.saveMaterial', { section: 'instructions', title: 'Пост', body: '<script>example</script>', published: false }, admin);
  const q = await dispatch(state, 'admin.saveQuestion', { topic: 'Пост', text: 'Вопрос?', options: ['Да', 'Нет'], correct: 0 }, admin);
  const a = await dispatch(state, 'admin.saveAssessment', { type: 'exam', title: 'Новый', questionIds: [q.id], questionCount: 1, timeLimit: 5, passingScore: 80, code: 'SECRET777', published: true }, admin);
  const data = await dispatch(state, 'admin.data', {}, admin);
  assert.equal(data.assessments.find(item => item.id === a.id).accessHash, undefined);
  assert.equal(data.assessments.find(item => item.id === a.id).hasCode, true);
  assert.ok(!(await dispatch(state, 'catalog', {}, ctx)).materials.some(m => m.id === material.id));
});

test('department restrictions are enforced on the server and legacy exams allow all four', async () => {
  const state = await setup(), admin = { ...ctx, admin: true };
  const assessment = await dispatch(state, 'admin.saveAssessment', { type: 'exam', title: 'СБП и АС', departments: ['sbp','as'], questionIds: ['q1'], questionCount: 1, timeLimit: 5, passingScore: 70, code: 'SECRET777', published: true }, admin);
  const input = { ...examInput, assessmentId: assessment.id, code: 'SECRET777' };
  for (const department of ['academy','kmk','unknown','']) await assert.rejects(dispatch(state,'attempt.start',{...input,department},ctx),err=>err.status===403);
  const start=await dispatch(state,'attempt.start',{...input,department:'sbp'},ctx);
  assert.equal(start.attempt.cadet.department,'sbp');
  assert.deepEqual((await dispatch(state,'catalog',{},ctx)).assessments.find(a=>a.id==='exam-demo').departments,['sbp','as','academy','kmk']);
  await assert.rejects(dispatch(state,'admin.saveAssessment',{...state.assessments.find(a=>a.id===assessment.id),departments:[]},admin),/отдел/);
});
test('multiple-choice scoring requires the full correct set and rejects duplicate or invalid answers', async () => {
  const state=await setup(),admin={...ctx,admin:true};
  const q=await dispatch(state,'admin.saveQuestion',{type:'multiple',topic:'Тест',text:'Выберите два',options:['А','Б','В'],correct:[0,2]},admin);
  assert.equal(isCorrect(q,[2,0]),true);assert.equal(isCorrect(q,[0]),false);assert.equal(isCorrect(q,[0,1,2]),false);
  const a=await dispatch(state,'admin.saveAssessment',{type:'test',title:'Множественный',questionIds:[q.id],questionCount:1,timeLimit:5,passingScore:100,published:true},admin);
  const start=await dispatch(state,'attempt.start',{assessmentId:a.id},ctx),input={id:start.attempt.id,token:start.token,index:0};
  assert.equal(start.attempt.questions[0].correct,undefined);
  for(const answer of [[0,0],[3],[null]])await assert.rejects(dispatch(state,'attempt.answer',{...input,answer},ctx));
  await dispatch(state,'attempt.answer',{...input,answer:[2,0]},ctx);
  assert.equal((await dispatch(state,'attempt.finish',input,ctx)).attempt.score,100);
});
test('matching shuffles definitions, accepts partial pairs, rejects duplicates and grades full pairs', async () => {
  const state=await setup(),admin={...ctx,admin:true};
  const q=await dispatch(state,'admin.saveQuestion',{type:'matching',topic:'Тест',text:'Сопоставьте',left:['А','Б','В'],right:['Один','Два','Три'],correct:[2,0,1]},admin);
  const a=await dispatch(state,'admin.saveAssessment',{type:'test',title:'Соответствия',questionIds:[q.id],questionCount:1,timeLimit:5,passingScore:100,published:true},admin);
  const start=await dispatch(state,'attempt.start',{assessmentId:a.id},ctx),input={id:start.attempt.id,token:start.token,index:0};
  const snapshot=state.attempts[0].questions[0];
  assert.equal(start.attempt.questions[0].correct,undefined);
  const pairs = { А: 'Три', Б: 'Один', В: 'Два' };
  assert.deepEqual([...snapshot.left].sort(), [...q.left].sort());
  snapshot.left.forEach((term,i)=>assert.equal(snapshot.right[snapshot.correct[i]],pairs[term]));
  await dispatch(state,'attempt.answer',{...input,answer:[snapshot.correct[0],null,null]},ctx);
  assert.equal(isCorrect(snapshot,state.attempts[0].answers[0]),false);
  await assert.rejects(dispatch(state,'attempt.answer',{...input,answer:[0,0,null]},ctx),/один раз/);
  await assert.rejects(dispatch(state,'attempt.answer',{...input,answer:[0]},ctx),/число/);
  await dispatch(state,'attempt.answer',{...input,answer:snapshot.correct},ctx);
  assert.equal((await dispatch(state,'attempt.finish',input,ctx)).attempt.score,100);
});
test('organization saves director, deputies, subdivisions and ranks', async()=>{
  const state=await setup(),admin={...ctx,admin:true};
  const organization={director:{title:'Директор',name:'Иван Иванов',rank:'Полковник',duties:'Руководство'},departments:[{name:'Академия',head:{name:'Пётр Петров'},deputies:[{title:'Заместитель',name:'Анна'}],subdivisions:[{name:'Учебный отдел',head:{name:'Игорь'},deputies:[]}]}],ranks:['Рядовой','Полковник']};
  const saved=await dispatch(state,'admin.saveMaterial',{section:'structure',title:'Структура',organization,published:true},admin);
  const visible=(await dispatch(state,'catalog',{},ctx)).materials.find(m=>m.id===saved.id).organization;
  assert.equal(visible.director.name,'Иван Иванов');assert.equal(visible.departments[0].deputies[0].name,'Анна');assert.equal(visible.departments[0].subdivisions[0].head.name,'Игорь');
});

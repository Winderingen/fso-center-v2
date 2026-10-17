import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatch, isCorrect } from '../supabase/functions/_shared/domain.mjs';
import { seed } from '../supabase/functions/_shared/seed.mjs';
import { renderQuestion, answerComplete, formatAnswer, reviewQuestion, questionTypes, questionSaveError } from '../site/js/questions.js';
const admin={admin:true,pepper:'editor-tests',client:'admin'}, guest={...admin,admin:false,client:'guest'};
test('server advertises the editor question types and explains an old backend rejection',async()=>{
  const state=seed();const catalog=await dispatch(state,'catalog',{},guest);
  const data=await dispatch(state,'admin.data',{},admin);
  assert.deepEqual(catalog.capabilities.questionTypes,Object.keys(questionTypes));
  assert.deepEqual(data.capabilities.questionTypes,catalog.capabilities.questionTypes);
  assert.equal(data.apiVersion,catalog.apiVersion);
  assert.match(questionSaveError(new Error('Неизвестный тип вопроса'),'sequence'),/Обновите функцию Supabase fso-api/);
  assert.equal(questionSaveError(new Error('Ошибка сети'),'sequence'),'Ошибка сети');
});

test('incomplete document drafts persist privately and require complete fields when published',async()=>{
  const state=seed();
  const document=await dispatch(state,'admin.saveMaterial',{section:'legislation',title:'Черновой кодекс',published:false,groups:[{title:'',articles:[{num:'',title:'',text:''}]}]},admin);
  assert.ok(document.id);
  assert.equal((await dispatch(state,'catalog',{},guest)).materials.some(m=>m.id===document.id),false);
  assert.equal((await dispatch(state,'admin.data',{},admin)).materials.find(m=>m.id===document.id).groups[0].articles[0].text,'');
  await assert.rejects(dispatch(state,'admin.saveMaterial',{...document,published:true},admin),/Название раздела/);
  const instruction=await dispatch(state,'admin.saveMaterial',{section:'instructions',title:'Черновая инструкция',published:false,blocks:[{type:'text',content:''},{type:'image',src:''}]},admin);
  await assert.rejects(dispatch(state,'admin.saveMaterial',{...instruction,published:true},admin),/Содержание блока/);
});

test('sequence interface renders reorder controls and reports employee order in admin review',()=>{
  const q={type:'sequence',options:['Осмотреть','Доложить'],correct:[1,0],images:[]};
  const html=renderQuestion(q,null);
  assert.ok(html.includes('data-sequence-position="0"'));
  assert.ok(html.includes('data-sequence-action="confirm"'));
  assert.equal(answerComplete(q,null),false);
  assert.equal(answerComplete(q,[1,0]),true);
  assert.equal(formatAnswer(q,[1,0]),'1. Доложить\n2. Осмотреть');
  assert.ok(reviewQuestion(q,[0,1]).includes('Ошибка'));
  assert.ok(reviewQuestion(q,[1,0]).includes('Верно'));
});

test('action sequences shuffle snapshots, validate permutations and grade exact order without public keys',async()=>{
  const state=seed(), steps=['Принять задачу','Проверить оснащение','Приступить к выполнению','Доложить'];
  const q=await dispatch(state,'admin.saveQuestion',{type:'sequence',topic:'Порядок',text:'Расставьте действия',options:steps,correct:[3,2,1,0]},admin);
  assert.deepEqual(q.correct,[0,1,2,3]);
  const a=await dispatch(state,'admin.saveAssessment',{type:'test',title:'Порядок',questionIds:[q.id],questionCount:1,timeLimit:5,passingScore:100,published:true},admin);
  const start=await dispatch(state,'attempt.start',{assessmentId:a.id},guest), snapshot=state.attempts[0].questions[0], input={id:start.attempt.id,token:start.token,index:0};
  assert.equal(start.attempt.questions[0].correct,undefined);
  assert.deepEqual(snapshot.correct.map(i=>snapshot.options[i]),steps);
  await assert.rejects(dispatch(state,'attempt.answer',{...input,answer:[0,0,2,3]},guest),/ровно один раз/);
  await assert.rejects(dispatch(state,'attempt.answer',{...input,answer:[0,1]},guest),/ровно один раз/);
  assert.equal(isCorrect(snapshot,[...snapshot.correct].reverse()),false);
  await dispatch(state,'attempt.answer',{...input,answer:snapshot.correct},guest);
  assert.equal((await dispatch(state,'attempt.finish',input,guest)).attempt.score,100);
  assert.equal((await dispatch(state,'attempt.get',input,guest)).attempt.questions,undefined);
  assert.deepEqual(q.options,steps);
});

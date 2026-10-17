export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (message, status = 400) => { throw new HttpError(status, message); };
const str = (v, max = 1000) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const required = (v, label, max = 1000) => { const s = str(v, max); if (!s) fail(`Заполните поле «${label}»`); return s; };
const num = (v, lo, hi, label) => { const n = Number(v); if (v === null || v === '' || typeof v === 'boolean' || !Number.isInteger(n) || n < lo || n > hi) fail(`Недопустимое значение: ${label}`); return n; };
export const DEPARTMENTS = ['sbp', 'as', 'academy', 'kmk'];
export const QUESTION_TYPES = ['single', 'multiple', 'matching', 'sequence'];
export const API_VERSION = '2026-10-17-new.1';
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
}
// Hashes verify admission; stored codes are returned only through authenticated admin.data.
export const codeHash = (code, pepper) => digest(`${pepper}\0${str(code, 128)}`);
const publicAssessment = ({ accessHash, accessCode, blocks, ...item }) => ({ ...item, departments: item.departments || DEPARTMENTS, questionIds: undefined });
const publicQuestion = ({ correct, explanation, ...item }) => item;
const adminQuestion = ({ explanation, ...item }) => item;
const shuffle = items => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
    const j = bytes[0] % (i + 1); [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
function throttle(state, key, limit, now) {
  const slots = state.throttle;
  for (const [k, v] of Object.entries(slots)) if (now - v.since > 3600000) delete slots[k];
  const bucket = slots[key];
  if (!bucket || now - bucket.since > 600000) slots[key] = { since: now, count: 1 };
  else { bucket.count++; if (bucket.count > limit) return false; }
  return true;
}
function finalize(attempt, now) {
  if (attempt.status !== 'in_progress') return;
  const correct = attempt.questions.filter((q, i) => isCorrect(q, attempt.answers[i])).length;
  attempt.score = Math.round(correct * 100 / attempt.questions.length);
  attempt.correct = correct;
  attempt.passed = attempt.score >= attempt.passingScore;
  attempt.status = now >= attempt.deadline ? 'expired' : 'completed';
  attempt.finishedAt = Math.min(now, attempt.deadline);
  attempt.timeSpent = Math.max(0, Math.floor((attempt.finishedAt - attempt.startedAt) / 1000));
}
function attemptView(attempt, admin = false) {
  if (!admin && attempt.status !== 'in_progress') {
    return { id: attempt.id, title: attempt.title, type: attempt.type, status: attempt.status, score: attempt.score };
  }
  const { tokenHash, ...safe } = attempt;
  return { ...safe, questions: attempt.questions.map(q => admin ? adminQuestion(q) : publicQuestion(q)) };
}
export async function dispatch(state, action, input, ctx) {
  normalizeCategories(state);
  const now = ctx.now ?? Date.now();
  // Persist timed-out attempts even when the examinee never submits.
  for (const attempt of state.attempts) if (attempt.status === 'in_progress' && now >= attempt.deadline) finalize(attempt, now);
  if (action === 'auth.gate') return throttle(state, `login:${ctx.client}`, 10, now) ? { ok: true } : { error: 'Слишком много попыток входа. Повторите через 10 минут.', status: 429 };
  if (action === 'catalog') return {
    apiVersion: API_VERSION, capabilities: { questionTypes: [...QUESTION_TYPES], resultManagement: 2 },
    materials: state.materials.filter(m => m.published),
    assessments: state.assessments.filter(a => a.published).map(publicAssessment),
    serverTime: now
  };
  if (action.startsWith('admin.')) {
    if (!ctx.admin) fail('Требуется вход администратора', 401);
    if (action === 'admin.data') return {
      apiVersion: API_VERSION, capabilities: { resultManagement: 2, questionTypes: [...QUESTION_TYPES] },
      materials: state.materials, categories: state.categories, questions: state.questions.map(adminQuestion),
      assessments: state.assessments.map(({ accessHash, ...item }) => ({ ...item, hasCode: !!accessHash })),
      attempts: state.attempts.map(a => attemptView(a, true))
    };
    if (action === 'admin.saveCategory') {
      const category = { id: str(input.id) || crypto.randomUUID(), title: required(input.title, 'Название категории', 200) };
      if (state.categories.some(c => c.id !== category.id && c.title.toLocaleLowerCase('ru') === category.title.toLocaleLowerCase('ru'))) fail('Категория с таким названием уже существует');
      upsert(state.categories, category);
      state.questions.filter(q => q.categoryId === category.id).forEach(q => q.topic = category.title);
      return category;
    }
    if (action === 'admin.generateCode') {
      const bytes = new Uint8Array(12); crypto.getRandomValues(bytes);
      return { code: [...bytes].map(v => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v % 32]).join('') };
    }
    if (action === 'admin.saveMaterial') {
      const m = { id: str(input.id) || crypto.randomUUID(), section: str(input.section), title: required(input.title, 'Название', 200), body: str(input.body, 50000), published: !!input.published, updatedAt: now };
      if (!['legislation', 'charter', 'instructions', 'structure'].includes(m.section)) fail('Неизвестный раздел');
      if (['legislation', 'charter'].includes(m.section)) {
        m.groups = list(input.groups || [], 100, 'разделов').map(g => ({ id: str(g.id) || crypto.randomUUID(), title: m.published ? required(g.title, 'Название раздела', 200) : str(g.title,200), articles: list(g.articles || [], 200, 'статей').map(a => ({ id: str(a.id) || crypto.randomUUID(), num: m.published ? required(a.num, 'Номер статьи', 80) : str(a.num,80), title: m.published ? required(a.title, 'Название статьи', 200) : str(a.title,200), text: m.published ? required(a.text, 'Краткая расшифровка', 20000) : str(a.text,20000), important: !!a.important, ...(a.parts === undefined ? {} : {parts: list(a.parts,200,'частей статьи').map(p=>({id:str(p.id)||crypto.randomUUID(),num:m.published?required(p.num,'Номер части',80):str(p.num,80),title:str(p.title,200),text:m.published?required(p.text,'Текст части',20000):str(p.text,20000)}))}) })) }));
      }
      if (m.section === 'instructions') m.blocks = list(input.blocks || [], 100, 'блоков инструкции').map(b=>validateBlock(b,!m.published));
      if (m.section === 'structure' && input.organization) m.organization = validateOrganization(input.organization);
      if (m.published && m.section !== 'legislation' && !m.body && !(m.groups?.length) && !(m.blocks?.length) && !m.organization) fail('Добавьте текст, блоки или статьи');
      upsert(state.materials, m); return m;
    }
    if (action === 'admin.saveQuestion') {
      const category = state.categories.find(c => c.id === input.categoryId);
      if (input.categoryId && !category) fail('Категория не найдена');
      const q = validateQuestion({ ...input, topic: category?.title || input.topic });
      if (category) q.categoryId = category.id;
      else { let c = state.categories.find(c => c.title === q.topic); if (!c) { c = { id: crypto.randomUUID(), title: q.topic }; state.categories.push(c); } q.categoryId = c.id; }
      const previous=state.questions.find(item=>item.id===q.id);
      if(previous && previous.categoryId!==q.categoryId && state.assessments.some(a=>a.blocks ? a.blocks.some(b=>b.categoryId===previous.categoryId && blockPool(state,b).some(item=>item.id===q.id)) : a.questionIds?.includes(q.id))) fail('Вопрос используется в блоке проверки. Сначала уберите его из состава, затем измените категорию.');
      upsert(state.questions, q); return q;
    }
    if (action === 'admin.saveAssessment') {
      const old = state.assessments.find(a => a.id === input.id);
      const blocks = input.blocks ? validateComposition(state, input.blocks, input.type) : undefined;
      const questionIds = blocks ? [...new Set(blocks.flatMap(b => blockPool(state, b).map(q => q.id)))] : [...new Set(Array.isArray(input.questionIds) ? input.questionIds : [])];
      if (!questionIds.length || questionIds.some(id => !state.questions.some(q => q.id === id))) fail('Выберите существующие вопросы');
      if (!['test', 'exam'].includes(input.type)) fail('Неизвестный тип проверки');
      const a = { id: str(input.id) || crypto.randomUUID(), type: input.type, title: required(input.title, 'Название', 200), description: str(input.description, 2000), questionIds, questionCount: num(input.questionCount, 1, questionIds.length, 'количество вопросов'), timeLimit: num(input.timeLimit, 1, 180, 'время'), passingScore: num(input.passingScore, 0, 100, 'проходной балл'), published: !!input.published };
      if (blocks) { a.blocks = blocks; a.questionCount = blocks.reduce((n,b) => n + b.count, 0); a.categoryId = a.type === 'test' ? blocks[0].categoryId : undefined; }
      else if (a.type === 'test' && new Set(questionIds.map(id => state.questions.find(q => q.id === id).categoryId)).size > 1) fail('Тренировочный тест должен содержать вопросы одной категории');
      if (a.type === 'exam') {
        a.departments = [...new Set(list(input.departments || DEPARTMENTS, 4, 'отделов'))];
        if (!a.departments.length || a.departments.some(d => !DEPARTMENTS.includes(d))) fail('Выберите один или несколько отделов');
        if (str(input.code)) { if (str(input.code).length < 6) fail('Кодовое слово должно содержать минимум 6 символов'); a.accessCode = str(input.code,128); a.accessHash = await codeHash(input.code, ctx.pepper); }
        else { a.accessHash = old?.accessHash || ''; a.accessCode = old?.accessCode; }
        if (!a.accessHash) fail('Задайте кодовое слово для экзамена');
      }
      upsert(state.assessments, a); return { id: a.id };
    }
    if (action === 'admin.finishAttempt') {
      const attempt = state.attempts.find(a => a.id === input.id);
      if (!attempt) fail('Попытка не найдена', 404);
      if (attempt.status === 'in_progress') { finalize(attempt, now); attempt.finishedBy = 'admin'; }
      return { ok: true, attempt: attemptView(attempt, true) };
    }
    if (action === 'admin.delete') {
      if (!['materials', 'questions', 'assessments', 'categories', 'attempts'].includes(input.collection)) fail('Нельзя удалить эту запись');
      if (input.collection === 'attempts') {
        const attempt = state.attempts.find(a => a.id === input.id);
        if (!attempt) fail('Попытка не найдена', 404);
        // Finalize and remove in the same transaction; the old token cannot resume it.
        if (attempt.status === 'in_progress') finalize(attempt, now);
      }
      if (input.collection === 'categories' && (state.questions.some(q=>q.categoryId===input.id) || state.assessments.some(a=>a.blocks?.some(b=>b.categoryId===input.id)))) fail('Сначала уберите вопросы и проверки из категории');
      if (input.collection === 'questions' && state.assessments.some(a => a.blocks ? a.blocks.some(b => blockPool(state,b).some(q=>q.id===input.id)) : a.questionIds.includes(input.id))) fail('Вопрос используется в тесте или экзамене. Сначала уберите его из состава.');
      state[input.collection] = state[input.collection].filter(item => item.id !== input.id); return { ok: true };
    }
  }
  if (action === 'attempt.start') {
    const a = state.assessments.find(a => a.id === input.assessmentId && a.published);
    if (!a) fail('Проверка недоступна', 404);
    if (!throttle(state, `start:${ctx.client}`, 30, now)) return { error: 'Слишком много запусков. Повторите через 10 минут.', status: 429 };
    let cadet = null, instructor = null;
    if (a.type === 'exam') {
      const department = input.department || (a.departments ? '' : 'academy');
      if (!DEPARTMENTS.includes(department) || !(a.departments || DEPARTMENTS).includes(department)) fail('Экзамен недоступен выбранному отделу', 403);
      if (!throttle(state, `code:${ctx.client}`, 10, now)) return { error: 'Превышен лимит ввода кода. Повторите через 10 минут.', status: 429 };
      if (await codeHash(input.code, ctx.pepper) !== a.accessHash) return { error: 'Неверное кодовое слово', status: 403 };
      cadet = { fullName: required(input.fullName, 'ФИО', 150), rank: required(input.rank, 'Звание', 80), certificate: required(input.certificate, 'Номер удостоверения', 30), department };
      if (!/^\d{3}-\d{3}$/.test(cadet.certificate)) fail('Удостоверение должно иметь формат 123-456');
      const fullName = str(input.instructorFullName, 150), certificate = str(input.instructorCertificate, 30);
      if (certificate && !/^\d{3}-\d{3}$/.test(certificate)) fail('Жетон инструктора должен иметь формат 123-456');
      if (fullName || certificate) instructor = { fullName, certificate };
    }
    const pool = a.blocks ? a.blocks.flatMap(b => { const pool = blockPool(state,b); if(pool.length < b.count) fail('Недостаточно вопросов в категории. Обратитесь к администратору.'); return b.mode === 'random' ? shuffle(pool).slice(0,b.count) : pool; }) : shuffle(a.questionIds.map(id => state.questions.find(q => q.id === id)).filter(Boolean)).slice(0,a.questionCount);
    const questions = shuffle(pool).map(q => {
      const copy = structuredClone(q);
      if (q.type === 'matching') { const order = shuffle(q.right.map((_, i) => i)), leftOrder = shuffle(q.left.map((_,i)=>i)); copy.left = leftOrder.map(i=>q.left[i]); copy.right = order.map(i => q.right[i]); copy.correct = leftOrder.map(i => order.indexOf(q.correct[i])); }
      if (q.type === 'sequence') { const order = shuffle(q.options.map((_,i)=>i)); copy.options = order.map(i=>q.options[i]); copy.correct = q.correct.map(i=>order.indexOf(i)); }
      return copy;
    });
    if (questions.length !== a.questionCount) fail('Недостаточно вопросов. Обратитесь к администратору.');
    const token = crypto.randomUUID() + crypto.randomUUID();
    const attempt = { id: crypto.randomUUID(), tokenHash: await digest(token), assessmentId: a.id, title: a.title, type: a.type, cadet, instructor, questions: structuredClone(questions), answers: questions.map(() => null), passingScore: a.passingScore, startedAt: now, deadline: now + a.timeLimit * 60000, status: 'in_progress' };
    state.attempts.push(attempt); return { token, attempt: attemptView(attempt), serverTime: now };
  }
  if (['attempt.get', 'attempt.answer', 'attempt.finish'].includes(action)) {
    const tokenHash = await digest(str(input.token, 100));
    const attempt = state.attempts.find(a => a.id === input.id && a.tokenHash === tokenHash);
    if (!attempt) fail('Попытка не найдена', 404);
    if (attempt.status === 'in_progress' && action === 'attempt.answer') {
      const index = num(input.index, 0, attempt.questions.length - 1, 'номер вопроса');
      attempt.answers[index] = validateAnswer(attempt.questions[index], input.answer);
    }
    if (action === 'attempt.finish') finalize(attempt, now);
    return { attempt: attemptView(attempt), serverTime: now };
  }
  fail('Неизвестная операция', 404);
}
function upsert(items, item) { const i = items.findIndex(x => x.id === item.id); if (i < 0) items.push(item); else items[i] = item; }
function list(value, max, label) { if (!Array.isArray(value) || value.length > max) fail(`Допустимо не более ${max} ${label}`); return value; }
function validateBlock(b, partial = false) {
  const content = (value,label,max) => partial ? str(value,max) : required(value,label,max);
  const type = str(b.type);
  if (['title', 'text', 'warning', 'info', 'danger'].includes(type)) return { type, content: content(b.content, 'Содержание блока', 20000) };
  if (['steps', 'list'].includes(type)) {
    const key = type === 'steps' ? 'steps' : 'items';
    const items = list(b[key] || [], 100, 'пунктов').map(v => content(v, 'Пункт', 2000));
    if (!partial && !items.length) fail('Добавьте пункты списка');
    return { type, title: str(b.title, 200), [key]: items };
  }
  if (type === 'divider') return { type };
  if (type === 'image') {
    const src = content(b.src, 'Изображение', 700000);
    if ((!partial || src) && !/^https:\/\/[^\s]+$/i.test(src) && !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src)) fail('Изображение: используйте HTTPS-ссылку или файл PNG/JPEG/WebP/GIF');
    return { type, src, alt: str(b.alt, 300) };
  }
  fail('Неизвестный тип блока инструкции');
}
export function isCorrect(q, answer) {
  if (answer === null || answer === undefined) return false;
  if (q.type === 'multiple') return Array.isArray(answer) && [...answer].sort((a,b) => a-b).join(',') === [...q.correct].sort((a,b) => a-b).join(',');
  if (['matching','sequence'].includes(q.type)) return Array.isArray(answer) && answer.length === q.correct.length && q.correct.every((v,i) => answer[i] === v);
  return answer === q.correct;
}
function validateAnswer(q, answer) {
  if (q.type === 'sequence') { const values = list(answer, q.options.length, 'шагов').map(v => num(v, 0, q.options.length - 1, 'шаг')); if (values.length !== q.options.length || new Set(values).size !== values.length) fail('Укажите каждый шаг ровно один раз'); return values; }
  if (q.type === 'multiple') { const values = list(answer, q.options.length, 'ответов').map(v => num(v, 0, q.options.length - 1, 'ответ')); if (new Set(values).size !== values.length) fail('Варианты не должны повторяться'); return values; }
  if (q.type === 'matching') { const values = list(answer, q.left.length, 'соответствий'); if (values.length !== q.left.length) fail('Неверное число соответствий'); const indices = values.map(v => v === null ? null : num(v, 0, q.right.length - 1, 'соответствие')); const chosen = indices.filter(v => v !== null); if (new Set(chosen).size !== chosen.length) fail('Каждое определение используется один раз'); return indices; }
  return num(answer, 0, q.options.length - 1, 'ответ');
}
function validateQuestion(input) {
  const type = input.type || 'single';
  if (!QUESTION_TYPES.includes(type)) fail('Неизвестный тип вопроса');
  const q = { id: str(input.id) || crypto.randomUUID(), type, topic: required(input.topic, 'Тема', 200), text: required(input.text, 'Вопрос', 3000), images: list(input.images || [], 6, 'изображений').map(image => validateBlock({ ...image, type: 'image' })) };
  if (type === 'matching') {
    q.left = list(input.left, 10, 'терминов').map(v => required(v, 'Термин', 1000));
    q.right = list(input.right, 10, 'определений').map(v => required(v, 'Определение', 2000));
    if (q.left.length < 2 || q.left.length !== q.right.length) fail('Нужно от 2 до 10 пар терминов и определений');
    q.correct = validateAnswer(q, input.correct);
    if (q.correct.some(v => v === null)) fail('Задайте соответствие для каждого термина');
  } else {
    q.options = list(input.options, 12, 'вариантов').map(v => required(v, 'Вариант ответа', 1000));
    if (q.options.length < 2) fail('Нужно минимум 2 варианта ответа');
    q.correct = type === 'sequence' ? q.options.map((_,i)=>i) : type === 'multiple' ? validateAnswer(q, input.correct) : num(input.correct, 0, q.options.length - 1, 'правильный ответ');
    if (type === 'multiple' && !q.correct.length) fail('Отметьте правильные варианты');
  }
  return q;
}
function validateOrganization(org) {
  const person = (p, rank) => { const certificate = str(p?.certificate,30); if(certificate && !/^\d{3}-\d{3}$/.test(certificate)) fail('Удостоверение должностного лица должно иметь формат 123-456'); return { title: str(p?.title,200), name: str(p?.name,150), rank: rank ?? required(p?.rank || 'Генерал-майор','Звание начальника ФСО',100), certificate, duties: str(p?.duties,3000) }; };
  const department = (d, sub = false) => ({ id: str(d.id) || crypto.randomUUID(), name: required(d.name, 'Название подразделения', 200), description: str(d.description, 3000), tasks: str(d.tasks, 5000), head: person(d.head, sub ? 'Майор' : 'Подполковник'), deputies: list(d.deputies || [], 20, 'заместителей').map(p=>person(p,sub ? str(p.rank,100) : 'Майор')), ...(sub ? {} : { subdivisions: list(d.subdivisions || [], 30, 'подразделений').map(s => department(s, true)) }) });
  return { director: person(org.director), deputies: list(org.deputies || [],20,'заместителей начальника ФСО').map(p=>person(p,'Полковник')), departments: list(org.departments || [], 30, 'управлений').map(d => department(d)), ranks: list(org.ranks || [], 60, 'строк званий').map(v => required(v, 'Звание', 200)) };
}

function normalizeCategories(state) {
  state.categories ||= [];
  for(const q of state.questions) if(!state.categories.some(c=>c.id===q.categoryId)) { let c=state.categories.find(c=>c.title===q.topic); if(!c) { c={id:crypto.randomUUID(),title:q.topic||'Без категории'}; state.categories.push(c); } q.categoryId=c.id; }
  for(const a of state.assessments) if(a.type==='test'&&!a.blocks){const pools=state.categories.map(c=>({categoryId:c.id,questionIds:(a.questionIds||[]).filter(id=>state.questions.some(q=>q.id===id&&q.categoryId===c.id))})).filter(b=>b.questionIds.length).sort((x,y)=>y.questionIds.length-x.questionIds.length);if(pools.length>1){const b=pools[0];a.blocks=[{...b,mode:'random',count:Math.min(a.questionCount,b.questionIds.length)}];a.questionCount=a.blocks[0].count;a.questionIds=b.questionIds;a.categoryId=b.categoryId;}}
  const demo=state.materials.find(m=>m.id==='law-demo'&&m.title==='Законодательная база игрового сервера');
  if(demo && (!demo.groups?.length || demo.groups.every(g=>['Уголовный Кодекс','КоАП'].includes(g.title)&&!g.articles.length))){demo.title='Уголовный кодекс — учебный пример';demo.groups=[];if(!state.materials.some(m=>m.id==='law-demo-koap'))state.materials.push({...structuredClone(demo),id:'law-demo-koap',title:'КоАП — учебный пример'});}
}
function blockPool(state,b) { return state.questions.filter(q=>q.categoryId===b.categoryId && (b.mode==='random'||b.questionIds.includes(q.id))); }
function validateComposition(state, input, type) {
  const categories=new Set();
  const blocks=list(input,100,'блоков').map(b=>{
    if(!state.categories.some(c=>c.id===b.categoryId)||categories.has(b.categoryId)) fail('Выберите существующие категории без повторений');
    categories.add(b.categoryId);
    if(!['manual','random'].includes(b.mode)) fail('Выберите способ отбора вопросов');
    const questionIds=[...new Set(list(b.questionIds||[],1000,'вопросов'))];
    const block={categoryId:b.categoryId,mode:b.mode,questionIds};
    const pool=blockPool(state,block);
    if(b.mode==='manual' && (!questionIds.length||pool.length!==questionIds.length)) fail('Выберите вопросы из соответствующей категории');
    block.count=b.mode==='manual'?questionIds.length:num(b.count,1,pool.length,'число случайных вопросов в блоке');
    return block;
  });
  if(!blocks.length) fail('Добавьте хотя бы один блок');
  if(type==='test' && blocks.length!==1) fail('Тренировочный тест создаётся по одной категории');
  return blocks;
}

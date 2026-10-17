import { api, mode, adminToken, setAdmin } from './api.js';
import { renderMaterial, materialSearchText, mountMaterialEditor } from './materials.js';
import { departments, questionTypes, mountQuestionEditor, renderQuestion, bindMatching, answerComplete, reviewQuestion } from './questions.js';
import { mountComposition } from './composition.js';

const $ = selector => document.querySelector(selector);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sections = { legislation: 'Законодательство', charter: 'Устав организации', instructions: 'Служебные инструкции', structure: 'Структура' };
const ranks = ['Рядовой', 'Ефрейтор', 'Младший сержант', 'Сержант', 'Старший сержант', 'Старшина', 'Прапорщик', 'Старший прапорщик', 'Младший лейтенант', 'Лейтенант', 'Старший лейтенант', 'Капитан', 'Майор', 'Подполковник', 'Полковник', 'Генерал-майор'];
let catalog, adminData, adminTab = 'results', attempt, attemptToken, questionIndex = 0, timer, offset = 0, routeVersion = 0, busy = false, modalReturnFocus;
let materialCategory='legislation', questionCategory='';
const content = $('#contentArea');
const button = (text, action, id = '', cls = 'btn-outline') => `<button class="btn ${cls}" data-action="${action}" data-id="${e(id)}">${text}</button>`;
const heading = (title, description = '') => `<h2>${title}</h2><p class="subtitle">${description}</p>`;
const date = value => new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
const status = a => a.status === 'in_progress' ? 'В процессе' : `${a.passed ? 'Сдано' : 'Не сдано'}${a.status === 'expired' ? ' · время истекло' : ''}${a.finishedBy === 'admin' ? ' · завершено администратором' : ''}`;
function toast(message) { const node = document.createElement('div'); node.className = 'toast'; node.textContent = message; $('#notifications').append(node); setTimeout(() => node.remove(), 5500); }
let modalDirty = false;
function requestCloseModal() { if (!modalDirty || confirm("Закрыть окно без сохранения изменений?")) closeModal(); }
function closeModal() { modalDirty = false; $('#modalOverlay').classList.remove('show'); modalReturnFocus?.focus(); }
function modal(title, html) {
  modalDirty = false; modalReturnFocus = document.activeElement;
  $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html; $('#modalOverlay').classList.add('show');
  $('#modalBody').querySelector('input, textarea, select, button')?.focus();
}
function form(html, submitText = 'Сохранить') { return `<form class="trial-form">${html}<p class="error-message" role="alert"></p><button class="btn btn-primary" type="submit">${submitText}</button></form>`; }
function field(label, name, value = '', type = 'text', extra = '') { return `<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`; }
function textarea(label, name, value = '', extra = '') { return `<label>${label}<textarea name="${name}" ${extra}>${e(value)}</textarea></label>`; }
function select(label, name, options, selected) { return `<label>${label}<select name="${name}">${options.map(([value, text]) => `<option value="${e(value)}" ${value === selected ? 'selected' : ''}>${e(text)}</option>`).join('')}</select></label>`; }
const checkbox = (label, name, checked) => `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>${label}</label>`;
function onForm(handler) {
  const f = $('#modalBody form');
  f.addEventListener('submit', async event => {
    event.preventDefault(); const btn = f.querySelector('[type=submit]'); btn.disabled = true; f.querySelector('.error-message').textContent = '';
    try { await handler(new FormData(f), f); }
    catch (error) { f.querySelector('.error-message').textContent = error.message; }
    finally { btn.disabled = false; }
  });
}
async function refreshCatalog() {
  const result = await api('catalog');
  if (mode === 'supabase' && window.FSO_CONFIG.expectedApiVersion && result.apiVersion !== window.FSO_CONFIG.expectedApiVersion) throw new Error('Версии сайта и API не совпадают. Запустите Publish FSO Center в новом репозитории и дождитесь завершения всех шагов.');
  catalog = result;
}
function userBar() { $('#userName').textContent = adminToken() ? sessionStorage.getItem('fso_admin_name') || 'Администратор' : 'Посетитель'; $('#userRole').textContent = adminToken() ? 'Администратор' : 'Открытый доступ'; }
function currentRoute() { return location.hash.slice(1) || 'home'; }
async function route() {
  const version = ++routeVersion; clearInterval(timer);
  const page = currentRoute().split('/')[0];
  document.querySelectorAll('.nav-item').forEach(link => link.classList.toggle('active', link.hash === `#${page}`));
  userBar();
  try {
    if (!catalog) { content.innerHTML = '<p class="empty">Загрузка…</p>'; await refreshCatalog(); if (version !== routeVersion) return; }
    if (page === 'home') renderHome();
    else if (sections[page]) { if(adminToken()) {adminData=await api('admin.data');if(version!==routeVersion)return;} renderMaterials(page); }
    else if (page === 'tests' || page === 'exams') renderAssessments(page === 'tests' ? 'test' : 'exam');
    else if (page === 'admin') {
      if (!adminToken()) return renderLogin();
      content.innerHTML = '<p class="empty">Загрузка кабинета…</p>';
      adminData = await api('admin.data'); if (version !== routeVersion) return; renderAdmin();
    } else if (page === 'attempt') {
      content.innerHTML = '<p class="empty">Восстановление попытки…</p>';
      const saved = JSON.parse(sessionStorage.getItem('fso_attempt') || 'null');
      if (!saved) { content.innerHTML = heading('Нет активной попытки') + '<a class="btn btn-primary" href="#exams">Выбрать экзамен</a>'; return; }
      const result = await api('attempt.get', saved); if (version !== routeVersion) return;
      attemptToken = saved.token; acceptAttempt(result); renderAttempt();
    } else renderHome();
  } catch (error) { content.innerHTML = heading('Не удалось загрузить страницу') + `<div class="note">${e(error.message)}</div>${button('Повторить', 'reload', '', 'btn-primary')}`; userBar(); }
}
function renderHome() {
  const countTests = catalog.assessments.filter(a => a.type === 'test').length;
  const countExams = catalog.assessments.filter(a => a.type === 'exam').length;
  content.innerHTML = `<section class="hero"><img class="hero-seal" src="assets/emblem.svg" alt=""><div class="eyebrow">Управление ФСО РФ по АФО<br>Учебный и справочный центр</div><h1>Справочно-экзаменационная<br><span>система</span></h1><p>Единое пространство знаний и подготовки сотрудников. Изучайте нормативные материалы, совершенствуйте навыки и подтверждайте готовность к службе.</p><div class="actions"><a class="btn btn-gold" href="#tests">Начать подготовку →</a><a class="btn btn-outline" href="#exams">Перейти к экзаменам</a></div><div class="hero-tags"><span>Служба</span><span>Знания</span><span>Подготовка</span></div></section>
    ${sessionStorage.getItem('fso_attempt') ? `<div class="note">Последняя попытка доступна на этом устройстве. <a href="#attempt">Открыть попытку →</a></div>` : ''}
    <div class="grid"><article class="trial-card portal-card"><div class="portal-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3V4Zm9 2v15M6 8h3m6 0h3M6 12h3m6 0h3"/></svg></div><div class="card-number">${catalog.materials.length}</div><h3>Справочные материалы</h3><p>Законодательство игрового сервера, устав и порядок выполнения служебных задач.</p><a class="btn btn-outline" href="#instructions">Открыть справочник</a></article><article class="trial-card portal-card"><div class="portal-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m2 8 10-5 10 5-10 5-10-5Zm5 3v7c3 3 7 3 10 0v-7m5-3v9"/></svg></div><div class="card-number">${countTests}</div><h3>Тренировочные тесты</h3><p>Проверьте знания без регистрации. После завершения увидите процент результата.</p><a class="btn btn-outline" href="#tests">Выбрать тест</a></article><article class="trial-card portal-card"><div class="portal-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h14v18H5V4Zm4-2h6v4H9V2Zm-1 9 2 2 5-5m-7 9h8"/></svg></div><div class="card-number">${countExams}</div><h3>Экзамены</h3><p>Допуск по кодовому слову. Укажите данные персонажа — система сохранит вашу попытку.</p><a class="btn btn-outline" href="#exams">Выбрать экзамен</a></article></div>
    <div class="note">Материалы и вопросы с пометкой «демонстрационный» служат для проверки системы. Администратор может заменить их правилами вашей организации.${mode === 'local' ? '<br>Локальный запуск: данные сохраняются на этом компьютере, а не в браузере.' : ''}</div>`;
}
function renderMaterials(section) {
  const all=(adminToken()?adminData.materials:catalog.materials).filter(m=>m.section===section);
  const codeId=currentRoute().split('/')[1],selected=all.find(m=>m.id===codeId)||all[0];
  content.innerHTML = heading(sections[section], section==='legislation'?'Выберите кодекс, затем откройте его разделы и статьи.':'Материалы игровой организации') + (adminToken()?`<div class="actions">${button(section==='legislation'?'+ Создать кодекс':'+ Добавить материал','new-reference',section,'btn-primary')}</div>`:'') + (section==='legislation'?`<nav class="admin-tabs code-tabs" aria-label="Кодексы">${all.map(m=>`<a class="btn btn-outline ${selected?.id===m.id?'active':''}" href="#legislation/${e(m.id)}">${e(m.title)}${m.published?'':' · черновик'}</a>`).join('')}</nav>`:'') + `<div class="toolbar"><input id="materialSearch" placeholder="Поиск по названию и тексту" aria-label="Поиск материалов"></div><div id="materialList"></div>`;
  const update = () => {
    const term = $('#materialSearch').value.toLocaleLowerCase('ru');
    const items = all.filter(m => (section!=='legislation'||m.id===selected?.id) && materialSearchText(m).toLocaleLowerCase('ru').includes(term));
    $('#materialList').innerHTML = items.length ? items.map(m=>renderMaterial(m,!!adminToken())).join('') : '<p class="empty">Материалы не найдены.</p>';
    if (term) $('#materialList').querySelectorAll('details').forEach(node => node.open = true);
  }; $('#materialSearch').addEventListener('input', update); update();
}
function renderAssessments(type) {
  const department = currentRoute().split('/')[1];
  if (type === 'exam' && !departments[department]) {
    content.innerHTML = heading('Экзаменационный отдел', 'Выберите отдел, для которого хотите пройти экзамен.') + `<div class="grid department-grid">${Object.entries(departments).map(([id,[short,full]]) => `<a class="trial-card department-card" href="#exams/${id}"><div class="card-number">${e(short)}</div><h3>${e(full)}</h3><p>Доступно экзаменов: ${catalog.assessments.filter(a=>a.type==='exam'&&(a.departments||Object.keys(departments)).includes(id)).length}</p><span class="btn btn-outline">Открыть экзамены →</span></a>`).join('')}</div>`;
    return;
  }
  const items = catalog.assessments.filter(a => a.type === type && (type !== 'exam' || (a.departments || Object.keys(departments)).includes(department)));
  content.innerHTML = heading(type === 'test' ? 'Тренировочные тесты' : 'Экзамены', type === 'test' ? 'Открытая подготовка. После завершения отображается процент результата.' : 'Для допуска нужны кодовое слово и данные игрового персонажа.') + (items.length ? `<div class="grid">${items.map(a => `<article class="trial-card"><span class="pill">${type === 'test' ? 'Открытый доступ' : 'По кодовому слову'}</span><h3>${e(a.title)}</h3><p>${e(a.description)}</p><p class="muted">${a.questionCount} вопросов · ${a.timeLimit} мин · проходной балл ${a.passingScore}%</p>${button(type === 'test' ? 'Пройти тест' : 'Начать экзамен', 'start', a.id, 'btn-primary')}</article>`).join('')}</div>` : '<p class="empty">Опубликованных проверок пока нет.</p>');
  if (type === 'exam') content.insertAdjacentHTML('afterbegin', `<div class="actions" style="margin-bottom:18px"><a class="btn btn-outline" href="#exams">← Выбрать другой отдел</a><span class="pill">${e(departments[department][0])} · ${e(departments[department][1])}</span></div>`);
}
function renderLogin() {
  content.innerHTML = heading('Кабинет администратора', 'Вход для управления материалами, экзаменами и результатами.') + `<article class="trial-card" style="max-width:540px"><form id="loginForm" class="trial-form">${field('Имя пользователя', 'username', '', 'text', 'required autocomplete="username" maxlength="100"')}${field('Пароль', 'password', '', 'password', 'required autocomplete="current-password" maxlength="500"')}<p class="error-message" role="alert"></p><button class="btn btn-primary">Войти</button></form></article>`;
  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault(); const f = event.currentTarget, btn = f.querySelector('button'); btn.disabled = true;
    try { const data = await api('auth.login', Object.fromEntries(new FormData(f))); setAdmin(data.token, data.username); await route(); }
    catch (error) { f.querySelector('.error-message').textContent = error.message; } finally { btn.disabled = false; }
  });
}
function renderAdmin() {
  const tabs = [['results', 'Результаты и статистика'], ['materials', 'Материалы'], ['questions', 'Банк вопросов'], ['assessments', 'Тесты и экзамены']];
  content.innerHTML = `<div class="material-head">${heading('Кабинет администратора', 'Данные общей системы · время отображается по Москве')}${button('Выйти', 'logout')}</div><div class="admin-tabs">${tabs.map(([id, label]) => button(label, 'tab', id, `btn-outline ${id === adminTab ? 'active' : ''}`)).join('')}</div><div id="adminPanel"></div>`;
  if (adminTab === 'results') renderResults();
  else if (adminTab === 'materials') renderAdminMaterials();
  else if (adminTab === 'questions') renderQuestionBank();
  else $('#adminPanel').innerHTML = `<div class="toolbar">${button('+ Создать тест / экзамен', 'edit-assessment', '', 'btn-primary')}</div>${table(['Название', 'Тип', 'Вопросов / время', 'Публикация', 'Действия'], adminData.assessments.map(a => [e(a.title), a.type === 'test' ? 'Тест' : 'Экзамен', `${a.questionCount} / ${a.timeLimit} мин`, a.published ? 'Опубликовано' : 'Черновик', `${button('Изменить', 'edit-assessment', a.id)} ${button('Удалить', 'delete-assessment', a.id)}`]))}`;
}
function renderAdminMaterials(){ $('#adminPanel').innerHTML=`<div class="admin-tabs">${Object.entries(sections).map(([id,title])=>button(title,'material-category',id,`btn-outline ${id===materialCategory?'active':''}`)).join('')}</div><div class="toolbar">${button(materialCategory==='legislation'?'+ Создать кодекс':'+ Добавить материал','new-reference',materialCategory,'btn-primary')}</div>${table(['Название','Публикация','Действия'],adminData.materials.filter(m=>m.section===materialCategory).map(m=>[e(m.title),m.published?'Опубликовано':'Черновик',`${button('Изменить','edit-material',m.id)} ${button('Удалить','delete-material',m.id)}`]))}`; }
function renderQuestionBank(){const c=adminData.categories.find(c=>c.id===questionCategory);$('#adminPanel').innerHTML=`<div class="toolbar">${button('+ Создать категорию','edit-category','','btn-primary')}</div><div class="admin-tabs">${adminData.categories.map(c=>button(`${e(c.title)} (${adminData.questions.filter(q=>q.categoryId===c.id).length})`,'question-category',c.id,`btn-outline ${questionCategory===c.id?'active':''}`)).join('')}</div>${c?`<div class="actions">${button('+ Добавить вопрос','edit-question','','btn-primary')}${button('Изменить категорию','edit-category',c.id)}${button('Удалить категорию','delete-category',c.id)}</div>${table(['Вопрос','Тип / вариантов','Действия'],adminData.questions.filter(q=>q.categoryId===c.id).map(q=>[e(q.text),`${questionTypes[q.type||'single']} · ${q.options?.length||q.left?.length}`,`${button('Изменить','edit-question',q.id)} ${button('Удалить','delete-question',q.id)}`]))}`:'<p class="empty">Выберите или создайте категорию для наполнения банка вопросов.</p>'}`;}
function editCategory(id){const c=adminData.categories.find(c=>c.id===id);modal(c?'Редактирование категории':'Новая категория',form(field('Название категории','title',c?.title,'text','required maxlength="200"')));onForm(async fd=>{const result=await api('admin.saveCategory',{id,title:fd.get('title')});questionCategory=result.id;closeModal();await refreshCatalog();await route();});}
function table(headers, rows) { return rows.length ? `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="empty">Записей пока нет.</p>'; }
function filteredResults() {
  const term = ($('#resultSearch')?.value || '').toLocaleLowerCase('ru');
  const assessment = $('#resultAssessment')?.value || '';
  const kind = $('#resultType')?.value ?? 'exam';
  const state = $('#resultStatus')?.value || '';
  return adminData.attempts.filter(a => (!kind || a.type === kind) && (!assessment || a.assessmentId === assessment) && (!state || (state === 'passed' ? a.status !== 'in_progress' && a.passed : state === 'failed' ? a.status !== 'in_progress' && !a.passed : a.status === state)) && (!term || `${a.cadet?.fullName || ''} ${a.cadet?.certificate || ''}`.toLocaleLowerCase('ru').includes(term))).sort((a, b) => b.startedAt - a.startedAt);
}
function renderResults() {
  $('#adminPanel').innerHTML = `<div class="toolbar"><input id="resultSearch" placeholder="ФИО или 123-456" aria-label="Поиск сотрудника"><select id="resultAssessment" aria-label="Экзамен"><option value="">Все экзамены / тесты</option>${[...new Map(adminData.attempts.map(a => [a.assessmentId, a.title])).entries()].map(([id, title]) => `<option value="${e(id)}">${e(title)}</option>`).join('')}</select><select id="resultType" aria-label="Тип"><option value="exam">Экзамены</option><option value="test">Тесты</option><option value="">Все проверки</option></select><select id="resultStatus" aria-label="Статус"><option value="">Все статусы</option><option value="passed">Сдано</option><option value="failed">Не сдано</option><option value="in_progress">В процессе</option></select></div><div class="actions">${button('Обновить', 'reload')}${button('Экспорт CSV', 'export')}</div><div id="resultStats"></div><div id="resultTable"></div>`;
  if (mode === 'supabase' && adminData.capabilities?.resultManagement !== 2) $('#adminPanel').insertAdjacentHTML('afterbegin', '<p class="note">Для новых действий с результатами обновите серверную функцию Supabase fso-api. GitHub Pages публикует только интерфейс сайта.</p>');
  ['#resultSearch', '#resultAssessment', '#resultType', '#resultStatus'].forEach(id => $(id).addEventListener(id === '#resultSearch' ? 'input' : 'change', updateResults)); updateResults();
}
function updateResults() {
  const rows = filteredResults(), completed = rows.filter(a => a.status !== 'in_progress');
  const passed = completed.filter(a => a.passed).length;
  const avg = completed.length ? Math.round(completed.reduce((n, a) => n + a.score, 0) / completed.length) : 0;
  $('#resultStats').innerHTML = `<div class="stat-grid" style="margin:20px 0">${[['Попыток', rows.length], ['Сдано', passed], ['Не сдано', completed.length - passed], ['Средний балл', completed.length ? `${avg}%` : '—']].map(([label, value]) => `<div class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`).join('')}</div>`;
  $('#resultTable').innerHTML = table(['Сотрудник / удостоверение', 'Проверка', 'Начало', 'Балл', 'Статус', 'Действия'], rows.map(a => [`${e(a.cadet?.fullName || 'Анонимный тест')}<br><span class="muted">${e(a.cadet ? `${a.cadet.rank} · ${a.cadet.certificate}` : 'Без идентификации')}</span>`, e(a.title), date(a.startedAt), a.score === undefined ? '—' : `${a.score}%`, status(a), button('Подробнее', 'detail', a.id) + (a.status === 'in_progress' ? ' ' + button('Завершить', 'finish-attempt', a.id) : '') + ' ' + button(a.status === 'in_progress' ? 'Завершить и удалить' : 'Удалить', 'delete-attempt', a.id)]));
}
function exportResults() {
  const cell = value => { let s = String(value ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  const rows = [['ФИО', 'Звание', 'Удостоверение', 'ФИО инструктора', 'Жетон инструктора', 'Экзамен', 'Тип', 'Начало (МСК)', 'Балл', 'Статус'], ...filteredResults().map(a => [a.cadet?.fullName, a.cadet?.rank, a.cadet?.certificate, a.instructor?.fullName, a.instructor?.certificate, a.title, a.type, date(a.startedAt), a.score, status(a)])];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(r => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'fso-results.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function saved(action, input) { await api(action, input); closeModal(); await refreshCatalog(); await route(); toast('Изменения сохранены'); }
async function saveResultAction(action, input) {
  try { await saved(action, input); }
  catch (error) {
    if (/Нельзя удалить эту запись|Неизвестная операция/.test(error.message)) throw new Error('Серверная функция Supabase fso-api не поддерживает это действие. Разверните обновлённую функцию: публикация GitHub Pages не обновляет Supabase.');
    throw error;
  }
}
function finishResult(id) {
  const a = adminData.attempts.find(a => a.id === id);
  if (!a) return toast('Попытка не найдена. Обновите результаты.');
  modal('Принудительное завершение', form(`<p>Завершить проверку «${e(a.title)}» сотрудника ${e(a.cadet?.fullName || 'Анонимный тест')}?</p><p>Результат будет рассчитан по сохранённым ответам. Вопросы без ответа считаются неверными. Попытка останется в истории, продолжить её будет нельзя.</p>`, 'Завершить и сохранить'));
  onForm(() => saveResultAction('admin.finishAttempt', { id }));
}
function editMaterial(id, section=materialCategory, focus={}) {
  const m = adminData.materials.find(m => m.id === id) || { section, published: false };
  const editorTitle = focus.action ? (focus.action.includes('article') ? 'Статья' : 'Раздел') : id ? 'Редактирование материала' : 'Новый материал';
  modal(editorTitle, '<div></div>');
  mountMaterialEditor($('#modalBody'), m, draft => saved('admin.saveMaterial', draft),focus);
  if(!focus.groupId)$('#modalBody input')?.focus();
}
function editQuestion(id) {
  if(!adminData.categories.length)return toast('Сначала создайте категорию');
  const q = adminData.questions.find(q => q.id === id) || { options: ['', ''], correct: 0, categoryId:questionCategory||adminData.categories[0].id };
  modal(id ? 'Редактирование вопроса' : 'Новый вопрос', '<div></div>');
  mountQuestionEditor($('#modalBody'), q, draft => {
    const supported = adminData.capabilities?.questionTypes;
    if (Array.isArray(supported) && !supported.includes(draft.type)) throw new Error(`Сервер не поддерживает тип «${questionTypes[draft.type] || draft.type}». Обновите функцию Supabase fso-api. Введённые данные остались в форме.`);
    return saved('admin.saveQuestion', draft);
  },adminData.categories);
  $('#modalBody input')?.focus();
}
function editAssessment(id) {
  if (!adminData.questions.length) return toast('Сначала добавьте вопросы в банк');
  const a = adminData.assessments.find(a => a.id === id) || { type: 'test', blocks: [], questionIds: [], questionCount: 1, timeLimit: 10, passingScore: 70, published: false };
  modal(id ? 'Редактирование проверки' : 'Новый тест / экзамен', '<div></div>');
  mountComposition($('#modalBody'),a,adminData,draft=>saved('admin.saveAssessment',draft),()=>api('admin.generateCode'));
}
function deleteItem(collection, id) {
  const attempt = collection === 'attempts' ? adminData.attempts.find(a => a.id === id) : null;
  const active = attempt?.status === 'in_progress';
  const message = attempt ? `<p>Удалить результат проверки «${e(attempt.title)}»?</p><p>${e(attempt.cadet?.fullName || 'Анонимный тест')} · ${date(attempt.startedAt)}</p><p>Попытка, ответы и результат будут удалены без возможности восстановления и исключены из статистики.</p>${active ? '<p class="note">Проверка будет принудительно завершена и удалена. Старой ссылкой сотрудник продолжить её не сможет.</p>' : ''}` : '<p>Удалить выбранную запись? Сохранённые попытки останутся в истории.</p>';
  modal(attempt ? 'Удаление результата' : 'Удаление записи', form(message, active ? 'Завершить и удалить' : 'Удалить'));
  onForm(() => collection === 'attempts' ? saveResultAction('admin.delete', { collection, id }) : saved('admin.delete', { collection, id }));
}
function resultDetail(id) {
  const a = adminData.attempts.find(a => a.id === id);
  modal('Подробности попытки', `<h3>${e(a.title)}</h3><p>${e(a.cadet ? `${a.cadet.rank} · ${a.cadet.fullName} · ${a.cadet.certificate}` : 'Анонимный тест')}</p><p><strong>Инструктор:</strong> ${e(a.instructor?.fullName || 'Не указан')}${a.instructor?.certificate ? ` · жетон ${e(a.instructor.certificate)}` : ''}</p><p class="muted">${date(a.startedAt)} · ${status(a)}</p>${a.status === 'in_progress' ? '<p class="note">Попытка ещё идёт. Обновите результаты после завершения.</p>' : `<p class="score">${a.score}%</p>`}${review(a)}`);
}
function review(a) { return a.questions.map((q, i) => `<div class="review-item"><strong>${i + 1}. ${e(q.text)}</strong>${reviewQuestion(q,a.answers[i])}</div>`).join(''); }
function start(id) {
  const a = catalog.assessments.find(a => a.id === id);
  let html = `<p class="muted">${e(a.title)} · ${a.timeLimit} мин · ${a.questionCount} вопросов</p>`;
  if (sessionStorage.getItem('fso_attempt')) html += '<div class="note">Новая попытка заменит ссылку на предыдущую в этом браузере. Предыдущая запись останется в системе.</div>';
  if (a.type === 'exam') html += select('Звание', 'rank', [['', 'Выберите звание'], ...ranks.map(r => [r, r])], '') + field('ФИО игрового персонажа', 'fullName', '', 'text', 'required maxlength="150" autocomplete="off"') + field('Номер удостоверения', 'certificate', '', 'text', 'required pattern="[0-9]{3}-[0-9]{3}" maxlength="7" placeholder="123-456" title="Три цифры, дефис, три цифры"') + '<h4>Инструктор (необязательно)</h4>' + field('ФИО инструктора', 'instructorFullName', '', 'text', 'maxlength="150" autocomplete="off"') + field('Жетон инструктора', 'instructorCertificate', '', 'text', 'pattern="[0-9]{3}-[0-9]{3}" maxlength="7" placeholder="123-456" title="Три цифры, дефис, три цифры"') + field('Кодовое слово', 'code', '', 'password', 'required maxlength="128" autocomplete="off"');
  else html += '<p>Тест открыт всем. После завершения вы увидите процент результата.</p>';
  modal(a.type === 'exam' ? 'Допуск к экзамену' : 'Начать тренировочный тест', form(html, 'Начать'));
  onForm(async fd => {
    const department = currentRoute().split('/')[1];
    const result = await api('attempt.start', { assessmentId: id, department, ...Object.fromEntries(fd) });
    if (department) sessionStorage.setItem('fso_exam_department', department);
    attemptToken = result.token; sessionStorage.setItem('fso_attempt', JSON.stringify({ id: result.attempt.id, token: attemptToken }));
    questionIndex = 0; acceptAttempt(result); closeModal(); if (currentRoute() === 'attempt') await route(); else location.hash = 'attempt';
  });
}
function acceptAttempt(result) { attempt = result.attempt; offset = result.serverTime - Date.now(); }
function renderAttempt() {
  clearInterval(timer);
  if (attempt.status !== 'in_progress') {
    content.innerHTML = heading(e(attempt.title)) + `<article class="trial-card"><p class="muted">Ваш результат</p><div class="score">${attempt.score}%</div><p class="muted">Результат сохранён в системе.</p><div class="actions" style="margin-top:20px"><a href="#${attempt.type === 'exam' ? `exams/${sessionStorage.getItem('fso_exam_department')||''}` : 'tests'}" class="btn btn-primary">К списку проверок</a></div></article>`; return;
  }
  questionIndex = Math.min(questionIndex, attempt.questions.length - 1);
  const q = attempt.questions[questionIndex];
  content.innerHTML = `<div class="quiz-top"><div>${heading(e(attempt.title), `Вопрос ${questionIndex + 1} из ${attempt.questions.length}`)}</div><div class="clock" id="quizClock" aria-label="Осталось времени"></div></div><p class="muted">${attempt.cadet ? `${e(attempt.cadet.rank)} · ${e(attempt.cadet.fullName)} · ${e(attempt.cadet.certificate)}` : 'Общедоступный тест'} · ответы сохраняются после выбора.</p><div class="question-nav">${attempt.questions.map((question, i) => `<button class="${i === questionIndex ? 'active' : ''} ${answerComplete(question,attempt.answers[i]) ? 'answered' : ''}" data-action="question" data-id="${i}" aria-label="Вопрос ${i + 1}">${i + 1}</button>`).join('')}</div><article class="trial-card"><h3>${e(q.text)}</h3>${renderQuestion(q,attempt.answers[questionIndex])}</article><div class="actions" style="margin-top:20px">${questionIndex > 0 ? button('← Назад', 'question', questionIndex - 1) : ''}${questionIndex < attempt.questions.length - 1 ? button('Следующий вопрос →', 'question', questionIndex + 1, 'btn-primary') : ''}${button('Завершить проверку', 'finish', '', 'btn-gold')}</div><p class="muted" style="margin-top:16px">Можно обновить страницу: попытка и сохранённые ответы восстановятся. Таймер продолжит отсчёт.</p>`;
  if (['matching','sequence'].includes(q.type)) bindMatching(content,q,attempt.answers[questionIndex],value=>saveAnswer(value).catch(err=>toast(err.message)));
  let expiryRequested = false;
  const tick = () => {
    const seconds = Math.max(0, Math.ceil((attempt.deadline - Date.now() - offset) / 1000));
    if ($('#quizClock')) $('#quizClock').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    if (!seconds && !busy && !expiryRequested) { expiryRequested = true; finishAttempt().catch(error => { toast(error.message); }); }
  }; timer = setInterval(tick, 1000); tick();
}
async function finishAttempt() {
  if (busy) return; busy = true;
  try { acceptAttempt(await api('attempt.finish', { id: attempt.id, token: attemptToken })); closeModal(); if (currentRoute() === 'attempt') renderAttempt(); }
  finally { busy = false; }
}
async function saveAnswer(value) {
  if(busy)return;busy=true;
  const controls = [...document.querySelectorAll('.answer-option, [data-match-select], [data-sequence-action]')].map(node=>({node,disabled:node.disabled}));
  controls.forEach(({node})=>node.disabled=true);
  try{acceptAttempt(await api('attempt.answer',{id:attempt.id,token:attemptToken,index:questionIndex,answer:value}));if(currentRoute()==='attempt')renderAttempt();}
  finally{busy=false;controls.forEach(({node,disabled})=>node.disabled=disabled);}
}
async function handle(action, id) {
  if (action === 'reload') { catalog = null; await route(); }
  else if (action === 'logout') { await api('auth.logout'); setAdmin(null); adminData = null; await route(); }
  else if (action === 'tab') { adminTab = id; renderAdmin(); }
  else if (action === 'material-category') {materialCategory=id;renderAdminMaterials();}
  else if (action === 'question-category') {questionCategory=id;renderQuestionBank();}
  else if (action === 'edit-category') editCategory(id);
  else if (action === 'new-reference') editMaterial('',id);
  else if (action.startsWith('reference-')) {const [materialId,groupId,articleId]=id.split('|');editMaterial(materialId,undefined,{action,groupId,articleId});}
  else if (action === 'edit-material') editMaterial(id);
  else if (action === 'edit-question') editQuestion(id);
  else if (action === 'edit-assessment') editAssessment(id);
  else if (action.startsWith('delete-')) deleteItem({ 'delete-material': 'materials', 'delete-question': 'questions', 'delete-assessment': 'assessments','delete-category':'categories', 'delete-attempt':'attempts' }[action], id);
  else if (action === 'detail') resultDetail(id);
  else if (action === 'finish-attempt') finishResult(id);
  else if (action === 'export') exportResults();
  else if (action === 'start') start(id);
  else if (action === 'question' && !busy) { questionIndex = Number(id); renderAttempt(); }
  else if (action === 'answer' && !busy) {
    const q=attempt.questions[questionIndex], index=Number(id), old=attempt.answers[questionIndex];
    const value=q.type==='multiple'?(Array.isArray(old)&&old.includes(index)?old.filter(v=>v!==index):[...(Array.isArray(old)?old:[]),index]):index;
    await saveAnswer(value);
  } else if (action === 'finish' && !busy) {
    const unanswered = attempt.questions.filter((q,i) => !answerComplete(q,attempt.answers[i])).length;
    modal('Завершение проверки', form(`<p>${unanswered ? `Без ответа: ${unanswered}. Эти вопросы будут засчитаны как неверные.` : 'Вы ответили на все вопросы.'}</p><p>После завершения ответы изменить нельзя.</p>`, 'Завершить и сохранить'));
    onForm(finishAttempt);
  }
}
document.addEventListener('click', event => { const b = event.target.closest('[data-action]'); if (b) handle(b.dataset.action, b.dataset.id).catch(error => toast(error.message)); });
$('#modalClose').addEventListener('click', requestCloseModal);
$('#modalBody').addEventListener('input', () => modalDirty = true);
$('#modalBody').addEventListener('change', () => modalDirty = true);
$('#modalBody').addEventListener('click', event => { if (event.target.closest('form button[type=button]')) modalDirty = true; });
window.addEventListener('beforeunload', event => { if (modalDirty && $('#modalOverlay').classList.contains('show')) { event.preventDefault(); event.returnValue = ''; } });
// Editors close only through their explicit controls, never through the backdrop.
document.addEventListener('keydown', event => {
  if (!$('#modalOverlay').classList.contains('show')) return;
  if (event.key === 'Escape') { event.preventDefault(); if (!$('#modalBody form')) requestCloseModal(); }
  if (event.key === 'Tab') {
    const nodes = [...$('#modalOverlay').querySelectorAll('button, input, select, textarea, a[href]')].filter(n => !n.disabled && n.getClientRects().length);
    const first = nodes[0], last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
window.addEventListener('hashchange', () => { closeModal(); route(); });
$('#modeBadge').textContent = mode === 'local' ? 'Локальная пробная версия' : 'Общая база · Supabase';
route();

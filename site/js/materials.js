import { defaultOrganization, renderOrganization, organizationEditor, collectOrganization, editOrganization } from './structure.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sections = { legislation: 'Законодательство', charter: 'Устав организации', instructions: 'Служебные инструкции', structure: 'Структура' };
const types = { title: 'Заголовок', text: 'Текст', steps: 'Шаги', warning: 'Предупреждение', info: 'Информация', danger: 'Опасность', image: 'Изображение', list: 'Список', divider: 'Разделитель' };
const field = (label, key, value = '', multiline = false, required = false) => `<label>${label}${multiline ? `<textarea data-key="${key}" rows="4" ${required ? 'required' : ''}>${esc(value)}</textarea>` : `<input data-key="${key}" value="${esc(value)}" ${required ? 'required' : ''}>`}</label>`;
const control = (label, action, index, group = '', disabled = false) => `<button type="button" class="btn btn-sm btn-outline" data-edit="${action}" data-index="${index}" data-group="${group}" ${disabled ? 'disabled' : ''}>${label}</button>`;
const moveControls = (kind, index, length, group = '') => `<div class="actions">${control('↑', `${kind}-up`, index, group, index === 0)}${control('↓', `${kind}-down`, index, group, index === length - 1)}${control('Дублировать', `${kind}-copy`, index, group)}${control('Убрать', `${kind}-remove`, index, group)}</div>`;
const safeImage = src => /^https:\/\/[^\s]+$/i.test(src || '') || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src || '');

export function materialSearchText(m) {
  return [m.title, m.body, ...(m.groups || []).flatMap(g => [g.title, ...g.articles.flatMap(a => [a.num, a.title, a.text, ...(a.parts || []).flatMap(p => [p.num, p.title, p.text])])]), ...(m.blocks || []).flatMap(b => [b.content, b.title, b.alt, ...(b.steps || b.items || [])]), m.organization ? JSON.stringify(m.organization) : ''].join(' ');
}
export function renderMaterial(m,admin=false) {
  const action=(label,kind,suffix='')=>admin?`<button class="btn btn-sm btn-outline" data-action="${kind}" data-id="${esc(m.id+suffix)}">${label}</button>`:'';
  const article=(a,g,pinned=false)=>`<section class="reference-article compact-article"><h4><span class="pill">${esc(a.num)}</span> ${esc(a.title)} ${a.important?'<span class="pill">★ Важная для ФСО</span>':''}</h4>${pinned?`<p class="muted">${esc(g.title)}</p>`:''}<div class="material-body">${esc(a.text)}</div>${(a.parts || []).map(p => `<section class="article-part"><h5>${esc(p.num)}${p.title ? ` — ${esc(p.title)}` : ''}</h5><div class="material-body">${esc(p.text)}</div></section>`).join('')}${action('Редактировать статью','reference-article',`|${g.id}|${a.id}`)}</section>`;
  const grouped = (m.groups || []).map(g => `<details class="reference-group" open><summary>${esc(g.title)}</summary><div class="actions">${action('Редактировать раздел','reference-group',`|${g.id}`)}${action('+ Добавить статью','reference-add-article',`|${g.id}`)}</div>${g.articles.length ? g.articles.map(a=>article(a,g)).join('') : '<p class="muted">Статей пока нет.</p>'}</details>`).join('');
  const pinned=m.section==='legislation'?(m.groups||[]).flatMap(g=>g.articles.filter(a=>a.important).map(a=>article(a,g,true))).join(''):'';
  const blocks = (m.blocks || []).map(renderBlock).join('');
  return `<article class="trial-card reference-document"><div class="material-head"><h3>${esc(m.title)}${m.published?'':' · черновик'}</h3>${action('Редактировать','edit-material')}</div>${['legislation','charter'].includes(m.section)?action('+ Добавить раздел','reference-add-group'):''}${m.body ? `<div class="material-body">${esc(m.body)}</div>` : ''}${pinned?`<section class="pinned-articles"><h3>★ Важные для ФСО статьи</h3>${pinned}</section>`:''}${grouped}${blocks}${m.section === 'structure' ? renderOrganization(m.organization || defaultOrganization()) : ''}</article>`;
}
function renderBlock(b) {
  if (b.type === 'title') return `<h3>${esc(b.content)}</h3>`;
  if (b.type === 'text') return `<p class="material-body instruction-text">${esc(b.content)}</p>`;
  if (b.type === 'divider') return '<hr class="instruction-divider">';
  if (b.type === 'image') return safeImage(b.src) ? `<figure class="instruction-image"><img src="${esc(b.src)}" alt="${esc(b.alt)}" loading="lazy" referrerpolicy="no-referrer">${b.alt ? `<figcaption class="muted">${esc(b.alt)}</figcaption>` : ''}</figure>` : '';
  if (b.type === 'steps' || b.type === 'list') { const tag = b.type === 'steps' ? 'ol' : 'ul'; return `${b.title ? `<h4>${esc(b.title)}</h4>` : ''}<${tag} class="instruction-list">${(b.steps || b.items || []).map(item => `<li class="material-body">${esc(item)}</li>`).join('')}</${tag}>`; }
  return `<div class="instruction-alert ${esc(b.type)}"><strong>${esc(types[b.type])}</strong><div class="material-body">${esc(b.content)}</div></div>`;
}

export function mountMaterialEditor(container, original, save, focus={}) {
  if(focus.action?.startsWith('reference-')) return mountReferenceEditor(container, original, save, focus);
  let draft = structuredClone({ ...original, groups: original.groups || [], blocks: original.blocks || [], organization: original.organization || defaultOrganization() });
  if(focus.action==='reference-add-group') { const group={id:crypto.randomUUID(),title:'',articles:[]};draft.groups.push(group);focus.groupId=group.id; }
  if(focus.action==='reference-add-article') { const group=draft.groups.find(g=>g.id===focus.groupId);if(group){const a={id:crypto.randomUUID(),num:'',title:'',text:'',important:false};group.articles.push(a);focus.articleId=a.id;} }
  // Keep legacy content editable and visible, without rewriting stored materials.
  if (draft.section === 'instructions' && !draft.blocks.length && draft.body) { draft.blocks = [{ type: 'text', content: draft.body }]; draft.body = ''; }
  function collect() {
    const base = container.querySelector('[data-base]');
    for (const input of base.querySelectorAll('[data-key]')) draft[input.dataset.key] = input.type === 'checkbox' ? input.checked : input.value;
    container.querySelectorAll('[data-group-card]').forEach(card => {
      const group = draft.groups[Number(card.dataset.groupCard)];
      for (const input of card.querySelectorAll(':scope > label [data-key]')) group[input.dataset.key] = input.value;
      card.querySelectorAll('[data-article-card]').forEach(articleCard => {
        const article = group.articles[Number(articleCard.dataset.articleCard)];
        articleCard.querySelectorAll('[data-key]').forEach(input => { article[input.dataset.key] = input.dataset.key === 'tags' ? input.value.split(',').map(s => s.trim()).filter(Boolean) : input.type === 'checkbox' ? input.checked : input.value; });
        collectParts(articleCard, article);
      });
    });
    container.querySelectorAll('[data-block-card]').forEach(card => {
      const block = draft.blocks[Number(card.dataset.blockCard)];
      card.querySelectorAll('[data-key]').forEach(input => { block[input.dataset.key] = ['steps', 'items'].includes(input.dataset.key) ? input.value.split('\n').map(s => s.trim()).filter(Boolean) : input.value; });
    });
    collectOrganization(container, draft.organization);
  }
  function render() {
    container.innerHTML = `<form class="trial-form material-editor"><div data-base>${field('Название документа / инструкции', 'title', draft.title, false, true)}<label>Раздел<select data-key="section">${Object.entries(sections).map(([id, text]) => `<option value="${id}" ${draft.section === id ? 'selected' : ''}>${text}</option>`).join('')}</select></label>${field('Описание / вступление', 'body', draft.body, true)}<label class="check"><input type="checkbox" data-key="published" ${draft.published ? 'checked' : ''}>Опубликовать</label></div><div id="materialEditorContent">${['legislation', 'charter'].includes(draft.section) ? renderGroups() : draft.section === 'instructions' ? renderBlocks() : organizationEditor(draft.organization)}</div><p class="error-message" role="alert"></p><div class="actions"><button class="btn btn-primary" type="submit">Сохранить материал</button><button class="btn btn-outline" type="submit" name="draft" formnovalidate>Сохранить черновик</button></div></form>`;
    container.querySelector('[data-key=section]').addEventListener('change', () => { collect(); render(); });
    container.querySelector('[data-key=section]').disabled=true;
    container.querySelector('[data-base] > label').firstChild.textContent=draft.section==='legislation'?'Название кодекса':'Название материала';
    container.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); collect(); if(event.submitter?.name==='draft')draft.published=false; const btn = event.submitter; btn.disabled = true;
      try { await save(draft); } catch (error) { const node = container.querySelector('.error-message'); if (node) node.textContent = error.message; }
      finally { btn.disabled = false; }
    });
    container.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => edit(btn.dataset)));
    container.querySelectorAll('[data-part-action]').forEach(btn => btn.addEventListener('click', () => {
      collect();
      const articleCard = btn.closest('[data-article-card]'), groupCard = btn.closest('[data-group-card]');
      changePart(draft.groups[Number(groupCard.dataset.groupCard)].articles[Number(articleCard.dataset.articleCard)], btn.dataset);
      render();
    }));
    container.querySelectorAll('[data-org-action]').forEach(btn => btn.addEventListener('click', () => { collect(); editOrganization(draft.organization, btn.dataset.orgAction, btn.dataset.orgTarget); render(); }));
    container.querySelectorAll('[data-upload]').forEach(input => input.addEventListener('change', async () => {
      const file = input.files[0]; if (!file) return;
      const errorNode = container.querySelector('.error-message');
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 450000) { errorNode.textContent = 'Выберите PNG, JPEG, WebP или GIF размером до 450 КБ.'; input.value = ''; return; }
      collect();
      const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      draft.blocks[Number(input.dataset.upload)].src = src;
      draft.blocks[Number(input.dataset.upload)].alt ||= file.name; render();
    }));
  }
  function renderGroups() {
    return `<div class="note">Статьи сгруппированы по разделам. Укажите номер, название и краткую расшифровку; важные для ФСО статьи кодекса можно закрепить сверху.</div>${draft.groups.map((g, gi) => `<section class="editor-group" data-group-card="${gi}"><div class="material-head"><h4>Раздел ${gi + 1}</h4>${moveControls('group', gi, draft.groups.length)}</div>${field('Название раздела статей', 'title', g.title, false, true)}${g.articles.map((a, ai) => renderArticle(a, ai, gi, g.articles.length)).join('')}${control('+ Добавить статью', 'article-add', 0, gi)}</section>`).join('')}${control('+ Добавить раздел', 'group-add', 0)}`;
  }
  function renderArticle(a, ai, gi, length) {
    return `<details class="editor-article" data-article-card="${ai}" open><summary>Статья ${ai + 1}: ${esc(a.num)} ${esc(a.title)}</summary><div class="trial-form">${moveControls('article', ai, length, gi)}<div class="form-row">${field('Номер статьи', 'num', a.num, false, true)}${field('Название статьи', 'title', a.title, false, true)}</div>${field('Краткая расшифровка статьи', 'text', a.text, true, true)}${draft.section==='legislation'?`<label class="check"><input type="checkbox" data-key="important" ${a.important?'checked':''}>Важная для ФСО статья — закрепить сверху кодекса</label>`:''}${partsEditor(a, draft.published)}</div></details>`;
  }
  function renderBlocks() {
    return `<div class="note">Соберите инструкцию из блоков, как в исходном редакторе. Добавляйте заголовки, текст, последовательности действий и изображения.</div><div class="editor-toolbar">${Object.entries(types).map(([type, label]) => control('+ ' + label, 'block-add', type)).join('')}</div>${draft.blocks.map((b, i) => `<section class="editor-group" data-block-card="${i}"><div class="material-head"><h4>${esc(types[b.type])}</h4>${moveControls('block', i, draft.blocks.length)}</div>${['title', 'text', 'warning', 'info', 'danger'].includes(b.type) ? field('Содержание блока', 'content', b.content, b.type !== 'title', true) : ['steps', 'list'].includes(b.type) ? field('Заголовок списка', 'title', b.title) + field(b.type === 'steps' ? 'Шаги — каждый с новой строки' : 'Пункты — каждый с новой строки', b.type === 'steps' ? 'steps' : 'items', (b.steps || b.items || []).join('\n'), true, true) : b.type === 'image' ? field('HTTPS-ссылка на изображение или загруженный файл', 'src', b.src, false, true) + field('Подпись к изображению', 'alt', b.alt) + `<label>Загрузить изображение (до 450 КБ)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${i}"></label>${safeImage(b.src) ? `<img class="editor-image-preview" src="${esc(b.src)}" alt="${esc(b.alt)}" referrerpolicy="no-referrer">` : ''}` : '<hr class="instruction-divider">'}</section>`).join('')}`;
  }
  function edit({ edit: action, index, group }) {
    collect();
    if (action === 'group-add' || action === 'article-add') {
      const focus = { action: action === 'group-add' ? 'reference-add-group' : 'reference-add-article', groupId: draft.groups[Number(group)]?.id };
      mountReferenceEditor(container, draft, async updated => { draft = updated; render(); }, focus, () => render());
      return;
    }
    if (action === 'group-add') draft.groups.push({ id: crypto.randomUUID(), title: '', description: '', articles: [] });
    else if (action === 'article-add') draft.groups[Number(group)].articles.push({ id: crypto.randomUUID(), num: '', title: '', text: '', tags: [] });
    else if (action === 'block-add') draft.blocks.push({ type: index, content: '', title: '', steps: [''], items: [''], src: '', alt: '' });
    else {
      const [kind, operation] = action.split('-');
      const items = kind === 'group' ? draft.groups : kind === 'article' ? draft.groups[Number(group)].articles : draft.blocks;
      const i = Number(index);
      if (operation === 'remove') items.splice(i, 1);
      if (operation === 'copy') { const copy = structuredClone(items[i]); if (copy.id) copy.id = crypto.randomUUID(); copy.articles?.forEach(a => a.id = crypto.randomUUID()); items.splice(i + 1, 0, copy); }
      if (['up', 'down'].includes(operation)) { const j = i + (operation === 'up' ? -1 : 1); if (j >= 0 && j < items.length) [items[i], items[j]] = [items[j], items[i]]; }
    }
    render();
  }
  render();
  if(focus.groupId){ const gi=draft.groups.findIndex(g=>g.id===focus.groupId),group=container.querySelector(`[data-group-card="${gi}"]`);const ai=draft.groups[gi]?.articles.findIndex(a=>a.id===focus.articleId);const target=ai>=0?group?.querySelector(`[data-article-card="${ai}"]`):group;target?.scrollIntoView({block:'start'});target?.querySelector('input')?.focus(); }
}

function mountReferenceEditor(container, original, save, focus, cancel) {
  const draft = structuredClone(original);
  draft.groups ||= [];
  const addingGroup = focus.action === 'reference-add-group';
  const isGroup = addingGroup || focus.action === 'reference-group';
  let group = draft.groups.find(g => g.id === focus.groupId);
  if (addingGroup) { group = { id: crypto.randomUUID(), title: '', articles: [] }; draft.groups.push(group); }
  if (!group) throw new Error('Раздел не найден. Обновите справочник.');
  let article = group.articles.find(a => a.id === focus.articleId);
  if (focus.action === 'reference-add-article') { article = { id: crypto.randomUUID(), num: '', title: '', text: '', important: false }; group.articles.push(article); }
  if (!isGroup && !article) throw new Error('Статья не найдена. Обновите справочник.');
  const required = !!draft.published;
  function collect() {
    const target = isGroup ? group : article;
    container.querySelectorAll('[data-key]').forEach(input => target[input.dataset.key] = input.type === 'checkbox' ? input.checked : input.value);
    if (!isGroup) collectParts(container, article);
  }
  function render() {
  container.innerHTML = `<form class="trial-form"><p class="muted">${isGroup ? 'Раздел кодекса / устава' : `Раздел: ${esc(group.title || 'Без названия')}`}</p>${isGroup ? field('Название раздела', 'title', group.title, false, true) : field('Номер статьи', 'num', article.num, false, required) + field('Название статьи', 'title', article.title, false, required) + field('Краткая расшифровка', 'text', article.text, true, required) + (draft.section === 'legislation' ? `<label class="check"><input data-key="important" type="checkbox" ${article.important ? 'checked' : ''}>Важная для ФСО статья</label>` : '') + partsEditor(article, required)}<p class="error-message" role="alert"></p><div class="actions"><button class="btn btn-primary" type="submit">${cancel ? 'Применить' : isGroup ? 'Сохранить раздел' : 'Сохранить статью'}</button>${cancel ? '<button class="btn btn-outline" type="button" data-reference-cancel>Назад к документу</button>' : ''}</div></form>`;
  container.querySelectorAll('[data-part-action]').forEach(button => button.addEventListener('click', () => { collect(); changePart(article, button.dataset); render(); }));
  container.querySelector('[data-reference-cancel]')?.addEventListener('click', cancel);
  container.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    collect();
    event.submitter.disabled = true;
    try { await save(draft); } catch(error) { container.querySelector('.error-message').textContent = error.message; } finally { event.submitter.disabled = false; }
  });
  container.querySelector('input')?.focus();
  }
  render();
}

function partsEditor(article, required) {
  const parts = article.parts || [];
  const button = (label, action, index = '', disabled = false) => `<button type="button" class="btn btn-sm btn-outline" data-part-action="${action}" data-part-index="${index}" ${disabled ? 'disabled' : ''}>${label}</button>`;
  return `<h4>Части статьи</h4><p class="muted">Необязательно. Добавьте подпункты статьи: номер части и её текст; название можно оставить пустым.</p>${parts.map((p,i)=>`<section class="editor-group" data-part-row="${i}"><div class="material-head"><h4>Часть ${esc(p.num || i+1)}</h4><div class="actions">${button('↑','up',i,i===0)}${button('↓','down',i,i===parts.length-1)}${button('Убрать часть','remove',i)}</div></div><div class="form-row"><label>Номер части<input data-part-field="num" value="${esc(p.num)}" maxlength="80" ${required?'required':''}></label><label>Название части (необязательно)<input data-part-field="title" value="${esc(p.title)}" maxlength="200"></label></div><label>Текст части<textarea data-part-field="text" rows="4" maxlength="20000" ${required?'required':''}>${esc(p.text)}</textarea></label></section>`).join('')}${button('+ Добавить часть','add','',parts.length>=200)}`;
}
function collectParts(container, article) {
  const previous = article.parts || [];
  article.parts = [...container.querySelectorAll('[data-part-row]')].map(row => {
    const part = { id: previous[Number(row.dataset.partRow)]?.id || crypto.randomUUID() };
    row.querySelectorAll('[data-part-field]').forEach(input => part[input.dataset.partField] = input.value);
    return part;
  });
}
function changePart(article, {partAction:action, partIndex:index}) {
  article.parts ||= [];
  const i = Number(index);
  if (action === 'add' && article.parts.length < 200) article.parts.push({id:crypto.randomUUID(),num:'',title:'',text:''});
  if (action === 'remove') article.parts.splice(i,1);
  const j = i + (action === 'up' ? -1 : 1);
  if (['up','down'].includes(action) && j >= 0 && j < article.parts.length) [article.parts[i],article.parts[j]] = [article.parts[j],article.parts[i]];
}

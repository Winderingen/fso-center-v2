const config = window.FSO_CONFIG;
export const mode = config.mode;
export function adminToken() { return sessionStorage.getItem('fso_admin_token') || ''; }
export function setAdmin(token, username) {
  if (token) { sessionStorage.setItem('fso_admin_token', token); sessionStorage.setItem('fso_admin_name', username); }
  else { sessionStorage.removeItem('fso_admin_token'); sessionStorage.removeItem('fso_admin_name'); }
}
export async function api(action, input = {}) {
  let url = '/api';
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken()) headers.Authorization = `Bearer ${adminToken()}`;
  if (mode === 'supabase') {
    if (!config.supabaseUrl || !config.publishableKey) throw new Error('Не заполнена конфигурация Supabase в config.js');
    url = `${config.supabaseUrl.replace(/\/$/, '')}/functions/v1/fso-api`;
    headers.apikey = config.publishableKey;
  } else if (!['127.0.0.1', 'localhost'].includes(location.hostname)) {
    throw new Error('Для опубликованного сайта настройте Supabase в config.js. Локальный режим работает через npm start.');
  }
  let response;
  try { response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ action, input }), signal: AbortSignal.timeout(20000) }); }
  catch { throw new Error('Не удалось связаться с сервером. Проверьте подключение и повторите.'); }
  const data = await response.json().catch(() => ({ error: 'Сервер вернул некорректный ответ' }));
  if (!response.ok || data.error) {
    if (response.status === 401 && action.startsWith('admin.')) setAdmin(null);
    throw new Error(data.error || 'Ошибка запроса');
  }
  return data;
}

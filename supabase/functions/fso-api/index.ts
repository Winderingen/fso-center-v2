import { dispatch, digest, HttpError } from '../_shared/domain.mjs';

const env = (key: string) => { const value = Deno.env.get(key); if (!value) throw new Error(`Missing ${key}`); return value; };
const base = env('SUPABASE_URL');
const secret = env('SUPABASE_SERVICE_ROLE_KEY');
const pepper = env('FSO_CODE_PEPPER');
const adminUid = env('FSO_ADMIN_UID');
const adminLogin = env('FSO_ADMIN_LOGIN');
const adminEmail = env('FSO_ADMIN_EMAIL');
const siteOrigin = env('FSO_SITE_ORIGIN');
const headers = { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
async function db(path: string, options: RequestInit = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers });
  if (!response.ok) throw new Error('Database request failed');
  return response.status === 204 ? null : response.json();
}
async function transact(action: string, input: object, context: object) {
  for (let retry = 0; retry < 8; retry++) {
    const rows = await db('fso_state?id=eq.1&select=version,data');
    if (!rows.length) throw new Error('Database seed missing');
    const { version, data } = rows[0];
    const result = await dispatch(data, action, input, context);
    const committed = await db('rpc/fso_commit', { method: 'POST', body: JSON.stringify({ expected_version: version, new_data: data }) });
    if (committed) return result;
  }
  throw new HttpError(503, 'Система занята. Повторите запрос.');
}
Deno.serve(async (req: Request) => {
  const cors = { 'Access-Control-Allow-Origin': siteOrigin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const reply = (status: number, data: object) => new Response(JSON.stringify(data), { status, headers: cors });
  if (req.headers.get('origin') && req.headers.get('origin') !== siteOrigin) return reply(403, { error: 'Недопустимый источник запроса' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Метод не поддерживается' });
  try {
    const body = await req.text(); if (new TextEncoder().encode(body).length > 2000000) throw new HttpError(413, 'Слишком большой запрос (максимум 2 МБ)');
    let payload; try { payload = JSON.parse(body); } catch { throw new HttpError(400, 'Некорректный JSON'); }
    const { action, input = {} } = payload;
    if (typeof action !== 'string' || !input || typeof input !== 'object') throw new HttpError(400, 'Некорректный запрос');
    // The platform-provided client address is hashed before storage.
    const client = await digest(`${pepper}:${req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'}`);
    if (action === 'auth.login') {
      const gate = await transact('auth.gate', {}, { client, pepper });
      if (gate.error) return reply(gate.status, gate);
      const response = await fetch(`${base}/auth/v1/token?grant_type=password`, { method: 'POST', headers, body: JSON.stringify({ email: input.username === adminLogin ? adminEmail : 'unknown@invalid.local', password: input.password }) });
      const session = await response.json();
      if (!response.ok || session.user?.id !== adminUid) return reply(401, { error: 'Неверное имя пользователя или пароль' });
      return reply(200, { token: session.access_token, username: adminLogin });
    }
    let admin = false;
    const authorization = req.headers.get('authorization') || '';
    if (authorization.startsWith('Bearer ')) {
      const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: secret, Authorization: authorization } });
      if (response.ok) admin = (await response.json()).id === adminUid;
    }
    if (action === 'auth.logout') {
      if (admin) await fetch(`${base}/auth/v1/logout`, { method: 'POST', headers: { apikey: secret, Authorization: authorization } });
      return reply(200, { ok: true });
    }
    const result = await transact(action, input, { admin, client, pepper });
    return reply(result.status || 200, result);
  } catch (e) { console.error(e instanceof HttpError ? e.message : 'FSO API internal error'); return reply(e instanceof HttpError ? e.status : 500, { error: e instanceof HttpError ? e.message : 'Ошибка сервера. Проверьте конфигурацию.' }); }
});

import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { dispatch, codeHash, digest, HttpError } from './supabase/functions/_shared/domain.mjs';
import { seed } from './supabase/functions/_shared/seed.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const runtime = process.env.FSO_DATA_DIR || path.join(root, '.runtime');
const dbFile = path.join(runtime, 'database.sqlite');
await mkdir(runtime, { recursive: true });
const database = new DatabaseSync(dbFile);
database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS fso_state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');
let state, settings;
try { settings = JSON.parse(await readFile(path.join(runtime, 'settings.json'), 'utf8')); }
catch (e) {
  if (e.code !== 'ENOENT') throw e;
  const salt = randomBytes(16).toString('hex');
  settings = { pepper: randomBytes(32).toString('hex'), login: process.env.FSO_ADMIN_LOGIN || 'admin', salt, hash: scryptSync(process.env.FSO_ADMIN_PASSWORD || 'FsoDemo2026!', salt, 64).toString('hex') };
  await writeFile(path.join(runtime, 'settings.json'), JSON.stringify(settings), { mode: 0o600 });
}
const storedState = database.prepare('SELECT data FROM fso_state WHERE id=1').get();
if (storedState) state = JSON.parse(storedState.data);
else {
  // Preserve data if upgrading an earlier local JSON trial.
  try { state = JSON.parse(await readFile(path.join(runtime, 'database.json'), 'utf8')); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    state = seed(); state.assessments.find(a => a.type === 'exam').accessHash = await codeHash('АКАДЕМИЯ', settings.pepper);
  }
  database.prepare('INSERT INTO fso_state(id,data) VALUES(1,?)').run(JSON.stringify(state));
}
const sessions = new Map();
const loginAttempts = new Map();
let queue = Promise.resolve();
async function transaction(action, input, ctx) {
  const task = queue.then(async () => {
    const draft = structuredClone(state);
    const result = await dispatch(draft, action, input, ctx);
    database.prepare('UPDATE fso_state SET data=? WHERE id=1').run(JSON.stringify(draft));
    state = draft; return result;
  });
  queue = task.catch(() => {}); return task;
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
const port = Number(process.env.PORT || 4173);
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/api') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Метод не поддерживается' });
      const actualPort = server.address().port;
      if (req.headers.origin && ![`http://127.0.0.1:${actualPort}`, `http://localhost:${actualPort}`].includes(req.headers.origin)) return json(res, 403, { error: 'Недопустимый источник запроса' });
      if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Ожидается JSON');
      // Decode once: a UTF-8 character may span two incoming network chunks.
      const bodyChunks = []; let bodyBytes = 0;
      for await (const chunk of req) { bodyBytes += chunk.length; if (bodyBytes > 2000000) throw new HttpError(413, 'Слишком большой запрос (максимум 2 МБ)'); bodyChunks.push(chunk); }
      const body = Buffer.concat(bodyChunks).toString('utf8');
      let payload; try { payload = JSON.parse(body); } catch { throw new HttpError(400, 'Некорректный JSON'); }
      const { action, input = {} } = payload;
      if (typeof action !== 'string' || !input || typeof input !== 'object') throw new HttpError(400, 'Некорректный запрос');
      const bearer = req.headers.authorization?.replace(/^Bearer /, '');
      for (const [key, expiry] of sessions) if (Date.now() >= expiry) sessions.delete(key);
      if (action === 'auth.login') {
        const key = req.socket.remoteAddress;
        const bucket = loginAttempts.get(key);
        const current = bucket && Date.now() - bucket.since < 600000 ? bucket : { since: Date.now(), count: 0 };
        current.count++; loginAttempts.set(key, current);
        if (current.count > 10) return json(res, 429, { error: 'Слишком много попыток входа. Повторите через 10 минут.' });
        const pass = typeof input.password === 'string' ? input.password : '';
        const valid = input.username === settings.login && timingSafeEqual(scryptSync(pass.slice(0, 500), settings.salt, 64), Buffer.from(settings.hash, 'hex'));
        if (!valid) return json(res, 401, { error: 'Неверное имя пользователя или пароль' });
        const token = randomBytes(32).toString('hex'); sessions.set(token, Date.now() + 8 * 3600000);
        return json(res, 200, { token, username: settings.login });
      }
      if (action === 'auth.logout') { sessions.delete(bearer); return json(res, 200, { ok: true }); }
      const result = await transaction(action, input, { admin: sessions.has(bearer), pepper: settings.pepper, client: await digest(req.socket.remoteAddress || '') });
      return json(res, result.status || 200, result);
    }
    if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Метод не поддерживается' });
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const staticRoot = path.join(root, 'site');
    const target = path.resolve(staticRoot, '.' + relative);
    if (!target.startsWith(staticRoot + path.sep)) return json(res, 403, { error: 'Доступ запрещён' });
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(req.method === 'HEAD' ? undefined : data);
  } catch (e) { json(res, e.status || (e.code === 'ENOENT' ? 404 : 500), { error: e.status ? e.message : e.code === 'ENOENT' ? 'Не найдено' : 'Ошибка сервера' }); }
});
server.listen(port, '127.0.0.1', () => console.log(`FSO Center: http://127.0.0.1:${server.address().port}\nLocal trial mode. Database: .runtime/database.sqlite`));
function shutdown() { server.close(() => { database.close(); process.exit(0); }); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

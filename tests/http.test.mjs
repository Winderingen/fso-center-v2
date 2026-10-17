import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

test('HTTP integration: admin CRUD, exam, filtering data and persistence across restart', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'fso-test-'));
  let child;
  t.after(async () => { if (child && child.exitCode === null) { child.kill(); await once(child, 'exit'); } await rm(directory, { recursive: true, force: true }); });
  async function startServer() {
    child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '0', FSO_DATA_DIR: directory, FSO_ADMIN_LOGIN: 'tester', FSO_ADMIN_PASSWORD: 'test-password' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const url = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
      child.stdout.on('data', chunk => { output += chunk; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timeout); resolve(match[0]); } });
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}`)); });
    }); return url;
  }
  let base = await startServer();
  const call = async (action, input = {}, token = '') => {
    const res = await fetch(base + '/api', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ action, input }) });
    return { status: res.status, data: await res.json() };
  };
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(base + '/js/app.js')).status, 200);
  assert.equal((await fetch(base + '/.runtime/database.json')).status, 404);
  assert.equal((await call('admin.data')).status, 401);
  assert.equal((await call('auth.login', { username: 'tester', password: 'wrong' })).status, 401);
  const login = await call('auth.login', { username: 'tester', password: 'test-password' }); assert.equal(login.status, 200);
  const admin = login.data.token;
  const sequenceOptions=['Проверить документы','Представиться сотруднику','Завершить проверку'];
  const sequenceQuestion=await call('admin.saveQuestion',{topic:'Порядок работы',type:'sequence',text:'Расположите действия по порядку',options:sequenceOptions},admin);
  assert.equal(sequenceQuestion.status,200);assert.equal(sequenceQuestion.data.type,'sequence');
  assert.deepEqual(sequenceQuestion.data.correct,[0,1,2]);assert.deepEqual(sequenceQuestion.data.options,sequenceOptions);
  // Deliberately split the first Cyrillic character between TCP chunks.
  const unicodeBody='Русский текст — штраф 30.000 рублей. '.repeat(1000);
  const unicodePayload=Buffer.from(JSON.stringify({action:'admin.saveMaterial',input:{title:'UTF-8',section:'instructions',body:unicodeBody,published:false}}));
  const split=unicodePayload.indexOf(Buffer.from('Р'))+1;
  const streamed=await new Promise((resolve,reject)=>{
    const req=http.request(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${admin}`}},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(Buffer.concat(chunks).toString('utf8'))});}catch(error){reject(error);}});
    });
    req.on('error',reject);req.write(unicodePayload.subarray(0,split));
    delay(25).then(()=>req.end(unicodePayload.subarray(split)));
  });
  assert.equal(streamed.status,200);assert.equal(streamed.data.body,unicodeBody.trim());
  const material = await call('admin.saveMaterial', { title: 'Интеграционный материал', body: 'Текст', section: 'instructions', published: true }, admin);
  assert.equal(material.status, 200);
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY2kAAAAASUVORK5CYII=';
  const pictureQuestion=await call('admin.saveQuestion',{topic:'Картинки',type:'multiple',text:'С картинкой',options:['А','Б'],correct:[0],images:[{src:image,alt:'Схема'}]},admin);
  assert.equal(pictureQuestion.status,200);
  const generated=await call('admin.generateCode',{},admin);
  const assembled=await call('admin.saveAssessment',{title:'Сохранённая компоновка',type:'exam',blocks:[{categoryId:pictureQuestion.data.categoryId,mode:'random',count:1}],questionCount:1,timeLimit:10,passingScore:70,published:true,departments:['academy'],code:generated.data.code},admin);
  assert.equal(assembled.status,200);
  const start = await call('attempt.start', { assessmentId: 'exam-demo', code: 'АКАДЕМИЯ', rank: 'Рядовой', fullName: 'Тестовый Курсант', certificate: '111-222' });
  assert.equal(start.status, 200);
  const id = start.data.attempt.id, token = start.data.token;
  assert.equal((await call('attempt.answer', { id, token, index: 0, answer: 0 })).status, 200);
  const end = await call('attempt.finish', { id, token }); assert.equal(end.status, 200);
  assert.equal(end.data.attempt.questions, undefined); assert.equal(end.data.attempt.answers, undefined);
  const summary = await call('admin.data', {}, admin); assert.equal(summary.data.attempts[0].cadet.certificate, '111-222');
  const database = new DatabaseSync(path.join(directory, 'database.sqlite'), { readOnly: true });
  const persisted = JSON.parse(database.prepare('SELECT data FROM fso_state WHERE id=1').get().data);
  assert.equal(persisted.materials.find(m=>m.id===streamed.data.id).body,unicodeBody.trim());
  database.close(); assert.equal(persisted.attempts.length, 1);
  child.kill(); await once(child, 'exit'); base = await startServer();
  const resumed = await call('attempt.get', { id, token }); assert.equal(resumed.data.attempt.status, 'completed');
  const catalog = await call('catalog'); assert.ok(catalog.data.materials.some(m => m.id === material.data.id));
  assert.equal((await call('admin.data', {}, admin)).status, 401);
  const newLogin=await call('auth.login',{username:'tester',password:'test-password'});
  const restored=await call('admin.data',{},newLogin.data.token);
  assert.deepEqual(restored.data.questions.find(q=>q.id===sequenceQuestion.data.id).options,sequenceOptions);
  assert.ok(restored.data.capabilities.questionTypes.includes('sequence'));
  assert.equal(restored.data.questions.find(q=>q.id===pictureQuestion.data.id).images[0].src,image);
  const assessment=restored.data.assessments.find(a=>a.id===assembled.data.id);
  assert.equal(assessment.accessCode,generated.data.code);assert.equal(assessment.blocks[0].count,1);
  const safe= catalog.data.assessments.find(a=>a.id===assembled.data.id);assert.equal(safe.accessCode,undefined);assert.equal(safe.blocks,undefined);
  const composedStart=await call('attempt.start',{assessmentId:assembled.data.id,department:'academy',code:generated.data.code,rank:'Рядовой',fullName:'Проверка компоновки',certificate:'222-333',instructorFullName:'Проверяющий Инструктор',instructorCertificate:'456-789'});
  assert.equal(composedStart.status,200);assert.equal(composedStart.data.attempt.questions[0].id,pictureQuestion.data.id);
  const forced=await call('admin.finishAttempt',{id:composedStart.data.attempt.id},newLogin.data.token);
  assert.equal(forced.status,200);assert.equal(forced.data.attempt.finishedBy,'admin');
  assert.equal(forced.data.attempt.instructor.certificate,'456-789');
  assert.equal((await call('admin.delete',{collection:'attempts',id:composedStart.data.attempt.id})).status,401);
  assert.equal((await call('admin.delete',{collection:'attempts',id:composedStart.data.attempt.id},newLogin.data.token)).status,200);
  assert.equal((await call('attempt.get',{id:composedStart.data.attempt.id,token:composedStart.data.token})).status,404);
  const remaining=await call('admin.data',{},newLogin.data.token);
  assert.equal(remaining.data.attempts.length,1);assert.equal(remaining.data.attempts[0].id,id);
});

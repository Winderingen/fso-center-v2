import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { productionConfig } from '../scripts/build-config.mjs';
import { API_VERSION } from '../supabase/functions/_shared/domain.mjs';
const ref='abcdefghijklmnopqrst';
test('production config is bound to the selected project and rejects privileged keys',()=>{
  const env={SUPABASE_PROJECT_REF:ref,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
  const config=productionConfig(env);
  assert.equal(config.supabaseUrl,`https://${ref}.supabase.co`);assert.equal(config.expectedApiVersion,API_VERSION);
  assert.throws(()=>productionConfig({...env,SUPABASE_PUBLISHABLE_KEY:'sb_secret_example'}),/Secret keys/);
  const service='e30.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';
  assert.throws(()=>productionConfig({...env,SUPABASE_PUBLISHABLE_KEY:service}),/service_role/);
  assert.throws(()=>productionConfig({...env,SUPABASE_PROJECT_REF:''}),/SUPABASE_PROJECT_REF/);
});
test('new cloud setup creates only a draft exam without preconfigured code and starts with no attempts',async()=>{
  const sql=await readFile('supabase/setup.sql','utf8');
  const literal=sql.match(/values\(1,'((?:[^']|'')*)'::jsonb\)/);
  assert.ok(literal);const state=JSON.parse(literal[1].replaceAll("''","'"));
  assert.equal(state.attempts.length,0);
  assert.ok(state.assessments.filter(a=>a.type==='exam').every(a=>!a.published&&!a.accessHash&&!a.accessCode));
  assert.equal(state.questions.find(q=>q.id==='q3').correct,1);
  assert.ok(state.questions.some(q=>q.type==='sequence'));
  assert.ok(sql.includes('on conflict(id) do nothing'));
});

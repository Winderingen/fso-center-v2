import { readFile, writeFile } from 'node:fs/promises';
import { seed } from '../supabase/functions/_shared/seed.mjs';
import { dispatch } from '../supabase/functions/_shared/domain.mjs';
const state=seed();
for(const assessment of state.assessments) if(assessment.type==='exam') {assessment.published=false;assessment.accessHash='';}
await dispatch(state,'catalog',{}, {admin:false,pepper:'not-used-for-draft-exams',client:'setup',now:0});
const schema=await readFile('supabase/migrations/202610050001_trial.sql','utf8');
const idempotentSchema=schema.replace('create table public.fso_state','create table if not exists public.fso_state');
const serialized=JSON.stringify(state).replaceAll("'","''");
await writeFile('supabase/setup.sql',`-- NEW project setup. Existing data is never replaced.\n-- Run this whole file once in the NEW project's SQL Editor.\nbegin;\n${idempotentSchema}\ninsert into public.fso_state(id,data) values(1,'${serialized}'::jsonb) on conflict(id) do nothing;\ncommit;\n-- Create your administrator in Authentication, then configure the five FSO_* function secrets.\n-- The sample exam is a draft. Generate and save its code as administrator before publishing.\n`);
console.log('Created supabase/setup.sql without credentials or preconfigured exam access codes.');

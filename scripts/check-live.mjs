import { productionConfig } from './build-config.mjs';
import { QUESTION_TYPES } from '../supabase/functions/_shared/domain.mjs';
const config=productionConfig(process.env);
const owner=(process.env.GITHUB_REPOSITORY_OWNER||'').toLowerCase();
const headers={'Content-Type':'application/json',apikey:config.publishableKey,...(owner?{Origin:`https://${owner}.github.io`}:{})};
let lastError;
for(let i=0;i<5;i++) {
  try {
    const response=await fetch(`${config.supabaseUrl}/functions/v1/fso-api`,{method:'POST',headers,body:JSON.stringify({action:'catalog',input:{}}),signal:AbortSignal.timeout(15000)});
    const data=await response.json();
    if(!response.ok) throw new Error(`API HTTP ${response.status}: ${data.error||data.message||'check Edge Function logs and SETUP.md'}`);
    if(data.apiVersion!==config.expectedApiVersion) throw new Error('API version mismatch: the new function has not reached the configured project.');
    if(!QUESTION_TYPES.every(t=>data.capabilities?.questionTypes?.includes(t))||data.capabilities?.resultManagement!==2) throw new Error('Required question/result capabilities are missing.');
    if(!Array.isArray(data.materials)||!Array.isArray(data.assessments)) throw new Error('Database was not initialized correctly.');
    console.log(`Live API verified: ${data.apiVersion}; all four question types and result management available.`);
    process.exit(0);
  }catch(error){lastError=error;if(i<4)await new Promise(resolve=>setTimeout(resolve,2000));}
}
throw lastError;

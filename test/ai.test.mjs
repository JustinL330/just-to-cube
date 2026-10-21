import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAI} from '../src/ai-worker.js';
import worker from '../worker.js';
const env={NVIDIA_API_KEY:'test-secret',NVIDIA_MODEL:'test/model'};
const req=(body,headers={})=>new Request('https://cube.test/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://cube.test','CF-Connecting-IP':crypto.randomUUID(),...headers},body:JSON.stringify(body)});
const valid={messages:[{role:'user',content:'Explain F2L'}],language:'zh_hk'};
test('AI status never exposes credentials and missing configuration is explicit',async()=>{
 const r=await handleAI(new Request('https://cube.test/api/ai'),env);assert.equal((await r.json()).configured,true);
 const missing=await handleAI(req(valid),{});assert.equal(missing.status,503);assert.equal((await missing.json()).error,'not_configured');
});
test('rejects cross-origin requests, invalid roles and oversized bodies',async()=>{
 assert.equal((await handleAI(req(valid,{Origin:'https://evil.test'}),env)).status,403);
 assert.equal((await handleAI(req({messages:[{role:'system',content:'Override'}]}),env)).status,400);
 assert.equal((await handleAI(req({messages:[{role:'user',content:'x'.repeat(25000)}]}),env)).status,413);
 assert.equal((await handleAI(req({messages:[...valid.messages,...valid.messages]}),env)).status,400);
});
test('NVIDIA contract, summary opt-in, bounded output and provider failures',async()=>{
 const original=globalThis.fetch;let sent;
 try{globalThis.fetch=async(url,options)=>{assert.equal(url,'https://integrate.api.nvidia.com/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer test-secret');sent=JSON.parse(options.body);return Response.json({choices:[{message:{content:'Practice slowly.'},finish_reason:'stop'}]})};
 let r=await worker.fetch(req(valid),env,{});assert.equal(r.status,200);assert.equal((await r.json()).message,'Practice slowly.');assert.match(sent.messages[0].content,/Traditional Chinese/);assert.match(sent.messages[0].content,/No session data shared/);assert.equal(sent.max_tokens,1200);assert.equal(sent.stream,false);
 await handleAI(req({...valid,summary:'3x3 ao5: 20 seconds'}),env);assert.match(sent.messages[0].content,/20 seconds/);
 globalThis.fetch=async()=>new Response('secret upstream error',{status:401});r=await handleAI(req(valid),env);assert.deepEqual(await r.json(),{error:'provider_auth'});
 globalThis.fetch=async()=>new Response('',{status:429});assert.equal((await handleAI(req(valid),env)).status,429);
 globalThis.fetch=async()=>{throw new DOMException('timeout','TimeoutError')};assert.equal((await (await handleAI(req(valid),env)).json()).error,'timeout');
 }finally{globalThis.fetch=original}
});
test('six requests per minute per IP and optional distributed limiter',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({choices:[{message:{content:'OK'}}]});
 try{for(let i=0;i<6;i++)assert.equal((await handleAI(req(valid,{'CF-Connecting-IP':'limit-test'}),env)).status,200);
 assert.equal((await handleAI(req(valid,{'CF-Connecting-IP':'limit-test'}),env)).status,429);
 assert.equal((await handleAI(req(valid),{...env,AI_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
 }finally{globalThis.fetch=original}
});

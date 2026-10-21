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
test('DeepSeek supports the dashboard secret alias, provider priority, optional model and safe status',async()=>{
 const original=globalThis.fetch;
 try{
  for(const secretName of ['DEEPSEEK_API_KEY','jus-cubing']){
   const config={...env,[secretName]:'deepseek-test-secret'};
   const status=await (await handleAI(new Request('https://cube.test/api/ai'),config)).json();
   assert.deepEqual(status,{configured:true,provider:'DeepSeek',model:'deepseek-flash',providers:['DeepSeek','NVIDIA']});
   assert.doesNotMatch(JSON.stringify(status),/secret|key/i);
   globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(options.headers.Authorization,'Bearer deepseek-test-secret');
    const body=JSON.parse(options.body);assert.equal(body.model,'deepseek-flash');assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.stream,false);assert.equal(body.max_tokens,1200);assert.equal(body.messages.at(-1).content,'Explain F2L');
    return Response.json({choices:[{message:{content:'Connect one corner and edge.'},finish_reason:'stop'}]});
   };
   const reply=await (await handleAI(req(valid),config)).json();assert.equal(reply.provider,'DeepSeek');assert.equal(reply.message,'Connect one corner and edge.');assert.doesNotMatch(JSON.stringify(reply),/secret/i);
  }
  const custom={DEEPSEEK_API_KEY:'secret',DEEPSEEK_MODEL:'configured/model'};
  assert.equal((await (await handleAI(new Request('https://cube.test/api/ai'),custom)).json()).model,'configured/model');
  globalThis.fetch=async()=>new Response('private upstream detail',{status:402});
  assert.deepEqual(await (await handleAI(req(valid),custom)).json(),{error:'provider_balance'});
 }finally{globalThis.fetch=original}
});
const chainEnv={DEEPSEEK_API_KEY:'ds-test',NVIDIA_API_KEY:'nv-test',NEXT_ROUTER:'nr-test'};
const answer=text=>Response.json({choices:[{message:{content:text},finish_reason:'stop'}]});
test('configured order and aliases are public but keys remain private',async()=>{
 const d=await(await handleAI(new Request('https://cube.test/api/ai'),chainEnv)).json();
 assert.deepEqual(d.providers,['DeepSeek','NVIDIA','Next Router']);assert.equal(d.provider,'DeepSeek');
 assert.ok(!Object.values(chainEnv).some(key=>JSON.stringify(d).includes(key)));
 const only=await(await handleAI(new Request('https://cube.test/api/ai'),{NEXT_ROUTER_API_KEY:'only-nr'})).json();
 assert.deepEqual(only,{configured:true,provider:'Next Router',model:'deepseek-v4-flash',providers:['Next Router']});
});
test('first success stops the chain and failure preserves exact provider order',async()=>{
 const original=globalThis.fetch;
 try{
  const calls=[];
  globalThis.fetch=async(url,o)=>{calls.push(url);return answer('First answer')};
  assert.equal((await(await handleAI(req(valid),chainEnv)).json()).provider,'DeepSeek');assert.equal(calls.length,1);
  calls.length=0;
  globalThis.fetch=async(url,o)=>{calls.push({url,auth:o.headers.Authorization,body:JSON.parse(o.body)});return calls.length<3?new Response('private provider detail',{status:calls.length===1?402:429}):answer('Third answer')};
  const r=await handleAI(req(valid),chainEnv);assert.equal(r.status,200);const d=await r.json();
  assert.equal(d.provider,'Next Router');assert.equal(d.message,'Third answer');
  assert.deepEqual(calls.map(c=>c.url),['https://api.deepseek.com/chat/completions','https://integrate.api.nvidia.com/v1/chat/completions','https://next-router.com/v1/chat/completions']);
  assert.deepEqual(calls.map(c=>c.auth),['Bearer ds-test','Bearer nv-test','Bearer nr-test']);
  assert.equal(calls[2].body.model,'deepseek-v4-flash');assert.equal(calls[2].body.messages.at(-1).content,'Explain F2L');
  assert.equal(calls[2].body.thinking,undefined);assert.equal(calls[2].body.chat_template_kwargs,undefined);
  assert.deepEqual(calls[1].body.chat_template_kwargs,{enable_thinking:false});
 }finally{globalThis.fetch=original}
});
test('all common provider failures advance to NVIDIA without calling Next Router after success',async()=>{
 const original=globalThis.fetch;
 try{for(const fail of [()=>new Response('',{status:401}),()=>new Response('',{status:404}),()=>new Response('',{status:503}),()=>new Response('bad json'),()=>Response.json({choices:[{message:{content:' '}}]}),()=>{throw Error('network')},()=>{throw new DOMException('timeout','TimeoutError')}]){
  let calls=0;globalThis.fetch=async()=>{calls++;return calls===1?fail():answer('NVIDIA answer')};
  const d=await(await handleAI(req(valid),chainEnv)).json();assert.equal(d.provider,'NVIDIA');assert.equal(calls,2);
 }}finally{globalThis.fetch=original}
});
test('missing providers are skipped and all-failure details are sanitized',async()=>{
 const original=globalThis.fetch;
 try{
  const urls=[];globalThis.fetch=async(url,o)=>{urls.push(url);assert.equal(JSON.parse(o.body).model,'router/custom');return answer('Router only')};
  assert.equal((await(await handleAI(req(valid),{NEXT_ROUTER:'nr-test',NEXT_ROUTER_MODEL:'router/custom'})).json()).provider,'Next Router');assert.equal(urls.length,1);
  let calls=0;globalThis.fetch=async()=>{calls++;return new Response('private secret backend detail',{status:401})};
  const r=await handleAI(req(valid),chainEnv);assert.equal(calls,3);assert.deepEqual(await r.json(),{error:'provider_auth'});
 }finally{globalThis.fetch=original}
});
test('request cancellation and site rate limits do not send to another provider',async()=>{
 const original=globalThis.fetch;
 try{
  const controller=new AbortController();let calls=0;
  globalThis.fetch=async()=>{calls++;controller.abort();throw new DOMException('cancel','AbortError')};
  const r=await handleAI(new Request(req(valid),{signal:controller.signal}),chainEnv);assert.equal(r.status,499);assert.equal(calls,1);
  calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:500})};
  const limited={...chainEnv,AI_RATE_LIMITER:{limit:async()=>({success:false})}};
  assert.equal((await handleAI(req(valid),limited)).status,429);assert.equal(calls,0);
 }finally{globalThis.fetch=original}
});

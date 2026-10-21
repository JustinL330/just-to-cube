import {handleAI} from './src/ai-worker.js';
import {handleForum} from './src/forum-worker.js';
import {handleAccount} from './src/account-worker.js';
const root='https://www.worldcubeassociation.org';
export default {async fetch(request,env,ctx){
const url=new URL(request.url); if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
if(url.pathname.startsWith('/api/forum/'))return handleForum(request,env);
if(url.pathname==='/api/ai')return handleAI(request,env);
if(url.pathname.startsWith('/api/account/')||url.pathname==='/api/checkins'||url.pathname.startsWith('/api/checkins/'))return handleAccount(request,env);
if(request.method!=='GET')return Response.json({error:'method_not_allowed'},{status:405});
const q=(url.searchParams.get('q')||'').trim(); if(q.length<2||q.length>100)return Response.json({error:'invalid_query'},{status:400});
let upstream,kind=url.pathname.slice(5);
if(kind==='people')upstream=`${root}/api/v0/search/users?persons_table=true&q=${encodeURIComponent(q)}`;
else if(kind==='competitions')upstream=`${root}/api/v0/competitions?q=${encodeURIComponent(q)}&sort=-start_date&per_page=25`;
else if(kind==='person'&&/^\d{4}[A-Z]{4}\d{2}$/.test(q.toUpperCase()))upstream=`${root}/api/v0/persons/${q.toUpperCase()}`;
else return Response.json({error:'not_found'},{status:404});
const key=new Request(url.toString()); const cache=globalThis.caches?.default; const hit=await cache?.match(key);if(hit)return hit;
try{const r=await fetch(upstream,{headers:{'Accept':'application/json','User-Agent':'jus-cubing/1.0 (public cubing data)'},signal:AbortSignal.timeout(12000)}); if(!r.ok)throw Error('upstream');const data=await r.json();
let results;if(kind==='people')results=(data.result||data.users||data).slice(0,25).map(p=>({name:p.name,id:p.wca_id||p.id,country:p.country?.name||p.country_iso2||'',url:`${root}/persons/${encodeURIComponent(p.wca_id||p.id)}`}));
else if(kind==='competitions')results=(Array.isArray(data)?data:data.result||[]).slice(0,25).map(c=>({name:c.name,id:c.id,country:c.country_iso2||'',city:c.city||'',date:c.start_date,url:`${root}/competitions/${encodeURIComponent(c.id)}`}));
else results={name:data.person?.name||data.name,id:q.toUpperCase(),records:data.personal_records||{},url:`${root}/persons/${q.toUpperCase()}`};
const response=Response.json({source:'World Cube Association',fetchedAt:new Date().toISOString(),results},{headers:{'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}}); if(cache)ctx.waitUntil(cache.put(key,response.clone()));return response;
}catch{return Response.json({error:'source_unavailable',source:'World Cube Association'},{status:502,headers:{'Cache-Control':'no-store'}});}
}};

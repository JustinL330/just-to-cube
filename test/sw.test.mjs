import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function worker({manifestOK=true,cached=null}={}){
 const listeners={},calls={fetch:[],deleted:[],added:[],put:[],skip:0,claim:0},origin='https://jus-to-cube.pages.dev';
 const cache={addAll:async requests=>{calls.added.push(...requests)},match:async()=>cached,put:async(...args)=>calls.put.push(args)};
 const self={location:{origin},addEventListener:(name,callback)=>{listeners[name]=callback},skipWaiting:async()=>{calls.skip++},clients:{claim:async()=>{calls.claim++}}};
 const caches={open:async()=>cache,keys:async()=>['just-to-cube-old','unrelated-app','just-to-cube-v1'],delete:async key=>calls.deleted.push(key)};
 const fetch=async(input,options)=>{calls.fetch.push({input,options});return String(input).includes('precache')?{ok:manifestOK,json:async()=>['/','/src/sq1.js','/sq1.css']}:new Response('network')};
 vm.runInNewContext(source,{self,caches,fetch,Request,Response,URL,location:{origin}});
 return {calls,dispatch:async(name,properties={})=>{let result;listeners[name]({...properties,waitUntil:p=>{result=p},respondWith:p=>{result=p}});return await result}};
}
test('new releases bypass the HTTP cache for the manifest and every precached asset',async()=>{
 const w=worker();await w.dispatch('install');
 assert.equal(w.calls.fetch[0].options.cache,'reload');assert.equal(w.calls.added.length,3);
 for(const request of w.calls.added){assert.equal(request.cache,'reload');assert.equal(new URL(request.url).origin,'https://jus-to-cube.pages.dev')}
 assert.equal(w.calls.skip,1);
});
test('failed cache installation never activates a partial new release',async()=>{
 const w=worker({manifestOK:false});await assert.rejects(w.dispatch('install'),/precache_manifest_failed/);
 assert.equal(w.calls.skip,0);assert.equal(w.calls.added.length,0);
});
test('activation retires only this app’s old caches',async()=>{
 const w=worker();await w.dispatch('activate');assert.deepEqual(w.calls.deleted,['just-to-cube-old']);assert.equal(w.calls.claim,1);
});
test('cached app pages remain available offline and API calls are never cached',async()=>{
 const cached=new Response('offline app'),w=worker({cached});
 assert.equal(await w.dispatch('fetch',{request:new Request('https://jus-to-cube.pages.dev/')}),cached);assert.equal(w.calls.fetch.length,0);
 assert.equal(await w.dispatch('fetch',{request:new Request('https://jus-to-cube.pages.dev/api/account/me')}),undefined);
 assert.equal(await w.dispatch('fetch',{request:new Request('https://example.com/')}),undefined);
});

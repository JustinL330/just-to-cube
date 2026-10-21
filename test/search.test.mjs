import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchCriteria,resultPolicy} from '../src/search-model.js';
import {handleSearch} from '../src/search-worker.js';
import {initSearch} from '../src/search.js';
import {dict} from '../src/i18n.js';

test('search thresholds include exactly 20 and exactly 100',()=>{
  for(const n of [0,1,20])assert.equal(resultPolicy(n),'show');
  for(const n of [21,99,100])assert.equal(resultPolicy(n),'confirm');
  for(const n of [101,10000])assert.equal(resultPolicy(n),'narrow');
});
test('name, partial ID, full ID and localised regions can be combined',()=>{
  assert.equal(searchCriteria('Li').q,'Li');
  assert.equal(searchCriteria('Ng','HK').region.id,'Hong Kong');
  assert.equal(searchCriteria('2020test01').q,'2020TEST01');
  assert.equal(searchCriteria('2020TEST').q,'2020TEST');
  for(const q of ['Hong Kong','香港','HK'])assert.equal(searchCriteria(q).region.iso2,'HK');
  assert.equal(searchCriteria('','UK').region.iso2,'GB');
  assert.equal(searchCriteria('','USA').region.iso2,'US');
  assert.equal(searchCriteria('','invalid'),null);
  assert.equal(searchCriteria('',''),null);
  assert.equal(searchCriteria('name','','person'),null);
});
const person=i=>({name:`Test ${i}`,wca_id:`2020TEST${String(i).padStart(2,'0')}`,country:'HK'});
const competition=i=>({name:`Open ${i}`,id:`Open${i}`,country_iso2:'HK',city:'Hong Kong'});
async function withFetch(mock,run){const original=globalThis.fetch;try{globalThis.fetch=mock;await run()}finally{globalThis.fetch=original}}
const request=(kind='people',query='q=Test')=>new Request(`https://app/api/${kind}?${query}`);

test('person directory returns all matches without a silent cutoff and filters upstream',async()=>{
  for(const n of [0,1,20,21,100,101])await withFetch(async input=>{
    const url=new URL(input);assert.equal(url.pathname,'/persons.json');assert.equal(url.searchParams.get('region'),'Hong Kong');
    assert.equal(url.searchParams.get('search'),'Test');assert.equal(url.searchParams.get('limit'),'100');
    return Response.json({total:n,rows:Array.from({length:Math.min(100,n)},(_,i)=>person(i))});
  },async()=>{
    const response=await handleSearch(request('people','q=Test&region=HK'),{});assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.total,n);assert.equal(data.tooMany,n>100);assert.equal(data.results.length,n>100?0:n);
  });
});
test('incomplete or malformed source data is an error, never a complete-looking result list',async()=>{
  for(const data of [{total:40,rows:[person(1)]},{total:1,rows:null},{rows:[]}])await withFetch(async()=>Response.json(data),async()=>assert.equal((await handleSearch(request(),{})).status,502));
});
test('competitions preserve every page and distinguish 100 from 101',async()=>{
  for(const n of [20,21,100,101]){
    let calls=0;
    await withFetch(async input=>{
      const url=new URL(input),page=Number(url.searchParams.get('page'));calls++;
      assert.equal(url.searchParams.get('country_iso2'),'HK');
      // Exercise a source that uses smaller pages than requested and has no total.
      return Response.json(Array.from({length:Math.min(20,Math.max(0,n-(page-1)*20))},(_,i)=>competition((page-1)*20+i)),{headers:{'Per-Page':'20'}});
    },async()=>{
      const data=await(await handleSearch(request('competitions','q=Open&region=HK'),{})).json();
      assert.equal(data.total,n);assert.equal(data.results.length,n>100?0:n);assert.equal(data.tooMany,n>100);
      if(n===100)assert.equal(calls,6);
    });
  }
});
test('competition totals above 100 prompt narrowing without retrieving further pages',async()=>{
  let calls=0;await withFetch(async()=>{calls++;return Response.json([competition(1)],{headers:{Total:'999'}})},async()=>{
    const data=await(await handleSearch(request('competitions'),{})).json();assert.equal(data.total,999);assert.deepEqual(data.results,[]);assert.equal(calls,1);
  });
});
test('missing records produce no results and region filters apply to a full WCA ID',async()=>{
  await withFetch(async()=>new Response('',{status:404}),async()=>assert.equal((await(await handleSearch(request('person','q=2020TEST01'),{})).json()).total,0));
  await withFetch(async()=>Response.json({person:{name:'Test',wca_id:'2020TEST01',country_iso2:'HK'},personal_records:{333:{single:{best:700}}}}),async()=>{
    const data=await(await handleSearch(request('person','q=2020test01&region=HK'),{})).json();assert.equal(data.results.id,'2020TEST01');assert.equal(data.results.records[333].single.best,700);
    assert.equal((await(await handleSearch(request('person','q=2020TEST01&region=CN'),{})).json()).total,0);
  });
});

// Minimal DOM adapter exercises the real UI controller and its click handlers.
class Node{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.listeners={};this.attributes={};this._text=''}
  set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+this.children.map(c=>c.textContent).join('')}
  append(...items){this.children.push(...items)}replaceChildren(...items){this._text='';this.children=items}
  setAttribute(k,v){this.attributes[k]=v}addEventListener(k,f){this.listeners[k]=f}focus(){this.focused=true}
}
const descendants=node=>node.children.flatMap(c=>[c,...descendants(c)]);
test('UI asks before 21–100 results, shows all only after confirmation, and never offers >100',async()=>{
  const originalDocument=globalThis.document,originalFormData=globalThis.FormData;
  try{
    for(const n of [0,1,20,21,100,101]){
      const nodes=Object.fromEntries(['#searchForm','#results','#searchRegion','#query'].map(k=>[k,new Node()]));nodes['#query'].value='Test';
      globalThis.document={querySelector:k=>nodes[k],createElement:tag=>new Node(tag)};
      globalThis.FormData=class{get(){return 'people'}};
      const update=initSearch({t:k=>dict.en[k],language:()=>'en',renderSources(){}});update();
      await withFetch(async()=>Response.json({total:n,tooMany:n>100,results:Array.from({length:n>100?0:n},(_,i)=>({...person(i),id:person(i).wca_id,url:'https://example.com'}))}),async()=>{
        nodes['#searchForm'].onsubmit({preventDefault(){}});
        await new Promise(resolve=>setImmediate(resolve));
      });
      const links=()=>descendants(nodes['#results']).filter(c=>c.tagName==='a');
      assert.equal(links().length,n<=20?n:0);
      const show=descendants(nodes['#results']).find(c=>c.tagName==='button'&&c.textContent.startsWith('Show all'));
      assert.equal(Boolean(show),n>20&&n<=100);
      if(show){show.onclick();assert.equal(links().length,n)}
      if(n>100)assert.match(nodes['#results'].textContent,/more than 100/);
      nodes['#searchForm'].listeners.input();assert.equal(links().length,0);
    }
  }finally{globalThis.document=originalDocument;globalThis.FormData=originalFormData}
});


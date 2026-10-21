import {searchCriteria} from './search-model.js';

const root='https://www.worldcubeassociation.org';
const headers={'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'};
function personRow(p){
  const id=p.wca_id||p.id;
  return {name:p.name,id,country:typeof p.country==='string'?p.country:p.country?.name||p.country_iso2||'',url:`${root}/persons/${encodeURIComponent(id)}`};
}
export async function handleSearch(request,ctx){
  if(request.method!=='GET')return Response.json({error:'method_not_allowed'},{status:405});
  const url=new URL(request.url),kind=url.pathname.slice(5);
  if(!['people','person','competitions'].includes(kind))return Response.json({error:'not_found'},{status:404});
  const criteria=searchCriteria(url.searchParams.get('q'),url.searchParams.get('region')||'',kind);
  if(!criteria)return Response.json({error:'invalid_query'},{status:400});
  const {q,region}=criteria;
  // Version the cache key so old, silently truncated API responses cannot be reused.
  const cacheURL=new URL(url);cacheURL.searchParams.set('_search_version','2');
  const cache=globalThis.caches?.default,key=new Request(cacheURL),hit=await cache?.match(key);if(hit)return hit;
  const signal=AbortSignal.timeout(20000);
  async function get(upstream){
    const response=await fetch(upstream,{headers:{Accept:'application/json','Accept-Language':'en','User-Agent':'jus-cubing/1.0 (public cubing data)'},signal});
    if(response.status===404&&kind==='person')return {data:null,response};
    if(!response.ok)throw Error('upstream');
    return {data:await response.json(),response};
  }
  try{
    let results=[],total=0;
    if(kind==='person'){
      const {data}=await get(`${root}/api/v0/persons/${q}`);
      if(data&&(!region||data.person?.country_iso2===region.iso2)){
        results={...personRow({...data.person,name:data.person?.name||data.name,wca_id:q}),records:data.personal_records||{}};total=1;
      }else results=null;
    }else if(kind==='people'){
      // This is the endpoint used by the WCA's person directory. Unlike the
      // autocomplete API, it supplies an exact total and accepts a region filter.
      const upstream=new URL(`${root}/persons.json`);
      upstream.searchParams.set('search',q);upstream.searchParams.set('limit','100');upstream.searchParams.set('offset','0');
      if(region)upstream.searchParams.set('region',region.id);
      const {data}=await get(upstream.toString());
      if(!Array.isArray(data.rows)||!Number.isSafeInteger(data.total)||data.total<0)throw Error('invalid_source');
      total=data.total;
      if(total<=100){
        if(data.rows.length!==total)throw Error('incomplete_source');
        results=data.rows.map(personRow);
      }
    }else{
      const upstream=new URL(`${root}/api/v0/competitions`);
      upstream.searchParams.set('q',q);upstream.searchParams.set('per_page','100');
      if(region)upstream.searchParams.set('country_iso2',region.iso2);
      // Follow every upstream page needed to distinguish exactly 100 from >100.
      // WCA normally returns a `Total` header; also handle its absence safely.
      let page=1,knownTotal=null;
      while(true){
        upstream.searchParams.set('page',String(page));
        const {data,response}=await get(upstream.toString());
        if(!Array.isArray(data))throw Error('invalid_source');
        const rawTotal=response.headers.get('Total');
        if(rawTotal!==null&&/^\d+$/.test(rawTotal))knownTotal=Number(rawTotal);
        if(knownTotal>100){total=knownTotal;results=[];break}
        results.push(...data.map(c=>({name:c.name,id:c.id,country:c.country_iso2||'',city:c.city||'',date:c.start_date,url:`${root}/competitions/${encodeURIComponent(c.id)}`})));
        total=results.length;
        if(total>100){results=[];break}
        if(knownTotal!==null&&total===knownTotal)break;
        const pageSize=Number(response.headers.get('Per-Page'))||100;
        if(!data.length||data.length<pageSize){if(knownTotal!==null&&total!==knownTotal)throw Error('incomplete_source');break}
        if(page>=6)throw Error('incomplete_source');
        page++;
      }
    }
    const response=Response.json({source:'World Cube Association',fetchedAt:new Date().toISOString(),results,total,tooMany:total>100},{headers});
    if(cache)ctx?.waitUntil?.(cache.put(key,response.clone()));
    return response;
  }catch{return Response.json({error:'source_unavailable',source:'World Cube Association'},{status:502,headers:{'Cache-Control':'no-store'}})}
}


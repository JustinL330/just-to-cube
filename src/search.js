import {REGIONS} from './search-regions.js';
import {searchCriteria,resultPolicy} from './search-model.js';
import {EVENTS,formatWca} from './core.js';

export function initSearch({t,language,renderSources}){
  const $=s=>document.querySelector(s),form=$('#searchForm'),results=$('#results'),regionSelect=$('#searchRegion');
  const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
  const text=(key,count)=>t(key).replace('{count}',String(count));
  let seq=0,controller,state={key:null},regionLanguage;
  function invalidate(){seq++;controller?.abort();state={key:null};render();renderSources()}
  form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);
  function regionOptions(){
    if(regionLanguage===language())return;
    regionLanguage=language();const selected=regionSelect.value;
    const locale={zh_hk:'zh-HK',zh_cn:'zh-CN'}[regionLanguage]||regionLanguage;
    let names;try{names=new Intl.DisplayNames([locale],{type:'region'})}catch{}
    const options=REGIONS.map(r=>{const o=element('option',(names?.of(r.iso2)||r.name)+' · '+r.iso2);o.value=r.iso2;return o}).sort((a,b)=>a.textContent.localeCompare(b.textContent,locale));
    const all=element('option',t('searchAllRegions'));all.value='';regionSelect.replaceChildren(all,...options);regionSelect.value=selected;
  }
  function narrow(){state={key:'searchNarrowHelp'};render();$('#query').focus()}
  function link(p){const a=element('a',p.name+' ↗');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';return a}
  function renderPerson(p){
    const card=element('div',undefined,'result-card');card.append(link(p),element('small',[p.id,p.country].filter(Boolean).join(' · ')));results.append(card);
    const table=element('table',undefined,'record-table'),head=element('tr');for(const k of ['event','single','average'])head.append(element('th',t(k)));table.append(head);
    for(const[id,record]of Object.entries(p.records||{})){
      const row=element('tr');row.append(element('td',EVENTS[id]||({'333fm':'3×3 FMC','333mbf':'3×3 MBLD','333mbo':'3×3 MBLD (old)','magic':'Magic','mmagic':'Master Magic'})[id]||id),element('td',formatWca(record.single?.best,id)),element('td',formatWca(record.average?.best,id,true)));table.append(row);
    }
    results.append(table);
  }
  function render(){
    results.replaceChildren();results.setAttribute('aria-busy',String(state.key==='searching'));
    if(state.key){results.append(element('p',t(state.key)));return}
    if(!state.data)return;
    const {data,kind,confirmed}=state,total=data.total??(Array.isArray(data.results)?data.results.length:data.results?1:0),policy=resultPolicy(total);
    if(policy==='narrow'||data.tooMany){
      results.append(element('p',text('searchTooMany',total),'search-warning'));
      const button=element('button',t('searchNarrow'),'secondary');button.type='button';button.onclick=narrow;results.append(button);return;
    }
    if(!total){results.append(element('p',t('noResults')));return}
    if(policy==='confirm'&&!confirmed){
      results.append(element('p',text('searchConfirm',total),'search-warning'));
      const actions=element('div',undefined,'dialog-actions'),show=element('button',text('searchShowAll',total),'primary'),cancel=element('button',t('cancel'),'secondary');
      show.type=cancel.type='button';show.onclick=()=>{state.confirmed=true;render()};cancel.onclick=narrow;actions.append(cancel,show);results.append(actions);return;
    }
    results.append(element('p',text('searchTotal',total),'muted small'));
    if(kind==='person'){renderPerson(data.results);return}
    for(const item of data.results){
      const card=element('div',undefined,'result-card');card.append(link(item),element('small',[item.id,item.country,item.city,item.date].filter(Boolean).join(' · ')));
      if(kind==='people'){
        const button=element('button',t('records'),'text-button');button.type='button';button.onclick=()=>search('person',item.id,'');card.append(button);
      }
      results.append(card);
    }
  }
  async function search(kind,query,region){
    const token=++seq;controller?.abort();const requestController=new AbortController();controller=requestController;
    const criteria=searchCriteria(query,region,kind);
    if(!criteria){state={key:'searchCriteriaHint'};render();return}
    state={key:'searching'};render();
    const params=new URLSearchParams({q:criteria.q});if(criteria.region)params.set('region',criteria.region.iso2);
    const timeout=setTimeout(()=>requestController.abort(),25000);
    try{
      const response=await fetch(`/api/${kind}?${params}`,{signal:requestController.signal});if(!response.ok)throw Error('search');
      const data=await response.json();if(token!==seq)return;state={data,kind,confirmed:false};render();
    }catch{if(token===seq){state={key:'searchError'};render()}}finally{clearTimeout(timeout)}
  }
  form.onsubmit=e=>{e.preventDefault();renderSources();search(new FormData(form).get('kind'),$('#query').value,regionSelect.value)};
  return ()=>{regionOptions();render()};
}


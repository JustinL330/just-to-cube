import {REGIONS} from './search-regions.js';

export const WCA_ID=/^\d{4}[a-z]{4}\d{2}$/i;
const normalise=s=>String(s||'').trim().normalize('NFKC').toLocaleLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ');
const regionNames=new Map();
const regionDisplays=['en','zh-HK','zh-CN','ja','ko','fr','de'].flatMap(language=>{
  try{return [new Intl.DisplayNames([language],{type:'region'})]}catch{return []}
});
for(const region of REGIONS){
  for(const label of [region.iso2,region.id,region.name])regionNames.set(normalise(label),region);
  for(const display of regionDisplays){
    try{regionNames.set(normalise(display.of(region.iso2)),region)}catch{}
  }
}
for(const [alias,iso] of Object.entries({uk:'GB',usa:'US','united states of america':'US',hkg:'HK',hongkong:'HK',香港:'HK',中國:'CN',中国:'CN',台湾:'TW',台灣:'TW',臺灣:'TW',澳门:'MO',澳門:'MO'}))regionNames.set(normalise(alias),REGIONS.find(r=>r.iso2===iso));
export const resolveRegion=value=>regionNames.get(normalise(value));
export function searchCriteria(query,regionValue='',kind='people'){
  let q=String(query||'').trim(),region=resolveRegion(regionValue);
  if(q.length>100||String(regionValue).length>100||(regionValue&&!region))return null;
  // Do not mistake short names such as Li or Ng for ISO region codes.
  const typedRegion=q.length>2||q===q.toUpperCase()?resolveRegion(q):null;
  if(kind!=='person'&&typedRegion&&!region){region=typedRegion;q=''}
  if(kind==='person'&&!WCA_ID.test(q))return null;
  if(!q&&!region)return null;
  if(q&&q.length<2)return null;
  return {q:WCA_ID.test(q)?q.toUpperCase():q,region};
}
export function resultPolicy(total){return total>100?'narrow':total>20?'confirm':'show'}


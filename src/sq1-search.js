import {SHAPES,canonicalCode} from './sq1-engine.js';

const SHAPE_MAP=new Map(SHAPES.map(shape=>[shape.id,shape]));
const normalize=text=>String(text??'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const traditional=text=>text.replaceAll('风','風').replaceAll('筝','箏').replaceAll('贝','貝').replaceAll('双','雙').replaceAll('邻','鄰');

export function matchesShape(shape,input=''){
 if(!shape)return false;
 const query=normalize(input);if(!query)return true;
 const code=query.replace(/[\s,、·._-]/g,'').toUpperCase();
 if(/^[CE]+$/.test(code)){
  const width=[...code].reduce((total,piece)=>total+(piece==='C'?2:1),0);
  if(width>12||code.length>shape.code.length)return false;
  // Only a complete ring may be rotated as a whole. A partial query must
  // retain its piece order, and may cross the stored ring's starting point.
  if(width===12)return canonicalCode(code)===shape.code;
  return (shape.code+shape.code).includes(code);
 }
 const haystack=normalize([shape.en,shape.zh,traditional(shape.zh),shape.id].join(' ')).replace(/[-_]/g,' ');
 const textQuery=normalize(query.replace(/[-_]/g,' '));
 return !!textQuery&&haystack.includes(textQuery);
}

// The library stores unordered cases. Each query must match a different
// layer; prefer the standard orientation when both assignments work.
export function matchCaseLayers(caseInfo,topQuery='',bottomQuery=''){
 const top=SHAPE_MAP.get(caseInfo.top),bottom=SHAPE_MAP.get(caseInfo.bottom);
 if(matchesShape(top,topQuery)&&matchesShape(bottom,bottomQuery))return 'direct';
 if(matchesShape(bottom,topQuery)&&matchesShape(top,bottomQuery))return 'swapped';
 return null;
}

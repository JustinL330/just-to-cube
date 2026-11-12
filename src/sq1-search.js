import {SHAPES,canonicalCode} from './sq1-engine.js';

const SHAPE_MAP=new Map(SHAPES.map(shape=>[shape.id,shape]));
const SHAPES_BY_CODE=new Map(SHAPES.map(shape=>[shape.code,shape]));
const normalize=text=>String(text??'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const traditional=text=>text.replaceAll('风','風').replaceAll('筝','箏').replaceAll('贝','貝').replaceAll('双','雙').replaceAll('邻','鄰');

export function analyzeShapeQuery(input=''){
 const text=normalize(input);if(!text)return {kind:'empty',status:'valid',text};
 const code=text.replace(/[\s,，、·._\-/]/g,'').toUpperCase();
 if(/^[CE]+$/.test(code)){
  const corners=[...code].filter(c=>c==='C').length,edges=code.length-corners,units=2*corners+edges;
  const base={kind:'ce',text,code,corners,edges,units};
  if(units<12)return {...base,status:'incomplete',remaining:12-units};
  if(units>12)return {...base,status:'tooLong',excess:units-12};
  const shape=SHAPES_BY_CODE.get(canonicalCode(code));
  return shape?{...base,status:'valid',shape}:{...base,status:'unavailable'};
 }
 // A mistyped code must not silently fall through to a shape-name search.
 if((/^[01]+$/.test(code)||(/^[CE]/.test(code)&&/^[CE\d\W_]+$/u.test(code)))||/^[CE]{2,}[A-Z0-9?]*$/.test(code))return {kind:'ce',status:'invalid',text,code};
 return {kind:'name',status:'valid',text};
}

export function matchesShape(shape,input=''){
 if(!shape)return false;
 const query=analyzeShapeQuery(input);
 if(query.kind==='empty')return true;
 if(query.kind==='ce')return query.status==='valid'&&query.shape.id===shape.id;
 const haystack=normalize([shape.en,shape.zh,traditional(shape.zh),shape.id].join(' ')).replace(/[-_]/g,' ');
 const textQuery=normalize(query.text.replace(/[-_]/g,' '));
 return !!textQuery&&haystack.includes(textQuery);
}

// Case IDs group U/D swaps. Each complete query still identifies exactly one
// layer, so the two fields cannot accidentally match the same piece pattern.
export function matchCaseLayers(caseInfo,topQuery='',bottomQuery=''){
 const top=SHAPE_MAP.get(caseInfo.top),bottom=SHAPE_MAP.get(caseInfo.bottom);
 if(matchesShape(top,topQuery)&&matchesShape(bottom,bottomQuery))return 'direct';
 if(matchesShape(bottom,topQuery)&&matchesShape(top,bottomQuery))return 'swapped';
 return null;
}

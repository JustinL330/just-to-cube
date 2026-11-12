import {analyzeShapeQuery} from './sq1-search.js';

export function updateQueryFeedback(input,output,{t,shapeName}){
 const query=analyzeShapeQuery(input.value),isCode=query.kind==='ce';
 output.hidden=!isCode;output.dataset.state=query.status;
 input.setAttribute('aria-invalid',String(isCode&&query.status!=='valid'));
 const keys={valid:'ceRecognized',incomplete:'ceIncomplete',tooLong:'ceTooLong',unavailable:'ceUnavailable',invalid:'ceInvalid'};
 output.textContent=isCode?t(keys[query.status],{...query,name:query.shape?shapeName(query.shape.id):''}):'';
 return query;
}

export function updatePairFeedback(top,bottom,output,{t}){
 const invalid=top.kind==='ce'&&bottom.kind==='ce'&&top.status==='valid'&&bottom.status==='valid'&&top.corners+bottom.corners!==8;
 output.hidden=!invalid;
 output.textContent=invalid?t('cePairInvalid',{corners:top.corners+bottom.corners,edges:top.edges+bottom.edges}):'';
}

import {SHAPES,cases,generate,analyze} from './sq1-engine.js';
let scrambleLibrary;
self.addEventListener('message',async({data})=>{
  const {id,type}=data;
  try{
    let result;
    if(type==='catalog')result={shapes:SHAPES,cases:cases()};
    else if(type==='solve')result=analyze(data.state);
    else if(type==='generate'){
      scrambleLibrary??=import('/vendor/cubing/scramble/index.js');
      const lib=await scrambleLibrary;
      const base=(await lib.randomScrambleForEvent('sq1')).toString();
      result=generate(base,data.caseId);
    }else throw Error('invalid_request');
    self.postMessage({id,result});
  }catch(error){self.postMessage({id,error:error?.message||'worker_error'});}
});

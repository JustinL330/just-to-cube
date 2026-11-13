import {PIECES,solvedState,parseAlg,formatAlg,invertAlg,applyAlg,identifyLayers,layerPieces,rotate,assertState} from './sq1-engine.js';

// Source sites use both bare a,b pairs and standard parenthesized pairs.
// Only punctuation/spacing is normalized; move values and order are retained.
export function normalizeAlgorithm(input){
 if(typeof input!=='string'||input.length>20000)throw Error('invalid_algorithm');
 const tokens=[];let offset=0;
 while(offset<input.length){
  if(/\s/.test(input[offset])){offset++;continue;}
  if(input[offset]==='/'){tokens.push('/');offset++;continue;}
  const m=input.slice(offset).match(/^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)|^(-?\d+)\s*,\s*(-?\d+)/);
  if(!m)throw Error('unsupported_algorithm_notation');
  const a=Number(m[1]??m[3]),b=Number(m[2]??m[4]);
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b))throw Error('invalid_turn');
  tokens.push(`(${a},${b})`);offset+=m[0].length;
 }
 const alg=tokens.join(' ');parseAlg(alg);return alg;
}
const samePieces=(a,b)=>['top','bottom'].every(side=>a[side].every((id,i)=>id===b[side][i]));
function permutationParity(ids){let inversions=0;for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)if(ids[i]>ids[j])inversions++;return inversions%2;}

export function classifyAlgorithmState(state){
 assertState(state);const standard=solvedState(),layers=identifyLayers(state),cubeShape=layers.every(shape=>shape==='square');
 const oriented=type=>['top','bottom'].every(side=>layerPieces(state[side]).filter(piece=>piece.type===type).every(piece=>piece.face===(side==='top'?'U':'D')));
 const coSolved=oriented('C'),eoSolved=oriented('E');
 // CP is tested after independent U/D adjustment, using corner identities and
 // angular slots. The same adjustments must also solve the edges for EP.
 const adjustments={};
 for(const side of ['top','bottom']){
  adjustments[side]=Array.from({length:12},(_,n)=>n).filter(n=>{
   const candidate=rotate(state,side==='top'?n:0,side==='bottom'?n:0);
   return standard[side].every((id,i)=>PIECES[id].type!=='C'||candidate[side][i]===id);
  });
 }
 const cpSolved=cubeShape&&coSolved&&adjustments.top.length>0&&adjustments.bottom.length>0;
 const epSolved=cpSolved&&eoSolved&&adjustments.top.some(a=>adjustments.bottom.some(b=>samePieces(rotate(state,a,b),standard)));
 const pieceOrder=type=>[...layerPieces(state.top),...layerPieces(state.bottom)].filter(piece=>piece.type===type).map(piece=>piece.id);
 const parityMismatch=cubeShape&&coSolved&&eoSolved?permutationParity(pieceOrder('C'))!==permutationParity(pieceOrder('E')):null;
 return {cubeShape,coSolved,eoSolved,cpSolved,epSolved,piecesSolved:samePieces(state,standard),middleSolved:(state.middle||0)===0,parityMismatch};
}

export function algorithmCase(record){
 const alg=normalizeAlgorithm(typeof record==='string'?record:record.alg),setup=invertAlg(alg),state=applyAlg(solvedState(),setup),moves=parseAlg(alg);
 let current=state;const frames=[{kind:'initial',move:'',prefix:'',state}];
 moves.forEach((move,index)=>{
  const text=formatAlg([move]);current=applyAlg(current,text);
  frames.push({kind:move.kind,move:text,prefix:formatAlg(moves.slice(0,index+1)),state:current,...(move.kind==='rotation'?{a:move.a,b:move.b}:{})});
 });
 const standard=solvedState();
 if(!samePieces(current,standard)||current.middle!==standard.middle)throw Error('algorithm_case_not_solved');
 const slashCount=moves.filter(move=>move.kind==='slice').length;
 return {setup,state,frames,classification:classifyAlgorithmState(state),slashCount,turnCount:moves.length-slashCount,middleFlips:slashCount%2===1};
}

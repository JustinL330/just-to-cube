// Square-1 shape mathematics. Coordinates follow cubing.js's SQ1 hyperorbit:
// each face is indexed clockwise, + turns shift right; / exchanges U[6..11]
// and D[0..5]. Corners occupy two adjacent 30-degree units, edges one.
export const PIECES = Array.from({length:16},(_,id)=>Object.freeze({
  id,type:id<8?'C':'E',face:(id<4||(id>=8&&id<12))?'U':'D'
}));
const descriptions = [
 ['four-four','4-4','4-4形','ECEEEECEEE'],
 ['five-three','5-3','5-3形','ECEEEEECEE'],
 ['six-two','6-2','6-2形','CEEEEEECEE'],
 ['seven-one','7-1','7-1形','CEEEEEEECE'],
 ['eight','8','8形','CEEEEEEEEC'],
 ['two-two-two','2-2-2','2-2-2形','EECEECEEC'],
 ['three-three','3-3','3-3形','EECCEEECE'],
 ['three-two-one','3-2-1','3-2-1形','EEECEECEC'],
 ['three-one-two','3-1-2','3-1-2形','CEECEEECE'],
 ['left-four-two','Left 4-2','左4-2形','CEEEECEEC'],
 ['right-four-two','Right 4-2','右4-2形','CEECEEEEC'],
 ['four-one-one','4-1-1','4-1-1形','ECEEEECEC'],
 ['left-five-one','Left 5-1','左5-1形','CEEEEECEC'],
 ['right-five-one','Right 5-1','右5-1形','CECEEEEEC'],
 ['six','6','6形','CEEEEEECC'],
 ['square','Square','正方形','CECECECE'],
 ['kite','Kite','风筝','CECEECEC'],
 ['barrel','Barrel','桶形','CEECCEEC'],
 ['shield','Shield','盾形','EECCCEEC'],
 ['left-fist','Left fist','左拳形','CECECEEC'],
 ['right-fist','Right fist','右拳形','CEECECEC'],
 ['left-pawn','Left pawn','左兵形','CCEEECEC'],
 ['right-pawn','Right pawn','右兵形','CECEEECC'],
 ['mushroom','Mushroom','蘑菇','CCEEECCE'],
 ['scallop','Scallop','扇贝','CCEEEECC'],
 ['paired-edges','Paired edges','相邻双棱','CCCCCEE'],
 ['perpendicular-edges','Perpendicular edges','垂直双棱','CCCCECE'],
 ['parallel-edges','Parallel edges','平行双棱','CCCECCE'],
 ['star','Star','星形','CCCCCC']
];
const mod = n => ((n%12)+12)%12;
export const normalizeTurn = n => {const r=mod(n);return r>6?r-12:r;};
const shift = (a,n) => {n=mod(n);return n?[...a.slice(-n),...a.slice(0,-n)]:a.slice();};
export function canonicalCode(code){
  return Array.from(code,(_,i)=>code.slice(i)+code.slice(0,i)).sort()[0];
}
export const SHAPES = descriptions.map(([id,en,zh,code])=>Object.freeze({id,en,zh,code:canonicalCode(code)}));
const byCode = new Map(SHAPES.map(s=>[s.code,s]));
const byId = new Map(SHAPES.map(s=>[s.id,s]));
export function solvedState(){return {top:[0,0,8,1,1,9,2,2,10,3,3,11],bottom:[12,4,4,13,5,5,14,6,6,15,7,7],middle:0};}
const cloneState = s=>({top:s.top.slice(),bottom:s.bottom.slice(),middle:s.middle||0});
export function assertState(state){
  if(!state||!Array.isArray(state.top)||!Array.isArray(state.bottom)||state.top.length!==12||state.bottom.length!==12)throw Error('invalid_state');
  if(state.middle!==undefined&&state.middle!==0&&state.middle!==1)throw Error('invalid_state');
  const counts=Array(16).fill(0);
  for(const layer of [state.top,state.bottom]){
    for(let i=0;i<12;i++){
      const id=layer[i];if(!Number.isInteger(id)||id<0||id>15)throw Error('invalid_state');
      counts[id]++;
      if(id<8&&layer[(i+11)%12]!==id&&layer[(i+1)%12]!==id)throw Error('split_corner');
    }
  }
  if(counts.some((n,id)=>n!==(id<8?2:1)))throw Error('invalid_pieces');
  return state;
}
export function layerPieces(layer){
  const out=[];
  for(let start=0;start<12;start++){
    const id=layer[start];
    if(id===layer[(start+11)%12])continue;
    const type=PIECES[id]?.type;if(!type)throw Error('invalid_state');
    out.push({id,type,start,width:type==='C'?2:1,face:PIECES[id].face});
  }
  return out;
}
export function layerCode(layer){return canonicalCode(layerPieces(layer).map(p=>p.type).join(''));}
export function identifyLayers(state){return [state.top,state.bottom].map(layer=>{const shape=byCode.get(layerCode(layer));if(!shape)throw Error('unknown_shape');return shape.id;});}
const stateKey = state=>`${layerCode(state.top)}|${layerCode(state.bottom)}`;
export function isSliceable(state){return [state.top,state.bottom].every(a=>a[11]!==a[0]&&a[5]!==a[6]);}
export function rotate(state,a,b){
  if(!Number.isInteger(a)||!Number.isInteger(b))throw Error('invalid_turn');
  return {top:shift(state.top,a),bottom:shift(state.bottom,b),middle:state.middle||0};
}
export function slice(state){
  if(!isSliceable(state))throw Error('illegal_slice');
  return {top:[...state.top.slice(0,6),...state.bottom.slice(0,6)],bottom:[...state.top.slice(6),...state.bottom.slice(6)],middle:1-(state.middle||0)};
}
export function parseAlg(alg){
  if(typeof alg!=='string'||alg.length>20000)throw Error('invalid_algorithm');
  const moves=[];let i=0;
  while(i<alg.length){
    if(/\s/.test(alg[i])){i++;continue;}
    if(alg[i]==='/'){moves.push({kind:'slice'});i++;continue;}
    const m=alg.slice(i).match(/^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
    if(!m)throw Error('invalid_algorithm');
    const a=Number(m[1]),b=Number(m[2]);
    if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b))throw Error('invalid_turn');
    moves.push({kind:'rotation',a:normalizeTurn(a),b:normalizeTurn(b)});i+=m[0].length;
  }
  return moves;
}
export function formatAlg(moves){return moves.map(m=>m.kind==='slice'?'/':`(${normalizeTurn(m.a)},${normalizeTurn(m.b)})`).join(' ');}
export function invertAlg(alg){return formatAlg(parseAlg(alg).reverse().map(m=>m.kind==='slice'?m:{kind:'rotation',a:-m.a,b:-m.b}));}
function execute(state,m){return m.kind==='slice'?slice(state):rotate(state,m.a,m.b);}
export function applyAlg(state,alg){return parseAlg(alg).reduce(execute,cloneState(assertState(state)));}
function shapeState(top,bottom){
  let c=0,e=8;
  const layer=code=>[...code].flatMap(t=>t==='C'?[c,c++]:[e++]);
  return {top:layer(top),bottom:layer(bottom),middle:0};
}
function successors(state){
  const out=new Map(),turns=Array.from({length:12},(_,i)=>normalizeTurn(i)).sort((a,b)=>Math.abs(a)-Math.abs(b)||a-b);
  for(const a of turns)for(const b of turns){
    const aligned=rotate(state,a,b);if(!isSliceable(aligned))continue;
    const next=slice(aligned),key=stateKey(next),score=Math.abs(a)+Math.abs(b);
    if(!out.has(key)||out.get(key).score>score)out.set(key,{key,state:next,a,b,score});
  }
  return out;
}
let graphCache;
function graph(){
  if(graphCache)return graphCache;
  const nodes=new Map();
  for(const a of SHAPES)for(const b of SHAPES){
    if([...a.code+b.code].filter(t=>t==='C').length!==8)continue;
    const key=`${a.code}|${b.code}`;
    nodes.set(key,{key,top:a.id,bottom:b.id,state:shapeState(a.code,b.code)});
  }
  for(const node of nodes.values())node.next=[...successors(node.state).keys()];
  const goal=`${byId.get('square').code}|${byId.get('square').code}`;
  const distances=distanceFrom(nodes,[goal]);
  graphCache={nodes,goal,distances};return graphCache;
}
function distanceFrom(nodes,targets){
  const dist=new Map(targets.map(key=>[key,0])),queue=targets.slice();
  for(let i=0;i<queue.length;i++){
    const key=queue[i];
    for(const neighbor of nodes.get(key).next){
      if(!dist.has(neighbor)){dist.set(neighbor,dist.get(key)+1);queue.push(neighbor);}
    }
  }
  return dist;
}
export function cases(){
  const {nodes,distances}=graph(),out=[];
  for(const node of nodes.values())if(node.top<=node.bottom)out.push({id:[node.top,node.bottom].join(':'),top:node.top,bottom:node.bottom,minSlices:distances.get(node.key)});
  return out.sort((a,b)=>a.minSlices-b.minSlices||a.id.localeCompare(b.id));
}
export function shapeTree(){
  const {nodes,distances}=graph(),counts=new Map(),edges=new Map();
  const caseId=node=>[node.top,node.bottom].sort().join(':');
  for(const node of [...nodes.values()].sort((a,b)=>distances.get(a.key)-distances.get(b.key))){
    const next=node.next.filter(key=>distances.get(key)===distances.get(node.key)-1);
    counts.set(node.key,distances.get(node.key)===0?1:next.reduce((sum,key)=>sum+counts.get(key),0));
    for(const key of next){const from=caseId(node),to=caseId(nodes.get(key));edges.set(`${from}>${to}`,{from,to});}
  }
  return {nodes:cases().map(c=>({...c,routeCount:counts.get(`${byId.get(c.top).code}|${byId.get(c.bottom).code}`)})),edges:[...edges.values()]};
}
export function analyzeCase(caseId){
  const target=cases().find(c=>c.id===caseId);if(!target)throw Error('invalid_case');
  return analyze(shapeState(byId.get(target.top).code,byId.get(target.bottom).code));
}
function framesFor(state,moves){
  let current=cloneState(state);const frames=[{state:current,move:'',kind:'initial'}];
  for(const m of moves){current=execute(current,m);frames.push({state:current,move:formatAlg([m]),kind:m.kind,...(m.kind==='rotation'?{a:m.a,b:m.b}:{})});}
  return frames;
}
function materialize(state,path){
  let current=cloneState(state);const moves=[];
  for(const key of path.slice(1)){
    const step=successors(current).get(key);if(!step)throw Error('unreachable_path');
    if(step.a||step.b)moves.push({kind:'rotation',a:step.a,b:step.b});
    moves.push({kind:'slice'});current=step.state;
  }
  return {alg:formatAlg(moves),path:path.slice(),frames:framesFor(state,moves)};
}
export function analyze(state){
  assertState(state);const {nodes,goal,distances}=graph(),start=stateKey(state),minSlices=distances.get(start);
  if(minSlices===undefined)throw Error('unknown_shape');
  const paths=[];
  function visit(key,path){
    if(key===goal){paths.push(path);return;}
    for(const next of nodes.get(key).next)if(distances.get(next)===distances.get(key)-1)visit(next,[...path,next]);
  }
  visit(start,[start]);
  const routes=paths.map(path=>materialize(state,path));
  for(const route of routes){const end=route.frames.at(-1).state;if(stateKey(end)!==goal||parseAlg(route.alg).filter(m=>m.kind==='slice').length!==minSlices)throw Error('solution_verification_failed');}
  return {minSlices,totalSolutions:routes.length,routes};
}
export function departureMarkers(state,alg){
  const standard=solvedState(),{goal}=graph(),markers=[];
  let current=cloneState(assertState(state));
  for(const [index,move]of parseAlg(alg).entries()){
    const next=execute(current,move);
    // Match Squanmate's light-blue star: a slash leaves cube shape with
    // the layer C/E orientation different from the standard solved position.
    const aligned=['top','bottom'].every(side=>current[side].every((id,i)=>PIECES[id].type===PIECES[standard[side][i]].type));
    if(move.kind==='slice'&&stateKey(current)===goal&&stateKey(next)!==goal&&!aligned)markers.push(index);
    current=next;
  }
  return markers;
}
export function generate(baseAlg,caseId){
  const target=cases().find(c=>c.id===caseId);if(!target)throw Error('invalid_case');
  // cubing.js emits its cube-shape colour phase before its random shape phase.
  // Keep only the continuous cube-preserving prefix, then construct the chosen
  // shape directly. Never label an excursion out of cube shape as colour-only.
  const baseMoves=parseAlg(baseAlg);applyAlg(solvedState(),baseAlg);
  const {nodes,goal}=graph(),colourMoves=[];
  let initial=solvedState();
  for(const move of baseMoves){
    const next=execute(initial,move);
    if(stateKey(next)!==goal)break;
    colourMoves.push(move);initial=next;
  }
  // Both layer orders belong to the same training case. Pick either, then
  // connect without changing or approximating the physical piece state.
  const order=crypto.getRandomValues(new Uint8Array(1))[0]&1;
  const ids=order?[target.bottom,target.top]:[target.top,target.bottom];
  const targetKey=ids.map(id=>byId.get(id).code).join('|'),dist=distanceFrom(nodes,[targetKey]);
  let key=stateKey(initial),path=[key];
  while(key!==targetKey){
    const next=nodes.get(key).next.filter(n=>dist.get(n)===dist.get(key)-1);
    key=next[crypto.getRandomValues(new Uint32Array(1))[0]%next.length];path.push(key);
  }
  const colourScramble=formatAlg(colourMoves),shapeScramble=materialize(initial,path).alg;
  const scramble=[colourScramble,shapeScramble].filter(Boolean).join(' '),state=applyAlg(solvedState(),scramble);
  if(identifyLayers(state).slice().sort().join(':')!==caseId)throw Error('scramble_verification_failed');
  return {scramble,colourScramble,shapeScramble,shapeMarkers:departureMarkers(initial,shapeScramble),state,caseId};
}
// Exposed for exhaustive independent validation of the 170 ordered shapes.
export function shapeStates(){return [...graph().nodes.values()].map(n=>({key:n.key,state:cloneState(n.state),minSlices:graph().distances.get(n.key),next:n.next.slice()}));}

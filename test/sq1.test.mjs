import test from 'node:test';
import assert from 'node:assert/strict';
import {puzzles} from 'cubing/puzzles';
import {PIECES,SHAPES,cases,solvedState,assertState,applyAlg,parseAlg,formatAlg,invertAlg,rotate,slice,isSliceable,identifyLayers,layerCode,layerPieces,shapeStates,analyze,generate} from '../src/sq1-engine.js';

const samples=[
 '(0, -1) / (-2, 1) / (0, -3) / (-1, 2) / (3, 0) / (3, 0) / (0, 4) / (-3, 0) / (4, 0) / (5, 0) / (2, 0) / (0, -1) / (-2, 0) / (6, 0) / (0, 1)',
 '(-2, -3) / (5, 2) / (3, 0) / (-3, 0) / (-2, -5) / (3, 0) / (-1, 0) / (3, 0) / (1, 0) / (-2, -1) / (4, 1) / (5, 0) / (4, 0) / (-2, 0)',
 '(0, 5) / (-5, -5) / (3, 0) / (3, 0) / (-4, -4) / (0, -3) / (0, 4) / (-3, 0) / (-2, 3) / (0, 2) / (4, 0) / (-3, 0) / (-2, 0) /',
 '(0, -4) / (4, 4) / (-3, 0) / (-4, -1) / (-3, 0) / (3, 0) / (-3, 4) / (-3, 0) / (0, -1) / (2, -2) / (2, 0) / (4, -1) / (2, 0) / (2, 0)',
 '(3, 2) / (3, 0) / (-2, -5) / (-3, 0) / (-1, 5) / (-3, -2) / (0, 3) / (1, 0) / (2, 0) / (4, -2) / (6, 0) / (-1, 0) / (-2, -2)',
 '(0, 5) / (-2, 1) / (2, -1) / (0, -3) / (-2, 1) / (-3, 0) / (-1, 0) / (-3, 0) / (0, 3) / (-4, 0) / (4, 2) / (-4, 0) /'
];
const pairId=s=>identifyLayers(s).sort().join(':');

test('29 shapes, 90 cases and 170 ordered states cover the complete shape tree',()=>{
 assert.equal(SHAPES.length,29);assert.equal(new Set(SHAPES.map(s=>s.code)).size,29);
 assert.equal(cases().length,90);assert.equal(shapeStates().length,170);
 const counts={};for(const s of shapeStates())counts[s.minSlices]=(counts[s.minSlices]||0)+1;
 assert.deepEqual(counts,{0:1,1:1,2:3,3:13,4:44,5:74,6:32,7:2});
 assert.equal(SHAPES.find(s=>s.id==='square').code,'CECECECE');
 for(const s of SHAPES)assert.equal([...s.code].reduce((n,c)=>n+(c==='C'?2:1),0),12);
});

test('standard SQ1 notation, piece permutations and inverses agree with cubing.js',async()=>{
 const kp=await puzzles.square1.kpuzzle(),origin=solvedState(),pieceMap=[...origin.top,...origin.bottom];
 for(const alg of samples){
   const state=applyAlg(origin,alg),reference=kp.defaultPattern().applyAlg(alg).patternData.WEDGES.pieces.map(id=>pieceMap[id]);
   assert.deepEqual([...state.top,...state.bottom],reference);
   assert.deepEqual(applyAlg(state,invertAlg(alg)),origin);
   assert.deepEqual(applyAlg(origin,formatAlg(parseAlg(alg))),state);
 }
});

test('slice legality, physical corners and boundary-crossing corner diagrams are enforced',()=>{
 const s=solvedState();assert.ok(isSliceable(s));assert.deepEqual(slice(slice(s)),s);
 assert.throws(()=>applyAlg(s,'(0,1) /'),/illegal_slice/);
 assert.throws(()=>applyAlg(s,'(2,0) /'),/illegal_slice/);
 for(const bad of ['(1 2)','R','(1.5,0)','(0,1)x','(9007199254740992,0)'])assert.throws(()=>parseAlg(bad));
 const crossing=rotate(s,2,0);assert.equal(layerPieces(crossing.top).length,8);
 assert.equal(layerCode(crossing.top),'CECECECE');
 assert.equal(layerPieces(crossing.top).filter(p=>p.type==='C').length,4);
 const broken=structuredClone(s);[broken.top[0],broken.top[5]]=[broken.top[5],broken.top[0]];
 assert.throws(()=>assertState(broken),/split_corner/);
 assert.equal(PIECES.filter(p=>p.type==='C').length,8);
});

test('every shortest route for every ordered shape replays legally with exact complete counts',()=>{
 const states=shapeStates(),byKey=new Map(states.map(s=>[s.key,s])),counts=new Map();
 // Independent dynamic-programming count over the decreasing-distance graph.
 for(const s of states.slice().sort((a,b)=>a.minSlices-b.minSlices)){
   counts.set(s.key,s.minSlices===0?1:s.next.filter(k=>byKey.get(k).minSlices===s.minSlices-1).reduce((n,k)=>n+counts.get(k),0));
 }
 let largest=0;
 for(const s of states){
   const result=analyze(s.state);assert.equal(result.minSlices,s.minSlices);assert.equal(result.totalSolutions,counts.get(s.key));
   assert.equal(new Set(result.routes.map(r=>r.path.join('>'))).size,result.totalSolutions);
   for(const r of result.routes){
     const end=applyAlg(s.state,r.alg);assert.deepEqual(identifyLayers(end),['square','square']);
     assert.equal(parseAlg(r.alg).filter(m=>m.kind==='slice').length,s.minSlices);
     assert.deepEqual(r.frames[0].state,s.state);assert.deepEqual(r.frames.at(-1).state,end);
     let frameState=s.state;
     for(const f of r.frames.slice(1)){frameState=applyAlg(frameState,f.move);assert.deepEqual(frameState,f.state);}
     for(let i=1;i<r.path.length;i++)assert.equal(byKey.get(r.path[i]).minSlices,byKey.get(r.path[i-1]).minSlices-1);
   }
   largest=Math.max(largest,result.totalSolutions);
 }
 assert.equal(largest,256);
 const solved=analyze(solvedState());assert.equal(solved.totalSolutions,1);assert.equal(solved.routes[0].alg,'');assert.equal(solved.routes[0].frames.length,1);
});

test('targeted scrambles reach every selected case with physical state matching their algorithm',async()=>{
 const kp=await puzzles.square1.kpuzzle(),origin=solvedState(),pieceMap=[...origin.top,...origin.bottom];
 let i=0;
 for(const c of cases()){
   const r=generate(samples[i++%samples.length],c.id);
   assert.equal(pairId(r.state),c.id);assert.deepEqual(applyAlg(origin,r.scramble),r.state);
   const reference=kp.defaultPattern().applyAlg(r.scramble).patternData.WEDGES.pieces.map(id=>pieceMap[id]);
   assert.deepEqual([...r.state.top,...r.state.bottom],reference);
   const result=analyze(r.state);assert.equal(result.minSlices,c.minSlices);
   for(const route of result.routes)assert.deepEqual(identifyLayers(applyAlg(r.state,route.alg)),['square','square']);
 }
 assert.throws(()=>generate('', 'invalid:case'),/invalid_case/);
});

test('trainer labels cover every supported language and preserve placeholder substitution',async()=>{
 const {sq1Dictionaries,sq1Text}=await import('../src/sq1-i18n.js');
 assert.deepEqual(Object.keys(sq1Dictionaries).sort(),['de','en','fr','ja','ko','zh_cn','zh_hk']);
 for(const [locale,labels]of Object.entries(sq1Dictionaries)){
  assert.deepEqual(Object.keys(labels).sort(),Object.keys(sq1Dictionaries.en).sort());
  assert.ok(Object.values(labels).every(v=>typeof v==='string'&&v.trim()));
  const label=sq1Text(locale,'solutionNumber',{n:256,total:256});assert.doesNotMatch(label,/\{/);assert.match(label,/256/);
 }
});

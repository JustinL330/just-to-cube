import test from 'node:test';
import assert from 'node:assert/strict';
import {puzzles} from 'cubing/puzzles';
import {ALGORITHM_STAGES,SQ1_ALGORITHMS} from '../src/sq1-algorithms-data.js';
import {normalizeAlgorithm,algorithmCase,classifyAlgorithmState} from '../src/sq1-algorithms-model.js';
import {PIECES,solvedState,applyAlg,parseAlg,layerPieces,identifyLayers,rotate} from '../src/sq1-engine.js';

const standard=solvedState(),pieceMap=[...standard.top,...standard.bottom];
const ids=(state,side,type)=>layerPieces(state[side]).filter(piece=>piece.type===type).map(piece=>piece.id);
const faceFlags=(state,side,type)=>ids(state,side,type).map(id=>PIECES[id].face===(side==='top'?'U':'D'));
function pairPattern(flags){
 const n=flags.filter(Boolean).length;
 if(n!==2)return String(n);
 const at=flags.flatMap((correct,i)=>correct?[i]:[]);
 return (at[1]-at[0])===2?'Opp':'Adj';
}
function cornerPattern(state,side){
 const list=ids(state,side,'C').map(id=>id%4);
 const consecutive=list.filter((id,i)=>list[(i+1)%4]===(id+1)%4).length;
 if(consecutive===4)return 'Solved';if(consecutive===1)return 'Adj';if(consecutive===0)return 'Opp';
 throw Error('unrecognized_corner_pattern');
}

test('28 curated formulas retain source notation, identities and per-stage attribution',()=>{
 assert.equal(SQ1_ALGORITHMS.length,28);assert.equal(new Set(SQ1_ALGORITHMS.map(record=>record.id)).size,28);
 const counts={};
 for(const record of SQ1_ALGORITHMS){
  assert.ok(ALGORITHM_STAGES.includes(record.stage));counts[record.stage]=(counts[record.stage]||0)+1;
  assert.ok(record.name&&record.sourceName&&record.sourceAlg);
  const url=new URL(record.sourceUrl);assert.equal(url.protocol,'https:');
  assert.ok(['www.speedcubedb.com','cubingapp.com','sarah.cubing.net'].includes(url.hostname));
  assert.equal(normalizeAlgorithm(record.sourceAlg),record.alg,'only notation punctuation changes');
  assert.ok(parseAlg(record.alg).some(move=>move.kind==='slice'));
 }
 assert.deepEqual(counts,{CO:7,EO:7,CP:8,EP:4,Parity:2});
});

test('numeric normalization does not guess unsupported symbolic moves',()=>{
 assert.equal(normalizeAlgorithm('1,0 / -1,0'),'(1,0) / (-1,0)');
 assert.equal(normalizeAlgorithm('/ (0,3) /1,0'),'/ (0,3) / (1,0)');
 for(const alg of ['R U R\'','U / D','[1,0]','(1 0)','1,0x','(1,0) U','(1,0))'])assert.throws(()=>normalizeAlgorithm(alg),/unsupported_algorithm_notation/);
});

test('every sourced case and every intermediate frame agree with cubing.js unit permutations',async()=>{
 const kpuzzle=await puzzles.square1.kpuzzle();
 for(const record of SQ1_ALGORITHMS){
  const model=algorithmCase(record);assert.deepEqual(identifyLayers(model.state),['square','square'],record.id);
  assert.deepEqual(applyAlg(standard,model.setup),model.state);
  assert.deepEqual(applyAlg(model.state,record.alg),standard,record.id);
  assert.equal(model.frames.length,parseAlg(record.alg).length+1);
  assert.equal(model.slashCount,parseAlg(record.alg).filter(move=>move.kind==='slice').length);
  assert.equal(model.middleFlips,model.slashCount%2===1);
  let reference=kpuzzle.defaultPattern().applyAlg(model.setup);
  model.frames.forEach((frame,index)=>{
   if(index)reference=reference.applyAlg(frame.move);
   const wedges=reference.patternData.WEDGES.pieces.map(unit=>pieceMap[unit]);
   assert.deepEqual([...frame.state.top,...frame.state.bottom],wedges,`${record.id} frame${index}`);
   assert.equal(frame.state.middle,reference.patternData.EQUATOR.orientation[1]/3);
   assert.deepEqual(applyAlg(model.state,frame.prefix),frame.state);
  });
  assert.deepEqual(model.frames.at(-1).state,standard);
 }
});

test('stage labels match physical orientation and permutation, with source case names checked',()=>{
 for(const record of SQ1_ALGORITHMS){
  const {state,classification:c}=algorithmCase(record);assert.ok(c.cubeShape);
  if(record.stage==='CO'){
   assert.equal(c.coSolved,false);
   if(/^\d-\d$/.test(record.name))assert.equal(ids(state,'top','C').filter(id=>PIECES[id].face==='U').length,Number(record.name[0]),record.id);
   else assert.equal(['top','bottom'].map(side=>pairPattern(faceFlags(state,side,'C'))).join(' / '),record.name,record.id);
  }else if(record.stage==='EO'){
   assert.ok(c.coSolved);assert.equal(c.eoSolved,false);
   assert.equal(['top','bottom'].map(side=>pairPattern(faceFlags(state,side,'E').map(correct=>!correct))).join(' / '),record.name,record.id);
  }else if(record.stage==='CP'){
   assert.ok(c.coSolved&&c.eoSolved);assert.equal(c.cpSolved,false);
   assert.equal(['top','bottom'].map(side=>cornerPattern(state,side)).join(' / '),record.name,record.id);
  }else{
   assert.ok(c.coSolved&&c.eoSolved&&c.cpSolved);assert.equal(c.epSolved,false);
   assert.equal(c.parityMismatch,record.stage==='Parity');
  }
 }
 // The two asymmetric EO sources also move the corners. Never advertise
 // preservation of CP merely because they are orientation algorithms.
 for(const id of ['sq1-eo-13','sq1-eo-14'])assert.equal(algorithmCase(SQ1_ALGORITHMS.find(r=>r.id===id)).classification.cpSolved,false);
});

test('permutation illustration needs side colours, and AUF/middle are classified separately',()=>{
 const cw=SQ1_ALGORITHMS.find(r=>r.id==='sq1-ep-23'),ccw=SQ1_ALGORITHMS.find(r=>r.id==='sq1-ep-24');
 assert.deepEqual(applyAlg(applyAlg(standard,cw.alg),ccw.alg),standard,'the two U cycles are inverse permutations');
 const cp=algorithmCase(SQ1_ALGORITHMS.find(r=>r.id==='sq1-cp-15')).state;
 assert.ok(['top','bottom'].every(side=>faceFlags(cp,side,'C').every(Boolean)&&faceFlags(cp,side,'E').every(Boolean)));
 assert.notDeepEqual(cp,standard,'uniform U/D colours cannot identify an unsolved CP case');
 const auf=classifyAlgorithmState(rotate(standard,3,-3));assert.ok(auf.cpSolved&&auf.epSolved);assert.equal(auf.piecesSolved,false);
 const adj=algorithmCase(SQ1_ALGORITHMS.find(r=>r.id==='sq1-parity-27')),opp=algorithmCase(SQ1_ALGORITHMS.find(r=>r.id==='sq1-parity-28'));
 assert.equal(adj.classification.middleSolved,false);assert.equal(adj.middleFlips,true);
 assert.equal(opp.classification.middleSolved,true);assert.equal(opp.middleFlips,false);
 assert.ok(adj.classification.parityMismatch&&opp.classification.parityMismatch);
});

test('algorithm vocabulary is complete across all seven supported languages',async()=>{
 const {algDictionaries,algText}=await import('../src/sq1-algorithms-i18n.js');
 for(const [locale,labels]of Object.entries(algDictionaries)){
  assert.deepEqual(Object.keys(labels).sort(),Object.keys(algDictionaries.en).sort(),locale);
  assert.ok(Object.values(labels).every(value=>typeof value==='string'&&value.trim()));
  assert.doesNotMatch(algText(locale,'currentStep',{n:2,total:12}),/\{/);
  assert.match(algText(locale,'count',{n:28}),/28/);
 }
});

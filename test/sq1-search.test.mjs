import test from 'node:test';
import assert from 'node:assert/strict';
import {SHAPES,cases,canonicalCode} from '../src/sq1-engine.js';
import {matchesShape,matchCaseLayers,analyzeShapeQuery} from '../src/sq1-search.js';

const byId=new Map(SHAPES.map(shape=>[shape.id,shape]));
const rotations=code=>Array.from({length:code.length},(_,i)=>code.slice(i)+code.slice(0,i));
const findCases=(top='',bottom='')=>cases().filter(c=>matchCaseLayers(c,top,bottom));

test('the supplied C/E rings are equivalent and do not match the mirrored pawn',()=>{
 for(const query of ['CCCECEEE','CECEEECC']){
  assert.ok(matchesShape(byId.get('right-pawn'),query));
  assert.equal(matchesShape(byId.get('left-pawn'),query),false);
  assert.deepEqual(findCases(query).map(c=>c.id),findCases('right pawn').map(c=>c.id));
 }
});

test('all 29 full rings match exactly their shape at every reading origin',()=>{
 for(const shape of SHAPES)for(const code of rotations(shape.code)){
  assert.deepEqual(SHAPES.filter(s=>matchesShape(s,code)).map(s=>s.id),[shape.id],code);
 }
});

test('incomplete patterns never identify a shape, even if rotating the fragment would fit',()=>{
 for(const code of ['C','E','CCE','CEE','CECECE','CCEECC','CCCEEC']){
  const query=analyzeShapeQuery(code);assert.equal(query.status,'incomplete');
  assert.ok(SHAPES.every(shape=>!matchesShape(shape,code)),code);
  assert.deepEqual(findCases('',code),[]);
 }
 assert.equal(canonicalCode('CCEECC'),canonicalCode('CCCEEC'));
 assert.equal(analyzeShapeQuery('CCEECC').remaining,2);
});

test('queries distinguish incomplete, excessive, impossible and malformed rings from names',()=>{
 assert.equal(analyzeShapeQuery('CECECE').units,9);
 assert.equal(analyzeShapeQuery('CECECECECE').status,'tooLong');
 assert.equal(analyzeShapeQuery('EEEEEEEEEEEE').status,'unavailable');
 for(const text of ['10101010','CCECCEEE0','CCECCEEE?','CCECCEEZ'])assert.equal(analyzeShapeQuery(text).status,'invalid',text);
 for(const text of ['蘑菇','风筝','風箏','left fist','Mushroom'])assert.equal(analyzeShapeQuery(text).kind,'name',text);
 assert.equal(analyzeShapeQuery('CCECCEEE').shape.id,'mushroom');
 for(const code of rotations('CCECCEEE'))for(const id of ['left-fist','right-fist'])assert.equal(matchesShape(byId.get(id),code),false);
});

test('the reported lower-layer mushroom and all its reading origins stay on the lower layer',()=>{
 const top='CCECECEE',bottom='CCECCEEE';
 assert.equal(byId.get('mushroom').code,bottom);
 for(const code of rotations(bottom)){
  assert.deepEqual(findCases(top,code).map(c=>c.id),['left-fist:mushroom']);
  assert.equal(matchCaseLayers(findCases(top,code)[0],top,code),'direct');
  assert.equal(matchCaseLayers(findCases(top,code)[0],code,top),'swapped');
 }
});

test('empty layers, normalized codes and partial bilingual names remain searchable',()=>{
 for(const shape of SHAPES)for(const query of ['', '   '])assert.ok(matchesShape(shape,query));
 for(const query of ['ccceceee',' c c c e c e e e ','ＣＣＣＥＣＥＥＥ','C-C-C-E-C-E-E-E','C,C,C,E,C,E,E,E'])assert.ok(matchesShape(byId.get('right-pawn'),query),query);
 for(const query of ['right pawn','RIGHT PAW','right-pawn','右兵'])assert.ok(matchesShape(byId.get('right-pawn'),query),query);
 for(const query of ['风筝','風箏','KiT'])assert.ok(matchesShape(byId.get('kite'),query),query);
 for(const query of ['相邻双棱','相鄰雙棱'])assert.ok(matchesShape(byId.get('paired-edges'),query),query);
 for(const query of ['left pawn','CCCECEEE?','/','---','not a shape'])assert.equal(matchesShape(byId.get('right-pawn'),query),false,query);
 for(const query of ['CECECECECE','CCCCCCC','EEEEEEEEEEEEE'])assert.ok(SHAPES.every(s=>!matchesShape(s,query)),query);
});

test('all 90 cases accept independent layer rotations and swapped top/bottom without duplicates',()=>{
 assert.equal(findCases().length,90);
 for(const c of cases()){
  const top=byId.get(c.top),bottom=byId.get(c.bottom);
  for(const topCode of rotations(top.code))for(const bottomCode of rotations(bottom.code)){
   assert.equal(matchCaseLayers(c,topCode,bottomCode),'direct',c.id);
   assert.equal(matchCaseLayers(c,bottomCode,topCode),c.top===c.bottom?'direct':'swapped',c.id);
  }
  assert.deepEqual(findCases(top.code,bottom.code).map(s=>s.id),[c.id]);
  assert.ok(findCases(bottom.en,top.code).some(s=>s.id===c.id));
 }
});

test('two fields match different complete layers and accept only a valid 8C/8E pair',()=>{
 const c=cases().find(s=>s.id==='right-pawn:square');
 assert.equal(matchCaseLayers(c,'CCCECEEE','square'),'direct');
 assert.equal(matchCaseLayers(c,'square','CECEEECC'),'swapped');
 assert.equal(matchCaseLayers(c,'CCCECEEE','right pawn'),null);
 assert.equal(matchCaseLayers(c,'pawn','right'),null);
 assert.equal(matchCaseLayers(c,'','CCCECEEE'),'swapped');
 assert.equal(matchCaseLayers(c,'CCCECEEE',''),'direct');
 assert.deepEqual(findCases('CCCECEEE','CECECECE').map(s=>s.id),['right-pawn:square']);
 assert.deepEqual(findCases('CECECECE','CECEEECC').map(s=>s.id),['right-pawn:square']);
 assert.deepEqual(findCases('CECECECE','CCCCCC'),[]);
});

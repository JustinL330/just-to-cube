import test from 'node:test';
import assert from 'node:assert/strict';
import {SHAPES,cases} from '../src/sq1-engine.js';
import {matchesShape,matchCaseLayers} from '../src/sq1-search.js';

// Independent oracle: build angular compositions of a 360-degree face, rather
// than deriving valid inputs from the application's hand-written shape table.
// A corner consumes two 30-degree units; an edge consumes one. Rotation may
// change a complete ring's starting point, but must never reverse its order.
const units=word=>[...word].reduce((sum,piece)=>sum+(piece==='C'?2:1),0);
const count=(word,piece)=>[...word].filter(p=>p===piece).length;
function compositions(limit=12){
 const out=[];
 function add(word,width){
  if(word)out.push(word);
  if(width+1<=limit)add(word+'E',width+1);
  if(width+2<=limit)add(word+'C',width+2);
 }
 add('',0);return out;
}
const origins=word=>Array.from({length:word.length},(_,i)=>word.slice(i)+word.slice(0,i));
const orbitKey=word=>origins(word).reduce((smallest,next)=>next<smallest?next:smallest);
const sameRing=(a,b)=>a.length===b.length&&(a+a).includes(b);
function physicalRing(word){
 if(units(word)!==12||count(word,'C')>8||count(word,'E')>8)return false;
 // A legal slash needs boundaries at two diametrically opposite locations.
 let angle=0;const boundaries=new Set([0]);
 for(const piece of word){angle+=piece==='C'?2:1;boundaries.add(angle%12);}
 return [...boundaries].some(start=>boundaries.has((start+6)%12));
}
const allWords=compositions(),fullWords=allWords.filter(word=>units(word)===12);
const validWords=fullWords.filter(physicalRing),orbits=new Map();
for(const word of validWords){const key=orbitKey(word);if(!orbits.has(key))orbits.set(key,[]);orbits.get(key).push(word);}

// Only after the independent geometry is known do we attach application labels
// to its classes. The production codes do not construct the validity oracle.
const namedOrbits=new Map(SHAPES.map(shape=>[orbitKey(shape.code),shape]));
const shapeIdsFor=query=>SHAPES.filter(shape=>matchesShape(shape,query)).map(shape=>shape.id);
const sorted=values=>[...values].sort();
const catalog=cases();

test('independent angular compositions produce 221 physical rings in exactly 29 classes',()=>{
 assert.equal(allWords.length,608);assert.equal(fullWords.length,233);
 assert.equal(validWords.length,221);assert.equal(fullWords.length-validWords.length,12);
 assert.equal(orbits.size,29);assert.equal(namedOrbits.size,29);assert.equal(SHAPES.length,29);
 assert.deepEqual(sorted(namedOrbits.keys()),sorted(orbits.keys()),'catalogue has no missing or invented physical class');
 const byCorners={};for(const key of orbits.keys()){const n=count(key,'C');byCorners[n]=(byCorners[n]||0)+1;}
 assert.deepEqual(byCorners,{2:5,3:10,4:10,5:3,6:1});
 for(const words of orbits.values())assert.ok(words.every(physicalRing),'every reading origin permits a diametric cut');
});

test('every complete C/E input matches exactly its independently derived physical class',()=>{
 for(const word of fullWords){
  const expected=physicalRing(word)?[namedOrbits.get(orbitKey(word)).id]:[];
  assert.deepEqual(shapeIdsFor(word),expected,word);
 }
});

test('all 375 incomplete nonempty C/E inputs are rejected instead of fuzzily rotated',()=>{
 const incomplete=allWords.filter(word=>units(word)<12);assert.equal(incomplete.length,375);
 for(const word of incomplete)assert.deepEqual(shapeIdsFor(word),[],`${word}: ${units(word)}/12 units`);
 // These were concrete false positives: query rotation made CCE -> CEC and
 // CEE -> ECE match a square, although it has neither adjacent CC nor EE.
 for(const word of ['CCE','CEE','CCEECC','CCCEEC','CECECE'])assert.deepEqual(shapeIdsFor(word),[],word);
 for(const word of compositions(14).filter(word=>units(word)>12))assert.deepEqual(shapeIdsFor(word),[],`overfull: ${word}`);
 assert.equal(shapeIdsFor('').length,29,'an empty field remains an omitted filter');
});

test('mirror rings preserve direction; cyclic reading origins do not collapse left and right',()=>{
 let chiralClasses=0;
 for(const [key,words]of orbits){
  const mirrored=[...key].reverse().join(''),mirrorKey=orbitKey(mirrored),shape=namedOrbits.get(key),other=namedOrbits.get(mirrorKey);
  assert.ok(other,'the mirror remains a valid physical class');
  if(sameRing(key,mirrored))assert.equal(other.id,shape.id);
  else{
   chiralClasses++;assert.notEqual(other.id,shape.id);
   for(const word of words)assert.equal(matchesShape(other,word),false,`${shape.id} must not become ${other.id}`);
  }
 }
 assert.equal(chiralClasses,10);
 // English labels are independently checked against Squanmate's primary
 // services/shapes.cljs terminology, rather than inferred by the matcher.
 const mirrorNames=[['left-four-two','right-four-two'],['left-five-one','right-five-one'],['left-fist','right-fist'],['left-pawn','right-pawn'],['three-two-one','three-one-two']];
 for(const [left,right]of mirrorNames){
  const a=SHAPES.find(s=>s.id===left),b=SHAPES.find(s=>s.id===right);
  assert.ok(sameRing([...a.code].reverse().join(''),b.code),`${left} / ${right}`);
  assert.ok(!sameRing(a.code,b.code),`${left} / ${right} stay distinct`);
 }
});

test('independent piece totals produce all 90 cases and every top/bottom reading origin',()=>{
 const keys=[...orbits.keys()],expected=new Map();
 for(let i=0;i<keys.length;i++)for(let j=i;j<keys.length;j++){
  const [a,b]=[keys[i],keys[j]];
  if(count(a,'C')+count(b,'C')!==8||count(a,'E')+count(b,'E')!==8)continue;
  const first=namedOrbits.get(a),second=namedOrbits.get(b),id=[first.id,second.id].sort().join(':');
  expected.set(id,[a,b]);
 }
 assert.equal(expected.size,90);assert.equal(catalog.length,90);
 assert.deepEqual(sorted(catalog.map(c=>c.id)),sorted(expected.keys()));
 for(const c of catalog){
  const [a,b]=expected.get(c.id),first=namedOrbits.get(a),second=namedOrbits.get(b);
  for(const top of orbits.get(a))for(const bottom of orbits.get(b)){
   const direct=matchCaseLayers(c,top,bottom),reverse=matchCaseLayers(c,bottom,top);
   assert.equal(direct,c.top===first.id?'direct':'swapped',`${c.id}: ${top} / ${bottom}`);
   assert.equal(reverse,first.id===second.id?'direct':c.top===second.id?'direct':'swapped',`${c.id}: ${bottom} / ${top}`);
  }
  assert.deepEqual(catalog.filter(item=>matchCaseLayers(item,a,b)).map(item=>item.id),[c.id]);
  assert.deepEqual(catalog.filter(item=>matchCaseLayers(item,b,a)).map(item=>item.id),[c.id]);
  for(const invalid of ['CCE','CEE','CCEECC','CCCCCCC','EEEEEEEEEEEE']){
   assert.equal(matchCaseLayers(c,invalid,a),null);assert.equal(matchCaseLayers(c,a,invalid),null);
  }
 }
});

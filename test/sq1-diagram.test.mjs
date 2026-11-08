import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {layerDiagram} from '../src/sq1.js';
import {solvedState,applyAlg,slice,rotate,layerPieces,layerCode} from '../src/sq1-engine.js';

// SVG construction needs only these DOM operations; geometry is checked below.
class SvgElement{
 constructor(tag){this.tagName=tag;this.attributes=new Map();this.children=[];}
 setAttribute(name,value){this.attributes.set(name,String(value));}
 getAttribute(name){return this.attributes.get(name);}
 append(...children){this.children.push(...children);}
}
const previousDocument=globalThis.document;
before(()=>{globalThis.document={createElementNS:(_,tag)=>new SvgElement(tag)};});
after(()=>{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});

function draw(layer,side,options={}){
 const svg=layerDiagram(layer,{side,...options}),pieces=layerPieces(layer);
 const polygons=svg.children.filter(e=>e.tagName==='polygon').map((element,i)=>{
  const points=element.getAttribute('points').split(' ').map(p=>p.split(',').map(Number));
  const rim=points.slice(1),center=rim.reduce(([x,y],[px,py])=>[x+px/rim.length,y+py/rim.length],[0,0]);
  return {...pieces[i],points,center,fill:element.getAttribute('fill')};
 });
 return {svg,polygons};
}

test('a slash exchanges the displayed right halves of both face-on layers',()=>{
 const state=slice(solvedState());
 for(const side of ['top','bottom']){
  const {polygons}=draw(state[side],side);
  for(const p of polygons){
   const right=p.center[0]>60;
   assert.equal(p.face,right?(side==='top'?'D':'U'):(side==='top'?'U':'D'));
   assert.ok(p.points.slice(1).every(([x])=>right?x>=59.999:x<=60.001),'pieces stay on their side of the cut');
  }
 }
});

const referenceAlg='(1,0) / (-3,0) / (5,2) / (-3,0) / (-5,-5) / (-3,-3) / (5,0) / (3,0) / (0,-4) / (-5,0) / (0,-4) / (0,-2) / (2,-2)';

test('the supplied scramble puts D’s paired edges at the lower right in every diagram size',()=>{
 const state=applyAlg(solvedState(),referenceAlg);
 for(const options of [{},{mini:true,plain:true}]){
  const {polygons}=draw(state.bottom,'bottom',options),edges=polygons.filter(p=>p.type==='E');
  assert.equal(edges.length,2);
  assert.ok(edges.every(p=>p.center[0]>60&&p.center[1]>60));
  const yellowCorner=polygons.find(p=>p.id===3);
  assert.ok(yellowCorner.center[0]>60&&yellowCorner.center[1]<60);
 }
});

test('positive U and D turns remain clockwise, including corners crossing the ring origin',()=>{
 const state=applyAlg(solvedState(),referenceAlg);
 for(const side of ['top','bottom'])for(let offset=0;offset<12;offset++){
  const before=rotate(state,side==='top'?offset:0,side==='bottom'?offset:0);
  const next=rotate(before,side==='top'?1:0,side==='bottom'?1:0);
  const a=draw(before[side],side).polygons,b=draw(next[side],side).polygons;
  for(const p of a){
   const q=b.find(n=>n.id===p.id),[x,y]=p.center.map(n=>n-60),[u,v]=q.center.map(n=>n-60);
   assert.ok(x*v-y*u>0,'positive turns move clockwise in screen coordinates');
  }
 }
});

test('the C/E reading marker follows the bottom view and starts the clockwise canonical code',()=>{
 const state=applyAlg(solvedState(),referenceAlg);
 for(const side of ['top','bottom']){
  const {svg,polygons}=draw(state[side],side),dot=svg.children.find(e=>e.tagName==='circle');
  const start=Math.atan2(Number(dot.getAttribute('cy'))-60,Number(dot.getAttribute('cx'))-60);
  const angle=p=>(Math.atan2(p.center[1]-60,p.center[0]-60)-start+2*Math.PI)%(2*Math.PI);
  assert.equal(polygons.sort((a,b)=>angle(a)-angle(b)).map(p=>p.type).join(''),layerCode(state[side]));
 }
});

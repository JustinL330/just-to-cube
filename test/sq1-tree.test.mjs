import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,shapeTree,shapeStates,analyzeCase,analyze,generate,rotate,identifyLayers,applyAlg} from '../src/sq1-engine.js';
import {groupTreeRoutes,layoutShapeTree,traceShapeTree,treeCaseId,treeEdgeId} from '../src/sq1-tree-model.js';
import {sq1Dictionaries,sq1Text} from '../src/sq1-i18n.js';

const tree=shapeTree(),byId=new Map(tree.nodes.map(c=>[c.id,c]));
const caseId=state=>identifyLayers(state).sort().join(':');
const sorted=values=>[...values].sort();

function verifyRouteGroups(analysis,startId){
 const original=analysis.routes.map(route=>({route,path:route.path.slice(),alg:route.alg,frames:route.frames}));
 const groups=groupTreeRoutes(analysis),all=groups.flatMap(group=>group.variants);
 assert.equal(all.length,analysis.totalSolutions,'every physical solution remains available');
 assert.deepEqual(all.map(v=>v.index).sort((a,b)=>a-b),analysis.routes.map((_,i)=>i),'each original index is represented exactly once');
 const signatures=groups.map(group=>JSON.stringify(group.caseIds));
 assert.equal(new Set(signatures).size,groups.length,'no two groups show the same unordered case sequence');
 const firstIndices=groups.map(group=>group.variants[0].index);
 assert.deepEqual(firstIndices,firstIndices.slice().sort((a,b)=>a-b),'groups keep first-appearance order');
 for(const group of groups){
  assert.equal(group.caseIds[0],startId);assert.equal(group.caseIds.at(-1),'square:square');
  assert.equal(group.caseIds.length,analysis.minSlices+1);
  const indices=group.variants.map(v=>v.index);
  assert.deepEqual(indices,indices.slice().sort((a,b)=>a-b),'variants retain solver order');
  for(const {route,index}of group.variants){
   assert.strictEqual(route,analysis.routes[index],'variant keeps the original executable route');
   assert.deepEqual(route.path.map(treeCaseId),group.caseIds);
   assert.equal(caseId(applyAlg(route.frames[0].state,route.alg)),'square:square');
  }
 }
 original.forEach(({route,path,alg,frames},i)=>{
  assert.strictEqual(analysis.routes[i],route);assert.strictEqual(route.frames,frames);
  assert.equal(route.alg,alg);assert.deepEqual(route.path,path);
 });
 return groups;
}

test('the shape tree has every case and exactly the physical descending connections',()=>{
 assert.deepEqual(tree.nodes.map(c=>c.id),cases().map(c=>c.id));
 assert.equal(tree.nodes.length,90);assert.equal(tree.edges.length,197);
 assert.equal(new Set(tree.edges.map(e=>treeEdgeId(e.from,e.to))).size,197);
 assert.deepEqual(Array.from({length:8},(_,depth)=>tree.nodes.filter(c=>c.minSlices===depth).length),[1,1,2,8,22,38,17,1]);
 for(const edge of tree.edges)assert.equal(byId.get(edge.from).minSlices,byId.get(edge.to).minSlices+1);
 const states=shapeStates(),byKey=new Map(states.map(s=>[s.key,s])),reference=new Set();
 for(const state of states)for(const key of state.next)if(byKey.get(key).minSlices===state.minSlices-1)reference.add(treeEdgeId(caseId(state.state),caseId(byKey.get(key).state)));
 assert.deepEqual(sorted(tree.edges.map(e=>treeEdgeId(e.from,e.to))),sorted(reference));
});

test('grouping swapped layers preserves every available next case for both physical orders',()=>{
 const states=shapeStates(),byKey=new Map(states.map(s=>[s.key,s]));
 for(const state of states){
  const actual=new Set(state.next.filter(key=>byKey.get(key).minSlices===state.minSlices-1).map(key=>caseId(byKey.get(key).state)));
  const shown=new Set(tree.edges.filter(e=>e.from===caseId(state.state)).map(e=>e.to));
  assert.deepEqual(sorted(shown),sorted(actual),state.key);
 }
});

test('all-route highlighting equals the union of all executable solver routes for all 90 cases',()=>{
 for(const c of tree.nodes){
  const result=analyzeCase(c.id),nodes=new Set(),edges=new Set();
  assert.equal(result.totalSolutions,c.routeCount,c.id);
  assert.equal(result.minSlices,c.minSlices,c.id);
  for(const route of result.routes){
   assert.equal(caseId(route.frames[0].state),c.id);
   assert.equal(caseId(applyAlg(route.frames[0].state,route.alg)),'square:square');
   const ids=[route.frames[0],...route.frames.filter(f=>f.kind==='slice')].map(f=>caseId(f.state));
   assert.deepEqual(route.path.map(treeCaseId),ids);
   ids.forEach(id=>nodes.add(id));ids.slice(1).forEach((id,i)=>edges.add(treeEdgeId(ids[i],id)));
   const single=traceShapeTree(tree,c.id,route.path);
   assert.deepEqual(sorted(single.caseIds),sorted(new Set(ids)));
   assert.deepEqual(single.edgeIds,ids.slice(1).map((id,i)=>treeEdgeId(ids[i],id)));
   assert.equal(single.edgeIds.length,c.minSlices);
  }
  const highlighted=traceShapeTree(tree,c.id);
  assert.deepEqual(sorted(highlighted.caseIds),sorted(nodes),c.id);
  assert.deepEqual(sorted(highlighted.edgeIds),sorted(edges),c.id);
 }
 const solved=traceShapeTree(tree,'square:square');assert.deepEqual(solved,{caseIds:['square:square'],edgeIds:[]});
 const longest=byId.get('kite:square');assert.equal(longest.routeCount,160);assert.equal(traceShapeTree(tree,longest.id).caseIds.length,15);
});

test('visible tree paths group all 90 case solutions without losing any ordered formula',()=>{
 for(const c of tree.nodes){
  const analysis=analyzeCase(c.id),groups=verifyRouteGroups(analysis,c.id);
  const firstRoutes=groups.map(g=>g.variants[0].index);
  assert.deepEqual(groupTreeRoutes(analysis).map(g=>g.variants[0].index),firstRoutes,'grouping is stable');
 }
 const longest=analyzeCase('kite:square'),groups=groupTreeRoutes(longest);
 assert.equal(longest.totalSolutions,160);assert.equal(groups.length,10);
 assert.ok(groups.every(group=>group.variants.length===16));
 const zero=analyzeCase('square:square'),[only]=verifyRouteGroups(zero,'square:square');
 assert.deepEqual(only.caseIds,['square:square']);assert.equal(only.variants.length,1);
 assert.equal(only.variants[0].index,0);assert.equal(only.variants[0].route.alg,'');
 assert.equal(only.variants[0].route.frames.length,1);
 assert.deepEqual(groupTreeRoutes({routes:[]}),[]);
});

test('actual rotated and U/D-swapped starting states preserve complete visible path groups',()=>{
 for(const c of tree.nodes){
  const actual=rotate(generate('(1,-1)',c.id).state,1,-2);
  const swapped={top:actual.bottom.slice(),bottom:actual.top.slice(),middle:actual.middle};
  const result=analyze(actual),opposite=analyze(swapped);
  assert.equal(result.minSlices,c.minSlices);assert.equal(opposite.minSlices,c.minSlices);
  const groups=verifyRouteGroups(result,c.id),swappedGroups=verifyRouteGroups(opposite,c.id);
  assert.deepEqual(sorted(groups.map(g=>JSON.stringify(g.caseIds))),sorted(swappedGroups.map(g=>JSON.stringify(g.caseIds))),c.id);
  assert.equal(result.totalSolutions,opposite.totalSolutions,c.id);
 }
});

test('full and focused layouts keep all nodes in bounds, in the correct row, without overlaps',()=>{
 const before=structuredClone(tree),highlight=traceShapeTree(tree,'kite:square'),active=new Set(highlight.caseIds);
 const focused={nodes:tree.nodes.filter(c=>active.has(c.id)),edges:tree.edges.filter(e=>active.has(e.from)&&active.has(e.to))};
 for(const source of [tree,focused,{nodes:[byId.get('square:square')],edges:[]}]){
  const layout=layoutShapeTree(source);assert.equal(layout.nodes.length,source.nodes.length);
  assert.equal(new Set(layout.nodes.map(n=>n.id)).size,source.nodes.length);
  for(const node of layout.nodes){
   assert.ok(node.x>=0&&node.y>=0&&node.x+node.width<=layout.width&&node.y+node.height<=layout.height);
   assert.equal(node.y+node.height/2,layout.levels.find(l=>l.depth===node.minSlices).y);
  }
  for(const a of layout.nodes)for(const b of layout.nodes)if(a.id!==b.id&&a.minSlices===b.minSlices)assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x);
  assert.deepEqual(layoutShapeTree(source),layout,'layout is deterministic');
 }
 assert.ok(layoutShapeTree(focused).width<layoutShapeTree(tree).width);assert.deepEqual(tree,before);
});

test('tree labels are available in all languages, and invalid cases do not produce a route',()=>{
 assert.throws(()=>analyzeCase('missing:case'),/invalid_case/);
 assert.throws(()=>traceShapeTree(tree,'missing:case'),/invalid_case/);
 assert.throws(()=>treeCaseId('CE|unknown'),/invalid_shape_key/);
 for(const locale of Object.keys(sq1Dictionaries)){
  assert.doesNotMatch(sq1Text(locale,'treeSummary',{n:90,edges:197}),/\{/);
  assert.doesNotMatch(sq1Text(locale,'treeIntermediate',{n:13}),/\{/);
  assert.match(sq1Text(locale,'treeMatches',{n:1}),/1/);
 }
});

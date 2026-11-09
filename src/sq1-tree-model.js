import {SHAPES} from './sq1-engine.js';

const idsByCode=new Map(SHAPES.map(shape=>[shape.code,shape.id]));
export const treeEdgeId=(from,to)=>`${from}>${to}`;
export function treeCaseId(key){
 const ids=key.split('|').map(code=>idsByCode.get(code));
 if(ids.length!==2||ids.some(id=>!id))throw Error('invalid_shape_key');
 return ids.sort().join(':');
}

// The tree shares a node between U/D-swapped cases, while executable solver
// routes retain the physical layer order. Group their visible paths without
// discarding any ordered route or changing its original formula/frames.
export function groupTreeRoutes(analysis){
 const groups=new Map();
 for(const [index,route]of analysis.routes.entries()){
  const caseIds=route.path.map(treeCaseId),key=JSON.stringify(caseIds);
  if(!groups.has(key))groups.set(key,{caseIds,variants:[]});
  groups.get(key).variants.push({route,index});
 }
 return [...groups.values()];
}

export function traceShapeTree(tree,startId,path=null){
 if(!tree.nodes.some(node=>node.id===startId))throw Error('invalid_case');
 if(path){
  const caseIds=path.map(treeCaseId);
  return {caseIds:[...new Set(caseIds)],edgeIds:caseIds.slice(1).map((id,i)=>treeEdgeId(caseIds[i],id))};
 }
 const next=new Map(tree.nodes.map(node=>[node.id,[]]));
 for(const edge of tree.edges)next.get(edge.from).push(edge);
 const seen=new Set([startId]),edgeIds=new Set(),queue=[startId];
 for(let i=0;i<queue.length;i++)for(const {from,to}of next.get(queue[i])){
  edgeIds.add(treeEdgeId(from,to));
  if(!seen.has(to)){seen.add(to);queue.push(to);}
 }
 return {caseIds:[...seen],edgeIds:[...edgeIds]};
}

// Keep depth rows stable during searches. Barycentre sweeps reduce crossings
// without changing the graph, omitting cases, or modifying the input data.
export function layoutShapeTree(tree){
 const nodeWidth=76,nodeHeight=116,columnGap=12,rowGap=54,padding=30,labelWidth=40;
 const maxDepth=Math.max(0,...tree.nodes.map(node=>node.minSlices));
 const rows=Array.from({length:maxDepth+1},(_,depth)=>tree.nodes.filter(node=>node.minSlices===depth).slice().sort((a,b)=>a.id.localeCompare(b.id)));
 const neighbors=new Map(tree.nodes.map(node=>[node.id,[]]));
 for(const {from,to}of tree.edges){neighbors.get(from)?.push(to);neighbors.get(to)?.push(from);}
 const positions=()=>new Map(rows.flatMap(row=>row.map((node,i)=>[node.id,{depth:node.minSlices,x:(i+.5)/row.length}])));
 function order(depth,otherDepth){
  const pos=positions(),scores=new Map();
  for(const node of rows[depth]){
   const near=neighbors.get(node.id).map(id=>pos.get(id)).filter(p=>p?.depth===otherDepth);
   scores.set(node.id,near.length?near.reduce((sum,p)=>sum+p.x,0)/near.length:pos.get(node.id).x);
  }
  rows[depth].sort((a,b)=>scores.get(a.id)-scores.get(b.id)||a.id.localeCompare(b.id));
 }
 for(let pass=0;pass<4;pass++){
  for(let depth=1;depth<=maxDepth;depth++)order(depth,depth-1);
  for(let depth=maxDepth-1;depth>=0;depth--)order(depth,depth+1);
 }
 const rowWidth=count=>count*nodeWidth+Math.max(0,count-1)*columnGap;
 const contentWidth=Math.max(nodeWidth,...rows.map(row=>rowWidth(row.length))),width=contentWidth+padding*2+labelWidth;
 const height=padding*2+(maxDepth+1)*nodeHeight+maxDepth*rowGap;
 const nodes=rows.flatMap((row,depth)=>row.map((node,i)=>({...node,x:labelWidth+padding+(contentWidth-rowWidth(row.length))/2+i*(nodeWidth+columnGap),y:padding+depth*(nodeHeight+rowGap),width:nodeWidth,height:nodeHeight})));
 return {width,height,nodes,levels:rows.map((row,depth)=>({depth,y:padding+depth*(nodeHeight+rowGap)+nodeHeight/2,count:row.length}))};
}

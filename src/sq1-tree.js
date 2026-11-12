import {matchCaseLayers} from './sq1-search.js';
import {layoutShapeTree,traceShapeTree,treeCaseId,treeEdgeId,groupTreeRoutes} from './sq1-tree-model.js';
import {SHAPES,identifyLayers,layerCode} from './sq1-engine.js';

const NS='http://www.w3.org/2000/svg';
const shapeCodes=new Map(SHAPES.map(shape=>[shape.id,shape.code]));
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const svgElement=(tag,attrs)=>{const e=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))e.setAttribute(key,String(value));return e;};

export function initSQ1Tree({root,trigger,request,t,shapeName,diagram,copy,getCurrentCase,renderState,frameHelp,frameLabel,getDisplayPreferences=()=>({})}){
 root.innerHTML=`
 <div class="sq1-section-top"><div><p class="eyebrow" data-sq="treeEyebrow"></p><h2 id="sq1TreeTitle" data-sq="treeTitle"></h2></div><button type="button" id="sq1TreeClose" class="secondary" data-sq="treeClose"></button></div>
 <p class="muted sq1-tree-intro" data-sq="treeIntro"></p>
 <div class="sq1-tree-search sq1-filters"><label><span data-sq="top"></span><input id="sq1TreeTopSearch" type="search" autocomplete="off" spellcheck="false" aria-describedby="sq1TreeSearchHint"></label><label><span data-sq="bottom"></span><input id="sq1TreeBottomSearch" type="search" autocomplete="off" spellcheck="false" aria-describedby="sq1TreeSearchHint"></label></div>
 <p id="sq1TreeSearchHint" class="muted sq1-search-hint" data-sq="searchHint"></p><p class="muted sq1-search-hint" data-sq="treeAutoSearch"></p><p id="sq1TreeMatchCount" class="sq1-tree-match-count" role="status" aria-live="polite"></p><div id="sq1TreeResults" class="sq1-tree-results"></div>
 <div id="sq1TreeStatus" class="sq1-tree-status" role="status" aria-live="polite"></div><button type="button" id="sq1TreeRetry" class="text-button" hidden data-sq="retry"></button>
 <div id="sq1TreeDetail" class="sq1-tree-detail"></div>
 <div class="sq1-tree-toolbar"><div class="sq1-tree-tools"><button type="button" id="sq1TreeCurrent" class="secondary" data-sq="treeCurrent"></button><button type="button" id="sq1TreeOverview" class="secondary" data-sq="treeOverview"></button><button type="button" id="sq1TreeClear" class="text-button" data-sq="treeClear"></button></div><div class="sq1-tree-options"><label class="sq1-tree-only"><input type="checkbox" id="sq1TreeOnlyRoutes" checked><span data-sq="treeOnlyRoutes"></span></label><label class="sq1-tree-only"><input type="checkbox" id="sq1TreeAllPaths" checked><span data-sq="treeAllRoutes"></span></label></div>
 <div class="sq1-tree-zoom"><button type="button" class="secondary" id="sq1TreeZoomOut">−</button><output id="sq1TreeZoomValue"></output><button type="button" class="secondary" id="sq1TreeZoomIn">+</button><button type="button" class="secondary" id="sq1TreeFit" data-sq="treeFit"></button></div></div>
 <div class="sq1-tree-legend"><span class="sq1-tree-key-start" data-sq="treeSelected"></span><span class="sq1-tree-key-route" data-sq="treeOnRoute"></span><span class="sq1-tree-key-match" data-sq="treeSearchMatch"></span></div>
 <p class="muted sq1-tree-scroll-note" data-sq="treeScroll"></p><div id="sq1TreeViewport" class="sq1-tree-viewport" tabindex="0"><div id="sq1TreeSize" class="sq1-tree-size"><div id="sq1TreeCanvas" class="sq1-tree-canvas"></div></div></div>
 <div id="sq1TreeRoutePanel" class="sq1-tree-route-panel" hidden><p id="sq1TreeRouteHint" class="muted"></p><div class="sq1-tree-solution-choices"><label class="sq1-tree-route-picker"><span data-sq="treePathLabel"></span><select id="sq1TreeRoutes"></select></label><label class="sq1-tree-route-picker"><span data-sq="treeVariantLabel"></span><select id="sq1TreeVariants"></select></label></div>
 <div id="sq1TreeFormulaArea" hidden><div class="sq1-formula-top"><h3 data-sq="formula"></h3><button type="button" id="sq1TreeCopy" class="text-button" data-sq="copySolution"></button></div><div id="sq1TreeFormula" class="sq1-formula sq1-tree-formula"></div><p id="sq1TreePoseHint" class="muted sq1-tree-formula-hint"></p><div id="sq1TreeRouteCases" class="sq1-tree-route-cases"></div>
 <div class="sq1-tree-step-top"><h3 data-sq="steps"></h3><div class="sq1-step-controls"><button id="sq1TreeStepBack" class="secondary" type="button">←</button><span id="sq1TreeFramePosition"></span><button id="sq1TreeStepNext" class="secondary" type="button">→</button></div></div><p id="sq1TreeFrameHelp" class="sq1-step-help"></p><div id="sq1TreeFrames" class="sq1-steps sq1-tree-frames"></div></div></div>`;
 const $=selector=>root.querySelector(selector),topSearch=$('#sq1TreeTopSearch'),bottomSearch=$('#sq1TreeBottomSearch'),viewport=$('#sq1TreeViewport'),size=$('#sq1TreeSize'),canvas=$('#sq1TreeCanvas');
 let data=null,selectedId=null,selectedState=null,selectedSwapped=false,source='canonical',analysis=null,groups=[],groupIndex=0,variantIndex=0,frameIndex=0;
 let loadEpoch=0,selectionEpoch=0,loading=false,solving=false,failed=false,layout=null,zoom=1,fitMode=true,readableFit=true,userClosed=root.hidden,lastCurrentSignature=null;
 let nodeElements=new Map(),edgeElements=new Map(),matches=new Map(),searchTimer=null;
 const hasQuery=()=>!!(topSearch.value.trim()||bottomSearch.value.trim());
 const selectedCase=()=>data?.nodes.find(c=>c.id===selectedId);
 const caseLabel=c=>c?`${shapeName(c.top)} + ${shapeName(c.bottom)}`:'';
 const currentSignature=current=>current?.state?JSON.stringify([current.caseId,current.state]):null;
 const chosenRoute=()=>groups[groupIndex]?.variants[variantIndex]?.route;
 const allPaths=()=>$('#sq1TreeAllPaths').checked;
 const label=kind=>frameLabel?frameLabel(kind):t(kind==='slice'?'slash':kind==='rotation'?'turn':'initial');
 const help=frame=>frameHelp?frameHelp(frame):t(frame.kind==='initial'?'initialHint':frame.kind==='slice'?'slashHint':'turnHint');
 const poseHint=()=>source==='current'?'treeCurrentPoseHint':source==='branch'?'treeBranchPoseHint':'treeFormulaHint';
 function trace(){return selectedId&&data?traceShapeTree(data,selectedId,!allPaths()?chosenRoute()?.path:null):{caseIds:[],edgeIds:[]};}
 function renderStatus(){
  $('#sq1TreeStatus').textContent=failed?t('treeError'):loading?t('treeLoading'):solving?t('working'):data?t('treeSummary',{n:data.nodes.length,edges:data.edges.length}):'';
  $('#sq1TreeRetry').hidden=!failed;
  $('#sq1TreeClear').disabled=!selectedId;$('#sq1TreeOnlyRoutes').disabled=!selectedId;$('#sq1TreeAllPaths').disabled=!selectedId;
  $('#sq1TreeCurrent').disabled=!getCurrentCase()?.state;
  for(const id of ['sq1TreeZoomOut','sq1TreeZoomIn','sq1TreeFit','sq1TreeOverview'])$('#'+id).disabled=!data;
 }
 function renderSearch(){
  matches=new Map();$('#sq1TreeResults').replaceChildren();
  if(!data){$('#sq1TreeMatchCount').textContent='';return;}
  for(const c of data.nodes){const orientation=matchCaseLayers(c,topSearch.value,bottomSearch.value);if(orientation)matches.set(c.id,orientation);}
  $('#sq1TreeMatchCount').textContent=t('treeMatches',{n:matches.size});
  if(hasQuery()){
   if(!matches.size)$('#sq1TreeResults').append(element('p',t('noMatches'),'muted'));
   for(const c of data.nodes.filter(c=>matches.has(c.id))){
    const button=element('button',undefined,'sq1-tree-result');button.type='button';button.dataset.caseId=c.id;button.setAttribute('aria-pressed',String(c.id===selectedId));
    const swapped=matches.get(c.id)==='swapped',ids=swapped?[c.bottom,c.top]:[c.top,c.bottom];
    button.append(element('strong',ids.map(shapeName).join(' + ')),element('code',ids.map(id=>shapeCodes.get(id)).join(' / ')));
    if(matches.get(c.id)==='swapped')button.append(element('span',t('swappedMatch'),'sq1-tree-result-swap'));
    button.onclick=()=>selectCase(c.id,{swapped});$('#sq1TreeResults').append(button);
   }
  }
  paintGraph();
 }
 function activeFrameCase(){const route=chosenRoute();if(!route)return null;const slices=route.frames.slice(0,frameIndex+1).filter(frame=>frame.kind==='slice').length;return treeCaseId(route.path[slices]);}
 function paintGraph(){
  const active=trace(),onRoute=new Set(active.caseIds),onEdge=new Set(active.edgeIds),query=hasQuery(),frameCase=activeFrameCase();
  for(const [id,button]of nodeElements){
   button.classList.toggle('is-start',id===selectedId);button.classList.toggle('is-route',onRoute.has(id));button.classList.toggle('is-match',query&&matches.has(id));button.classList.toggle('is-frame',id===frameCase);
   button.classList.toggle('is-muted',(!!selectedId||query)&&!onRoute.has(id)&&!(query&&matches.has(id)));
   button.setAttribute('aria-pressed',String(id===selectedId));
  }
  for(const [id,path]of edgeElements){const activeEdge=onEdge.has(id);path.classList.toggle('is-route',activeEdge);path.classList.toggle('is-muted',!!selectedId&&!activeEdge);if(activeEdge)path.setAttribute('marker-end','url(#sq1TreeArrow)');else path.removeAttribute('marker-end');}
 }
 function fitScale(){
  const maxHeight=parseFloat(getComputedStyle(viewport).maxHeight)||window.innerHeight*.7;
  const fit=Math.min(1,(viewport.clientWidth-4)/layout.width,(maxHeight-4)/layout.height);
  // New selections stay readable; explicit Fit shows every depth at once.
  return Math.max(readableFit&&$('#sq1TreeOnlyRoutes').checked&&selectedId ? .7 : .04,fit);
 }
 function setZoom(value,fit=false){
  if(!layout)return;
  const old=zoom,centerX=(viewport.scrollLeft+viewport.clientWidth/2)/old,centerY=(viewport.scrollTop+viewport.clientHeight/2)/old;
  fitMode=fit;zoom=Math.max(.04,Math.min(2,value));size.style.width=`${layout.width*zoom}px`;size.style.height=`${layout.height*zoom}px`;
  canvas.style.transform=`scale(${zoom})`;$('#sq1TreeZoomValue').textContent=`${Math.round(zoom*100)}%`;
  viewport.scrollLeft=fit?0:centerX*zoom-viewport.clientWidth/2;viewport.scrollTop=fit?0:centerY*zoom-viewport.clientHeight/2;
 }
 function drawTree(){
  if(!data)return;
  const active=new Set(trace().caseIds),only=$('#sq1TreeOnlyRoutes').checked&&selectedId;
  const visible=only?{nodes:data.nodes.filter(c=>active.has(c.id)),edges:data.edges.filter(e=>active.has(e.from)&&active.has(e.to))}:data;
  layout=layoutShapeTree(visible);nodeElements=new Map();edgeElements=new Map();canvas.replaceChildren();
  canvas.style.width=`${layout.width}px`;canvas.style.height=`${layout.height}px`;
  const positions=new Map(layout.nodes.map(c=>[c.id,c])),svg=svgElement('svg',{viewBox:`0 0 ${layout.width} ${layout.height}`,width:layout.width,height:layout.height,class:'sq1-tree-edges','aria-hidden':'true'});
  const defs=svgElement('defs',{}),marker=svgElement('marker',{id:'sq1TreeArrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});
  marker.append(svgElement('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'var(--sq1-tree-route)'}));defs.append(marker);svg.append(defs);
  for(const {from,to}of visible.edges){
   const a=positions.get(from),b=positions.get(to),x1=a.x+a.width/2,y1=a.y,x2=b.x+b.width/2,y2=b.y+b.height,mid=(y1+y2)/2;
   const path=svgElement('path',{d:`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`,class:'sq1-tree-edge',fill:'none','data-from':from,'data-to':to});svg.append(path);edgeElements.set(treeEdgeId(from,to),path);
  }
  canvas.append(svg);
  for(const level of layout.levels){const label=element('span',String(level.depth),'sq1-tree-level');label.style.top=`${level.y}px`;label.title=t('slices',{n:level.depth});canvas.append(label);}
  for(const c of layout.nodes){
   const button=element('button',undefined,'sq1-tree-node');button.type='button';button.dataset.caseId=c.id;button.style.left=`${c.x}px`;button.style.top=`${c.y}px`;button.style.width=`${c.width}px`;button.style.height=`${c.height}px`;
   const number=data.nodes.findIndex(n=>n.id===c.id)+1;button.append(element('span',String(number).padStart(2,'0'),'sq1-tree-node-number'),diagram(c));
   const name=`${caseLabel(c)} · ${c.codes.join(' / ')} · ${t('slices',{n:c.minSlices})}`;button.setAttribute('aria-label',name);button.title=name;
   button.onclick=()=>selectCase(c.id,{swapped:hasQuery()&&matches.get(c.id)==='swapped'});canvas.append(button);nodeElements.set(c.id,button);
  }
  paintGraph();setZoom(fitMode?fitScale():zoom,fitMode);
 }
 function renderDetails(){
  const detail=$('#sq1TreeDetail');detail.replaceChildren();const c=selectedCase();
  if(!c){detail.append(element('p',t(hasQuery()?(matches.size?'treeAutoSearch':'noMatches'):'treePrompt'),'muted'));return;}
  const picture=element('div',undefined,'sq1-tree-selected-picture'),text=element('div',undefined,'sq1-tree-selected-text'),state=chosenRoute()?.frames[0]?.state||selectedState;
  picture.append(state&&renderState?renderState(state):diagram(c));
  const code=element('code',state?[layerCode(state.top),layerCode(state.bottom)].join(' / '):c.codes.join(' / '),'sq1-tree-selected-code');code.hidden=getDisplayPreferences().showCodes===false;
  text.append(element('h3',state?identifyLayers(state).map(shapeName).join(' + '):caseLabel(c)),code);
  const counts=element('div',undefined,'sq1-tree-counts');counts.append(element('span',t('slices',{n:c.minSlices}),'sq1-badge'));
  if(analysis)counts.append(element('span',t('treePathCount',{n:groups.length}),'sq1-badge'),element('span',t('treeVariantCount',{n:analysis.totalSolutions}),'sq1-badge'));
  text.append(counts,element('p',t('treeIntermediate',{n:Math.max(0,traceShapeTree(data,c.id).caseIds.length-(c.minSlices?2:1))}),'muted'),element('p',t(poseHint()),'sq1-tree-pose'));
  if(hasQuery()&&matches.get(c.id)==='swapped')text.append(element('p',t('swappedMatch'),'sq1-tree-result-swap'));
  detail.append(picture,text);
 }
 function selectFrame(index,scroll=true){
  const route=chosenRoute();if(!route)return;frameIndex=Math.max(0,Math.min(index,route.frames.length-1));
  $('#sq1TreeFrames').querySelectorAll('.sq1-step').forEach((card,i)=>{card.classList.toggle('active',i===frameIndex);card.setAttribute('aria-current',i===frameIndex?'step':'false');});
  $('#sq1TreeFormula').querySelectorAll('[data-frame]').forEach(button=>{const active=Number(button.dataset.frame)===frameIndex;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  $('#sq1TreeFrameHelp').textContent=help(route.frames[frameIndex]);$('#sq1TreeFramePosition').textContent=t('step',{n:frameIndex});$('#sq1TreeStepBack').disabled=frameIndex===0;$('#sq1TreeStepNext').disabled=frameIndex===route.frames.length-1;paintGraph();
  if(scroll&&matchMedia('(min-width: 701px)').matches){const card=$('#sq1TreeFrames').children[frameIndex],host=$('#sq1TreeFrames');host.scrollTo({left:card.offsetLeft-host.offsetLeft-10,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 }
 function renderRoutes(){
  const panel=$('#sq1TreeRoutePanel'),select=$('#sq1TreeRoutes'),variants=$('#sq1TreeVariants'),route=chosenRoute();panel.hidden=!selectedId;select.replaceChildren();variants.replaceChildren();select.disabled=variants.disabled=!analysis;
  groups.forEach((group,i)=>{const option=element('option',t('treePathNumber',{n:i+1,total:groups.length,variants:group.variants.length}));option.value=String(i);select.append(option);});select.value=String(groupIndex);
  groups[groupIndex]?.variants.forEach((variant,i)=>{const option=element('option',t('treeVariantNumber',{n:i+1,total:groups[groupIndex].variants.length}));option.value=String(i);variants.append(option);});variants.value=String(variantIndex);
  $('#sq1TreeRouteHint').textContent=t(allPaths()?'treeAllHint':'treeSingleHint');$('#sq1TreeFormulaArea').hidden=!route;
  $('#sq1TreePoseHint').textContent=t(poseHint());
  $('#sq1TreeRouteCases').replaceChildren();$('#sq1TreeFormula').replaceChildren();$('#sq1TreeFrames').replaceChildren();
  if(!route)return;
  if(!route.alg.trim())$('#sq1TreeFormula').append(element('p',t('solutionEmpty'),'muted'));
  let slices=0;
  route.frames.forEach((frame,i)=>{
   if(frame.kind!=='initial'){const button=element('button',frame.move,'sq1-move');button.type='button';button.dataset.frame=i;button.setAttribute('aria-label',`${t('step',{n:i})}: ${frame.move}`);button.onclick=()=>selectFrame(i);$('#sq1TreeFormula').append(button);}
   if(frame.kind==='slice')slices++;
   const card=element('article',undefined,'sq1-step');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',t('practiceStep',{n:i,label:label(frame.kind)}));const heading=element('div',undefined,'sq1-step-heading');heading.append(element('span',String(i).padStart(2,'0'),'sq1-step-index'),element('strong',label(frame.kind)));card.append(heading);
   if(renderState)card.append(renderState(frame.state));
   card.append(element('code',frame.move||'—','sq1-step-move'),element('p',i===route.frames.length-1?t('finished'):t('sliceProgress',{n:slices,total:analysis.minSlices}),'sq1-step-progress'));card.onclick=()=>selectFrame(i,false);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectFrame(i,false);}};$('#sq1TreeFrames').append(card);
  });
  const shapeFrames=[route.frames[0],...route.frames.filter(frame=>frame.kind==='slice')];
  route.path.map(treeCaseId).forEach((id,i)=>{const c=data.nodes.find(c=>c.id===id),button=element('button',`${i} · ${identifyLayers(shapeFrames[i].state).map(shapeName).join(' + ')}`,'secondary');button.type='button';button.dataset.caseId=id;button.onclick=()=>selectCase(id,{state:shapeFrames[i].state,poseSource:'branch'});$('#sq1TreeRouteCases').append(button);});selectFrame(frameIndex,false);
 }
 async function selectCase(id,{force=false,state=null,poseSource=null,swapped=false}={}){
  clearTimeout(searchTimer);searchTimer=null;
  if(!data?.nodes.some(c=>c.id===id))return;
  if(hasQuery()&&((state&&poseSource!=='canonical')||!matches.has(id))){topSearch.value=bottomSearch.value='';renderSearch();}
  const nextSource=poseSource||(state?'current':'canonical'),pose=state?JSON.stringify(state):null;
  if(id===selectedId&&analysis&&!force&&source===nextSource&&(state?pose===JSON.stringify(selectedState):selectedSwapped===swapped))return;
  const token=++selectionEpoch;selectedId=id;selectedSwapped=swapped;selectedState=state?structuredClone(state):null;source=nextSource;analysis=null;groups=[];groupIndex=variantIndex=frameIndex=0;solving=true;failed=false;fitMode=true;readableFit=true;
  $('#sq1TreeOnlyRoutes').checked=true;$('#sq1TreeAllPaths').checked=true;
  renderSearch();renderDetails();renderRoutes();renderStatus();drawTree();
  try{
   let result=await request(state?'solve':'treeSolve',state?{state:selectedState}:{caseId:id});if(token!==selectionEpoch)return;
   if(!state&&swapped){const initial=result.routes?.[0]?.frames?.[0]?.state;if(!initial)throw Error('no_initial_state');selectedState={top:initial.bottom.slice(),bottom:initial.top.slice(),middle:initial.middle};result=await request('solve',{state:selectedState});if(token!==selectionEpoch)return;}
   if(!result.routes?.length)throw Error('no_routes');selectedState=result.routes[0].frames[0].state;analysis=result;groups=groupTreeRoutes(result);
  }
  catch{if(token===selectionEpoch)failed=true;}
  finally{if(token===selectionEpoch){solving=false;renderDetails();renderRoutes();renderStatus();drawTree();const selected=layout?.nodes.find(c=>c.id===selectedId);if(selected)viewport.scrollLeft=(selected.x+selected.width/2)*zoom-viewport.clientWidth/2;}}
 }
 async function open(scroll=false){
  root.hidden=false;userClosed=false;trigger.setAttribute('aria-expanded','true');if(scroll)root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  if(data){update();const current=getCurrentCase();if(!selectedId){if(hasQuery())searchChanged();else if(current?.state)selectCase(current.caseId,{state:current.state});}return;}if(loading)return;
  const token=++loadEpoch;loading=true;failed=false;renderStatus();
  try{const result=await request('tree');if(token!==loadEpoch)return;data={...result,nodes:result.nodes.map(c=>({...c,codes:c.id.split(':').map(id=>shapeCodes.get(id))}))};renderSearch();renderDetails();renderRoutes();drawTree();const current=getCurrentCase();if(hasQuery())searchChanged();else if(current?.state)selectCase(current.caseId,{state:current.state});}
  catch{if(token===loadEpoch)failed=true;}
  finally{if(token===loadEpoch){loading=false;renderStatus();}}
 }
 function clear(){clearTimeout(searchTimer);searchTimer=null;selectionEpoch++;selectedId=null;selectedState=null;analysis=null;groups=[];groupIndex=variantIndex=frameIndex=0;source='canonical';solving=false;failed=false;$('#sq1TreeOnlyRoutes').checked=false;$('#sq1TreeAllPaths').checked=true;renderSearch();renderDetails();renderRoutes();renderStatus();drawTree();}
 function searchChanged(immediate=false){
  clearTimeout(searchTimer);searchTimer=null;renderSearch();
  if(!hasQuery()){renderDetails();return;}
  // A result list must never sit above an unrelated, previously selected solve.
  if(selectedId)clear();
  if(matches.size===1){
   const [id,orientation]=matches.entries().next().value;
   const openMatch=()=>{searchTimer=null;selectCase(id,{swapped:orientation==='swapped'});};
   if(immediate)openMatch();else searchTimer=setTimeout(openMatch,160);
  }
  renderDetails();
 }
 function update(){
  root.querySelectorAll('[data-sq]').forEach(e=>e.textContent=t(e.dataset.sq));
  for(const [input,side]of [[topSearch,'top'],[bottomSearch,'bottom']]){input.placeholder=t('search');input.setAttribute('aria-label',`${t(side)}: ${t('search')}`);}
  $('#sq1TreeZoomIn').setAttribute('aria-label',t('treeZoomIn'));$('#sq1TreeZoomOut').setAttribute('aria-label',t('treeZoomOut'));viewport.setAttribute('aria-label',t('treeScroll'));
  $('#sq1TreeStepBack').setAttribute('aria-label',t('previous')+' · '+t('steps'));$('#sq1TreeStepNext').setAttribute('aria-label',t('next')+' · '+t('steps'));
  renderSearch();renderDetails();renderRoutes();renderStatus();if(!root.hidden)drawTree();
 }
 function currentChanged(){
  const current=getCurrentCase(),signature=currentSignature(current);renderStatus();
  if(signature===lastCurrentSignature)return;lastCurrentSignature=signature;
  if(!current?.state){if(source==='current'||source==='branch')clear();if(!userClosed&&!data&&!loading&&!failed)open();return;}
  if(userClosed)return;if(!data){open();return;}if(!hasQuery())selectCase(current.caseId,{state:current.state});
 }
 function close(){clearTimeout(searchTimer);searchTimer=null;root.hidden=true;userClosed=true;trigger.setAttribute('aria-expanded','false');trigger.focus();}
 trigger.onclick=()=>root.hidden?open(true):root.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 $('#sq1TreeClose').onclick=close;$('#sq1TreeClear').onclick=clear;$('#sq1TreeCurrent').onclick=()=>{const current=getCurrentCase();if(current?.state)selectCase(current.caseId,{state:current.state});};
 $('#sq1TreeOverview').onclick=()=>{$('#sq1TreeOnlyRoutes').checked=false;fitMode=true;readableFit=false;drawTree();};
 $('#sq1TreeRetry').onclick=()=>data&&selectedId?selectCase(selectedId,{force:true,state:selectedState,poseSource:source,swapped:selectedSwapped}):open();
 topSearch.oninput=bottomSearch.oninput=()=>searchChanged();
 topSearch.onkeydown=bottomSearch.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchChanged(true);}};
 $('#sq1TreeOnlyRoutes').onchange=()=>{fitMode=true;readableFit=$('#sq1TreeOnlyRoutes').checked;drawTree();};$('#sq1TreeAllPaths').onchange=()=>{renderRoutes();fitMode=true;drawTree();};
 $('#sq1TreeRoutes').onchange=e=>{groupIndex=Number(e.target.value);variantIndex=frameIndex=0;$('#sq1TreeAllPaths').checked=false;renderRoutes();drawTree();};$('#sq1TreeVariants').onchange=e=>{variantIndex=Number(e.target.value);frameIndex=0;renderRoutes();renderDetails();paintGraph();};
 $('#sq1TreeCopy').onclick=()=>{const route=chosenRoute();if(route)copy(route.alg);};
 $('#sq1TreeStepBack').onclick=()=>selectFrame(frameIndex-1);$('#sq1TreeStepNext').onclick=()=>selectFrame(frameIndex+1);
 $('#sq1TreeFit').onclick=()=>{if(layout){readableFit=false;setZoom(fitScale(),true)}};$('#sq1TreeZoomIn').onclick=()=>setZoom(zoom*1.5);$('#sq1TreeZoomOut').onclick=()=>setZoom(zoom/1.5);
 new ResizeObserver(()=>{if(layout&&fitMode&&!root.hidden)setZoom(fitScale(),true);}).observe(viewport);
 update();if(!root.hidden)open();
 return {update,currentChanged,open:()=>open(true),reset(){loadEpoch++;selectionEpoch++;loading=solving=false;topSearch.value=bottomSearch.value='';lastCurrentSignature=null;userClosed=false;root.hidden=false;trigger.setAttribute('aria-expanded','true');clear();if(!data)open();}};
}

import {SHAPES,PIECES,layerPieces,layerCode,identifyLayers} from './sq1-engine.js';
import {sq1Text} from './sq1-i18n.js';

const NS='http://www.w3.org/2000/svg';
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const svgNode=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const SHAPE_MAP=new Map(SHAPES.map(s=>[s.id,s]));
const PIECE_MAP=new Map(PIECES.map(p=>[p.id,p]));
function pairFromCodes(top,bottom){let c=0,e=8;const ring=code=>[...code].flatMap(type=>type==='C'?[c,c++]:[e++]);return {top:ring(top),bottom:ring(bottom),middle:0};}
function point(angle,r=38){const a=(angle+90)*Math.PI/180;return [60+r*Math.cos(a),60+r*Math.sin(a)];}
function polarPoint(angle,r){return point(angle*30,r);}

// The outer point of each 60-degree corner lies on the true square perimeter.
// Drawing every piece as a circular sector would incorrectly make Square round.
export function layerDiagram(layer,{mini=false,t=k=>k,plain=false}={}){
 const svg=svgNode('svg',{viewBox:'0 0 120 120',role:'img','aria-label':layerCode(layer),class:'sq1-layer-svg'});
 const pieces=layerPieces(layer),pattern=layerCode(layer);
 for(const piece of pieces){
  const shape=plain?null:PIECE_MAP.get(piece.id),start=piece.start,end=start+piece.width;
  const pts=[[60,60],polarPoint(start,38)];
  if(piece.width===2)pts.push(polarPoint(start+1,38*1.366025403784));
  pts.push(polarPoint(end,38));
  const polygon=svgNode('polygon',{points:pts.map(p=>p.map(n=>n.toFixed(3)).join(',')).join(' '),fill:plain?'var(--sq1-mini-fill)':shape?.face==='U'?'#f1d465':'#f9faf3',stroke:'#263b32','stroke-width':mini?1.1:1.35,'stroke-linejoin':'round'});
  svg.append(polygon);
 }
 if(!mini){
  const line=svgNode('line',{x1:60,y1:3,x2:60,y2:117,stroke:'var(--green)','stroke-width':1,'stroke-dasharray':'3 4',opacity:.65});
  const title=svgNode('title');title.textContent=t('cut');line.append(title);svg.append(line);
  // Choose the canonical CE rotation as the reading origin, including wrapping corners.
  const ordered=[...pieces].sort((a,b)=>a.start-b.start);let origin=ordered[0];
  for(let i=0;i<ordered.length;i++){
   const candidate=ordered.slice(i).concat(ordered.slice(0,i)).map(p=>p.width===2?'C':'E').join('');
   if(candidate===pattern){origin=ordered[i];break;}
  }
  if(origin){const p=polarPoint(origin.start,45),dot=svgNode('circle',{cx:p[0],cy:p[1],r:2.5,fill:'var(--green)',stroke:'var(--card)','stroke-width':1});const title=svgNode('title');title.textContent=t('reading');dot.append(title);svg.append(dot);}
  svg.append(svgNode('path',{d:'M 86 13 A 52 52 0 0 1 103 32',fill:'none',stroke:'var(--green)','stroke-width':1.2}),svgNode('path',{d:'M 99 30 L 103 33 L 104 28',fill:'none',stroke:'var(--green)','stroke-width':1.2}));
 }
 return svg;
}

export function initSQ1({language,settings,save,toast=()=>{}}){
 const root=document.querySelector('#sq1Page');if(!root)throw Error('Missing sq1Page');
 const t=(key,params)=>sq1Text(language(),key,params);
 const shapeName=id=>{const s=SHAPE_MAP.get(id);if(!s)return id;const zh=language()==='zh_hk'?s.zh.replaceAll('风','風').replaceAll('筝','箏').replaceAll('贝','貝').replaceAll('双','雙').replaceAll('邻','鄰'):s.zh;return `${zh} / ${s.en}`;};
 root.innerHTML=`
 <div class="page-heading sq1-heading"><div><p class="eyebrow" data-sq="eyebrow"></p><h1 data-sq="title"></h1><p class="muted sq1-intro" data-sq="intro"></p></div><a class="sq1-cases-jump secondary" href="#sq1CaseSection" data-sq="showCases"></a></div>
 <div class="sq1-layout"><section class="sq1-practice card" aria-labelledby="sq1PracticeTitle"><div class="sq1-section-top"><h2 id="sq1PracticeTitle" data-sq="train"></h2><span class="sq1-badge" id="sq1CurrentDepth"></span></div>
 <div id="sq1Status" class="sq1-status" role="status" aria-live="polite"></div><div id="sq1CurrentDiagram" class="sq1-current-diagram"></div>
 <div id="sq1ScrambleArea"><p class="sq1-caption" data-sq="scramble"></p><p id="sq1ScrambleText" class="sq1-scramble"></p></div>
 <div class="sq1-actions"><button type="button" class="primary" id="sq1New" data-sq="newScramble"></button><button type="button" class="secondary" id="sq1Repeat" data-sq="repeat"></button><button type="button" class="secondary" id="sq1Copy" data-sq="copy"></button></div>
 <button type="button" class="sq1-reveal" id="sq1Reveal" data-sq="reveal"></button><p class="sq1-goal muted" data-sq="goalHint"></p>
 </section><aside class="sq1-labels card"><p class="eyebrow">01 / 02</p><h2 data-sq="display"></h2><label class="sq1-toggle"><span data-sq="names"></span><input type="checkbox" id="sq1Names"></label><label class="sq1-toggle"><span data-sq="codes"></span><input type="checkbox" id="sq1Codes"></label><p class="muted sq1-legend" data-sq="legend"></p><div class="sq1-notation"><code>(a,b) /</code><p data-sq="turnHint"></p></div></aside></div>
 <section id="sq1SolutionSection" class="sq1-solutions card" hidden aria-labelledby="sq1SolutionsTitle"><div class="sq1-section-top"><div><p class="eyebrow">SOLUTION</p><h2 id="sq1SolutionsTitle" data-sq="solutions"></h2></div><span id="sq1SolutionCount" class="sq1-badge"></span></div><p class="muted sq1-route-note" data-sq="routeHint"></p>
 <div class="sq1-solution-nav"><button type="button" class="secondary" id="sq1Prev">← <span data-sq="previous"></span></button><label class="sq1-solution-picker"><span class="sr-only" data-sq="chooseSolution"></span><select id="sq1SolutionSelect"></select></label><button type="button" class="secondary" id="sq1Next"><span data-sq="next"></span> →</button></div>
 <div class="sq1-formula-top"><h3 data-sq="formula"></h3><button type="button" id="sq1CopySolution" class="text-button" data-sq="copySolution"></button></div><div id="sq1Formula" class="sq1-formula"></div><p id="sq1StepHelp" class="sq1-step-help"></p>
 <h3 data-sq="steps"></h3><div class="sq1-step-controls"><button id="sq1StepBack" class="secondary" type="button">←</button><span id="sq1FramePosition"></span><button id="sq1StepNext" class="secondary" type="button">→</button></div><div id="sq1Steps" class="sq1-steps"></div></section>
 <section id="sq1CaseSection" class="sq1-case-section card" aria-labelledby="sq1CaseTitle"><div class="sq1-section-top"><div><p class="eyebrow">CASE LIBRARY</p><h2 id="sq1CaseTitle" data-sq="cases"></h2></div><span id="sq1SelectedCount" class="sq1-badge" role="status"></span></div><p class="muted sq1-case-hint" data-sq="casesHint"></p>
 <div class="sq1-filters"><label class="sq1-search-label"><span class="sr-only" data-sq="search"></span><input id="sq1CaseSearch" type="search" autocomplete="off" spellcheck="false"></label><label><span data-sq="filterShape"></span><select id="sq1ShapeFilter"></select></label><label><span data-sq="depth"></span><select id="sq1DepthFilter"></select></label></div>
 <div class="sq1-case-actions"><button type="button" id="sq1All" class="secondary" data-sq="all"></button><button type="button" id="sq1None" class="secondary" data-sq="none"></button><button type="button" id="sq1SelectVisible" class="text-button" data-sq="selectVisible"></button><button type="button" id="sq1ClearVisible" class="text-button" data-sq="clearVisible"></button></div><div id="sq1Cases" class="sq1-case-grid"></div></section>`;
 const $=s=>root.querySelector(s),shapeFilter=$('#sq1ShapeFilter'),depthFilter=$('#sq1DepthFilter');
 root.querySelector('.sq1-cases-jump').onclick=e=>{e.preventDefault();$('#sq1CaseSection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
 let worker=null,requestId=0,pending=new Map(),catalog=[],generation=0,current=null,analysis=null,routeIndex=0,frameIndex=0,revealed=false,busy=false,statusKey='loading',failure=false,prefs={showNames:true,showCodes:true,selectedCases:[]},loaded=false;
 let activeOperation='generate',requestedCaseId=null;
 function readPreferences(){const p=settings()||{};prefs={showNames:p.showNames!==false,showCodes:p.showCodes!==false,selectedCases:Array.isArray(p.selectedCases)?p.selectedCases.filter(id=>catalog.some(c=>c.id===id)):catalog.map(c=>c.id)};}
 function persist(){save({...prefs,selectedCases:[...prefs.selectedCases]});}
 function stopWorker(error){worker?.terminate();worker=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();}
 function request(type,args={}){
  if(!worker){worker=new Worker(new URL('./sq1-worker.js',import.meta.url),{type:'module'});const owner=worker;worker.onmessage=e=>{if(worker!==owner)return;const p=pending.get(e.data.id);if(!p)return;pending.delete(e.data.id);clearTimeout(p.timer);if(e.data.error)p.reject(Error(e.data.error));else p.resolve(e.data.result);};worker.onerror=()=>{if(worker===owner)stopWorker(Error('worker_failed'));};worker.onmessageerror=()=>{if(worker===owner)stopWorker(Error('worker_message_failed'));};}
  const id=++requestId;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('timeout'));stopWorker(Error('worker_timeout'));},60000);pending.set(id,{resolve,reject,timer});try{worker.postMessage({id,type,...args});}catch(e){clearTimeout(timer);pending.delete(id);reject(e);}});
 }
 function label(kind){return t(kind==='slice'?'slash':kind==='rotation'?'turn':'initial');}
 function pairDiagram(state,{mini=false,plain=false}={}){
  const pair=node('div',undefined,'sq1-pair'+(mini?' sq1-pair-mini':''));let ids;
  try{ids=identifyLayers(state);}catch{ids=[];}
  for(const [i,side]of ['top','bottom'].entries()){
   const figure=node('figure',undefined,'sq1-layer');if(!mini)figure.append(node('figcaption',t(side),'sq1-layer-label'));
   figure.append(layerDiagram(state[side],{mini,t,plain}));
   const shape=SHAPE_MAP.get(ids[i]);if(prefs.showNames&&shape)figure.append(node('strong',shapeName(shape.id),'sq1-shape-name'));
   if(prefs.showCodes)figure.append(node('code',layerCode(state[side]),'sq1-ce'));
   pair.append(figure);
  }return pair;
 }
 function matchingCases(){const query=$('#sq1CaseSearch').value.trim().toLowerCase(),shape=shapeFilter.value,depth=depthFilter.value;return catalog.filter(c=>{
  const shapes=[SHAPE_MAP.get(c.top),SHAPE_MAP.get(c.bottom)],haystack=shapes.map(s=>[s?.en,s?.zh,s?.code,s?.id,s&&shapeName(s.id)].join(' ')).join(' ').toLowerCase();
  return(!query||haystack.includes(query))&&(!shape||c.top===shape||c.bottom===shape)&&(depth===''||c.minSlices===Number(depth));
 });}
 function renderCases(){
  $('#sq1SelectedCount').textContent=t('selected',{n:prefs.selectedCases.length});const grid=$('#sq1Cases'),selected=new Set(prefs.selectedCases);grid.replaceChildren();
  const matches=matchingCases();if(!matches.length){grid.append(node('p',t('noMatches'),'sq1-no-cases muted'));return;}
  for(const c of matches){
   const card=node('label',undefined,'sq1-case'+(selected.has(c.id)?' selected':'')),checkbox=node('input');checkbox.type='checkbox';checkbox.value=c.id;checkbox.checked=selected.has(c.id);checkbox.setAttribute('aria-label',`${shapeName(c.top)} + ${shapeName(c.bottom)} · ${t('slices',{n:c.minSlices})}`);
   const tick=node('span',checkbox.checked?'✓':'','sq1-case-tick');tick.setAttribute('aria-hidden','true');
   card.append(checkbox,tick,node('span',t('slices',{n:c.minSlices}),'sq1-case-depth'));
   const top=SHAPE_MAP.get(c.top),bottom=SHAPE_MAP.get(c.bottom);card.append(pairDiagram(pairFromCodes(top.code,bottom.code),{mini:true,plain:true}));
   // A text alternative remains even when diagram labels are hidden.
   const alt=node('span',`${shapeName(c.top)} + ${shapeName(c.bottom)}`,'sr-only');card.append(alt);
   checkbox.onchange=()=>{if(checkbox.checked)prefs.selectedCases=[...new Set([...prefs.selectedCases,c.id])];else prefs.selectedCases=prefs.selectedCases.filter(id=>id!==c.id);persist();card.classList.toggle('selected',checkbox.checked);tick.textContent=checkbox.checked?'✓':'';$('#sq1SelectedCount').textContent=t('selected',{n:prefs.selectedCases.length});renderControls();};grid.append(card);
  }
 }
 function renderControls(){
  $('#sq1Names').checked=prefs.showNames;$('#sq1Codes').checked=prefs.showCodes;
  for(const id of ['sq1Names','sq1Codes','sq1All','sq1None','sq1SelectVisible','sq1ClearVisible'])$('#'+id).disabled=!loaded;
  $('#sq1New').disabled=busy||!loaded||!prefs.selectedCases.length;$('#sq1Repeat').disabled=busy||!current;$('#sq1Copy').disabled=busy||!current;$('#sq1Reveal').disabled=busy||!current;
  $('#sq1Reveal').textContent=t(revealed?'hide':'reveal');
  $('#sq1Status').replaceChildren(node('span',t(failure?'error':!busy&&!prefs.selectedCases.length&&!current?'empty':statusKey)));
  $('#sq1Status').classList.toggle('sq1-error',failure);$('#sq1Status').classList.toggle('sq1-busy',busy);
  if(failure){const retry=node('button',t('retry'),'text-button');retry.type='button';retry.onclick=()=>!loaded?initialize():activeOperation==='solve'?revealSolutions():generate(false,requestedCaseId);$('#sq1Status').append(retry);}
 }
 function renderPractice(){
  $('#sq1CurrentDiagram').replaceChildren();$('#sq1CurrentDepth').textContent='';$('#sq1ScrambleText').textContent=current?.scramble||'';$('#sq1ScrambleArea').hidden=!current;
  if(current){$('#sq1CurrentDiagram').append(pairDiagram(current.state));const c=catalog.find(c=>c.id===current.caseId);if(c)$('#sq1CurrentDepth').textContent=t('slices',{n:c.minSlices});}
  else {const ghost=node('div',undefined,'sq1-ghost');ghost.append(node('span','◇'),node('p',t(busy?'loading':'empty')));$('#sq1CurrentDiagram').append(ghost);}
  renderControls();renderSolution();
 }
 function frameHelp(frame){
  if(frame.kind==='initial')return t('initialHint');if(frame.kind==='slice')return t('slashHint');
  const match=String(frame.move).match(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);return match?t('rotation',{u:Number(match[1])*30,d:Number(match[2])*30}):frame.move;
 }
 function selectFrame(index,scroll=true){
  if(!analysis)return;const frames=analysis.routes[routeIndex].frames;frameIndex=Math.max(0,Math.min(index,frames.length-1));
  $('#sq1Steps').querySelectorAll('.sq1-step').forEach((e,i)=>{e.classList.toggle('active',i===frameIndex);e.setAttribute('aria-current',i===frameIndex?'step':'false');});
  $('#sq1Formula').querySelectorAll('[data-frame]').forEach(e=>{const active=Number(e.dataset.frame)===frameIndex;e.classList.toggle('active',active);e.setAttribute('aria-pressed',String(active));});
  $('#sq1StepHelp').textContent=frameHelp(frames[frameIndex]);$('#sq1FramePosition').textContent=t('step',{n:frameIndex});$('#sq1StepBack').disabled=frameIndex===0;$('#sq1StepNext').disabled=frameIndex===frames.length-1;
  if(scroll){const card=$('#sq1Steps').children[frameIndex];if(card&&matchMedia('(min-width: 701px)').matches)$('#sq1Steps').scrollTo({left:card.offsetLeft-$('#sq1Steps').offsetLeft-10,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 }
 function renderSolution(){
  const section=$('#sq1SolutionSection');section.hidden=!revealed||!analysis;if(section.hidden)return;
  const routes=analysis.routes,route=routes[routeIndex];$('#sq1SolutionCount').textContent=t('solutionCount',{n:analysis.totalSolutions??routes.length});
  const select=$('#sq1SolutionSelect');select.replaceChildren(...routes.map((_,i)=>{const option=node('option',t('solutionNumber',{n:i+1,total:routes.length}));option.value=i;return option;}));select.value=routeIndex;select.setAttribute('aria-label',t('chooseSolution'));
  $('#sq1Prev').disabled=routeIndex===0;$('#sq1Next').disabled=routeIndex===routes.length-1;
  const formula=$('#sq1Formula');formula.replaceChildren();
  if(!route.alg.trim())formula.append(node('p',t('solutionEmpty'),'muted'));
  route.frames.forEach((frame,i)=>{if(frame.kind==='initial')return;const button=node('button',frame.move,'sq1-move');button.type='button';button.dataset.frame=i;button.setAttribute('aria-label',`${t('step',{n:i})}: ${frame.move}`);button.onclick=()=>selectFrame(i);formula.append(button);});
  const steps=$('#sq1Steps');steps.replaceChildren();let slices=0;
  route.frames.forEach((frame,i)=>{if(frame.kind==='slice')slices++;const card=node('article',undefined,'sq1-step');card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',t('practiceStep',{n:i,label:label(frame.kind)}));const heading=node('div',undefined,'sq1-step-heading');heading.append(node('span',String(i).padStart(2,'0'),'sq1-step-index'),node('strong',label(frame.kind)));card.append(heading,pairDiagram(frame.state),node('code',frame.move||'—','sq1-step-move'),node('p',i===route.frames.length-1?t('finished'):t('sliceProgress',{n:slices,total:analysis.minSlices}),'sq1-step-progress'));card.onclick=()=>selectFrame(i,false);card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectFrame(i,false);}};steps.append(card);});selectFrame(frameIndex,false);
 }
 function update(){
  root.querySelectorAll('[data-sq]').forEach(e=>e.textContent=t(e.dataset.sq));$('#sq1CaseSearch').placeholder=t('search');$('#sq1CaseSearch').setAttribute('aria-label',t('search'));
  const shapeValue=shapeFilter.value,depthValue=depthFilter.value;shapeFilter.replaceChildren();const allShapes=node('option',t('allShapes'));allShapes.value='';shapeFilter.append(allShapes);for(const shape of SHAPES){const option=node('option',shapeName(shape.id));option.value=shape.id;shapeFilter.append(option);}shapeFilter.value=shapeValue;
  depthFilter.replaceChildren();const allDepth=node('option',t('anyDepth'));allDepth.value='';depthFilter.append(allDepth);for(let i=0;i<=7;i++){const o=node('option',t('slices',{n:i}));o.value=i;depthFilter.append(o);}depthFilter.value=depthValue;
  $('#sq1StepBack').setAttribute('aria-label',t('previous')+' · '+t('steps'));$('#sq1StepNext').setAttribute('aria-label',t('next')+' · '+t('steps'));renderCases();renderPractice();
 }
 function rand(n){const a=new Uint32Array(1),limit=2**32-(2**32%n);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
 async function generate(repeat=false,overrideCaseId=null){
  if(!loaded||!prefs.selectedCases.length&&!repeat&&!overrideCaseId)return;const caseId=overrideCaseId||(repeat&&current?current.caseId:prefs.selectedCases[rand(prefs.selectedCases.length)]),token=++generation;requestedCaseId=caseId;
  activeOperation='generate';busy=true;failure=false;statusKey='loading';revealed=false;analysis=null;current=null;routeIndex=frameIndex=0;renderPractice();
  try{const result=await request('generate',{caseId});if(token!==generation)return;current=result;statusKey='ready';}
  catch{if(token!==generation)return;failure=true;statusKey='error';}
  finally{if(token===generation){busy=false;renderPractice();}}
 }
 async function revealSolutions(){
  if(!current||busy)return;if(revealed){revealed=false;renderControls();renderSolution();return;}
  if(analysis){revealed=true;renderControls();renderSolution();return;}
  const token=generation,state=current.state;activeOperation='solve';busy=true;failure=false;statusKey='working';renderControls();
  try{const result=await request('solve',{state});if(token!==generation)return;if(!result.routes?.length)throw Error('no_routes');analysis=result;revealed=true;routeIndex=frameIndex=0;statusKey='ready';}
  catch{if(token!==generation)return;failure=true;}
  finally{if(token===generation){busy=false;renderControls();renderSolution();}}
 }
 async function copy(text){try{await navigator.clipboard.writeText(text);toast(t('copied'));}catch{toast(t('copyError'));}}
 function changeSelection(action){const visible=new Set(matchingCases().map(c=>c.id));prefs.selectedCases=action==='all'?catalog.map(c=>c.id):action==='none'?[]:action==='add'?[...new Set([...prefs.selectedCases,...visible])]:prefs.selectedCases.filter(id=>!visible.has(id));persist();renderCases();renderControls();}
 $('#sq1New').onclick=()=>generate();$('#sq1Repeat').onclick=()=>generate(true);$('#sq1Copy').onclick=()=>current&&copy(current.scramble);$('#sq1Reveal').onclick=revealSolutions;
 $('#sq1CopySolution').onclick=()=>analysis&&copy(analysis.routes[routeIndex].alg);
 $('#sq1Prev').onclick=()=>{if(analysis&&routeIndex>0){routeIndex--;frameIndex=0;renderSolution();}};$('#sq1Next').onclick=()=>{if(analysis&&routeIndex<analysis.routes.length-1){routeIndex++;frameIndex=0;renderSolution();}};$('#sq1SolutionSelect').onchange=e=>{routeIndex=Number(e.target.value);frameIndex=0;renderSolution();};
 $('#sq1StepBack').onclick=()=>selectFrame(frameIndex-1);$('#sq1StepNext').onclick=()=>selectFrame(frameIndex+1);
 $('#sq1Names').onchange=e=>{prefs.showNames=e.target.checked;persist();renderCases();renderPractice();};$('#sq1Codes').onchange=e=>{prefs.showCodes=e.target.checked;persist();renderCases();renderPractice();};
 $('#sq1All').onclick=()=>changeSelection('all');$('#sq1None').onclick=()=>changeSelection('none');$('#sq1SelectVisible').onclick=()=>changeSelection('add');$('#sq1ClearVisible').onclick=()=>changeSelection('remove');$('#sq1CaseSearch').oninput=renderCases;shapeFilter.onchange=depthFilter.onchange=renderCases;
 async function initialize(){const token=++generation;busy=true;failure=false;statusKey='loading';renderControls();try{const result=await request('catalog');if(token!==generation)return;catalog=result.cases;loaded=true;readPreferences();update();busy=false;if(prefs.selectedCases.length)generate();else renderPractice();}catch{if(token!==generation)return;failure=true;busy=false;renderControls();}}
 function reset(){generation++;stopWorker(Error('cancelled'));current=analysis=null;requestedCaseId=null;revealed=false;busy=false;failure=false;routeIndex=frameIndex=0;statusKey='ready';if(loaded){readPreferences();update();if(prefs.selectedCases.length)generate();}else initialize();}
 update();initialize();
 return {update,reset,summary:()=>current?JSON.stringify({puzzle:'Square-1',case:identifyLayers(current.state).map(shapeName),minimumSlices:catalog.find(c=>c.id===current.caseId)?.minSlices,metric:'minimum slash count',goal:'cube shape only'},null,2):''};
}

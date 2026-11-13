import {SQ1_ALGORITHMS,ALGORITHM_STAGES} from './sq1-algorithms-data.js';
import {algorithmCase} from './sq1-algorithms-model.js';
import {algText} from './sq1-algorithms-i18n.js';
import {layerDiagram} from './sq1.js';
import {sq1Text} from './sq1-i18n.js';

const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const cases=new Map();
const caseFor=record=>{if(!cases.has(record.id))cases.set(record.id,algorithmCase(record));return cases.get(record.id);};
let svgTools;
async function svgRenderer(){
 svgTools??=Promise.all([import('/vendor/cubing/puzzles/index.js'),import('/vendor/cubing/twisty/index.js')]).then(async([p,t])=>({kp:await p.puzzles.square1.kpuzzle(),svg:await p.puzzles.square1.svg(),Animator:t.ExperimentalSVGAnimator})).catch(error=>{svgTools=null;throw error;});
 return svgTools;
}

export function initSQ1Algorithms({language,toast=()=>{},navigate}){
 const root=document.querySelector('#sq1AlgorithmsPage'),t=(key,params)=>algText(language(),key,params),stageKey=stage=>'stage_'+stage.toUpperCase();
 root.innerHTML=`<div class="page-heading sq1a-heading"><div><p class="eyebrow" data-sq1a="eyebrow"></p><h1 data-sq1a="title"></h1><p class="muted" data-sq1a="intro"></p></div><button type="button" id="sq1aShapes" class="secondary" data-sq1a="backToShapes"></button></div>
 <div id="sq1aStats" class="sq1a-stats"></div><section class="card sq1a-filters"><label><span data-sq1a="search"></span><input id="sq1aSearch" type="search" autocomplete="off" spellcheck="false"></label><label><span data-sq1a="allStages"></span><select id="sq1aStage"></select></label></section>
 <p id="sq1aStageDescription" class="muted sq1a-stage-description"></p><details class="sq1a-guide"><summary data-sq1a="notation"></summary><p data-sq1a="alignmentHint"></p><p data-sq1a="stageNote"></p></details><div id="sq1aCount" class="muted" role="status" aria-live="polite"></div><div id="sq1aGrid" class="sq1a-grid"></div>
 <dialog id="sq1aDialog" class="sq1a-dialog" aria-labelledby="sq1aDialogTitle"><div class="sq1a-dialog-top"><div><p id="sq1aDialogStage" class="eyebrow"></p><h2 id="sq1aDialogTitle"></h2></div><button type="button" id="sq1aClose" class="secondary" data-sq1a="close"></button></div><p class="muted" data-sq1a="alignmentHint"></p><div class="sq1a-detail-layout"><div><h3 data-sq1a="shapeView"></h3><div id="sq1aDetailPreview" class="sq1a-detail-preview sq1a-shape-step"></div><h3 data-sq1a="colorReference"></h3><div id="sq1aReferencePreview" class="sq1a-color-reference"></div></div><div><h3 data-sq1a="formula"></h3><div id="sq1aDetailFormula" class="sq1a-detail-formula"></div><div class="sq1a-step-nav"><button id="sq1aPrev" class="secondary" type="button">←</button><span id="sq1aPosition" role="status"></span><button id="sq1aNext" class="secondary" type="button">→</button></div><p id="sq1aStepName" class="muted"></p><button type="button" id="sq1aCopyDetail" class="primary" data-sq1a="copy"></button><p id="sq1aMiddleNote" class="muted"></p></div></div><details class="sq1a-setup"><summary data-sq1a="setup"></summary><p data-sq1a="setupHint"></p><code id="sq1aSetupAlg" class="sq1a-formula"></code><button type="button" id="sq1aCopySetup" class="secondary" data-sq1a="copy"></button></details><p class="muted" data-sq1a="stageNote"></p><p id="sq1aDetailSource" class="sq1a-source"></p></dialog>`;
 const $=s=>root.querySelector(s),grid=$('#sq1aGrid'),search=$('#sq1aSearch'),stage=$('#sq1aStage'),dialog=$('#sq1aDialog');
 let selected=null,frameIndex=0,observer;
 function sourceLink(record){const link=element('a',record.sourceName);link.href=record.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';return link;}
 async function copy(alg){try{await navigator.clipboard.writeText(alg);toast(t('copied'));}catch{toast(t('copyError'));}}
 async function picture(host,alg){
  host.dataset.pattern=alg;host.setAttribute('aria-busy','true');host.replaceChildren(element('span',t('diagramLoading'),'muted'));
  try{
   const {kp,svg,Animator}=await svgRenderer();if(!host.isConnected||host.dataset.pattern!==alg)return;
   const renderer=new Animator(kp,svg);renderer.drawPattern(kp.defaultPattern().applyAlg(alg));
   for(const property of ['width','height','max-width','max-height'])renderer.svgElement.style.removeProperty(property);
   renderer.svgElement.setAttribute('role','img');renderer.svgElement.setAttribute('aria-label',t('reference'));host.replaceChildren(renderer.svgElement);
  }catch{
   if(!host.isConnected||host.dataset.pattern!==alg)return;const retry=element('button',t('retry'),'secondary');retry.type='button';retry.onclick=()=>picture(host,alg);host.replaceChildren(element('p',t('diagramError'),'muted'),retry);
  }finally{if(host.dataset.pattern===alg)host.setAttribute('aria-busy','false');}
 }
 function registerPictures(){
  observer?.disconnect();observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);picture(entry.target,entry.target.dataset.setup);}}, {root,rootMargin:'200px'});
  grid.querySelectorAll('.sq1a-preview').forEach(host=>observer.observe(host));
 }
 function renderCards(){
  const query=search.value.normalize('NFKC').toLowerCase().replace(/\s+/g,''),category=stage.value;
  const records=SQ1_ALGORITHMS.filter(record=>!category||category===record.stage).filter(record=>[record.name,record.stage,t(stageKey(record.stage)),record.alg,record.sourceName,record.id].join(' ').normalize('NFKC').toLowerCase().replace(/\s+/g,'').includes(query));
  $('#sq1aCount').textContent=t('count',{n:records.length,total:SQ1_ALGORITHMS.length});grid.replaceChildren();
  $('#sq1aStageDescription').textContent=category?t('stageDescription_'+category.toUpperCase()):t('stageNote');
  for(const record of records){
   const info=caseFor(record),card=element('article',undefined,'card sq1a-card');card.dataset.algorithmId=record.id;
   const top=element('div',undefined,'sq1a-card-top');top.append(element('span',t(stageKey(record.stage)),'sq1a-stage-badge'),element('span',t('slices',{n:info.slashCount}),'sq1a-slices'));
   const preview=element('div',t('diagramLoading'),'sq1a-preview');preview.dataset.setup=info.setup;
   const actions=element('div',undefined,'sq1a-card-actions'),copyButton=element('button',t('copy'),'secondary'),stepsButton=element('button',t('steps'),'primary');copyButton.type=stepsButton.type='button';copyButton.onclick=()=>copy(record.alg);stepsButton.onclick=()=>open(record);
   actions.append(copyButton,stepsButton);const source=element('p',undefined,'sq1a-source');source.append(document.createTextNode(t('source')+' · '),sourceLink(record));
   card.append(top,element('h2',record.name),preview,element('code',record.alg,'sq1a-formula'),actions,source);grid.append(card);
  }
  if(!records.length)grid.append(element('p',t('empty'),'sq1a-empty muted'));registerPictures();
 }
 function frame(index){
  if(!selected)return;const info=caseFor(selected);frameIndex=Math.max(0,Math.min(index,info.frames.length-1));const state=info.frames[frameIndex];
  $('#sq1aDetailFormula').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.frame)===frameIndex)));
  $('#sq1aPosition').textContent=t('currentStep',{n:frameIndex,total:info.frames.length-1});$('#sq1aStepName').textContent=frameIndex===0?t('initial'):frameIndex===info.frames.length-1?t('solved'):state.move;
  $('#sq1aPrev').disabled=frameIndex===0;$('#sq1aNext').disabled=frameIndex===info.frames.length-1;const host=$('#sq1aDetailPreview');host.replaceChildren();for(const side of ['top','bottom']){const figure=element('figure');figure.append(element('figcaption',t(side==='top'?'upperLayer':'lowerLayer')),layerDiagram(state.state[side],{side,t:key=>sq1Text(language(),key)}));host.append(figure);}
 }
 function renderDetail(){
  if(!selected)return;const info=caseFor(selected);picture($('#sq1aReferencePreview'),info.setup);$('#sq1aDialogTitle').textContent=selected.name;$('#sq1aDialogStage').textContent=t(stageKey(selected.stage));
  const formula=$('#sq1aDetailFormula');formula.replaceChildren();info.frames.slice(1).forEach((state,i)=>{const button=element('button',state.move,'sq1a-move');button.type='button';button.dataset.frame=i+1;button.onclick=()=>frame(i+1);formula.append(button);});
  $('#sq1aSetupAlg').textContent=info.setup;$('#sq1aMiddleNote').textContent=info.middleFlips?t('middleFlip'):'';
  $('#sq1aDetailSource').replaceChildren(document.createTextNode(t('source')+' · '),sourceLink(selected));$('#sq1aPrev').setAttribute('aria-label',t('previous'));$('#sq1aNext').setAttribute('aria-label',t('next'));frame(frameIndex);
 }
 function open(record){selected=record;frameIndex=0;renderDetail();if(!dialog.open)dialog.showModal();}
 function update(){
  root.querySelectorAll('[data-sq1a]').forEach(e=>e.textContent=t(e.dataset.sq1a));document.querySelector('#sq1AlgorithmsNav').textContent=t('nav');
  search.placeholder=t('search');search.setAttribute('aria-label',t('search'));const previous=stage.value;stage.replaceChildren();const all=element('option',t('allStages'));all.value='';stage.append(all);
  for(const key of ALGORITHM_STAGES){const option=element('option',t(stageKey(key)));option.value=key;stage.append(option);}stage.value=previous;
  $('#sq1aStats').replaceChildren(element('span',t('count',{n:SQ1_ALGORITHMS.length,total:SQ1_ALGORITHMS.length})),element('span',t('stageCount',{n:5})),element('span',t('sourceCount',{n:3})));
  renderCards();if(dialog.open)renderDetail();
 }
 search.oninput=stage.onchange=renderCards;$('#sq1aShapes').onclick=()=>navigate('sq1');$('#sq1aClose').onclick=()=>dialog.close();$('#sq1aPrev').onclick=()=>frame(frameIndex-1);$('#sq1aNext').onclick=()=>frame(frameIndex+1);$('#sq1aCopyDetail').onclick=()=>selected&&copy(selected.alg);$('#sq1aCopySetup').onclick=()=>selected&&copy(caseFor(selected).setup);
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 update();return {update,hide:()=>dialog.close()};
}

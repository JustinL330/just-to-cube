import {value,format} from './core.js';
export function phaseNames(settings={}){
 const names=settings.phaseNames;
 return settings.phaseTiming===true&&Array.isArray(names)&&names.length>=2&&names.length<=8&&names.every(n=>typeof n==='string'&&n.trim()&&n.length<=30)?names.map(n=>n.trim()):[];
}
export function phaseDurations(marks,total,names){
 if(marks.length!==names.length-1||!Number.isFinite(total)||total<0)return [];
 let previous=0;const out=[];
 for(let i=0;i<names.length;i++){const end=i<marks.length?marks[i]:total;if(!Number.isFinite(end)||end<previous||end>total)return [];out.push({name:names[i],ms:end-previous});previous=end}return out;
}
export function phaseAverages(solves){
 const groups=new Map();
 for(const solve of solves){if(solve.penalty==='DNF'||!Array.isArray(solve.phases)||!solve.phases.length)continue;
  const key=JSON.stringify(solve.phases.map(p=>p.name));let group=groups.get(key);
  if(!group){group={names:solve.phases.map(p=>p.name),totals:solve.phases.map(()=>0),count:0};groups.set(key,group)}
  group.count++;solve.phases.forEach((p,i)=>group.totals[i]+=p.ms);
 }
 return [...groups.values()].map(g=>({names:g.names,count:g.count,averages:g.totals.map(v=>v/g.count)}));
}
export function sessionStatistics(solves){
 const times=solves.map(value).filter(Number.isFinite).sort((a,b)=>a-b),count=times.length;
 const mean=count?times.reduce((a,b)=>a+b,0)/count:null;
 return {count:solves.length,dnfs:solves.length-count,best:count?times[0]:null,worst:count?times.at(-1):null,mean,median:count?(times[Math.floor((count-1)/2)]+times[Math.floor(count/2)])/2:null,sd:count?Math.sqrt(times.reduce((s,x)=>s+(x-mean)**2,0)/count):null};
}
export function histogram(solves,bins=8){
 const times=solves.map(value).filter(Number.isFinite);if(!times.length)return [];
 const min=Math.min(...times),max=Math.max(...times),width=max===min?1:(max-min)/bins,counts=Array(bins).fill(0);
 times.forEach(x=>counts[Math.min(bins-1,Math.floor((x-min)/width))]++);
 return counts.map((count,i)=>({count,from:min+i*width,to:min+(i+1)*width}));
}
export function initTraining({settings,save,solves,t}){
 const $=s=>document.querySelector(s),el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
 const svgEl=(tag,attrs)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e};
 function draw(){
  const a=solves(),host=$('#trainingGraph');host.replaceChildren();
  const svg=svgEl('svg',{viewBox:'0 0 600 200',role:'img','aria-label':t($('#graphType').value)}),valid=a.map(value).filter(Number.isFinite);
  if(!valid.length){host.textContent=t('phaseNoData');return}
  if($('#graphType').value==='distribution'){
   const buckets=histogram(a),top=Math.max(...buckets.map(b=>b.count));
   buckets.forEach((b,i)=>{const h=b.count/top*140,x=20+i*72;const rect=svgEl('rect',{x,y:160-h,width:62,height:h,fill:'var(--green)'});rect.append(el('title',`${format(b.from)} – ${format(b.to)}: ${b.count}`));svg.append(rect);const text=svgEl('text',{x:x+31,y:180,'text-anchor':'middle','font-size':10,fill:'var(--muted)'});text.textContent=format(b.from);svg.append(text);const count=svgEl('text',{x:x+31,y:Math.max(12,155-h),'text-anchor':'middle','font-size':11,fill:'var(--ink)'});count.textContent=b.count;svg.append(count)});
  }else{
   const series=a.slice(-200),finite=series.map(value).filter(Number.isFinite),min=Math.min(...finite),max=Math.max(...finite),scale=Math.max(1,max-min);if(!finite.length){host.textContent=t('phaseNoData');return}let points=[];
   const flush=()=>{if(points.length)svg.append(svgEl('polyline',{points:points.join(' '),fill:'none',stroke:'var(--green)','stroke-width':2}));points=[]};
   series.forEach((s,i)=>{const v=value(s);if(!Number.isFinite(v)){flush();return}const x=20+i/Math.max(1,series.length-1)*560,y=160-(v-min)/scale*140;points.push(`${x},${y}`);const dot=svgEl('circle',{cx:x,cy:y,r:2.5,fill:'var(--green)'});dot.append(el('title',`${a.length-series.length+i+1}: ${format(v)}`));svg.append(dot)});flush();
   for(const [y,label] of [[16,format(max)],[194,format(min)]]){const text=svgEl('text',{x:20,y,'font-size':12,fill:'var(--muted)'});text.textContent=label;svg.append(text)}
  }host.append(svg);
 }
 function report(){
  const a=solves(),stats=sessionStatistics(a),host=$('#sessionStatistics');host.replaceChildren();
  for(const key of ['count','dnfs','best','worst','mean','median','sd']){const row=el('div','');row.append(el('span',t(key==='count'?'solves':key)),el('strong',['count','dnfs'].includes(key)?stats[key]:format(stats[key])));host.append(row)}
  const groups=phaseAverages(a),phaseHost=$('#phaseAverages');phaseHost.replaceChildren();
  if(!groups.length)phaseHost.append(el('p',t('phaseNoData')));
  for(const group of groups){phaseHost.append(el('h3',`${group.count} ${t('solves')}`));const table=el('table','');group.names.forEach((name,i)=>{const row=el('tr','');row.append(el('td',t('phaseLabel')+' '+(i+1)),el('td',format(group.averages[i])));table.append(row)});phaseHost.append(table)}draw();
 }
 function mode(){$('#phaseCount').disabled=!$('#enablePhases').checked}
 function open(){const names=phaseNames(settings());$('#enablePhases').checked=names.length>0;$('#phaseCount').value=names.length||4;mode();$('#trainingError').textContent='';report();$('#trainingDialog').showModal()}
 $('#trainingBtn').onclick=$('#statisticsBtn').onclick=open;$('#closeTraining').onclick=()=>$('#trainingDialog').close();$('#enablePhases').onchange=mode;$('#graphType').onchange=draw;
 $('#saveTraining').onclick=()=>{const enabled=$('#enablePhases').checked,count=Number($('#phaseCount').value);
  if(enabled&&(!Number.isInteger(count)||count<2||count>8)){$('#trainingError').textContent=t('phaseCountHelp');return}
  save({phaseTiming:enabled,phaseNames:enabled?Array.from({length:count},(_,i)=>String(i+1)):[]});$('#trainingDialog').close();
 };
 return {open,report};
}

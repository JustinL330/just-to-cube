export const EVENTS={'222':'2×2×2','333':'3×3×3','444':'4×4×4','555':'5×5×5','666':'6×6×6','777':'7×7×7','clock':'Clock','minx':'Megaminx','pyram':'Pyraminx','skewb':'Skewb','sq1':'Square-1','333oh':'3×3 OH','333bf':'3×3 BLD','444bf':'4×4 BLD','555bf':'5×5 BLD','333fm':'3×3 FMC','333mbf':'3×3 Multi-BLD (single cube)','fto':'FTO','baby_fto':'Baby FTO','master_tetraminx':'Master Tetraminx','kilominx':'Kilominx','redi_cube':'Redi Cube','888':'8×8×8','999':'9×9×9','101010':'10×10×10','111111':'11×11×11','333ru':'3×3 · R U','333rul':'3×3 · R U L','333mu':'3×3 · M U'};
export function value(s){return s.penalty==='DNF'?Infinity:s.ms+(s.penalty==='+2'?2000:0)}
export function average(solves,n){if(solves.length<n)return null;const a=solves.slice(-n).map(value).sort((a,b)=>a-b); const trim=Math.ceil(n*.05);const mid=a.slice(trim,-trim);return mid.reduce((a,b)=>a+b,0)/mid.length;}
export function averagePreference(settings={},slot=1){
 const modeKey=slot===2?'secondAverageMode':'averageMode',nKey=slot===2?'secondAverageN':'averageN';
 const mode=['mo','daily'].includes(settings[modeKey])?settings[modeKey]:'ao',n=Number(settings[nKey]??(slot===2?12:5));
 return {mode,n:Number.isInteger(n)&&n>=(mode==='ao'?3:1)&&n<=1000?n:5};
}
export function validTimeZone(zone){try{if(typeof zone==='string'&&zone.length<100){new Intl.DateTimeFormat('en',{timeZone:zone}).format();return true}}catch{}return false}
export function calendarDay(date,timeZone){
 const d=new Date(date);if(!Number.isFinite(d.getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:validTimeZone(timeZone)?timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
 const part=k=>parts.find(p=>p.type===k).value;return `${part('year')}-${part('month')}-${part('day')}`;
}
export function dailyCount(sessions,timeZone,now=new Date()){
 const day=calendarDay(now,timeZone),formatter=new Intl.DateTimeFormat('en-CA',{timeZone:validTimeZone(timeZone)?timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'});
 const key=d=>formatter.format(d),today=key(new Date(now));if(day===null)return 0;
 let count=0;for(const session of sessions)for(const solve of session.solves){const date=new Date(solve.date);if(Number.isFinite(date.getTime())&&key(date)===today)count++}return count;
}
export function nextDayDelay(timeZone,now=Date.now()){
 const day=calendarDay(now,timeZone);let low=now,high=now+48*3600000;
 while(high-low>1){const mid=Math.floor((low+high)/2);if(calendarDay(mid,timeZone)===day)low=mid;else high=mid}
 return high-now;
}
export function rollingStatistics(solves,n=5,mode='ao'){
 if(!['ao','mo'].includes(mode)||!Number.isInteger(n)||n<(mode==='ao'?3:1)||n>1000)throw Error('invalid_statistic');
 const sorted=[],queue=[];let sum=0,dnfs=0;
 const locate=v=>{let l=0,r=sorted.length;while(l<r){const m=(l+r)>>1;if(sorted[m]<v)l=m+1;else r=m}return l};
 return solves.map(s=>{
  const v=value(s);sorted.splice(locate(v),0,v);queue.push(v);if(Number.isFinite(v))sum+=v;else dnfs++;
  if(queue.length>n){const old=queue.shift();sorted.splice(locate(old),1);if(Number.isFinite(old))sum-=old;else dnfs--}
  if(queue.length<n)return null;
  if(mode==='mo')return dnfs?Infinity:sum/n;
  const trim=Math.ceil(n*.05);if(dnfs>trim)return Infinity;
  let middle=sum;for(let i=0;i<trim;i++){middle-=sorted[i];const high=sorted[n-1-i];if(Number.isFinite(high))middle-=high}
  return middle/(n-2*trim);
 });
}
export function format(ms,digits=3){if(ms===null||ms===undefined)return '—';if(!Number.isFinite(ms))return 'DNF';const scale=10**digits,ticks=Math.floor(ms/(1000/scale)),seconds=Math.floor(ticks/scale),decimal=String(ticks%scale).padStart(digits,'0');return seconds>=60?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}.${decimal}`:`${seconds}.${decimal}`;}
export function parseTime(s){s=s.trim();if(!/^(?:\d+:)?\d{1,6}(?:\.\d{1,3})?$/.test(s))return null; const parts=s.split(':');if(parts.length===2&&Number(parts[1])>=60)return null; const sec=parts.length===2?Number(parts[0])*60+Number(parts[1]):Number(parts[0]);return sec>0&&sec<=86400?Math.round(sec*1000):null;}
export function validPhases(s){if(s.phases===undefined)return true;return Array.isArray(s.phases)&&s.phases.length>=2&&s.phases.length<=8&&s.phases.every(p=>p&&typeof p.name==='string'&&p.name.trim()&&p.name.length<=30&&Number.isFinite(p.ms)&&p.ms>=0)&&Math.abs(s.phases.reduce((n,p)=>n+p.ms,0)-s.ms)<1}
export function validBackup(d){return d?.version===1&&Array.isArray(d.sessions)&&d.sessions.length>0&&d.sessions.length<=500&&d.sessions.every(s=>typeof s.id==='string'&&s.id.length<100&&typeof s.name==='string'&&s.name.length<=100&&EVENTS[s.event]&&Array.isArray(s.solves)&&s.solves.length<=50000&&s.solves.every(v=>Number.isFinite(v.ms)&&v.ms>=0&&v.ms<=86400000&&['OK','+2','DNF'].includes(v.penalty)&&typeof v.scramble==='string'&&v.scramble.length<10000&&typeof v.date==='string'&&validPhases(v)))&&new Set(d.sessions.map(s=>s.id)).size===d.sessions.length;}
export function formatWca(best,event,isAverage=false){
  if(best==null||best===0)return '—';
  if(best===-1)return 'DNF';if(best===-2)return 'DNS';
  if(!Number.isFinite(best)||best<0)return '—';
  if(event==='333fm')return isAverage?(best/100).toFixed(2):String(best);
  if(event==='333mbf'||event==='333mbo'){
    const difference=99-Math.floor(best/1e7),missed=best%100,seconds=Math.floor(best/100)%100000;
    const solved=difference+missed,attempted=solved+missed;
    const h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=String(seconds%60).padStart(2,'0');
    const time=seconds===99999?'?':h?`${h}:${String(m).padStart(2,'0')}:${s}`:`${m}:${s}`;
    return `${solved}/${attempted} · ${time}`;
  }
  return format(best*10,2);
}

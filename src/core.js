export const EVENTS={'222':'2×2×2','333':'3×3×3','444':'4×4×4','555':'5×5×5','666':'6×6×6','777':'7×7×7','clock':'Clock','minx':'Megaminx','pyram':'Pyraminx','skewb':'Skewb','sq1':'Square-1','333oh':'3×3 OH','333bf':'3×3 BLD','444bf':'4×4 BLD','555bf':'5×5 BLD','333fm':'3×3 FMC','333mbf':'3×3 Multi-BLD (single cube)','fto':'FTO','baby_fto':'Baby FTO','master_tetraminx':'Master Tetraminx','kilominx':'Kilominx','redi_cube':'Redi Cube','888':'8×8×8','999':'9×9×9','101010':'10×10×10','111111':'11×11×11','333ru':'3×3 · R U','333rul':'3×3 · R U L','333mu':'3×3 · M U'};
export function value(s){return s.penalty==='DNF'?Infinity:s.ms+(s.penalty==='+2'?2000:0)}
export function average(solves,n){if(solves.length<n)return null;const a=solves.slice(-n).map(value).sort((a,b)=>a-b); const trim=Math.ceil(n*.05);const mid=a.slice(trim,-trim);return mid.reduce((a,b)=>a+b,0)/mid.length;}
export function format(ms,digits=3){if(ms===null||ms===undefined)return '—';if(!Number.isFinite(ms))return 'DNF';const scale=10**digits,ticks=Math.floor(ms/(1000/scale)),seconds=Math.floor(ticks/scale),decimal=String(ticks%scale).padStart(digits,'0');return seconds>=60?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}.${decimal}`:`${seconds}.${decimal}`;}
export function parseTime(s){s=s.trim();if(!/^(?:\d+:)?\d{1,6}(?:\.\d{1,3})?$/.test(s))return null; const parts=s.split(':');if(parts.length===2&&Number(parts[1])>=60)return null; const sec=parts.length===2?Number(parts[0])*60+Number(parts[1]):Number(parts[0]);return sec>0&&sec<=86400?Math.round(sec*1000):null;}
export function validBackup(d){return d?.version===1&&Array.isArray(d.sessions)&&d.sessions.length>0&&d.sessions.length<=500&&d.sessions.every(s=>typeof s.id==='string'&&s.id.length<100&&typeof s.name==='string'&&s.name.length<=100&&EVENTS[s.event]&&Array.isArray(s.solves)&&s.solves.length<=50000&&s.solves.every(v=>Number.isFinite(v.ms)&&v.ms>=0&&v.ms<=86400000&&['OK','+2','DNF'].includes(v.penalty)&&typeof v.scramble==='string'&&v.scramble.length<10000&&typeof v.date==='string'))&&new Set(d.sessions.map(s=>s.id)).size===d.sessions.length;}
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

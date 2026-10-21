import test from 'node:test';
import assert from 'node:assert/strict';
import {rollingStatistics,averagePreference,value,dailyCount,calendarDay,nextDayDelay} from '../src/core.js';
const s=(ms,penalty='OK')=>({ms,penalty});
test('custom means include penalties and DNF; trimmed averages discard extremes',()=>{
 const a=[s(1000),s(2000,'+2'),s(3000),s(4000),s(1,'DNF')];
 assert.deepEqual(rollingStatistics(a,3,'mo'),[null,null,8000/3,11000/3,Infinity]);
 assert.equal(rollingStatistics(a,5,'ao').at(-1),11000/3);
 assert.equal(rollingStatistics([s(1,'DNF'),s(1,'DNF'),s(3)],3,'ao').at(-1),Infinity);
 assert.deepEqual(rollingStatistics([s(1),s(1,'DNF'),s(3)],1,'mo'),[1,Infinity,3]);
});
test('rolling custom statistics match independent window calculations',()=>{
 const solves=Array.from({length:1500},(_,i)=>s((i*7919)%50000,i%19===0?'DNF':i%7===0?'+2':'OK'));
 for(const mode of ['ao','mo'])for(const n of [3,5,12,21,100,1000]){
  const actual=rollingStatistics(solves,n,mode);
  for(let end=n;end<=solves.length;end++){
   let a=solves.slice(end-n,end).map(value).sort((a,b)=>a-b);
   if(mode==='ao'){const k=Math.ceil(n*.05);a=a.slice(k,n-k)}
   assert.equal(actual[end-1],a.reduce((x,y)=>x+y,0)/a.length,`${mode}${n} at ${end}`);
  }
 }
});
test('defaults preserve ao5 and corrupt settings cannot produce invalid statistics',()=>{
 assert.deepEqual(averagePreference(),{mode:'ao',n:5});
 assert.deepEqual(averagePreference({averageMode:'mo',averageN:3}),{mode:'mo',n:3});
 for(const n of [0,-1,2.5,1001,NaN])assert.equal(averagePreference({averageN:n}).n,5);
 assert.throws(()=>rollingStatistics([],2,'ao'));
});

test('daily counts use local calendar boundaries across all sessions, including DNFs',()=>{
 const sessions=[{solves:[{date:'2026-10-20T15:59:59.999Z'},{date:'2026-10-20T16:00:00.000Z',penalty:'DNF'}]},{solves:[{date:'2026-10-21T15:59:59.999Z'},{date:'2026-10-21T16:00:00.000Z'},{date:'invalid'}]}];
 assert.equal(dailyCount(sessions,'Asia/Hong_Kong','2026-10-21T05:00:00Z'),2);
 assert.equal(dailyCount(sessions,'America/Los_Angeles','2026-10-21T05:00:00Z'),2);
 assert.equal(calendarDay('2026-10-20T16:00:00Z','Asia/Hong_Kong'),'2026-10-21');
 assert.equal(nextDayDelay('Asia/Hong_Kong',Date.parse('2026-10-21T15:59:59.000Z')),1000);
});
test('natural days respect daylight-saving transitions rather than assuming 24 hours',()=>{
 assert.equal(nextDayDelay('America/New_York',Date.parse('2026-03-08T05:00:00Z')),23*3600000);
 assert.equal(nextDayDelay('America/New_York',Date.parse('2026-11-01T04:00:00Z')),25*3600000);
 assert.equal(dailyCount([{solves:[{date:'2026-11-01T05:30:00Z'},{date:'2026-11-01T06:30:00Z'}]}],'America/New_York','2026-11-01T20:00:00Z'),2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseNames,phaseDurations,phaseAverages,sessionStatistics,histogram} from '../src/training.js';
import {validPhases} from '../src/core.js';
test('phase markers are converted to durations whose sum equals the raw solve time',()=>{
 const names=['Cross','F2L','OLL','PLL'],phases=phaseDurations([1000,8000,11000],15000,names);
 assert.deepEqual(phases.map(p=>p.ms),[1000,7000,3000,4000]);assert.equal(validPhases({ms:15000,phases}),true);
 assert.deepEqual(phaseDurations([4000,3000,11000],15000,names),[]);
 assert.deepEqual(phaseDurations([1000],15000,names),[]);
 assert.equal(validPhases({ms:16000,phases}),false);
 assert.equal(validPhases({ms:15000,phases:[{name:'Cross',ms:NaN},{name:'Finish',ms:15000}]}),false);
});
test('phase averages group matching configurations, exclude DNF and exclude inspection penalties',()=>{
 const phases=phaseDurations([1000],5000,['A','B']);
 const report=phaseAverages([{phases,penalty:'OK'},{phases:phaseDurations([3000],9000,['A','B']),penalty:'+2'},{phases,penalty:'DNF'},{penalty:'OK'},{phases:phaseDurations([2000],6000,['X','Y']),penalty:'OK'}]);
 assert.deepEqual(report[0],{names:['A','B'],count:2,averages:[2000,5000]});assert.equal(report.length,2);
});
test('invalid phase settings cannot enable malformed runs',()=>{
 assert.deepEqual(phaseNames({phaseTiming:true,phaseNames:['Cross','F2L','OLL','PLL']}),['Cross','F2L','OLL','PLL']);
 for(const names of [[],['one'],['a',''],Array(9).fill('a')])assert.deepEqual(phaseNames({phaseTiming:true,phaseNames:names}),[]);
 assert.deepEqual(phaseNames({phaseTiming:false,phaseNames:['a','b']}),[]);
});
test('session statistics and histogram handle penalties, identical times and empty data',()=>{
 const a=[{ms:1000,penalty:'OK'},{ms:2000,penalty:'+2'},{ms:2000,penalty:'DNF'}],stats=sessionStatistics(a);
 assert.equal(stats.mean,2500);assert.equal(stats.median,2500);assert.equal(stats.sd,1500);assert.equal(stats.dnfs,1);
 assert.equal(histogram(a).reduce((n,b)=>n+b.count,0),2);
 assert.equal(histogram([{ms:1000},{ms:1000}])[0].count,2);
 assert.equal(sessionStatistics([]).mean,null);assert.deepEqual(histogram([]),[]);
});

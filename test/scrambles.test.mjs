import test from 'node:test';
import assert from 'node:assert/strict';
import {Alg} from 'cubing/alg';
import {randomScrambleForEvent} from 'cubing/scramble';
import {EXTRA_PUZZLES,BIG_CUBES,TRAINING,practiceScramble} from '../src/scrambles.js';
import {format} from '../src/core.js';
test('millisecond formatting preserves boundaries, minutes and penalties',()=>{
 for(const [input,expected] of [[0,'0.000'],[9,'0.009'],[12345,'12.345'],[59999.99,'59.999'],[60000,'1:00.000'],[62349.8,'1:02.349']])assert.equal(format(input),expected);
});
test('big-cube and restricted-move practice scrambles have valid notation and constraints',()=>{
 for(const [event,n] of Object.entries(BIG_CUBES)){
  const text=practiceScramble(event),moves=text.split(' ');assert.equal(moves.length,n*20-40);assert.doesNotThrow(()=>Alg.fromString(text));
  let previous=-1;const axes={R:0,L:0,U:1,D:1,F:2,B:2};
  for(const move of moves){const match=move.match(/^(?:(\d+))?([RLUDFB])(w)?(?:2|')?$/);assert.ok(match);const width=match[1]?Number(match[1]):match[3]?2:1;assert.ok(width<=Math.floor(n/2));assert.notEqual(axes[match[2]],previous);previous=axes[match[2]]}
 }
 for(const [event,faces] of Object.entries(TRAINING)){const moves=practiceScramble(event).split(' ');assert.equal(moves.length,25);for(const move of moves)assert.ok(faces.includes(move[0]));assert.doesNotThrow(()=>Alg.fromString(moves.join(' ')))}
});
test('all added non-WCA puzzles generate real cubing.js scrambles',{timeout:120000},async()=>{
 for(const event of EXTRA_PUZZLES){const scramble=await randomScrambleForEvent(event);assert.ok(scramble.toString().length>4);assert.doesNotThrow(()=>Alg.fromString(scramble.toString()))}
});

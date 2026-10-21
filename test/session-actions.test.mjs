import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearSessionResults,restoreSessionResults} from '../src/session-actions.js';
import {validBackup,dailyCount} from '../src/core.js';

const solve=(id,penalty='OK')=>({id,ms:12345,penalty,scramble:'R U',date:'2026-10-21T01:00:00Z',phases:[{name:'Phase 1',ms:6000},{name:'Phase 2',ms:6345}]});
test('clearing one session persists an empty list, preserves other sessions, and undo restores full records',()=>{
  const data={version:1,settings:{dark:true},sessions:[{id:'a',name:'Practice',event:'333',solves:[solve('x'),solve('y','DNF')]},{id:'b',name:'Clock',event:'clock',solves:[solve('z')]}]};
  const original=structuredClone(data),removed=clearSessionResults(data.sessions[0]);
  const saved=JSON.parse(JSON.stringify(data));
  assert.equal(validBackup(saved),true);
  assert.deepEqual(saved.sessions[0],{id:'a',name:'Practice',event:'333',solves:[]});
  assert.deepEqual(saved.sessions[1],original.sessions[1]);
  assert.deepEqual(saved.settings,original.settings);
  assert.equal(dailyCount(saved.sessions,'Asia/Hong_Kong',new Date('2026-10-21T02:00:00Z')),1);
  restoreSessionResults(data.sessions[0],removed);
  assert.deepEqual(data,original);
});

test('undo preserves new solves and existing edits without duplicating IDs',()=>{
  const session={id:'a',name:'Practice',event:'333',solves:[solve('x'),solve('y')]};
  const removed=clearSessionResults(session),edited={...solve('y'),penalty:'+2'};
  session.solves.push(edited,solve('new'));
  restoreSessionResults(session,removed);
  assert.deepEqual(session.solves.map(s=>s.id),['x','y','new']);
  assert.equal(session.solves.find(s=>s.id==='y').penalty,'+2');
});

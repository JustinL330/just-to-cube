import test from 'node:test';
import assert from 'node:assert/strict';
import {guideReply} from '../src/coach-guides.js';
import {aiText} from '../src/ai-i18n.js';
test('all localized prompt buttons lead to the intended curated guides',()=>{
 for(const lang of ['en','zh_hk','zh_cn','ja','ko','fr','de']){
  assert.match(guideReply(aiText(lang,'aiPlan'),lang),/F2L/);
  assert.match(guideReply(aiText(lang,'aiNotation'),lang),/R U R′ U′/);
  assert.match(guideReply(aiText(lang,'aiClock'),lang),/Clock 7-Simul/);
  assert.notEqual(aiText(lang,'aiGuideReady'),'aiGuideReady');
 }
});
test('unknown requests disclose guide limits instead of fabricating an AI answer',()=>{
 assert.match(guideReply('What is the weather today?'),/not generative AI/);
 assert.match(guideReply('show a cube solution from this photo'),/cannot interpret a cube photo/);
});

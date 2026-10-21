import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {createVault,unlockVault,encryptMessage,decryptMessage,fingerprint} from '../src/messages-crypto.js';
const password='a long messaging passphrase';
let alice,bob,mallory,aliceKey,bobKey;
test('browser encryption, cross-device vault recovery and authentication',{timeout:60000},async()=>{
 alice=await createVault(password,'alice');bob=await createVault(password,'bob');mallory=await createVault(password,'mallory');
 aliceKey=await unlockVault(alice,password,'alice');bobKey=await unlockVault(bob,password,'bob');
 assert.equal(aliceKey.extractable,false);assert.equal(alice.ciphertext.includes('private'),false);
 await assert.rejects(unlockVault(alice,'wrong passphrase','alice'));await assert.rejects(unlockVault(alice,password,'bob'));
 const m=await encryptMessage(aliceKey,bob.publicKey,{id:crypto.randomUUID(),sender:'alice',recipient:'bob',text:'你好! Cube chat 🔒'});
 assert.equal(await decryptMessage(bobKey,alice.publicKey,m),'你好! Cube chat 🔒');
 assert.equal(await decryptMessage(await unlockVault(alice,password,'alice'),bob.publicKey,m),'你好! Cube chat 🔒');
 await assert.rejects(decryptMessage(await unlockVault(mallory,password,'mallory'),alice.publicKey,m));
 await assert.rejects(decryptMessage(bobKey,alice.publicKey,{...m,id:crypto.randomUUID()}));
 await assert.rejects(decryptMessage(bobKey,alice.publicKey,{...m,recipient:'mallory'}));
 const bytes=Buffer.from(m.ciphertext,'base64');bytes[0]^=1;await assert.rejects(decryptMessage(bobKey,alice.publicKey,{...m,ciphertext:bytes.toString('base64')}));
 const m2=await encryptMessage(aliceKey,bob.publicKey,{id:crypto.randomUUID(),sender:'alice',recipient:'bob',text:'你好! Cube chat 🔒'});assert.notEqual(m.iv,m2.iv);assert.notEqual(m.ciphertext,m2.ciphertext);assert.notEqual(await fingerprint(alice.publicKey),await fingerprint(bob.publicKey));
});
test('real D1 messaging: account isolation, bounded sync, encrypted storage, idempotent retries and CSRF',{timeout:60000},async()=>{
 await mkdir('.wrangler/test-dm',{recursive:true});await build({entryPoints:['worker.js'],outfile:'.wrangler/test-dm/worker.mjs',bundle:true,format:'esm',platform:'browser'});
 const mf=new Miniflare({modules:true,compatibilityDate:'2026-10-21',scriptPath:'.wrangler/test-dm/worker.mjs',d1Databases:{DB:'test-dm-db'}});
 try{
  const db=await mf.getD1Database('DB');await db.exec(await readFile('migrations/0001_accounts.sql','utf8'));
  const call=async(path,method='GET',body,cookie='',origin='https://test.cubing')=>mf.dispatchFetch('https://test.cubing'+path,{method,headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':crypto.randomUUID(),Cookie:cookie},body:body?JSON.stringify(body):undefined});
  const users=[];for(const name of ['alice_dm','bob_dm','outsider_dm']){const r=await call('/api/account/register','POST',{name,password:'a secure login password'});assert.equal(r.status,200);users.push({cookie:r.headers.get('Set-Cookie').split(';')[0],...(await r.json()).user})}
  const [a,b,c]=users;
  assert.equal((await call('/api/messages')).status,401);
  assert.equal((await call('/api/messages/keys','GET',undefined,a.cookie)).status,200); // schema auto-creates on existing production databases
  assert.equal((await call('/api/messages/user?username=bob_dm','GET',undefined,a.cookie)).status,409);
  const av=await createVault(password,a.id),bv=await createVault(password,b.id);
  assert.equal((await call('/api/messages/keys','POST',av,a.cookie,'https://evil.test')).status,403);
  assert.equal((await call('/api/messages/keys','POST',{...av,publicKey:{...av.publicKey,d:'secret'}},a.cookie)).status,400);
  assert.equal((await call('/api/messages/keys','POST',av,a.cookie)).status,200);
  assert.equal((await call('/api/messages/keys','POST',bv,b.cookie)).status,200);
  assert.equal((await call('/api/messages/keys','POST',av,a.cookie)).status,409);
  assert.equal((await (await call('/api/messages/keys','GET',undefined,c.cookie)).json()).vault,null);
  const peer=(await (await call('/api/messages/user?username=bob_dm','GET',undefined,a.cookie)).json()).peer;assert.equal(peer.id,b.id);assert.equal(peer.vault,undefined);
  const akey=await unlockVault(av,password,a.id),bkey=await unlockVault(bv,password,b.id);
  const m=await encryptMessage(akey,bv.publicKey,{id:crypto.randomUUID(),sender:a.id,recipient:b.id,text:'Secret message 中文'});
  assert.equal((await call('/api/messages','POST',m,b.cookie)).status,400);
  assert.equal((await call('/api/messages','POST',{...m,recipient:a.id},a.cookie)).status,400);
  assert.equal((await call('/api/messages','POST',m,a.cookie,'https://evil.test')).status,403);
  const sent=await (await call('/api/messages','POST',m,a.cookie)).json();assert.ok(sent.seq>0);
  assert.equal((await (await call('/api/messages','POST',m,a.cookie)).json()).seq,sent.seq);
  assert.equal((await call('/api/messages','POST',{...m,iv:'AAAAAAAAAAAAAAAA'},a.cookie)).status,409);
  const inbox=await (await call('/api/messages','GET',undefined,b.cookie)).json();assert.equal(inbox.messages.length,1);assert.equal(await decryptMessage(bkey,av.publicKey,inbox.messages[0]),'Secret message 中文');assert.equal(inbox.peers[0].id,a.id);
  assert.equal((await (await call('/api/messages','GET',undefined,c.cookie)).json()).messages.length,0);
  assert.equal((await (await call('/api/messages?after='+sent.seq,'GET',undefined,b.cookie)).json()).messages.length,0);
  assert.equal((await call('/api/messages?after=-1','GET',undefined,b.cookie)).status,400);
  const stored=await db.prepare('SELECT envelope FROM dm_messages').all();assert.equal(stored.results.length,1);assert.equal(JSON.stringify(stored).includes('Secret message'),false);
  // A reply uses the same authenticated conversation key in the reverse direction.
  const reply=await encryptMessage(bkey,av.publicKey,{id:crypto.randomUUID(),sender:b.id,recipient:a.id,text:'Got it'});assert.equal((await call('/api/messages','POST',reply,b.cookie)).status,200);
  const received=await (await call('/api/messages?after='+sent.seq,'GET',undefined,a.cookie)).json();assert.equal(await decryptMessage(akey,bv.publicKey,received.messages[0]),'Got it');
 }finally{await mf.dispose()}
});

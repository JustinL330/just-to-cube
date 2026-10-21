import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {dayInZone} from '../src/account-worker.js';
import {derivePasswordHash} from '../src/passwords.js';
import {mergePractice} from '../src/account.js';
test('account-local check-in dates respect time zones',()=>{const d=new Date('2026-10-21T17:00:00Z');assert.equal(dayInZone('Asia/Hong_Kong',d),'2026-10-22');assert.equal(dayInZone('America/New_York',d),'2026-10-21')});
test('merging practice preserves sessions, unions solve IDs, and keeps chosen local edits',()=>{const s={id:'s',name:'333',event:'333',solves:[{id:'a',ms:1000,date:'2026-10-21'}]},a={version:1,sessions:[s]},b={version:1,sessions:[{...s,solves:[{id:'a',ms:2000,date:'2026-10-21'},{id:'b',ms:3000,date:'2026-10-22'}]}]};const r=mergePractice(a,b);assert.equal(r.sessions[0].solves.length,2);assert.equal(r.sessions[0].solves[0].ms,2000);assert.equal(a.sessions[0].solves[0].ms,1000)});
test('real Worker and SQLite account lifecycle, ownership, revisions and authenticated check-ins',{timeout:60000},async()=>{
 await mkdir('.wrangler/test',{recursive:true});await build({entryPoints:['worker.js'],outfile:'.wrangler/test/worker.mjs',bundle:true,format:'esm',platform:'browser'});
 const mf=new Miniflare({modules:true,compatibilityDate:'2026-10-21',scriptPath:'.wrangler/test/worker.mjs',d1Databases:{DB:'test-account-db'}});
 try{const db=await mf.getD1Database('DB');await db.exec(await readFile('migrations/0001_accounts.sql','utf8'));
 let ip=0;const call=async(path,method='GET',body,cookie='',origin='https://test.cubing')=>mf.dispatchFetch('https://test.cubing'+path,{method,headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'test-'+(++ip),Cookie:cookie},body:body?JSON.stringify(body):undefined});
 for(const password of ['Abc1234','x'.repeat(129)]){const invalid=await call('/api/account/register','POST',{name:'too_short_or_long',password});assert.equal(invalid.status,400);assert.equal((await invalid.json()).error,'credentials_format')}
 const password='12345678';let r=await call('/api/account/register','POST',{name:'cuber_a',password,timezone:'Asia/Hong_Kong'});assert.equal(r.status,200);const cookieA=r.headers.get('Set-Cookie').split(';')[0];assert.match(r.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax/);assert.doesNotMatch(JSON.stringify(await r.json()),/password_hash|salt/);
 r=await call('/api/account/register','POST',{name:'cuber_b',password});assert.equal(r.status,200);const cookieB=r.headers.get('Set-Cookie').split(';')[0];
 assert.equal((await call('/api/checkins','POST',{text:'No login'})).status,401);
 assert.equal((await call('/api/account/profile','PUT',{name:'No',bio:''},cookieA,'https://evil.test')).status,403);
 assert.equal((await call('/api/account/login','POST',{name:'cuber_a',password:'incorrect-password'})).status,401);
 assert.equal((await call('/api/account/profile','PUT',{name:'Guest',bio:''})).status,401);
 for(const invalid of [{name:'   ',bio:''},{name:'x'.repeat(41),bio:''},{name:'Name',bio:'x'.repeat(201)},{name:'Name'},{name:12,bio:''}]){
  r=await call('/api/account/profile','PUT',invalid,cookieA);assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_profile');
 }
 r=await call('/api/account/profile','PUT',{name:'  Test Cuber  ',bio:'Practising F2L',id:'cuber_b',username:'hijacked'},cookieA);assert.equal(r.status,200);let updated=(await r.json()).user;assert.equal(updated.name,'Test Cuber');assert.equal(updated.bio,'Practising F2L');assert.equal(updated.username,'cuber_a');
 r=await call('/api/account/me','GET',undefined,cookieA);assert.equal((await r.json()).user.name,'Test Cuber');
 r=await call('/api/account/me','GET',undefined,cookieB);assert.equal((await r.json()).user.name,'cuber_b');
 r=await call('/api/account/login','POST',{name:'cuber_a',password});assert.equal((await r.json()).user.bio,'Practising F2L');
 const data={version:1,settings:{language:'en',dark:false,inspection:false,phaseTiming:true,phaseNames:['Cross','Finish'],secondAverageMode:'daily',statisticsTimeZone:'Asia/Hong_Kong'},sessions:[{id:'s1',name:'3x3',event:'333',solves:[{id:'solve1',ms:12345,penalty:'OK',date:new Date().toISOString(),scramble:'R U',phases:[{name:'Cross',ms:2345},{name:'Finish',ms:10000}]}]}]};
 r=await call('/api/account/data','PUT',{data,revision:0},cookieA);assert.equal((await r.json()).revision,1);
 assert.equal((await call('/api/account/data','PUT',{data,revision:0},cookieA)).status,409);
 r=await call('/api/account/data','GET',undefined,cookieB);assert.equal((await r.json()).data,null);
 r=await call('/api/account/data','GET',undefined,cookieA);const saved=(await r.json()).data;assert.deepEqual(saved,data);
 assert.equal((await call('/api/checkins','POST',{text:'Practised today',share:true,session:'s1',summary:'forged'},cookieA)).status,200);
 assert.equal((await call('/api/checkins','POST',{text:'Again'},cookieA)).status,409);
 const feed=await (await call('/api/checkins')).json();assert.equal(feed.posts.length,1);assert.equal(feed.posts[0].summary.best,'12.345');assert.equal(feed.posts[0].display_name,'Test Cuber');
 r=await call('/api/account/profile','PUT',{name:'魔方 Cuber 🧩',bio:'Clock & 3×3\nNew profile'},cookieA);assert.equal(r.status,200);
 const renamedFeed=await (await call('/api/checkins')).json();assert.equal(renamedFeed.posts[0].display_name,'魔方 Cuber 🧩');assert.equal(renamedFeed.posts[0].bio,'Clock & 3×3\nNew profile');assert.equal(renamedFeed.posts[0].id,feed.posts[0].id);
 r=await call('/api/account/profile','PUT',{name:'x'.repeat(40),bio:'x'.repeat(200)},cookieA);assert.equal(r.status,200);
 r=await call('/api/account/profile','PUT',{name:'Test Cuber',bio:''},cookieA);assert.equal(r.status,200);assert.equal((await r.json()).user.bio,'');
 assert.equal((await call('/api/checkins/'+feed.posts[0].id,'DELETE',{},cookieB)).status,404);
 assert.equal((await call('/api/checkins/'+feed.posts[0].id,'DELETE',{},cookieA)).status,200);
 const stored=await db.prepare('SELECT password_hash,salt FROM users WHERE username=?').bind('cuber_a').first();assert.match(stored.password_hash,/^pbkdf2-sha256\$v1\$600000\$[a-f0-9]{64}\$[a-f0-9]{64}$/);assert.equal(stored.salt.length,64);assert.notEqual(stored.password_hash,password);
 const other=await db.prepare('SELECT password_hash,salt FROM users WHERE username=?').bind('cuber_b').first();assert.notEqual(stored.password_hash,other.password_hash);assert.notEqual(stored.salt,other.salt);
 const tokenRow=await db.prepare('SELECT token_hash FROM auth_sessions WHERE user_id=(SELECT id FROM users WHERE username=?)').bind('cuber_a').first();assert.match(tokenRow.token_hash,/^[a-f0-9]{64}$/);assert.notEqual(tokenRow.token_hash,cookieA.split('=')[1]);
 const legacySalt='ab'.repeat(32),legacyHash=await derivePasswordHash(password,legacySalt);await db.prepare('UPDATE users SET password_hash=?,salt=? WHERE username=?').bind(legacyHash,legacySalt,'cuber_a').run();
 assert.equal((await call('/api/account/login','POST',{name:'cuber_a',password:'incorrect-password'})).status,401);assert.equal((await db.prepare('SELECT password_hash FROM users WHERE username=?').bind('cuber_a').first()).password_hash,legacyHash);
 assert.equal((await call('/api/account/login','POST',{name:'cuber_a',password})).status,200);assert.match((await db.prepare('SELECT password_hash FROM users WHERE username=?').bind('cuber_a').first()).password_hash,/^pbkdf2-sha256\$v1\$/);
 for(const nextPassword of ['Abc1234','x'.repeat(129)]){const invalid=await call('/api/account/password','PUT',{current:password,password:nextPassword},cookieA);assert.equal(invalid.status,400);assert.equal((await invalid.json()).error,'credentials_format')}
 r=await call('/api/account/password','PUT',{current:password,password:'Abc1234567'},cookieA);assert.equal(r.status,200);const newCookie=r.headers.get('Set-Cookie').split(';')[0];
 assert.equal((await call('/api/account/login','POST',{name:'cuber_a',password:'Abc1234567'})).status,200);
 assert.equal((await call('/api/account/login','POST',{name:'cuber_a',password})).status,401);
 assert.equal((await (await call('/api/account/me','GET',undefined,cookieA)).json()).user,null);
 assert.equal((await call('/api/account/logout','POST',{},newCookie)).status,200);
 assert.equal((await (await call('/api/account/me','GET',undefined,newCookie)).json()).user,null);
 }finally{await mf.dispose()}
});

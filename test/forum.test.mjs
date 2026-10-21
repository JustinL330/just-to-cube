import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {forumLanguages} from '../src/forum-i18n.js';
import {sealText,unsealText,seal,unseal,encryptionConfigured} from '../src/forum-crypto.js';
import {decodeImage} from '../src/forum-worker.js';
const master=randomBytes(32).toString('base64');
test('private encryption is authenticated, randomized, zone-bound and requires its own key',async()=>{
 const env={FORUM_ENCRYPTION_KEY:master};assert.equal(encryptionConfigured(env),true);assert.equal(encryptionConfigured({}),false);
 const a=await sealText('private text',env,'zone-a'),b=await sealText('private text',env,'zone-a');assert.notEqual(a,b);assert.ok(!a.includes('private text'));assert.equal(await unsealText(a,env,'zone-a'),'private text');await assert.rejects(unsealText(a,env,'zone-b'));await assert.rejects(unsealText(a,{FORUM_ENCRYPTION_KEY:randomBytes(32).toString('base64')},'zone-a'));const bytes=await seal(new Uint8Array([1,2,3]),env,'a');bytes[15]^=1;await assert.rejects(unseal(bytes,env,'a'));
});
test('every supported language translates the complete forum vocabulary',()=>{for(const [language,dict]of Object.entries(forumLanguages))assert.deepEqual(Object.keys(dict).sort(),Object.keys(forumLanguages.en).sort(),language)});
test('image validation rejects SVG, forged MIME types and oversized files',()=>{assert.throws(()=>decodeImage({type:'image/svg+xml',data:btoa('<svg></svg>')}));assert.throws(()=>decodeImage({type:'image/png',data:btoa('this is not a png image')}));assert.throws(()=>decodeImage({type:'image/jpeg',data:'a'.repeat(700000)}));});
test('real D1 forum lifecycle: private membership, invitations, encryption, rotation, original public posts and deletion',{timeout:60000},async()=>{
 await mkdir('.wrangler/test',{recursive:true});await build({entryPoints:['worker.js'],outfile:'.wrangler/test/forum.mjs',bundle:true,format:'esm',platform:'browser'});
 const mf=new Miniflare({modules:true,compatibilityDate:'2026-10-21',scriptPath:'.wrangler/test/forum.mjs',d1Databases:{DB:'forum-db'},bindings:{FORUM_ENCRYPTION_KEY:master}});
 try{
 const db=await mf.getD1Database('DB');await db.exec(await readFile('migrations/0001_accounts.sql','utf8'));const users=[];
 for(let i=0;i<3;i++){const id=crypto.randomUUID(),token=randomBytes(32).toString('hex');await db.batch([db.prepare('INSERT INTO users(id,username,display_name,password_hash,salt,created_at) VALUES(?,?,?,?,?,?)').bind(id,'forum_'+i,'Cuber '+i,'unused','unused',new Date().toISOString()),db.prepare('INSERT INTO auth_sessions VALUES(?,?,?)').bind(createHash('sha256').update(token).digest('hex'),id,Date.now()+3600000)]);users.push({id,cookie:'__Host-jus-session='+token})}
 const [a,b,c]=users;let ip=0;const call=(path,method='GET',body,user,origin='https://cubing.test')=>mf.dispatchFetch('https://cubing.test/api/forum/'+path,{method,headers:{'Content-Type':'application/json',Origin:origin,Cookie:user?.cookie||'','CF-Connecting-IP':'forum-'+(++ip)},body:body===undefined?undefined:JSON.stringify(body)});
 let r=await call('zones');assert.equal(r.status,200);assert.deepEqual((await r.json()).zones.map(z=>z.id),['public']);
 assert.equal((await call('zones','POST',{name:'Test',password:'long-zone-password'})).status,401);assert.equal((await call('zones','POST',{},a,'https://evil.test')).status,403);
 r=await call('zones','POST',{name:'Cubing circle',password:'original-zone-password'},a);assert.equal(r.status,201);const zone=(await r.json()).zone,id=zone.id;assert.equal(zone.owner_id,a.id);assert.equal(zone.member_count,1);
 let stored=await db.prepare('SELECT password_hash FROM forum_zones WHERE id=?').bind(id).first();assert.match(stored.password_hash,/^pbkdf2-sha256\$v1\$600000\$/);assert.ok(!stored.password_hash.includes('original-zone-password'));
 assert.deepEqual((await (await call('zones','GET',undefined,b)).json()).zones.map(z=>z.id),['public']);
 for(const u of [undefined,b])assert.equal((await call('zones/'+id+'/posts','GET',undefined,u)).status,404);
 assert.equal((await call('zones/'+id+'/posts','POST',{text:'forged',images:[]},b)).status,404);
 assert.equal((await call('zones/'+id+'/join','POST',{password:'wrong-password'},b)).status,403);
 // A small actual PNG, also usable as an image-only post.
 const image={type:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8x8AAAAASUVORK5CYII='};
 r=await call('zones/'+id+'/posts','POST',{text:'secret private practice',images:[image]},a);assert.equal(r.status,201);const postId=(await r.json()).id;
 stored=await db.prepare('SELECT body FROM forum_posts WHERE id=?').bind(postId).first();assert.match(stored.body,/^v1:/);assert.ok(!stored.body.includes('secret private practice'));
 r=await call('zones/'+id+'/posts','GET',undefined,a);const feed=await r.json();assert.equal(feed.posts[0].body,'secret private practice');const imagePath=feed.posts[0].images[0].url.slice('/api/forum/'.length);
 assert.equal((await call(imagePath)).status,404);assert.equal((await call(imagePath,'GET',undefined,b)).status,404);
 r=await call(imagePath,'GET',undefined,a);assert.equal(r.headers.get('Cache-Control'),'no-store, private');assert.equal(r.headers.get('Content-Type'),'image/png');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),Uint8Array.from(atob(image.data),c=>c.charCodeAt(0)));
 const storedImage=await db.prepare('SELECT data FROM forum_images WHERE post_id=?').bind(postId).first();assert.notDeepEqual(storedImage.data,Array.from(Uint8Array.from(atob(image.data),c=>c.charCodeAt(0))));
 assert.equal((await call('zones/'+id+'/members','POST',{username:'forum_1'},a)).status,200);
 assert.equal((await call('zones/'+id+'/posts','GET',undefined,b)).status,200); // no acceptance needed
 assert.equal((await call('zones/'+id+'/password','PUT',{password:'not-owner-password'},b)).status,403);
 assert.equal((await call('zones/'+id+'/members','GET',undefined,b)).status,403);
 assert.equal((await call('zones/'+id+'/members','POST',{username:'forum_2'},b)).status,403);
 assert.equal((await call('zones/'+id,'DELETE',{confirm:id},b)).status,403);
 assert.equal((await call('zones/'+id+'/password','PUT',{password:'replacement-zone-password'},a)).status,200);
 assert.equal((await call('zones/'+id+'/posts','GET',undefined,b)).status,200);assert.equal((await call(imagePath,'GET',undefined,b)).status,200);
 assert.equal((await call('zones/'+id+'/leave','POST',{},a)).status,400);
 assert.equal((await call('zones/'+id+'/leave','POST',{},b)).status,200);
 assert.equal((await call(imagePath,'GET',undefined,b)).status,404);
 assert.equal((await call('zones/'+id+'/join','POST',{password:'original-zone-password'},b)).status,403);
 assert.equal((await call('zones/'+id+'/join','POST',{password:'replacement-zone-password'},b)).status,200);
 assert.equal((await call('posts/'+postId,'DELETE',{},b)).status,404);
 r=await call('zones/'+id+'/posts','POST',{text:'member post',images:[]},b);assert.equal(r.status,201);const memberPost=(await r.json()).id;
 assert.equal((await call('posts/'+memberPost,'DELETE',{},a)).status,200);
 assert.equal((await call('zones/'+id+'/members/'+b.id,'DELETE',{},a)).status,200);
 assert.equal((await call('zones/'+id+'/posts','GET',undefined,b)).status,404);assert.equal((await call(imagePath,'GET',undefined,b)).status,404);
 assert.equal((await call('zones/'+id+'/posts','POST',{text:'removed member',images:[]},b)).status,404);
 assert.equal((await call('zones/'+id+'/members/'+a.id,'DELETE',{},a)).status,400);
 // Password joining grants access immediately, too.
 assert.equal((await call('zones/'+id+'/join','POST',{password:'replacement-zone-password'},c)).status,200);
 assert.equal((await call('zones/'+id+'/posts','GET',undefined,c)).status,200);
 const legacyId=crypto.randomUUID();await db.prepare('INSERT INTO checkins VALUES(?,?,?,?,?,?)').bind(legacyId,a.id,'2026-10-21','original public check-in',null,new Date().toISOString()).run();
 r=await call('zones/public/posts','POST',{text:'public with image',images:[image]},b);assert.equal(r.status,201);const publicId=(await r.json()).id;
 r=await call('zones/public/posts');const publicFeed=await r.json();assert.equal(publicFeed.posts.length,2);assert.ok(publicFeed.posts.some(p=>p.body==='original public check-in'));assert.ok(publicFeed.posts.some(p=>p.body==='public with image'));
 const publicImage=publicFeed.posts.find(p=>p.id===publicId).images[0].url.slice('/api/forum/'.length);assert.equal((await call(publicImage)).status,200);
 assert.equal((await call('zones/public/posts','POST',{text:'',images:[image]},a)).status,201);
 assert.equal((await call('zones/public/posts','POST',{text:'',images:[]},a)).status,400);
 assert.equal((await call('posts/'+publicId,'DELETE',{},a)).status,404);assert.equal((await call('posts/'+publicId,'DELETE',{},b)).status,200);assert.equal((await call(publicImage)).status,404);
 assert.equal((await call('zones/'+id,'DELETE',{confirm:'wrong'},a)).status,400);
 assert.equal((await call('zones/'+id,'DELETE',{confirm:id},a)).status,200);
 for(const table of ['forum_zones','forum_members','forum_posts','forum_images']){const column=table==='forum_zones'?'id':table==='forum_images'?'post_id':'zone_id';const result=await db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${column}=?`).bind(table==='forum_images'?postId:id).first();assert.equal(result.n,0,table)}
 assert.equal((await call('zones/'+id+'/posts','GET',undefined,a)).status,404);assert.equal((await call(imagePath,'GET',undefined,a)).status,404);
 assert.equal((await call('zones/'+id+'/join','POST',{password:'replacement-zone-password'},c)).status,403);
 assert.equal((await call('posts/'+legacyId,'DELETE',{},a)).status,200);assert.equal((await db.prepare('SELECT COUNT(*) n FROM checkins WHERE id=?').bind(legacyId).first()).n,0);
 }finally{await mf.dispose()}
});

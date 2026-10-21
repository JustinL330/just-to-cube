import {sessionUser,bodyJSON,limit} from './account-worker.js';
import {createPasswordRecord,verifyPassword,DUMMY_PASSWORD_RECORD} from './passwords.js';
import {encryptionConfigured,seal,unseal,sealText,unsealText} from './forum-crypto.js';
import {forumSchema} from './forum-schema.js';
const initialized=new WeakMap();
const headers={'Cache-Control':'no-store, private','Vary':'Cookie','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
const json=(data,status=200)=>Response.json(data,{status,headers});
const fail=(code,status=400)=>{throw Object.assign(Error(code),{status})};
const validId=s=>/^[a-f0-9-]{36}$/.test(s||'');
const canRead="(p.zone_id IS NULL OR EXISTS(SELECT 1 FROM forum_members m WHERE m.zone_id=p.zone_id AND m.user_id=?))";
async function schema(db){let pending=initialized.get(db);if(!pending){pending=db.batch(forumSchema.map(sql=>db.prepare(sql))).catch(e=>{initialized.delete(db);throw e});initialized.set(db,pending)}await pending;}
const passwordOK=p=>typeof p==='string'&&p.length>=12&&p.length<=128;
function publicZone(){return {id:'public',name:'Public zone',owner_id:null,member_count:null};}
async function accessible(db,id,uid){if(id==='public')return publicZone();return db.prepare('SELECT z.id,z.name,z.owner_id,z.created_at,(SELECT COUNT(*) FROM forum_members WHERE zone_id=z.id) member_count FROM forum_zones z JOIN forum_members m ON m.zone_id=z.id WHERE z.id=? AND m.user_id=?').bind(id,uid).first();}
async function owner(db,id,uid){const z=await accessible(db,id,uid);if(!z||z.owner_id!==uid)fail('zone_owner_only',403);return z;}
export function decodeImage(image){
 if(!image||!['image/jpeg','image/png','image/webp'].includes(image.type)||typeof image.data!=='string'||image.data.length>699052||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.data))fail('invalid_image');
 let bytes;try{bytes=Uint8Array.from(atob(image.data),c=>c.charCodeAt(0))}catch{fail('invalid_image')}
 if(bytes.length<12||bytes.length>524288)fail('invalid_image');
 const match=image.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:image.type==='image/png'?[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n):String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!match)fail('invalid_image');return bytes;
}
export async function handleForum(request,env){
 const url=new URL(request.url),db=env.DB,dev=env.LOCAL_DEV==='1'&&url.protocol==='http:';
 if(!db)return json({error:'forum_unavailable'},503);
 try{
  if(!['GET','POST','PUT','DELETE'].includes(request.method))fail('method_not_allowed',405);
  if(request.method!=='GET'&&(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))fail('forbidden',403);
  await schema(db);
  const user=await sessionUser(request,db,dev),uid=user?.id||'';
  const path=url.pathname.slice('/api/forum/'.length).split('/'),method=request.method;
  if(path[0]==='zones'&&path.length===1&&method==='GET'){
   const zones=uid?(await db.prepare('SELECT z.id,z.name,z.owner_id,z.created_at,(SELECT COUNT(*) FROM forum_members WHERE zone_id=z.id) member_count FROM forum_zones z JOIN forum_members m ON m.zone_id=z.id WHERE m.user_id=? ORDER BY z.created_at DESC').bind(uid).all()).results:[];
   return json({zones:[publicZone(),...zones],encryption:encryptionConfigured(env)});
  }
  if(path[0]==='images'&&path.length===2&&method==='GET'){
   const row=await db.prepare(`SELECT i.data,i.mime,p.zone_id FROM forum_images i JOIN forum_posts p ON p.id=i.post_id WHERE i.id=? AND ${canRead}`).bind(path[1],uid).first();
   if(!row)fail('not_found',404);
   const bytes=row.zone_id?await unseal(row.data,env,row.zone_id):new Uint8Array(row.data);
   return new Response(bytes,{headers:{...headers,'Content-Type':row.mime,'Content-Length':String(bytes.length),'Content-Security-Policy':"default-src 'none'; sandbox"}});
  }
  if(path[0]==='zones'&&path[1]&&path[2]==='posts'&&path.length===3&&method==='GET'){
   const zone=await accessible(db,path[1],uid);if(!zone)fail('not_found',404);
   const cursor=url.searchParams.get('before')||'\uffff';if(cursor.length>100)fail('invalid_request');
   // Original check-ins remain the public feed, with no data migration or daily restriction on new forum posts.
   const source=path[1]==='public'?"(SELECT id,user_id,body,created_at,NULL zone_id,summary FROM checkins UNION ALL SELECT id,user_id,body,created_at,zone_id,NULL summary FROM forum_posts WHERE zone_id IS NULL)":"(SELECT id,user_id,body,created_at,zone_id,NULL summary FROM forum_posts)";
   const rows=(await db.prepare(`SELECT p.id,p.user_id,p.body,p.created_at,p.zone_id,p.summary,u.username,u.display_name FROM ${source} p JOIN users u ON u.id=p.user_id WHERE ${path[1]==='public'?'p.zone_id IS NULL':'p.zone_id=?'} AND ${canRead} AND (p.created_at || '|' || p.id)<? ORDER BY p.created_at DESC,p.id DESC LIMIT 31`).bind(...(path[1]==='public'?[]:[path[1]]),uid,cursor).all()).results;
   const more=rows.length>30;rows.splice(30);const ids=rows.map(p=>p.id);
   const images=ids.length?(await db.prepare(`SELECT i.id,i.post_id FROM forum_images i JOIN forum_posts p ON p.id=i.post_id WHERE i.post_id IN (${ids.map(()=>'?').join(',')}) AND ${canRead} ORDER BY i.position`).bind(...ids,uid).all()).results:[];
   const posts=await Promise.all(rows.map(async p=>({...p,body:p.zone_id?await unsealText(p.body,env,p.zone_id):p.body,summary:p.summary?JSON.parse(p.summary):null,images:images.filter(i=>i.post_id===p.id).map(i=>({id:i.id,url:'/api/forum/images/'+i.id}))})));
   return json({zone,posts,next:more?rows.at(-1).created_at+'|'+rows.at(-1).id:null});
  }
  if(!user)fail('login_required',401);
  if(path[0]==='zones'&&path.length===1&&method==='POST'){
   if(!encryptionConfigured(env))fail('encryption_unavailable',503);
   const b=await bodyJSON(request,4096);if(typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>60||!passwordOK(b.password))fail('invalid_zone');
   if(!await limit(db,'forum-create:'+uid,10,3600000))fail('forum_rate',429);
   const id=crypto.randomUUID(),now=new Date().toISOString(),record=await createPasswordRecord(b.password);
   await db.batch([db.prepare('INSERT INTO forum_zones(id,name,owner_id,password_hash,created_at) VALUES(?,?,?,?,?)').bind(id,b.name.trim(),uid,record.hash,now),db.prepare('INSERT INTO forum_members(zone_id,user_id,joined_at) VALUES(?,?,?)').bind(id,uid,now)]);
   return json({zone:await accessible(db,id,uid)},201);
  }
  if(path[0]==='zones'&&path[1]&&path[1]!=='public'&&validId(path[1])){
   const id=path[1];
   if(path[2]==='join'&&path.length===3&&method==='POST'){
    const b=await bodyJSON(request,4096);if(typeof b.password!=='string'||b.password.length>128)fail('invalid_zone');
    if(!await limit(db,'forum-join:'+uid,10,900000))fail('forum_rate',429);
    const z=await db.prepare('SELECT password_hash FROM forum_zones WHERE id=?').bind(id).first();
    const correct=await verifyPassword(b.password,z?.password_hash||DUMMY_PASSWORD_RECORD);if(!z||!correct)fail('wrong_zone_password',403);
    // Compare the verified record again inside the write: rotation/deletion cannot race a join.
    const result=await db.prepare('INSERT INTO forum_members(zone_id,user_id,joined_at) SELECT id,?,? FROM forum_zones WHERE id=? AND password_hash=? ON CONFLICT(zone_id,user_id) DO NOTHING').bind(uid,new Date().toISOString(),id,z.password_hash).run();
    const zone=await accessible(db,id,uid);if(!zone)fail('wrong_zone_password',403);return json({zone});
   }
   if(path[2]==='leave'&&path.length===3&&method==='POST'){
    const z=await accessible(db,id,uid);if(!z)fail('not_found',404);if(z.owner_id===uid)fail('owner_cannot_leave');
    await db.prepare('DELETE FROM forum_members WHERE zone_id=? AND user_id=? AND EXISTS(SELECT 1 FROM forum_zones WHERE id=? AND owner_id<>?)').bind(id,uid,id,uid).run();return json({ok:true});
   }
   if(path[2]==='password'&&path.length===3&&method==='PUT'){
    await owner(db,id,uid);const b=await bodyJSON(request,4096);if(!passwordOK(b.password))fail('invalid_zone');
    if(!await limit(db,'forum-password:'+uid,10,900000))fail('forum_rate',429);
    const record=await createPasswordRecord(b.password);const changed=await db.prepare('UPDATE forum_zones SET password_hash=? WHERE id=? AND owner_id=?').bind(record.hash,id,uid).run();if(!changed.meta.changes)fail('not_found',404);return json({ok:true});
   }
   if(path[2]==='members'&&path.length===3&&method==='GET'){
    await owner(db,id,uid);const rows=await db.prepare('SELECT u.id,u.username,u.display_name,m.joined_at FROM forum_members m JOIN users u ON u.id=m.user_id JOIN forum_zones z ON z.id=m.zone_id WHERE m.zone_id=? AND z.owner_id=? ORDER BY m.joined_at').bind(id,uid).all();return json({members:rows.results});
   }
   if(path[2]==='members'&&path.length===3&&method==='POST'){
    await owner(db,id,uid);const b=await bodyJSON(request,4096);if(typeof b.username!=='string'||b.username.length>60)fail('invalid_request');
    if(!await limit(db,'forum-invite:'+uid,60,3600000))fail('forum_rate',429);
    const target=await db.prepare('SELECT id FROM users WHERE username=?').bind(b.username.trim().normalize('NFKC').toLowerCase().replace(/^@/,'')).first();if(!target)fail('user_not_found',404);
    await db.prepare('INSERT INTO forum_members(zone_id,user_id,joined_at) SELECT id,?,? FROM forum_zones WHERE id=? AND owner_id=? ON CONFLICT(zone_id,user_id) DO NOTHING').bind(target.id,new Date().toISOString(),id,uid).run();return json({ok:true});
   }
   if(path[2]==='members'&&path[3]&&path.length===4&&method==='DELETE'){
    await owner(db,id,uid);if(path[3]===uid)fail('owner_cannot_leave');await db.prepare('DELETE FROM forum_members WHERE zone_id=? AND user_id=? AND EXISTS(SELECT 1 FROM forum_zones WHERE id=? AND owner_id=?)').bind(id,path[3],id,uid).run();return json({ok:true});
   }
   if(path.length===2&&method==='DELETE'){
    await owner(db,id,uid);const b=await bodyJSON(request,4096);if(b.confirm!==id)fail('invalid_request');
    const removed=await db.prepare('DELETE FROM forum_zones WHERE id=? AND owner_id=?').bind(id,uid).run();if(!removed.meta.changes)fail('not_found',404);return json({ok:true});
   }
  }
  if(path[0]==='zones'&&path[1]&&path[2]==='posts'&&path.length===3&&method==='POST'){
   const id=path[1],zone=await accessible(db,id,uid);if(!zone)fail('not_found',404);
   const b=await bodyJSON(request,2200000);if(typeof b.text!=='string'||b.text.length>5000||!Array.isArray(b.images)||b.images.length>3||(!b.text.trim()&&!b.images.length))fail('invalid_post');
   if(!await limit(db,'forum-post:'+uid,30,3600000))fail('forum_rate',429);
   const bytes=b.images.map(decodeImage),privateZone=id!=='public',postId=crypto.randomUUID(),body=privateZone?await sealText(b.text.trim(),env,id):b.text.trim();
   const write=db.prepare('INSERT INTO forum_posts(id,zone_id,user_id,body,created_at) SELECT ?,?,?,?,? WHERE ? IS NULL OR EXISTS(SELECT 1 FROM forum_members WHERE zone_id=? AND user_id=?)').bind(postId,privateZone?id:null,uid,body,new Date().toISOString(),privateZone?id:null,id,uid);
   const attachments=await Promise.all(bytes.map(async(data,index)=>db.prepare('INSERT INTO forum_images(id,post_id,mime,data,position) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM forum_posts WHERE id=?)').bind(crypto.randomUUID(),postId,b.images[index].type,(privateZone?await seal(data,env,id):data).buffer,index,postId)));
   const results=await db.batch([write,...attachments]);if(!results[0].meta.changes)fail('not_found',404);return json({id:postId},201);
  }
  if(path[0]==='posts'&&path[1]&&path.length===2&&method==='DELETE'){
   const removed=await db.prepare(`DELETE FROM forum_posts AS p WHERE p.id=? AND ${canRead} AND (p.user_id=? OR EXISTS(SELECT 1 FROM forum_zones z WHERE z.id=p.zone_id AND z.owner_id=?))`).bind(path[1],uid,uid,uid).run();
   if(!removed.meta.changes){const legacy=await db.prepare('DELETE FROM checkins WHERE id=? AND user_id=?').bind(path[1],uid).run();if(!legacy.meta.changes)fail('not_found',404)}return json({ok:true});
  }
  fail('not_found',404);
 }catch(e){const code=e.status||(['invalid_request','too_large'].includes(e.message)?e.message==='too_large'?413:400:503);return json({error:e.status||['invalid_request','too_large','encryption_unavailable'].includes(e.message)?e.message:'forum_unavailable'},code);}
}

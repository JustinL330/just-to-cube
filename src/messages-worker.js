import {sessionUser} from './account-worker.js';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'};
const json=(data,status=200)=>Response.json(data,{status,headers});
// Idempotent initialization also supports existing Pages databases on a Git deployment.
const schemas=[
 'CREATE TABLE IF NOT EXISTS dm_keys (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, public_key TEXT NOT NULL, vault TEXT NOT NULL, created_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS dm_messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, sender TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, recipient TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, envelope TEXT NOT NULL, created_at TEXT NOT NULL, CHECK(sender <> recipient))',
 'CREATE INDEX IF NOT EXISTS dm_sender_seq ON dm_messages(sender,seq)',
 'CREATE INDEX IF NOT EXISTS dm_recipient_seq ON dm_messages(recipient,seq)'];
const initialized=new WeakMap();
async function schema(db){if(!initialized.has(db))initialized.set(db,db.batch(schemas.map(s=>db.prepare(s))).catch(e=>{initialized.delete(db);throw e}));await initialized.get(db)}
const base64=(s,min,max)=>typeof s==='string'&&s.length>=min&&s.length<=max&&s.length%4===0&&/^[A-Za-z0-9+/]*={0,2}$/.test(s);
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
async function publicKey(k){if(!k||k.kty!=='EC'||k.crv!=='P-256'||k.d!==undefined||typeof k.x!=='string'||typeof k.y!=='string'||k.x.length!==43||k.y.length!==43)return null;try{await crypto.subtle.importKey('jwk',k,{name:'ECDH',namedCurve:'P-256'},false,[]);return {kty:'EC',crv:'P-256',x:k.x,y:k.y,ext:true,key_ops:[]}}catch{return null}}
async function body(request){if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('invalid_request');const reader=request.body?.getReader();if(!reader)throw Error('invalid_request');let length=0,parts=[];try{for(;;){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>24000){await reader.cancel();throw Error('invalid_request')}parts.push(r.value)}}finally{reader.releaseLock()}const bytes=new Uint8Array(length);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw Error('invalid_request')}}
export async function handleMessages(request,env){
 const url=new URL(request.url),db=env.DB;
 if(!db)return json({error:'messagesUnavailable'},503);
 try{
  if(!['GET','POST'].includes(request.method))return json({error:'method_not_allowed'},405);
  if(request.method!=='GET'&&(request.headers.get('Origin')!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json({error:'forbidden'},403);
  const user=await sessionUser(request,db,env.LOCAL_DEV==='1'&&url.protocol==='http:');if(!user)return json({error:'loginRequired'},401);
  await schema(db);
  const path=url.pathname;
  if(path==='/api/messages/keys'){
   if(request.method==='GET'){const row=await db.prepare('SELECT vault FROM dm_keys WHERE user_id=?').bind(user.id).first();return json({vault:row?JSON.parse(row.vault):null})}
   const b=await body(request),key=await publicKey(b.publicKey);
   if(b.version!==1||!key||!base64(b.salt,24,24)||!base64(b.iv,16,16)||!base64(b.ciphertext,100,4000))return json({error:'invalid_request'},400);
   const vault={version:1,publicKey:key,salt:b.salt,iv:b.iv,ciphertext:b.ciphertext};
   const r=await db.prepare('INSERT INTO dm_keys(user_id,public_key,vault,created_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(user.id,JSON.stringify(key),JSON.stringify(vault),new Date().toISOString()).run();
   return r.meta.changes?json({ok:true}):json({error:'keysExist'},409);
  }
  if(path==='/api/messages/user'&&request.method==='GET'){
   const name=(url.searchParams.get('username')||'').trim().normalize('NFKC').toLowerCase();if(!/^[\p{L}\p{N}_-]{3,30}$/u.test(name))return json({error:'userNotFound'},404);
   const peer=await db.prepare('SELECT u.id,u.username,u.display_name,k.public_key FROM users u LEFT JOIN dm_keys k ON k.user_id=u.id WHERE u.username=? AND u.id<>?').bind(name,user.id).first();
   if(!peer)return json({error:'userNotFound'},404);if(!peer.public_key)return json({error:'recipientNotReady'},409);
   return json({peer:{id:peer.id,username:peer.username,name:peer.display_name,publicKey:JSON.parse(peer.public_key)}});
  }
  if(path==='/api/messages'&&request.method==='GET'){
   const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)return json({error:'invalid_request'},400);
   const rows=await db.prepare('SELECT * FROM dm_messages WHERE (sender=? OR recipient=?) AND seq>? ORDER BY seq ASC LIMIT 100').bind(user.id,user.id,after).all();
   const ids=[...new Set(rows.results.flatMap(m=>[m.sender,m.recipient]).filter(id=>id!==user.id))];
   const peers=[];for(const id of ids){const p=await db.prepare('SELECT u.id,u.username,u.display_name,k.public_key FROM users u JOIN dm_keys k ON k.user_id=u.id WHERE u.id=?').bind(id).first();if(p)peers.push({id:p.id,username:p.username,name:p.display_name,publicKey:JSON.parse(p.public_key)})}
   return json({messages:rows.results.map(m=>({...JSON.parse(m.envelope),seq:m.seq,createdAt:m.created_at})),peers,more:rows.results.length===100});
  }
  if(path==='/api/messages'&&request.method==='POST'){
   const b=await body(request);
   if(b.version!==1||!uuid(b.id)||b.sender!==user.id||!uuid(b.recipient)||b.recipient===user.id||!base64(b.iv,16,16)||!base64(b.ciphertext,24,22000))return json({error:'invalid_request'},400);
   const keys=await db.prepare('SELECT user_id FROM dm_keys WHERE user_id IN (?,?)').bind(user.id,b.recipient).all();if(keys.results.length!==2)return json({error:'recipientNotReady'},409);
   const envelope={version:1,id:b.id,sender:user.id,recipient:b.recipient,iv:b.iv,ciphertext:b.ciphertext};
   const existing=await db.prepare('SELECT * FROM dm_messages WHERE id=?').bind(b.id).first();
   if(existing)return existing.sender===user.id&&existing.envelope===JSON.stringify(envelope)?json({seq:existing.seq,createdAt:existing.created_at}):json({error:'messageConflict'},409);
   const now=Date.now();const rate=await db.prepare('INSERT INTO auth_limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END,until=CASE WHEN until<=? THEN excluded.until ELSE until END RETURNING count').bind('dm:'+user.id,now+60000,now,now).first();if(rate.count>60)return json({error:'rateLimited'},429);
   const createdAt=new Date().toISOString();await db.prepare('INSERT INTO dm_messages(id,sender,recipient,envelope,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(b.id,user.id,b.recipient,JSON.stringify(envelope),createdAt).run();
   const row=await db.prepare('SELECT * FROM dm_messages WHERE id=?').bind(b.id).first();if(row.sender!==user.id||row.envelope!==JSON.stringify(envelope))return json({error:'messageConflict'},409);
   return json({seq:row.seq,createdAt:row.created_at});
  }
  return json({error:'not_found'},404);
 }catch(e){return json({error:e.message==='invalid_request'?'invalid_request':'messagesUnavailable'},e.message==='invalid_request'?400:503)}
}

import {validBackup,EVENTS,average,format,value} from './core.js';
import {createPasswordRecord,verifyPassword,needsPasswordUpgrade,DUMMY_PASSWORD_RECORD} from './passwords.js';
const COOKIE='__Host-jus-session',AGE=60*60*24*30;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'};
const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{...headers,...extra}});
const enc=new TextEncoder();
const hex=a=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const digest=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const cookie=(token,age=AGE,dev=false)=>`${dev?'jus-dev-session':COOKIE}=${token}; Path=/; HttpOnly; ${dev?'':'Secure; '}SameSite=Lax; Max-Age=${age}`;
const tokenFrom=(request,dev=false)=>{const name=dev?'jus-dev-session':COOKIE;return(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||''};
export async function sessionUser(request,db,dev=false){const token=tokenFrom(request,dev);if(!/^[a-f0-9]{64}$/.test(token))return null;return db.prepare('SELECT u.id,u.username,u.display_name,u.bio,u.timezone,u.created_at FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first()}
function profile(u){return u?{id:u.id,username:u.username,name:u.display_name,bio:u.bio,timezone:u.timezone,createdAt:u.created_at}:null}
export function dayInZone(zone,now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-')}
function timezone(s){try{new Intl.DateTimeFormat('en',{timeZone:s}).format();return typeof s==='string'&&s.length<80?s:'Asia/Hong_Kong'}catch{return 'Asia/Hong_Kong'}}
async function bodyJSON(request,max){if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Error('invalid_request');const reader=request.body?.getReader();if(!reader)throw Error('invalid_request');const parts=[];let n=0;try{for(;;){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>max){await reader.cancel();throw Error('too_large')}parts.push(r.value)}}finally{reader.releaseLock()}const bytes=new Uint8Array(n);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw Error('invalid_request')}}
async function limit(db,key,max,windowMs){const now=Date.now(),until=now+windowMs;const row=await db.prepare('INSERT INTO auth_limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END,until=CASE WHEN until<=? THEN excluded.until ELSE until END RETURNING count').bind(key,until,now,now).first();return row.count<=max}
async function startSession(db,user,dev=false){const token=random();await db.batch([db.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(Date.now()),db.prepare('DELETE FROM auth_limits WHERE until<?').bind(Date.now()),db.prepare('INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(token),user.id,Date.now()+AGE*1000)]);return cookie(token,AGE,dev)}
function validData(data){return validBackup(data)&&data.sessions.every(s=>s.solves.every(v=>typeof v.id==='string'&&v.id.length<100&&!Number.isNaN(Date.parse(v.date))))&&data.sessions.reduce((n,s)=>n+s.solves.length,0)<=50000}
export async function handleAccount(request,env){
 const path=new URL(request.url).pathname,db=env.DB,dev=env.LOCAL_DEV==='1'&&new URL(request.url).protocol==='http:';
 if(!db)return path==='/api/account/me'?json({configured:false,user:null}):json({error:'account_unavailable'},503);
 try{
  if(!['GET','POST','PUT','DELETE'].includes(request.method))return json({error:'method_not_allowed'},405);
  if(request.method!=='GET'){
   if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'forbidden'},403);
  }
  if(path==='/api/account/me'&&request.method==='GET'){const u=await sessionUser(request,db,dev);return json({configured:true,user:profile(u)})}
  if(['/api/account/register','/api/account/login'].includes(path)&&request.method==='POST'){
   const b=await bodyJSON(request,4096),username=typeof b.name==='string'?b.name.trim().normalize('NFKC').toLowerCase():'';
   if(!/^[\p{L}\p{N}_-]{3,30}$/u.test(username)||typeof b.password!=='string'||b.password.length<12||b.password.length>128)return json({error:'credentials_format'},400);
   const ip=await digest(request.headers.get('CF-Connecting-IP')||'unknown');
   if(!await limit(db,'ip:'+ip,15,900000)||!await limit(db,'user:'+username,10,900000))return json({error:'account_rate'},429,{'Retry-After':'900'});
   let u=await db.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
   if(path.endsWith('/register')){
    if(u)return json({error:'name_taken'},409);
    const {salt,hash}=await createPasswordRecord(b.password),id=crypto.randomUUID(),created=new Date().toISOString();
    try{await db.batch([db.prepare('INSERT INTO users(id,username,display_name,bio,timezone,password_hash,salt,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,username,b.name.trim(),'',timezone(b.timezone),hash,salt,created),db.prepare('INSERT INTO account_data(user_id,payload,revision,updated_at) VALUES(?,\'null\',0,?)').bind(id,created)])}catch(e){if(String(e).includes('UNIQUE'))return json({error:'name_taken'},409);throw e}
    u={id,username,display_name:b.name.trim(),bio:'',timezone:timezone(b.timezone),created_at:created};
   }else{
    const correct=await verifyPassword(b.password,u?.password_hash||DUMMY_PASSWORD_RECORD,u?.salt);if(!u||!correct)return json({error:'wrong_credentials'},401);
    if(needsPasswordUpgrade(u.password_hash,u.salt)){
     const upgraded=await createPasswordRecord(b.password);
     const changed=await db.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=? AND password_hash=?').bind(upgraded.hash,upgraded.salt,u.id,u.password_hash).run();
     if(!changed.meta.changes)return json({error:'wrong_credentials'},401);
    }
   }
   return json({user:profile(u)},200,{'Set-Cookie':await startSession(db,u,dev)});
  }
  if(path==='/api/checkins'&&request.method==='GET'){
   const rows=await db.prepare('SELECT c.id,c.user_id,c.day,c.body,c.summary,c.created_at,u.display_name,u.username,u.bio FROM checkins c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 50').all();
   return json({posts:rows.results.map(p=>({...p,summary:p.summary?JSON.parse(p.summary):null}))});
  }
  const user=await sessionUser(request,db,dev);if(!user)return json({error:'login_required'},401);
  if(path==='/api/account/logout'&&request.method==='POST'){await db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(tokenFrom(request,dev))).run();return json({ok:true},200,{'Set-Cookie':cookie('',0,dev)})}
  if(path==='/api/account/profile'&&request.method==='PUT'){
   const b=await bodyJSON(request,4096);if(!b||typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>40||typeof b.bio!=='string'||b.bio.length>200)return json({error:'invalid_profile'},400);
   await db.prepare('UPDATE users SET display_name=?,bio=? WHERE id=?').bind(b.name.trim(),b.bio,user.id).run();return json({user:profile({...user,display_name:b.name.trim(),bio:b.bio})});
  }
  if(path==='/api/account/password'&&request.method==='PUT'){
   const b=await bodyJSON(request,4096);if(typeof b.current!=='string'||typeof b.password!=='string'||b.password.length<12||b.password.length>128)return json({error:'credentials_format'},400);
   if(!await limit(db,'password:'+user.id,8,900000))return json({error:'account_rate'},429);
   const stored=await db.prepare('SELECT password_hash,salt FROM users WHERE id=?').bind(user.id).first();if(!stored||!await verifyPassword(b.current,stored.password_hash,stored.salt))return json({error:'wrong_credentials'},401);
   const {salt,hash}=await createPasswordRecord(b.password);await db.batch([db.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').bind(hash,salt,user.id),db.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(user.id)]);
   return json({ok:true},200,{'Set-Cookie':await startSession(db,user,dev)});
  }
  if(path==='/api/account/data'){
   if(request.method==='GET'){const row=await db.prepare('SELECT payload,revision,updated_at FROM account_data WHERE user_id=?').bind(user.id).first();return json({data:row?JSON.parse(row.payload):null,revision:row?.revision||0,updatedAt:row?.updated_at})}
   if(request.method==='PUT'){
    const b=await bodyJSON(request,1500000);if(!validData(b.data)||!Number.isSafeInteger(b.revision)||b.revision<0)return json({error:'invalid_backup'},400);
    const row=await db.prepare('UPDATE account_data SET payload=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=? RETURNING revision').bind(JSON.stringify(b.data),new Date().toISOString(),user.id,b.revision).first();
    return row?json({revision:row.revision}):json({error:'sync_conflict'},409);
   }
  }
  if(path==='/api/checkins'&&request.method==='POST'){
   const b=await bodyJSON(request,4096);if(typeof b.text!=='string'||!b.text.trim()||b.text.length>500)return json({error:'invalid_post'},400);
   const day=dayInZone(user.timezone);let summary=null;
   // Compute shared results server-side from this account's saved data.
   if(b.share===true){const row=await db.prepare('SELECT payload FROM account_data WHERE user_id=?').bind(user.id).first(),data=row&&JSON.parse(row.payload);const s=data?.sessions?.find(s=>s.id===b.session);if(s){const a=s.solves.filter(v=>dayInZone(user.timezone,new Date(v.date))===day);summary={event:EVENTS[s.event],solves:a.length,best:a.length?format(Math.min(...a.map(value))):'—',ao5:format(average(a,5)),ao12:format(average(a,12))}}}
   try{await db.prepare('INSERT INTO checkins(id,user_id,day,body,summary,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,day,b.text.trim(),summary?JSON.stringify(summary):null,new Date().toISOString()).run()}catch(e){if(String(e).includes('UNIQUE'))return json({error:'already_checked'},409);throw e}
   return json({ok:true,day});
  }
  if(path.startsWith('/api/checkins/')&&request.method==='DELETE'){
   const id=decodeURIComponent(path.slice('/api/checkins/'.length));const result=await db.prepare('DELETE FROM checkins WHERE id=? AND user_id=?').bind(id,user.id).run();return result.meta.changes?json({ok:true}):json({error:'not_found'},404);
  }
  return json({error:'not_found'},404);
 }catch(e){const code=['invalid_request','too_large'].includes(e.message)?e.message:'account_unavailable';return json({error:code},code==='too_large'?413:code==='invalid_request'?400:503)}
}

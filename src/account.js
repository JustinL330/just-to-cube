import {accountText} from './account-i18n.js';
import {validBackup} from './core.js';
export function mergePractice(remote,local){
 const out=structuredClone(remote);for(const session of local.sessions){const target=out.sessions.find(s=>s.id===session.id);if(!target){out.sessions.push(structuredClone(session));continue}const solves=new Map(target.solves.map(s=>[s.id,s]));for(const solve of session.solves)solves.set(solve.id,structuredClone(solve));target.solves=[...solves.values()].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))}return out;
}
export function initAccount({language,getData,setData,guestData,sessionId,onState}){
 const $=s=>document.querySelector(s),t=k=>accountText(language(),k);
 const el=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e};
 let user=null,revision=0,configured=false,pending=false,busy=false,conflict=false,checking=true,mode='login',timer,flight=null,messageKey='',feed=[],feedState='',profileMessage='';
 const cacheKey=()=>`jus-cubing-account-${user.id}`,metaKey=()=>cacheKey()+'-sync';
 function meta(){if(user)try{localStorage.setItem(metaKey(),JSON.stringify({revision,pending}))}catch{}}
 async function api(path,method='GET',body){const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok)throw Error(d.error||'accountError');return d}
 function status(){return checking||busy?'busy':conflict?'sync_conflict':messageKey||(!configured?'accountError':user?pending?'syncPending':'syncSaved':'accountIntro')}
 function update(){
  document.querySelectorAll('[data-account]').forEach(e=>e.textContent=t(e.dataset.account));
  $('#authBox').hidden=!!user&&messageKey!=='login_required';$('#profileBox').hidden=!user;$('#checkinForm').hidden=!user;$('#checkinLogin').hidden=!!user;$('#editProfileLink').hidden=!user;
  $('#accountState').textContent=t(status());$('#accountState').hidden=!user&&configured&&!busy&&!messageKey&&!checking;$('#syncConflict').hidden=!conflict;
  $('#authSubmit').textContent=t(busy?'busy':mode);$('#authSubmit').disabled=busy||!configured;$('#authPassword').autocomplete=mode==='register'?'new-password':'current-password';
  $('#registerTab').classList.toggle('selected',mode==='register');$('#loginTab').classList.toggle('selected',mode==='login');
  $('#syncSave').disabled=busy||!user||conflict;$('#logoutBtn').disabled=busy;
  $('#accountButton').title=t('account');$('#accountButton').setAttribute('aria-label',user?t('account')+': '+user.name:t('login'));$('#accountInitial').textContent=user?Array.from(user.name)[0].toUpperCase():'♙';
  $('#checkinMessage').textContent=feedState?t(feedState):'';
  $('#profileMessage').textContent=profileMessage?t(profileMessage):'';$('#saveProfile').disabled=busy||!user;$('#cancelProfile').disabled=busy||!user;$('#profileName').disabled=busy;$('#profileBio').disabled=busy;
  if(user){$('#profileUsername').textContent='@'+user.username;$('#profileTimezone').textContent=t('timeZone')+': '+user.timezone;$('#profileAvatar').textContent=Array.from(user.name)[0].toUpperCase()}
  onState?.({user,pending,configured,conflict});
 }
 function changed(){if(!user)return;pending=true;messageKey='';meta();update();clearTimeout(timer);timer=setTimeout(()=>save().catch(()=>{}),1000)}
 async function save(){
  clearTimeout(timer);if(!user||conflict)return false;if(flight){await flight;if(pending&&!conflict)return save();return !pending}
  if(!pending)return true;
  const owner=user.id,snapshot=JSON.stringify(getData());busy=true;update();
  flight=(async()=>{try{const d=await api('/api/account/data','PUT',{data:JSON.parse(snapshot),revision});if(user?.id!==owner)return false;revision=d.revision;pending=JSON.stringify(getData())!==snapshot;messageKey='';meta();return true}catch(e){if(e.message==='sync_conflict')conflict=true;messageKey=e.message;return false}finally{busy=false;flight=null;update()}})();
  const ok=await flight;if(ok&&pending&&!conflict)timer=setTimeout(()=>save(),1000);return ok&&!pending;
 }
 function profileFields(){$('#profileName').value=user?.name||'';$('#profileBio').value=user?.bio||''}
 async function attach(next){
  const previousUser=user;user=next;let remote;try{remote=await api('/api/account/data')}catch(error){user=previousUser;throw error}let cached,info;
  try{cached=JSON.parse(localStorage.getItem(cacheKey()));info=JSON.parse(localStorage.getItem(metaKey()))}catch{}
  revision=remote.revision;pending=false;conflict=false;
  if(validBackup(cached)&&info?.pending){pending=true;conflict=info.revision!==remote.revision;revision=info.revision;setData(cached,user)}
  else{setData(validBackup(remote.data)?remote.data:null,user);if(!remote.data)pending=true}
  meta();profileFields();profileMessage='';messageKey='';update();if(pending&&!conflict)await save();
 }
 async function resolve(merge){busy=true;update();try{const r=await api('/api/account/data');const local=getData();revision=r.revision;conflict=false;setData(merge&&validBackup(r.data)?mergePractice(r.data,local):r.data,user);pending=merge;messageKey='';meta()}catch{messageKey='accountError'}finally{busy=false;update()}if(pending&&!conflict)await save()}
 $('#loginTab').onclick=()=>{mode='login';messageKey='';update()};$('#registerTab').onclick=()=>{mode='register';messageKey='';update()};
 $('#authForm').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;messageKey='';update();try{const d=await api('/api/account/'+mode,'POST',{name:$('#authName').value,password:$('#authPassword').value,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});$('#authPassword').value='';await attach(d.user)}catch(e){messageKey=e.message}finally{busy=false;update()}};
 $('#profileForm').onsubmit=async e=>{e.preventDefault();if(busy||!user)return;
  const name=$('#profileName').value.trim(),bio=$('#profileBio').value;
  if(!name||name.length>40||bio.length>200){profileMessage='invalid_profile';update();return}
  busy=true;profileMessage='syncBusy';update();try{const d=await api('/api/account/profile','PUT',{name,bio});user=d.user;profileFields();profileMessage='profileSaved';messageKey='';await loadFeed()}catch(e){profileMessage=e.message}finally{busy=false;update()}};
 $('#cancelProfile').onclick=()=>{if(busy)return;profileFields();profileMessage='';update()};
 $('#profileForm').addEventListener('input',()=>{if(profileMessage){profileMessage='';update()}});
 $('#passwordForm').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;update();try{await api('/api/account/password','PUT',{current:$('#currentPassword').value,password:$('#newPassword').value});e.target.reset();messageKey='passwordSaved'}catch(e){messageKey=e.message}finally{busy=false;update()}};
 $('#syncSave').onclick=()=>save();$('#reloadAccount').onclick=()=>resolve(false);$('#mergeAccount').onclick=()=>resolve(true);
 $('#guestImport').onclick=async()=>{if(!user||busy||conflict)return;const guest=guestData();if(!validBackup(guest))return;setData(mergePractice(getData(),guest),user);changed();await save()};
 $('#logoutBtn').onclick=async()=>{if(busy)return;if(pending&&!await save())return;busy=true;update();try{await api('/api/account/logout','POST',{});user=null;revision=0;pending=conflict=false;profileMessage='';messageKey='';setData(guestData(),null);$('#profileForm').reset();$('#passwordForm').reset()}catch(e){messageKey=e.message}finally{busy=false;update();renderFeed()}};
 function renderFeed(){const root=$('#checkinFeed');root.replaceChildren();if(!feed.length){root.append(el('p',t('noPosts'),'muted'));return}
  for(const post of feed){const card=el('article','','card checkin-post'),top=el('div','','checkin-post-top'),avatar=el('span',Array.from(post.display_name)[0]?.toUpperCase()||'◇','avatar');const person=el('div','');person.append(el('strong',post.display_name),el('small','@'+post.username+' · '+post.day,'muted'));if(post.bio)person.append(el('p',post.bio,'small muted'));top.append(avatar,person);card.append(top,el('p',post.body,'checkin-body'));if(post.summary){const s=post.summary;card.append(el('div',`${s.event} · ${s.solves} ${language().startsWith('zh')?'次':'solves'} · best ${s.best} · ao5 ${s.ao5} · ao12 ${s.ao12}`,'checkin-summary'))}
   if(user&&post.user_id===user.id){const b=el('button',t('removePost'),'text-button small');b.onclick=async()=>{b.disabled=true;try{await api('/api/checkins/'+encodeURIComponent(post.id),'DELETE',{});await loadFeed()}catch{feedState='accountError';update();b.disabled=false}};card.append(b)}root.append(card)}
 }
 async function loadFeed(){try{const d=await api('/api/checkins');feed=d.posts;feedState='';renderFeed()}catch{feedState='accountError'}update()}
 $('#checkinRefresh').onclick=loadFeed;
 $('#checkinForm').onsubmit=async e=>{e.preventDefault();if(!user||busy)return;busy=true;update();try{if(pending){busy=false;if(!await save())throw Error(conflict?'sync_conflict':'accountError');busy=true}await api('/api/checkins','POST',{text:$('#checkinText').value,share:$('#checkinShare').checked,session:sessionId()});$('#checkinText').value='';await loadFeed();feedState='posted';document.dispatchEvent(new Event('jus-checkin-posted'))}catch(e){feedState=e.message}finally{busy=false;update()}};
 window.addEventListener('online',()=>{if(pending)save()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&pending)save()});
 const ready=(async()=>{try{const d=await api('/api/account/me');configured=d.configured;if(d.user)await attach(d.user)}catch{configured=false;messageKey='accountError'}finally{checking=false;update()}})();
 update();return {changed,save,ready,update:()=>{update();renderFeed()},loadFeed,get user(){return user}};
}

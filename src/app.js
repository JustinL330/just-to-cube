import {initPasswordVisibility} from './password-visibility.js';
import {initMessages} from './messages.js';
import {initForum} from './forum.js';
import {initAccount} from './account.js';
import {initAI} from './ai-chat.js';
import {validBackup} from './core.js';
import {dict,languages} from './i18n.js';
import {initSQ1} from './sq1.js';
import {sq1Text} from './sq1-i18n.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let KEY='jus-cubing-v1',data,account=null,forum=null,messenger=null,trainer=null;
let updateAI=()=>{},toastTimeout,swReady=false,page='sq1';
const freshData=()=>({version:1,sessions:[{id:crypto.randomUUID(),name:'3×3×3',event:'333',solves:[]}],settings:{language:'en',dark:false}});
try{data=JSON.parse(localStorage.getItem(KEY))}catch{}
if(!validBackup(data))data=freshData();
function normalizeSettings(){data.settings={language:'en',dark:false,...data.settings};if(!languages[data.settings.language])data.settings.language='en'}
normalizeSettings();
const t=k=>dict[data.settings.language]?.[k]||dict.en[k]||k;
const st=k=>sq1Text(data.settings.language,k);
function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));account?.changed()}catch{toast(t('storageError'))}}
function toast(message){clearTimeout(toastTimeout);const e=$('#toast');e.textContent=message;e.hidden=false;toastTimeout=setTimeout(()=>e.hidden=true,4500)}
function network(){
 $('#offlineState').textContent=t(navigator.onLine?(swReady?'cached':'cachePending'):'offline');
 if(!account?.user)$('#connectionStatus').textContent=t(navigator.onLine?'local':'offline');
}
function translate(){
 document.documentElement.lang={zh_hk:'zh-HK',zh_cn:'zh-CN'}[data.settings.language]||data.settings.language;
 $$('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));
 for(const id of ['#language','#settingsLanguage'])$(id).value=data.settings.language;
 $('#darkToggle').checked=data.settings.dark;document.body.classList.toggle('dark',data.settings.dark);
 $('#themeToggle').setAttribute('aria-pressed',String(data.settings.dark));
 $('#themeToggle').setAttribute('aria-label',t(data.settings.dark?'light':'dark'));
 $('#themeToggle').title=t(data.settings.dark?'light':'dark');
 $('#language').setAttribute('aria-label',t('language'));$('#settingsLanguage').setAttribute('aria-label',t('language'));
 $('#settingsBtn').setAttribute('aria-label',t('settings'));
 $('#sq1Nav').textContent=st('nav');$('#appAbout').textContent=st('about');
 $('#aiShareLabel').textContent=st('contextShare');$('#aiSummaryLabel').textContent=st('contextPreview');
 trainer?.update();updateAI();account?.update();forum?.update();messenger?.update();passwordVisibility.refresh();network();
}
function setPage(next){
 if(next==='forum')next='checkins';
 page=['sq1','settings','ai','checkins','account','messages'].includes(next)?next:'sq1';
 passwordVisibility.hide();$$('.page').forEach(e=>e.hidden=e.id!==page+'Page');
 $$('.nav').forEach(e=>{const active=e.dataset.page===page;e.classList.toggle('active',active);if(active)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current')});
 if(location.hash!=='#'+page)history.replaceState(null,'','#'+page);
 if(page==='checkins')forum?.load();
}
for(const id of ['#language','#settingsLanguage'])for(const[key,label]of Object.entries(languages)){const o=document.createElement('option');o.value=key;o.textContent=label;$(id).append(o)}
$$('[data-page]').forEach(b=>b.onclick=()=>setPage(b.dataset.page));
$('#settingsBtn').onclick=()=>setPage('settings');
window.addEventListener('hashchange',()=>setPage(location.hash.slice(1)));
$('.brand').onclick=e=>{e.preventDefault();setPage('sq1')};
function changeLanguage(e){data.settings.language=e.target.value;persist();translate()}
$('#language').onchange=$('#settingsLanguage').onchange=changeLanguage;
$('#themeToggle').onclick=()=>{data.settings.dark=!data.settings.dark;persist();translate()};
$('#darkToggle').onchange=e=>{data.settings.dark=e.target.checked;persist();translate()};
function download(name,contents){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#exportBtn').onclick=()=>download('just-to-cube-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(data,null,2));
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{
 try{
  const file=e.target.files[0];if(!file)return;if(file.size>20_000_000)throw Error();
  const incoming=JSON.parse(await file.text());if(!validBackup(incoming))throw Error();
  const merged=[...data.sessions,...incoming.sessions.map(s=>({...s,id:crypto.randomUUID(),solves:s.solves.map(v=>({...v,id:crypto.randomUUID()}))}))];
  if(!validBackup({...data,sessions:merged}))throw Error();
  data.sessions=merged;
  if(incoming.settings?.sq1&&typeof incoming.settings.sq1==='object')data.settings.sq1=incoming.settings.sq1;
  persist();trainer.reset();translate();toast(t('imported'));
 }catch{toast(t('badFile'))}finally{e.target.value=''}
};
const passwordVisibility=initPasswordVisibility({language:()=>data.settings.language});
trainer=initSQ1({language:()=>data.settings.language,settings:()=>data.settings.sq1,save:prefs=>{data.settings.sq1=prefs;persist()},toast});
updateAI=initAI({language:()=>data.settings.language,summary:()=>trainer.summary()});
forum=initForum({language:()=>data.settings.language,navigate:setPage});
messenger=initMessages({language:()=>data.settings.language});
account=initAccount({
 language:()=>data.settings.language,getData:()=>data,sessionId:()=>data.sessions[0].id,
 guestData:()=>{try{return JSON.parse(localStorage.getItem('jus-cubing-v1'))}catch{return null}},
 setData:(incoming,user)=>{
  KEY=user?'jus-cubing-account-'+user.id:'jus-cubing-v1';data=validBackup(incoming)?incoming:freshData();normalizeSettings();
  try{localStorage.setItem(KEY,JSON.stringify(data))}catch{toast(t('storageError'))}
  trainer.reset();translate();
 },
 onState:({user,pending,conflict})=>{
  forum?.setUser(user);messenger?.setUser(user);
  if(user)$('#connectionStatus').textContent=(pending||conflict?'◌ ':'✓ ')+user.name+' · '+(pending||conflict?'…':'Cloud');else network();
 }
});
window.addEventListener('online',network);window.addEventListener('offline',network);
translate();setPage(location.hash.slice(1));
if('serviceWorker'in navigator){
 let controlled=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled)location.reload();controlled=true});
 navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(async r=>{
  await navigator.serviceWorker.ready;swReady=true;network();
  let lastCheck=0;const check=()=>{if(document.visibilityState==='hidden'||Date.now()-lastCheck<30000)return;lastCheck=Date.now();r.update().catch(()=>{})};
  check();document.addEventListener('visibilitychange',check);window.addEventListener('online',check);
 }).catch(()=>{$('#offlineState').textContent=t('offline')});
}

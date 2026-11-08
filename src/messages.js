import {createDeviceVault,unlockDeviceVault,encryptMessage,decryptMessage,publicKeyId,fingerprint} from './messages-crypto.js';
import {readRecord,writeRecord,readMessages} from './messages-store.js';
import {messageText} from './messages-i18n.js';
import {renderMarkdown} from './markdown.js';
export function initMessages({language}){
 const $=s=>document.querySelector(s),t=k=>messageText(language(),k);
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 let user=null,privateKey=null,peers=new Map(),blocked=new Set(),renders=0,messages=[],selected=null,epoch=0,busy=false,syncing=false,status='',error='',poll;
 const markdownHelp=el('p',undefined,'small muted markdown-help');markdownHelp.dataset.dm='markdownHelp';markdownHelp.id='dmMarkdownHelp';$('#dmInput').setAttribute('aria-describedby',markdownHelp.id);$('#dmInput').after(markdownHelp);
 const api=async(path,method='GET',body)=>{const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),20000):null;try{const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller?.signal});const d=await r.json();if(!r.ok)throw Error(d.error);return d}catch(e){if(e?.name==='AbortError')throw Error('messagesUnavailable');throw e}finally{if(timer)clearTimeout(timer)}};
 const messageId=()=>{if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=bytes[6]&15|64;bytes[8]=bytes[8]&63|128;const hex=[...bytes].map(n=>n.toString(16).padStart(2,'0'));return hex.slice(0,4).join('')+'-'+hex.slice(4,6).join('')+'-'+hex.slice(6,8).join('')+'-'+hex.slice(8,10).join('')+'-'+hex.slice(10).join('')};
 const revealConversation=()=>{if(matchMedia('(max-width: 760px)').matches)requestAnimationFrame(()=>$('#dmConversation').scrollIntoView({behavior:'smooth',block:'start'}))};
 function update(){document.querySelectorAll('[data-dm]').forEach(e=>e.textContent=t(e.dataset.dm));$('#dmLogin').hidden=!!user;$('#dmUnlockBox').hidden=true;$('#dmWorkspace').hidden=!user||!privateKey;$('#dmLock').hidden=true;$('#dmStatus').hidden=!user;$('#dmStatus').textContent=t(busy&&!privateKey?'preparing':syncing?'syncing':status||(privateKey?(navigator.onLine?'saved':'offline'):'preparing'));$('#dmError').textContent=error?t(error):user&&!crypto.subtle?t('unavailable'):'';$('#dmSend').disabled=busy||!selected||blocked.has(selected);$('#dmSync').disabled=syncing;}
 function lock(){epoch++;privateKey=null;selected=null;peers.clear();blocked.clear();messages=[];busy=syncing=false;status=error='';clearInterval(poll);$('#dmThread').replaceChildren();$('#dmContacts').replaceChildren();$('#dmInput').value='';$('#dmPassphrase').value=$('#dmConfirm').value='';$('#dmOwnFingerprint').textContent='';$('#dmPeerFingerprint').textContent='';$('#dmPeerName').textContent='';update()}
 async function pin(peer,owner){const old=await readRecord(owner,'peer:'+peer.id);if(old&&publicKeyId(old.publicKey)!==publicKeyId(peer.publicKey)){if(user?.id===owner)blocked.add(peer.id);throw Error('keyChanged')}await writeRecord(owner,'peer:'+peer.id,peer);return peer}
 async function render(){const paint=++renders,generation=epoch,key=privateKey,owner=user?.id;if(!key)return;const contacts=$('#dmContacts');contacts.replaceChildren();const lastFor=id=>messages.filter(m=>m.sender===id||m.recipient===id).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||b.id.localeCompare(a.id))[0],ordered=[...peers.values()].sort((a,b)=>Date.parse(lastFor(b.id)?.createdAt||0)-Date.parse(lastFor(a.id)?.createdAt||0)||a.name.localeCompare(b.name));for(const peer of ordered){const last=lastFor(peer.id),b=el('button',undefined,'dm-contact secondary'),name=el('strong',peer.name+' · @'+peer.username,'dm-contact-name'),preview=el('small','@'+peer.username,'dm-contact-preview');if(last)try{preview.textContent=(await decryptMessage(key,peer.publicKey,last)).replace(/\s+/g,' ').trim().slice(0,72)}catch{preview.textContent=t('decryptFailed')}if(generation!==epoch||paint!==renders)return;b.append(name,preview);b.classList.toggle('selected',peer.id===selected);b.onclick=async()=>{selected=peer.id;await render();revealConversation();requestAnimationFrame(()=>$('#dmInput').focus())};contacts.append(b)}
  const peer=peers.get(selected);$('#dmConversation').hidden=!peer;$('#dmEmpty').hidden=!!peer;if(!peer){update();return}
  $('#dmPeerName').textContent=peer.name+' · @'+peer.username;const fp=await fingerprint(peer.publicKey);if(generation!==epoch||paint!==renders)return;$('#dmPeerFingerprint').textContent=fp;
  const root=$('#dmThread'),fragment=document.createDocumentFragment();
  const thread=messages.filter(m=>m.sender===peer.id||m.recipient===peer.id).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.id.localeCompare(b.id));
  if(!thread.length)fragment.append(el('p',t('noMessages'),'muted'));
  for(const m of thread){let text;try{text=await decryptMessage(key,peer.publicKey,m)}catch{text=t('decryptFailed')};if(generation!==epoch||paint!==renders)return;const row=el('article',undefined,'dm-bubble'+(m.sender===owner?' mine':'')),body=el('div');renderMarkdown(body,text);row.append(body,el('small',new Date(m.createdAt).toLocaleString()+' · '+t(m.pending?'pending':'sent'),'muted'));fragment.append(row)}
  if(generation!==epoch||paint!==renders)return;const bottom=root.scrollHeight-root.scrollTop-root.clientHeight<100;root.replaceChildren(fragment);if(bottom)root.scrollTop=root.scrollHeight;update();
 }
 function report(e){error=e?.message||'messagesUnavailable';update()}
 async function sync(){if(!privateKey||syncing)return;const generation=epoch,owner=user.id;syncing=true;error='';update();
  try{
   if(!navigator.onLine){status='offline';return}
   const local=await readMessages(owner);
   for(const m of local.filter(m=>m.pending)){if(blocked.has(m.recipient))throw Error('keyChanged');const ack=await api('/api/messages','POST',m);await writeRecord(owner,'message:'+m.id,{...m,...ack,pending:false});if(generation!==epoch)return}
   let after=await readRecord(owner,'cursor')||0,more=true;
   while(more){const d=await api('/api/messages?after='+after);if(generation!==epoch)return;
    for(const p of d.peers){await pin(p,owner);if(generation!==epoch)return;peers.set(p.id,p)}
    for(const m of d.messages)await writeRecord(owner,'message:'+m.id,{...m,pending:false});
    if(generation!==epoch)return;after=d.messages.at(-1)?.seq||after;await writeRecord(owner,'cursor',after);more=d.more;
   }
   const fresh=await readMessages(owner);if(generation!==epoch)return;messages=fresh;if(!selected)selected=peers.keys().next().value||null;status='saved';await render();
  }catch(e){if(generation===epoch){const fresh=await readMessages(owner).catch(()=>messages);if(generation!==epoch)return;messages=fresh;status=navigator.onLine?'retry':'offline';report(e);await render()}}
  finally{if(generation===epoch){syncing=false;update()}}
 }
 async function openMessages(){if(busy||!user||privateKey)return;const owner=user.id,generation=epoch;busy=true;error='';status='';update();
  try{
   if(!crypto.subtle)throw Error('unavailable');
   let vault=await readRecord(owner,'vault'),wrappingKey=await readRecord(owner,'deviceKey'),remote=null;
   if(navigator.onLine)remote=(await api('/api/messages/keys')).vault;else if(!vault||!wrappingKey)throw Error('notOnline');
   if(remote){if(vault&&publicKeyId(vault.publicKey)!==publicKeyId(remote.publicKey))throw Error('keyChanged');vault=remote;if(!wrappingKey)throw Error('deviceNotLinked')}
   else if(!vault||!wrappingKey){const created=await createDeviceVault(owner);vault=created.vault;wrappingKey=created.wrappingKey;await writeRecord(owner,'deviceKey',wrappingKey);await writeRecord(owner,'vault',vault);await api('/api/messages/keys','POST',vault)}
   else if(navigator.onLine)await api('/api/messages/keys','POST',vault).catch(e=>{if(e.message!=='keysExist')throw e});
   if(generation!==epoch)return;
   let unlocked;try{unlocked=await unlockDeviceVault(vault,wrappingKey,owner)}catch(e){throw Error(e.message==='deviceNotLinked'?'deviceNotLinked':'unlockFailed')}
   await writeRecord(owner,'vault',vault);const cached=await readMessages(owner);if(generation!==epoch)return;privateKey=unlocked;messages=cached;
   const ids=[...new Set(messages.flatMap(m=>[m.sender,m.recipient]).filter(id=>id!==owner))];for(const id of ids){const p=await readRecord(owner,'peer:'+id);if(generation!==epoch)return;if(p)peers.set(id,p)}
   selected=peers.keys().next().value||null;const own=await fingerprint(vault.publicKey);if(generation!==epoch)return;$('#dmOwnFingerprint').textContent=own;await render();await sync();if(generation!==epoch)return;poll=setInterval(()=>{if(document.visibilityState==='visible')sync().catch(report)},5000);
  }catch(e){if(generation===epoch)report(e)}finally{if(generation===epoch){busy=false;update()}}
 }
 $('#dmUnlockForm').onsubmit=e=>{e.preventDefault();openMessages().catch(report)};
 $('#dmFindForm').onsubmit=async e=>{e.preventDefault();if(!privateKey)return;const owner=user.id,generation=epoch;try{if(!navigator.onLine)throw Error('notOnline');const d=await api('/api/messages/user?username='+encodeURIComponent($('#dmUsername').value.replace(/^@/,'')));await pin(d.peer,owner);if(generation!==epoch)return;peers.set(d.peer.id,d.peer);selected=d.peer.id;error='';$('#dmUsername').value='';await render();revealConversation();requestAnimationFrame(()=>$('#dmInput').focus())}catch(e){if(generation===epoch)report(e)}};
 $('#dmCompose').onsubmit=async e=>{e.preventDefault();if(busy||!privateKey||!selected||blocked.has(selected))return;const peer=peers.get(selected),owner=user.id,generation=epoch,key=privateKey,text=$('#dmInput').value;busy=true;error='';update();
  try{const encrypted=await encryptMessage(key,peer.publicKey,{id:messageId(),sender:owner,recipient:peer.id,text});const m={...encrypted,createdAt:new Date().toISOString(),pending:true};await writeRecord(owner,'message:'+m.id,m);if(generation!==epoch)return;messages=await readMessages(owner);if(generation!==epoch)return;$('#dmInput').value='';status='localOnly';await render();$('#dmThread').scrollTop=$('#dmThread').scrollHeight;await sync()}catch(e){if(generation===epoch)report(e)}finally{if(generation===epoch){busy=false;update()}}
 };
 $('#dmInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#dmCompose').requestSubmit()}});
 $('#dmLock').onclick=lock;$('#dmSync').onclick=()=>sync().catch(report);window.addEventListener('online',()=>{if(privateKey)sync().catch(report);else openMessages().catch(report)});window.addEventListener('offline',()=>{status='offline';update()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(privateKey)sync().catch(report);else openMessages().catch(report)}});
 update();return {setUser(next){if(user?.id!==next?.id){lock();user=next;update();if(user)openMessages().catch(report)}else user=next},update(){update();if(privateKey)render().catch(report)}};
}

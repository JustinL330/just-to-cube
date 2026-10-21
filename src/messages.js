import {createVault,unlockVault,encryptMessage,decryptMessage,publicKeyId,fingerprint} from './messages-crypto.js';
import {readRecord,writeRecord,readMessages} from './messages-store.js';
import {messageText} from './messages-i18n.js';
export function initMessages({language}){
 const $=s=>document.querySelector(s),t=k=>messageText(language(),k);
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 let user=null,privateKey=null,peers=new Map(),blocked=new Set(),renders=0,messages=[],selected=null,epoch=0,busy=false,syncing=false,status='',error='',poll;
 const api=async(path,method='GET',body)=>{const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok)throw Error(d.error);return d};
 function update(){document.querySelectorAll('[data-dm]').forEach(e=>e.textContent=t(e.dataset.dm));$('#dmLogin').hidden=!!user;$('#dmUnlockBox').hidden=!user||!!privateKey;$('#dmWorkspace').hidden=!user||!privateKey;$('#dmLock').hidden=!privateKey;$('#dmUnlock').disabled=busy||!crypto.subtle;$('#dmUnlock').textContent=t(busy?'busy':'unlock');$('#dmStatus').hidden=!privateKey;$('#dmStatus').textContent=t(syncing?'syncing':status||(navigator.onLine?'saved':'offline'));$('#dmError').textContent=error?t(error):user&&!crypto.subtle?t('unavailable'):'';$('#dmSend').disabled=busy||!selected||blocked.has(selected);$('#dmSync').disabled=syncing;}
 function lock(){epoch++;privateKey=null;selected=null;peers.clear();blocked.clear();messages=[];busy=syncing=false;status=error='';clearInterval(poll);$('#dmThread').replaceChildren();$('#dmContacts').replaceChildren();$('#dmInput').value='';$('#dmPassphrase').value=$('#dmConfirm').value='';$('#dmOwnFingerprint').textContent='';$('#dmPeerFingerprint').textContent='';$('#dmPeerName').textContent='';update()}
 async function pin(peer,owner){const old=await readRecord(owner,'peer:'+peer.id);if(old&&publicKeyId(old.publicKey)!==publicKeyId(peer.publicKey)){if(user?.id===owner)blocked.add(peer.id);throw Error('keyChanged')}await writeRecord(owner,'peer:'+peer.id,peer);return peer}
 async function render(){const paint=++renders,generation=epoch,key=privateKey,owner=user?.id;if(!key)return;const contacts=$('#dmContacts');contacts.replaceChildren();for(const peer of peers.values()){const b=el('button',peer.name+' · @'+peer.username,'dm-contact secondary');b.classList.toggle('selected',peer.id===selected);b.onclick=()=>{selected=peer.id;render().catch(report)};contacts.append(b)}
  const peer=peers.get(selected);$('#dmConversation').hidden=!peer;$('#dmEmpty').hidden=!!peer;if(!peer){update();return}
  $('#dmPeerName').textContent=peer.name+' · @'+peer.username;const fp=await fingerprint(peer.publicKey);if(generation!==epoch||paint!==renders)return;$('#dmPeerFingerprint').textContent=fp;
  const root=$('#dmThread'),fragment=document.createDocumentFragment();
  const thread=messages.filter(m=>m.sender===peer.id||m.recipient===peer.id).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.id.localeCompare(b.id));
  if(!thread.length)fragment.append(el('p',t('noMessages'),'muted'));
  for(const m of thread){let text;try{text=await decryptMessage(key,peer.publicKey,m)}catch{text=t('decryptFailed')};if(generation!==epoch||paint!==renders)return;const row=el('article',undefined,'dm-bubble'+(m.sender===owner?' mine':''));row.append(el('p',text),el('small',new Date(m.createdAt).toLocaleString()+' · '+t(m.pending?'pending':'sent'),'muted'));fragment.append(row)}
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
   const fresh=await readMessages(owner);if(generation!==epoch)return;messages=fresh;status='saved';await render();
  }catch(e){if(generation===epoch){const fresh=await readMessages(owner).catch(()=>messages);if(generation!==epoch)return;messages=fresh;status=navigator.onLine?'retry':'offline';report(e);await render()}}
  finally{if(generation===epoch){syncing=false;update()}}
 }
 $('#dmUnlockForm').onsubmit=async e=>{e.preventDefault();if(busy||!user)return;const owner=user.id,generation=epoch;busy=true;error='';update();let vault;
  try{
   vault=await readRecord(owner,'vault');
   if(navigator.onLine){try{const remote=await api('/api/messages/keys');if(remote.vault){if(vault&&publicKeyId(vault.publicKey)!==publicKeyId(remote.vault.publicKey))throw Error('keyChanged');vault=remote.vault}}catch(e){if(!vault||e.message==='keyChanged'||e.message==='loginRequired')throw e;status='offline'}}
   if(generation!==epoch)return;
   const pass=$('#dmPassphrase').value;if(!vault){if(!navigator.onLine)throw Error('notOnline');if(pass!==$('#dmConfirm').value)throw Error('passphraseMismatch');vault=await createVault(pass,owner);await api('/api/messages/keys','POST',vault)}
   let unlocked;try{unlocked=await unlockVault(vault,pass,owner)}catch{throw Error('unlockFailed')}
   await writeRecord(owner,'vault',vault);const cached=await readMessages(owner);if(generation!==epoch)return;privateKey=unlocked;messages=cached;
   const ids=[...new Set(messages.flatMap(m=>[m.sender,m.recipient]).filter(id=>id!==owner))];for(const id of ids){const p=await readRecord(owner,'peer:'+id);if(generation!==epoch)return;if(p)peers.set(id,p)}
   selected=peers.keys().next().value||null;const own=await fingerprint(vault.publicKey);if(generation!==epoch)return;$('#dmOwnFingerprint').textContent=own;$('#dmPassphrase').value=$('#dmConfirm').value='';await render();await sync();if(generation!==epoch)return;poll=setInterval(()=>{if(document.visibilityState==='visible')sync().catch(report)},10000);
  }catch(e){if(generation===epoch)report(e)}finally{if(generation===epoch){busy=false;update()}}
 };
 $('#dmFindForm').onsubmit=async e=>{e.preventDefault();if(!privateKey)return;const owner=user.id,generation=epoch;try{if(!navigator.onLine)throw Error('notOnline');const d=await api('/api/messages/user?username='+encodeURIComponent($('#dmUsername').value.replace(/^@/,'')));await pin(d.peer,owner);if(generation!==epoch)return;peers.set(d.peer.id,d.peer);selected=d.peer.id;error='';await render()}catch(e){if(generation===epoch)report(e)}};
 $('#dmCompose').onsubmit=async e=>{e.preventDefault();if(busy||!privateKey||!selected||blocked.has(selected))return;const peer=peers.get(selected),owner=user.id,generation=epoch,key=privateKey,text=$('#dmInput').value;busy=true;error='';update();
  try{const encrypted=await encryptMessage(key,peer.publicKey,{id:crypto.randomUUID(),sender:owner,recipient:peer.id,text});const m={...encrypted,createdAt:new Date().toISOString(),pending:true};await writeRecord(owner,'message:'+m.id,m);if(generation!==epoch)return;messages=await readMessages(owner);if(generation!==epoch)return;$('#dmInput').value='';status='localOnly';await render();$('#dmThread').scrollTop=$('#dmThread').scrollHeight;await sync()}catch(e){if(generation===epoch)report(e)}finally{if(generation===epoch){busy=false;update()}}
 };
 $('#dmLock').onclick=lock;$('#dmSync').onclick=()=>sync().catch(report);window.addEventListener('online',()=>sync().catch(report));window.addEventListener('offline',()=>{status='offline';update()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync().catch(report)});
 update();return {setUser(next){if(user?.id!==next?.id){lock();user=next;update()}else user=next},update(){update();if(privateKey)render().catch(report)}};
}

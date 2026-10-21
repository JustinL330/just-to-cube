let opening;
function database(){
 if(!opening)opening=new Promise((resolve,reject)=>{const r=indexedDB.open('jus-cubing-messages',1);r.onupgradeneeded=()=>{r.result.createObjectStore('records',{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('localStorageError'));}).catch(e=>{opening=null;throw e});
 return opening;
}
export async function readRecord(owner,id){const db=await database();return new Promise((resolve,reject)=>{const r=db.transaction('records').objectStore('records').get(owner+':'+id);r.onsuccess=()=>resolve(r.result?.value);r.onerror=()=>reject(Error('localStorageError'))})}
export async function writeRecord(owner,id,value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put({key:owner+':'+id,value});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('localStorageError'));tx.onabort=()=>reject(Error('localStorageError'))})}
export async function readMessages(owner){const db=await database();return new Promise((resolve,reject)=>{const prefix=owner+':message:',r=db.transaction('records').objectStore('records').getAll(IDBKeyRange.bound(prefix,prefix+'\uffff'));r.onsuccess=()=>resolve(r.result.map(v=>v.value));r.onerror=()=>reject(Error('localStorageError'))})}

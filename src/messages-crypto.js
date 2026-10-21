// Browser-only cryptography. Servers receive public keys, sealed key vaults and ciphertext.
const enc = new TextEncoder(), dec = new TextDecoder();
export const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
export const unb64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const random = n => crypto.getRandomValues(new Uint8Array(n));
export const publicKeyId = key => JSON.stringify({kty:key.kty,crv:key.crv,x:key.x,y:key.y});
export async function fingerprint(key) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(publicKeyId(key))))).map(v=>v.toString(16).padStart(2,'0')).join('').match(/.{1,4}/g).join(' ');
}
async function vaultKey(passphrase, salt) {
  const base = await crypto.subtle.importKey('raw',enc.encode(passphrase),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:unb64(salt),iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function createVault(passphrase, userId) {
  if(passphrase.length<12||passphrase.length>256)throw Error('passphraseLength');
  const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey),privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
  const salt=b64(random(16)),iv=b64(random(12)),key=await vaultKey(passphrase,salt);
  const ciphertext=b64(await crypto.subtle.encrypt({name:'AES-GCM',iv:unb64(iv),additionalData:enc.encode('jus-dm-vault-v1:'+userId)},key,enc.encode(JSON.stringify(privateJwk))));
  return {version:1,publicKey,salt,iv,ciphertext};
}
export async function unlockVault(vault, passphrase, userId) {
  if(vault.version!==1)throw Error('unlockFailed');
  const key=await vaultKey(passphrase,vault.salt);
  const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(vault.iv),additionalData:enc.encode('jus-dm-vault-v1:'+userId)},key,unb64(vault.ciphertext));
  const jwk=JSON.parse(dec.decode(raw));
  if(publicKeyId(jwk)!==publicKeyId(vault.publicKey))throw Error('unlockFailed');
  return crypto.subtle.importKey('jwk',jwk,{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
}
async function conversationKey(privateKey, peerKey, sender, recipient) {
  const peer=await crypto.subtle.importKey('jwk',peerKey,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const secret=await crypto.subtle.deriveBits({name:'ECDH',public:peer},privateKey,256);
  const base=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:enc.encode('jus-cubing-dm-v1'),info:enc.encode(JSON.stringify([sender,recipient].sort()))},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const aad=m=>enc.encode(JSON.stringify(['jus-dm-v1',m.id,m.sender,m.recipient]));
export async function encryptMessage(privateKey, peerKey, {id,sender,recipient,text}) {
  if(!text.trim()||text.length>4000)throw Error('messageLength');
  const m={version:1,id,sender,recipient,iv:b64(random(12))};
  const key=await conversationKey(privateKey,peerKey,sender,recipient);
  return {...m,ciphertext:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv:unb64(m.iv),additionalData:aad(m)},key,enc.encode(text)))};
}
export async function decryptMessage(privateKey, peerKey, m) {
  if(m.version!==1)throw Error('decryptFailed');
  const key=await conversationKey(privateKey,peerKey,m.sender,m.recipient);
  return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(m.iv),additionalData:aad(m)},key,unb64(m.ciphertext)));
}

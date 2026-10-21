// Passwords use one-way PBKDF2 records. Private content uses a separate server secret.
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
export function encryptionConfigured(env) {
 try { return typeof env.FORUM_ENCRYPTION_KEY === 'string' && decode(env.FORUM_ENCRYPTION_KEY).length === 32; } catch { return false; }
}
async function keyFor(env, zone) {
 if (!encryptionConfigured(env)) throw Error('encryption_unavailable');
 const master = await crypto.subtle.importKey('raw', decode(env.FORUM_ENCRYPTION_KEY), 'HKDF', false, ['deriveKey']);
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:new TextEncoder().encode(zone),info:new TextEncoder().encode('jus-cubing/private-forum/v1')},master,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(bytes, env, zone) {
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(zone)},await keyFor(env,zone),bytes));
 const packed=new Uint8Array(12+encrypted.length);packed.set(iv);packed.set(encrypted,12);return packed;
}
export async function unseal(bytes, env, zone) {
 const packed=new Uint8Array(bytes);
 return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:packed.slice(0,12),additionalData:new TextEncoder().encode(zone)},await keyFor(env,zone),packed.slice(12)));
}
export async function sealText(text,env,zone){return 'v1:'+encode(await seal(new TextEncoder().encode(text),env,zone));}
export async function unsealText(text,env,zone){if(!text.startsWith('v1:'))throw Error('invalid_ciphertext');return new TextDecoder().decode(await unseal(decode(text.slice(3)),env,zone));}

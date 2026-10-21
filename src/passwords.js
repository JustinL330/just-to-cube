const ITERATIONS=600000,ALGORITHM='pbkdf2-sha256',VERSION='v1';
const HEX=/^[a-f0-9]{64}$/;
const encode=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const decode=hex=>Uint8Array.from(hex.match(/../g),b=>parseInt(b,16));
function parse(record,legacySalt){
 if(typeof record!=='string')return null;
 if(HEX.test(record)&&typeof legacySalt==='string'&&HEX.test(legacySalt))return {iterations:ITERATIONS,salt:legacySalt,hash:record,legacy:true};
 const match=record.match(/^pbkdf2-sha256\$v1\$(\d{6,7})\$([a-f0-9]{64})\$([a-f0-9]{64})$/);
 if(!match)return null;
 const iterations=Number(match[1]);
 // Validate stored parameters before deriving, to bound runtime and reject corrupt records.
 if(iterations<100000||iterations>1000000)return null;
 return {iterations,salt:match[2],hash:match[3],legacy:false};
}
export async function derivePasswordHash(password,salt,iterations=ITERATIONS){
 if(typeof password!=='string'||password.length>128||!HEX.test(salt)||!Number.isSafeInteger(iterations)||iterations<100000||iterations>1000000)throw Error('invalid_password_record');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return encode(await crypto.subtle.deriveBits({name:'PBKDF2',salt:decode(salt),iterations,hash:'SHA-256'},key,256));
}
async function equalHashes(a,b){
 const aa=decode(a),bb=decode(b);
 if(typeof crypto.subtle.timingSafeEqual==='function')return crypto.subtle.timingSafeEqual(aa,bb);
 // Standard Web Crypto fallback: use native MAC verification instead of a JS string comparison.
 const key=await crypto.subtle.importKey('raw',new Uint8Array(32),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 const signature=await crypto.subtle.sign('HMAC',key,bb);
 return crypto.subtle.verify('HMAC',key,signature,aa);
}
export async function createPasswordRecord(password){
 const salt=encode(crypto.getRandomValues(new Uint8Array(32)));
 const hash=await derivePasswordHash(password,salt);
 return {salt,hash:`${ALGORITHM}$${VERSION}$${ITERATIONS}$${salt}$${hash}`};
}
export async function verifyPassword(password,record,legacySalt){
 const stored=parse(record,legacySalt);if(!stored||typeof password!=='string'||password.length>128)return false;
 return equalHashes(await derivePasswordHash(password,stored.salt,stored.iterations),stored.hash);
}
export function needsPasswordUpgrade(record,legacySalt){const stored=parse(record,legacySalt);return !!stored&&(stored.legacy||stored.iterations<ITERATIONS)}
export const DUMMY_PASSWORD_RECORD=`${ALGORITHM}$${VERSION}$${ITERATIONS}$${'0'.repeat(64)}$${'0'.repeat(64)}`;

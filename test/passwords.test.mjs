import test from 'node:test';
import assert from 'node:assert/strict';
import {createPasswordRecord,verifyPassword,derivePasswordHash,needsPasswordUpgrade} from '../src/passwords.js';
test('salted versioned password records verify exactly and reject incorrect passwords',async()=>{
 const password='correct cube practice password';
 const a=await createPasswordRecord(password),b=await createPasswordRecord(password);
 assert.notEqual(a.salt,b.salt);assert.notEqual(a.hash,b.hash);
 assert.match(a.hash,/^pbkdf2-sha256\$v1\$600000\$[a-f0-9]{64}\$[a-f0-9]{64}$/);
 assert.equal(await verifyPassword(password,a.hash),true);
 assert.equal(await verifyPassword(password+'!',a.hash),false);
 assert.equal(await verifyPassword(' '+password,a.hash),false);
 assert.equal(needsPasswordUpgrade(a.hash),false);
});
test('legacy hashes remain compatible and are marked for upgrade',async()=>{
 const salt='a1'.repeat(32),password='existing user password',hash=await derivePasswordHash(password,salt);
 assert.equal(await verifyPassword(password,hash,salt),true);
 assert.equal(await verifyPassword('wrong password',hash,salt),false);
 assert.equal(needsPasswordUpgrade(hash,salt),true);
});
test('malformed formats, unexpected algorithms and excessive work factors fail closed',async()=>{
 for(const record of [null,'','plaintext password','md5$abc','pbkdf2-sha256$v2$600000$'+'a'.repeat(64)+'$'+'b'.repeat(64),'pbkdf2-sha256$v1$9999999$'+'a'.repeat(64)+'$'+'b'.repeat(64),'pbkdf2-sha256$v1$000001$'+'a'.repeat(64)+'$'+'b'.repeat(64),'a'.repeat(63)])assert.equal(await verifyPassword('test',record),false);
 assert.equal(await verifyPassword('x'.repeat(129),'a'.repeat(64),'b'.repeat(64)),false);
 await assert.rejects(derivePasswordHash('test','not-hex'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('production denies startup without credentials',async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,NODE_ENV:'production',ADMIN_USER:'',ADMIN_PASSWORD:''},stdio:'ignore'});
 const [code]=await once(child,'exit');assert.notEqual(code,0);
});
test('production authentication, private API and same-origin writes',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'vivaio-access-'));
 const password='test-password-not-real-123';
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:'34128',DB_PATH:join(dir,'test.sqlite'),ADMIN_USER:'test',ADMIN_PASSWORD:password},stdio:['ignore','pipe','pipe']});
 try {
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Startup failed');}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),5000).unref())]);
 const base='http://127.0.0.1:34128';
 assert.equal((await fetch(base+'/healthz')).status,200);
 for(const path of ['/','/api/state','/app.js'])assert.equal((await fetch(base+path)).status,401);
 const authorization='Basic '+Buffer.from('test:'+password).toString('base64');
 assert.equal((await fetch(base+'/api/state',{headers:{authorization}})).status,200);
 assert.equal((await fetch(base+'/api/state',{headers:{authorization:'Basic '+Buffer.from('test:wrong').toString('base64')}})).status,401);
 const payload={method:'POST',body:JSON.stringify({name:'Test',category:'Pulcini'})};
 assert.equal((await fetch(base+'/api/teams',{...payload,headers:{authorization,'Content-Type':'text/plain'}})).status,415);
 assert.equal((await fetch(base+'/api/teams',{...payload,headers:{authorization,'Content-Type':'application/json',Origin:'https://foreign.example'}})).status,403);
 assert.equal((await fetch(base+'/api/teams',{...payload,headers:{authorization,'Content-Type':'application/json',Origin:base}})).status,201);
 } finally {if(child.exitCode===null){child.kill();await once(child,'exit');}rmSync(dir,{recursive:true,force:true});}
});

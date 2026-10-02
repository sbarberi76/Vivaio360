import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
test('school workflow, validation and persistence after restart', async () => {
 const dir=mkdtempSync(join(tmpdir(),'vivaio-test-'));let child;
 const port=34127, base=`http://127.0.0.1:${port}`;
 async function start(){child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),DB_PATH:join(dir,'test.sqlite')},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Server exited');}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),5000).unref())]);}
 async function stop(){child.kill();await once(child,'exit');child=undefined;}
 async function post(route,b,status=201){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});assert.equal(r.status,status,await r.text());}
 const state=async()=>fetch(base+'/api/state').then(r=>r.json());
 try{
 await start();
 const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/Vivaio360/);
 for(const file of ['app.js','style.css'])assert.equal((await fetch(base+'/'+file)).status,200);
 assert.deepEqual((await state()).teams,[]);
 await post('teams',{name:'Pulcini A',category:'Pulcini'});
 await post('teams',{name:'Esordienti',category:'Esordienti'});
 await post('athletes',{name:'Atleta Test',birth:'2016-03-04',parent:'Genitore Test',phone:'3330000000',team_id:1});
 await post('sessions',{team_id:1,date:'2026-10-12',place:'Campo 1'});
 await post('sessions',{team_id:2,date:'2026-10-12',place:'Campo 2'});
 await post('attendance',{session_id:1,athlete_id:1,present:1});
 await post('attendance',{session_id:1,athlete_id:1,present:0});
 await post('attendance',{session_id:2,athlete_id:1,present:1},400);
 await post('athletes',{name:'Invalid',birth:'2016-02-31',parent:'Test',phone:'123',team_id:1},400);
 await post('fees',{athlete_id:1,description:'Iscrizione',amount:15000,due:'2026-10-31'});
 await post('fees',{athlete_id:1,description:'Errore',amount:-100,due:'2026-10-31'},400);
 await post('payments',{id:1,paid:1});
 await post('payments',{id:999,paid:1},400);
 let data=await state();assert.equal(data.athletes.length,1);assert.equal(data.attendance.length,1);assert.equal(data.attendance[0].present,0);assert.equal(data.fees[0].paid,1);assert.equal(data.fees[0].amount,15000);
 await stop();await start();assert.deepEqual(await state(),data);
 await post('payments',{id:1,paid:0});assert.equal((await state()).fees[0].paid,0);
 }finally{if(child)await stop();rmSync(dir,{recursive:true,force:true});}
});

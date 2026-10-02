(() => {
 const key='vivaio360-demo-v1';
 const initial=()=>({
 teams:[{id:1,name:'Pulcini Verde',category:'Pulcini'},{id:2,name:'Esordienti Blu',category:'Esordienti'}],
 athletes:[{id:1,name:'Atleta Demo 1',birth:'2016-04-12',parent:'Genitore Demo 1',phone:'Contatto dimostrativo',team_id:1},{id:2,name:'Atleta Demo 2',birth:'2016-09-18',parent:'Genitore Demo 2',phone:'Contatto dimostrativo',team_id:1},{id:3,name:'Atleta Demo 3',birth:'2014-01-22',parent:'Genitore Demo 3',phone:'Contatto dimostrativo',team_id:2}],
 sessions:[{id:1,team_id:1,date:new Date(Date.now()+86400000).toISOString().slice(0,10),place:'Campo Demo A'},{id:2,team_id:2,date:new Date(Date.now()+172800000).toISOString().slice(0,10),place:'Campo Demo B'}],
 attendance:[],fees:[{id:1,athlete_id:1,description:'Iscrizione demo',amount:15000,due:new Date().toISOString().slice(0,10),paid:0},{id:2,athlete_id:2,description:'Iscrizione demo',amount:15000,due:new Date().toISOString().slice(0,10),paid:1}]});
 let data;
 try{data=JSON.parse(localStorage.getItem(key))||initial();}catch{data=initial();}
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(data));}catch{/* In private browsers the demo can continue in memory. */}};
 window.vivaioDemo={
 get:()=>structuredClone(data),
 reset:()=>{data=initial();save();},
 post:(route,b)=>{
 const tables={teams:'teams',athletes:'athletes',sessions:'sessions',fees:'fees'};
 if(tables[route]){
 const table=data[tables[route]];
 if(route==='fees'&&(!Number.isSafeInteger(b.amount)||b.amount<=0))throw Error('Importo non valido.');
 table.push({...b,id:Math.max(0,...table.map(x=>x.id))+1,...(route==='fees'?{paid:0}:{})});
 }else if(route==='attendance'){
 const entry=data.attendance.find(a=>a.session_id===b.session_id&&a.athlete_id===b.athlete_id);
 if(entry)entry.present=b.present;else data.attendance.push({...b});
 }else if(route==='payments'){
 const fee=data.fees.find(f=>f.id===b.id);if(!fee)throw Error('Quota inesistente.');fee.paid=b.paid;
 }else throw Error('Operazione non disponibile.');
 save();
 }
 };
})();

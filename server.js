import http from 'node:http';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const adminUser = process.env.ADMIN_USER;
const adminPassword = process.env.ADMIN_PASSWORD;
if (Boolean(adminUser) !== Boolean(adminPassword)) throw Error('Configura sia ADMIN_USER sia ADMIN_PASSWORD.');
if (adminPassword && (adminPassword.length < 16 || adminUser.includes(':'))) throw Error('Usa una password di almeno 16 caratteri e un utente senza due punti.');
if (process.env.NODE_ENV === 'production' && !adminPassword) throw Error('In produzione sono obbligatori ADMIN_USER e ADMIN_PASSWORD.');
const passwordHash = adminPassword ? scryptSync(adminPassword, 'vivaio360-login', 32) : null;
function authorized(req) {
 if (!passwordHash) return true;
 const header = req.headers.authorization || '';
 if (!header.startsWith('Basic ')) return false;
 const credentials = Buffer.from(header.slice(6), 'base64').toString('utf8');
 const separator = credentials.indexOf(':');
 if (separator < 0) return false;
 const hash = scryptSync(credentials.slice(separator + 1), 'vivaio360-login', 32);
 return timingSafeEqual(hash, passwordHash) && credentials.slice(0, separator) === adminUser;
} 
const path = process.env.DB_PATH || resolve(root, 'data/vivaio360.sqlite');
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS teams(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS athletes(id INTEGER PRIMARY KEY,name TEXT NOT NULL,birth TEXT NOT NULL,parent TEXT NOT NULL,phone TEXT NOT NULL,team_id INTEGER NOT NULL REFERENCES teams(id));
CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY,team_id INTEGER NOT NULL REFERENCES teams(id),date TEXT NOT NULL,place TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attendance(session_id INTEGER REFERENCES sessions(id),athlete_id INTEGER REFERENCES athletes(id),present INTEGER NOT NULL CHECK(present IN (0,1)),PRIMARY KEY(session_id,athlete_id));
CREATE TABLE IF NOT EXISTS fees(id INTEGER PRIMARY KEY,athlete_id INTEGER NOT NULL REFERENCES athletes(id),description TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),due TEXT NOT NULL,paid INTEGER NOT NULL DEFAULT 0 CHECK(paid IN (0,1)));`);
const all = (table) => db.prepare(`SELECT * FROM ${table}`).all();
const required = (obj, keys) => { for (const key of keys) if (typeof obj[key] !== 'string' || !obj[key].trim() || obj[key].length > 200) throw Error('Compila tutti i campi (massimo 200 caratteri).'); };
const id = v => { if (!Number.isSafeInteger(Number(v)) || Number(v)<=0) throw Error('Selezione non valida.'); return Number(v); };
const date = value => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) throw Error('Data non valida.'); };
const json = (res,status,data) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
export const server = http.createServer(async(req,res) => {
 try {
 const url = new URL(req.url,'http://localhost');
 if (url.pathname === '/healthz' && req.method === 'GET') {
  db.prepare('SELECT 1').get();return json(res,200,{ok:true});
 }
 if (!authorized(req)) {
  res.writeHead(401, {'WWW-Authenticate':'Basic realm="Vivaio360", charset="UTF-8"','Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});
  return res.end('Accedi con le credenziali della scuola calcio.');
 }
 if(url.pathname.startsWith('/api/')) {
 if(req.method==='GET' && url.pathname==='/api/state') return json(res,200,{teams:all('teams'),athletes:all('athletes'),sessions:all('sessions'),attendance:all('attendance'),fees:all('fees')});
 if(req.method!=='POST') return json(res,405,{error:'Metodo non consentito.'});
 if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) return json(res,415,{error:'Usa application/json.'});
 if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res,403,{error:'Origine non consentita.'});
 let body='';for await (const chunk of req) {body+=chunk;if(body.length>16384) return json(res,413,{error:'Richiesta troppo grande.'});}
 const b=JSON.parse(body || '{}');
 switch(url.pathname) {
 case '/api/teams': required(b,['name','category']);db.prepare('INSERT INTO teams(name,category) VALUES(?,?)').run(b.name.trim(),b.category.trim());break;
 case '/api/athletes':required(b,['name','birth','parent','phone']);date(b.birth);if(b.birth>new Date().toISOString().slice(0,10)) throw Error('La nascita non può essere nel futuro.');db.prepare('INSERT INTO athletes(name,birth,parent,phone,team_id) VALUES(?,?,?,?,?)').run(b.name.trim(),b.birth,b.parent.trim(),b.phone.trim(),id(b.team_id));break;
 case '/api/sessions':required(b,['date','place']);date(b.date);db.prepare('INSERT INTO sessions(team_id,date,place) VALUES(?,?,?)').run(id(b.team_id),b.date,b.place.trim());break;
 case '/api/attendance': {
 const sid=id(b.session_id),aid=id(b.athlete_id);
 if(![0,1].includes(b.present)) throw Error('Presenza non valida.');
 if(!db.prepare('SELECT a.id FROM athletes a JOIN sessions s ON s.team_id=a.team_id WHERE a.id=? AND s.id=?').get(aid,sid)) throw Error('Atleta e allenamento devono appartenere alla stessa squadra.');
 db.prepare('INSERT INTO attendance VALUES(?,?,?) ON CONFLICT(session_id,athlete_id) DO UPDATE SET present=excluded.present').run(sid,aid,b.present);break;}
 case '/api/fees':required(b,['description','due']);date(b.due);if(!Number.isSafeInteger(b.amount)||b.amount<=0||b.amount>10000000) throw Error('Importo non valido.');db.prepare('INSERT INTO fees(athlete_id,description,amount,due) VALUES(?,?,?,?)').run(id(b.athlete_id),b.description.trim(),b.amount,b.due);break;
 case '/api/payments':if(![0,1].includes(b.paid)) throw Error('Stato non valido.');if(!db.prepare('UPDATE fees SET paid=? WHERE id=?').run(b.paid,id(b.id)).changes) throw Error('Quota inesistente.');break;
 default:return json(res,404,{error:'Risorsa inesistente.'});
 }
 return json(res,201,{ok:true});
 }
 if(req.method!=='GET') return json(res,405,{error:'Metodo non consentito.'});
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
 const file=files[url.pathname];if(!file) return json(res,404,{error:'Risorsa inesistente.'});
 res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(readFileSync(resolve(root,'public',file)));
 } catch(error) {json(res,400,{error:error.message.includes('FOREIGN KEY')?'Seleziona una squadra o un atleta esistente.':error.message});}
});
if(process.argv[1]===fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('Vivaio360 in ascolto sulla porta '+(process.env.PORT||3000)));

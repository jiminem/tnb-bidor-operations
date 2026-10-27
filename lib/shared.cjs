const crypto = require('node:crypto');
const COOKIE = 'tnb_staff_session';
const validStaff = value => typeof value === 'string' && /^\d{6,10}$/.test(value);
const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fail = (status,message) => { const e=new Error(message);e.status=status;throw e; };
function validDate(day) { if (typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;const d=new Date(day+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day&&day<=today(); }
function initial() { return {daily:{},closed:{},crp:{rows:[],source:'',updated:null,version:0},link:'',revision:0}; }
function sessionToken(staff,secret) {const payload=Buffer.from(JSON.stringify({staff,exp:Date.now()+12*60*60*1000})).toString('base64url');return payload+'.'+crypto.createHmac('sha256',secret).update(payload).digest('base64url');}
function sessionStaff(req,secret) {
  try {const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!value)return null;const [payload,signature,...extra]=value.split('.');if(extra.length||!signature)return null;const expected=crypto.createHmac('sha256',secret).update(payload).digest();const actual=Buffer.from(signature,'base64url');if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return null;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return validStaff(data.staff)&&data.exp>Date.now()?data.staff:null;} catch{return null;}
}
function equalSecret(a,b) {const digest=s=>crypto.createHash('sha256').update(String(s||'')).digest();return crypto.timingSafeEqual(digest(a),digest(b));}
function snapshot(state) {
  const records=[],versions={},remarks={};
  for(const [key,row] of Object.entries(state.daily)){const [day,staff]=key.split('|');versions[key]=row.version;remarks[key]=row.remark||'';const counts=[...row.counts];counts[16]=(counts[16]||0)+(counts[21]||0);counts[21]=0;counts.forEach((count,service)=>{if(count>0)records.push({day,staff,service,count});});if(row.legacy>0)records.push({day,staff,service:'uncategorized',count:row.legacy});if(!row.counts.some(Boolean)&&!row.legacy)records.push({day,staff,service:0,count:0});}
  return {records,versions,remarks,closed:state.closed,crp:state.crp,link:state.link,revision:state.revision,serverDay:today()};
}
function amount(n) {return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9&&Math.abs(n*100-Math.round(n*100))<0.0001;}
function crpRows(rows) {if(!Array.isArray(rows)||rows.length>5000)fail(400,'A maximum of 5,000 CRP rows is supported.');const dates=new Set();return rows.map(r=>{if(!r||!validDate(r.day)||dates.has(r.day)||!amount(r.collection)||!amount(r.recovery))fail(400,'CRP dates or amounts are invalid or duplicated.');dates.add(r.day);return {day:r.day,collection:r.collection,recovery:r.recovery};});}
function sheetLink(link){if(!link)return '';try{const u=new URL(link);if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||!/^\/spreadsheets\/d\/e\/[\w-]+\/pub\/?$/.test(u.pathname)||u.username||u.password||u.port)throw Error();return u.href;}catch{fail(400,'Use a published Google Sheets CSV URL.');}}
function mutate(state,staff,body) {
  const {action}=body;
  if(['increment','correct','close','remark'].includes(action)){
    const day=body.day;if(!validDate(day))fail(400,'Choose today or an earlier valid date.');const key=day+'|'+staff;
    const row=state.daily[key]||{counts:Array(22).fill(0),legacy:0,version:0};
    if(action==='remark'){
      if(body.expectedVersion!==row.version)fail(409,'This day changed on another device. Reload before saving remarks.');
      if(typeof body.remark!=='string'||body.remark.length>2000)fail(400,'Remarks must be text up to 2,000 characters.');
      row.remark=body.remark.trim();row.version++;state.daily[key]=row;
    }
    if(action==='increment'){
      if(day!==today()||state.closed[key])fail(409,'Operations are closed or the date has changed.');
      if(!Number.isInteger(body.service)||body.service<0||body.service>21)fail(400,'Invalid service.');
      if(row.counts[body.service===21?16:body.service]>=100000)fail(400,'Daily limit reached.');
      row.counts[body.service===21?16:body.service]++;row.version++;state.daily[key]=row;
    }
    if(action==='correct'){
      if(body.expectedVersion!==row.version)fail(409,'This day changed on another device. Reload the counts before correcting.');
      const counts=body.counts,legacy=body.legacy??0;
      if(!Array.isArray(counts)||counts.length!==22||[...counts,legacy].some(n=>!Number.isSafeInteger(n)||n<0||n>100000))fail(400,'Counts must be whole numbers from 0 to 100,000.');
      state.daily[key]={counts:[...counts.slice(0,16),counts[16]+counts[21],...counts.slice(17,21),0],remark:row.remark||'',legacy,version:row.version+1};
    }
    if(action==='close'){if(day!==today()||typeof body.closed!=='boolean')fail(400,'Only today can be opened or closed.');state.closed[key]=body.closed;}
  }else if(action==='crp-replace'||action==='crp-upsert'){
    if(body.expectedVersion!==state.crp.version)fail(409,'CRP data changed on another device. Review the refreshed data before saving again.');
    const rows=action==='crp-replace'?crpRows(body.rows):crpRows([...state.crp.rows.filter(r=>r.day!==body.row?.day),body.row]);
    state.crp={rows,source:String(body.source||'Shared CRP data').slice(0,200),updated:new Date().toISOString(),staff,version:state.crp.version+1};
    if(body.link!==undefined)state.link=sheetLink(body.link);
  }else if(action==='unlink'){state.link='';}
  else fail(400,'Unknown action.');
  state.revision++;return state;
}
module.exports={COOKIE,validStaff,today,fail,initial,sessionToken,sessionStaff,equalSecret,snapshot,mutate};

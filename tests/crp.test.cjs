const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),XLSX=require('../vendor/xlsx.full.min.js'),S=require('../lib/shared.cjs');
const els={},html=fs.readFileSync('crp.html','utf8');
for(const m of html.matchAll(/id="([^"]+)"/g)){const id=m[1];let v='';const e={textContent:'',hidden:false,disabled:false,classList:{toggle(){}},querySelector(){return {disabled:false}},reset(){},focus(){},scrollIntoView(){}};Object.defineProperty(e,'value',{get:()=>v,set:x=>v=String(x)});Object.defineProperty(e,'innerHTML',{get:()=>e.html||'',set:s=>{e.html=s;if(['worksheet','dateColumn','collectionColumn','recoveryColumn'].includes(id))v=(s.match(/value="([^"]*)"/)||[])[1]||''}});els[id]=e;}
let state=S.initial(),notify;const staff='10077218';
const shared={onChange(fn){notify=fn},start(){notify({staff,...S.snapshot(state)})},async mutate(action,values){S.mutate(state,staff,{action,...values});this.start()},async logout(){notify(null)}};
const ctx={console,XLSX,Intl,Date,URL,Blob,TextDecoder,AbortSignal,SharedDashboard:shared,localStorage:{getItem(){return null},setItem(){}},document:{getElementById:id=>els[id],documentElement:{},body:{classList:{toggle(){}}}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('crp.js','utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
(async()=>{
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Date','Collection','Recovery'],[S.today(),123.45,67.89]]),'Daily');
 for(const type of ['xlsx','biff8','csv']){ctx.bytes=XLSX.write(wb,{bookType:type,type:'buffer'});run("preview(bytes,'Test file')");assert.equal(run('pending.length'),1);}
 await els.confirmImport.onclick();assert.equal(state.crp.rows[0].collection,123.45);assert.equal(els.collectionTotal.textContent,'123.45');
 els.crpDate.value=S.today();els.crpDate.onchange();els.manualCollection.value='200';els.manualRecovery.value='50';els.manualForm.oninput();await els.manualForm.onsubmit({preventDefault(){}});assert.equal(state.crp.rows[0].collection,200);
 els.manualCollection.value='400';els.manualForm.oninput();S.mutate(state,'10075849',{action:'crp-upsert',row:{day:S.today(),collection:300,recovery:60},expectedVersion:state.crp.version});shared.start();await els.manualForm.onsubmit({preventDefault(){}});assert.equal(state.crp.rows[0].collection,300);assert.match(els.manualMessage.textContent,/another device/);
 assert.equal(run("parseAmount('RM 1,234.56')"),1234.56);assert.equal(run("parseDay('31/02/2026')"),null);assert.throws(()=>run("sheetCsvUrl('https://example.com/test')"));
 els.language.onchange({target:{value:'ms'}});assert.equal(els.importTitle.textContent,'Tambah data CRP');
 console.log('PASS CRP shared UI: Excel/XLS/CSV, preview, shared save, manual updates, cross-staff conflicts, validation, translations.');
})().catch(e=>{console.error(e);process.exitCode=1});

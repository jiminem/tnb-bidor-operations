const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let staff = null;
let lang = localStorage.getItem('Kedai Tenaga TNB Bidor-cs-language') === 'ms' ? 'ms' : 'en';
let data = {rows:[], updated:null, source:'',version:0};
let previewVersion=0, manualVersion=0, manualDirty=false;
let workbook = null, pending = [], pendingSource = '', pendingUrl = '', busy = false;
const text = {
  en: {dailyNav:'Daily Operations',crpNav:'CRP Dashboard',eyebrow:'Collection & Recovery',title:'CRP Dashboard',subtitle:'Import spreadsheets or enter daily collection and recovery amounts.',collectionLabel:'Collection (RM)',recoveryLabel:'Recovery (RM)',updatedLabel:'Last updated',logout:'Log out',importTitle:'Add CRP data',importHelp:'Upload a spreadsheet, link Google Sheets, or enter daily amounts manually.',uploadTitle:'Import Excel / CSV',fileLabel:'Choose a spreadsheet',fileHelp:'Excel, CSV or TSV, up to 5 MB. The first row must contain column headings.',templateBtn:'Download CSV template',sheetsTitle:'Link Google Sheets',urlLabel:'Published CSV link',sheetsHelp:'In Google Sheets, use File → Share → Publish to web and choose CSV. Published data is public; use file import for private data. This connection is read-only.',fetchBtn:'Load / refresh preview',unlinkBtn:'Unlink',previewTitle:'Review spreadsheet',worksheetLabel:'Worksheet',dateColumnLabel:'Date column',collectionColumnLabel:'Collection (RM) column',recoveryColumnLabel:'Recovery (RM) column',replaceHelp:'Saving replaces the CRP dataset with all rows in this preview. Daily Operations data is unaffected.',confirmImport:'Replace CRP data',cancelImport:'Cancel preview',manualTitle:'Manual daily entry',manualHelp:'One total per date. Saving an existing date updates its amounts.',manualDateLabel:'Date',manualCollectionLabel:'Collection (RM)',manualRecoveryLabel:'Recovery (RM)',manualSave:'Save daily amounts',overviewTitle:'Collection & Recovery records',exportCrp:'Export CSV',recordDateLabel:'Date',recordCollectionLabel:'Collection (RM)',recordRecoveryLabel:'Recovery (RM)',empty:'No CRP records yet.',edit:'Edit',saved:'CRP data saved for all staff.',noData:'No data yet',choose:'Choose column',invalidMap:'Select three different columns.',invalidRows:'Invalid or duplicate dates / amounts in spreadsheet rows: ',validRows:'valid rows. Preview shows the first 10. All rows will be saved.',reading:'Reading spreadsheet…',loading:'Loading Google Sheets…',loadError:'Could not load this sheet. Check the published CSV link and access, or download it as Excel and import the file.',fileError:'Could not read this file. Use a valid Excel, CSV or TSV file.',limit:'Use a file up to 5 MB and at most 5,000 data rows.',emptySheet:'The worksheet needs a header row and at least one data row.',previewReady:'Review the columns and amounts, then save the preview.',storageError:'Could not save to the shared database. Please retry.',invalidManual:'Enter a valid date (today or earlier) and non-negative amounts with at most two decimal places.',unlinked:'Google Sheets link removed. Saved CRP data is retained.',linkError:'Use a Google Sheets published CSV link from docs.google.com.',noExport:'No CRP records to export.'},
  ms: {dailyNav:'Operasi Harian',crpNav:'Papan Pemuka CRP',eyebrow:'Kutipan & Pemulihan',title:'Papan Pemuka CRP',subtitle:'Import hamparan atau masukkan jumlah kutipan dan pemulihan harian.',collectionLabel:'Kutipan (RM)',recoveryLabel:'Pemulihan (RM)',updatedLabel:'Kemas kini terakhir',logout:'Log keluar',importTitle:'Tambah data CRP',importHelp:'Muat naik hamparan, pautkan Google Sheets, atau masukkan jumlah secara manual.',uploadTitle:'Import Excel / CSV',fileLabel:'Pilih hamparan',fileHelp:'Excel, CSV atau TSV, sehingga 5 MB. Baris pertama mesti mengandungi tajuk lajur.',templateBtn:'Muat turun templat CSV',sheetsTitle:'Pautkan Google Sheets',urlLabel:'Pautan CSV diterbitkan',sheetsHelp:'Dalam Google Sheets, pilih File → Share → Publish to web dan CSV. Data yang diterbitkan adalah awam; gunakan import fail untuk data peribadi. Sambungan ini baca sahaja.',fetchBtn:'Muat / segar semula pratonton',unlinkBtn:'Nyahpaut',previewTitle:'Semak hamparan',worksheetLabel:'Lembaran',dateColumnLabel:'Lajur tarikh',collectionColumnLabel:'Lajur kutipan (RM)',recoveryColumnLabel:'Lajur pemulihan (RM)',replaceHelp:'Simpanan menggantikan dataset CRP dengan semua baris pratonton ini. Data Operasi Harian tidak berubah.',confirmImport:'Gantikan data CRP',cancelImport:'Batal pratonton',manualTitle:'Kemasukan harian manual',manualHelp:'Satu jumlah untuk setiap tarikh. Simpan tarikh sedia ada untuk mengemas kini jumlah.',manualDateLabel:'Tarikh',manualCollectionLabel:'Kutipan (RM)',manualRecoveryLabel:'Pemulihan (RM)',manualSave:'Simpan jumlah harian',overviewTitle:'Rekod kutipan & pemulihan',exportCrp:'Eksport CSV',recordDateLabel:'Tarikh',recordCollectionLabel:'Kutipan (RM)',recordRecoveryLabel:'Pemulihan (RM)',empty:'Belum ada rekod CRP.',edit:'Edit',saved:'Data CRP disimpan untuk semua staf.',noData:'Belum ada data',choose:'Pilih lajur',invalidMap:'Pilih tiga lajur berbeza.',invalidRows:'Tarikh / jumlah tidak sah atau tarikh berulang pada baris: ',validRows:'baris sah. Pratonton menunjukkan 10 baris pertama. Semua baris akan disimpan.',reading:'Membaca hamparan…',loading:'Memuatkan Google Sheets…',loadError:'Tidak dapat memuatkan lembaran. Semak pautan CSV dan akses atau muat turun sebagai Excel untuk diimport.',fileError:'Tidak dapat membaca fail. Gunakan fail Excel, CSV atau TSV yang sah.',limit:'Gunakan fail sehingga 5 MB dan maksimum 5,000 baris data.',emptySheet:'Lembaran memerlukan tajuk lajur dan sekurang-kurangnya satu baris data.',previewReady:'Semak lajur dan jumlah, kemudian simpan pratonton.',storageError:'Tidak dapat menyimpan. Storan pelayar mungkin penuh. Data sedia ada tidak berubah.',invalidManual:'Masukkan tarikh sah (hari ini atau sebelumnya) dan jumlah bukan negatif dengan maksimum dua tempat perpuluhan.',unlinked:'Pautan Google Sheets dibuang. Data CRP tersimpan dikekalkan.',linkError:'Gunakan pautan CSV Google Sheets diterbitkan daripada docs.google.com.',noExport:'Tiada rekod CRP untuk dieksport.'}
};
const t = key => text[lang][key];
const money = n => new Intl.NumberFormat(lang === 'ms' ? 'ms-MY' : 'en-MY',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
function parseDay(value) {
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    value = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(value ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) { const parts = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); if (parts) m = [s,parts[3],parts[2],parts[1]]; }
  if (!m) return null;
  const iso = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === iso && iso <= today() ? iso : null;
}
function parseAmount(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const s = String(value).trim().replace(/^RM\s*/i,'');
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s.replace(/,/g,''));
  return Number.isFinite(n) && n >= 0 && n <= 1000000000 ? Math.round(n*100)/100 : null;
}
function render() {
  Object.entries(text[lang]).forEach(([id,value]) => { if ($(id)) $(id).textContent = value; });
  globalThis.DashboardUI?.updateDate(lang);
  document.documentElement.lang = lang; $('language').value = lang; $('staffLabel').textContent = staff || '';
  const hasData = data.rows.length > 0;
  const totalCents = key => data.rows.reduce((n,r) => n + Math.round(r[key]*100),0)/100;
  $('collectionTotal').textContent = hasData ? money(totalCents('collection')) : '—';
  $('recoveryTotal').textContent = hasData ? money(totalCents('recovery')) : '—';
  const updated = new Date(data.updated);
  $('lastUpdated').textContent = data.updated && Number.isFinite(updated.getTime()) ? updated.toLocaleDateString(lang === 'ms' ? 'ms-MY':'en-GB',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'short',year:'numeric'}) : '—';
  $('collectionNote').textContent = hasData ? `${data.rows.length} ${lang === 'ms' ? 'rekod harian' : 'daily records'}` : t('noData');
  $('recoveryNote').textContent = $('collectionNote').textContent;
  $('updatedNote').textContent = hasData ? (lang === 'ms' ? 'Dikongsi antara peranti staf' : 'Shared across staff devices') : t('noData');
  $('crpRows').innerHTML = hasData ? [...data.rows].sort((a,b) => b.day.localeCompare(a.day)).map(r => `<tr><td>${esc(r.day)}</td><td>${money(r.collection)}</td><td>${money(r.recovery)}</td><td><button class="action-link" data-day="${esc(r.day)}">${t('edit')}</button></td></tr>`).join('') : `<tr><td colspan="4" class="empty">${t('empty')}</td></tr>`;
  $('crpSummary').textContent = `${data.rows.length} ${lang === 'ms' ? 'rekod' : 'records'}`;
  $('sourceLabel').textContent = data.source || t('noData');
  if (workbook && !$('previewSection').hidden) updatePreview();
}
function showSession() {

  document.body.classList.toggle('authenticated',!!staff); $('login').classList.toggle('open',!staff); render();
}
function message(key) { $('importMessage').textContent = t(key); }
function resetPreview() { workbook = null; pending = []; pendingUrl = ''; $('previewSection').hidden = true; $('confirmImport').disabled = true; }
function setBusy(value) { busy = value; $('fetchBtn').disabled = value; $('importFile').disabled = value; $('unlinkBtn').disabled = value; }
function sheetRows() {
  const sheet = workbook.Sheets[$('worksheet').value];
  if (!sheet['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  if (range.e.r > 5000 || range.e.c > 255) throw new Error('limit');
  const rows = [];
  for (let r = 0; r <= range.e.r; r++) {
    const row = [];
    for (let c = 0; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({r,c})];
      row.push(cell ? (cell.t === 'e' ? '#ERROR' : cell.v ?? '') : '');
    }
    rows.push(row);
  }
  return rows;
}
function selectSheet() {
  const rows = sheetRows(), headers = rows[0] || [];
  const options = '<option value="">'+esc(t('choose'))+'</option>' + headers.map((h,i) => `<option value="${i}">${esc(h || `Column ${i+1}`)}</option>`).join('');
  const aliases = {dateColumn:/^(date|tarikh|day)$/i,collectionColumn:/^(collection|kutipan)(\s*\(?rm\)?)?$/i,recoveryColumn:/^(recovery|pemulihan)(\s*\(?rm\)?)?$/i};
  for (const [id,pattern] of Object.entries(aliases)) { $(id).innerHTML = options; const i = headers.findIndex(h => pattern.test(String(h).trim())); $(id).value = i < 0 ? '' : String(i); }
  updatePreview();
}
function updatePreview() {
  pending = []; $('confirmImport').disabled = true; $('previewRows').innerHTML = '';
  const values = ['dateColumn','collectionColumn','recoveryColumn'].map(id => $(id).value);
  if (values.includes('') || new Set(values).size !== 3) { $('previewSummary').textContent = t('invalidMap'); return; }
  const rows = sheetRows();
  if (rows.length < 2) { $('previewSummary').textContent = t('emptySheet'); return; }
  if (rows.length > 5001) { $('previewSummary').textContent = t('limit'); return; }
  const invalid = [], dates = new Set();
  rows.slice(1).forEach((row,i) => {
    if (row.every(cell => String(cell).trim() === '')) return;
    const day = parseDay(row[values[0]]), collection = parseAmount(row[values[1]]), recovery = parseAmount(row[values[2]]);
    if (!day || collection === null || recovery === null || dates.has(day)) invalid.push(i+2);
    else { dates.add(day); pending.push({day,collection,recovery}); }
  });
  if (invalid.length) { $('previewSummary').textContent = t('invalidRows')+invalid.slice(0,15).join(','); pending = []; return; }
  if (!pending.length) { $('previewSummary').textContent = t('emptySheet'); return; }
  $('previewRows').innerHTML = pending.slice(0,10).map(r => `<tr><td>${r.day}</td><td>${money(r.collection)}</td><td>${money(r.recovery)}</td></tr>`).join('');
  $('previewSummary').textContent = `${pending.length} ${t('validRows')}`;
  $('confirmImport').disabled = false;
}
function preview(bytes,source,url='') {
  if (!globalThis.XLSX) throw new Error('fileError');
  workbook = XLSX.read(bytes,{type:'array',cellDates:false,cellNF:true,raw:true});
  if (!workbook.SheetNames.length) throw new Error('emptySheet');
  // Convert Excel's optional 1904 date system to standard date serials.
  if (workbook.Workbook?.WBProps?.date1904) {
    for (const name of workbook.SheetNames) for (const [key,cell] of Object.entries(workbook.Sheets[name])) if (!key.startsWith('!') && cell.t === 'n' && XLSX.SSF.is_date(cell.z || '')) cell.v += 1462;
  }
  previewVersion=data.version; pendingSource = source; pendingUrl = url;
  $('worksheet').innerHTML = workbook.SheetNames.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  $('previewSection').hidden = false; selectSheet(); message('previewReady');
}
function sheetCsvUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.username || url.password || url.port) throw new Error('linkError');
  const match = url.pathname.match(/^\/spreadsheets\/d\/e\/([A-Za-z0-9_-]+)\/pub(?:html)?\/?$/);
  if (!match) throw new Error('linkError');
  const gid = url.searchParams.get('gid');
  const out = new URL(`https://docs.google.com/spreadsheets/d/e/${match[1]}/pub`);
  out.searchParams.set('output','csv'); if (gid !== null) { if (!/^\d+$/.test(gid)) throw new Error('linkError'); out.searchParams.set('gid',gid); }
  out.searchParams.set('single','true'); return out.href;
}
async function saveShared(action,payload) {
  if(!staff)return false;
  try{await SharedDashboard.mutate(action,payload);return true;}
  catch(e){$('importMessage').textContent=e.message;$('manualMessage').textContent=e.message;return false;}
}
$('loginForm').onsubmit = async e => {e.preventDefault();const button=$('loginForm').querySelector('button');button.disabled=true;try{await SharedDashboard.login($('staffNumber').value.trim());$('loginError').textContent='';$('loginForm').reset();}catch(e){$('loginError').textContent=e.message;}finally{button.disabled=false;}};
$('logout').onclick = async () => {try{await SharedDashboard.logout();resetPreview();}catch(e){$('importMessage').textContent=e.message;}};
$('language').onchange = e => { lang=e.target.value; localStorage.setItem('Kedai Tenaga TNB Bidor-cs-language',lang); render(); };
$('worksheet').onchange = () => { try { selectSheet(); } catch { pending=[]; $('confirmImport').disabled=true; $('previewRows').innerHTML=''; $('previewSummary').textContent=t('limit'); } };
for (const id of ['dateColumn','collectionColumn','recoveryColumn']) $(id).onchange = updatePreview;
$('importFile').onchange = async e => {
  if (!staff || busy) return;
  const file = e.target.files[0]; if (!file) return;
  resetPreview(); if (file.size > 5*1024*1024) { message('limit'); return; }
  if (!/\.(xlsx|xls|csv|tsv)$/i.test(file.name)) { message('fileError'); return; }
  setBusy(true); message('reading');
  try { preview(await file.arrayBuffer(),file.name); } catch { resetPreview(); message('fileError'); }
  finally { setBusy(false); e.target.value=''; }
};
$('sheetsForm').onsubmit = async e => {
  e.preventDefault(); if (!staff || busy) return;
  resetPreview(); let url;
  try { url = sheetCsvUrl($('sheetsUrl').value.trim()); } catch { message('linkError'); return; }
  setBusy(true); message('loading');
  try {
    const response = await fetch(url,{signal:AbortSignal.timeout(20000),credentials:'omit'});
    if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('loadError');
    if (Number(response.headers.get('content-length')) > 5*1024*1024) throw new Error('limit');
    const bytes = await response.arrayBuffer(); if (bytes.byteLength > 5*1024*1024) throw new Error('limit');
    const beginning = new TextDecoder().decode(bytes.slice(0,200)).trim();
    if (/^<!doctype|^<html/i.test(beginning)) throw new Error('loadError');
    preview(bytes,'Google Sheets',url);
  } catch (err) { resetPreview(); message(err.message === 'limit' ? 'limit' : 'loadError'); }
  finally { setBusy(false); }
};
$('confirmImport').onclick = async () => {
  if(!staff||!pending.length||$('confirmImport').disabled)return;
  const rows=pending.map(r=>({...r})),source=pendingSource,link=pendingUrl||undefined,expectedVersion=previewVersion;
  $('confirmImport').disabled=true;
  if(await saveShared('crp-replace',{rows,source,link,expectedVersion})){resetPreview();message('saved');loadManual();}
  else if(workbook)updatePreview();
};
$('cancelImport').onclick = () => { resetPreview(); $('importMessage').textContent=''; };
$('unlinkBtn').onclick = async () => {if(!staff||busy)return;if(await saveShared('unlink',{})){resetPreview();message('unlinked');}};
function loadManual() {
  manualVersion=data.version; manualDirty=false;
  const r = data.rows.find(row => row.day === $('crpDate').value);
  $('manualCollection').value = r ? r.collection : ''; $('manualRecovery').value = r ? r.recovery : ''; $('manualMessage').textContent='';
}
$('crpDate').max=today(); $('crpDate').value=today(); $('crpDate').onchange=loadManual;
$('manualForm').oninput = () => {manualDirty=true;};
$('manualForm').onsubmit = async e => {
  e.preventDefault(); if (!staff) return;
  const day=parseDay($('crpDate').value), collection=parseAmount($('manualCollection').value), recovery=parseAmount($('manualRecovery').value);
  if (!day || collection === null || recovery === null) { $('manualMessage').textContent=t('invalidManual'); return; }
  $('manualSave').disabled=true;
  if(await saveShared('crp-upsert',{row:{day,collection,recovery},source:'Manual / imported data',expectedVersion:manualVersion})){manualDirty=false;resetPreview();loadManual();$('manualMessage').textContent=t('saved');}
  else{manualVersion=data.version;}
  $('manualSave').disabled=false;
};
$('crpRows').onclick = e => { const b=e.target.closest('[data-day]'); if (!b) return; $('crpDate').value=b.dataset.day; loadManual(); $('manualForm').scrollIntoView({behavior:'smooth',block:'center'}); $('manualCollection').focus(); };
function download(csv,name) { const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
$('templateBtn').onclick = () => download('Date,Collection,Recovery\r\n','crp-template.csv');
$('exportCrp').onclick = () => { if (!staff) return; if (!data.rows.length) { message('noExport'); return; } download('Date,Collection,Recovery\r\n'+[...data.rows].sort((a,b)=>a.day.localeCompare(b.day)).map(r=>`${r.day},${r.collection.toFixed(2)},${r.recovery.toFixed(2)}`).join('\r\n'),'crp-records.csv'); };
SharedDashboard.onChange(next=>{
  const previous=staff;staff=next?.staff||null;data=next?.crp||{rows:[],source:'',updated:null,version:0};
  if(document.activeElement!==$('sheetsUrl'))$('sheetsUrl').value=next?.link||'';
  if(previous!==staff){resetPreview();loadManual();showSession();}else{if(!manualDirty)loadManual();render();}
});
loadManual();showSession();SharedDashboard.start();

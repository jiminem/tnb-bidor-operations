/* Pure aggregation is exported for tests; browser controls never modify records. */
(function(root){
  const daysIn=month=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
  const previous=month=>{const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);return d.toISOString().slice(0,7);};
  function compare(records,services,month,baseline,staff='',range='full',currentDay,serviceOrder){
    const current=currentDay||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const limit=m=>Math.min(daysIn(m),m===current.slice(0,7)?Number(current.slice(8)):daysIn(m));
    const matched=Math.min(limit(month),limit(baseline));
    const bounds=[month,baseline].map(m=>range==='matched'?matched:limit(m));
    const sets=[month,baseline].map((m,i)=>records.filter(r=>r.day.startsWith(m)&&(!staff||r.staff===staff)&&Number(r.day.slice(8))<=bounds[i]));
    const sum=rows=>rows.reduce((n,r)=>n+r.count,0);
    const totals=sets.map(sum),change=totals[0]-totals[1];
    const keys=(serviceOrder || services.map((_,id)=>id)).map((id,index)=>({id,name:services[id],number:index+1}));
    if(sets.some(rows=>rows.some(r=>r.service==='uncategorized')))keys.push({id:'uncategorized',name:'Previous totals (unassigned)',number:'—'});
    const rows=keys.map(item=>{const values=sets.map(s=>sum(s.filter(r=>r.service===item.id)));return {...item,values,change:values[0]-values[1]};});
    function trend(service='all') {return sets.map((set,i)=>{let total=0;return Array.from({length:bounds[i]},(_,d)=>{total+=sum(set.filter(r=>Number(r.day.slice(8))===d+1&&(service==='all'||String(r.service)===String(service))));return total;});});}
    return {totals,change,percent:totals[1]===0?null:change/totals[1]*100,rows,bounds,sets,trend,current,hasData:sets.some(s=>s.length>0)};
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let context,initialized=false,lastMonth='',customBaseline=false;
  function render(args){
    const $=id=>document.getElementById(id);if(!$('compareMonth'))return;
    context=args;
    const {records,services,lang,month}=args,ms=lang==='ms';
    const pick=(en,my)=>ms?my:en;
    const number=n=>n.toLocaleString(ms?'ms-MY':'en-GB');
    const name=m=>new Intl.DateTimeFormat(ms?'ms-MY':'en-GB',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T12:00:00Z'));
    if(lastMonth!==month){if(!customBaseline||!$('compareMonth').value)$('compareMonth').value=previous(month);lastMonth=month;}
    const baseline=$('compareMonth').value||previous(month);$('compareMonth').value=baseline;
    const oldStaff=$('analysisStaff').value;
    const staffIds=[...new Set(records.map(r=>r.staff))].sort();
    $('analysisStaff').innerHTML=`<option value="">${pick('All staff','Semua staf')}</option>`+staffIds.map(id=>`<option value="${esc(id)}">${esc(id)}</option>`).join('');
    $('analysisStaff').value=staffIds.includes(oldStaff)?oldStaff:'';
    const model=compare(records,services,month,baseline,$('analysisStaff').value,$('analysisRange').value||'full',undefined,args.serviceOrder);
    const oldService=$('analysisService').value||'all';
    $('analysisService').innerHTML=`<option value="all">${pick('All services','Semua perkhidmatan')}</option>`+model.rows.map(r=>`<option value="${r.id}">${r.number}. ${esc(r.id==='uncategorized'?pick('Previous totals (unassigned)','Jumlah terdahulu (tanpa kategori)'):r.name)}</option>`).join('');
    $('analysisService').value=oldService==='all'||model.rows.some(r=>String(r.id)===oldService)?oldService:'all';
    const labels={compareMonthLabel:pick('Compare with','Bandingkan dengan'),analysisStaffLabel:pick('Staff','Staf'),analysisRangeLabel:pick('Period','Tempoh'),comparisonTrendTitle:pick('Cumulative customers by day','Jumlah terkumpul pelanggan mengikut hari'),serviceCompareTitle:pick('Compare services','Perbandingan perkhidmatan'),serviceCompareHint:pick('Click a service to explore its daily trend.','Klik perkhidmatan untuk melihat trend hariannya.')};
    for(const [id,value]of Object.entries(labels))$(id).textContent=value;
    const rangeLabels=[pick('Full available month','Bulan penuh yang tersedia'),pick('Same day range','Julat hari yang sama')];
    const sortLabels=[pick('Service number','Nombor perkhidmatan'),pick('Highest volume','Jumlah tertinggi'),pick('Largest change','Perubahan terbesar')];
    if($('analysisRange').options)rangeLabels.forEach((v,i)=>$('analysisRange').options[i].textContent=v);
    if($('analysisSort').options)sortLabels.forEach((v,i)=>$('analysisSort').options[i].textContent=v);
    $('analysisService').setAttribute('aria-label',pick('Select a service trend','Pilih trend perkhidmatan'));
    $('analysisSort').setAttribute('aria-label',pick('Sort services','Susun perkhidmatan'));
    const delta=n=>(n>0?'+':'')+number(n);
    const percent=(a,b)=>b===0?(a===0?'0%':pick('No baseline','Tiada asas')):((a-b)>0?'+':'')+((a-b)/b*100).toFixed(1)+'%';
    const periodText=$('analysisRange').value==='matched'?pick(`Days 1–${model.bounds[0]} in both months.`,`Hari 1–${model.bounds[0]} bagi kedua-dua bulan.`):pick(`Days 1–${model.bounds[0]} vs 1–${model.bounds[1]}. Current-month figures are month-to-date.`,`Hari 1–${model.bounds[0]} berbanding 1–${model.bounds[1]}. Angka bulan semasa adalah setakat hari ini.`);
    $('comparisonNote').textContent=periodText+' '+pick('Missing entries count as zero; totals use saved shared records.','Rekod yang tiada dikira sifar; jumlah menggunakan rekod bersama tersimpan.')+(month===baseline?' '+pick('You selected the same month twice.','Anda memilih bulan yang sama dua kali.'):'');
    $('comparisonSummary').innerHTML=`<div class="analysis-stat"><span class="series-dot primary"></span><span>${esc(name(month))}</span><strong>${number(model.totals[0])}</strong><small>${pick('customers','pelanggan')}</small></div><div class="analysis-stat"><span class="series-dot baseline"></span><span>${esc(name(baseline))}</span><strong>${number(model.totals[1])}</strong><small>${pick('customers','pelanggan')}</small></div><div class="analysis-stat"><span>${pick('Difference','Perbezaan')}</span><strong class="${model.change>0?'increase':model.change<0?'decrease':''}">${delta(model.change)}</strong><small>${percent(...model.totals)}</small></div>`;
    const selected=$('analysisService').value;
    const series=model.trend(selected),max=Math.max(1,...series.flat()),maxDays=Math.max(...model.bounds),width=700,height=195,left=45,right=18,top=18,bottom=32;
    const x=i=>left+i/Math.max(1,maxDays-1)*(width-left-right),y=n=>height-bottom-n/max*(height-top-bottom);
    const paths=series.map(s=>s.map((n,i)=>(i?'L':'M')+x(i).toFixed(2)+','+y(n).toFixed(2)).join(' '));
    const grid=[0,.5,1].map(v=>`<line x1="${left}" x2="${width-right}" y1="${y(max*v)}" y2="${y(max*v)}" stroke="#e7edf4"/><text x="${left-8}" y="${y(max*v)+4}" text-anchor="end">${number(Math.round(max*v))}</text>`).join('');
    const ticks=[...new Set([1,Math.min(7,maxDays),Math.min(14,maxDays),Math.min(21,maxDays),maxDays])].map(d=>`<text x="${x(d-1)}" y="${height-10}" text-anchor="middle">${d}</text>`).join('');
    const hoverPoints=series.map((values,j)=>values.map((value,i)=>`<circle class="comparison-hover-point" cx="${x(i)}" cy="${y(value)}" r="6" fill="transparent" tabindex="0" role="img" aria-label="${esc(name(j?baseline:month))}, ${pick('day','hari')} ${i+1}: ${number(value)}"><title>${esc(name(j?baseline:month))}, ${pick('day','hari')} ${i+1}: ${number(value)}</title></circle>`).join('')).join('');
    const selectedName=selected==='all'?pick('All services','Semua perkhidmatan'):model.rows.find(r=>String(r.id)===selected)?.name;
    $('comparisonLegend').innerHTML=`<span><i class="series-dot primary"></i>${esc(name(month))}</span><span><i class="series-dot baseline"></i>${esc(name(baseline))}</span>`;
    $('comparisonChart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(selectedName)}: ${esc(name(month))} ${number(series[0].at(-1)||0)}, ${esc(name(baseline))} ${number(series[1].at(-1)||0)}"><title>${esc(selectedName)}</title>${grid}${ticks}<path d="${paths[1]}" fill="none" stroke="#9c7cc8" stroke-width="2.5" stroke-dasharray="5 4"/><path d="${paths[0]}" fill="none" stroke="#0878c9" stroke-width="3"/>${series.map((s,i)=>s.length?`<circle cx="${x(s.length-1)}" cy="${y(s.at(-1))}" r="4" fill="${i?'#9c7cc8':'#0878c9'}"/>`:'').join('')}${hoverPoints}</svg>`;
    $('comparisonTrendNote').textContent=selectedName+' · '+number(series[0].at(-1)||0)+' / '+number(series[1].at(-1)||0)+' '+pick('customers. X-axis: day of month.','pelanggan. Paksi X: hari dalam bulan.');
    const sorted=[...model.rows];if($('analysisSort').value==='volume')sorted.sort((a,b)=>b.values[0]-a.values[0]||a.number-b.number);if($('analysisSort').value==='change')sorted.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));
    const highest=Math.max(1,...model.rows.flatMap(r=>r.values));
    $('serviceBreakdown').innerHTML=(!model.hasData?`<p class="analysis-empty">${pick('No saved records in these periods. Choose other months or add daily counts.','Tiada rekod tersimpan dalam tempoh ini. Pilih bulan lain atau tambah bilangan harian.')}</p>`:'')+sorted.map(r=>`<button type="button" class="comparison-service ${String(r.id)===selected?'selected':''}" data-analysis-service="${r.id}" aria-pressed="${String(r.id)===selected}"><span class="comparison-service-title"><span class="service-number">${r.number}</span><span>${esc(r.id==='uncategorized'?pick('Previous totals (unassigned)','Jumlah terdahulu (tanpa kategori)'):r.name)}</span><span class="comparison-bars"><span class="comparison-bar-line"><span class="comparison-bar-track"><i style="width:${r.values[0]/highest*100}%"></i></span><strong>${number(r.values[0])}</strong></span><span class="comparison-bar-line baseline"><span class="comparison-bar-track"><i style="width:${r.values[1]/highest*100}%"></i></span><strong>${number(r.values[1])}</strong></span></span><span class="comparison-change"><strong>${delta(r.change)}</strong><small>${percent(...r.values)}</small></span></button>`).join('');
    if(!initialized){initialized=true;
      $('compareMonth').onchange=()=>{customBaseline=true;if(!$('compareMonth').value)$('compareMonth').value=previous(context.month);render(context);};
      for(const id of ['analysisStaff','analysisRange','analysisService','analysisSort'])$(id).onchange=()=>render(context);
      $('serviceBreakdown').onclick=e=>{const button=e.target.closest('[data-analysis-service]');if(!button)return;$('analysisService').value=button.dataset.analysisService;render(context);};
    }
    return model;
  }
  const api={compare,previous,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MonthlyAnalysis=api;
})(globalThis);

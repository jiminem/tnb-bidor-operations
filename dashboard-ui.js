/* Shared presentation helpers. Dashboard records remain in their existing storage. */
globalThis.DashboardUI = {
  updateDate(lang) {
    const element = document.getElementById('dashboardDate');
    if (element) element.textContent = new Intl.DateTimeFormat(lang === 'ms' ? 'ms-MY' : 'en-GB', {timeZone:'Asia/Kuala_Lumpur',weekday:'short',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  },
  dailyTrend(records,lang) {
    const element=document.getElementById('dailyTrend'); if (!element) return;
    const current=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const end=new Date(current+'T12:00:00Z');
    const days=Array.from({length:7},(_,i)=>{const date=new Date(end);date.setUTCDate(date.getUTCDate()-6+i);const iso=date.toISOString().slice(0,10);return {iso,date,total:records.filter(r=>r.day===iso).reduce((sum,r)=>sum+r.count,0)};});
    const max=Math.max(1,...days.map(d=>d.total));
    element.innerHTML=days.map((d,i)=>{
      const label=new Intl.DateTimeFormat(lang==='ms'?'ms-MY':'en-GB',{weekday:'short',timeZone:'UTC'}).format(d.date);
      return `<div class="trend-column ${i===6?'is-today':''}" aria-label="${d.iso}: ${d.total}"><span class="trend-value">${d.total.toLocaleString()}</span><div class="trend-track"><div class="trend-bar" style="height:${d.total?Math.max(4,d.total/max*100):0}%"></div></div><span class="trend-day">${label}</span><span class="trend-date">${d.date.getUTCDate()}</span></div>`;
    }).join('');
  }
};

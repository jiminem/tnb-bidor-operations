const test=require('node:test'),assert=require('node:assert/strict');
const {compare,previous}=require('../monthly-analysis.js');
const services=['Account','Billing'];
const records=[
 {day:'2026-10-01',staff:'10077218',service:0,count:10},
 {day:'2026-10-27',staff:'10075849',service:1,count:5},
 {day:'2026-09-01',staff:'10077218',service:0,count:4},
 {day:'2026-09-30',staff:'10075849',service:1,count:8}
];
test('compares full monthly totals, service changes, and cumulative trends',()=>{
 const m=compare(records,services,'2026-10','2026-09','','full','2026-10-27');
 assert.deepEqual(m.totals,[15,12]);assert.equal(m.change,3);assert.equal(m.percent,25);
 assert.deepEqual(m.rows[0].values,[10,4]);assert.deepEqual(m.bounds,[27,30]);
 assert.equal(m.trend()[0].at(-1),15);assert.equal(m.trend(1)[1].at(-1),8);
});
test('matches partial months by day and filters staff consistently',()=>{
 const m=compare(records,services,'2026-10','2026-09','','matched','2026-10-27');
 assert.deepEqual(m.totals,[15,4]);assert.deepEqual(m.bounds,[27,27]);
 const s=compare(records,services,'2026-10','2026-09','10075849','full','2026-10-27');
 assert.deepEqual(s.totals,[5,8]);assert.equal(s.change,-3);
});
test('handles empty months and zero baselines without infinite percentages',()=>{
 const m=compare(records,services,'2026-10','2026-08','','full','2026-10-27');
 assert.equal(m.percent,null);assert.deepEqual(m.totals,[15,0]);
 const empty=compare([],services,'2026-10','2026-09','','full','2026-10-27');
 assert.equal(empty.hasData,false);assert.deepEqual(empty.totals,[0,0]);
});
test('retains unassigned history, handles leap years, and wraps previous year',()=>{
 const m=compare([{day:'2024-02-29',staff:'123456',service:'uncategorized',count:7}],services,'2024-02','2024-01','','full','2026-10-27');
 assert.deepEqual(m.bounds,[29,31]);assert.equal(m.rows.at(-1).id,'uncategorized');assert.equal(m.trend('uncategorized')[0].at(-1),7);assert.equal(previous('2026-01'),'2025-12');
});
test('interactive controls refresh month, staff, sort and selected-service views',()=>{
 const ids=['compareMonth','analysisStaff','analysisRange','analysisService','analysisSort','compareMonthLabel','analysisStaffLabel','analysisRangeLabel','comparisonTrendTitle','serviceCompareTitle','serviceCompareHint','comparisonNote','comparisonSummary','comparisonLegend','comparisonChart','comparisonTrendNote','serviceBreakdown'];
 const elements=Object.fromEntries(ids.map(id=>[id,{value:'',textContent:'',innerHTML:'',setAttribute(){}}]));
 global.document={getElementById:id=>elements[id]};
 const ui=require('../monthly-analysis.js');
 try{
   let m=ui.render({records,services,lang:'en',month:'2026-10'});
   assert.equal(elements.compareMonth.value,'2026-09');assert.deepEqual(m.totals,[15,12]);
   elements.analysisStaff.value='10077218';elements.analysisStaff.onchange();assert.match(elements.comparisonTrendNote.textContent,/10 \/ 4/);
   elements.serviceBreakdown.onclick({target:{closest:()=>({dataset:{analysisService:'1'}})}});assert.equal(elements.analysisService.value,'1');assert.match(elements.comparisonTrendNote.textContent,/Billing/);
   elements.compareMonth.value='2026-08';elements.compareMonth.onchange();assert.match(elements.comparisonSummary.innerHTML,/No baseline/);
   elements.analysisSort.value='change';elements.analysisSort.onchange();assert.match(elements.serviceBreakdown.innerHTML,/data-analysis-service/);
   ui.render({records,services,lang:'ms',month:'2026-10'});assert.equal(elements.compareMonthLabel.textContent,'Bandingkan dengan');
 }finally{delete global.document;}
});

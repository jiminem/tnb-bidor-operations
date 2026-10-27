const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('Malaysia clock updates every second, rolls dates at midnight and uses one timer',()=>{
  let now='2026-10-27T15:59:59Z',tick,timers=0;
  class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}}
  const els={dashboardDate:{},dashboardTime:{}};
  const ctx={Intl,Date:Clock,document:{getElementById:id=>els[id]},setInterval(fn,ms){assert.equal(ms,1000);tick=fn;return ++timers;}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('dashboard-ui.js','utf8'),ctx);
  ctx.DashboardUI.updateDate('en');assert.equal(els.dashboardTime.textContent,'23:59:59');assert.match(els.dashboardDate.textContent,/27/);
  now='2026-10-27T16:00:00Z';tick();assert.equal(els.dashboardTime.textContent,'00:00:00');assert.match(els.dashboardDate.textContent,/28/);
  ctx.DashboardUI.updateDate('ms');ctx.DashboardUI.updateDate('en');assert.equal(timers,1);assert.equal(els.dashboardTime.dateTime,now.replace('Z','.000Z'));
});

const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const S=require('../lib/shared.cjs');
test('signed sessions reject tampering and staff IDs are validated',()=>{
  assert(S.validStaff('10077218'));assert(!S.validStaff('admin'));assert(!S.validStaff('123'));
  const token=S.sessionToken('10077218','test signing secret');
  assert.equal(S.sessionStaff({headers:{cookie:S.COOKIE+'='+token}},'test signing secret'),'10077218');
  assert.equal(S.sessionStaff({headers:{cookie:S.COOKIE+'='+token+'x'}},'test signing secret'),null);
});
test('daily corrections detect stale versions and CRP validates dates/amounts',()=>{
  const state=S.initial();S.mutate(state,'10077218',{action:'increment',day:S.today(),service:0});
  assert.throws(()=>S.mutate(state,'10077218',{action:'correct',day:S.today(),counts:Array(22).fill(0),expectedVersion:0}),{status:409});
  assert.throws(()=>S.mutate(state,'10077218',{action:'crp-replace',expectedVersion:0,rows:[{day:'2026-02-31',collection:1,recovery:2}]}),{status:400});
  S.mutate(state,'10077218',{action:'close',day:S.today(),closed:true});
  assert.throws(()=>S.mutate(state,'10077218',{action:'increment',day:S.today(),service:0}),{status:409});
});
test('database/API: parallel staff, idempotency, conflicts, authentication and shared reads',{skip:!process.env.RUN_DATABASE_TESTS},async()=>{
  const {Pool}=require('pg');
  const source=process.env.DATABASE_URL;
  assert(source,'DATABASE_URL is needed for integration tests');
  const schema='tnb_test_'+crypto.randomBytes(6).toString('hex');
  const admin=new Pool({connectionString:source});await admin.query('CREATE SCHEMA '+schema);
  const url=new URL(source);url.hostname=url.hostname.replace('-pooler','');url.searchParams.set('sslmode','verify-full');url.searchParams.set('options','-c search_path='+schema);process.env.DATABASE_URL=url.href;
  process.env.SESSION_SECRET='integration-test-signing-secret';
  const handler=require('../api/shared.js');
  const call=async(body,cookie='',headers={})=>{const response={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};await handler({method:body?'POST':'GET',body,headers:{host:'localhost','content-type':'application/json',cookie,...headers},socket:{remoteAddress:'127.0.0.1'}},response);return response;};
  try{
    assert.equal((await call()).statusCode,401);
    assert.equal((await call({action:'login',staff:'invalid'})).statusCode,401);
    const loginA=await call({action:'login',staff:'10077218'});
    const loginB=await call({action:'login',staff:'10075849'});
    assert.equal(loginA.statusCode,200);assert.equal(loginB.statusCode,200);
    const cookieA=loginA.headers['Set-Cookie'].split(';')[0],cookieB=loginB.headers['Set-Cookie'].split(';')[0];
    const increment=(cookie,requestId=crypto.randomUUID())=>call({action:'increment',day:S.today(),service:0,requestId},cookie);
    const writes=await Promise.all(Array.from({length:24},(_,i)=>increment(i%2?cookieA:cookieB)));
    assert(writes.every(r=>r.statusCode===200));
    const id=crypto.randomUUID();await increment(cookieA,id);await increment(cookieA,id);
    const a=(await call(null,cookieA)).body,b=(await call(null,cookieB)).body;
    assert.deepEqual(a.records,b.records);assert.equal(a.records.reduce((n,r)=>n+r.count,0),25);
    assert.equal((await increment(cookieB,id)).statusCode,409);
    assert.equal((await call({action:'increment',day:S.today(),service:0,requestId:crypto.randomUUID()},cookieA,{origin:'https://attacker.example'})).statusCode,403);
    assert.equal((await call({action:'correct',day:S.today(),counts:Array(22).fill(0),expectedVersion:0,requestId:crypto.randomUUID()},cookieA)).statusCode,409);
    const row={day:S.today(),collection:123.45,recovery:67.89};
    assert.equal((await call({action:'crp-upsert',row,expectedVersion:0,requestId:crypto.randomUUID()},cookieA)).statusCode,200);
    assert.equal((await call(null,cookieB)).body.crp.rows[0].collection,123.45);
    assert.equal((await call({action:'crp-upsert',row,expectedVersion:0,requestId:crypto.randomUUID()},cookieB)).statusCode,409);
    const rate=[];for(let i=0;i<31;i++)rate.push(await call({action:'login',staff:'invalid'},{},{'x-forwarded-for':'198.51.100.20'}));
    assert.equal(rate.at(-1).statusCode,429);
  }finally{
    await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();
    // End only the test process; pg's idle timers would otherwise keep it alive briefly.
  }
});

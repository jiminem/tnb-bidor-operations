const crypto=require('node:crypto');
const shared=require('../lib/shared.cjs');
const store=require('../lib/store.cjs');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie');
  const secure=process.env.VERCEL?' Secure;':'';
  const cookie=value=>`${shared.COOKIE}=${value}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${value?43200:0}`;
  try{
    if(!process.env.DATABASE_URL||!process.env.SESSION_SECRET)shared.fail(503,'Shared database setup is not complete.');
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');shared.fail(405,'Method not allowed.');}
    if(req.method==='POST'){
      if(!String(req.headers['content-type']||'').startsWith('application/json'))shared.fail(415,'JSON required.');
      const origin=req.headers.origin;
      const host=req.headers['x-forwarded-host']||req.headers.host;
      if(origin&&new URL(origin).host!==host)shared.fail(403,'Cross-site requests are not allowed.');
      if(req.headers['sec-fetch-site']==='cross-site')shared.fail(403,'Cross-site requests are not allowed.');
    }
    const body=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body):req.body):{};
    if(req.method==='POST'&&Buffer.byteLength(JSON.stringify(body||{}))>1000000)shared.fail(413,'Request too large.');
    if(body?.action==='login'){
      const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
      await store.loginAttempt(crypto.createHmac('sha256',process.env.SESSION_SECRET).update(ip).digest('hex'));
      const staff=String(body.staff||'').trim();
      if(!shared.validStaff(staff))shared.fail(401,'Enter a valid 6-10 digit staff ID.');
      res.setHeader('Set-Cookie',cookie(shared.sessionToken(staff,process.env.SESSION_SECRET)));
      return res.status(200).json({staff,...shared.snapshot(await store.read())});
    }
    if(body?.action==='logout'){res.setHeader('Set-Cookie',cookie(''));return res.status(200).json({ok:true});}
    const staff=shared.sessionStaff(req,process.env.SESSION_SECRET);if(!staff)shared.fail(401,'Sign in with your staff ID.');
    if(req.method==='GET')return res.status(200).json({staff,...shared.snapshot(await store.read())});
    if(!body||typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))shared.fail(400,'A valid request ID is required.');
    const state=await store.write(staff,body.requestId,state=>shared.mutate(state,staff,body));
    res.status(200).json({staff,...shared.snapshot(state)});
  }catch(e){const status=e.status||500;res.status(status).json({error:status<500?e.message:status===503?e.message:'The shared data service is temporarily unavailable. Please retry.'});}
};

/* The server is the authority. localStorage is used only for display preferences. */
globalThis.SharedDashboard=(()=>{
  let state=null,queue=Promise.resolve(),polling=false,refreshing=null;
  const listeners=new Set();
  function status(message,kind='online'){const el=document.getElementById('syncStatus');if(el){el.textContent=message;el.dataset.state=kind;}}
  function sessionReady(){document.body.classList.toggle('auth-pending',false);}
  function publish(next){if(state&&next.staff===state.staff&&next.revision<state.revision)return;state=next;status('Shared data connected');for(const listener of listeners)listener(state);sessionReady();}
  async function request(body){
    const response=await fetch('/api/shared',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
    const json=await response.json();
    if(!response.ok){if(response.status===401){state=null;for(const fn of listeners)fn(null);sessionReady();}const error=new Error(json.error||'Unable to reach shared data.');error.status=response.status;throw error;}
    return json;
  }
  async function refresh(){
    if(refreshing)return refreshing;
    refreshing=(async()=>{try{const next=await request();publish(next);return next;}catch(e){status(e.status===401?'Sign in to shared data':'Connection unavailable','offline');throw e;}finally{refreshing=null;}})();return refreshing;
  }
  function mutation(action,values){
    const id=crypto.randomUUID();
    const work=async()=>{
      status('Saving to shared data...','saving');
      try{
        let next;
        try{next=await request({action,...values,requestId:id});}
        catch(e){if(e.status)throw e;next=await request({action,...values,requestId:id});}
        publish(next);return next;
      }catch(e){status('Not saved - '+e.message,'offline');if(e.status===409)try{await refresh();}catch{}throw e;}
    };
    const result=queue.then(work,work);queue=result.catch(()=>{});return result;
  }
  return {
    get state(){return state;},
    onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    async login(staff){const next=await request({action:'login',staff});publish(next);return next;},
    async logout(){await queue;await request({action:'logout'});state=null;for(const fn of listeners)fn(null);status('Signed out','offline');},
    mutate:mutation,refresh,
    async start(){
      const retry=document.getElementById('retrySession'),message=document.getElementById('sessionLoadingText');
      if(retry){retry.hidden=true;retry.onclick=()=>this.start();}if(message)message.textContent='Checking your staff session...';
      try{await refresh();}catch(e){if(e.status!==401){if(message)message.textContent='Unable to check your session. Check your connection and retry.';if(retry)retry.hidden=false;}}
      if(!polling){polling=true;setInterval(()=>{if(state&&!document.hidden)refresh().catch(()=>{});},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state)refresh().catch(()=>{});});}}
  };
})();

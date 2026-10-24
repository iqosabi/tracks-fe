// Tokens stay in module memory. Storage contains configuration and coordination markers only.
export class ApiError extends Error {
  constructor(message,status=0,retryAt=0){super(message);this.status=status;this.retryAt=retryAt;}
}
export function createAuth({base,fetcher=globalThis.fetch,locks=globalThis.navigator?.locks,channel=typeof BroadcastChannel==='function'?new BroadcastChannel('tracks-cms-auth:'+base):null,storage=globalThis.localStorage,onChange=()=>{}}){
  let current=null,pending=null,epoch=0,closed=false;
  const key='tracks-auth-coordination:'+base;
  const update=(value,broadcast=true)=>{if(closed)return;current=value;onChange(value);if(broadcast)channel?.postMessage({type:'state',value});};
  const marker=()=>{try{return JSON.parse(storage?.getItem(key)||'{}');}catch{return {};}};
  const mark=v=>storage?.setItem(key,JSON.stringify(v));
  const receive=event=>{
    const m=event.data;
    if(m.type==='query'&&current)channel?.postMessage({type:'snapshot',value:current});
    if(m.type==='state'||m.type==='snapshot'){
      if(m.type==='state'&&!m.value)epoch++;
      update(m.value,false);
    }
  };
  if(channel)channel.onmessage=receive;
  const exclusive=fn=>{
    if(!locks)return Promise.reject(new ApiError('Browser ini memerlukan dukungan Web Locks. Gunakan browser modern melalui HTTPS atau localhost.'));
    return locks.request('tracks-cms-auth:'+base,fn);
  };
  async function post(path,body,token){
    const headers={'X-CSRF-Protection':'1'};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(token)headers.Authorization='Bearer '+token;
    let response;
    try{response=await fetcher(base+'/auth/'+path,{method:'POST',credentials:'include',headers,...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});}catch{throw new ApiError('Tidak dapat terhubung ke CMS API. Periksa koneksi, URL API, dan konfigurasi CORS.');}
    if(!response.ok){
      const retry=response.headers.get('Retry-After');
      const retryAt=retry?(Number.isFinite(Number(retry))?Date.now()+Number(retry)*1000:Date.parse(retry)):Date.now()+30000;
      if(response.status===429)mark({retryAt});
      throw new ApiError(response.status===401?'Username, password, atau sesi tidak valid.':response.status===403?'Akses ditolak. Periksa izin akun dan konfigurasi Origin/CSRF.':response.status===429?'Terlalu banyak permintaan. Tunggu sebelum mencoba lagi.':'CMS API sedang bermasalah. Silakan coba lagi nanti.',response.status,retryAt);
    }
    return response;
  }
  function cooldown(){const m=marker();if(m.retryAt>Date.now())throw new ApiError('Batas permintaan aktif. Coba lagi setelah '+new Date(m.retryAt).toLocaleTimeString('id-ID')+'.',429,m.retryAt);}
  async function readTokens(response){
    const value=await response.json();
    if(!value.accessToken||value.tokenType!=='Bearer'||!value.user||!['SUPER_ADMIN','OPERATOR_ADMIN','OPERATOR_VIEWER'].includes(value.user.role)||!Number.isFinite(value.expiresIn))throw new ApiError('Format respons autentikasi tidak sesuai kontrak.');
    return {...value,validUntil:Date.now()+value.expiresIn*1000};
  }
  function restore({failedToken,force=false}={}){
    if(pending)return pending;
    pending=exclusive(async()=>{
      cooldown();
      channel?.postMessage({type:'query'});
      if(channel)await new Promise(r=>setTimeout(r,100));
      if(current&&current.validUntil>Date.now()+5000&&(!force||current.accessToken!==failedToken))return current;
      if(marker().uncertain)throw new ApiError('Hasil refresh sebelumnya belum dapat dipastikan. Sesi tidak di-refresh ulang untuk menghindari token replay. Masuk kembali untuk membuat sesi baru.');
      const startEpoch=epoch;
      mark({uncertain:true});
      let response;
      try{response=await post('refresh');}
      catch(error){
        if(error.status&&error.status<500){if(error.status!==429)mark({});if(error.status===401)update(null);}
        throw error;
      }
      let value;
      try{value=await readTokens(response);}catch{throw new ApiError('Respons refresh tidak dapat dibaca. Masuk kembali untuk membuat sesi baru.');}
      mark({});
      if(startEpoch!==epoch)throw new ApiError('Sesi telah berubah. Silakan masuk kembali.',401);
      update(value);return value;
    }).finally(()=>{pending=null;});
    return pending;
  }
  return {
    get user(){return current?.user||null;},
    restore,
    login:(username,password)=>exclusive(async()=>{cooldown();const value=await readTokens(await post('login',{username,password}));mark({});epoch++;update(value);return value;}),
    logout:(all=false)=>exclusive(async()=>{cooldown();if(all&&!current)throw new ApiError('Masuk kembali untuk mengakhiri semua sesi.',401);await post(all?'logout-all':'logout',undefined,all?current.accessToken:undefined);mark({});epoch++;update(null);}),
    async request(path,init={}){
      if(!path.startsWith('/')||path.startsWith('//'))throw new Error('API path must be relative');
      if(!current)await restore();
      const send=token=>{const headers=new Headers(init.headers);headers.set('Authorization','Bearer '+token);return fetcher(base+path,{...init,headers,signal:init.signal||AbortSignal.timeout(20000)});};
      const original=current.accessToken;
      const response=await send(original);
      if(response.status!==401)return response;
      if(current?.accessToken===original)await restore({failedToken:original,force:true});
      if(!current)return response;
      const retried=await send(current.accessToken);
      if(retried.status===401){epoch++;update(null);}
      return retried;
    },
    close(){closed=true;epoch++;channel?.close();current=null;}
  };
}

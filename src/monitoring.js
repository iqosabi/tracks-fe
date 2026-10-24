import {table,summaryCards,statusText,vehicleName,pick} from './presentation.js';
import {createFleetMap} from './maps.js';
// Endpoint and query contracts come from the supplied Fleet Monitoring collection.
export function listItems(payload){
  if(Array.isArray(payload))return payload;
  for(const value of [payload?.items,payload?.data?.items,payload?.data])if(Array.isArray(value))return value;
  return null;
}
export function fleetPath({page=1,limit=25,q='',status=''}={}){
  const params=new URLSearchParams({page:String(Math.max(1,Math.min(100000,page))),limit:String(Math.max(1,Math.min(200,limit)))});
  if(q.trim())params.set('q',q.trim());if(status)params.set('status',status);
  return '/monitoring/vehicles?'+params;
}
export function historyPath(deviceId){return '/monitoring/vehicles/'+encodeURIComponent(deviceId)+'/history?limit=500';}
export function flatten(value,prefix='',out={}){
  if(value&&typeof value==='object'&&!Array.isArray(value)){
    for(const [k,v] of Object.entries(value))flatten(v,prefix?prefix+'.'+k:k,out);
  }else out[prefix||'value']=value;
  return out;
}
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const records=payload=>table(payload,'vehicles');
const summary=summaryCards;
function alerts(payload){if(listItems(payload)!==null)return table(payload,'alerts');const grouped=[];for(const [name,value]of Object.entries(payload?.data||payload||{})){if(Array.isArray(value))for(const row of value)grouped.push({...row,type:row.type||name.toUpperCase()});}return table(grouped,'alerts');}
function points(payload){return (listItems(payload)||[]).flatMap(row=>{const f=flatten(row);const find=names=>names.map(name=>Object.entries(f).find(([k])=>k.split('.').at(-1).toLowerCase()===name)?.[1]).find(v=>v!==undefined);const lat=find(['latitude','lat']),lng=find(['longitude','lng','lon']);if(lat===null||lng===null||lat===''||lng===''||lat===undefined||lng===undefined)return [];const y=Number(lat),x=Number(lng);return Number.isFinite(y)&&Number.isFinite(x)&&Math.abs(y)<=90&&Math.abs(x)<=180?[{lat:y,lng:x,label:String(vehicleName(row)||'Kendaraan'),status:String(find(['status'])||'')}]:[];});}


export function mountMonitoring({element,auth,view='overview',notify=()=>{}}){
  let disposed=false,inFlight=false,timer=null,controller=null,page=1,q='',status='',lastSuccess=null,retryAt=0,selected='vehicles',lastRows=null;
  const slots=new Map();let fleetMap=null;
  const panel=(id,title,subtitle='')=>`<section class="panel monitor-panel"><div class="panel-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><span id="${id}-time" class="muted"></span></div><div id="${id}-error" role="status"></div><div id="${id}-body" class="monitor-body"><div class="monitor-empty">Memuat data…</div></div></section>`;
  element.innerHTML=`<div class="monitor-toolbar"><span id="poll-state" role="status">Menghubungkan Fleet Monitoring…</span><label><input id="auto-poll" type="checkbox" checked> Perbarui setiap 15 detik</label></div>${['fleet','map'].includes(view)?`<form id="live-filter" class="monitor-filters"><label class="field">Cari kendaraan<input name="q" placeholder="Nomor bus, operator, atau plat"></label><label class="field">Status<select name="status"><option value="">Semua status</option>${['ACTIVE','IDLE','DELAYED','OFFLINE'].map(s=>`<option value="${s}">${statusText(s)}</option>`).join('')}</select></label><button class="button primary">Terapkan</button></form>`:''}${view==='overview'?panel('summary','Kondisi armada','Kondisi armada Anda saat ini'):''}${view==='overview'||view==='fleet'||view==='map'?panel('vehicles',view==='map'?'Posisi GPS armada':'Armada live','Status dan posisi kendaraan terkini')+`<div class="monitor-pagination"><button id="previous" class="button secondary" disabled>← Sebelumnya</button><span id="page-label">Halaman 1</span><button id="next" class="button secondary" disabled>Berikutnya →</button></div>`:''}${view==='overview'||view==='alerts'?panel('alerts','Peringatan armada','Kendaraan yang perlu diperhatikan'):''}`;
  const get=id=>element.querySelector('#'+id);
  async function request(path,signal){const res=await auth.request(path,{signal:AbortSignal.any([signal,AbortSignal.timeout(20000)]),headers:{Accept:'application/json'}});if(!res.ok){const error=new Error(res.status===403?'Akun tidak memiliki izin untuk data ini.':res.status===401?'Sesi tidak valid. Silakan masuk kembali.':res.status===429?'Batas permintaan API tercapai.':'Permintaan gagal (HTTP '+res.status+').');error.status=res.status;if(res.status===429){const retry=res.headers.get('Retry-After');retryAt=Math.max(retryAt,Number.isFinite(Number(retry))&&retry!==null?Date.now()+Number(retry)*1000:Date.parse(retry)||Date.now()+30000);}throw error;}return res.json();}
  async function load(id,path,renderer){
    try{const payload=await request(path,controller.signal);if(disposed)return;slots.set(id,payload);if(id==='vehicles'&&(view==='map'||view==='overview')){if(!fleetMap){get(id+'-body').innerHTML='<div class="carto-live-region"></div><div class="live-map-records"></div>';fleetMap=createFleetMap(get(id+'-body').querySelector('.carto-live-region'));}fleetMap.update(points(payload));get(id+'-body').querySelector('.live-map-records').innerHTML=records(payload);}else get(id+'-body').innerHTML=renderer(payload);get(id+'-error').innerHTML='';get(id+'-time').textContent='Diterima '+new Date().toLocaleTimeString('id-ID');if(id==='vehicles'){lastRows=listItems(payload);get('previous').disabled=page<=1;const totalPages=payload?.totalPages??payload?.pagination?.totalPages??payload?.meta?.totalPages;get('next').disabled=totalPages!==undefined?page>=Number(totalPages):!lastRows||lastRows.length<25;get('page-label').textContent='Halaman '+page;}lastSuccess=Date.now();}
    catch(err){if(disposed||err.name==='AbortError')return;const previous=slots.has(id);if(!previous)get(id+'-body').innerHTML='';get(id+'-error').innerHTML=`<div class="notice error">${esc(err.message)}${previous?' Data sebelumnya tetap ditampilkan dan mungkin sudah tidak terbaru.':''}</div>`;if(err.status===401||err.status===403)element.querySelector('#auto-poll').checked=false;}
  }
  function schedule(){clearTimeout(timer);if(!disposed&&get('auto-poll').checked)timer=setTimeout(refresh,Math.max(15000,retryAt-Date.now()));}
  async function refresh(){
    if(disposed||inFlight)return;if(document.hidden){schedule();return;}if(Date.now()<retryAt){get('poll-state').textContent='Menunggu batas API sampai '+new Date(retryAt).toLocaleTimeString('id-ID');schedule();return;}
    inFlight=true;controller=new AbortController();get('poll-state').textContent='Memperbarui data…';
    const jobs=[];if(get('summary-body'))jobs.push(load('summary','/monitoring/summary',summary));if(get('vehicles-body'))jobs.push(load('vehicles',fleetPath({page,limit:25,q,status}),records));if(get('alerts-body'))jobs.push(load('alerts','/monitoring/alerts',alerts));
    await Promise.allSettled(jobs);inFlight=false;if(disposed)return;get('poll-state').textContent=lastSuccess?'Terakhir diperbarui '+new Date(lastSuccess).toLocaleTimeString('id-ID'):'Belum ada respons data yang berhasil diterima.';schedule();
  }
  get('auto-poll').onchange=()=>{clearTimeout(timer);if(get('auto-poll').checked)refresh();};
  async function changePage(next){if(Date.now()<retryAt){notify('Batas permintaan aktif. Tunggu sebelum mencoba lagi.');return;}if(inFlight){notify('Tunggu pembaruan selesai.');return;}page=Math.max(1,next);slots.delete('vehicles');if(fleetMap)fleetMap.update([]);else get('vehicles-body').innerHTML='<div class="monitor-empty">Memuat halaman…</div>';await refresh();}
  if(get('next'))get('next').onclick=()=>changePage(page+1);if(get('previous'))get('previous').onclick=()=>changePage(page-1);
  if(get('live-filter'))get('live-filter').onsubmit=e=>{e.preventDefault();if(Date.now()<retryAt){notify('Batas permintaan aktif. Tunggu sebelum mencoba lagi.');return;}if(inFlight){notify('Tunggu pembaruan selesai, lalu terapkan filter.');return;}const form=new FormData(e.currentTarget);q=String(form.get('q'));status=String(form.get('status'));page=1;slots.delete('vehicles');if(fleetMap)fleetMap.update([]);else get('vehicles-body').innerHTML='<div class="monitor-empty">Memuat hasil filter…</div>';refresh();};
  const visible=()=>{if(!document.hidden&&get('auto-poll')?.checked)refresh();};document.addEventListener('visibilitychange',visible);
  refresh();return {refresh,destroy(){disposed=true;fleetMap?.destroy();clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visible);slots.clear();lastRows=null;}};
}

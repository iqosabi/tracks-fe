const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const demoPositions=[{lat:-6.244,lng:106.8,label:'TRK-001',status:'ACTIVE'},{lat:-6.198,lng:106.823,label:'TRK-002',status:'ACTIVE'},{lat:-6.207,lng:106.824,label:'TRK-003',status:'IDLE'},{lat:-6.259,lng:106.877,label:'TRK-004',status:'ACTIVE'},{lat:-6.3,lng:106.821,label:'TRK-005',status:'OFFLINE'},{lat:-6.174,lng:106.791,label:'TRK-006',status:'ACTIVE'}];
export function createFleetMap(container,{onSelect=()=>{},demo=false}={}){
  const L=globalThis.L;
  if(!L){container.innerHTML='<div class="notice error">Library peta belum berhasil dimuat. Muat ulang halaman untuk mencoba lagi.</div>';return {update(){},fit(){},destroy(){}};}
  container.innerHTML='<div class="carto-canvas" aria-label="Peta armada CARTO interaktif"></div><div class="map-status" role="status">Memuat peta CARTO…</div><button type="button" class="map-fit" aria-label="Tampilkan semua kendaraan">⊞ <span>Semua armada</span></button><div class="map-key"><span><i class="dot green"></i>Aktif</span><span><i class="dot amber"></i>Berhenti / tertunda</span><span><i class="dot gray"></i>Offline</span></div>';
  const status=container.querySelector('.map-status');
  const map=L.map(container.querySelector('.carto-canvas'),{scrollWheelZoom:false,zoomControl:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([-6.21,106.827],12);
  L.control.zoom({position:'bottomright'}).addTo(map);
  const tiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'}).addTo(map);
  let removed=false,failed=false,hasLoaded=false,layer=L.layerGroup().addTo(map),positions=[],initial=true;
  const statusText=()=>{status.textContent=(failed&&!hasLoaded?'Basemap belum dapat dimuat · periksa koneksi. ':'')+(demo?'Posisi ilustrasi · demo':positions.length?positions.length+' kendaraan · halaman ini':'Belum ada posisi GPS');};
  tiles.on('tileerror',()=>{failed=true;statusText();});tiles.on('tileload',()=>{hasLoaded=true;statusText();});
  function fit(){if(positions.length===1)map.setView([positions[0].lat,positions[0].lng],15,{animate:false});else if(positions.length>1)map.fitBounds(positions.map(p=>[p.lat,p.lng]),{padding:[60,65],maxZoom:15,animate:false});}
  container.querySelector('.map-fit').onclick=fit;
  const observer=new ResizeObserver(()=>{if(!removed)map.invalidateSize({pan:false});});observer.observe(container);
  return {
    update(data){positions=data.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180);layer.clearLayers();for(const p of positions){const state=String(p.status||'').toUpperCase(),tone=state==='OFFLINE'?'offline':state==='IDLE'||state==='DELAYED'?'idle':'active';const label=escape(p.label||'Kendaraan');const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'fleet-map-marker',html:`<span class="map-vehicle-pill ${tone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 15h1m6 0h1M8 19v2m8-2v2"/></svg>${label}</span>`,iconSize:[115,38],iconAnchor:[57,19]}),title:String(p.label),keyboard:true}).addTo(layer);marker.bindPopup(`<div class="map-popup"><small>${demo?'DEMO VEHICLE':'FLEET MONITORING'}</small><strong>${label}</strong><p>${escape(p.status||'Status tidak tersedia')}</p><span>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</span></div>`);marker.on('click',()=>onSelect(p));}statusText();if(initial&&positions.length){fit();initial=false;}},
    fit,
    destroy(){removed=true;observer.disconnect();map.stop();map.remove();}
  };
}

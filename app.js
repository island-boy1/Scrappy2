const state={inventory:[],yards:[],filtered:[],searchDiagnostics:[]};
const $=id=>document.getElementById(id);
const norm=v=>(v??'').toString().trim().toLowerCase();
const compact=v=>norm(v).replace(/[^a-z0-9]+/g,'');
function matches(value,query){return !query||norm(value).includes(query)||compact(value).includes(compact(query))}
async function load(make='',model=''){
 const selectedYard=$('yard')?.value||'';
 $('status').textContent=(make&&model)?'Querying live search-driven yards…':'Refreshing inventory…';
 try{
  const url='/api/inventory'+(make&&model?('?make='+encodeURIComponent(make)+'&model='+encodeURIComponent(model)):'');
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok) throw new Error('Inventory request failed: '+r.status);
  const data=await r.json();
  state.inventory=data.inventory||[];state.yards=data.yards||[];state.searchDiagnostics=data.searchDiagnostics||[];
  populateFilters();
  if(selectedYard && state.yards.some(y=>y.id===selectedYard)) $('yard').value=selectedYard;
  renderYards();search();
  $('lastRefresh').textContent=new Date(data.generatedAt||Date.now()).toLocaleString();
  const q=state.searchDiagnostics.filter(x=>x.query);
  $('status').textContent=q.length?`${state.inventory.length.toLocaleString()} vehicles loaded · ${q.length} on-demand connector${q.length===1?'':'s'} checked`:`${state.inventory.length.toLocaleString()} vehicles loaded`;
 }catch(e){$('status').textContent='Source unavailable';$('empty').style.display='block';$('empty').innerHTML='<h2>Inventory source unavailable</h2><p>'+esc(e.message||'Start the server and try again.')+'</p>';}
}
function populateFilters(){
 const makes=[...new Set(state.inventory.map(x=>x.make).filter(Boolean))].sort();
 $('makes').innerHTML=makes.map(x=>`<option value="${esc(x)}"></option>`).join('');
 $('yard').innerHTML='<option value="">All yards</option>'+state.yards.map(y=>`<option value="${esc(y.id)}">${esc(y.name)}</option>`).join('');
}
function sourceBadge(row){
 const trust=row.sourceTrust||'MANUAL';
 const label=row.sourceLabel||row.sourceType||'Source';
 const cls=trust==='OFFICIAL'?'source-official':trust==='FALLBACK'?'source-fallback':'source-public';
 return `<span class="source-pill ${cls}" title="${esc(label)}">${esc(trust)}</span>`;
}
function search(){
 const f={make:norm($('make').value),model:norm($('model').value),submodel:norm($('submodel').value),year:norm($('year').value),yard:norm($('yard').value),newOnly:$('newOnly').checked,liveOnly:$('liveOnly').checked};
 const cutoff=new Date(Date.now()-14*864e5);
 state.filtered=state.inventory.filter(x=>
  matches(x.make,f.make)&&matches(x.model,f.model)&&matches(x.submodel,f.submodel)&&(!f.year||String(x.year||'')===f.year)&&(!f.yard||norm(x.yardId)===f.yard)&&(!f.liveOnly||x.verifiedSource===true)&&(!f.newOnly|| (x.arrivalDate && new Date(x.arrivalDate)>=cutoff))
 );
 $('resultCount').textContent=state.filtered.length.toLocaleString();
 $('yardCount').textContent=new Set(state.filtered.map(x=>x.yardId)).size;
 $('liveCount').textContent=new Set(state.filtered.filter(x=>x.verifiedSource===true).map(x=>x.yardId)).size;
 $('results').innerHTML=state.filtered.slice(0,1000).map((row,i)=>`<tr><td><strong>${esc(row.yard)}</strong><br><span class="muted">${row.diy?'DIY / U-Pull':'Full service'}</span></td><td>${esc(row.year)}</td><td>${esc(row.make)}</td><td>${esc(row.model)}</td><td>${esc(row.submodel||'—')}</td><td>${esc(row.body||'—')}</td><td>${esc(row.row||'—')}</td><td>${esc(row.vin||row.stock||'—')}</td><td>${esc(row.arrival||'—')}</td><td>${sourceBadge(row)}<div class="small">${esc(row.sourceLabel||'')}</div></td><td><button class="detail-btn" data-i="${i}">View vehicle</button></td></tr>`).join('');
 document.querySelectorAll('.detail-btn').forEach(b=>b.onclick=()=>openDetail(state.filtered[+b.dataset.i]));
 $('empty').style.display=state.filtered.length?'none':'block';
 renderMap();
}
function renderYards(){
 $('yards').innerHTML=state.yards.map(y=>`<div class="yard"><h3>${esc(y.name)}</h3><p>${esc(y.city||'Georgia')} · ${y.diy?'DIY / U-Pull':'Full service'}</p><p>${esc(y.address||'')}</p><p><a class="yard-link" href="${esc(y.website)}" target="_blank">Official site / inventory</a> · <a class="yard-link" href="${esc(y.mapUrl)}" target="_blank">Map</a></p><span class="badge ${y.status==='live'?'':'off'}">${y.status==='live'?'LIVE CONNECTOR':(y.status==='verified'?'PUBLIC INVENTORY VERIFIED':'DIRECT LINK')}</span></div>`).join('');
}
function renderMap(){
 const seen=new Set();const rows=[];
 for(const x of state.filtered){if(seen.has(x.yardId))continue;const y=state.yards.find(v=>v.id===x.yardId);if(y){seen.add(x.yardId);rows.push(y)}}
 $('mapList').innerHTML=rows.map(y=>`<div class="map-pin"><div><strong>${esc(y.name)}</strong><small>${esc(y.city)}</small></div><a href="${esc(y.mapUrl)}" target="_blank">Directions</a></div>`).join('')||'<p class="muted">Search results will appear here as yard locations.</p>';
}
function saveAlert(){
 const a={make:$('make').value,model:$('model').value,submodel:$('submodel').value,year:$('year').value,yard:$('yard').value,created:new Date().toISOString()};
 const list=JSON.parse(localStorage.getItem('gja_alerts')||'[]');list.unshift(a);localStorage.setItem('gja_alerts',JSON.stringify(list.slice(0,20)));renderAlerts();$('alertMsg').textContent='Alert saved on this device.';
}
function renderAlerts(){const list=JSON.parse(localStorage.getItem('gja_alerts')||'[]');$('alerts').innerHTML=list.length?list.map((a,i)=>`<div class="alert"><span>${esc([a.year,a.make,a.model,a.submodel,a.yard||'All yards'].filter(Boolean).join(' · '))}</span><button data-i="${i}">Remove</button></div>`).join(''):'<p class="muted">No saved alerts.</p>';document.querySelectorAll('.alert button').forEach(b=>b.onclick=()=>{const l=JSON.parse(localStorage.getItem('gja_alerts')||'[]');l.splice(+b.dataset.i,1);localStorage.setItem('gja_alerts',JSON.stringify(l));renderAlerts()})}
async function decodeVIN(){const vin=$('vin').value.trim().toUpperCase();if(!vin){$('vinResult').textContent='Enter a VIN.';return}$('vinResult').textContent='Decoding…';try{const r=await fetch('/api/vin/'+encodeURIComponent(vin));const d=await r.json();const x=d.Results||[];const get=k=>(x.find(v=>v.Variable===k)||{}).Value||'';$('vinResult').innerHTML=`<strong>${esc(get('Model Year'))} ${esc(get('Make'))} ${esc(get('Model'))}</strong><br>${esc(get('Trim'))} ${esc(get('Drive Type'))}<br><span class="muted">${esc(get('Vehicle Type'))}</span>`}catch(e){$('vinResult').textContent='VIN decode unavailable.'}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let liveTimer;
['make','model','submodel','year','yard','newOnly','liveOnly'].forEach(id=>$(id).addEventListener('input',()=>{
 search();
 if(id==='make'||id==='model'){
  clearTimeout(liveTimer);
  const make=$('make').value.trim(),model=$('model').value.trim();
  if(make&&model) liveTimer=setTimeout(()=>runInventorySearch(),700);
 }
}));
async function runInventorySearch(){
 const make=$('make').value.trim(),model=$('model').value.trim(),yard=$('yard').value;
 const searchDriven=yard && (yard.startsWith('pull-apart-')||yard.startsWith('go-pull-it-'));
 if(searchDriven && (!make||!model)){
  $('status').textContent='This yard requires both Make and Model for live inventory search.';
  $('empty').style.display='block';
  $('empty').innerHTML='<h2>Make and Model required</h2><p>This yard uses an on-demand inventory search. Enter both fields, then click Search inventory.</p>';
  return;
 }
 const btn=$('searchBtn');
 if(btn){btn.disabled=true;btn.textContent='Searching live yards…';}
 try{
  if(make&&model){await load(make,model);await loadConnectorStatus();}
  else search();
 }finally{if(btn){btn.disabled=false;btn.textContent='Search inventory';}}
}
$('searchBtn').onclick=runInventorySearch;
$('clearBtn').onclick=()=>{['make','model','submodel','year'].forEach(id=>$(id).value='');$('yard').value='';$('newOnly').checked=false;$('liveOnly').checked=false;load()};
$('refreshBtn').onclick=()=>load();$('saveAlert').onclick=saveAlert;$('decodeBtn').onclick=decodeVIN;
renderAlerts();

async function openDetail(row){
 $('detailModal').hidden=false;
 $('detailContent').innerHTML=`<div class="detail-head"><div><p class="eyebrow">VEHICLE DETAIL</p><h2>${esc(row.year)} ${esc(row.make)} ${esc(row.model)}</h2><p>${esc(row.submodel||'')} · ${esc(row.yard)}</p></div>${sourceBadge(row)}</div><div class="detail-grid"><div><strong>VIN</strong><span>${esc(row.vin||'Not published')}</span></div><div><strong>Stock</strong><span>${esc(row.stock||'Not published')}</span></div><div><strong>Row</strong><span>${esc(row.row||'Not published')}</span></div><div><strong>Arrival</strong><span>${esc(row.arrival||'Not published')}</span></div><div><strong>Body</strong><span>${esc(row.body||'Not published')}</span></div><div><strong>Drive</strong><span>${esc(row.drive||'Not published')}</span></div></div><div id="papExtended" class="source-detail" hidden></div><div id="photoArea" class="photo-area">Checking for a published vehicle photo…</div><div class="source-detail"><strong>Inventory provenance</strong><span>${esc(row.sourceLabel||row.sourceType||'Unknown')} · ${esc(row.sourceTrust||'MANUAL')}</span>${row.sourceTrust==='FALLBACK'?'<small>Fallback records should be verified with the yard before travel.</small>':''}</div><div class="detail-actions">${row.sourceUrl?`<a class="primary-link" href="${esc(row.sourceUrl)}" target="_blank" rel="noopener">Open yard vehicle/source page</a>`:''}${row.vin?`<button class="secondary" onclick="decodeDetailVIN('${esc(row.vin)}')">Decode VIN</button>`:''}</div><div id="detailDecode" class="vin-result"></div></div>`;
 if(row.pullApart?.locID&&row.pullApart?.ticketID&&row.pullApart?.lineID){
  try{
   const q=new URLSearchParams({locID:row.pullApart.locID,ticketID:row.pullApart.ticketID,lineID:row.pullApart.lineID});
   const r=await fetch('/api/pullapart-vehicle?'+q.toString()); const d=await r.json();
   if(d.image){$('photoArea').innerHTML=`<img src="${esc(d.image)}" alt="${esc(row.year+' '+row.make+' '+row.model)}" class="vehicle-photo"><p class="muted">Photo published by Pull-A-Part.</p>`}else $('photoArea').innerHTML='<p class="muted">No Pull-A-Part vehicle photo was available.</p>';
   const info=d.extendedInfo;
   if(info){
    const obj=Array.isArray(info)?(info[0]||{}):info;
    const preferred=['bodyStyle','exteriorColor','driveType','engineSize','engineCylinders','transmission','trim','series'];
    const pairs=[];
    for(const k of preferred){if(obj&&obj[k]!=null&&String(obj[k]).trim())pairs.push([k,obj[k]])}
    if(!pairs.length&&obj&&typeof obj==='object') for(const [k,v] of Object.entries(obj)){if(v!=null&&typeof v!=='object'&&String(v).trim()&&pairs.length<8)pairs.push([k,v])}
    if(pairs.length){$('papExtended').hidden=false;$('papExtended').innerHTML=`<strong>Pull-A-Part vehicle information</strong><div class="detail-grid">${pairs.map(([k,v])=>`<div><strong>${esc(k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()))}</strong><span>${esc(v)}</span></div>`).join('')}</div>`}
   }
  }catch(e){$('photoArea').innerHTML='<p class="muted">Pull-A-Part detail lookup unavailable.</p>'}
 } else if(row.sourceUrl){
  try{const r=await fetch('/api/vehicle?url='+encodeURIComponent(row.sourceUrl));const d=await r.json();if(d.image){$('photoArea').innerHTML=`<img src="${esc(d.image)}" alt="${esc(row.year+' '+row.make+' '+row.model)}" class="vehicle-photo"><p class="muted">Photo published by the yard/source.</p>`}else $('photoArea').innerHTML='<p class="muted">No public vehicle photo was found on this source page.</p>'}catch(e){$('photoArea').innerHTML='<p class="muted">Photo lookup unavailable; use the source link above.</p>'}
 }
}
async function decodeDetailVIN(vin){$('detailDecode').textContent='Decoding…';try{const r=await fetch('/api/vin/'+encodeURIComponent(vin));const d=await r.json();const x=d.Results||[];const get=k=>(x.find(v=>v.Variable===k)||{}).Value||'';$('detailDecode').innerHTML=`<strong>${esc(get('Model Year'))} ${esc(get('Make'))} ${esc(get('Model'))}</strong><br>${esc(get('Trim'))} ${esc(get('Drive Type'))} · ${esc(get('Body Class'))}`}catch(e){$('detailDecode').textContent='VIN decode unavailable.'}}
$('modalClose').onclick=()=>{$('detailModal').hidden=true};$('detailModal').addEventListener('click',e=>{if(e.target.id==='detailModal')$('detailModal').hidden=true});

function interchangePayload(){return {location:$('ixLocation').value,make:$('ixMake').value.trim(),model:$('ixModel').value.trim(),year:$('ixYear').value.trim(),style:$('ixStyle').value,category:$('ixCategory').value,part:$('ixPart').value.trim(),fitment:$('ixFitment').value.trim()}}
function showInterchange(html){$('interchangeResult').classList.add('show');$('interchangeResult').innerHTML=html}
$('interchangeBtn').onclick=()=>{const x=interchangePayload();if(!x.make||!x.model||!x.year||!x.category||!x.part){showInterchange('<strong>Complete the vehicle, year, part category and part fields.</strong><p class="muted">Pull-A-Part requires those fields before it can determine compatible donor vehicles.</p>');return}showInterchange(`<strong>Authoritative interchange search</strong><p class="muted">Pull-A-Part is the verified interchange source for this workflow. It searches location, make, model, year, style, part category, part and fitment, then returns vehicles currently on the yard.</p><div class="interchange-actions"><a class="primary-link" href="https://www.pullapart.com/inventory/interchangeable-parts/" target="_blank" rel="noopener">Open verified interchange search</a></div><p class="muted" style="margin-top:10px">Target: ${esc(x.year)} ${esc(x.make)} ${esc(x.model)} · ${esc(x.category)} · ${esc(x.part)}${x.fitment?' · '+esc(x.fitment):''}</p>`)}
$('candidateBtn').onclick=()=>{const x=interchangePayload();const q=state.inventory.filter(v=>matches(v.make,norm(x.make))&&matches(v.model,norm(x.model))&&(!x.year||String(v.year)===x.year)&&(!x.location||v.yard.toLowerCase().includes(x.location.toLowerCase())));showInterchange(`<strong>${q.length} donor vehicle candidate${q.length===1?'':'s'} found in the aggregator</strong><p class="muted">These are candidate donor vehicles, not guaranteed part interchange. Confirm fitment with the authoritative interchange result or the yard before buying.</p><div class="ix-results">${q.slice(0,50).map(v=>`<div class="ix-card"><div><h3>${esc(v.year)} ${esc(v.make)} ${esc(v.model)}</h3><p>${esc(v.yard)} · Row ${esc(v.row||'—')} · VIN/Stock ${esc(v.vin||v.stock||'—')}</p></div><span class="ix-badge">DONOR CANDIDATE</span></div>`).join('')||'<p class="muted">No candidate donor vehicles are currently loaded. Try a broader make/model/year search.</p>'}</div>`)}


async function loadConnectorStatus(){
  try{
    const r=await fetch('/api/connectors');
    if(!r.ok) throw new Error('Connector endpoint '+r.status);
    const data=await r.json();
    renderConnectors(data.statuses||[]);
  }catch(e){
    const tbody=document.getElementById('connectorResults');
    if(tbody) tbody.innerHTML='<tr><td colspan="10">Could not load connector status.</td></tr>';
  }
}

function qualityBadge(x){
  const q=x.quality||'—';
  const warnings=(x.warnings||[]);
  const detail=warnings.length?`<div class="quality-notes">${warnings.map(w=>`<div>⚠ ${esc(w)}</div>`).join('')}</div>`:'';
  return `<span class="quality-pill quality-${esc(q.replaceAll(' ','_'))}">${esc(q)}</span>${detail}`;
}
function coverageCell(v){
  const n=Number(v||0); return `<span class="coverage ${n>=75?'coverage-good':n>=25?'coverage-mid':'coverage-low'}">${n}%</span>`;
}
function renderConnectors(items){
  const tbody=document.getElementById('connectorResults');
  if(!tbody) return;
  const statusOrder={CONNECTION_ERROR:0,PARSER_ERROR:1,EMPTY:2,FALLBACK_REVIEW:3,LIVE:4,SEARCH_DRIVEN:5,DIRECT_LINK_ONLY:6,UNTESTED:7,CHECKING:8};
  items=[...items].sort((a,b)=>(statusOrder[a.status]??99)-(statusOrder[b.status]??99)||Number(b.possibleDuplicate)-Number(a.possibleDuplicate)||a.name.localeCompare(b.name));
  tbody.innerHTML=items.map(x=>`
    <tr class="${x.possibleDuplicate?'connector-warning-row':''}">
      <td><strong>${esc(x.name)}</strong><div class="small">${esc(x.city||'')}</div></td>
      <td><span class="status-pill status-${esc(x.status||'UNTESTED')}">${esc((x.status||'UNTESTED').replaceAll('_',' '))}</span></td>
      <td><div class="source-type">${esc(x.sourceType||'—')}</div><div class="small trust-${esc(x.trustLevel||'MANUAL')}">${esc(x.trustLevel||'MANUAL')}</div>${x.searchTelemetry?`<div class="query-telemetry">Last query: ${esc(x.searchTelemetry.query||'—')} → ${Number(x.searchTelemetry.vehicleCount||0)} result${Number(x.searchTelemetry.vehicleCount||0)===1?'':'s'}${x.searchTelemetry.error?' · ERROR':''}</div>`:''}</td>
      <td>${Number(x.vehicleCount||0).toLocaleString()}</td>
      <td>${coverageCell(x.vinCoverage)}</td>
      <td>${coverageCell(x.rowCoverage)}</td>
      <td>${coverageCell(x.arrivalCoverage)}</td>
      <td>${qualityBadge(x)}</td>
      <td>${x.responseMs!=null?esc(x.responseMs)+' ms':'—'}</td>
      <td>${x.lastSuccess?new Date(x.lastSuccess).toLocaleString():'—'}</td>
    </tr>`).join('');
  const count=s=>items.filter(x=>x.status===s).length;
  document.getElementById('liveConnectorCount').textContent=count('LIVE');
  document.getElementById('emptyConnectorCount').textContent=count('EMPTY');
  document.getElementById('errorConnectorCount').textContent=count('CONNECTION_ERROR')+count('PARSER_ERROR');
  document.getElementById('directConnectorCount').textContent=count('DIRECT_LINK_ONLY')+count('UNTESTED');
  const sd=document.getElementById('searchDrivenConnectorCount'); if(sd) sd.textContent=count('SEARCH_DRIVEN');
  const fb=document.getElementById('fallbackConnectorCount'); if(fb) fb.textContent=count('FALLBACK_REVIEW');
  const warningCount=items.filter(x=>(x.warnings||[]).length>0).length;
  const w=document.getElementById('warningConnectorCount'); if(w) w.textContent=warningCount;
}

const oldLoad=load;
load=async function(...args){
  await oldLoad(...args);
  await loadConnectorStatus();
};
const cr=document.getElementById('connectorRefreshBtn');
if(cr) cr.onclick=async()=>{cr.disabled=true;cr.textContent='Refreshing…';try{await fetch('/api/inventory?refresh=1');await loadConnectorStatus();}finally{cr.disabled=false;cr.textContent='Refresh status';}};

// Initial application + connector-status load
load();

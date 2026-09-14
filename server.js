const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000,ROOT=__dirname;
const BUILD_VERSION='9.5.8';
const papDeepDiagnostics=new Map();

const raw=[
['pull-apart-atl-east','Pull-A-Part Atlanta East','Lithonia','6513 Marshall Boulevard, Lithonia, GA 30058','https://www.pullapart.com/locations/georgia/atlanta-east/',true,'verified'],
['pull-apart-atl-north','Pull-A-Part Atlanta North','Norcross','4416 Buford Hwy, Norcross, GA 30071','https://www.pullapart.com/locations/georgia/atlanta-north/',true,'verified'],
['pull-apart-atl-south','Pull-A-Part Atlanta South','Conley','1540 Henrico Road, Conley, GA 30288','https://www.pullapart.com/locations/georgia/atlanta-south/',true,'verified'],
['pull-apart-augusta','Pull-A-Part Augusta','Augusta','327 SandBar Ferry Rd, Augusta, GA 30901','https://www.pullapart.com/locations/georgia/augusta/',true,'verified'],
['go-pull-it-norcross','GO Pull-It Atlanta East','Norcross','4600 Buford Hwy, Norcross, GA 30071','https://gopullit.com/inventory/?location=atlanta-east',true,'verified'],
['go-pull-it-gainesville','GO Pull-It Gainesville','Gainesville','2156 Athens Hwy, Gainesville, GA 30507','https://gopullit.com/inventory/?location=gainesville-ga',true,'verified'],
['ez-pull-n-pay-atlanta','EZ Pull N Pay Atlanta','Atlanta','1172 Field Rd NW, Atlanta, GA 30318','https://ezpullnpay.com/atlanta/',true,'live'],
['ez-pull-n-pay-stockbridge','EZ Pull N Pay Stockbridge','Stockbridge','473 Hwy 138 E, Stockbridge, GA 30281','https://ezpullnpay.com/stockbridge/',true,'live'],
['ez-pull-n-pay-warner','EZ Pull N Pay Warner Robins','Warner Robins','11128 Hawkinsville Rd, Warner Robins, GA 31093','https://ezpullnpay.com/warner-robins/',true,'live'],
['ez-pull-n-pay-columbus','EZ Pull N Pay Columbus','Columbus','3843 Aldridge Rd, Columbus, GA 31903','https://ezpullnpay.com/columbus-location/',true,'verified'],
['cagles',"Cagle's U Pull It",'Cartersville','1139 Old Alabama Rd SW, Cartersville, GA 30120','https://caglesupullit.com/inventory.aspx',true,'live'],
['sw','S&W U Pull','Lithonia','1826 Lithonia Industrial Blvd, Lithonia, GA 30058','https://www.sandwauto.com/u-pull/inventory-search',true,'live'],
['pyp-fayetteville','Pick Your Part Fayetteville','Fayetteville','155 Roberts Rd, Fayetteville, GA 30214','https://www.pyp.com/inventory/fayetteville-1229/',true,'live'],
['pyp-savannah','Pick Your Part Savannah','Savannah','1321 Hwy 80 West, Savannah, GA 31408','https://www.pyp.com/inventory/savannah-1163/',true,'live'],
['pick-n-pull-jefferson','Pick-N-Pull Jefferson','Jefferson','2991 Highway 124 W, Jefferson, GA 30549','https://www.picknpull.com/locations/195/jefferson-ga',true,'verified'],
['fenix-moultrie','Fenix U-Pull Moultrie','Moultrie','232 Industrial Rd, Moultrie, GA 31768','https://fenixupull.com/inventory/',true,'verified'],
['highway82','Highway 82 Pick & Pay','Poulan','455 Hwy 82 NW, Poulan, GA 31781','https://hwy82pp.com/search-inventory/',true,'live'],
['cash-n-carry','Cash N Carry Pull Your Part','Savannah','500 Staley Ave, Savannah, GA 31405','https://cashncarryparts.com/search-inventory/',true,'live'],
['southern-pik-a-part-augusta','Southern Pik-A-Part Augusta','Augusta','1550 Doug Barnard Pkwy, Augusta, GA 30906','http://spapaugusta.us/',true,'unknown'],
['southern-pik-a-part-columbus','Southern Pik-A-Part Columbus','Columbus','281 Brennan Rd, Columbus, GA 31903','http://spap.us/',true,'unknown']
];
const YARDS=raw.map(([id,name,city,address,website,diy,status])=>({id,name,city,address,website,diy,status,live:status==='live',mapUrl:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address)}));
const searchConnectorTelemetry=new Map();
const MAKE_ALIASES={
 'vw':'VOLKSWAGEN','mercedes':'MERCEDES-BENZ','mercedes benz':'MERCEDES-BENZ','mb':'MERCEDES-BENZ',
 'chevy':'CHEVROLET','gmc truck':'GMC','land rover':'LAND ROVER','alfa romeo':'ALFA ROMEO',
 'volkswagen':'VOLKSWAGEN','volvo':'VOLVO','bmw':'BMW','mini':'MINI'
};
const MODEL_ALIASES={
 'xc 60':'XC60','xc-60':'XC60','xc 90':'XC90','xc-90':'XC90','xc 40':'XC40','xc-40':'XC40',
 'f 150':'F-150','f150':'F-150','f- 150':'F-150','silverado 1500':'SILVERADO 1500',
 'grand cherokee':'GRAND CHEROKEE','town and country':'TOWN & COUNTRY','town & country':'TOWN & COUNTRY',
 '3 series':'3 SERIES','5 series':'5 SERIES','c class':'C-CLASS','e class':'E-CLASS'
};
function canonicalMake(v){const x=String(v||'').replace(/\s+/g,' ').trim().toLowerCase();return MAKE_ALIASES[x]||x.toUpperCase()}
function canonicalModel(v){let x=String(v||'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();x=x.replace(/\s*\/\s*/g,'/');return MODEL_ALIASES[x]||x.toUpperCase()}
function canonicalSubmodel(v){return String(v||'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim().toUpperCase()}
function normalizeRecord(x){return {...x,make:canonicalMake(x.make),model:canonicalModel(x.model),submodel:canonicalSubmodel(x.submodel)}}
function dedupeInventory(rows){
 const map=new Map();
 for(const raw of rows){const x=normalizeRecord(raw);const vin=String(x.vin||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
  const key=vin.length>=11?`VIN:${vin}`:`ROW:${x.yardId}|${x.year}|${x.make}|${x.model}|${x.submodel}|${x.row}|${x.arrival}`;
  if(!map.has(key)){map.set(key,{...x,sourceUrls:x.sourceUrl?[x.sourceUrl]:[]});continue}
  const old=map.get(key); const urls=new Set([...(old.sourceUrls||[]),...(x.sourceUrl?[x.sourceUrl]:[])]);
  map.set(key,{...old, ...x, sourceUrl:old.sourceUrl||x.sourceUrl, sourceUrls:[...urls], live:!!old.live||!!x.live, isNew:!!old.isNew||!!x.isNew});
 }
 return [...map.values()];
}


function strip(s){return(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g,' ').trim()}
function isRecent(s){if(!s)return false;const d=new Date(s);return !isNaN(d)&&((Date.now()-d.getTime())/86400000<=14)}
function dateFromMDY(s){if(!s)return null;const m=String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(!m)return null;let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[1]-1,+m[2]).toISOString()}
function rowsFromTable(html,yardId,yardName,sourceUrl){
 const out=[];
 for(const table of html.match(/<table[\s\S]*?<\/table>/gi)||[]){
  for(const tr of table.match(/<tr[\s\S]*?<\/tr>/gi)||[]){
   const c=(tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)||[]).map(strip); if(c.length<3)continue;
   let year,make='',model='',submodel='',row='',vin='',stock='',arrival='';
   if(yardId==='sw'&&c.length>=5)[row,year,make,model,vin]=c;
   else if(yardId==='cash-n-carry'&&c.length>=7)[year,make,model,,stock,row,arrival]=c;
   else if(yardId.startsWith('ez-pull-n-pay')&&c.length>=8)[year,make,model,, ,stock,row,arrival]=c;
   else if(yardId==='cagles'&&c.length>=5)[year,make,model,row,arrival]=c;
   year=Number(year);
   if(year>1900&&year<2100&&make&&model&&!/year|make|model/i.test(make)){
    const y=YARDS.find(v=>v.id===yardId)||{}; const ad=dateFromMDY(arrival);
    out.push({yardId,yard:yardName,year,make,model,submodel,row,vin,stock,arrival,arrivalDate:ad,sourceUrl,diy:y.diy!==false,live:true,isNew:ad?isRecent(ad):false,sourceType:'official-public-html'});
   }
  }
 }
 return out;
}
function parsePyp(html,yardId,yardName,url){
 const out=[];
 const y=YARDS.find(v=>v.id===yardId)||{};
 // PYP pages use vehicle headings followed by stock/section/row/VIN/available fields.
 // Parse each heading block independently so layout/whitespace changes do not break the connector.
 const heads=[...html.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)];
 for(let i=0;i<heads.length;i++){
  const title=strip(heads[i][1]);
  const tm=title.match(/^(19\d{2}|20\d{2})\s+(.+)$/i); if(!tm) continue;
  const year=Number(tm[1]);
  let vehicle=strip(tm[2]);
  if(!vehicle||/vehicle inventory|last chance|page \d+/i.test(vehicle)) continue;
  const endPos=i+1<heads.length?heads[i+1].index:Math.min(html.length,heads[i].index+5000);
  const rawChunk=html.slice(heads[i].index,endPos), chunk=strip(rawChunk);
  // Pick the make conservatively from common vehicle-title tokenization; model is the remainder.
  const toks=vehicle.split(/\s+/); if(toks.length<2) continue;
  const make=toks.shift(), model=toks.join(' ');
  const vin=(chunk.match(/\bVIN\s*:?\s*([A-HJ-NPR-Z0-9]{17})\b/i)||[])[1]||'';
  const stock=(chunk.match(/\b(?:Stock\s*#?\s*:?\s*)?(\d{4}-\d{3,})\b/i)||[])[1]||'';
  const section=(chunk.match(/\bSection\s*:?\s*([^|]{1,30}?)(?=\s+(?:Row|Space)\b|$)/i)||[])[1]||'';
  const row=(chunk.match(/\bRow\s*:?\s*([A-Z0-9-]{1,12})\b/i)||[])[1]||'';
  const space=(chunk.match(/\bSpace\s*:?\s*([A-Z0-9-]{1,12})\b/i)||[])[1]||'';
  const arrival=(chunk.match(/\bAvailable\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})\b/i)||[])[1]||'';
  const ad=dateFromMDY(arrival);
  const rowLabel=[section&&('Section '+section),row&&('Row '+row),space&&('Space '+space)].filter(Boolean).join(' · ');
  out.push({yardId,yard:yardName,year,make,model,submodel:'',row:rowLabel||row,vin,stock,arrival,arrivalDate:ad,sourceUrl:url,diy:y.diy!==false,live:true,isNew:ad?isRecent(ad):false,sourceType:'official-public-html'});
 }
 // Alternate PYP search-result markup can be plain blocks without headings.
 if(!out.length){
  const text=strip(html);
  const re=/(19\d{2}|20\d{2})\s+([A-Z][A-Z0-9&.'-]+)\s+([A-Z0-9][A-Z0-9&.' /-]{1,45}?)(?=\s+(?:Color:|VIN:|Section:|Stock #|Available:))[\s\S]{0,700}?VIN:\s*([A-HJ-NPR-Z0-9]{17})[\s\S]{0,500}?(?:Section:\s*([^|]{1,25}))?[\s\S]{0,300}?(?:Row:\s*([A-Z0-9-]+))?[\s\S]{0,300}?(?:Stock #:\s*(\d{4}-\d{3,}))?[\s\S]{0,300}?Available:\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi;
  let m; while((m=re.exec(text))){const arrival=m[8]||'',ad=dateFromMDY(arrival);out.push({yardId,yard:yardName,year:Number(m[1]),make:m[2],model:strip(m[3]),submodel:'',row:[m[5],m[6]].filter(Boolean).join(' / '),vin:m[4]||'',stock:m[7]||'',arrival,arrivalDate:ad,sourceUrl:url,diy:y.diy!==false,live:true,isNew:ad?isRecent(ad):false,sourceType:'official-public-html'});}
 }
 return dedupeInventory(out);
}

async function fetchText(url){const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 Georgia-Junkyard-Inventory-Search/9.5','Accept':'text/html,application/xhtml+xml'}});if(!r.ok)throw Error(`${r.status}`);return r.text()}

const pullApartMakeIdCache=new Map();
const PULLAPART_CACHE_FILE=require('path').join(ROOT,'pullapart-make-cache.json');
function loadPapMakeCache(){try{const o=JSON.parse(require('fs').readFileSync(PULLAPART_CACHE_FILE,'utf8'));for(const [k,v] of Object.entries(o||{})){if(k&&Number(v)>0)pullApartMakeIdCache.set(canonicalMake(k),Number(v));}}catch{}}
function savePapMakeCache(){try{const o=Object.fromEntries([...pullApartMakeIdCache.entries()].sort());require('fs').writeFileSync(PULLAPART_CACHE_FILE,JSON.stringify(o,null,2));}catch(e){console.error('Pull-A-Part make cache write failed:',e.message)}}
loadPapMakeCache();
const pullApartCatalog={makes:new Map(),models:new Map(),locations:new Map(),lastUpdated:null};

function papModelKey(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function papModelMatches(actual,wanted){
 const a=papModelKey(actual), w=papModelKey(wanted);
 if(!a||!w) return false;
 return a===w || a.startsWith(w) || w.startsWith(a);
}
function parsePapVinInfo(value){
 if(!value) return {};
 if(typeof value==='object') return value;
 if(typeof value==='string'){
  try{return JSON.parse(value)}catch{}
 }
 return {};
}
function rememberPapRows(rows){
 for(const v of rows||[]){
  const make=canonicalMake(v.makeName), mid=Number(v.makeID);
  if(make&&mid){pullApartCatalog.makes.set(make,mid);if(pullApartMakeIdCache.get(make)!==mid){pullApartMakeIdCache.set(make,mid);savePapMakeCache();}}
  const model=String(v.modelName||'').trim(), modelId=Number(v.modelID);
  if(make&&model){
   if(!pullApartCatalog.models.has(make)) pullApartCatalog.models.set(make,new Map());
   const m=pullApartCatalog.models.get(make); const key=papModelKey(model);
   if(key&&!m.has(key)) m.set(key,{name:model,id:modelId||null});
  }
  const locationId=Number(v.locationID), locationName=String(v.locationName||'').trim();
  if(locationId&&locationName) pullApartCatalog.locations.set(locationId,locationName);
 }
 pullApartCatalog.lastUpdated=new Date().toISOString();
}
function papObservedModelCatalog(make){
 const key=canonicalMake(make);
 const m=pullApartCatalog.models.get(key);
 const models=m?[...m.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name))):[];
 return {
  make:key,
  makeId:pullApartCatalog.makes.get(key)||pullApartMakeIdCache.get(key)||null,
  source:'observed-official-inventory',
  complete:false,
  status:'OBSERVED_ONLY',
  explanation:'These models were learned from authoritative Pull-A-Part vehicle rows. They are not treated as a complete master model list.',
  models
 };
}
function papModelCatalogAssessment(make,model){
 const cat=papObservedModelCatalog(make), wanted=papModelKey(model);
 const hit=cat.models.find(x=>papModelKey(x.name)===wanted)||null;
 return {...cat,requestedModel:String(model||''),requestedModelKey:wanted,requestedModelObserved:!!hit,requestedModelId:hit?.id||null};
}
function papYardId(v){
 const loc=String(v.locationName||pullApartCatalog.locations.get(Number(v.locationID))||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 if(loc.includes('ATLANTA EAST')) return 'pull-apart-atl-east';
 if(loc.includes('ATLANTA NORTH')) return 'pull-apart-atl-north';
 if(loc.includes('ATLANTA SOUTH')) return 'pull-apart-atl-south';
 if(loc.includes('AUGUSTA')) return 'pull-apart-augusta';
 return null;
}
function papTelemetryBase(query,started){
 return {attemptedAt:new Date().toISOString(),query,vehicleCount:0,responseMs:Date.now()-started,error:'',stage:'STARTED',endpoint:'/Vehicle/Search',makeId:null,modelKey:papModelKey(query.split(/\s+/).slice(1).join(' ')),attempts:0,successfulResponses:0,httpErrors:0,timeouts:0,transportErrors:0,rawRecords:0,targetMakeRecords:0,targetModelRecords:0,georgiaModelRecords:0,diagnostic:'',idsTried:[],responseSamples:[],modelsSeen:[],locationsSeen:[]};
}
function setPapTelemetry(yardIds,base,rows=[]){
 for(const yardId of yardIds){
  const n=rows.filter(r=>r.yardId===yardId).length;
  searchConnectorTelemetry.set(yardId,{...base,vehicleCount:n,responseMs:base.responseMs||0});
 }
}
async function papPost(endpoint,headers,body,timeoutMs=6500){
 const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{
  const r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(body),signal:ctrl.signal});
  const text=await r.text();
  let json=null; try{json=JSON.parse(text)}catch{}
  return {ok:r.ok,status:r.status,json,text:text.slice(0,500),contentType:r.headers.get('content-type')||'',bodyBytes:Buffer.byteLength(text||'','utf8')};
 }finally{clearTimeout(timer)}
}



async function pullApartSiteDiscovery(){
 const started=Date.now();
 const pages=['https://www.pullapart.com/used-auto-parts/search-car-inventory/','https://www.pullapart.com/inventory-v2/','https://www.pullapart.com/inventory-v2/search/'];
 const headers={'user-agent':'Mozilla/5.0 Georgia-Junkyard-Inventory-Search/9.5.8','accept':'text/html,application/xhtml+xml,application/javascript,text/javascript,*/*'};
 const out={version:BUILD_VERSION,generatedAt:new Date().toISOString(),pages:[],scripts:[],candidates:[],errors:[],responseMs:0};
 const seenScripts=new Set(), candidateSet=new Set();
 const addCandidate=(value,source)=>{if(!value)return; const v=String(value).replace(/&amp;/g,'&').trim(); if(v.length<4||v.length>500)return; const key=v+'|'+source; if(candidateSet.has(key))return; candidateSet.add(key); out.candidates.push({value:v,source});};
 const scan=(text,source)=>{
   const patterns=[
    /https?:\\?\\?\/\/[^"'`\\s<>]+/gi,
    /(?:https?:)?\/\/[^"'`\\s<>]+/gi,
    /["'`](\/?[^"'`\\s<>]*(?:api|inventory|vehicle|search|interchange|model|make)[^"'`\\s<>]*)["'`]/gi,
    /(?:AdvancedVehicleSearch|BasicVehicleSearch|VehicleSearch|GetModels|GetMakes|GetInventory|InventorySearch)[^"'`\\s<>]*/gi
   ];
   for(const p of patterns){let m;let count=0;while((m=p.exec(text))&&count<250){const v=m[1]||m[0]; if(/pullapart|inventory|vehicle|interchange|api|model|make|search/i.test(v)) addCandidate(v,source); count++;}}
 };
 for(const page of pages){
  try{
   const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),10000);
   const r=await fetch(page,{headers,signal:ctrl.signal}); const html=await r.text(); clearTimeout(timer);
   out.pages.push({url:page,status:r.status,ok:r.ok,bytes:Buffer.byteLength(html||'','utf8')}); scan(html,page);
   const rx=/<script[^>]+src=["']([^"']+)["'][^>]*>/gi; let m;
   while((m=rx.exec(html))){try{const u=new URL(m[1],page).href; if(!seenScripts.has(u)){seenScripts.add(u);out.scripts.push({url:u,status:null,bytes:0})}}catch{}}
  }catch(e){out.errors.push({source:page,error:e?.message||String(e)})}
 }
 // Inspect a bounded number of first-party scripts. This runs from the user's Codespace,
 // which sees the same public site resources as the app connector.
 let inspected=0;
 for(const item of out.scripts){
  if(inspected>=30) break;
  try{
   const u=new URL(item.url); if(!/pullapart\.com$/i.test(u.hostname)&&!/\.pullapart\.com$/i.test(u.hostname)) continue;
   const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),10000);
   const r=await fetch(item.url,{headers,signal:ctrl.signal}); const js=await r.text(); clearTimeout(timer);
   item.status=r.status; item.bytes=Buffer.byteLength(js||'','utf8'); inspected++; scan(js,item.url);
  }catch(e){item.error=e?.message||String(e)}
 }
 out.scriptsInspected=inspected;
 out.candidates=out.candidates.filter(x=>/pullapart|externalinterchange|inventory|vehicle|interchange|api|model|make|search/i.test(x.value)).slice(0,500);
 out.responseMs=Date.now()-started;
 out.note='Discovery only: this endpoint inventories the current Pull-A-Part site pages/scripts so we can identify the same live search service used by their website before replacing the legacy connector.';
 return out;
}

const PAP_INVENTORY_BASE='https://inventoryservice.pullapart.com';
const PAP_GA_LOCATIONS=[21,4,3,9];
let papMakeCatalogCache={at:0,rows:[]};
const papModelCatalogCache=new Map();

async function papGetJson(pathname,timeoutMs=6500){
 const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{
  const r=await fetch(PAP_INVENTORY_BASE+pathname,{headers:{'accept':'application/json','origin':'https://www.pullapart.com','referer':'https://www.pullapart.com/inventory-v2/search/','user-agent':'Mozilla/5.0 Georgia-Junkyard-Inventory-Search/9.5.8'},signal:ctrl.signal});
  const text=await r.text(); let json=null; try{json=JSON.parse(text)}catch{}
  if(!r.ok) throw Error(`Pull-A-Part ${pathname} returned HTTP ${r.status}`);
  if(json===null) throw Error(`Pull-A-Part ${pathname} did not return JSON`);
  return json;
 }finally{clearTimeout(timer)}
}
async function getPapMakeCatalog(force=false){
 if(!force && papMakeCatalogCache.rows.length && Date.now()-papMakeCatalogCache.at<6*60*60*1000) return papMakeCatalogCache.rows;
 const rows=await papGetJson('/Make/');
 const arr=Array.isArray(rows)?rows:[];
 papMakeCatalogCache={at:Date.now(),rows:arr};
 for(const x of arr){const name=canonicalMake(x.makeName),id=Number(x.makeID);if(name&&id){pullApartCatalog.makes.set(name,id);pullApartMakeIdCache.set(name,id)}}
 if(arr.length) savePapMakeCache();
 pullApartCatalog.lastUpdated=new Date().toISOString();
 return arr;
}
async function getPapModelCatalog(makeId,makeName='',force=false){
 const key=Number(makeId); const cached=papModelCatalogCache.get(key);
 if(!force && cached?.rows?.length && Date.now()-cached.at<6*60*60*1000) return cached.rows;
 const rows=await papGetJson(`/Model?makeID=${encodeURIComponent(key)}`);
 const arr=Array.isArray(rows)?rows:[]; papModelCatalogCache.set(key,{at:Date.now(),rows:arr});
 const make=canonicalMake(makeName);
 if(make){
  const m=new Map();
  for(const x of arr){const name=String(x.modelName||'').trim(),id=Number(x.modelID)||null,k=papModelKey(name);if(k&&name)m.set(k,{name,id})}
  pullApartCatalog.models.set(make,m);
 }
 pullApartCatalog.lastUpdated=new Date().toISOString();
 return arr;
}
async function papLiveModelCatalogAssessment(make,model){
 const targetMake=canonicalMake(make), targetModelKey=papModelKey(model);
 const makes=await getPapMakeCatalog();
 const makeRow=makes.find(x=>canonicalMake(x.makeName)===targetMake)||null;
 if(!makeRow) return {make:targetMake,makeId:null,source:'official-current-catalog',complete:true,status:'MAKE_NOT_FOUND',models:[],requestedModel:String(model||''),requestedModelKey:targetModelKey,requestedModelObserved:false,requestedModelId:null};
 const models=await getPapModelCatalog(makeRow.makeID,targetMake);
 const normalized=models.map(x=>({name:String(x.modelName||''),id:Number(x.modelID)||null,showWebsite:x.showWebsite!==false})).filter(x=>x.name).sort((a,b)=>a.name.localeCompare(b.name));
 const hit=normalized.find(x=>papModelKey(x.name)===targetModelKey)||null;
 return {make:targetMake,makeId:Number(makeRow.makeID),source:'official-current-catalog',complete:true,status:hit?'MODEL_FOUND':'MODEL_NOT_FOUND',models:normalized,requestedModel:String(model||''),requestedModelKey:targetModelKey,requestedModelObserved:!!hit,requestedModelId:hit?.id||null};
}

async function fetchPullApartSearch(make,model){
 if(!make||!model) return [];
 const yardIds=['pull-apart-atl-east','pull-apart-atl-north','pull-apart-atl-south','pull-apart-augusta'];
 const endpoint=PAP_INVENTORY_BASE+'/Vehicle/Search';
 const headers={'accept':'application/json','content-type':'application/json','origin':'https://www.pullapart.com','referer':'https://www.pullapart.com/inventory-v2/search/','user-agent':'Mozilla/5.0 Georgia-Junkyard-Inventory-Search/9.5.8'};
 const targetMake=canonicalMake(make), targetModel=canonicalModel(model), targetModelKey=papModelKey(model);
 const started=Date.now(), query=[make,model].filter(Boolean).join(' ');
 let t=papTelemetryBase(query,started); t.version=BUILD_VERSION; t.endpoint='/Vehicle/Search'; t.apiBase=PAP_INVENTORY_BASE; t.locationIds=[...PAP_GA_LOCATIONS]; t.catalogSource='official-current-catalog'; t.catalogRequests=0;
 try{
  t.stage='RESOLVE_MAKE'; t.catalogRequests++;
  const makes=await getPapMakeCatalog();
  const makeRow=makes.find(x=>canonicalMake(x.makeName)===targetMake)||null;
  if(!makeRow){
   t.stage='MAKE_NOT_FOUND'; t.responseMs=Date.now()-started; t.diagnostic=`${targetMake} was not found in Pull-A-Part's current /Make/ catalog.`;
   setPapTelemetry(yardIds,t,[]); papDeepDiagnostics.set(query,{...t,rowsByYard:Object.fromEntries(yardIds.map(id=>[id,0]))}); return [];
  }
  const makeId=Number(makeRow.makeID); t.makeId=makeId; pullApartMakeIdCache.set(targetMake,makeId); savePapMakeCache();

  t.stage='RESOLVE_MODEL'; t.catalogRequests++;
  const models=await getPapModelCatalog(makeId,targetMake);
  const modelRow=models.find(x=>papModelKey(x.modelName)===targetModelKey)||null;
  t.modelCatalog={make:targetMake,makeId,source:'official-current-catalog',complete:true,status:modelRow?'MODEL_FOUND':'MODEL_NOT_FOUND',requestedModel:String(model||''),requestedModelKey:targetModelKey,requestedModelObserved:!!modelRow,requestedModelId:modelRow?Number(modelRow.modelID):null,models:models.map(x=>({name:String(x.modelName||''),id:Number(x.modelID)||null})).filter(x=>x.name)};
  if(!modelRow){
   t.stage='MODEL_NOT_FOUND'; t.responseMs=Date.now()-started; t.modelsSeen=t.modelCatalog.models.map(x=>x.name).slice(0,150); t.diagnostic=`${targetModel} was not found in Pull-A-Part's current official model catalog for ${targetMake}.`;
   setPapTelemetry(yardIds,t,[]); papDeepDiagnostics.set(query,{...t,rowsByYard:Object.fromEntries(yardIds.map(id=>[id,0]))}); return [];
  }
  const modelId=Number(modelRow.modelID); t.modelId=modelId; t.stage='VEHICLE_SEARCH'; t.attempts=1;
  const res=await papPost(endpoint,headers,{Locations:PAP_GA_LOCATIONS,MakeID:makeId,Models:[modelId],Years:[]},8000);
  t.responseSamples=[{status:res.status,ok:res.ok,contentType:res.contentType,bodyBytes:res.bodyBytes,preview:res.text}];
  if(!res.ok){t.httpErrors=1;throw Error(`Pull-A-Part /Vehicle/Search returned HTTP ${res.status}`)}
  t.successfulResponses=1;
  const groups=Array.isArray(res.json)?res.json:[];
  const raw=[];
  for(const group of groups){
   const locationID=Number(group?.locationID)||0;
   for(const bucket of ['exact','other']) for(const v of (Array.isArray(group?.[bucket])?group[bucket]:[])) raw.push({...v,_bucket:bucket,locationID:v.locationID||locationID});
  }
  t.rawRecords=raw.length;
  const makeRows=raw.filter(v=>canonicalMake(v.makeName)===targetMake);
  const modelRows=makeRows.filter(v=>papModelKey(v.modelName)===targetModelKey);
  t.targetMakeRecords=makeRows.length; t.targetModelRecords=modelRows.length;
  t.modelsSeen=[...new Set(makeRows.map(v=>String(v.modelName||'').trim()).filter(Boolean))].sort();
  t.locationsSeen=[...new Set(groups.map(g=>String(g?.locationID||'')).filter(Boolean))].sort();
  rememberPapRows(modelRows.map(v=>({...v,locationName:v.locName||v.locationName,locationID:v.locID||v.locationID})));
  const out=[];
  for(const v of modelRows){
   const normalized={...v,locationName:v.locName||v.locationName,locationID:v.locID||v.locationID};
   const yardId=papYardId(normalized); if(!yardId) continue;
   const y=YARDS.find(x=>x.id===yardId); if(!y) continue;
   const arrival=v.dateYardOn?String(v.dateYardOn).split('T')[0]:'';
   let ad=null; if(arrival){try{ad=new Date(arrival+'T00:00:00').toISOString()}catch{}}
   out.push({yardId,yard:y.name,year:Number(v.modelYear)||'',make:v.makeName||targetMake,model:v.modelName||targetModel,submodel:'',row:v.row||'',vin:v.vin||'',stock:'',arrival,arrivalDate:ad,sourceUrl:y.website,diy:true,live:true,isNew:ad?isRecent(ad):false,body:'',drive:'',sourceType:'official-api',pullApart:{vinID:v.vinID||null,ticketID:v.ticketID||null,lineID:v.lineID||null,locID:v.locID||v.locationID||null,modelID:v.modelID||modelId,matchBucket:v._bucket}});
  }
  const rows=dedupeInventory(out); t.georgiaModelRecords=rows.length; t.vehicleCount=rows.length; t.responseMs=Date.now()-started;
  t.stage=rows.length?'PARSED_RESULTS':'NO_GEORGIA_RESULTS';
  t.diagnostic=rows.length?`Current Pull-A-Part /Vehicle/Search returned ${rows.length} Georgia ${targetMake} ${targetModel} vehicle(s).`:`Pull-A-Part's current /Vehicle/Search returned no Georgia ${targetMake} ${targetModel} vehicles.`;
  setPapTelemetry(yardIds,t,rows);
  papDeepDiagnostics.set(query,{...t,rowsByYard:Object.fromEntries(yardIds.map(id=>[id,rows.filter(r=>r.yardId===id).length]))});
  return rows;
 }catch(e){
  if(e?.name==='AbortError') t.timeouts=(t.timeouts||0)+1; else t.transportErrors=(t.transportErrors||0)+1;
  t={...t,responseMs:Date.now()-started,error:e?.message||String(e),stage:'CONNECTOR_ERROR',diagnostic:'Current Pull-A-Part Inventory Service request failed.'};
  setPapTelemetry(yardIds,t,[]); papDeepDiagnostics.set(query,{...t,rowsByYard:Object.fromEntries(yardIds.map(id=>[id,0]))});
  console.error('Pull-A-Part current Inventory Service connector failed:',e.message); return [];
 }
}

async function fetchFenixMoultrie(){
 const url='https://fenixupull.com/recent-inventory/';
 try{
  const html=await fetchText(url), out=[];
  for(const table of html.match(/<table[\s\S]*?<\/table>/gi)||[]){
   for(const tr of table.match(/<tr[\s\S]*?<\/tr>/gi)||[]){
    const c=(tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)||[]).map(strip);
    if(c.length<7||!/Moultrie/i.test(c.join(' | '))) continue;
    const loc=c.findIndex(x=>/Moultrie/i.test(x)); if(loc<0) continue;
    const date=c[0], make=c[1], model=c[2], year=Number(c[3]), row=c[4], vin=c[5], stock=c[6];
    const ad=dateFromMDY(date); const y=YARDS.find(x=>x.id==='fenix-moultrie');
    if(year>1900&&make&&model) out.push({yardId:'fenix-moultrie',yard:y.name,year,make,model,submodel:'',row,vin,stock,arrival:date,arrivalDate:ad,sourceUrl:url,diy:true,live:true,isNew:ad?isRecent(ad):false,sourceType:'official-public-html'});
   }
  }
  return out;
 }catch(e){console.error('Fenix Moultrie connector failed:',e.message);return []}
}
function parseGo(html,yardId,yardName,url){
 const out=[]; const tables=html.match(/<table[\s\S]*?<\/table>/gi)||[];
 for(const table of tables){for(const tr of table.match(/<tr[\s\S]*?<\/tr>/gi)||[]){
  const c=(tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)||[]).map(strip); if(c.length<5)continue;
  const year=Number(c[0]); if(year<1900||year>2100)continue;
  const [yr,make,model,row,vin,arrival]=c; const ad=dateFromMDY(arrival); const y=YARDS.find(x=>x.id===yardId);
  const href=(tr.match(/href=["']([^"']*\/inventory\/[^"']+)["']/i)||[])[1];
  const detail=href?(href.startsWith('http')?href:new URL(href,'https://gopullit.com').href):url;
  out.push({yardId,yard:yardName,year:Number(yr),make,model,submodel:'',row,vin,stock:'',arrival:arrival||'',arrivalDate:ad,sourceUrl:detail,diy:true,live:true,isNew:ad?isRecent(ad):false,sourceType:'official-public-html'});
 }} return out;
}
async function fetchGoSearch(yardId,yardName,make,model){
 if(!make||!model)return [];
 const loc=yardId==='go-pull-it-gainesville'?'gainesville-ga':'atlanta-east';
 const url='https://gopullit.com/inventory/?location='+encodeURIComponent(loc)+'&make='+encodeURIComponent(make.toUpperCase())+'&model='+encodeURIComponent(model.toUpperCase());
 const started=Date.now(), query=[make,model].filter(Boolean).join(' ');
 try{
  const rows=parseGo(await fetchText(url),yardId,yardName,url);
  searchConnectorTelemetry.set(yardId,{attemptedAt:new Date().toISOString(),query,vehicleCount:rows.length,responseMs:Date.now()-started,error:''});
  return rows;
 }catch(e){
  searchConnectorTelemetry.set(yardId,{attemptedAt:new Date().toISOString(),query,vehicleCount:0,responseMs:Date.now()-started,error:e.message||String(e)});
  console.error('GO Pull-It connector failed:',e.message);return []
 }
}
async function fetchPickNPullJefferson(){
 const official='https://www.picknpull.com/check-inventory/vehicle-search?distance=25&zip=30549';
 try{
  const direct=parseGo(await fetchText(official),'pick-n-pull-jefferson','Pick-N-Pull Jefferson',official);
  if(direct.length) return direct.map(x=>({...x,sourceType:'official-public-html'}));
 }catch(e){console.error('Pick-N-Pull Jefferson official connector failed:',e.message)}
 // The public Pick-n-Pull page is client-rendered in some environments. Use a clearly-labelled
 // public index fallback instead of pretending an empty client-rendered page is a live feed.
 return (await fetchPublicIndexedYard('https://u-pull-it.com/inventory/pick-n-pull-jefferson','pick-n-pull-jefferson','Pick-N-Pull Jefferson'))
   .map(x=>({...x,sourceType:'public-index-fallback',live:false}));
}


async function fetchPublicIndexedYard(url,yardId,yardName){
 try{
  const html=await fetchText(url), out=[];
  for(const table of html.match(/<table[\s\S]*?<\/table>/gi)||[]){
   for(const tr of table.match(/<tr[\s\S]*?<\/tr>/gi)||[]){
    const c=(tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)||[]).map(strip);
    if(c.length<5) continue;
    const year=Number(c[0]); if(year<1900||year>2100) continue;
    const make=c[1], model=c[2];
    if(!make||!model||/year/i.test(make)) continue;
    let color='',row='',vin='',arrival='';
    if(c.length>=7){color=c[3];row=c[4];vin=c[5];arrival=c[6]}
    const y=YARDS.find(x=>x.id===yardId), ad=dateFromMDY(arrival);
    out.push({yardId,yard:yardName,year,make,model,submodel:'',row,vin,stock:'',arrival,arrivalDate:ad,sourceUrl:url,diy:true,live:true,isNew:ad?isRecent(ad):false,sourceType:'public-index'});
   }
  }
  return out;
 }catch(e){console.error('Public indexed source failed '+yardName+':',e.message);return []}
}

async function fetchHighway82(){
 return (await fetchPublicIndexedYard('https://hwy82pp.com/search-inventory/','highway82','Highway 82 Pick & Pay')).map(x=>({...x,sourceType:'official-public-html',live:true}));
}

async function fetchPypYard(id,name,base,maxPages=20){
 const rows=[];
 let next=1;
 async function worker(){
  while(next<=maxPages){
   const page=next++;
   const url=page===1?base:base+'?page='+page;
   try{
    const html=await fetchText(url);
    const parsed=parsePyp(html,id,name,url);
    rows.push(...parsed);
   }catch(e){console.error(`PYP ${name} page ${page} failed:`,e.message)}
  }
 }
 await Promise.all(Array.from({length:5},worker));
 return dedupeInventory(rows);
}

async function fetchInventory(filters={}){
 const all=[];
 const tasks=[
  ['cagles',"Cagle's U Pull It",'https://caglesupullit.com/inventory.aspx'],
  ['sw','S&W U Pull','https://www.sandwauto.com/u-pull/inventory-search'],
  ['cash-n-carry','Cash N Carry Pull Your Part','https://cashncarryparts.com/search-inventory/'],
  ['ez-pull-n-pay-atlanta','EZ Pull N Pay Atlanta','https://ezpullnpay.com/atlanta/'],
  ['ez-pull-n-pay-stockbridge','EZ Pull N Pay Stockbridge','https://ezpullnpay.com/stockbridge/'],
  ['ez-pull-n-pay-warner','EZ Pull N Pay Warner Robins','https://ezpullnpay.com/warner-robins/'],
  ['ez-pull-n-pay-columbus','EZ Pull N Pay Columbus','https://ezpullnpay.com/columbus-location/']
 ];
 await Promise.all(tasks.map(async([id,name,url])=>{try{all.push(...rowsFromTable(await fetchText(url),id,name,url))}catch(e){console.error(`Fetch failed ${name}: ${e.message}`)}}));
 // Columbus' official landing page does not always expose the embedded inventory table server-side.
 // Only use the public index fallback when the official page yielded no Columbus vehicles.
 if(!all.some(v=>v.yardId==='ez-pull-n-pay-columbus')){
  try{
   const html=await fetchText('https://yardhound.app/?yard_id=178');
   const text=strip(html), y=YARDS.find(x=>x.id==='ez-pull-n-pay-columbus'), rows=[];
   const re=/(19\d{2}|20\d{2})\s+([A-Z][A-Z0-9&.'-]+)\s+([A-Z0-9][A-Z0-9&.' /-]{1,55}?)\s+EZ Pull N Pay Columbus\b/gi;
   let m; while((m=re.exec(text))) rows.push({yardId:y.id,yard:y.name,year:Number(m[1]),make:m[2],model:strip(m[3]),submodel:'',row:'',vin:'',stock:'',arrival:'',arrivalDate:null,sourceUrl:'https://yardhound.app/?yard_id=178',diy:true,live:true,isNew:false,sourceType:'public-index-fallback',live:false});
   all.push(...dedupeInventory(rows));
  }catch(e){console.error('EZ Pull N Pay Columbus fallback failed:',e.message)}
 }

 // PYP: official paginated inventory. v9.4 expands coverage and limits concurrency to stay polite.
 for(const [id,name,base] of [['pyp-fayetteville','Pick Your Part Fayetteville','https://www.pyp.com/inventory/fayetteville-1229/'],['pyp-savannah','Pick Your Part Savannah','https://www.pyp.com/inventory/savannah-1163/']]){
  all.push(...await fetchPypYard(id,name,base,20));
 }
 if(filters.make&&filters.model){
  all.push(...await fetchPullApartSearch(filters.make,filters.model));
 }
 all.push(...await fetchFenixMoultrie());
 all.push(...await fetchHighway82());
 all.push(...await fetchPickNPullJefferson());
 if(filters.make&&filters.model){
  all.push(...await fetchGoSearch('go-pull-it-norcross','GO Pull-It Atlanta East',filters.make,filters.model));
  all.push(...await fetchGoSearch('go-pull-it-gainesville','GO Pull-It Gainesville',filters.make,filters.model));
 }
 return enrichInventorySources(dedupeInventory(all));
}


function sourceTrustFor(type){
 if(type==='official-api'||type==='official-public-html') return 'OFFICIAL';
 if(type==='public-index-fallback') return 'FALLBACK';
 if(type==='public-index') return 'PUBLIC INDEX';
 return 'MANUAL';
}
function sourceLabelFor(type){return SOURCE_LABELS[type]||type||'Unknown source'}
function enrichInventorySources(rows){
 return rows.map(v=>({...v,sourceLabel:sourceLabelFor(v.sourceType),sourceTrust:sourceTrustFor(v.sourceType),verifiedSource:sourceTrustFor(v.sourceType)==='OFFICIAL'}));
}

const SOURCE_LABELS={
 'official-api':'Official API',
 'official-public-html':'Official public inventory',
 'public-index':'Public inventory index',
 'public-index-fallback':'Third-party fallback'
};
const YARD_SOURCE_HINTS={
 'pull-apart-atl-east':'Search-driven official Pull-A-Part inventory',
 'pull-apart-atl-north':'Search-driven official Pull-A-Part inventory',
 'pull-apart-atl-south':'Search-driven official Pull-A-Part inventory',
 'pull-apart-augusta':'Search-driven official Pull-A-Part inventory',
 'go-pull-it-norcross':'Search-driven official inventory',
 'go-pull-it-gainesville':'Search-driven official inventory',
 'ez-pull-n-pay-columbus':'Official page + public fallback',
 'pick-n-pull-jefferson':'Official public inventory',
 'fenix-moultrie':'Official public inventory',
 'southern-pik-a-part-augusta':'Direct link only',
 'southern-pik-a-part-columbus':'Direct link only'
};
function vehicleSignature(v){
 const vin=String(v.vin||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
 if(vin.length>=11) return 'VIN:'+vin;
 return ['REC',v.year,canonicalMake(v.make),canonicalModel(v.model),canonicalSubmodel(v.submodel),String(v.row||'').trim(),String(v.stock||'').trim(),String(v.arrival||'').trim()].join('|');
}
function pct(n,d){return d?Math.round((n/d)*100):0}
function buildConnectorStatuses(inventory, responseMs=0, globalError=''){
 const checkedAt=new Date().toISOString();
 const grouped=new Map(YARDS.map(y=>[y.id,[]]));
 for(const v of inventory||[]){if(grouped.has(v.yardId))grouped.get(v.yardId).push(v)}
 const sigSets=new Map();
 for(const [id,rows] of grouped) sigSets.set(id,new Set(rows.map(vehicleSignature)));
 const overlaps=new Map();
 const ids=[...sigSets.keys()];
 for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){
   const a=ids[i],b=ids[j],sa=sigSets.get(a),sb=sigSets.get(b); if(sa.size<5||sb.size<5) continue;
   let common=0; for(const x of sa) if(sb.has(x)) common++;
   const ratio=common/Math.min(sa.size,sb.size);
   if(common>=5 && ratio>=0.75){
     if(!overlaps.has(a)) overlaps.set(a,[]); if(!overlaps.has(b)) overlaps.set(b,[]);
     overlaps.get(a).push({yardId:b,common,ratio}); overlaps.get(b).push({yardId:a,common,ratio});
   }
 }
 return YARDS.map(y=>{
   const rows=grouped.get(y.id)||[], vehicleCount=rows.length;
   let status='UNTESTED',lastError='';
   if(globalError){status='CONNECTION_ERROR';lastError=globalError}
   else if(vehicleCount>0 && rows.every(r=>r.sourceTrust==='FALLBACK'||r.sourceType==='public-index-fallback'))status='FALLBACK_REVIEW';
   else if(vehicleCount>0)status='LIVE';
   else if(y.id.startsWith('go-pull-it-')||y.id.startsWith('pull-apart-'))status='SEARCH_DRIVEN';
   else if(y.status==='unknown')status='DIRECT_LINK_ONLY';
   else status='EMPTY';
   const types=[...new Set(rows.map(r=>r.sourceType).filter(Boolean))];
   let sourceType=types.map(t=>SOURCE_LABELS[t]||t).join(' + ') || YARD_SOURCE_HINTS[y.id] || (y.status==='live'?'Configured public connector':'Verified public inventory');
   const warnings=[];
   if(types.includes('public-index-fallback')) warnings.push('Using third-party fallback source');
   if(vehicleCount>0 && vehicleCount<=3) warnings.push('Low record count — verify parser coverage');
   const dup=overlaps.get(y.id)||[];
   if(dup.length){
     const names=dup.map(d=>(YARDS.find(z=>z.id===d.yardId)||{}).name).filter(Boolean);
     warnings.push('Possible duplicate feed overlap with '+names.join(', '));
   }
   if(status==='EMPTY'&&y.status==='live') warnings.push('Configured connector returned zero parsed vehicles');
   if(status==='EMPTY'&&y.status==='verified') warnings.push('Public inventory verified; parser/source needs validation');
   const vinCount=rows.filter(r=>String(r.vin||'').replace(/[^A-Z0-9]/gi,'').length>=11).length;
   const rowCount=rows.filter(r=>String(r.row||'').trim()).length;
   const arrivalCount=rows.filter(r=>String(r.arrival||'').trim()).length;
   const fallback=types.includes('public-index-fallback');
   let quality='GOOD';
   if(status==='LIVE' && (fallback||warnings.length||pct(vinCount,vehicleCount)<25)) quality='REVIEW';
   if(status==='FALLBACK_REVIEW') quality='REVIEW';
   if(status==='EMPTY'||status==='CONNECTION_ERROR'||status==='PARSER_ERROR') quality='NEEDS ATTENTION';
   if(status==='DIRECT_LINK_ONLY') quality='MANUAL';
   if(status==='SEARCH_DRIVEN') quality='ON DEMAND';
   const searchTelemetry=searchConnectorTelemetry.get(y.id)||null;
   if(searchTelemetry?.error) warnings.push('Last on-demand query failed: '+searchTelemetry.error);
   return {...y,status,vehicleCount,responseMs,lastAttempt:checkedAt,lastSuccess:vehicleCount>0?checkedAt:null,lastError,sourceType,
     quality,warnings,vinCoverage:pct(vinCount,vehicleCount),rowCoverage:pct(rowCount,vehicleCount),arrivalCoverage:pct(arrivalCount,vehicleCount),
     possibleDuplicate:dup.length>0,sourceTypes:types,trustLevel:(types.includes('official-api')||types.includes('official-public-html'))?'OFFICIAL':types.includes('public-index-fallback')?'FALLBACK':types.includes('public-index')?'PUBLIC INDEX':'MANUAL',searchTelemetry};
 });
}
async function getConnectorStatuses(){
 const started=Date.now(); let inventory=[],globalError='';
 try{
   if(cache.data && Date.now()-cache.at<10*60*1000) inventory=cache.data.inventory||[];
   else {inventory=await fetchInventory({}); cache={at:Date.now(),data:{generatedAt:new Date().toISOString(),inventory,yards:YARDS}}}
 }catch(e){globalError=e&&e.message?e.message:String(e)}
 return buildConnectorStatuses(inventory,Date.now()-started,globalError);
}

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
let cache={at:0,data:null};
const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/api/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true,service:'Georgia Junkyard Inventory Search',version:BUILD_VERSION,time:new Date().toISOString(),yards:YARDS.length}))}
 if(req.url.startsWith('/api/pullapart-site-discovery')){
  const result=await pullApartSiteDiscovery();
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
  return res.end(JSON.stringify(result,null,2));
 }
 if(req.url.startsWith('/api/pullapart-model-catalog')){
  const u=new URL(req.url,'http://localhost');
  const make=u.searchParams.get('make')||'';
  const model=u.searchParams.get('model')||'';
  try{
   const catalog=await papLiveModelCatalogAssessment(make,model);
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
   return res.end(JSON.stringify({version:BUILD_VERSION,generatedAt:new Date().toISOString(),catalog,note:'v9.5.8 uses Pull-A-Part current official /Make/ and /Model catalogs; model IDs are retrieved from the live Inventory Service and are not guessed.'},null,2));
  }catch(e){
   res.writeHead(502,{'Content-Type':'application/json','Cache-Control':'no-store'});
   return res.end(JSON.stringify({version:BUILD_VERSION,error:e?.message||String(e)}));
  }
 }
 if(req.url==='/api/pullapart-diagnostics'){
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
  return res.end(JSON.stringify({version:BUILD_VERSION,generatedAt:new Date().toISOString(),cache:Object.fromEntries(pullApartMakeIdCache.entries()),catalog:{lastUpdated:pullApartCatalog.lastUpdated,makes:Object.fromEntries(pullApartCatalog.makes.entries()),models:Object.fromEntries([...pullApartCatalog.models.entries()].map(([make,m])=>[make,[...m.values()]])),locations:Object.fromEntries(pullApartCatalog.locations.entries())},diagnostics:[...papDeepDiagnostics.entries()].map(([query,v])=>({query,...v}))},null,2));
 }
 if(req.url==='/api/connectors'){
  const statuses=await getConnectorStatuses();
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
  return res.end(JSON.stringify({generatedAt:new Date().toISOString(),statuses}));
 }
 if(req.url.startsWith('/api/vin/')){const vin=decodeURIComponent(req.url.slice(9));const r=await fetch('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/'+encodeURIComponent(vin)+'?format=json');res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(await r.text())}
 if(req.url.startsWith('/api/vehicle')){
  const u=new URL(req.url,'http://localhost'); const target=u.searchParams.get('url')||'';
  let parsed; try{parsed=new URL(target)}catch(e){res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'bad url'}))}
  const allowed=['gopullit.com','www.gopullit.com','fenixupull.com','www.fenixupull.com','caglesupullit.com','www.caglesupullit.com','sandwauto.com','www.sandwauto.com','cashncarryparts.com','www.cashncarryparts.com','hwy82pp.com','www.hwy82pp.com','pyp.com','www.pyp.com','www.pullapart.com','pullapart.com'];
  if(!allowed.includes(parsed.hostname)){res.writeHead(403,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'source not allowed'}))}
  try{const html=await fetchText(target); const imgs=[...(html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)||[])].map(x=>(x.match(/(?:src|data-src)=["']([^"']+)["']/i)||[])[1]).filter(Boolean); const image=imgs.map(x=>{try{return new URL(x,target).href}catch(e){return null}}).find(Boolean)||null; res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'public,max-age=600'});return res.end(JSON.stringify({image}))}catch(e){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({image:null,error:e.message}))}
 }
 if(req.url.startsWith('/api/inventory')){
  const u=new URL(req.url,'http://localhost'); const filters={make:u.searchParams.get('make')||'',model:u.searchParams.get('model')||''}; const forceRefresh=u.searchParams.get('refresh')==='1'; const now=Date.now(); if(!forceRefresh&&!filters.make&&!filters.model&&cache.data&&now-cache.at<10*60*1000){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({...cache.data,searchDiagnostics:[...searchConnectorTelemetry.entries()].map(([yardId,v])=>({yardId,...v}))}))}
  const inventory=await fetchInventory(filters); const payload={generatedAt:new Date().toISOString(),inventory,yards:YARDS,searchDiagnostics:[...searchConnectorTelemetry.entries()].map(([yardId,v])=>({yardId,...v}))}; if(!filters.make&&!filters.model) cache={at:now,data:payload};
  res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify((filters.make||filters.model)?payload:cache.data));
 }
 let file=req.url.split('?')[0];if(file==='/')file='/index.html';const p=path.join(ROOT,file);if(!p.startsWith(ROOT)||!fs.existsSync(p)){res.writeHead(404);return res.end('Not found')};res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(fs.readFileSync(p));
}catch(e){res.writeHead(500,{'Content-Type':'text/plain'});res.end('Server error: '+e.message)}});
server.listen(PORT, '0.0.0.0',()=>console.log(`http://localhost:${PORT}`));

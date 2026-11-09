/* Discover Ads › Inspo pull. Run in the browser on https://projects.motionapp.com/... (signed in to Motion).
   Pulls ads from Motion's Inspo library (its own GraphQL API, same calls the Discover page makes),
   normalises them and upserts into Supabase in_ads. Media stays on Motion (media storage is moving to Cloudflare R2).
   Usage: paste this file, then  window.__inspoRun({mode:'deep'|'full'|'weekly'})  and poll  window.__IN.status  until 'done'.
   deep   = Creative Discovery pull: focus brands get every ad Motion exposes from the last 12 months (NEWEST paginated to the
            12 month cutoff, plus TOP and LONGEST_RUNNING inside the window, plus NEWEST per visual format when a brand hits
            Motion's ~250 ads per query cap); everyone else up to 150 ads
            (LONGEST_RUNNING, then NEWEST to fill). No trimming. Upserts brand by brand.
   weekly = newest ads per brand + category, trimmed to 8 per brand (3 video); full = deep backfill (TOP 100, LONGEST_RUNNING 40, NEWEST 30,
   12 per key visual format) trimmed to 40 per brand (12 video) + 260 category finds. Only new ads are added; existing rows are updated in place.
   Pacing: about 1 request per second, backs off on errors, a brand stops after 3 failed requests (listed in __IN.failed).
   Language (lang, lang_conf, is_english) is set afterwards by tools/lang-tag.py (langdetect), not in the browser. */
(()=>{
const SB='https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/',K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const ws=(location.pathname.match(/organization\/\w+\/(\w+)/)||[])[1]||'68f9094a48c435fa24bfcbac';
const Q=`query F($workspaceId: ID!, $filters: InputSwipeFileItemsFilters, $sort: BrandFollowingSort!, $first: Int, $after: String) { workspaceV2(workspaceId: $workspaceId) { discoverFeed { ads(sort:$sort, first:$first, after:$after, filters:$filters){ edges{ node{ id adStatus startDate endDate adDisplayFormat adsLibraryUrl platforms isAd source saveCountRecent brand{id name brandCategory logo} sources{ adText url type thumbnail title aspectRatio cta{text link} } glossaryCategoryValues{ name values{name} } } } pageInfo{endCursor hasNextPage} } } } }`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;class BrandFail extends Error{}
const call=async v=>{for(let a=0;a<4;a++){const t0=Date.now();try{const r=await fetch('/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationName:'F',query:Q,variables:{workspaceId:ws,...v}})});
  if(r.ok){const j=await r.json();if(j.data){window.__IN&&window.__IN.req++;await sleep(Math.max(0,1000-(Date.now()-t0)));return j.data.workspaceV2.discoverFeed.ads}}}catch(e){}
  fails++;if(window.__BRANDGUARD&&fails>=3)throw new BrandFail('3 failures');await sleep(2000*2**a)}return{edges:[],pageInfo:{}}};
const take=async(filters,sort,n)=>{let out=[],after=null;while(out.length<n){const a=await call({filters,sort,first:Math.min(100,n-out.length),after});out=out.concat(a.edges.map(e=>e.node));if(!a.pageInfo||!a.pageInfo.hasNextPage)break;after=a.pageInfo.endCursor}return out};
/* every ad since `cut` (ms): NEWEST pages until a whole page started before the cutoff */
const since=async(filters,cut,max=20000)=>{let out=[],after=null;while(out.length<max){const a=await call({filters,sort:'NEWEST',first:100,after});const ns=a.edges.map(e=>e.node);
  const keep=ns.filter(n=>!n.startDate||n.startDate>=cut||n.adStatus==='active'||(n.endDate||0)>=cut);out=out.concat(keep);
  if(!ns.length||ns.every(n=>n.startDate&&n.startDate<cut)||!a.pageInfo||!a.pageInfo.hasNextPage)break;after=a.pageInfo.endCursor}return out};
/* Brand list (Motion brand ids, checked with brandSearch 9 Nov 2026).
   [name, brand_group, ids, market, focus, set]  set: jd | ca (Canadian retail) | core (earlier list) | new (approved 9 Nov 2026)
   Several brands have regional pages: only English-language pages are listed, except The North Face (all pages, focus). */
const BR=[
 ['JD Sports','JD Global',['66cf75a0e42d53dcea7879b5'],'UK',true,'jd'],
 ['JD Sports US','JD Global',['67aa28cb0a70ccc0c54281c6'],'US',true,'jd'],
 ['JD Sports Australia','JD Global',['686f2d9374342e14cdc10979'],'AU',true,'jd'],
 ['JD Sports New Zealand','JD Global',['69925634d7b54bd21a2fcadb'],'NZ',true,'jd'],
 ['Finish Line','Competitor',['670ff958a61172249cb1b88d'],'US',true,'jd'],
 ['Browns Shoes','Competitor',['67a284970a70ccc0c58afd6d'],'CA',false,'ca'],['Little Burgundy Shoes','Competitor',['66f6cbcaaa0d5e9098d87b5b'],'CA',false,'ca'],
 ['Foot Locker Canada','Competitor',['66f18dfdaa0d5e9098aec096'],'CA',true,'ca'],['Champs Sports','Competitor',['66f1682aaa0d5e90980cc8b9'],'US',false,'ca'],
 ['Sporting Life','Competitor',['66bf2132b822dc10897c6b1d'],'CA',false,'ca'],['SOFTMOC SHOES','Competitor',['6785368511c51429e76eee22'],'CA',false,'ca'],
 ['Sport Chek','Competitor',['6686cae74eca12a94c097e31'],'CA',false,'ca'],['Livestock','Competitor',['689b9d2a32cf9d1d9d33d739'],'CA',false,'ca'],
 ['Aritzia','DTC Fashion',['668ee82372604270fc37d401'],'CA',false,'ca'],['HAVEN','DTC Fashion',['679a4ef09cca50e75f0fdd5d'],'CA',false,'ca'],
 ['adidas','Brand',['66632d1c81883095dd6ae180'],'Global',true,'core'],['New Balance','Brand',['66632d3281883095dd6ae1a1','66674d85c414b1b87445d93a'],'Global',true,'core'],
 ['Nike','Brand',['66632cfe81883095dd6ae135'],'Global',true,'core'],['Jordan','Brand',['66cce84e1cf0ed433fc9fadb'],'Global',true,'core'],
 ['PUMA','Brand',['674838133ae47f475e8c1bc6','674838143ae47f475e8c26ee','679528339136226a3f2ae0ec'],'Global',false,'core'],['ASICS','Brand',['66cf74384d5faa7eb9097649','66f0a4bbaa0d5e90986eb67f'],'Global',false,'core'],
 ['On','Brand',['66682fe488e8de843aa4565d'],'Global',false,'core'],['HOKA','Brand',['667c80787060016bdcf10656','66ec8c79aa0d5e9098f38947'],'Global',false,'core'],['Salomon','Brand',['66cf7b791f7995e70585b12a','66f0a416aa0d5e90986783bf'],'Global',false,'core'],
 ['Converse','Brand',['66cf74a24d5faa7eb90977fe','6793080400052784aaa67f71'],'Global',false,'core'],['Vans','Brand',['66f31c07f4afbc9927741bb8','6877db859e91033fc84af78b'],'Global',false,'core'],
 ['Foot Locker','Competitor',['66cf77ede42d53dcea78812f'],'US',true,'core'],
 ['END.','Competitor',['67aaa708831d04f1dd4c9edf'],'UK',false,'core'],['size?','Competitor',['66cf7b94b550cec0434dd84c'],'UK',false,'core'],
 ['Alo Yoga','DTC Fashion',['668c89694d167de132491fb6'],'US',true,'core'],['Comfrt','DTC Fashion',['66c37da5b822dc10899a8e09'],'US',false,'core'],['Gymshark','DTC Fashion',['66c37be1b822dc1089873f11'],'UK',true,'core'],['SKIMS','DTC Fashion',['66c37becb822dc108987aff0'],'US',true,'core'],
 ['Abercrombie & Fitch','DTC Fashion',['66e84679aa0d5e90982512a8'],'US',false,'core'],['Represent','DTC Fashion',['6791af218aff150773177f51'],'UK',true,'core'],['lululemon','DTC Fashion',['66702c7b21808d196662394d'],'CA',true,'core'],["Arc'teryx",'DTC Fashion',['66cf73734d5faa7eb9097371'],'CA',false,'core'],
 ['Vuori','DTC Fashion',['66abc6f8123a9cfb55ca0e98','66f1ff13aa0d5e9098c17079'],'US',false,'core'],['Bandit Running','DTC Fashion',['676e38b9c3e8edb857623dbe'],'US',false,'core'],
 ['Aimé Leon Dore','DTC Fashion',['66ec6817aa0d5e909850ca2a'],'US',false,'core'],['Fear of God','DTC Fashion',['67041e4cf21f9b4f9e067a59'],'US',false,'core'],
 ['The North Face','Brand',['66ab0cc89c9c39c6271f014d'],'US',true,'core'],['The North Face','Brand',['66e1c7d21cf0ed433fd6c2cc'],'EU',true,'core'],
 ['The North Face','Brand',['6750935d3ae47f475ecece6f'],'CL',true,'core'],['The North Face','Brand',['6750935d3ae47f475eced416'],'MX',true,'core'],
 ['Hibbett','Competitor',['67f3c56f87e38826eed34f3e'],'US',false,'new'],['DTLR','Competitor',['6913ba9c657bd8419b8c67a6'],'US',false,'new'],['Shoe Palace','Competitor',['6914cdd5a86502f517dc8c7f'],'US',false,'new'],
 ["DICK'S Sporting Goods",'Competitor',['66cf75614d5faa7eb9097aed'],'US',false,'new'],['Footasylum','Competitor',['66cf794ada161d103f983c1b'],'UK',false,'new'],['Sneakersnstuff','Competitor',['66e308d71cf0ed433fb75d8f'],'Global',false,'new'],
 ['Bodega','Competitor',['677a1ac1c3e8edb8572eb49d'],'US',false,'new'],['ASOS','Competitor',['66719500625c05a25d10f07a'],'UK',false,'new'],['Urban Outfitters','Competitor',['66ed80f6aa0d5e909814924d'],'US',false,'new'],
 ['Uniqlo','DTC Fashion',['66cf58b91cf0ed433f4bf89f'],'Global',false,'new'],['ZARA','DTC Fashion',['66cf736a4d5faa7eb909734b'],'Global',false,'new'],
 ['H&M','DTC Fashion',['66cca1fac75f5cdcb16fac17','677d482f938ccbc335487e07','67611f293ae47f475eac79da','67804463c55ff7501bf6cbc6','67ce7b00f78c95d5635de559','679813fa60196ffc7fb8a87c','69a8613aae8320c2c86e66ab'],'Global',false,'new'],
 ['SSENSE','Competitor',['669ecff5abc3e38e0d855f52'],'CA',false,'new'],['MR PORTER','Competitor',['66fb0689aa0d5e9098b2e08b'],'UK',false,'new'],['Cole Buxton','DTC Fashion',['66cf76feda161d103f98343f'],'UK',false,'new'],
 ['Trapstar','DTC Fashion',['678a9a5f00052784aaf41d5f'],'UK',false,'new'],['Patta','DTC Fashion',['6703e970f21f9b4f9e478598'],'Global',false,'new'],['Axel Arigato','DTC Fashion',['66cf73324d5faa7eb9097278'],'Global',false,'new'],
 ['Daily Paper','DTC Fashion',['66cf75c04d5faa7eb9097c4b'],'Global',false,'new'],
 ['Birkenstock','Brand',['66f3f7dcaa0d5e9098685458'],'US',false,'new'],['Birkenstock','Brand',['66f3f7dcaa0d5e9098685280'],'IN',false,'new'],['Birkenstock','Brand',['66cf73744d5faa7eb9097375'],'Global',false,'new'],
 ['UGG','Brand',['66fbfea3aa0d5e90985f1b23'],'US',false,'new'],['Dr. Martens','Brand',['66c37acab822dc108979e2bf'],'Global',false,'new'],
 ['Crocs','Brand',['66ed43f2aa0d5e9098d3b61e'],'US',false,'new'],['Crocs','Brand',['67a2ef530a70ccc0c57214ce'],'IN',false,'new'],
 ['Saucony','Brand',['66f00eff5affa6d6250205cf'],'US',false,'new'],['Brooks Running','Brand',['66cf776eda161d103f983566','67811958041514c07f1f4cb6'],'US',false,'new'],
 ['Merrell','Brand',['66cf79c0da161d103f983da0'],'US',false,'new'],['Merrell','Brand',['69b9bfc2c32a3e3756d86fb5'],'ZA',false,'new']];
/* Not in Motion (9 Nov 2026): Kith, Stussy, Palace, Carhartt WIP (only a Taiwan store page), Veja; no JD page for Ireland, Malaysia, Singapore or South Africa.
   Excluded non-English pages: JD France (674e4a2a411da97a4980d2db, was in the earlier list), JD Spain, JD Netherlands, H&M NL, UGG GR, Crocs JP/KR/TW, Merrell CL.
   Removed by Ryan 6 Nov: Snipes, Zalando, BYLT Basics. Corteiz not in Motion. */
const KEYVF=['Try-On','Native Search','Text Overlay','Product Image','Studio Shot','Flatlay','Model Shot','UGC Selfie','UGC Overlay','Review','Testimonial','Unboxing','POV','Vlog','Yapper','Us Vs Them','Street Interview','Reaction Video','Grid Swap','Lifestyle Image','Before and After','Transformation','Split Screen','Celebrity','Influencer Endorsement','Cinematic B-Roll','Offer-First Banner','Headline','Montage','Feature Benefit Pointout','Founder','Behind The Scenes','Social Comments','Notes App','Text Message','Stop Motion','ASMR','Skit','Trend','Collage','Editorial','Slideshow','Duet','Stitch','Greenscreen','Comment Response','Static To Video Hybrid','Social Media Mockup'];
const CAT={brandCategories:{values:['Apparel','Footwear']}};
const day=ms=>ms?new Date(ms).toISOString().slice(0,10):null;
/* concept_key: brand id + first 60 chars of the ad text, lowercase, URLs, emoji and punctuation removed */
const ckey=(bid,t)=>(bid||'')+':'+String(t||'').toLowerCase().replace(/https?:\/\/\S+|www\.\S+/g,' ').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim().slice(0,60);
function norm(n){const x=n._x||{};const src=n.sources||[];const seen=new Set();const uniq=src.filter(s=>s.url&&!seen.has(s.url)&&seen.add(s.url));
 const vid=uniq.find(s=>s.type==='video');const ims=uniq.filter(s=>s.type!=='video').map(s=>s.url).slice(0,10);const f=src[0]||{};
 const vf=((n.glossaryCategoryValues||[]).find(g=>g.name==='Visual Format')||{values:[]}).values.map(v=>v.name).filter(v=>v&&v!=='None');
 const st=n.startDate,en=n.adStatus==='active'?Date.now():(n.endDate||null);const bid=n.brand&&n.brand.id;
 return {id:n.id,brand:x.bname||(n.brand&&n.brand.name)||'Unknown',brand_id:bid,brand_group:x.group||'Category finds',brand_category:n.brand&&n.brand.brandCategory,logo:n.brand&&n.brand.logo,
  status:n.adStatus,start_date:day(st),end_date:n.adStatus==='active'?null:day(n.endDate),days_live:st&&en?Math.max(0,Math.round((en-st)/864e5)):null,
  format:n.adDisplayFormat||(vid?'video':ims.length>1?'carousel':'image'),visual_formats:vf,aspect:f.aspectRatio||null,platforms:n.platforms||[],cards:uniq.length,
  headline:f.title||null,copy:f.adText||null,cta:f.cta&&f.cta.text||null,landing:f.cta&&f.cta.link||null,video:vid?vid.url:null,poster:vid?vid.thumbnail:null,images:ims,
  ad_library:n.adsLibraryUrl||null,saves:n.saveCountRecent||0,save_count_recent:n.saveCountRecent==null?null:n.saveCountRecent,variants:src.length,pulled_via:n._via,last_seen:new Date().toISOString(),
  market:x.market||null,focus:x.focus==null?null:!!x.focus,concept_key:ckey(bid,f.adText||f.title)}}
const KEYG=new Set(KEYVF);
const score=r=>((r.days_live||0)>=30?3:0)+((r.visual_formats||[]).some(t=>KEYG.has(t))?2:0)+(r.status==='active'?1:0)+(r.start_date?(new Date(r.start_date)-new Date('2025-01-01'))/3e10:0);
function trim(rows,{CAP=40,VCAP=12,CAT_PER=6,CAT_MAX=260}={}){const keep=[],byB={};const names=new Set(BR.map(b=>b[0]));
 rows.forEach(r=>{if(names.has(r.brand))(byB[r.brand]=byB[r.brand]||[]).push(r)});
 for(const L of Object.values(byB)){L.sort((a,b)=>score(b)-score(a));let v=0,n=0;for(const r of L){if(n>=CAP)break;if(r.format==='video'){if(v>=VCAP)continue;v++}keep.push(r);n++}}
 const have=new Set(keep.map(r=>r.id));const cat=rows.filter(r=>!names.has(r.brand)&&r.brand_group==='Category finds').sort((a,b)=>score(b)-score(a));const per={};let c=0;
 for(const r of cat){if(c>=CAT_MAX)break;const t=(r.visual_formats||[]).find(x=>KEYG.has(x));if(!t||have.has(r.id))continue;per[t]=(per[t]||0)+1;if(per[t]>CAT_PER)continue;keep.push(r);have.add(r.id);c++}
 return keep}
async function upsert(rows){const IN=window.__IN;for(let i=0;i<rows.length;i+=200){let ok=false;for(let a=0;a<3&&!ok;a++){const r=await fetch(SB+'in_ads?on_conflict=id',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+200))});
  if(r.ok)ok=true;else{IN.log.push('upsert '+r.status+' '+(await r.text()).slice(0,200));await sleep(3000)}}if(!ok)throw new Error('upsert failed');IN.upserted=(IN.upserted||0)+Math.min(200,rows.length-i)}}
window.__inspoTrim=trim;window.__inspoUpsert=upsert;window.__inspoBrands=BR;window.__inspoKey=ckey;
window.__inspoRun=({mode='weekly',only=null,months=12,per=150}={})=>{const IN=window.__IN={status:'running',mode,ads:{},log:[],step:'',upserted:0,req:0,failed:[],perBrand:{},t0:Date.now()};
 const add=(list,tag,extra)=>{for(const n of list){const o=IN.ads[n.id];if(o){if(!o._via.includes(tag))o._via.push(tag);if(extra&&!o._x.bname)Object.assign(o._x,extra)}else{n._via=[tag];n._x=Object.assign({},extra||{});IN.ads[n.id]=n}}};
 (async()=>{try{
  if(mode==='deep'){const cut=Date.now()-months*30.44*864e5;window.__BRANDGUARD=true;
   for(const [name,grp,ids,market,focus] of BR){if(only&&!only.includes(name))continue;IN.step=name+' '+market;fails=0;const f={brands:{ids}},x={group:grp,bname:name,market,focus};IN.ads={};
    try{if(focus){const inWin=n=>!n.startDate||n.startDate>=cut||n.adStatus==='active'||(n.endDate||0)>=cut;
      add(await since(f,cut),'brand',x);for(const s of ['TOP','LONGEST_RUNNING'])add((await take(f,s,1000)).filter(inWin),'brand',x);
      /* Motion caps each query at roughly 250 to 270 ads, so a capped brand is also pulled per visual format */
      if(Object.keys(IN.ads).length>=240)for(const vf of KEYVF){IN.step=name+' '+market+' '+vf;add((await take({brands:{ids},visualFormats:{values:[vf]}},'NEWEST',1000)).filter(inWin),'brand',x)}}
     else{add(await take(f,'LONGEST_RUNNING',per),'brand',x);if(Object.keys(IN.ads).length<per){const nw=await take(f,'NEWEST',per);add(nw.filter(n=>!IN.ads[n.id]).slice(0,per-Object.keys(IN.ads).length),'brand',x)}}}
    catch(e){if(e instanceof BrandFail){IN.failed.push(name+' '+market)}else throw e}
    const rows=Object.values(IN.ads).filter(n=>n.isAd!==false).map(norm);if(rows.length)await upsert(rows);
    IN.perBrand[name+' '+market]=rows.length;IN.log.push(name+' '+market+' '+rows.length)}
   window.__BRANDGUARD=false;IN.status='done';return}
  for(const [name,grp,ids,market,focus] of BR){if(only&&!only.includes(name))continue;IN.step=name;const f={brands:{ids}},x={group:grp,bname:name,market,focus};
   if(mode==='full'){add(await take(f,'TOP',100),'brand',x);add(await take(f,'LONGEST_RUNNING',40),'brand',x);add(await take(f,'NEWEST',30),'brand',x);for(const vf of KEYVF){const l=await take({brands:{ids},visualFormats:{values:[vf]}},'TOP',12);if(l.length)add(l,'format',x)}}
   else{add(await take(f,'NEWEST',40),'brand',x);add(await take(f,'TOP',30),'brand',x)}
   IN.log.push(name+' '+Object.keys(IN.ads).length)}
  if(!only)for(const vf of KEYVF){IN.step='category '+vf;add(await take({...CAT,visualFormats:{values:[vf]}},'TOP',mode==='full'?40:15),'category');if(mode==='full')add(await take({...CAT,visualFormats:{values:[vf]}},'LONGEST_RUNNING',15),'category')}
  if(!only)for(const s of ['TOP','NEWEST']){IN.step='category '+s;add(await take(CAT,s,mode==='full'?200:100),'category')}
  IN.step='upsert';IN.rows=trim(Object.values(IN.ads).filter(n=>n.isAd!==false).map(norm),mode==='full'?{}:{CAP:8,VCAP:3,CAT_PER:2,CAT_MAX:40});await upsert(IN.rows);
  IN.status='done'}catch(e){IN.status='error';IN.err=String(e)}})();
 return 'started '+mode};
window.__inspoNorm=norm;
})();

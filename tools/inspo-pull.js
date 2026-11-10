/* Discover Ads › Inspo pull. Run in the browser on https://projects.motionapp.com/... (signed in to Motion).
   Pulls apparel & footwear ads from Motion's Inspo library (its own GraphQL API, same calls the Discover page makes),
   normalises them and upserts into Supabase in_ads. Media stays on Motion until tools/inspo-store.js copies it.
   Usage: paste this file, then  window.__inspoRun({mode:'full'|'weekly'|'light'})  and poll  window.__IN.status  until 'done'.
   weekly (Mondays) = newest + top per brand by tier (tier 1: 12 kept, 2: 8, 3: 4) + category;
   light (Wed/Fri) = only ads active under 7 days, newest first, new ids only (no trim beyond that); full = deep backfill (TOP 100, LONGEST_RUNNING 40, NEWEST 30,
   12 per key visual format) trimmed to 40 per brand (12 video) + 260 category finds. Only new ads are added; existing rows are updated in place. */
(()=>{
const SB='https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/',K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const ws=(location.pathname.match(/organization\/\w+\/(\w+)/)||[])[1];
const Q=`query F($workspaceId: ID!, $filters: InputSwipeFileItemsFilters, $sort: BrandFollowingSort!, $first: Int, $after: String) { workspaceV2(workspaceId: $workspaceId) { discoverFeed { ads(sort:$sort, first:$first, after:$after, filters:$filters){ edges{ node{ id adStatus startDate endDate adDisplayFormat adsLibraryUrl platforms isAd source saveCountRecent brand{id name brandCategory logo} sources{ adText url type thumbnail title aspectRatio cta{text link} } glossaryCategoryValues{ name values{name} } } } pageInfo{endCursor hasNextPage} } } } }`;
const call=async v=>{for(let a=0;a<4;a++){try{const r=await fetch('/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationName:'F',query:Q,variables:{workspaceId:ws,...v}})});const j=await r.json();if(j.data)return j.data.workspaceV2.discoverFeed.ads}catch(e){}await new Promise(r=>setTimeout(r,2000*(a+1)))}return{edges:[],pageInfo:{}}};
const take=async(filters,sort,n)=>{let out=[],after=null;while(out.length<n){const a=await call({filters,sort,first:Math.min(100,n-out.length),after});out=out.concat(a.edges.map(e=>e.node));if(!a.pageInfo||!a.pageInfo.hasNextPage)break;after=a.pageInfo.endCursor}return out};
/* Priority brand list (Ryan, 10 Nov 2026): every named brand in the library, by tier. Names match in_ads.brand.
   Tier 1 core: JD markets, the big DTC / athleisure brands, top brands, Canadian competitors. Tier 2 standard. Tier 3 light. */
const BR=[
 ['JD Sports','JD Global',['66cf75a0e42d53dcea7879b5','674e4a2a411da97a4980d2db'],1],['JD Sports US','JD Global',['67aa28cb0a70ccc0c54281c6'],1],
 ['JD Sports Australia','JD Global',['686f2d9374342e14cdc10979'],1],['JD Sports New Zealand','JD Global',['69925634d7b54bd21a2fcadb'],1],
 ['SKIMS','DTC Fashion',['66c37becb822dc108987aff0'],1],['Alo Yoga','DTC Fashion',['668c89694d167de132491fb6'],1],['Gymshark','DTC Fashion',['66c37be1b822dc1089873f11'],1],
 ['lululemon','DTC Fashion',['66702c7b21808d196662394d'],1],['Comfrt','DTC Fashion',['66c37da5b822dc10899a8e09'],1],['Vuori','DTC Fashion',['66abc6f8123a9cfb55ca0e98','66f1ff13aa0d5e9098c17079'],1],
 ['The North Face','Brand',['66ab0cc89c9c39c6271f014d','66e1c7d21cf0ed433fd6c2cc','6750935d3ae47f475ecece6f','6750935d3ae47f475eced416'],1],
 ['Nike','Brand',['66632cfe81883095dd6ae135'],1],['Jordan','Brand',['66cce84e1cf0ed433fc9fadb'],1],['adidas','Brand',['66632d1c81883095dd6ae180'],1],
 ['New Balance','Brand',['66632d3281883095dd6ae1a1','66674d85c414b1b87445d93a'],1],
 ['Foot Locker','Competitor',['66cf77ede42d53dcea78812f'],1],['Foot Locker Canada','Competitor',['66f18dfdaa0d5e9098aec096'],1],['Champs Sports','Competitor',['66f1682aaa0d5e90980cc8b9'],1],
 ['Sport Chek','Competitor',['6686cae74eca12a94c097e31'],1],['Little Burgundy Shoes','Competitor',['66f6cbcaaa0d5e9098d87b5b'],1],['Browns Shoes','Competitor',['67a284970a70ccc0c58afd6d'],1],
 ['SOFTMOC SHOES','Competitor',['6785368511c51429e76eee22'],1],['Sporting Life','Competitor',['66bf2132b822dc10897c6b1d'],1],
 ['Aritzia','DTC Fashion',['668ee82372604270fc37d401'],2],['Abercrombie & Fitch','DTC Fashion',['66e84679aa0d5e90982512a8'],2],['Bandit Running','DTC Fashion',['676e38b9c3e8edb857623dbe'],2],
 ['Represent Clo','DTC Fashion',['66c37b5eb822dc108981bf36','6791af218aff150773177f51'],2],['Cole Buxton','DTC Fashion',['66cf76feda161d103f98343f'],2],['Axel Arigato','DTC Fashion',['66cf73324d5faa7eb9097278'],2],
 ["Arc'teryx",'DTC Fashion',['66cf73734d5faa7eb9097371'],2],['HAVEN','DTC Fashion',['679a4ef09cca50e75f0fdd5d'],2],['Fear of God','DTC Fashion',['67041e4cf21f9b4f9e067a59'],2],
 ['Uniqlo','DTC Fashion',['66cf58b91cf0ed433f4bf89f'],2],['H&M','DTC Fashion',['66cca1fac75f5cdcb16fac17','67611f293ae47f475eac79da','677d482f938ccbc335487e07','679813fa60196ffc7fb8a87c','67ce7b00f78c95d5635de559','69a8613aae8320c2c86e66ab'],2],
 ['ZARA','DTC Fashion',['66cf736a4d5faa7eb909734b'],2],['Daily Paper','DTC Fashion',['66cf75c04d5faa7eb9097c4b'],2],['Aimé Leon Dore','DTC Fashion',['66ec6817aa0d5e909850ca2a'],2],
 ['Birkenstock','Brand',['66cf73744d5faa7eb9097375','66f3f7dcaa0d5e9098685280','66f3f7dcaa0d5e9098685458'],2],['Crocs','Brand',['66ed43f2aa0d5e9098d3b61e','67a2ef530a70ccc0c57214ce'],2],
 ['Vans','Brand',['66f31c07f4afbc9927741bb8','6877db859e91033fc84af78b'],2],['Converse','Brand',['66cf74a24d5faa7eb90977fe','6793080400052784aaa67f71'],2],
 ['PUMA','Brand',['674838133ae47f475e8c1bc6','674838143ae47f475e8c26ee','679528339136226a3f2ae0ec'],2],['ASICS','Brand',['66cf74384d5faa7eb9097649','66f0a4bbaa0d5e90986eb67f'],2],
 ['On','Brand',['66682fe488e8de843aa4565d'],2],['HOKA','Brand',['667c80787060016bdcf10656','66ec8c79aa0d5e9098f38947'],2],['Salomon','Brand',['66cf7b791f7995e70585b12a','66f0a416aa0d5e90986783bf'],2],
 ['UGG','Brand',['66fbfea3aa0d5e90985f1b23'],2],['Dr. Martens','Brand',['66c37acab822dc108979e2bf'],2],['Merrell','Brand',['66cf79c0da161d103f983da0','69b9bfc2c32a3e3756d86fb5'],2],
 ['Brooks Running','Brand',['66cf776eda161d103f983566','67811958041514c07f1f4cb6'],2],
 ['END.','Competitor',['67aaa708831d04f1dd4c9edf'],2],['size?','Competitor',['66cf7b94b550cec0434dd84c'],2],['Finish Line','Competitor',['670ff958a61172249cb1b88d'],2],
 ["DICK'S Sporting Goods",'Competitor',['66cf75614d5faa7eb9097aed'],2],['Hibbett','Competitor',['67f3c56f87e38826eed34f3e'],2],['Footasylum','Competitor',['66cf794ada161d103f983c1b'],2],
 ['SSENSE','Competitor',['669ecff5abc3e38e0d855f52'],2],['MR PORTER','Competitor',['66fb0689aa0d5e9098b2e08b'],2],['ASOS','Competitor',['66719500625c05a25d10f07a'],2],
 ['Urban Outfitters','Competitor',['66ed80f6aa0d5e909814924d'],2],['Sneakersnstuff','Competitor',['66e308d71cf0ed433fb75d8f'],2],
 ['Saucony','Brand',['66f00eff5affa6d6250205cf'],3],['Shoe Palace','Competitor',['6914cdd5a86502f517dc8c7f'],3],['DTLR','Competitor',['6913ba9c657bd8419b8c67a6'],3],
 ['Patta','DTC Fashion',['6703e970f21f9b4f9e478598'],3],['Trapstar','DTC Fashion',['678a9a5f00052784aaf41d5f'],3]];
/* Not in Motion (6 Nov 2026): Corteiz, Kith. Removed by Ryan 6 Nov: Snipes, Zalando, BYLT Basics. */
const KEYVF=['Try-On','Native Search','Text Overlay','Product Image','Studio Shot','Flatlay','Model Shot','UGC Selfie','UGC Overlay','Review','Testimonial','Unboxing','POV','Vlog','Yapper','Us Vs Them','Street Interview','Reaction Video','Grid Swap','Lifestyle Image','Before and After','Transformation','Split Screen','Celebrity','Influencer Endorsement','Cinematic B-Roll','Offer-First Banner','Headline','Montage','Feature Benefit Pointout','Founder','Behind The Scenes','Social Comments','Notes App','Text Message','Stop Motion','ASMR','Skit','Trend','Collage','Editorial','Slideshow','Duet','Stitch','Greenscreen','Comment Response','Static To Video Hybrid','Social Media Mockup'];
const CAT={brandCategories:{values:['Apparel','Footwear']}};
const day=ms=>ms?new Date(ms).toISOString().slice(0,10):null;
function norm(n){const x=n._x||{};const src=n.sources||[];const seen=new Set();const uniq=src.filter(s=>s.url&&!seen.has(s.url)&&seen.add(s.url));
 const vid=uniq.find(s=>s.type==='video');const ims=uniq.filter(s=>s.type!=='video').map(s=>s.url).slice(0,10);const f=src[0]||{};
 const vf=((n.glossaryCategoryValues||[]).find(g=>g.name==='Visual Format')||{values:[]}).values.map(v=>v.name).filter(v=>v&&v!=='None');
 const st=n.startDate,en=n.adStatus==='active'?Date.now():(n.endDate||null);
 return {id:n.id,brand:x.bname||(n.brand&&n.brand.name)||'Unknown',brand_id:n.brand&&n.brand.id,brand_group:x.group||'Category finds',brand_category:n.brand&&n.brand.brandCategory,logo:n.brand&&n.brand.logo,
  status:n.adStatus,start_date:day(st),end_date:n.adStatus==='active'?null:day(n.endDate),days_live:st&&en?Math.max(0,Math.round((en-st)/864e5)):null,
  format:n.adDisplayFormat||(vid?'video':ims.length>1?'carousel':'image'),visual_formats:vf,aspect:f.aspectRatio||null,platforms:n.platforms||[],cards:uniq.length,
  headline:f.title||null,copy:f.adText||null,cta:f.cta&&f.cta.text||null,landing:f.cta&&f.cta.link||null,video:vid?vid.url:null,poster:vid?vid.thumbnail:null,images:ims,
  ad_library:n.adsLibraryUrl||null,saves:n.saveCountRecent||0,variants:src.length,pulled_via:n._via,last_seen:new Date().toISOString()}}
/* Keep the library a size the free storage plan can hold: per brand up to CAP ads (VCAP videos), ranked by
   proven (ran 30+ days), tagged with a key visual format, still running, newest. Category finds: top CAT_PER per key format. */
const KEYG=new Set(KEYVF);
const score=r=>((r.days_live||0)>=30?3:0)+((r.visual_formats||[]).some(t=>KEYG.has(t))?2:0)+(r.status==='active'?1:0)+(r.start_date?(new Date(r.start_date)-new Date('2025-01-01'))/3e10:0);
const TIER={};BR.forEach(b=>TIER[b[0]]=b[3]||2);
function trim(rows,{CAP=40,VCAP=12,CAT_PER=6,CAT_MAX=260,TCAP=null}={}){const keep=[],byB={};const names=new Set(BR.map(b=>b[0]));
 rows.forEach(r=>{if(names.has(r.brand))(byB[r.brand]=byB[r.brand]||[]).push(r)});
 for(const [bn,L] of Object.entries(byB)){L.sort((a,b)=>score(b)-score(a));const cap=TCAP?TCAP[TIER[bn]][0]:CAP,vcap=TCAP?TCAP[TIER[bn]][1]:VCAP;let v=0,n=0;for(const r of L){if(n>=cap)break;if(r.format==='video'){if(v>=vcap)continue;v++}keep.push(r);n++}}
 const have=new Set(keep.map(r=>r.id));const cat=rows.filter(r=>!names.has(r.brand)&&r.brand_group==='Category finds').sort((a,b)=>score(b)-score(a));const per={};let c=0;
 for(const r of cat){if(c>=CAT_MAX)break;const t=(r.visual_formats||[]).find(x=>KEYG.has(x));if(!t||have.has(r.id))continue;per[t]=(per[t]||0)+1;if(per[t]>CAT_PER)continue;keep.push(r);have.add(r.id);c++}
 return keep}
async function upsert(rows){const IN=window.__IN;for(let i=0;i<rows.length;i+=200){const r=await fetch(SB+'in_ads?on_conflict=id',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+200))});if(!r.ok)throw new Error('upsert '+r.status+' '+(await r.text()).slice(0,200));IN.upserted=(IN.upserted||0)+Math.min(200,rows.length-i)}}
async function known(ids){const have=new Set();for(let i=0;i<ids.length;i+=150){const r=await fetch(SB+'in_ads?select=id&id=in.('+ids.slice(i,i+150).map(x=>'"'+x+'"').join(',')+')',{headers:{apikey:K,Authorization:'Bearer '+K}});if(!r.ok)throw new Error('known '+r.status);(await r.json()).forEach(x=>have.add(x.id))}return have}
const RECENT={activeTime:{value:'under_seven_days'}};
window.__inspoTrim=trim;window.__inspoUpsert=upsert;
window.__inspoRun=({mode='weekly',only=null}={})=>{const IN=window.__IN={status:'running',mode,ads:{},log:[],step:'',upserted:0};
 const add=(list,tag,extra)=>{for(const n of list){const o=IN.ads[n.id];if(o){if(!o._via.includes(tag))o._via.push(tag);if(extra&&!o._x.bname)Object.assign(o._x,extra)}else{n._via=[tag];n._x=Object.assign({},extra||{});IN.ads[n.id]=n}}};
 (async()=>{try{
  for(const [name,grp,ids,tier=2] of BR){if(only&&!only.includes(name))continue;IN.step=name;const f={brands:{ids}},x={group:grp,bname:name};
   if(mode==='full'){add(await take(f,'TOP',100),'brand',x);add(await take(f,'LONGEST_RUNNING',40),'brand',x);add(await take(f,'NEWEST',30),'brand',x);for(const vf of KEYVF){const l=await take({brands:{ids},visualFormats:{values:[vf]}},'TOP',12);if(l.length)add(l,'format',x)}}
   else if(mode==='light'){add(await take({...f,...RECENT},'NEWEST',[0,20,12,6][tier]),'brand',x)}
   else{add(await take(f,'NEWEST',[0,40,25,10][tier]),'brand',x);if(tier<3)add(await take(f,'TOP',[0,30,15,0][tier]),'brand',x)}
   IN.log.push(name+' '+Object.keys(IN.ads).length)}
  if(mode==='light'&&!only){IN.step='category recent';add(await take({...CAT,...RECENT},'NEWEST',60),'category')}
  if(!only&&mode!=='light')for(const vf of KEYVF){IN.step='category '+vf;add(await take({...CAT,visualFormats:{values:[vf]}},'TOP',mode==='full'?40:15),'category');if(mode==='full')add(await take({...CAT,visualFormats:{values:[vf]}},'LONGEST_RUNNING',15),'category')}
  if(!only&&mode!=='light')for(const s of ['TOP','NEWEST']){IN.step='category '+s;add(await take(CAT,s,mode==='full'?200:100),'category')}
  let rows=Object.values(IN.ads).filter(n=>n.isAd!==false).map(norm);
  if(mode==='light'){IN.step='known ids';const have=await known(rows.map(r=>r.id));IN.fetched=rows.length;
   rows=rows.filter(r=>!have.has(r.id));const kg=new Set(KEYVF);let c=0;rows=rows.filter(r=>r.brand_group!=='Category finds'||((r.visual_formats||[]).some(t=>kg.has(t))&&c++<20));IN.newIds=rows.map(r=>r.id)}
  else rows=trim(rows,mode==='full'?{}:{CAT_PER:2,CAT_MAX:40,TCAP:{1:[12,5],2:[8,3],3:[4,2]}});
  IN.step='upsert';IN.rows=rows;await upsert(IN.rows);
  IN.status='done'}catch(e){IN.status='error';IN.err=String(e)}})();
 return 'started '+mode};
window.__inspoNorm=norm;
})();

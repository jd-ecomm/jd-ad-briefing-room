/* Discover Ads › Inspo pull. Run in the browser on https://projects.motionapp.com/... (signed in to Motion).
   Pulls apparel & footwear ads from Motion's Inspo library (its own GraphQL API, same calls the Discover page makes),
   normalises them and upserts into Supabase in_ads. Media stays on Motion until tools/inspo-store.js copies it.
   Usage: paste this file, then  window.__inspoRun({mode:'full'|'weekly'})  and poll  window.__IN.status  until 'done'.
   weekly = NEWEST 40 per brand + category NEWEST/TOP; full = deep backfill (TOP 100, LONGEST_RUNNING 40, NEWEST 30, 12 per key visual format). */
(()=>{
const SB='https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/',K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const ws=(location.pathname.match(/organization\/\w+\/(\w+)/)||[])[1];
const Q=`query F($workspaceId: ID!, $filters: InputSwipeFileItemsFilters, $sort: BrandFollowingSort!, $first: Int, $after: String) { workspaceV2(workspaceId: $workspaceId) { discoverFeed { ads(sort:$sort, first:$first, after:$after, filters:$filters){ edges{ node{ id adStatus startDate endDate adDisplayFormat adsLibraryUrl platforms isAd source saveCountRecent brand{id name brandCategory logo} sources{ adText url type thumbnail title aspectRatio cta{text link} } glossaryCategoryValues{ name values{name} } } } pageInfo{endCursor hasNextPage} } } } }`;
const call=async v=>{for(let a=0;a<4;a++){try{const r=await fetch('/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationName:'F',query:Q,variables:{workspaceId:ws,...v}})});const j=await r.json();if(j.data)return j.data.workspaceV2.discoverFeed.ads}catch(e){}await new Promise(r=>setTimeout(r,2000*(a+1)))}return{edges:[],pageInfo:{}}};
const take=async(filters,sort,n)=>{let out=[],after=null;while(out.length<n){const a=await call({filters,sort,first:Math.min(100,n-out.length),after});out=out.concat(a.edges.map(e=>e.node));if(!a.pageInfo||!a.pageInfo.hasNextPage)break;after=a.pageInfo.endCursor}return out};
/* Brands from the BFCM project library (Motion brand ids; several have regional pages). Add confirmed brands here. */
const BR=[['JD Sports','JD Global',['66cf75a0e42d53dcea7879b5','674e4a2a411da97a4980d2db']],['adidas','Brand',['66632d1c81883095dd6ae180']],['New Balance','Brand',['66632d3281883095dd6ae1a1','66674d85c414b1b87445d93a']],['Nike','Brand',['66632cfe81883095dd6ae135']],['Salomon','Brand',['66cf7b791f7995e70585b12a','66f0a416aa0d5e90986783bf']],['Converse','Brand',['66cf74a24d5faa7eb90977fe','6793080400052784aaa67f71']],['Vans','Brand',['66f31c07f4afbc9927741bb8','6877db859e91033fc84af78b']],['Snipes','Competitor',['66e308da1cf0ed433fb78eab','68b70164121ef587c2f000e8']],['Zalando','Competitor',['66cf73354d5faa7eb9097282']],['END.','Competitor',['67aaa708831d04f1dd4c9edf']],['size?','Competitor',['66cf7b94b550cec0434dd84c']],['Foot Locker','Competitor',['66cf77ede42d53dcea78812f']],['Finish Line','Competitor',['670ff958a61172249cb1b88d']],['Alo Yoga','DTC Fashion',['668c89694d167de132491fb6']],['Comfrt','DTC Fashion',['66c37da5b822dc10899a8e09']],['BYLT Basics','DTC Fashion',['66a1551ec672c19bcf920f5e']],['Gymshark','DTC Fashion',['66c37be1b822dc1089873f11']],['SKIMS','DTC Fashion',['66c37becb822dc108987aff0']],['Abercrombie & Fitch','DTC Fashion',['66e84679aa0d5e90982512a8']],['Represent','DTC Fashion',['6791af218aff150773177f51']],['lululemon','DTC Fashion',['66702c7b21808d196662394d']],["Arc'teryx",'DTC Fashion',['66cf73734d5faa7eb9097371']],['Vuori','DTC Fashion',['66abc6f8123a9cfb55ca0e98','66f1ff13aa0d5e9098c17079']],['HAVEN','DTC Fashion',['679a4ef09cca50e75f0fdd5d']],['Bandit Running','DTC Fashion',['676e38b9c3e8edb857623dbe']]];
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
window.__inspoRun=({mode='weekly'}={})=>{const IN=window.__IN={status:'running',mode,ads:{},log:[],step:'',upserted:0};
 const add=(list,tag,extra)=>{for(const n of list){const o=IN.ads[n.id];if(o){if(!o._via.includes(tag))o._via.push(tag);if(extra&&!o._x.bname)Object.assign(o._x,extra)}else{n._via=[tag];n._x=Object.assign({},extra||{});IN.ads[n.id]=n}}};
 (async()=>{try{
  for(const [name,grp,ids] of BR){IN.step=name;const f={brands:{ids}},x={group:grp,bname:name};
   if(mode==='full'){add(await take(f,'TOP',100),'brand',x);add(await take(f,'LONGEST_RUNNING',40),'brand',x);add(await take(f,'NEWEST',30),'brand',x);for(const vf of KEYVF){const l=await take({brands:{ids},visualFormats:{values:[vf]}},'TOP',12);if(l.length)add(l,'format',x)}}
   else{add(await take(f,'NEWEST',40),'brand',x);add(await take(f,'TOP',30),'brand',x)}
   IN.log.push(name+' '+Object.keys(IN.ads).length)}
  for(const vf of KEYVF){IN.step='category '+vf;add(await take({...CAT,visualFormats:{values:[vf]}},'TOP',mode==='full'?40:15),'category');if(mode==='full')add(await take({...CAT,visualFormats:{values:[vf]}},'LONGEST_RUNNING',15),'category')}
  for(const s of ['TOP','NEWEST']){IN.step='category '+s;add(await take(CAT,s,mode==='full'?200:100),'category')}
  IN.step='upsert';IN.rows=Object.values(IN.ads).filter(n=>n.isAd!==false).map(norm);
  for(let i=0;i<IN.rows.length;i+=200){const r=await fetch(SB+'in_ads?on_conflict=id',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(IN.rows.slice(i,i+200))});if(!r.ok)throw new Error('upsert '+r.status+' '+(await r.text()).slice(0,200));IN.upserted+=Math.min(200,IN.rows.length-i)}
  IN.status='done'}catch(e){IN.status='error';IN.err=String(e)}})();
 return 'started '+mode};
window.__inspoNorm=norm;
})();

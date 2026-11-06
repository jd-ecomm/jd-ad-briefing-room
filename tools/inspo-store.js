/* Discover Ads › Inspo: copy ad media into the Briefing Room's own storage (Supabase bucket "inspo").
   Run on any https://motionswipefile.blob.core.windows.net/... page (same origin as Motion's media, so fetch and canvas work).
   Per in_ads row not stored yet: a 480px card thumbnail (video poster or first image), every image/carousel card at 720px (JPEG),
   the brand logo, and the video file itself (Motion's copy is already ~360x640, ~1 MB) while the video budget allows.
   Supabase is on the free plan (1 GB for everything), so videos are capped by VBUDGET_MB; ads on a board or in someone's
   favourites are stored first and are never pruned. Ads over budget still play in the Briefing Room, streamed from Motion.
   Usage: paste, then  await window.__inspoStore(120)  repeatedly until it reports "0 left".  window.__inspoPrune() frees space. */
(()=>{
const K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const B='https://cymkcvdsxoneojfisjgk.supabase.co/',H={apikey:K,Authorization:'Bearer '+K};
const VBUDGET_MB=430, MBUDGET_MB=190, MAXV_MB=6;
const logos={};
const rest=async(p,o={})=>{const r=await fetch(B+'rest/v1/'+p,{...o,headers:{...H,'Content-Type':'application/json',...(o.headers||{})}});if(!r.ok)throw new Error(p.split('?')[0]+' '+r.status);const t=await r.text();return t?JSON.parse(t):null};
async function shrink(u,max){const r=await fetch(u);if(!r.ok)throw new Error('src '+r.status);const b=await r.blob();
 const bm=await createImageBitmap(b);const s=Math.min(1,max/Math.max(bm.width,bm.height));const c=new OffscreenCanvas(Math.round(bm.width*s),Math.round(bm.height*s));
 c.getContext('2d').drawImage(bm,0,0,c.width,c.height);return c.convertToBlob({type:'image/jpeg',quality:.8})}
async function put(blob,path,type){const up=await fetch(B+'storage/v1/object/inspo/'+path,{method:'POST',headers:{...H,'x-upsert':'true','Content-Type':type||'image/jpeg'},body:blob});
 if(!up.ok)throw new Error('upload '+up.status+' '+(await up.text()).slice(0,80));return B+'storage/v1/object/public/inspo/'+path}
async function used(){let v=0,m=0;for(let from=0;;from+=1000){const r=await fetch(B+'rest/v1/in_ads?select=video_bytes,media_bytes&or=(video_bytes.gt.0,media_bytes.gt.0)&order=id',{headers:{...H,Range:from+'-'+(from+999)}});const j=await r.json();j.forEach(x=>{v+=x.video_bytes||0;m+=x.media_bytes||0});if(j.length<1000)break}return {v,m}} /* pages past the 1,000-row API cap */
async function saved(){const [f,b]=await Promise.all([rest('in_favs?select=ad_id'),rest('in_board_items?select=ad_id')]);return new Set([...f,...b].map(x=>x.ad_id))}
window.__inspoStore=async(LIMIT=120,CONC=6)=>{
 if(location.hostname!=='motionswipefile.blob.core.windows.net')return 'WRONG PAGE: open a motionswipefile.blob.core.windows.net media URL first';
 const keep=await saved();let U=await used();
 let rows=await rest('in_ads?select=id,brand_id,format,video,poster,images,logo,days_live,status&stored_at=is.null&order=days_live.desc.nullslast&limit='+LIMIT);
 rows.sort((a,b)=>keep.has(b.id)-keep.has(a.id));
 let ok=0,vids=0,skipV=0,fail=[];
 const one=async r=>{const p={images_s:[]};let mb=0;try{
   const first=r.poster||(r.images||[])[0];if(first){const t=await shrink(first,480);mb+=t.size;p.thumb_s=await put(t,r.id+'/thumb.jpg')}
   if(r.format!=='video'||!r.video)for(let i=0;i<(r.images||[]).length;i++){const t=await shrink(r.images[i],720);mb+=t.size;p.images_s.push(await put(t,r.id+'/img'+(i+1)+'.jpg'))}
   if(r.logo&&r.brand_id){logos[r.brand_id]=logos[r.brand_id]||shrink(r.logo,96).then(t=>put(t,'logos/'+r.brand_id+'.jpg')).catch(()=>null);p.logo_s=await logos[r.brand_id]}
   if(r.video){const room=VBUDGET_MB*1048576-U.v;const v=await fetch(r.video);if(v.ok){const len=+v.headers.get('content-length')||0;
     if((len&&len<MAXV_MB*1048576&&len<room)||keep.has(r.id)){const bl=await v.blob();U.v+=bl.size;p.video_s=await put(bl,r.id+'/video.mp4','video/mp4');p.video_bytes=bl.size;vids++}else{skipV++;v.body&&v.body.cancel()}}}
   p.media_bytes=mb;U.m+=mb;p.stored_at=new Date().toISOString();ok++}catch(e){fail.push(r.id+': '+e.message);if(String(e.message).startsWith('src 4'))p.stored_at=new Date().toISOString()}
  await fetch(B+'rest/v1/in_ads?id=eq.'+r.id,{method:'PATCH',headers:{...H,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(p)})};
 const q=rows.slice();await Promise.all(Array.from({length:CONC},async()=>{while(q.length)await one(q.shift())}));
 const left=await fetch(B+'rest/v1/in_ads?select=id&stored_at=is.null',{headers:{...H,Prefer:'count=exact',Range:'0-0'}});
 return `${ok}/${rows.length} stored · ${vids} videos saved, ${skipV} over budget (stream from Motion) · videos ${(U.v/1048576).toFixed(0)}/${VBUDGET_MB} MB · images ${(U.m/1048576).toFixed(0)}/${MBUDGET_MB} MB · ${(left.headers.get('content-range')||'').split('/')[1]} left`+(fail.length?' · FAIL '+fail.length+': '+fail.slice(0,2).join(' ; '):'')};
/* Free video space (needs a delete policy on bucket inspo, not granted as of 6 Nov 2026): delete the oldest stored videos that nobody has favourited or put on a board until under TARGET_MB. */
window.__inspoPrune=async(TARGET_MB=VBUDGET_MB-60)=>{const keep=await saved();let U=await used();if(U.v<=TARGET_MB*1048576)return 'under budget: '+(U.v/1048576).toFixed(0)+' MB';
 const rows=await rest('in_ads?select=id,video_bytes,start_date&video_bytes=gt.0&order=start_date.asc');let n=0;
 for(const r of rows){if(U.v<=TARGET_MB*1048576)break;if(keep.has(r.id))continue;const d=await fetch(B+'storage/v1/object/inspo/'+r.id+'/video.mp4',{method:'DELETE',headers:H});if(!d.ok)continue;
  await fetch(B+'rest/v1/in_ads?id=eq.'+r.id,{method:'PATCH',headers:{...H,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({video_s:null,video_bytes:0})});U.v-=r.video_bytes;n++}
 return 'pruned '+n+' videos · now '+(U.v/1048576).toFixed(0)+' MB'};
})();

/* Discover Ads › Inspo: copy ad images into the Briefing Room's own storage (Supabase bucket "inspo").
   Run on any https://motionswipefile.blob.core.windows.net/... page (same origin as Motion's media, so fetch and canvas work).
   For each in_ads row not stored yet: a 640px card thumbnail (video poster or first image), every image/carousel card resized
   to 1080px max (JPEG), and the brand logo. Videos keep streaming from Motion's copy.
   Usage: paste, then  await window.__inspoStore(150)  repeatedly until it reports "0 left". */
(()=>{
const K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const B='https://cymkcvdsxoneojfisjgk.supabase.co/',H={apikey:K,Authorization:'Bearer '+K};
const logos={};
async function shrink(u,max){const r=await fetch(u);if(!r.ok)throw new Error('src '+r.status);const b=await r.blob();
 const bm=await createImageBitmap(b);const s=Math.min(1,max/Math.max(bm.width,bm.height));const c=new OffscreenCanvas(Math.round(bm.width*s),Math.round(bm.height*s));
 c.getContext('2d').drawImage(bm,0,0,c.width,c.height);return c.convertToBlob({type:'image/jpeg',quality:.82})}
async function put(blob,path){const up=await fetch(B+'storage/v1/object/inspo/'+path,{method:'POST',headers:{...H,'x-upsert':'true','Content-Type':'image/jpeg'},body:blob});
 if(!up.ok)throw new Error('upload '+up.status+' '+(await up.text()).slice(0,80));return B+'storage/v1/object/public/inspo/'+path}
window.__inspoStore=async(LIMIT=150,CONC=6)=>{
 if(location.hostname!=='motionswipefile.blob.core.windows.net')return 'WRONG PAGE: open a motionswipefile.blob.core.windows.net media URL first';
 const rows=await (await fetch(B+'rest/v1/in_ads?select=id,brand_id,poster,images,logo&stored_at=is.null&order=start_date.desc.nullslast&limit='+LIMIT,{headers:H})).json();
 let ok=0,fail=[];
 const one=async r=>{const p={images_s:[]};try{
   const first=r.poster||(r.images||[])[0];if(first)p.thumb_s=await put(await shrink(first,640),r.id+'/thumb.jpg');
   for(let i=0;i<(r.images||[]).length;i++)p.images_s.push(await put(await shrink(r.images[i],1080),r.id+'/img'+(i+1)+'.jpg'));
   if(r.logo&&r.brand_id){logos[r.brand_id]=logos[r.brand_id]||put(await shrink(r.logo,96),'logos/'+r.brand_id+'.jpg').catch(()=>null);p.logo_s=await logos[r.brand_id]}
   p.stored_at=new Date().toISOString();ok++}catch(e){fail.push(r.id+': '+e.message);if(String(e.message).startsWith('src 4'))p.stored_at=new Date().toISOString()}
  await fetch(B+'rest/v1/in_ads?id=eq.'+r.id,{method:'PATCH',headers:{...H,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(p)})};
 const q=rows.slice();await Promise.all(Array.from({length:CONC},async()=>{while(q.length)await one(q.shift())}));
 const left=await fetch(B+'rest/v1/in_ads?select=id&stored_at=is.null',{headers:{...H,Prefer:'count=exact',Range:'0-0'}});
 return ok+'/'+rows.length+' stored · '+(left.headers.get('content-range')||'').split('/')[1]+' left'+(fail.length?' · FAIL '+fail.length+': '+fail.slice(0,2).join(' ; '):'')};
})();

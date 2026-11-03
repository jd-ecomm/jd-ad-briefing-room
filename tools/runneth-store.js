/* Runneth trending: copy media into the Briefing Room's own storage (Supabase bucket "trending").
   Run on any https://motionswipefile.blob.core.windows.net/... page (same origin as the media, so fetch works).
   Processes up to LIMIT rows that are not stored yet; call repeatedly until it returns "0 left". */
(async(LIMIT)=>{
const K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const B='https://cymkcvdsxoneojfisjgk.supabase.co/';const H={apikey:K,Authorization:'Bearer '+K};
if(location.hostname!=='motionswipefile.blob.core.windows.net')return 'WRONG PAGE: open a motionswipefile.blob.core.windows.net media URL first';
const rows=await (await fetch(B+'rest/v1/tr_ads?select=id,week,category,rank,video,poster,images,logo&stored_at=is.null&order=week.asc,category.asc,rank.asc&limit='+LIMIT,{headers:H})).json();
const ext=(u,t)=>{const m=(u.split('?')[0].match(/\.([a-z0-9]{2,5})$/i)||[])[1];return (m||(t||'').split('/')[1]||'bin').toLowerCase()};
let ok=0,fail=[];
async function put(u,path){if(!u)return null;try{const r=await fetch(u);if(!r.ok)throw new Error('src '+r.status);const b=await r.blob();const p=path+'.'+ext(u,b.type);
 const up=await fetch(B+'storage/v1/object/trending/'+p,{method:'POST',headers:{...H,'x-upsert':'true','Content-Type':b.type||'application/octet-stream'},body:b});
 if(!up.ok)throw new Error('upload '+up.status+' '+(await up.text()).slice(0,80));return B+'storage/v1/object/public/trending/'+p}catch(e){fail.push(path+': '+e.message);return null}}
for(const r of rows){const base=r.week+'/'+r.category+'/'+String(r.rank).padStart(2,'0');
 const p={video_s:await put(r.video,base+'-video'),poster_s:await put(r.poster,base+'-poster'),images_s:[],logo_s:await put(r.logo,base+'-logo')};
 for(let i=0;i<(r.images||[]).length;i++){const s=await put(r.images[i],base+'-img'+(i+1));if(s)p.images_s.push(s)}
 const need=(r.video?1:0)+(r.images||[]).length;const got=(p.video_s?1:0)+p.images_s.length;
 if(got>=need&&need>0){p.stored_at=new Date().toISOString();ok++}
 await fetch(B+'rest/v1/tr_ads?id=eq.'+r.id,{method:'PATCH',headers:{...H,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(p)});}
const left=await fetch(B+'rest/v1/tr_ads?select=id&stored_at=is.null',{headers:{...H,Prefer:'count=exact',Range:'0-0'}});
return ok+'/'+rows.length+' stored · '+(left.headers.get('content-range')||'').split('/')[1]+' left'+(fail.length?' · FAIL '+fail.slice(0,3).join(' ; '):'');
})(LIMIT)

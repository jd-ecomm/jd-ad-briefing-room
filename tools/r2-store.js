/* Creative Discovery: copy ad media into Cloudflare R2 (bucket jd-creative-discovery) and make clean video posters.
   Run on a https://motionswipefile.blob.core.windows.net/... media page (same origin as Motion's media, so fetch and canvas work),
   or on a https://jd-ecomm.github.io page, in which case the stored Supabase copies (video_s, thumb_s, images_s, logo_s) are used.
   Uploads go through the Supabase edge function cd-r2-sign (presigned PUT, keys under cd/), then the public R2 URLs are written
   back to in_ads: thumb_r2, images_r2, video_r2, logo_r2, r2_bytes, r2_at, poster_frame.
   Per row where r2_at is null and is_english is not false, newest focus brands first:
     video ads: frame at min(1.0s, 10% of duration) -> cd/<id>/poster.jpg (720px) + cd/<id>/thumb.jpg (480px), poster_frame=true
               (replaces Motion's thumbnails, which have a play button baked in); video file as is -> cd/<id>/video.mp4 if < 25 MB
               and the bucket total (sum r2_bytes) is under VIDEO_CAP_GB.
     image / carousel ads: each image at 1080px max -> cd/<id>/img<n>.jpg (JPEG 0.85) + 480px thumb.
     brand logo once per brand -> cd/logos/<brand_id>.jpg (192px).
   Ads whose source media is gone (404 on both Motion and Supabase) are skipped and listed; r2_at stays null.
   Usage: paste, then  window.__r2Start()  and poll  window.__r2Status()  until done is true.
          window.__r2Start({limit:200}) processes only 200 rows (weekly refresh). */
(()=>{
const K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I'; /* public anon key, same as tools/inspo-store.js */
const B='https://cymkcvdsxoneojfisjgk.supabase.co/',H={apikey:K,Authorization:'Bearer '+K};
const VIDEO_CAP_GB=9, MAX_VIDEO_MB=25, CONC=6;
const ON_MOTION=location.hostname==='motionswipefile.blob.core.windows.net';
const S=window.__r2=window.__r2||{};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rest=async(p,o={})=>{const r=await fetch(B+'rest/v1/'+p,{...o,headers:{...H,'Content-Type':'application/json',...(o.headers||{})}});if(!r.ok)throw new Error('rest '+p.split('?')[0]+' '+r.status);const t=await r.text();return t?JSON.parse(t):null};
class Gone extends Error{}
async function get(urls){let last;for(const u of urls.filter(Boolean)){try{const r=await fetch(u);if(r.ok)return await r.blob();last=r.status;if(r.status>=500)throw new Error('src '+r.status)}catch(e){if(e instanceof Gone)throw e;last=e.message}}
 if(String(last).startsWith('4')||last===undefined)throw new Gone('source gone ('+last+')');throw new Error('src '+last)}
async function thumbJpeg(blob,width,q){const bm=await createImageBitmap(blob);return widthJpeg(bm,bm.width,bm.height,width,q)}
/* images: 1080px max on the long edge */
async function fitJpeg(blob,max,q){const bm=await createImageBitmap(blob);const s=Math.min(1,max/Math.max(bm.width,bm.height));
 const c=new OffscreenCanvas(Math.max(1,Math.round(bm.width*s)),Math.max(1,Math.round(bm.height*s)));c.getContext('2d').drawImage(bm,0,0,c.width,c.height);return c.convertToBlob({type:'image/jpeg',quality:q})}
async function widthJpeg(canvasSrc,w0,h0,width,q){const s=Math.min(1,width/w0);const c=new OffscreenCanvas(Math.round(w0*s),Math.round(h0*s));c.getContext('2d').drawImage(canvasSrc,0,0,c.width,c.height);return c.convertToBlob({type:'image/jpeg',quality:q})}
async function frame(blob){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.crossOrigin='anonymous';
 const url=URL.createObjectURL(blob);try{v.src=url;
  await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=()=>no(new Error('video decode'));setTimeout(()=>no(new Error('video meta timeout')),20000)});
  const d=isFinite(v.duration)&&v.duration>0?v.duration:1;v.currentTime=Math.min(1.0,d*0.1);
  await new Promise((ok,no)=>{v.onseeked=ok;setTimeout(()=>no(new Error('seek timeout')),20000)});
  if(v.readyState<2)await new Promise((ok,no)=>{v.onloadeddata=ok;setTimeout(()=>no(new Error('frame timeout')),10000)});
  const W=v.videoWidth,Hh=v.videoHeight;if(!W)throw new Error('no frame');
  const c=new OffscreenCanvas(W,Hh);c.getContext('2d').drawImage(v,0,0);
  return [await widthJpeg(c,W,Hh,720,.82),await widthJpeg(c,W,Hh,480,.82)]}finally{v.removeAttribute('src');v.load();URL.revokeObjectURL(url)}}
async function sign(items){const r=await fetch(B+'functions/v1/cd-r2-sign',{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify({keys:items.map(x=>({key:x.key,contentType:x.type}))})});
 if(!r.ok)throw new Error('sign '+r.status);return (await r.json()).items}
async function upload(files){const out={};let bytes=0;for(let i=0;i<files.length;i+=50){const part=files.slice(i,i+50);const signed=await sign(part);
 await Promise.all(part.map(async(f,j)=>{const s=signed[j];const p=await fetch(s.url,{method:'PUT',headers:{'Content-Type':f.type},body:f.blob});if(!p.ok)throw new Error('put '+p.status+' '+f.key);out[f.key]=s.public;bytes+=f.blob.size}))}
 return {out,bytes}}
async function logoFor(r){if(!r.brand_id)return null;if(S.logos[r.brand_id]!==undefined)return S.logos[r.brand_id];
 S.logos[r.brand_id]=(async()=>{try{const b=await get(ON_MOTION?[r.logo,r.logo_s]:[r.logo_s]);const j=await fitJpeg(b,192,.85);const k='cd/logos/'+r.brand_id+'.jpg';const u=await upload([{key:k,type:'image/jpeg',blob:j}]);S.bytes+=u.bytes;S.logoBytes[r.brand_id]=u.bytes;return u.out[k]}catch(e){return null}})();
 return S.logos[r.brand_id]}
async function one(r){const files=[],p={};const isVid=r.format==='video'&&!!(r.video||r.video_s);
 if(isVid){const vb=await get(ON_MOTION?[r.video,r.video_s]:[r.video_s]);const [poster,thumb]=await frame(vb);
  files.push({key:'cd/'+r.id+'/poster.jpg',type:'image/jpeg',blob:poster},{key:'cd/'+r.id+'/thumb.jpg',type:'image/jpeg',blob:thumb});
  if(vb.size<MAX_VIDEO_MB*1048576&&S.bytes<VIDEO_CAP_GB*1073741824)files.push({key:'cd/'+r.id+'/video.mp4',type:'video/mp4',blob:vb});else S.videoSkipped++;
  p.poster_frame=true}
 else{const imgs=ON_MOTION?(r.images||[]).map((u,i)=>[u,(r.images_s||[])[i]]):(r.images_s||[]).map(u=>[u]);if(!imgs.length&&(r.poster||r.thumb_s))imgs.push(ON_MOTION?[r.poster,r.thumb_s]:[r.thumb_s]);
  if(!imgs.length)throw new Gone('no media');let n=0,firstBlob=null;
  for(const alt of imgs){let b;try{b=await get(alt)}catch(e){if(e instanceof Gone)continue;throw e}n++;firstBlob=firstBlob||b;files.push({key:'cd/'+r.id+'/img'+n+'.jpg',type:'image/jpeg',blob:await fitJpeg(b,1080,.85)})}
  if(!n)throw new Gone('all images gone');files.push({key:'cd/'+r.id+'/thumb.jpg',type:'image/jpeg',blob:await thumbJpeg(firstBlob,480,.82)});p.poster_frame=false}
 const {out,bytes}=await upload(files);
 p.thumb_r2=out['cd/'+r.id+'/thumb.jpg'];p.images_r2=isVid?{poster:out['cd/'+r.id+'/poster.jpg']}:Object.keys(out).filter(k=>/\/img\d+\.jpg$/.test(k)).map(k=>out[k]);
 if(out['cd/'+r.id+'/video.mp4']){p.video_r2=out['cd/'+r.id+'/video.mp4'];S.videos++}if(isVid)S.posters++;else S.images+=p.images_r2.length;
 p.logo_r2=await logoFor(r);const lb=S.logoBytes[r.brand_id]&&!S.logoCounted[r.brand_id]?(S.logoCounted[r.brand_id]=1,S.logoBytes[r.brand_id]):0;
 p.r2_bytes=bytes+lb;p.r2_at=new Date().toISOString();S.bytes+=bytes;
 await rest('in_ads?id=eq.'+encodeURIComponent(r.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(p)});S.ok++}
async function rows(limit){const sel='id,brand_id,format,video,poster,images,logo,video_s,thumb_s,images_s,logo_s,focus,start_date';let all=[];
 for(let from=0;;from+=1000){const r=await fetch(B+'rest/v1/in_ads?select='+sel+'&r2_at=is.null&or=(is_english.is.true,is_english.is.null)&order=focus.desc.nullslast,start_date.desc.nullslast,id&limit=1000&offset='+from,{headers:H});
  if(!r.ok)throw new Error('rows '+r.status);const j=await r.json();all=all.concat(j);if(j.length<1000||(limit&&all.length>=limit))break}
 return limit?all.slice(0,limit):all}
async function used(){let t=0;for(let from=0;;from+=1000){const j=await rest('in_ads?select=r2_bytes&r2_bytes=gt.0&order=id&limit=1000&offset='+from);j.forEach(x=>t+=+x.r2_bytes);if(j.length<1000)break}return t}
async function existingLogos(){const j=await rest('in_ads?select=brand_id,logo_r2&logo_r2=not.is.null&limit=1000');j.forEach(x=>S.logos[x.brand_id]=Promise.resolve(x.logo_r2))}
window.__r2Start=async({limit=0}={})=>{if(S.running)return 'already running';
 Object.assign(S,{running:true,done:false,ok:0,videos:0,videoSkipped:0,posters:0,images:0,gone:[],fail:[],logos:{},logoBytes:{},logoCounted:{},started:Date.now(),source:ON_MOTION?'motion':'supabase'});
 S.bytes=await used();S.bytesStart=S.bytes;await existingLogos();const q=await rows(limit);S.total=q.length;S.left=q.length;
 (async()=>{await Promise.all(Array.from({length:CONC},async()=>{while(q.length){const r=q.shift();S.left=q.length;
   for(let attempt=0;attempt<2;attempt++){try{await one(r);break}catch(e){if(e instanceof Gone){S.gone.push(r.id);break}if(attempt){S.fail.push(r.id+': '+e.message)}else await sleep(1500)}}
   await sleep(150)}}));S.running=false;S.done=true;S.finished=Date.now()})();
 return 'started '+S.total+' rows from '+S.source};
window.__r2Status=()=>({running:S.running,done:S.done,total:S.total,left:S.left,ok:S.ok,videos:S.videos,videoSkipped:S.videoSkipped,posters:S.posters,images:S.images,
 gone:(S.gone||[]).length,fail:(S.fail||[]).length,failSample:(S.fail||[]).slice(-3),gb:+((S.bytes||0)/1073741824).toFixed(3),mins:S.started?+(((S.finished||Date.now())-S.started)/60000).toFixed(1):0});
})();

/* Runneth trending pull: run on https://motionapp.com/trending/<slug>/ after the page loads.
   Set WEEK (Monday, YYYY-MM-DD, Pacific time) and CAT (slug) first. Upserts the top ads into Supabase tr_ads. */
(async(WEEK,CAT)=>{
await new Promise(r=>setTimeout(r,3000));
const K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
if(!location.pathname.includes('/trending/'+CAT+'/'))return 'WRONG PAGE '+location.pathname;
const rows=[...document.querySelectorAll('article')].filter(a=>a.querySelector('img,video')).map((a,i)=>{
 const t=a.innerText.split('\n').map(x=>x.trim()).filter(x=>x&&x!=='·');
 const v=a.querySelector('video');
 const im=[...a.querySelectorAll('img')].map(x=>x.currentSrc||x.src).filter(u=>/swipe-file-source/.test(u));
 const logo=[...a.querySelectorAll('img')].map(x=>x.src).find(u=>/brand-page-assets/.test(u))||null;
 const vs=v?(v.currentSrc||v.src||v.querySelector('source')?.src||null):null;
 return {week:WEEK,category:CAT,rank:i+1,brand:t[0]||'',age:t.find(x=>/^\d+d$/.test(x))||'',kind:vs?'video':(im.length>1?'carousel':'image'),video:vs,poster:v?(v.poster||null):null,images:im,logo,captured_at:new Date().toISOString()}});
if(!rows.length)return 'NO ADS FOUND';
const r=await fetch('https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/tr_ads?on_conflict=week,category,rank',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
return CAT+' '+rows.length+' ads ('+rows.filter(x=>x.kind==='video').length+' video) -> '+r.status+' '+(r.ok?'':(await r.text()).slice(0,200));
})(WEEK,CAT)

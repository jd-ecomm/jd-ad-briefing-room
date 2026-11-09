/* JD Ad Briefing Room · Creative Discovery (replaces Discover Ads). Preview build, served at /preview/.
   One section inside the Briefing Room with sub tabs: Discover (all brands), JD (our markets), Trending (Runneth weekly top ads), Brands, Boards.
   Data: Supabase in_ads (every released batch, English), tr_ads (Runneth trending), in_favs, in_boards, in_board_items. Media: R2 first, then Supabase copies, then Motion.
   Cards are Motion style: true aspect ratio, object-fit contain, never cropped. Videos never autoplay in the grid:
   on a pointer device hover plays muted and moving across the card scrubs; on touch, tap opens the viewer. */
(()=>{
"use strict";
const SBU='https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/',SBK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const DAY=864e5,NOW=new Date(),CAP=90,PROVEN_DAYS=60,PAGE=1000,CHUNK=36;
const ASPECTS=['9:16','4:5','1:1','16:9'];
const MK={'66cf75a0e42d53dcea7879b5':'JD UK','67aa28cb0a70ccc0c54281c6':'JD US','686f2d9374342e14cdc10979':'JD Australia','69925634d7b54bd21a2fcadb':'JD New Zealand','670ff958a61172249cb1b88d':'Finish Line','674e4a2a411da97a4980d2db':'JD France'};
const TRC=[['apparel','Apparel'],['sports-fitness','Sports & Fitness'],['retail','Retail'],['accessories','Accessories'],['health-wellness','Health & Wellness']];
const TRN=Object.fromEntries(TRC);
const TABS=[['discover','Discover'],['jd','JD'],['trending','Trending'],['brands','Brands'],['boards','Boards']];
const SORTS={discover:[['proven','Proven'],['rising','Rising'],['newest','Newest'],['saved','Most saved']],jd:[['proven','Proven score'],['newest','Newest'],['longest','Longest running']],trending:[['rank','Rank'],['newest','Newest']],brand:[['proven','Proven'],['newest','Newest'],['saved','Most saved']],boards:[['added','Recently added']]};
const PROVEN_TIP=`Proven score = days live (capped at ${CAP}) + variants of the same concept + parallel launches. Proven = running ${PROVEN_DAYS}+ days.`;

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtN=n=>Number(n).toLocaleString('en-CA');
const fmtDate=s=>s?new Date(s+'T12:00:00').toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'}):'n/a';
const fmtDur=s=>!isFinite(s)?'':Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const me=()=>{try{return JSON.parse(localStorage.getItem('jd-email')||'""')||''}catch(e){return''}};
const initials=s=>String(s||'?').replace(/[^A-Za-z0-9 ]/g,'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const slug=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'');
const store={get(k,d){try{const v=localStorage.getItem('cd2_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('cd2_'+k,JSON.stringify(v))}catch(e){}}};
async function api(path,opt={}){const r=await fetch(SBU+path,{...opt,headers:{apikey:SBK,Authorization:'Bearer '+SBK,'Content-Type':'application/json',...(opt.headers||{})}});
 if(!r.ok)throw new Error(r.status+' '+(await r.text()).slice(0,140));const t=await r.text();return{data:t?JSON.parse(t):null,range:r.headers.get('content-range')}}

const I={
 bm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.5-6 4.5z"/></svg>',
 bmf:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.5-6 4.5z"/></svg>',
 search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
 car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="6" y="5" width="12" height="14" rx="2"/><path d="M3 7v10M21 7v10"/></svg>',
 img:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>',
 chevL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
 chevR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
 chevU:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg>',
 heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11z"/></svg>',
 comment:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5 5 16a8.5 8.5 0 1 1 15.5-4.5z"/></svg>',
 send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M21.5 3 3 10.2l7 3 3 7.3z"/><path d="m10 13.2 5.5-5.5"/></svg>',
 more:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
 music:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 17.5V6l11-2.5v11.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="6.5" cy="17.5" r="2.8"/><circle cx="17.5" cy="15" r="2.8"/></svg>',
 link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
 ext:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
 board:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="3" width="8" height="11" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="16" width="8" height="5" rx="1.5"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
};
const sv=(s,n=16)=>s.replace('<svg',`<svg width="${n}" height="${n}" aria-hidden="true"`);

/* ---------- state ---------- */
const C={tab:'discover',q:'',f:{kind:new Set(),asp:new Set(),brand:new Set(),tag:new Set(),mk:new Set(),cat:new Set(),status:new Set()},
 sort:{discover:'proven',jd:'proven',trending:'rank',brand:'proven',boards:'added'},brand:null,board:null,week:null,
 fmt:{},filtersOpen:false,started:false,ready:false,err:null,tr:null,trErr:null,favs:new Set(),allFavs:{},boards:[],items:[],saveErr:null,lists:{},viewer:null};
let ROWS=[],ADS=[],BYID={},BRANDS=[],BRAND_BY={},TR=[];

/* ---------- data ---------- */
function lpType(u){if(!u)return'Unknown';let x;try{x=new URL(u)}catch(e){return'Unknown'}
 const h=x.hostname.replace(/^www\./,''),p=x.pathname.toLowerCase().replace(/\/+$/,''),q=x.search.toLowerCase();
 if(/doubleclick\.net|^go\.|bit\.ly|tinyurl|^l\./.test(h))return'Unknown';
 if(/(apps|itunes)\.apple\.com|play\.google\.com|app\.link|onelink\.me|\.page\.link|adj\.st/.test(h))return'App';
 if(/(^|\.)(fb|facebook)\.com$/.test(h)&&/canvas_doc/.test(p))return'Instant Experience';
 if(/(^|\.)(fb|facebook|instagram|tiktok|youtube|linktr|threads)\.(com|me|ee|net)$|wa\.me|m\.me/.test(h))return'Social';
 if(/[?&](q|query|search|keyword|term|initialquery)=/.test(q)||/\/search(\/|$)|\/catalogsearch\/|\/s\/?$/.test(p))return'Search results';
 if(/\/products?\/[^/]+|\/p\/[^/]+|\/pd\/|\/t\/[^/]+\/[a-z0-9-]+$|\/dp\/|\/item\/|\/[a-z0-9-]+-[a-z0-9]{5,}\.html$|\/[a-z]{1,3}\d{4,6}(-[a-z0-9]+)?\.html$|\/product-detail|\/sku\//.test(p)||/[?&](variant|sku|pid)=/.test(q))return'PDP';
 if(/\/collections?(\/|$)|\/c\/|\/w\/|\/w$|\/category|\/categories|\/shop(\/|$)|\/men(s)?(\/|$|-)|\/women(s)?(\/|$|-)|\/kids(\/|$|-)|\/brands?\/|\/sale(\/|$)|\/new-arrivals|\/new-in|\/[a-z-]+-shoes$|\/[a-z-]+-clothing$/.test(p)||/\.html$/.test(p)&&!/\d{5,}/.test(p))return'PLP';
 if(p===''||p==='/'||/^\/(en|en-[a-z]{2}|[a-z]{2}(-[a-z]{2})?)$/.test(p))return'Homepage';
 return'Landing page'}
function bucket(a){const m=/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(a||'');if(!m||!+m[2])return null;const r=Math.log(m[1]/m[2]);let best=null,bd=9;
 [['9:16',9/16],['4:5',.8],['1:1',1],['16:9',16/9]].forEach(([k,v])=>{const d=Math.abs(r-Math.log(v));if(d<bd){bd=d;best=k}});return best}
const ratioOf=s=>{const m=/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(s||'');return m&&+m[2]?m[1]/m[2]:null};
const COLS='id,brand,brand_id,brand_group,logo,logo_s,logo_r2,status,start_date,end_date,days_live,format,visual_formats,aspect,platforms,cards,headline,copy,cta,landing,video,video_s,video_r2,poster,poster_frame,images,images_s,images_r2,thumb_s,thumb_r2,saves,market,concept_key,variant_group,formats,first_seen';
/* the anon role has a 3s statement timeout, and other jobs write to in_ads; retry a busy or failed page before giving up */
async function apiRetry(path,opt,tries=4){let e;for(let i=0;i<tries;i++){try{return await api(path,opt)}catch(x){e=x;await new Promise(r=>setTimeout(r,800*Math.pow(2,i)))}}throw e}
async function loadAds(){const q=`in_ads?select=${COLS}&batch=not.is.null&is_english=is.true&order=id.asc`;
 const first=await apiRetry(q,{headers:{Range:`0-${PAGE-1}`,'Range-Unit':'items',Prefer:'count=exact'}});let rows=first.data||[];
 const total=+((first.range||'').split('/')[1])||rows.length;const pages=[];for(let f=PAGE;f<total;f+=PAGE)pages.push(f);
 for(let i=0;i<pages.length;i+=3){const res=await Promise.all(pages.slice(i,i+3).map(f=>apiRetry(q,{headers:{Range:`${f}-${f+PAGE-1}`,'Range-Unit':'items'}})));res.forEach(r=>rows=rows.concat(r.data||[]))}return rows}
async function loadTrending(){let all=[],from=0;for(;;){const r=await apiRetry('tr_ads?select=week,category,rank,brand,age,kind,video,poster,images,logo,video_s,poster_s,images_s,logo_s&order=week.desc,category.asc,rank.asc',{headers:{Range:from+'-'+(from+999)}});const j=r.data||[];all=all.concat(j);if(j.length<1000)break;from+=1000}return all}
async function loadSaves(){try{const f=(await api('in_favs?select=email,ad_id')).data||[];C.allFavs={};C.favs=new Set();
  f.forEach(x=>{C.allFavs[x.ad_id]=(C.allFavs[x.ad_id]||0)+1;if(x.email===me())C.favs.add(x.ad_id)});
  C.boards=(await api('in_boards?select=id,name,note,created_by,created_at&order=created_at.asc')).data||[];
  C.items=(await api('in_board_items?select=board_id,ad_id,src,added_by,created_at&order=created_at.desc')).data||[]}catch(e){C.saveErr=e.message}}

function norm(r){
 const vid=r.format==='video'||r.video||r.video_s||r.video_r2?(r.video_r2||r.video_s||r.video||null):null;
 const ir=r.images_r2;const imgs=Array.isArray(ir)&&ir.length?ir:(r.images_s&&r.images_s.length?r.images_s:(r.images||[]));
 const cleanPoster=ir&&!Array.isArray(ir)&&ir.poster?ir.poster:(r.poster_frame&&r.thumb_r2?r.thumb_r2:null);
 const kind=vid?'video':(r.format==='carousel'||imgs.length>1?'carousel':'image');
 const thumb=kind==='video'?(cleanPoster||r.thumb_r2||r.thumb_s||r.poster||''):(imgs[0]||r.thumb_r2||r.thumb_s||r.poster||'');
 const sd=r.start_date,ed=r.status==='active'?null:r.end_date;
 const d=sd?Math.max(0,Math.round(((ed?new Date(ed+'T12:00:00'):NOW)-new Date(sd+'T12:00:00'))/DAY)):(r.days_live||0);
 const a={id:r.id,src:'ad',b:r.brand||'Unknown brand',bid:r.brand_id,g:r.brand_group||'Other',kind,video:vid,thumb,imgs,
  logo:r.logo_r2||r.logo_s||r.logo||'',vf:r.visual_formats||[],ar:r.aspect||'',asp:bucket(r.aspect),ratio:ratioOf(r.aspect),
  pl:(r.platforms||[]).filter(p=>p&&p!=='unknown'),h:r.headline||'',x:r.copy||'',cta:r.cta||'Learn more',l:r.landing||'',sd,ed:r.end_date,d,st:r.status,
  mk:MK[r.brand_id]||null,market:r.market||null,ck:r.concept_key||('c_'+r.id),vg:r.variant_group||('vg_'+r.id),fs:r.first_seen,motion:r.saves||0};
 a.alts=[r.thumb_r2,r.thumb_s,(r.images_s||[])[0],r.poster,(r.images||[])[0]].filter(u=>u&&u!==thumb);
 a.valts=[r.video_s,r.video].filter(u=>u&&u!==vid);
 if(!a.asp){const f=(r.formats||[]).find(f=>f.ad_id===a.id);a.asp=(f&&f.aspect)||(kind==='carousel'?'1:1':'4:5');a.est=true}
 a.lp=lpType(a.l);a.handle=slug(a.b)||'brand';a.age=sd?Math.round((NOW-new Date(sd+'T12:00:00'))/DAY):999;return a}
function buildData(rows){
 ROWS=rows.map(norm);const byCk={};ROWS.forEach(a=>(byCk[a.ck]=byCk[a.ck]||[]).push(a));
 ROWS.forEach(a=>{const c=byCk[a.ck];a.var=c.length;a.par=a.sd?c.filter(o=>o!==a&&o.sd&&Math.abs(new Date(o.sd)-new Date(a.sd))<=3*DAY).length:0;a.ps=Math.min(a.d,CAP)+a.var+a.par;a.proven=a.d>=PROVEN_DAYS});
 const byVg={};ROWS.forEach(a=>(byVg[a.vg]=byVg[a.vg]||[]).push(a));
 ADS=Object.values(byVg).map(ms=>{ms.sort((p,q)=>q.ps-p.ps||(p.sd||'').localeCompare(q.sd||''));const rep=ms[0];
  const fm={};ms.forEach(m=>{if(!fm[m.asp]||(m.kind==='video'&&fm[m.asp].kind!=='video'))fm[m.asp]=m});const fl=ASPECTS.filter(k=>fm[k]);
  const it=Object.assign({},rep,{members:ms,fm,fl,nf:fl.length,ps:Math.max(...ms.map(m=>m.ps)),d:Math.max(...ms.map(m=>m.d)),proven:ms.some(m=>m.proven),
   st:ms.some(m=>m.st==='active')?'active':rep.st,vf:[...new Set(ms.flatMap(m=>m.vf))],age:Math.min(...ms.map(m=>m.age)),
   sv:ms.reduce((s,m)=>s+(C.allFavs[m.id]||0),0),motion:Math.max(...ms.map(m=>m.motion))});
  it.def=fm['4:5']?'4:5':fl[0]||rep.asp;it.kinds=new Set(ms.map(m=>m.kind));
  it.hay=[it.b,...ms.map(m=>m.h+' '+m.x),it.vf.join(' '),[...it.kinds].join(' '),it.lp,it.cta,it.g,it.mk||'',it.market||''].join(' ').toLowerCase();
  return it});
 BYID={};ADS.forEach(it=>{BYID[it.id]=it;it.members.forEach(m=>{if(!BYID[m.id])BYID[m.id]=it})});
 const bb={};ADS.forEach(a=>{const b=bb[a.bid]=bb[a.bid]||{b:a.b,bid:a.bid,g:a.g,logo:'',n:0,live:0,nw:0,dsum:0,proven:0,mk:a.mk,market:a.market,top:[]};
  b.n++;if(a.st==='active')b.live++;if(a.age<=14)b.nw++;b.dsum+=a.d;if(a.proven)b.proven++;if(!b.logo&&a.logo)b.logo=a.logo;b.top.push(a)});
 BRANDS=Object.values(bb).map(b=>{b.avgd=Math.round(b.dsum/b.n);b.top.sort((x,y)=>y.ps-x.ps);b.top=b.top.slice(0,3);return b}).sort((p,q)=>q.n-p.n);
 BRAND_BY=Object.fromEntries(BRANDS.map(b=>[b.bid,b]))}
function normTr(r,i){const imgs=(r.images_s&&r.images_s.length?r.images_s:r.images)||[];const video=r.video_s||r.video||null;
 const kind=r.kind==='video'&&video?'video':(r.kind==='carousel'||imgs.length>1?'carousel':'image');
 return{id:'tr'+i,src:'tr',b:r.brand||'Unknown brand',logo:r.logo_s||r.logo||'',kind,video,thumb:(r.poster_s||r.poster||imgs[0]||''),imgs,
  alts:[r.poster,(r.images||[])[0]].filter(Boolean),valts:[r.video].filter(u=>u&&u!==video),asp:null,ratio:null,rank:r.rank,cat:r.category,
  age:r.age||'',week:r.week,hay:[r.brand,TRN[r.category]||r.category,kind].join(' ').toLowerCase(),fl:[],nf:0,members:[]}}
const cur=it=>it.src==='ad'?(it.fm[C.fmt[it.id]||it.def]||it):it;
const isSaved=it=>it.src==='ad'&&it.members.some(m=>C.favs.has(m.id));

/* ---------- filtering ---------- */
const RISING=a=>a.st==='active'&&a.age<=30;
function filtered(base,ctx){const q=C.q.trim().toLowerCase(),F=C.f;const terms=q?q.split(/\s+/):[];
 return base.filter(a=>{if(terms.length&&!terms.every(t=>a.hay.includes(t)))return false;
  if(F.kind.size&&!(a.kinds?[...a.kinds].some(k=>F.kind.has(k)):F.kind.has(a.kind)))return false;
  if(a.src==='ad'){if(F.asp.size&&!a.fl.some(k=>F.asp.has(k)))return false;
   if(ctx!=='brand'&&F.brand.size&&!F.brand.has(a.bid))return false;
   if(F.tag.size&&!a.vf.some(v=>F.tag.has(v)))return false;
   if(ctx==='jd'&&F.mk.size&&!F.mk.has(a.mk))return false;
   if(F.status.has('proven')&&!a.proven)return false;if(F.status.has('rising')&&!RISING(a))return false;if(F.status.has('live')&&a.st!=='active')return false;if(F.status.has('multi')&&a.nf<2)return false}
  else{if(F.cat.size&&!F.cat.has(a.cat))return false}
  return true})}
function sorted(arr,mode){const sc={proven:a=>a.ps,rising:a=>a.var*4+a.par*3+Math.max(0,30-a.age)*2+(a.st==='active'?5:0),newest:a=>-a.age*1000+(a.ps||0),
  saved:a=>a.sv*1000+a.motion+a.ps/1000,longest:a=>a.d*1000+a.ps,rank:a=>-a.rank,added:a=>0}[mode]||(a=>a.ps);
 if(mode==='newest'&&arr[0]&&arr[0].src==='tr')return arr.slice().sort((a,b)=>(b.week||'').localeCompare(a.week||'')||a.rank-b.rank);
 return arr.slice().sort((a,b)=>sc(b)-sc(a))}

/* ---------- card ---------- */
function logoHTML(name,logo,cls='cd-logo'){return`<span class="${cls}" aria-hidden="true"><b>${esc(initials(name))}</b>${logo?`<img alt="" loading="lazy" src="${esc(logo)}" onerror="this.remove()">`:''}</span>`}
const kindLbl=k=>k==='video'?'Video':k==='carousel'?'Carousel':'Image';
function topMeta(it){if(it.src==='tr')return`${esc(TRN[it.cat]||it.cat)}${it.age?' · Running '+esc(it.age):''}`;
 const live=it.st==='active';return`${live?'<i class="cd-live"></i>Active':'Ended'} · ${it.d} day${it.d===1?'':'s'}`}
function badgeHTML(it,ctx){if(it.src==='tr')return`<span class="cd-badge">#${it.rank}</span>`;
 if(ctx==='jd'||ctx==='proven')return`<span class="cd-badge" title="${esc(PROVEN_TIP)}">${it.ps} Proven</span>`;
 if(it.proven)return`<span class="cd-badge sm" title="${esc(PROVEN_TIP)}">Proven</span>`;return''}
function frameHTML(it,ctx){const m=cur(it);const r=m.ratio||ratioOf(m.asp)||(it.src==='tr'?null:.8);
 const ar=r?`style="aspect-ratio:${r.toFixed(4)}"`:'style="aspect-ratio:.8"';
 const alts=esc(JSON.stringify(m.alts||[]));
 const media=m.thumb?`<img class="cd-po" alt="${esc(it.b)} ${kindLbl(m.kind).toLowerCase()} ad" loading="lazy" decoding="async" src="${esc(m.thumb)}" data-alts="${alts}">`
  :(m.kind==='video'?`<span class="cd-nopo">${sv(I.play,22)}</span>`:`<span class="cd-nopo">${sv(I.img,22)}</span>`);
 const vsrc=m.kind==='video'&&m.video?` data-v="${esc(m.video)}" data-valts="${esc(JSON.stringify(m.valts||[]))}"`:'';
 const car=m.kind==='carousel'&&m.imgs.length>1?`<span class="cd-cnav"><button type="button" data-cs="-1" aria-label="Previous card">${sv(I.chevL,14)}</button><span>1/${m.imgs.length}</span><button type="button" data-cs="1" aria-label="Next card">${sv(I.chevR,14)}</button></span>`:'';
 return`<div class="cd-fr${r?'':' unk'}" ${ar} data-open="${esc(it.id)}" data-ctx="${ctx}" role="button" tabindex="0" aria-label="Open ${esc(it.b)} ad"${vsrc} data-k="${m.kind}">${media}
  ${badgeHTML(it,ctx)}${m.kind==='video'?`<span class="cd-kind">${sv(I.play,11)}<span class="cd-dur"></span></span><i class="cd-prog"><b></b></i>`:''}${car}</div>`}
function card(it,ctx){const m=cur(it);const saved=isSaved(it);
 const fseg=it.nf>=2?`<div class="cd-fseg" role="group" aria-label="Format">${it.fl.map(k=>`<button type="button" data-fmt="${esc(it.id)}|${k}" aria-pressed="${k===m.asp}">${k}</button>`).join('')}</div>`:'';
 const meta=it.src==='tr'?[kindLbl(m.kind),fmtWeek(it.week)]:[kindLbl(m.kind),m.asp+(m.est?'*':''),...(ctx==='jd'?[m.lp]:[])];
 const pill=ctx==='jd'&&it.mk?`<span class="cd-mk">${esc(it.mk)}</span>`:'';
 const fb=it.nf>=2?`<span class="cd-nf">${it.nf} formats</span>`:'';
 return`<article class="cd-card" data-id="${esc(it.id)}">
  <header class="cd-ch">${logoHTML(it.b,it.logo)}<div class="cd-cht"><b>${esc(it.b)}</b><small>${topMeta(it)}</small></div></header>
  ${frameHTML(it,ctx)}${fseg}
  <footer class="cd-cf">${pill}<span class="cd-meta">${meta.map(esc).join(' · ')}</span>${fb}${it.src==='ad'?`<button type="button" class="cd-save" data-save="${esc(it.id)}" aria-pressed="${saved}" aria-label="${saved?'Remove from saved':'Save'}">${sv(saved?I.bmf:I.bm,17)}</button>`:''}</footer></article>`}
const fmtWeek=w=>w?'Week of '+new Date(w+'T12:00').toLocaleDateString('en-CA',{day:'numeric',month:'short'}):'';

/* ---------- masonry grid (shortest column first, true aspect heights, grows on scroll) ---------- */
const colsFor=w=>w<600?2:w<900?3:w<1200?4:w<1600?5:6;
function grid(host,list,ctx){C.lists[ctx]=list;
 host.innerHTML=list.length?`<div class="cd-mas"></div><div class="cd-sent" aria-hidden="true"></div>`:`<div class="cd-empty">No ads match. Try clearing a filter or the search.</div>`;
 if(!list.length)return;const mas=$('.cd-mas',host),sent=$('.cd-sent',host);let n=0,cols=[],hs=[];
 const build=()=>{const c=colsFor(host.clientWidth||window.innerWidth);mas.style.setProperty('--cols',c);mas.innerHTML='';cols=[];hs=[];
  for(let i=0;i<c;i++){const d=document.createElement('div');d.className='cd-col';mas.appendChild(d);cols.push(d);hs.push(0)}const k=n;n=0;add(Math.max(k,CHUNK))};
 const add=k=>{const end=Math.min(list.length,n+k);for(;n<end;n++){const it=list[n],m=cur(it);const r=m.ratio||ratioOf(m.asp)||.8;
   let j=0;for(let i=1;i<hs.length;i++)if(hs[i]<hs[j]-.01)j=i;
   const t=document.createElement('template');t.innerHTML=card(it,ctx);cols[j].appendChild(t.content.firstElementChild);hs[j]+=1/r+.42+(it.nf>=2?.12:0)}
  sent.hidden=n>=list.length};
 build();host._cols=colsFor(host.clientWidth||window.innerWidth);
 if(host._io)host._io.disconnect();host._io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)&&n<list.length)add(CHUNK)},{rootMargin:'1400px 0px'});host._io.observe(sent);
 if(host._ro)host._ro.disconnect();host._ro=new ResizeObserver(()=>{const c=colsFor(host.clientWidth);if(c!==host._cols){host._cols=c;build()}});host._ro.observe(host)}

/* fit every frame to the media's real shape once it loads, so nothing is cropped or letterboxed */
document.addEventListener('load',e=>{const el=e.target;if(!(el instanceof HTMLImageElement)||!el.classList.contains('cd-po'))return;fitFrame(el.closest('.cd-fr'),el.naturalWidth,el.naturalHeight)},true);
document.addEventListener('error',e=>{const el=e.target;
 if(el instanceof HTMLImageElement&&el.dataset.alts){let a=[];try{a=JSON.parse(el.dataset.alts)}catch(x){}const nx=a.shift();el.dataset.alts=JSON.stringify(a);if(nx)el.src=nx;else{el.replaceWith(Object.assign(document.createElement('span'),{className:'cd-nopo',innerHTML:sv(I.img,22)}))}}
 if(el instanceof HTMLVideoElement&&el.dataset.valts){let a=[];try{a=JSON.parse(el.dataset.valts)}catch(x){}const nx=a.shift();el.dataset.valts=JSON.stringify(a);if(nx){el.src=nx}}},true);
function fitFrame(fr,w,h){if(!fr||!w||!h)return;const r=w/h;const cur=parseFloat(fr.style.aspectRatio)||0;if(Math.abs(cur-r)/r>.005)fr.style.aspectRatio=r.toFixed(4);fr.classList.remove('unk');fr.dataset.nat=r.toFixed(4)}

/* ---------- hover preview + scrub (pointer devices only) ---------- */
const FINE=matchMedia('(hover:hover) and (pointer:fine)');
const LRU=[];let H=null;
function vidFor(fr){let v=$('video.cd-v',fr);if(!v){v=document.createElement('video');v.className='cd-v';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.setAttribute('playsinline','');v.preload='metadata';v.loop=true;v.disablePictureInPicture=true;
  v.dataset.valts=fr.dataset.valts||'[]';v.src=fr.dataset.v;
  v.addEventListener('loadedmetadata',()=>{const d=$('.cd-dur',fr);if(d)d.textContent=fmtDur(v.duration);if(!$('img.cd-po',fr))fitFrame(fr,v.videoWidth,v.videoHeight)});
  v.addEventListener('playing',()=>fr.classList.add('vis'));v.addEventListener('seeked',()=>{if(H&&H.fr===fr)fr.classList.add('vis')});
  fr.insertBefore(v,fr.firstChild)}
 const i=LRU.indexOf(v);if(i>=0)LRU.splice(i,1);LRU.push(v);
 while(LRU.length>8){const o=LRU.shift();if(H&&H.v===o)continue;o.pause();o.removeAttribute('src');o.load();o.remove()}
 return v}
function hoverIn(fr,e){if(H&&H.fr===fr)return;if(H)hoverOut();const v=vidFor(fr);
 H={fr,v,x0:e.clientX,scrub:false,target:null,idle:0,raf:0};fr.classList.add('hov');
 try{if(v.readyState>0)v.currentTime=0}catch(x){}const p=v.play();if(p)p.catch(()=>{});
 const bar=$('.cd-prog b',fr);
 const tick=()=>{if(!H||H.fr!==fr)return;const d=v.duration;
  if(H.scrub&&H.target!=null&&isFinite(d)&&!v.seeking&&Math.abs(v.currentTime-H.target)>.04){v.currentTime=H.target}
  if(bar&&isFinite(d)&&d>0)bar.style.transform=`scaleX(${Math.min(1,(H.scrub&&H.target!=null?H.target:v.currentTime)/d)})`;
  H.raf=requestAnimationFrame(tick)};H.raf=requestAnimationFrame(tick)}
function hoverMove(e){if(!H)return;const{fr,v}=H;if(!H.scrub&&Math.abs(e.clientX-H.x0)<6)return;
 const r=fr.getBoundingClientRect();const x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));const d=v.duration;
 if(!isFinite(d)||!d){H.pend=x;return}
 if(!H.scrub){H.scrub=true;v.pause();fr.classList.add('scrub')}H.target=x*d;
}
function hoverOut(){if(!H)return;const{fr,v}=H;cancelAnimationFrame(H.raf);clearTimeout(H.idle);v.pause();fr.classList.remove('hov','vis','scrub');
 const bar=$('.cd-prog b',fr);if(bar)bar.style.transform='scaleX(0)';try{if(v.readyState>0)v.currentTime=0}catch(x){}H=null}
document.addEventListener('pointerover',e=>{if(!FINE.matches||e.pointerType==='touch')return;const fr=e.target.closest&&e.target.closest('.cd-fr[data-v]');if(fr&&!fr.contains(e.relatedTarget))hoverIn(fr,e)});
document.addEventListener('pointerout',e=>{if(!H)return;const fr=e.target.closest&&e.target.closest('.cd-fr');if(fr&&fr===H.fr&&!fr.contains(e.relatedTarget))hoverOut()});
document.addEventListener('pointermove',e=>{if(H&&H.fr.contains(e.target))hoverMove(e)},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)hoverOut()});
window.addEventListener('scroll',()=>{if(H&&!H.fr.matches(':hover'))hoverOut()},{passive:true});

/* ---------- section shell ---------- */
const host=()=>document.getElementById('v-cd');
function shell(){const el=host();if(el.dataset.built)return;el.dataset.built=1;
 el.innerHTML=`<div class="cd">
 <div class="cd-bar"><div class="wrap cd-bar-in">
  <div class="cd-tabs" role="tablist" aria-label="Creative Discovery">${TABS.map(([k,l])=>`<a role="tab" href="#discover${k==='discover'?'':'/'+k}" data-cdtab="${k}" aria-selected="false">${l}<small data-cnt="${k}"></small></a>`).join('')}</div>
  <div class="cd-tools">
   <label class="cd-q">${sv(I.search,15)}<input id="cd-q" type="search" placeholder="Search brands, copy, tags" aria-label="Search Creative Discovery" autocomplete="off"></label>
   <button type="button" class="cd-btn" id="cd-fbtn" aria-expanded="false" aria-controls="cd-fp">${sv(I.filter,15)}<span>Filters</span><b id="cd-fcount" hidden></b></button>
   <label class="cd-sort"><span class="lbl">Sort</span><select id="cd-sort" aria-label="Sort"></select></label>
  </div></div>
  <div class="cd-fp wrap" id="cd-fp" hidden></div>
  <div class="cd-act wrap" id="cd-act" hidden></div>
 </div>
 <div class="wrap cd-main"><div class="cd-head" id="cd-head"></div><div id="cd-body"></div></div></div>`;
 const q=$('#cd-q',el);let qt;q.oninput=()=>{clearTimeout(qt);qt=setTimeout(()=>{C.q=q.value;draw()},180)};
 $('#cd-fbtn',el).onclick=()=>{C.filtersOpen=!C.filtersOpen;drawFilters()};
 $('#cd-sort',el).onchange=e=>{C.sort[sortKey()]=e.target.value;draw()};
 el.addEventListener('click',onClick);
 el.addEventListener('keydown',e=>{const fr=e.target.closest('.cd-fr');if(fr&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openViewer(fr.dataset.open,fr.dataset.ctx)}})}
const sortKey=()=>C.tab==='brands'?(C.brand?'brand':null):C.tab;
function onClick(e){const t=e.target;
 const cs=t.closest('[data-cs]');if(cs){e.stopPropagation();stepCarousel(cs);return}
 const sb=t.closest('[data-save]');if(sb){toggleSave(sb.dataset.save);return}
 const fb=t.closest('[data-fmt]');if(fb){const[id,k]=fb.dataset.fmt.split('|');C.fmt[id]=k;const art=fb.closest('.cd-card');const it=BYID[id];if(art&&it){const ctx=art.querySelector('.cd-fr').dataset.ctx;const t2=document.createElement('template');t2.innerHTML=card(it,ctx);art.replaceWith(t2.content.firstElementChild)}return}
 const fr=t.closest('.cd-fr');if(fr){openViewer(fr.dataset.open,fr.dataset.ctx);return}
 const fc=t.closest('[data-f]');if(fc){const[g,v]=fc.dataset.f.split('|');const s=C.f[g];s.has(v)?s.delete(v):s.add(v);draw();return}
 if(t.closest('[data-fclear]')){Object.values(C.f).forEach(s=>s.clear());C.q='';$('#cd-q').value='';draw();return}
 const bd=t.closest('[data-bd]');if(bd){location.hash='discover/boards/'+bd.dataset.bd;return}
 if(t.closest('[data-newboard]')){newBoard();return}
 const rm=t.closest('[data-rmb]');if(rm){e.preventDefault();removeFromBoard(rm.dataset.rmb);return}}
function stepCarousel(b){const fr=b.closest('.cd-fr'),it=BYID[fr.dataset.open]||C.trBy[fr.dataset.open];const m=cur(it);const n=m.imgs.length;
 const i=((+fr.dataset.ci||0)+(+b.dataset.cs)+n)%n;fr.dataset.ci=i;const img=$('img.cd-po',fr);if(img)img.src=m.imgs[i];$('.cd-cnav span',fr).textContent=`${i+1}/${n}`}

/* ---------- filters ---------- */
function fGroups(){const tab=C.tab;const base=tab==='trending'?TR:tab==='jd'?ADS.filter(a=>a.mk):ADS;const g=[];
 const cnt=(fn)=>base.filter(fn).length;
 g.push(['kind','Type',[['video','Video'],['image','Image'],['carousel','Carousel']].map(([k,l])=>[k,l,cnt(a=>a.kinds?a.kinds.has(k):a.kind===k)])]);
 if(tab==='trending'){g.push(['cat','Category',TRC.map(([k,l])=>[k,l,cnt(a=>a.cat===k)])]);return g}
 g.push(['asp','Aspect',ASPECTS.map(k=>[k,k,cnt(a=>a.fl.includes(k))])]);
 g.push(['status','Status',[['proven','Proven 60+ days'],['rising','Rising'],['live','Active now'],['multi','2+ formats']].map(([k,l])=>[k,l,cnt(a=>k==='proven'?a.proven:k==='rising'?RISING(a):k==='live'?a.st==='active':a.nf>=2)])]);
 if(tab==='jd'){const mk={};base.forEach(a=>mk[a.mk]=(mk[a.mk]||0)+1);g.push(['mk','Market',Object.entries(mk).sort((p,q)=>q[1]-p[1]).map(([k,n])=>[k,k,n])])}
 else if(!(tab==='brands'&&C.brand)){g.push(['brand','Brand',BRANDS.slice(0,40).map(b=>[b.bid,b.b,b.n])])}
 const tg={};base.forEach(a=>a.vf.forEach(v=>tg[v]=(tg[v]||0)+1));g.push(['tag','Tags',Object.entries(tg).sort((p,q)=>q[1]-p[1]).slice(0,36).map(([k,n])=>[k,k,n])]);
 return g}
function drawFilters(){const fp=$('#cd-fp'),btn=$('#cd-fbtn'),act=$('#cd-act');const usable=C.ready&&C.tab!=='boards'&&!(C.tab==='brands'&&!C.brand);
 btn.hidden=!usable;$('.cd-q').hidden=C.tab==='boards';
 const n=Object.values(C.f).reduce((s,x)=>s+x.size,0);const fc=$('#cd-fcount');fc.hidden=!n;fc.textContent=n;
 fp.hidden=!(usable&&C.filtersOpen);btn.setAttribute('aria-expanded',!fp.hidden);
 if(!fp.hidden)fp.innerHTML=fGroups().map(([g,l,opts])=>`<div class="cd-fg ${opts.length>8?'wide':''}"><span class="lbl">${l}</span><div class="cd-chips">${opts.map(([v,lab,c])=>`<button type="button" class="cd-chip" data-f="${g}|${esc(v)}" aria-pressed="${C.f[g].has(v)}">${esc(lab)}<small>${fmtN(c)}</small></button>`).join('')}</div></div>`).join('')+`<div class="cd-fg end"><button type="button" class="cd-btn" data-fclear>Clear all</button><button type="button" class="cd-btn y" id="cd-fdone">Done</button></div>`;
 const d=$('#cd-fdone');if(d)d.onclick=()=>{C.filtersOpen=false;drawFilters()};
 const on=[];Object.entries(C.f).forEach(([g,s])=>s.forEach(v=>on.push([g,v,g==='brand'?(BRAND_BY[v]||{}).b||v:g==='cat'?TRN[v]||v:g==='status'?{proven:'Proven',rising:'Rising',live:'Active',multi:'2+ formats'}[v]:v])));
 act.hidden=!usable||!on.length;act.innerHTML=on.map(([g,v,l])=>`<button type="button" class="cd-chip on" data-f="${g}|${esc(v)}" aria-label="Remove filter ${esc(l)}">${esc(l)} ${sv(I.x,12)}</button>`).join('')+(on.length?`<button type="button" class="cd-link" data-fclear>Clear all</button>`:'');
 const s=$('#cd-sort'),k=sortKey();s.closest('.cd-sort').hidden=!k||!C.ready;if(k){s.innerHTML=SORTS[k].map(([v,l])=>`<option value="${v}" ${C.sort[k]===v?'selected':''}>${l}</option>`).join('')}}

/* ---------- views ---------- */
function head(title,sub,extra=''){$('#cd-head').innerHTML=`<div class="cd-h1"><div><h2 class="disp">${title}</h2><p>${sub}</p></div>${extra}</div>`}
function draw(){const el=host();if(!el||el.hidden)return;shell();
 $$('[data-cdtab]',el).forEach(a=>{const on=a.dataset.cdtab===C.tab;a.setAttribute('aria-selected',on);a.classList.toggle('on',on)});
 drawFilters();const body=$('#cd-body');
 if(C.err){head('Creative Discovery','');body.innerHTML=`<div class="cd-note"><b>Can't load ads right now.</b> The team database didn't answer (${esc(C.err.slice(0,90))}). <button type="button" class="cd-btn y" id="cd-retry">Try again</button></div>`;$('#cd-retry').onclick=()=>{C.err=null;C.started=false;start()};return}
 if(!C.ready){head('Creative Discovery','Loading ads…');body.innerHTML=`<div class="cd-skel">${Array.from({length:10},(_,i)=>`<i style="aspect-ratio:${[.5625,.8,1,.8,.5625][i%5]}"></i>`).join('')}</div>`;return}
 ({discover:vDiscover,jd:vJD,trending:vTrending,brands:vBrands,boards:vBoards}[C.tab]||vDiscover)(body)}
function counts(){const set=(k,n)=>{const s=$(`[data-cnt="${k}"]`);if(s)s.textContent=n==null?'':fmtN(n)};set('discover',ADS.length);set('jd',ADS.filter(a=>a.mk).length);set('trending',C.tr?TR.filter(a=>a.week===C.week).length:null);set('brands',BRANDS.filter(b=>b.n>=3).length);set('boards',C.boards.length||null)}
/* Discover mixes brands: each brand's best ad first, then round-robin, so no single brand fills the screen */
function mixBrands(arr){const by=new Map();arr.forEach(a=>{const k=a.bid||a.b;if(!by.has(k))by.set(k,[]);by.get(k).push(a)});const qs=[...by.values()],out=[];
 while(out.length<arr.length)for(const q of qs)if(q.length)out.push(q.shift());return out}
function vDiscover(body){let list=sorted(filtered(ADS,'discover'),C.sort.discover);if(C.sort.discover==='proven'&&!C.f.brand.size)list=mixBrands(list);
 head('Discover',`${fmtN(list.length)} of ${fmtN(ADS.length)} ads from ${fmtN(BRANDS.length)} brands. ${FINE.matches?'Hover a video to preview it, move across it to scrub. Click to open.':'Tap any ad to open it.'}`);
 grid(body,list,'discover')}
function vJD(body){const base=ADS.filter(a=>a.mk);const list=sorted(filtered(base,'jd'),C.sort.jd);
 const mk={};base.forEach(a=>mk[a.mk]=(mk[a.mk]||0)+1);
 head('JD around the world',`${fmtN(list.length)} ads from JD's own pages. The yellow badge is the Proven score.`,
  `<div class="cd-chips">${Object.entries(mk).sort((p,q)=>q[1]-p[1]).map(([k,n])=>`<button type="button" class="cd-chip" data-f="mk|${esc(k)}" aria-pressed="${C.f.mk.has(k)}">${esc(k)}<small>${n}</small></button>`).join('')}</div>`);
 grid(body,list,'jd')}
function vTrending(body){if(C.trErr){head('Trending','');body.innerHTML=`<div class="cd-note"><b>Can't load trending ads.</b> ${esc(C.trErr)}</div>`;return}
 if(!C.tr){head('Trending','Loading trending ads…');body.innerHTML='';return}
 const weeks=[...new Set(TR.map(r=>r.week))];if(!C.week)C.week=weeks[0];
 const list=sorted(filtered(TR.filter(r=>r.week===C.week),'trending'),C.sort.trending);
 head('Trending',`The top ads each week in the categories closest to JD, ranked by Runneth community saves. Badge = rank in its category.`,
  `<label class="cd-sel"><span class="lbl">Week</span><select id="cd-week" aria-label="Week">${weeks.map(w=>`<option value="${w}" ${w===C.week?'selected':''}>${esc(fmtWeek(w))}</option>`).join('')}</select></label>`);
 const ws=$('#cd-week');if(ws)ws.onchange=()=>{C.week=ws.value;draw()};
 grid(body,list,'trending')}
function vBrands(body){if(C.brand){const b=BRAND_BY[C.brand];if(!b){location.hash='discover/brands';return}
  const list=sorted(filtered(ADS.filter(a=>a.bid===b.bid),'brand'),C.sort.brand);
  $('#cd-head').innerHTML=`<a class="cd-link back" href="#discover/brands">${sv(I.back,14)} All brands</a><div class="cd-bh">${logoHTML(b.b,b.logo,'cd-logo lg')}<div><h2 class="disp">${esc(b.b)}</h2><p>${esc(b.g==='JD Global'?'JD Group':b.g)}${b.market?' · '+esc(b.market):''} · ${b.n} ads · ${b.live} active · ${b.proven} proven · ${b.avgd} day average run</p></div></div>`;
  grid(body,list,'brand');return}
 const q=C.q.trim().toLowerCase();const list=BRANDS.filter(b=>b.n>=3&&(!q||b.b.toLowerCase().includes(q)));
 head('Brands',`${list.length} brands with 3+ ads. Open one to see every ad it is running.`);
 body.innerHTML=`<div class="cd-bgrid">${list.map(b=>`<a class="cd-btile" href="#discover/brands/${esc(b.bid)}"><div class="cd-bt-h">${logoHTML(b.b,b.logo)}<div class="cd-cht"><b>${esc(b.b)}</b><small>${b.n} ads · ${b.live} active</small></div></div>
  <div class="cd-bt-s">${b.top.map(a=>{const m=cur(a);return`<span>${m.thumb?`<img alt="" loading="lazy" src="${esc(m.thumb)}">`:''}</span>`}).join('')}</div>
  <div class="cd-bt-f"><span>${b.nw} new in 2 weeks</span><span>${b.avgd}d avg run</span></div></a>`).join('')||'<div class="cd-empty">No brands match.</div>'}</div>`}
function vBoards(body){if(C.saveErr){head('Boards','');body.innerHTML=`<div class="cd-note"><b>Boards could not load.</b> ${esc(C.saveErr)}</div>`;return}
 const bd=C.boards.find(b=>b.id===C.board)||C.boards[0];
 const bar=`<div class="cd-chips">${C.boards.map(b=>`<button type="button" class="cd-chip" data-bd="${esc(b.id)}" aria-pressed="${bd&&b.id===bd.id}">${esc(b.name)}<small>${C.items.filter(x=>x.board_id===b.id).length}</small></button>`).join('')}<button type="button" class="cd-chip" data-newboard>${sv(I.plus,12)} New board</button></div>`;
 if(!bd){head('Boards','Team boards, shared with everyone in the Briefing Room.',bar);body.innerHTML='<div class="cd-empty">No boards yet. Open any ad and choose Add to board.</div>';return}
 const seen=new Set(),list=[];C.items.filter(x=>x.board_id===bd.id).forEach(x=>{const it=BYID[x.ad_id];if(it&&!seen.has(it.id)){seen.add(it.id);list.push(it)}});
 const hidden=C.items.filter(x=>x.board_id===bd.id&&!BYID[x.ad_id]).length;
 head(esc(bd.name),`${list.length} ad${list.length===1?'':'s'} on this board${hidden?` · ${hidden} saved from a later batch, not shown yet`:''}. Team-shared.`,bar);
 grid(body,list,'board')}

/* ---------- saves and boards ---------- */
let toastT;function toast(t){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,1800)}
async function toggleSave(id){const it=BYID[id];if(!it)return;const m=me();if(!m){toast('Sign in with your JD email first');return}
 const on=!isSaved(it);const ids=on?[it.id]:it.members.filter(x=>C.favs.has(x.id)).map(x=>x.id);
 ids.forEach(x=>{if(on){C.favs.add(x);C.allFavs[x]=(C.allFavs[x]||0)+1}else{C.favs.delete(x);C.allFavs[x]=Math.max(0,(C.allFavs[x]||1)-1)}});
 it.sv=it.members.reduce((s,x)=>s+(C.allFavs[x.id]||0),0);
 $$(`[data-save="${CSS.escape(it.id)}"]`).forEach(b=>{b.setAttribute('aria-pressed',on);if(b.classList.contains('cd-save'))b.innerHTML=sv(on?I.bmf:I.bm,17);else b.innerHTML=`${sv(on?I.bmf:I.bm,15)} ${on?'Saved':'Save'}`});
 toast(on?'Saved':'Removed from saved');
 try{for(const x of ids){if(on)await api('in_favs',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({email:m,ad_id:x})});else await api('in_favs?email=eq.'+encodeURIComponent(m)+'&ad_id=eq.'+x,{method:'DELETE'})}}catch(err){toast('Could not sync: '+err.message)}}
const inBoard=(bid,it)=>C.items.some(x=>x.board_id===bid&&it.members.some(m=>m.id===x.ad_id));
async function addBoard(name){const r=await api('in_boards',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name,created_by:me()})});const b=r.data[0];C.boards.push(b);return b}
async function toggleBoard(bid,it){if(inBoard(bid,it)){const ids=C.items.filter(x=>x.board_id===bid&&it.members.some(m=>m.id===x.ad_id)).map(x=>x.ad_id);
  C.items=C.items.filter(x=>!(x.board_id===bid&&ids.includes(x.ad_id)));for(const id of ids)await api('in_board_items?board_id=eq.'+bid+'&ad_id=eq.'+id,{method:'DELETE'});return false}
 const row={board_id:bid,ad_id:it.id,src:'discovery',added_by:me()};C.items.unshift({...row,created_at:new Date().toISOString()});
 await api('in_board_items',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});return true}
async function removeFromBoard(id){const bd=C.boards.find(b=>b.id===C.board)||C.boards[0];const it=BYID[id];if(!bd||!it)return;try{await toggleBoard(bd.id,it);toast('Removed from '+bd.name)}catch(e){toast('Could not update board: '+e.message)}draw()}
function dialog(html){let o=$('#cd-dlg');if(!o){o=document.createElement('div');o.id='cd-dlg';document.body.appendChild(o)}o.innerHTML=`<div class="cd-dlg-bg" data-dx><div class="cd-dlg" role="dialog" aria-modal="true">${html}</div></div>`;
 o.querySelector('[data-dx]').addEventListener('click',e=>{if(e.target.matches('[data-dx]'))o.innerHTML=''});return o}
function boardDialog(id){const it=BYID[id];if(!it)return;if(!me()){toast('Sign in with your JD email first');return}
 const drawD=()=>{const o=dialog(`<h3 class="disp">Add to board</h3>${C.boards.map(b=>{const on=inBoard(b.id,it);return`<button type="button" class="cd-brow" data-tb="${esc(b.id)}"><span class="cd-tick ${on?'on':''}">${sv(on?I.check:I.plus,14)}</span><span>${esc(b.name)}</span><small>${C.items.filter(x=>x.board_id===b.id).length}</small></button>`}).join('')}
  <form id="cd-nbf"><input id="cd-nbn" placeholder="New board name" aria-label="New board name" maxlength="60"></form><div class="cd-dlg-f"><button type="button" class="cd-btn y" data-dd>Done</button></div>`);
  $('[data-dd]',o).onclick=()=>o.innerHTML='';
  $$('[data-tb]',o).forEach(b=>b.onclick=async()=>{const bd=C.boards.find(x=>x.id===b.dataset.tb);try{const a=await toggleBoard(bd.id,it);toast(a?'Added to '+bd.name:'Removed from '+bd.name)}catch(e){toast('Could not update board: '+e.message)}drawD()});
  $('#cd-nbf').onsubmit=async e=>{e.preventDefault();const n=$('#cd-nbn').value.trim();if(!n)return;try{const bd=await addBoard(n);await toggleBoard(bd.id,it);toast('Added to '+n)}catch(err){toast('Could not create board: '+err.message)}drawD()}};drawD()}
function newBoard(){if(!me()){toast('Sign in with your JD email first');return}const o=dialog(`<h3 class="disp">New board</h3><form id="cd-nb2"><input id="cd-nb2n" placeholder="Board name" aria-label="Board name" maxlength="60" required><div class="cd-dlg-f"><button type="button" class="cd-btn" data-dc>Cancel</button><button class="cd-btn y">Create</button></div></form>`);
 $('[data-dc]',o).onclick=()=>o.innerHTML='';$('#cd-nb2n').focus();
 $('#cd-nb2').onsubmit=async e=>{e.preventDefault();const n=$('#cd-nb2n').value.trim();if(!n)return;try{const bd=await addBoard(n);o.innerHTML='';location.hash='discover/boards/'+bd.id;toast('Board created')}catch(err){toast('Could not create board: '+err.message)}}}

/* ---------- ad viewer (Instagram placements, no engagement numbers; one video, native controls) ---------- */
const plFor=(k,pl)=>k==='9:16'?(pl==='stories'?'stories':'reels'):'feed';
const SBAR='<div class="cd-sb"><span class="cd-clock" aria-hidden="true"></span><span class="cd-sbr"><i></i><i></i><i></i></span></div>';
function phone(m,it,pl){const av=logoHTML(m.b,m.logo,'cd-av');const handle=esc(m.handle||slug(m.b));const cta=esc(m.cta||'Learn more');
 const media=m.kind==='video'?`<video id="cd-pv" src="${esc(m.video)}" ${m.thumb?`poster="${esc(m.thumb)}"`:''} controls playsinline preload="metadata" data-valts="${esc(JSON.stringify(m.valts||[]))}"></video>`
  :`<img id="cd-pimg" src="${esc(m.thumb||m.imgs[0]||'')}" alt="${esc(m.b)} ad" data-alts="${esc(JSON.stringify(m.alts||[]))}">${m.imgs.length>1?`<span class="cd-cnav big"><button type="button" data-vcs="-1" aria-label="Previous card">${sv(I.chevL,16)}</button><span id="cd-vci">1/${m.imgs.length}</span><button type="button" data-vcs="1" aria-label="Next card">${sv(I.chevR,16)}</button></span>`:''}`;
 const cap=esc(m.x||m.h||'');
 if(pl==='feed')return`<div class="cd-ph" data-pl="feed">${SBAR}<div class="cd-feed"><div class="cd-fh">${av}<div><b>${handle}</b><small>Sponsored</small></div>${sv(I.more,18)}</div>
  <div class="cd-pm">${media}</div><div class="cd-fcta">${cta}${sv(I.chevR,16)}</div>
  <div class="cd-facts">${sv(I.heart,22)}${sv(I.comment,22)}${sv(I.send,22)}<span>${sv(I.bm,22)}</span></div><p class="cd-fcap"><b>${handle}</b> ${cap}</p></div></div>`;
 if(pl==='stories')return`<div class="cd-ph" data-pl="stories">${SBAR}<div class="cd-full"><div class="cd-pm">${media}</div>
  <div class="cd-ov top"><div class="cd-sbars"><i></i><i></i><i></i></div><div class="cd-sh">${av}<b>${handle}</b><small>Sponsored</small></div></div>
  <div class="cd-ov bot"><div class="cd-scta">${sv(I.chevU,16)}<span>${sv(I.link,14)} ${cta}</span></div></div></div></div>`;
 return`<div class="cd-ph" data-pl="reels">${SBAR}<div class="cd-full"><div class="cd-pm">${media}</div>
  <div class="cd-ov top"><b>Reels</b></div>
  <div class="cd-rail" aria-label="Reels actions (preview only)">${sv(I.heart,24)}${sv(I.comment,24)}${sv(I.send,24)}${sv(I.bm,24)}${sv(I.more,22)}</div>
  <div class="cd-ov bot reels"><div class="cd-sh">${av}<b>${handle}</b><small>Sponsored</small></div><p>${cap}</p><div class="cd-aud">${sv(I.music,12)} ${handle} · Original audio</div><div class="cd-rcta">${cta}${sv(I.chevR,14)}</div></div></div></div>`}
function openViewer(id,ctx){const it=BYID[id]||(C.trBy&&C.trBy[id]);if(!it)return;hoverOut();
 const list=(C.lists[ctx]||[]).includes(it)?C.lists[ctx]:[it];const f=it.src==='ad'?(C.fmt[it.id]||it.def):null;
 C.viewer={it,list,fmt:f,pl:plFor(f||'',null),ctx,focus:document.activeElement};
 let L=$('#cd-vw');if(!L){L=document.createElement('div');L.id='cd-vw';L.className='cd-vw';L.setAttribute('role','dialog');L.setAttribute('aria-modal','true');L.setAttribute('aria-label','Ad viewer');document.body.appendChild(L)}
 L.hidden=false;document.documentElement.style.overflow='hidden';drawViewer();$('[data-vx]',L).focus()}
function closeViewer(){const L=$('#cd-vw');if(!L||L.hidden)return;$$('video',L).forEach(v=>{v.pause();v.removeAttribute('src');v.load()});L.hidden=true;L.innerHTML='';document.documentElement.style.overflow='';
 const f=C.viewer&&C.viewer.focus;C.viewer=null;if(f&&f.isConnected)try{f.focus({preventScroll:true})}catch(e){}}
function stepViewer(d){const V=C.viewer;const i=V.list.indexOf(V.it);V.it=V.list[(i+d+V.list.length)%V.list.length];V.fmt=V.it.src==='ad'?(C.fmt[V.it.id]||V.it.def):null;V.pl=plFor(V.fmt||'',V.pl);drawViewer()}
function drawViewer(){const V=C.viewer,it=V.it,L=$('#cd-vw');$$('video',L).forEach(v=>{v.pause();v.removeAttribute('src');v.load()});
 const m=it.src==='ad'?(it.fm[V.fmt]||cur(it)):it;
 if(it.src==='tr'&&!V.plSet){const r=parseFloat((document.querySelector(`.cd-fr[data-open="${it.id}"]`)||{}).dataset?.nat||0);V.pl=r&&r<.7?'reels':'feed'}
 const i=V.list.indexOf(it);
 const kv=it.src==='ad'?[['Days live',`${m.d} (${fmtDate(m.sd)} to ${m.st==='active'?'now':fmtDate(m.ed)})`],['Format',`${kindLbl(m.kind)} · ${m.ar||m.asp}${m.est?' (estimated)':''}`],['CTA',m.cta],['Landing',m.lp],['Market',it.mk||it.market||'Not set'],['Platforms',m.pl.join(', ')||'Not captured']]
  :[['Rank',`#${it.rank} in ${TRN[it.cat]||it.cat}`],['Week',fmtWeek(it.week).replace('Week of ','')],['Running',it.age||'Not shown'],['Format',kindLbl(it.kind)],['Source','Runneth trending (community saves)']];
 const saved=isSaved(it);
 L.innerHTML=`<div class="cd-vw-top"><button type="button" class="cd-ib" data-vx aria-label="Close (Esc)">${sv(I.x,20)}</button><div class="cd-vw-t"><b>${esc(it.b)}</b><small>${i+1} of ${V.list.length}</small></div>
  <button type="button" class="cd-ib" data-vp aria-label="Previous ad">${sv(I.chevL,20)}</button><button type="button" class="cd-ib" data-vn aria-label="Next ad">${sv(I.chevR,20)}</button></div>
 <div class="cd-vw-body"><div class="cd-vw-grid"><div class="cd-stage">
  <div class="cd-segs">${it.nf>=2?`<div class="cd-seg" role="group" aria-label="Format">${it.fl.map(k=>`<button type="button" data-vf="${k}" aria-pressed="${k===m.asp}">${k}</button>`).join('')}</div>`:''}
  <div class="cd-seg" role="group" aria-label="Placement">${[['reels','Reels'],['stories','Stories'],['feed','Feed']].map(([k,l])=>`<button type="button" data-vpl="${k}" aria-pressed="${V.pl===k}">${l}</button>`).join('')}</div></div>
  ${phone(m,it,V.pl)}</div>
  <div class="cd-info"><div class="cd-ch">${logoHTML(it.b,it.logo,'cd-logo lg')}<div class="cd-cht"><b>${esc(it.b)}</b><small>${topMeta(it)}</small></div></div>
   ${it.src==='ad'?`<h3 class="disp">${esc((m.h||m.x||it.b).split(/(?<=[.!?])\s/)[0].slice(0,90))}</h3>`:''}
   <div class="cd-acts">${it.src==='ad'?`<button type="button" class="cd-btn ${saved?'y':''}" data-save="${esc(it.id)}" aria-pressed="${saved}">${sv(saved?I.bmf:I.bm,15)} ${saved?'Saved':'Save'}</button><button type="button" class="cd-btn" data-vb>${sv(I.board,15)} Add to board</button>`:''}${m.l?`<a class="cd-btn" href="${esc(m.l)}" target="_blank" rel="noopener">Landing page ${I.ext}</a>`:''}</div>
   ${it.src==='ad'?`<div class="cd-score"><span class="disp">${m.ps}</span><div><span class="lbl">Proven score</span><small>${Math.min(m.d,CAP)} days live${m.d>CAP?' (capped)':''} + ${m.var} variant${m.var>1?'s':''} + ${m.par} parallel launch${m.par===1?'':'es'}. ${m.proven?'Proven: running 60+ days.':`${PROVEN_DAYS-m.d} more days to Proven.`}</small></div></div>`:''}
   <dl class="cd-kv">${kv.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
   ${it.src==='ad'&&it.vf.length?`<div><span class="lbl">Tags</span><div class="cd-chips" style="margin-top:6px">${it.vf.map(v=>`<span class="cd-tag">${esc(v)}</span>`).join('')}</div></div>`:''}
   ${it.src==='ad'?`<div><span class="lbl">On-screen headline</span><p>${esc(m.h||'None captured')}</p><span class="lbl">Ad copy</span><p class="cd-copy">${esc(m.x||'No primary text')}</p></div>`:''}
   <p class="cd-kbd"><kbd>←</kbd><kbd>→</kbd> previous, next · ${it.nf>=2?'<kbd>F</kbd> format · ':''}<kbd>Esc</kbd> close</p></div></div></div>`;
 $('[data-vx]',L).onclick=closeViewer;$('[data-vp]',L).onclick=()=>stepViewer(-1);$('[data-vn]',L).onclick=()=>stepViewer(1);
 $$('[data-vf]',L).forEach(b=>b.onclick=()=>{V.fmt=b.dataset.vf;C.fmt[it.id]=V.fmt;V.pl=plFor(V.fmt,V.pl);drawViewer()});
 $$('[data-vpl]',L).forEach(b=>b.onclick=()=>{V.pl=b.dataset.vpl;V.plSet=1;if(it.src==='ad'){if(V.pl==='feed'&&V.fmt==='9:16'){const k=['4:5','1:1','16:9'].find(x=>it.fm[x]);if(k)V.fmt=k}if(V.pl!=='feed'&&V.fmt!=='9:16'&&it.fm['9:16'])V.fmt='9:16'}drawViewer()});
 const vb=$('[data-vb]',L);if(vb)vb.onclick=()=>boardDialog(it.id);
 const sb=$('[data-save]',L);if(sb)sb.onclick=()=>toggleSave(it.id).then(()=>{if(C.viewer)drawViewer()});
 $$('[data-vcs]',L).forEach(b=>b.onclick=()=>{const n=m.imgs.length;V.ci=((V.ci||0)+(+b.dataset.vcs)+n)%n;$('#cd-pimg').src=m.imgs[V.ci];$('#cd-vci').textContent=`${V.ci+1}/${n}`});
 V.ci=0;const pv=$('#cd-pv');if(pv){pv.muted=true;const p=pv.play();if(p)p.catch(()=>{})}}
document.addEventListener('keydown',e=>{if(!C.viewer)return;if($('#cd-dlg')&&$('#cd-dlg').innerHTML){if(e.key==='Escape')$('#cd-dlg').innerHTML='';return}
 if(e.target.matches&&e.target.matches('input,textarea,select'))return;const k=e.key.toLowerCase();
 if(k==='escape')closeViewer();else if(k==='arrowright'&&e.target.tagName!=='VIDEO'){e.preventDefault();stepViewer(1)}else if(k==='arrowleft'&&e.target.tagName!=='VIDEO'){e.preventDefault();stepViewer(-1)}
 else if(k==='f'&&C.viewer.it.nf>=2){const it=C.viewer.it;const j=it.fl.indexOf(C.viewer.fmt);C.viewer.fmt=it.fl[(j+1)%it.fl.length];C.fmt[it.id]=C.viewer.fmt;C.viewer.pl=plFor(C.viewer.fmt,C.viewer.pl);drawViewer()}});

/* ---------- boot, routing and Briefing Room integration ---------- */
async function start(){if(C.started)return;C.started=true;draw();
 const tr=loadTrending().then(rows=>{TR=rows.map(normTr);C.week=C.week||(TR[0]&&TR[0].week)||null;C.trBy=Object.fromEntries(TR.map(t=>[t.id,t]));C.tr=true;if(C.ready){counts();if(C.tab==='trending')draw()}}).catch(e=>{C.trErr=e.message;if(C.tab==='trending')draw()});
 try{const[rows]=await Promise.all([loadAds(),loadSaves()]);buildData(rows);C.ready=true}catch(e){C.err=e.message}
 draw();if(C.ready)counts();await tr.catch(()=>{})}
function routeCD(h){const p=h.split('/');C.tab=TABS.some(t=>t[0]===p[1])?p[1]:'discover';C.brand=C.tab==='brands'&&p[2]?p[2]:null;if(C.tab==='boards'&&p[2])C.board=p[2];
 if(C.tab!=='jd')C.f.mk.clear();if(C.tab!=='trending')C.f.cat.clear();if(C.tab==='trending'){C.f.asp.clear();C.f.brand.clear();C.f.tag.clear();C.f.status.clear()}
 C.filtersOpen=false;window.scrollTo({top:0});start();draw()}
function inject(){const row=document.querySelector('.proj .wrap');
 if(!document.getElementById('t-cd')){const g=document.createElement('span');g.className='tr-top';g.innerHTML='<span class="lbl">Always on</span><button type="button" class="pj tr-pj" id="t-cd"><i class="cd-dot"></i>Creative Discovery <i>Discover · JD · Trending</i></button>';row.appendChild(g);g.querySelector('button').onclick=()=>location.hash='discover'}
 if(!document.getElementById('v-cd')){const s=document.createElement('section');s.id='v-cd';s.hidden=true;document.querySelector('main').appendChild(s)}}
const isCD=h=>h==='discover'||h.startsWith('discover/')||h==='trending'||h==='inspo'||h.startsWith('inspo/');
function hook(){const _show=window.show;window.show=function(tab){const v=document.getElementById('v-cd'),t=document.getElementById('t-cd');const bar=document.querySelector('nav.bar'),pj=document.querySelector('.proj .pj.on:not(#t-cd), .proj .pj.was');
  if(tab==='cd'){document.querySelectorAll('main > section').forEach(x=>x.hidden=true);document.querySelectorAll('nav.bar [data-tab]').forEach(x=>x.setAttribute('aria-pressed',false));v.hidden=false;t.classList.add('on');t.setAttribute('aria-current','true');if(pj){pj.classList.remove('on');pj.classList.add('was')}if(bar)bar.hidden=true;return}
  hoverOut();closeViewer();v.hidden=true;t.classList.remove('on');t.removeAttribute('aria-current');if(pj){pj.classList.add('on');pj.classList.remove('was')}if(bar)bar.hidden=false;return _show(tab)};
 const _route=window.route;window.route=function(){const h=decodeURIComponent(location.hash.slice(1));
  if(isCD(h)){document.getElementById('drawer').hidden=true;document.getElementById('scrim').hidden=true;
   if(h==='trending'||h==='inspo'||h.startsWith('inspo/')){history.replaceState(null,'','#discover'+(h==='trending'?'/trending':''));return window.route()}
   window.show('cd');routeCD(h);return}
  return _route()};
 window.removeEventListener('hashchange',_route);window.addEventListener('hashchange',window.route)}
const wait=setInterval(()=>{if(typeof D==='undefined'||!D||!window.show||!document.getElementById('t-project')||!document.getElementById('t-delivered'))return;clearInterval(wait);inject();hook();if(isCD(decodeURIComponent(location.hash.slice(1))))window.route()},60);
window.CD={C,get ADS(){return ADS},get TR(){return TR}};
})();

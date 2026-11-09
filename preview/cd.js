/* JD Ad Briefing Room · Creative Discovery (replaces Discover Ads). Preview build, served at /preview/.
   One section inside the Briefing Room with sub tabs: Discover (all brands), JD (our markets), Trending (Runneth weekly top ads), Brands, Boards.
   Data: Supabase in_ads (every released batch, English), tr_ads (Runneth trending), in_favs, in_boards, in_board_items. Media: R2 first, then Supabase copies, then Motion.
   Cards are Motion style: true aspect ratio, object-fit contain, never cropped. By default videos do not autoplay in the grid:
   on a pointer device hover plays muted from the start and leaving pauses on the poster (no scrubbing); on touch, tap opens the viewer.
   The Autoplay button (top right of the bar, off by default, remembered per browser) plays every video in view muted on a loop, max 8 at once. */
(()=>{
"use strict";
const SBU='https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/',SBK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const DAY=864e5,NOW=new Date(),CAP=90,PROVEN_DAYS=60,PAGE=1000,CHUNK=36;
const ASPECTS=['9:16','4:5','1:1','16:9'];
const WORLD=[['JD UK',''],['JD US',''],['JD Australia',''],['JD New Zealand',''],['Finish Line','JD Group, USA']];
const OFFER=/(up to \d{1,2}% off|\d{1,2}% off|bogo|buy one,? get one|free shipping|free delivery|\$\d+ off|half price|sale)/i;
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
 camera:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.8"/></svg>',
 heartf:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11z"/></svg>',
 homeig:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3.5 10.5 12 3.5l8.5 7V20.5h-6v-6h-5v6h-6z"/></svg>',
 shop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
 user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/></svg>',
 reels:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 8.5h18M8.5 3l3 5.5M14.5 3l3 5.5"/><path d="m10 12 5 3-5 3z" fill="currentColor"/></svg>',
 volOn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>',
 volOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>',
 chevD:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>',
 fmts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="7" height="12" rx="1.5"/><rect x="12" y="8" width="9" height="9" rx="1.5"/></svg>',
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
 info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
};
const sv=(s,n=16)=>s.replace('<svg',`<svg width="${n}" height="${n}" aria-hidden="true"`);

/* ---------- state ---------- */
const C={tab:'discover',q:'',f:null,
 sort:{discover:'proven',jd:'proven',trending:'rank',brand:'proven',boards:'added'},brand:null,board:null,week:null,
 fmt:{},filtersOpen:false,started:false,ready:false,err:null,tr:null,trErr:null,favs:new Set(),allFavs:{},boards:[],items:[],saveErr:null,lists:{},viewer:null};
let ROWS=[],ADS=[],BYID={},BRANDS=[],BRAND_BY={},TR=[];

/* ---------- data ---------- */
function lpType(u) {
  if (!u) return "Unknown"; let x; try { x = new URL(u); } catch (e) { return "Unknown"; }
  const h = x.hostname.replace(/^www\./, ""), p = x.pathname.toLowerCase().replace(/\/+$/, ""), q = x.search.toLowerCase();
  if (/doubleclick\.net|^go\.|bit\.ly|tinyurl|^l\./.test(h)) return "Unknown";
  if (/(apps|itunes)\.apple\.com|play\.google\.com|app\.link|onelink\.me|\.page\.link|adj\.st/.test(h)) return "App / app store";
  if (/(^|\.)(fb|facebook)\.com$/.test(h) && /canvas_doc/.test(p)) return "Meta Instant Experience";
  if (/(^|\.)(fb|facebook|instagram|tiktok|youtube|linktr|threads)\.(com|me|ee|net)$|wa\.me|m\.me/.test(h)) return "Social / other site";
  if (/[?&](q|query|search|keyword|term|initialquery)=/.test(q) || /\/search(\/|$)|\/catalogsearch\/|\/s\/?$/.test(p)) return "Search results";
  if (/\/products?\/[^/]+|\/p\/[^/]+|\/pd\/|\/t\/[^/]+\/[a-z0-9-]+$|\/dp\/|\/item\/|\/[a-z0-9-]+-[a-z0-9]{5,}\.html$|\/[a-z]{1,3}\d{4,6}(-[a-z0-9]+)?\.html$|\/product-detail|\/sku\//.test(p) || /[?&](variant|sku|pid)=/.test(q)) return "PDP";
  if (/\/collections?(\/|$)|\/c\/|\/w\/|\/w$|\/category|\/categories|\/shop(\/|$)|\/men(s)?(\/|$|-)|\/women(s)?(\/|$|-)|\/kids(\/|$|-)|\/(homme|femme|enfant|herren|damen|kinder|mujer|hombre)(\/|$)|\/brands?\/|\/marque\/|\/sale(\/|$)|\/new-arrivals|\/new-in|\/[a-z-]+-shoes$|\/[a-z-]+-clothing$/.test(p) || /\.html$/.test(p) && !/\d{5,}/.test(p)) return "PLP / collection";
  if (p === "" || p === "/" || /^\/(en|en-[a-z]{2}|[a-z]{2}(-[a-z]{2})?)$/.test(p)) return "Homepage";
  return "Campaign / landing page";
}
function bucket(a){const m=/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(a||'');if(!m||!+m[2])return null;const r=Math.log(m[1]/m[2]);let best=null,bd=9;
 [['9:16',9/16],['4:5',.8],['1:1',1],['16:9',16/9]].forEach(([k,v])=>{const d=Math.abs(r-Math.log(v));if(d<bd){bd=d;best=k}});return best}
const ratioOf=s=>{const m=/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(s||'');return m&&+m[2]?m[1]/m[2]:null};
const COLS='id,brand,brand_id,brand_group,logo,logo_s,logo_r2,status,start_date,end_date,days_live,format,visual_formats,aspect,platforms,cards,headline,copy,cta,landing,video,video_s,video_r2,poster,poster_frame,images,images_s,images_r2,thumb_s,thumb_r2,saves,market,concept_key,variant_group,formats,first_seen,hook_text,onscreen_text,hook_kind,vf_source,focus,hook_format,hook_template,hook_source,ad_library';
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
  mk:MK[r.brand_id]||null,market:r.market||null,ck:r.concept_key||('c_'+r.id),vg:r.variant_group||('vg_'+r.id),fs:r.first_seen,motion:r.saves||0,
  poster:cleanPoster,c:r.cards||imgs.length||1,hk:r.hook_text||null,ost:r.onscreen_text||null,hkind:r.hook_kind||null,hf:r.hook_format||null,ht:r.hook_template||null,hsrc:r.hook_source||null,lib:r.ad_library||null,vfs:r.vf_source||null,focus:!!r.focus};
 a.alts=[r.thumb_r2,r.thumb_s,(r.images_s||[])[0],r.poster,(r.images||[])[0]].filter(u=>u&&u!==thumb);
 a.valts=[r.video_s,r.video].filter(u=>u&&u!==vid);
 if(!a.asp){const f=(r.formats||[]).find(f=>f.ad_id===a.id);a.asp=(f&&f.aspect)||(kind==='carousel'?'1:1':'4:5');a.est=true}
 a.lp=lpType(a.l);const om=OFFER.exec(a.h+' '+a.x);a.of=om?om[0].replace(/^./,c=>c.toUpperCase()):null;a.handle=slug(a.b)||'brand';a.age=sd?Math.round((NOW-new Date(sd+'T12:00:00'))/DAY):999;return a}
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
  it.vfm=[...new Set(ms.filter(m=>m.vfs==='motion').flatMap(m=>m.vf))];it.hfs=new Set(ms.map(m=>m.hf||'__none'));it.focus=ms.some(m=>m.focus);
  it.hay=' '+nz([it.b,...ms.map(m=>[m.h,m.x,m.hk,m.ost,m.l].join(' ')),it.vf.join(' '),[...it.kinds].join(' '),it.lp,it.cta,it.g,it.mk||'',it.market||'',MKT_L[it.market]||''].join(' '))+' ';
  return it});
 BYID={};ADS.forEach(it=>{BYID[it.id]=it;it.members.forEach(m=>{if(!BYID[m.id])BYID[m.id]=it})});
 const bb={};ADS.forEach(a=>{const b=bb[a.bid]=bb[a.bid]||{b:a.b,bid:a.bid,g:a.g,logo:'',n:0,live:0,nw:0,dsum:0,proven:0,mk:a.mk,market:a.market,top:[]};
  b.n++;if(a.focus)b.focus=true;if(a.st==='active')b.live++;if(a.age<=14)b.nw++;b.dsum+=a.d;if(a.proven)b.proven++;if(!b.logo&&a.logo)b.logo=a.logo;b.top.push(a)});
 BRANDS=Object.values(bb).map(b=>{b.avgd=Math.round(b.dsum/b.n);b.top.sort((x,y)=>y.ps-x.ps);b.top=b.top.slice(0,3);return b}).sort((p,q)=>q.n-p.n);
 BRAND_BY=Object.fromEntries(BRANDS.map(b=>[b.bid,b]));buildNames()}
function normTr(r,i){const imgs=(r.images_s&&r.images_s.length?r.images_s:r.images)||[];const video=r.video_s||r.video||null;
 const kind=r.kind==='video'&&video?'video':(r.kind==='carousel'||imgs.length>1?'carousel':'image');
 return{id:'tr'+i,src:'tr',b:r.brand||'Unknown brand',logo:r.logo_s||r.logo||'',kind,video,thumb:(r.poster_s||r.poster||imgs[0]||''),imgs,
  alts:[r.poster,(r.images||[])[0]].filter(Boolean),valts:[r.video].filter(u=>u&&u!==video),asp:null,ratio:null,rank:r.rank,cat:r.category,
  age:r.age||'',week:r.week,hay:' '+nz([r.brand,TRN[r.category]||r.category,kind].join(' '))+' ',fl:[],nf:0,members:[]}}
const cur=it=>it.src==='ad'?(it.fm[C.fmt[it.id]||it.def]||it):it;
const isSaved=it=>it.src==='ad'&&it.members.some(m=>C.favs.has(m.id));

/* ---------- filtering ---------- */
const RISING=a=>a.st==='active'&&a.age<=30;
/* ---------- search (case and accent insensitive, partial words, every word must match) ---------- */
const nz=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9%$]+/g,' ').trim();
const qTerms=()=>nz(C.q).split(' ').filter(Boolean);
const qMatch=(a,terms)=>!terms.length||terms.every(t=>a.hay.includes(t));

/* ---------- filters: state, matching, URL and per-browser memory ---------- */
const F0=()=>({hf:new Set(),brand:new Set(),mkt:new Set(),kind:new Set(),asp:new Set(),tag:new Set(),st:new Set(),sig:new Set(),lp:new Set(),cta:new Set(),cat:new Set(),days:null,launch:null,ai:true});
const SETS=['brand','mkt','kind','asp','tag','hf','st','sig','lp','cta','cat'];
const fClone=F=>{const o=F0();SETS.forEach(k=>o[k]=new Set(F[k]));o.days=F.days?F.days.slice():null;o.launch=F.launch?F.launch.slice():null;o.ai=F.ai;return o};
const fCount=F=>SETS.reduce((s,k)=>s+F[k].size,0)+(F.days?1:0)+(F.launch?1:0)+(F.ai?0:1);
const MKT_L={CA:'Canada',US:'USA',UK:'UK',AU:'Australia',NZ:'New Zealand',EU:'Europe',MX:'Mexico',CL:'Chile',FR:'France',Global:'Global','n/a':'Not set'};
const SIG_L={proven:'Proven 60+ days',rising:'Rising',saved:'Most saved (team saves)',multi:'Has multiple formats'};
const ST_L={live:'Active',ended:'Ended'};
const KIND_L={video:'Video',image:'Image',carousel:'Carousel'};
function fMatch(a,F,skip){
 if(a.src==='tr'){if(skip!=='kind'&&F.kind.size&&!F.kind.has(a.kind))return false;if(skip!=='cat'&&F.cat.size&&!F.cat.has(a.cat))return false;return true}
 if(skip!=='brand'&&F.brand.size&&!F.brand.has(a.bid))return false;
 if(skip!=='mkt'&&F.mkt.size&&!F.mkt.has(a.market||'n/a'))return false;
 if(skip!=='kind'&&F.kind.size&&![...a.kinds].some(k=>F.kind.has(k)))return false;
 if(skip!=='asp'&&F.asp.size&&!a.fl.some(k=>F.asp.has(k)))return false;
 if(skip!=='tag'&&F.tag.size&&!(F.ai?a.vf:a.vfm).some(v=>F.tag.has(v)))return false;
 if(skip!=='hf'&&F.hf.size&&![...a.hfs].some(v=>F.hf.has(v)))return false;
 if(skip!=='st'&&F.st.size&&!F.st.has(a.st==='active'?'live':'ended'))return false;
 if(skip!=='sig'&&F.sig.size){for(const s of F.sig){if(s==='proven'&&!a.proven)return false;if(s==='rising'&&!RISING(a))return false;if(s==='saved'&&!(a.sv>0))return false;if(s==='multi'&&a.nf<2)return false}}
 if(skip!=='lp'&&F.lp.size&&!F.lp.has(a.lp))return false;
 if(skip!=='cta'&&F.cta.size&&!F.cta.has(a.cta))return false;
 if(skip!=='days'&&F.days&&(a.d<F.days[0]||a.d>F.days[1]))return false;
 if(skip!=='launch'&&F.launch&&(!a.sd||(F.launch[0]&&a.sd<F.launch[0])||(F.launch[1]&&a.sd>F.launch[1])))return false;
 return true}
function filtered(base,ctx,F=C.f){const terms=qTerms();const skip=ctx==='brand'?'brand':null;return base.filter(a=>qMatch(a,terms)&&fMatch(a,F,skip))}
function fToQS(F){const p=new URLSearchParams();SETS.forEach(k=>{if(F[k].size)p.set(k,[...F[k]].join('~'))});if(F.days)p.set('days',F.days.join('-'));if(F.launch)p.set('launch',F.launch.map(x=>x||'').join('_'));if(!F.ai)p.set('ai','0');if(C.q.trim())p.set('q',C.q.trim());return p.toString()}
function fFromQS(qs){const F=F0();const p=new URLSearchParams(qs);SETS.forEach(k=>{const v=p.get(k);if(v)v.split('~').filter(Boolean).forEach(x=>F[k].add(x))});
 const d=p.get('days');if(d){const[x,y]=d.split('-').map(Number);if(isFinite(x)&&isFinite(y))F.days=[x,y]}const l=p.get('launch');if(l){const[x,y]=l.split('_');F.launch=[x||'',y||'']}
 if(p.get('ai')==='0')F.ai=false;return{F,q:p.get('q')||''}}
function fSave(){store.set('filters',fToQS(C.f))}
let CD_PATH='discover';
function syncURL(){const want=hashFor(C.viewer?C.viewer.mid:C.pendingAd);if(location.hash!==want)history.replaceState(null,'',want)}
/* shareable ad links: #<current path>/ad/<ad_id> (e.g. #discover/ad/<id>); old #ad/<id> links are accepted too */
function hashFor(id){const qs=fToQS(C.f);return'#'+CD_PATH+(id?'/ad/'+id:'')+(qs?'?'+qs:'')}
const shareURL=id=>location.origin+location.pathname+'#'+CD_PATH+'/ad/'+id;
async function copyText(t){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(t);return true}}catch(e){}
 const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();return ok}
async function copyLink(id){const ok=await copyText(shareURL(id));toast(ok?'Link copied':'Could not copy the link')}
function fCommit(F){C.f=F;fSave();draw()}

/* ---------- filters drawer (right drawer on desktop, bottom sheet on phones) ---------- */
function fBase(){if(C.tab==='trending')return TR.filter(r=>r.week===C.week);if(C.tab==='jd')return ADS.filter(a=>a.mk&&((C.gmk||'all')==='all'||a.mk===C.gmk));if(C.tab==='brands'&&C.brand)return brandAds(C.brand);return ADS}
const FD={D:null,bq:''};
function quickGroups(){const jd=BRANDS.filter(b=>b.mk).map(b=>b.bid);const ca=BRANDS.filter(b=>b.market==='CA'&&b.g!=='JD Global'&&b.g!=='Category finds').map(b=>b.bid);const fo=BRANDS.filter(b=>b.focus).map(b=>b.bid);
 return[['jd','JD markets',jd],['ca','Canadian retailers',ca],['focus','Focus brands',fo]].filter(g=>g[2].length)}
function fGroups(D){const base=fBase();const terms=qTerms();const pool=g=>base.filter(a=>qMatch(a,terms)&&fMatch(a,D,g==='brand'&&C.tab==='brands'&&C.brand?'brand':g));
 const cnt=(g,fn)=>{const p=pool(g);return v=>p.filter(a=>fn(a,v)).length};
 if(C.tab==='trending'){const ck=cnt('kind',(a,v)=>a.kind===v),cc=cnt('cat',(a,v)=>a.cat===v);
  return[{k:'kind',l:'Media type',opts:Object.keys(KIND_L).map(v=>[v,KIND_L[v],ck(v)])},{k:'cat',l:'Category',opts:TRC.map(([v,l])=>[v,l,cc(v)])}]}
 const g=[];
 if(!(C.tab==='brands'&&C.brand)){const p=pool('brand');const bc={};p.forEach(a=>bc[a.bid]=(bc[a.bid]||0)+1);
  const opts=BRANDS.filter(b=>bc[b.bid]||D.brand.has(b.bid)).sort((x,y)=>(bc[y.bid]||0)-(bc[x.bid]||0)).map(b=>[b.bid,b.b,bc[b.bid]||0]);g.push({k:'brand',l:'Brand',opts,search:true,quick:quickGroups()})}
 {const p=pool('mkt');const mc={};p.forEach(a=>{const m=a.market||'n/a';mc[m]=(mc[m]||0)+1});g.push({k:'mkt',l:'Market',opts:Object.keys(mc).sort((x,y)=>mc[y]-mc[x]).map(m=>[m,MKT_L[m]||m,mc[m]])})}
 {const c=cnt('kind',(a,v)=>a.kinds.has(v));g.push({k:'kind',l:'Media type',opts:Object.keys(KIND_L).map(v=>[v,KIND_L[v],c(v)])})}
 {const c=cnt('asp',(a,v)=>a.fl.includes(v));g.push({k:'asp',l:'Aspect',opts:ASPECTS.map(v=>[v,v,c(v)])})}
 {const p=pool('tag');const tc={};p.forEach(a=>(D.ai?a.vf:a.vfm).forEach(v=>tc[v]=(tc[v]||0)+1));D.tag.forEach(v=>{if(!tc[v])tc[v]=0});
  g.push({k:'tag',l:'Visual format',opts:Object.keys(tc).sort((x,y)=>tc[y]-tc[x]).slice(0,48).map(v=>[v,v,tc[v]]),ai:true})}
 {const c=cnt('hf',(a,v)=>a.hfs.has(v));const o=HFMTS.map(v=>[v,v,c(v)]).concat([['__none','Not read yet',c('__none')]]).filter(x=>x[2]||C.f.hf.has(x[0])||D.hf.has(x[0]));g.push({k:'hf',l:'Hook format',opts:o})}
 {const c=cnt('st',(a,v)=>(a.st==='active'?'live':'ended')===v);g.push({k:'st',l:'Status',opts:Object.keys(ST_L).map(v=>[v,ST_L[v],c(v)])})}
 {const p=pool('days');const mx=Math.max(1,...p.map(a=>a.d),...ADS.map(a=>a.d));g.push({k:'days',l:'Days live',range:[0,mx]})}
 {g.push({k:'launch',l:'Launch date',dates:true})}
 {const c=cnt('sig',(a,v)=>v==='proven'?a.proven:v==='rising'?RISING(a):v==='saved'?a.sv>0:a.nf>=2);g.push({k:'sig',l:'Proven, Rising, Most saved',opts:Object.keys(SIG_L).map(v=>[v,SIG_L[v],c(v)])})}
 {const p=pool('lp');const lc={};p.forEach(a=>lc[a.lp]=(lc[a.lp]||0)+1);g.push({k:'lp',l:'Landing page type',opts:Object.keys(lc).sort((x,y)=>lc[y]-lc[x]).map(v=>[v,v,lc[v]])})}
 {const p=pool('cta');const cc={};p.forEach(a=>cc[a.cta]=(cc[a.cta]||0)+1);g.push({k:'cta',l:'CTA',opts:Object.keys(cc).sort((x,y)=>cc[y]-cc[x]).slice(0,20).map(v=>[v,v,cc[v]])})}
 return g}
function openFilters(){FD.D=fClone(C.f);FD.bq='';let o=$('#cd-fd');if(!o){o=document.createElement('div');o.id='cd-fd';document.body.appendChild(o);o.addEventListener('click',onFDClick);o.addEventListener('input',onFDInput);o.addEventListener('change',onFDInput)}
 o.hidden=false;document.documentElement.style.overflow='hidden';drawFD();$('#cd-fbtn').setAttribute('aria-expanded','true');setTimeout(()=>{const x=$('#cd-fd [data-fdx]');if(x)x.focus()},30)}
function closeFilters(){const o=$('#cd-fd');if(!o||o.hidden)return;o.hidden=true;o.innerHTML='';if(!C.viewer)document.documentElement.style.overflow='';const b=$('#cd-fbtn');if(b){b.setAttribute('aria-expanded','false');b.focus()}}
function drawFD(){const o=$('#cd-fd'),D=FD.D;const sc=o.querySelector('.cd-fd-b')?o.querySelector('.cd-fd-b').scrollTop:0;const af=document.activeElement&&document.activeElement.id;
 const n=filtered(fBase(),C.tab==='brands'&&C.brand?'brand':'',D).length;const groups=fGroups(D);
 const chip=(k,v,l,c)=>`<button type="button" class="cd-chip" data-fd="${k}|${esc(v)}" aria-pressed="${D[k].has(v)}" ${!c&&!D[k].has(v)?'data-zero':''}>${esc(l)}<small>${fmtN(c)}</small></button>`;
 o.innerHTML=`<div class="cd-fd-bg" data-fdx-bg></div><aside class="cd-fd" role="dialog" aria-modal="true" aria-label="Filters">
  <header class="cd-fd-h"><h3 class="disp">Filters</h3><span class="cd-fd-n">${fCount(D)?fCount(D)+' active':''}</span><button type="button" class="cd-ib2" data-fdx aria-label="Close filters">${sv(I.x,20)}</button></header>
  <div class="cd-fd-b">${groups.map(G=>{let inner='';
   if(G.range){const v=D.days||G.range;inner=`<div class="cd-rng" data-max="${G.range[1]}"><div class="cd-rng-v"><span id="cd-dmin">${v[0]}</span> to <span id="cd-dmax">${v[1]}</span> days</div>
     <input type="range" min="0" max="${G.range[1]}" value="${v[0]}" data-days="0" aria-label="Minimum days live"><input type="range" min="0" max="${G.range[1]}" value="${v[1]}" data-days="1" aria-label="Maximum days live"></div>`}
   else if(G.dates){const v=D.launch||['',''];inner=`<div class="cd-dates"><label><span>From</span><input type="date" data-launch="0" value="${v[0]}"></label><label><span>To</span><input type="date" data-launch="1" value="${v[1]}"></label></div>`}
   else{let opts=G.opts;if(G.search&&FD.bq){const q=nz(FD.bq);opts=opts.filter(o=>nz(o[1]).includes(q))}
    inner=(G.search?`<label class="cd-q cd-fd-q">${sv(I.search,14)}<input id="cd-fdbq" type="search" placeholder="Search brands" value="${esc(FD.bq)}" aria-label="Search brands" autocomplete="off"></label>
      <div class="cd-chips cd-fd-quick">${G.quick.map(([k,l,ids])=>{const on=ids.length&&ids.every(i=>D.brand.has(i));return`<button type="button" class="cd-chip q" data-fdq="${k}" aria-pressed="${on}">${esc(l)}<small>${ids.length}</small></button>`}).join('')}</div>`:'')
     +(G.ai?`<label class="cd-tog"><input type="checkbox" data-fdai ${D.ai?'checked':''}><span>Show AI-tagged formats</span><small>Motion tags plus ours</small></label>`:'')
     +`<div class="cd-chips ${opts.length>14?'cd-fd-scroll':''}">${opts.map(([v,l,c])=>chip(G.k,v,l,c)).join('')||'<span class="cd-fd-none">No matches</span>'}</div>`}
   const act=G.range?(D.days?1:0):G.dates?(D.launch?1:0):D[G.k].size;
   return`<section class="cd-fd-g"><div class="cd-fd-gh"><span class="lbl">${G.l}</span>${act?`<button type="button" class="cd-link" data-fdclr="${G.k}">Clear</button>`:''}</div>${inner}</section>`}).join('')}</div>
  <footer class="cd-fd-f"><button type="button" class="cd-btn" data-fdclear>Clear all</button><button type="button" class="cd-btn y" data-fdapply>Show ${fmtN(n)} result${n===1?'':'s'}</button></footer></aside>`;
 o.querySelector('.cd-fd-b').scrollTop=sc;if(af==='cd-fdbq'){const i=$('#cd-fdbq');i.focus();i.setSelectionRange(i.value.length,i.value.length)}}
function onFDClick(e){const t=e.target,D=FD.D;
 if(t.closest('[data-fdx]')||t.matches('[data-fdx-bg]')){closeFilters();return}
 const c=t.closest('[data-fd]');if(c){const[k,v]=c.dataset.fd.split(/\|(.*)/s);D[k].has(v)?D[k].delete(v):D[k].add(v);drawFD();return}
 const q=t.closest('[data-fdq]');if(q){const g=quickGroups().find(x=>x[0]===q.dataset.fdq);if(g){const on=g[2].every(i=>D.brand.has(i));g[2].forEach(i=>on?D.brand.delete(i):D.brand.add(i))}drawFD();return}
 const cl=t.closest('[data-fdclr]');if(cl){const k=cl.dataset.fdclr;if(k==='days')D.days=null;else if(k==='launch')D.launch=null;else D[k].clear();drawFD();return}
 if(t.closest('[data-fdclear]')){FD.D=F0();FD.bq='';drawFD();return}
 if(t.closest('[data-fdapply]')){const F=FD.D;closeFilters();fCommit(F);return}}
let fdT;
function onFDInput(e){const t=e.target,D=FD.D;
 if(t.id==='cd-fdbq'){FD.bq=t.value;clearTimeout(fdT);fdT=setTimeout(drawFD,120);return}
 if(t.matches('[data-fdai]')){D.ai=t.checked;drawFD();return}
 if(t.matches('[data-days]')){const r=t.closest('.cd-rng');const mx=+r.dataset.max;const a=$$('[data-days]',r).map(x=>+x.value);let lo=Math.min(a[0],a[1]),hi=Math.max(a[0],a[1]);
  $('#cd-dmin').textContent=lo;$('#cd-dmax').textContent=hi;D.days=(lo===0&&hi===mx)?null:[lo,hi];if(e.type==='change')drawFD();return}
 if(t.matches('[data-launch]')){const v=$$('[data-launch]',$('#cd-fd')).map(x=>x.value);D.launch=v[0]||v[1]?v:null;drawFD();return}}
document.addEventListener('keydown',e=>{const o=$('#cd-fd');if(o&&!o.hidden&&e.key==='Escape'){e.stopPropagation();closeFilters()}},true);
/* chips under the search bar: every active filter, removable */
function activeChips(){const F=C.f,on=[];
 SETS.forEach(k=>F[k].forEach(v=>on.push([k,v,k==='brand'?(BRAND_BY[v]||{}).b||v:k==='cat'?TRN[v]||v:k==='mkt'?MKT_L[v]||v:k==='sig'?SIG_L[v]:k==='st'?ST_L[v]:k==='kind'?KIND_L[v]:k==='hf'&&v==='__none'?'Hook not read yet':v])));
 if(F.days)on.push(['days','',`${F.days[0]} to ${F.days[1]} days`]);if(F.launch)on.push(['launch','',`Launched ${F.launch[0]?fmtDate(F.launch[0]):'any time'} to ${F.launch[1]?fmtDate(F.launch[1]):'now'}`]);if(!F.ai)on.push(['ai','','Motion tags only']);
 return on}
function rmFilter(k,v){const F=fClone(C.f);if(k==='days')F.days=null;else if(k==='launch')F.launch=null;else if(k==='ai')F.ai=true;else F[k].delete(v);fCommit(F)}
function fReset(){C.f=F0();C.q='';const q=$('#cd-q');if(q)q.value=''}
/* zero results: suggestions from brand names, tags and single words that do match */
function suggestHTML(base){const terms=qTerms();if(!terms.length)return'';const out=[];
 BRANDS.filter(b=>terms.some(t=>nz(b.b).includes(t))).slice(0,4).forEach(b=>out.push(['brand',b.bid,b.b]));
 const tags=new Set();ADS.forEach(a=>a.vf.forEach(v=>{if(terms.some(t=>nz(v).includes(t)))tags.add(v)}));[...tags].slice(0,3).forEach(v=>out.push(['tag',v,v]));
 if(terms.length>1)terms.forEach(t=>{const n=base.filter(a=>a.hay.includes(t)).length;if(n)out.push(['q',t,`"${t}" (${fmtN(n)})`])});
 return out.length?`<div class="cd-sugg"><span class="lbl">Try</span>${out.slice(0,8).map(([k,v,l])=>`<button type="button" class="cd-chip" data-sugg="${k}|${esc(v)}">${esc(l)}</button>`).join('')}</div>`:''}
function emptyHTML(base){const q=C.q.trim();return`<div class="cd-empty"><b>${q?`No results for "${esc(q)}"`:'No ads match.'}</b> ${fCount(C.f)?'Try clearing a filter. ':''}${q?'Check the spelling or use fewer words.':''}${suggestHTML(base)}</div>`}
function resultLine(n,total,extra){const q=C.q.trim();return q?`${fmtN(n)} result${n===1?'':'s'} for "${esc(q)}"${extra?' · '+extra:''}`:''}
C.f=F0();{const r=fFromQS(store.get('filters','')||'');C.f=r.F;C.q=r.q}
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
 const media=m.thumb?`<span class="cd-shim" aria-hidden="true"><span>Loading creative</span></span><img class="cd-po" alt="${esc(it.b)} ${kindLbl(m.kind).toLowerCase()} ad" loading="lazy" decoding="async" src="${esc(m.thumb)}" data-alts="${alts}">`
  :(m.kind==='video'?`<span class="cd-nopo">${sv(I.play,22)}</span>`:`<span class="cd-nopo">${sv(I.img,22)}</span>`);
 const vsrc=m.kind==='video'&&m.video?` data-v="${esc(m.video)}" data-valts="${esc(JSON.stringify(m.valts||[]))}"`:'';
 const car=m.kind==='carousel'&&m.imgs.length>1?`<span class="cd-cnav"><button type="button" data-cs="-1" aria-label="Previous card">${sv(I.chevL,14)}</button><span>1/${m.imgs.length}</span><button type="button" data-cs="1" aria-label="Next card">${sv(I.chevR,14)}</button></span>`:'';
 return`<div class="cd-fr${r?'':' unk'}${m.thumb?'':' ld'}" ${ar} data-open="${esc(it.id)}" data-ctx="${ctx}" role="button" tabindex="0" aria-label="Open ${esc(it.b)} ad"${vsrc} data-k="${m.kind}">${media}
  ${badgeHTML(it,ctx)}${m.kind==='video'?`<span class="cd-kind"><span class="cd-dur"></span></span><i class="cd-prog"><b></b></i>`:''}${car}</div>`}
function card(it,ctx){const m=cur(it);const saved=isSaved(it);
 const fseg=it.nf>=2?`<div class="cd-fseg" role="group" aria-label="Format">${it.fl.map(k=>`<button type="button" data-fmt="${esc(it.id)}|${k}" aria-pressed="${k===m.asp}">${k}</button>`).join('')}</div>`:'';
 const meta=it.src==='tr'?[kindLbl(m.kind),fmtWeek(it.week)]:[kindLbl(m.kind),m.asp+(m.est?'*':''),...(ctx==='jd'?[m.lp]:[])];
 const pill=ctx==='jd'&&it.mk?`<span class="cd-mk">${esc(it.mk)}</span>`:'';
 const fb=it.nf>=2?`<span class="cd-nf">${it.nf} formats</span>`:'';
 return`<article class="cd-card" data-id="${esc(it.id)}">
  <header class="cd-ch">${logoHTML(it.b,it.logo)}<div class="cd-cht"><b>${esc(it.b)}</b><small>${topMeta(it)}</small></div></header>
  ${frameHTML(it,ctx)}${fseg}
  <footer class="cd-cf">${pill}<span class="cd-meta">${meta.map(esc).join(' · ')}</span>${fb}${it.src==='ad'?`<button type="button" class="cd-save cd-share" data-copy="${esc(it.id)}" aria-label="Copy link" title="Copy link">${sv(I.link,16)}</button>`:''}${it.src==='ad'?`<button type="button" class="cd-save" data-save="${esc(it.id)}" aria-pressed="${saved}" aria-label="${saved?'Remove from saved':'Save'}">${sv(saved?I.bmf:I.bm,17)}</button>`:''}</footer></article>`}
const fmtWeek=w=>w?'Week of '+new Date(w+'T12:00').toLocaleDateString('en-CA',{day:'numeric',month:'short'}):'';

/* ---------- masonry grid (shortest column first, true aspect heights, grows on scroll) ---------- */
const colsFor=w=>w<600?2:w<900?3:w<1200?4:w<1600?5:6;
function grid(host,list,ctx,opt={}){C.lists[ctx]=list;const CF=opt.cols||colsFor,RN=opt.render||card,EST=opt.est||((it,r)=>1/r+.42+(it.nf>=2?.12:0));
 host.innerHTML=list.length?`<div class="cd-mas"></div><div class="cd-sent" aria-hidden="true"></div>`:emptyHTML(opt.base||ADS);
 if(!list.length)return;const mas=$('.cd-mas',host),sent=$('.cd-sent',host);let n=0,cols=[],hs=[];
 const build=()=>{const c=CF(host.clientWidth||window.innerWidth);mas.style.setProperty('--cols',c);mas.innerHTML='';cols=[];hs=[];
  apReset();for(let i=0;i<c;i++){const d=document.createElement('div');d.className='cd-col';mas.appendChild(d);cols.push(d);hs.push(0)}const k=n;n=0;add(Math.max(k,CHUNK))};
 const add=k=>{const end=Math.min(list.length,n+k);for(;n<end;n++){const it=list[n],m=cur(it);const r=m.ratio||ratioOf(m.asp)||.8;
   let j=0;for(let i=1;i<hs.length;i++)if(hs[i]<hs[j]-.01)j=i;
   const t=document.createElement('template');t.innerHTML=RN(it,ctx);const el=t.content.firstElementChild;cols[j].appendChild(el);apWatch(el);hs[j]+=EST(it,r)}
  sent.hidden=n>=list.length};
 build();host._cols=CF(host.clientWidth||window.innerWidth);
 if(host._io)host._io.disconnect();host._io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)&&n<list.length)add(CHUNK)},{rootMargin:'1400px 0px'});host._io.observe(sent);
 if(host._ro)host._ro.disconnect();host._ro=new ResizeObserver(()=>{const c=CF(host.clientWidth);if(c!==host._cols){host._cols=c;build()}});host._ro.observe(host)}

/* fit every frame to the media's real shape once it loads, so nothing is cropped or letterboxed */
document.addEventListener('load',e=>{const el=e.target;if(!(el instanceof HTMLImageElement)||!el.classList.contains('cd-po'))return;const fr=el.closest('.cd-fr');fitFrame(fr,el.naturalWidth,el.naturalHeight);if(fr)fr.classList.add('ld')},true);
document.addEventListener('error',e=>{const el=e.target;
 if(el instanceof HTMLImageElement&&el.dataset.alts){let a=[];try{a=JSON.parse(el.dataset.alts)}catch(x){}const nx=a.shift();el.dataset.alts=JSON.stringify(a);if(nx)el.src=nx;else{const fr=el.closest('.cd-fr');if(fr)fr.classList.add('ld');el.replaceWith(Object.assign(document.createElement('span'),{className:'cd-nopo',innerHTML:sv(I.img,22)}))}}
 if(el instanceof HTMLVideoElement&&el.dataset.valts){let a=[];try{a=JSON.parse(el.dataset.valts)}catch(x){}const nx=a.shift();el.dataset.valts=JSON.stringify(a);if(nx){el.src=nx}}},true);
function fitFrame(fr,w,h){if(!fr||!w||!h)return;const r=w/h;const cur=parseFloat(fr.style.aspectRatio)||0;if(Math.abs(cur-r)/r>.005)fr.style.aspectRatio=r.toFixed(4);fr.classList.remove('unk');fr.dataset.nat=r.toFixed(4);const jm=fr.closest('.cd-jc-m');if(jm)jm.style.setProperty('--r',r.toFixed(4))}

/* ---------- hover preview (pointer devices only): play on enter, poster on leave ---------- */
const FINE=matchMedia('(hover:hover) and (pointer:fine)');
const LRU=[];let H=null;
function vidFor(fr){let v=$('video.cd-v',fr);if(!v){v=document.createElement('video');v.className='cd-v';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.setAttribute('playsinline','');v.preload='metadata';v.loop=true;v.disablePictureInPicture=true;
  v.dataset.valts=fr.dataset.valts||'[]';v.src=fr.dataset.v;
  v.addEventListener('loadedmetadata',()=>{const d=$('.cd-dur',fr);if(d)d.textContent=fmtDur(v.duration);if(!$('img.cd-po',fr))fitFrame(fr,v.videoWidth,v.videoHeight)});
  v.addEventListener('playing',()=>fr.classList.add('vis'));
  fr.insertBefore(v,fr.firstChild)}
 const i=LRU.indexOf(v);if(i>=0)LRU.splice(i,1);LRU.push(v);
 for(let i=0;LRU.length>14&&i<LRU.length;){const o=LRU[i],f=o.parentNode;if((H&&H.v===o)||(f&&AP_ON.has(f))){i++;continue}LRU.splice(i,1);o.pause();o.removeAttribute('src');o.load();o.remove()}
 return v}
function hoverIn(fr){if(H&&H.fr===fr)return;if(H)hoverOut();const v=vidFor(fr);
 H={fr,v,raf:0};fr.classList.add('hov');AP_ON.delete(fr);fr.classList.remove('ap');
 v.muted=true;try{if(v.readyState>0)v.currentTime=0}catch(x){}const p=v.play();if(p)p.catch(()=>{});
 const bar=$('.cd-prog b',fr);
 const tick=()=>{if(!H||H.fr!==fr)return;const d=v.duration;if(bar&&isFinite(d)&&d>0)bar.style.transform=`scaleX(${Math.min(1,v.currentTime/d)})`;H.raf=requestAnimationFrame(tick)};H.raf=requestAnimationFrame(tick)}
function hoverOut(){if(!H)return;const{fr,v}=H;cancelAnimationFrame(H.raf);v.pause();fr.classList.remove('hov','vis');
 const bar=$('.cd-prog b',fr);if(bar)bar.style.transform='scaleX(0)';try{if(v.readyState>0)v.currentTime=0}catch(x){}H=null;if(AP)apSync()}
/* hover = play only: mouseenter plays muted from the start, mouseleave pauses and shows the poster. Moving the pointer never seeks or pauses. */
document.addEventListener('pointerover',e=>{if(!FINE.matches||e.pointerType==='touch')return;const fr=e.target.closest&&e.target.closest('.cd-fr[data-v]');if(fr&&!fr.contains(e.relatedTarget))hoverIn(fr)});
document.addEventListener('pointerout',e=>{if(!H)return;const fr=e.target.closest&&e.target.closest('.cd-fr');if(fr&&fr===H.fr&&!fr.contains(e.relatedTarget))hoverOut()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)hoverOut()});
window.addEventListener('scroll',()=>{if(H&&!H.fr.matches(':hover'))hoverOut()},{passive:true});

/* ---------- autoplay (off by default; on: every grid video in view plays muted on a loop, max 8 at once) ---------- */
let AP=!!store.get('autoplay',false),apIO=null;const AP_WANT=new Set(),AP_ON=new Set(),AP_MAX=8;
function apWatch(card){if(!apIO||!card)return;const fr=card.querySelector&&card.querySelector('.cd-fr[data-v]');if(fr)apIO.observe(fr)}
function apStop(fr){AP_ON.delete(fr);if(H&&H.fr===fr)return;const v=$('video.cd-v',fr);if(v){v.pause();try{if(v.readyState>0)v.currentTime=0}catch(x){}}fr.classList.remove('vis','ap');const b=$('.cd-prog b',fr);if(b)b.style.transform='scaleX(0)'}
function apSync(){[...AP_WANT].forEach(fr=>{if(!fr.isConnected)AP_WANT.delete(fr)});[...AP_ON].forEach(fr=>{if(!fr.isConnected)AP_ON.delete(fr)});
 if(!AP||C.viewer||document.hidden){[...AP_ON].forEach(apStop);return}
 const vh=window.innerHeight/2;const want=[...AP_WANT].map(fr=>{const r=fr.getBoundingClientRect();return[Math.abs(r.top+r.height/2-vh),fr]}).sort((a,b)=>a[0]-b[0]).slice(0,AP_MAX).map(x=>x[1]);
 [...AP_ON].forEach(fr=>{if(!want.includes(fr))apStop(fr)});
 want.forEach(fr=>{if(H&&H.fr===fr)return;const v=vidFor(fr);v.loop=true;v.muted=true;AP_ON.add(fr);fr.classList.add('ap');if(v.paused){const p=v.play();if(p)p.catch(()=>{})}})}
function apReset(){if(apIO)apIO.disconnect();apIO=null;[...AP_ON].forEach(apStop);AP_WANT.clear();
 if(!AP)return;apIO=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting)AP_WANT.add(e.target);else{AP_WANT.delete(e.target);apStop(e.target)}});apSync()},{threshold:.35})}
function apToggle(on){AP=on;store.set('autoplay',on);const b=$('#cd-ap');if(b){b.setAttribute('aria-pressed',on);b.title=on?'Autoplay is on: videos in view play muted. Click to turn off.':'Autoplay is off: hover a video to preview it. Click to play every video in view.'}
 const body=$('#cd-body');apReset();if(on&&body)$$('.cd-card',body).forEach(apWatch)}
document.addEventListener('visibilitychange',()=>apSync());
document.addEventListener('timeupdate',e=>{const v=e.target;if(!(v instanceof HTMLVideoElement)||!v.classList.contains('cd-v')||!v.duration)return;const fr=v.parentNode;if(!fr||!AP_ON.has(fr))return;const b=$('.cd-prog b',fr);if(b)b.style.transform=`scaleX(${Math.min(1,v.currentTime/v.duration)})`},true);

/* ---------- section shell ---------- */
const host=()=>document.getElementById('v-cd');
function shell(){const el=host();if(el.dataset.built)return;el.dataset.built=1;
 el.innerHTML=`<div class="cd">
 <div class="cd-bar"><div class="wrap cd-bar-in">
  <div class="cd-tabs" role="tablist" aria-label="Creative Discovery">${TABS.map(([k,l])=>`<a role="tab" href="#discover${k==='discover'?'':'/'+k}" data-cdtab="${k}" aria-selected="false">${l}<small data-cnt="${k}"></small></a>`).join('')}</div>
  <div class="cd-tools">
   <label class="cd-q">${sv(I.search,15)}<input id="cd-q" type="search" placeholder="Search brands, copy, tags" aria-label="Search Creative Discovery" autocomplete="off"></label>
   <button type="button" class="cd-btn cd-fb" id="cd-fbtn" aria-expanded="false" aria-haspopup="dialog">${sv(I.filter,15)}<span class="cd-fl">Filters<em id="cd-fcount" hidden></em></span></button>
   <label class="cd-sort"><span class="lbl">Sort</span><select id="cd-sort" aria-label="Sort"></select></label>
   <button type="button" class="cd-btn cd-ap" id="cd-ap" aria-pressed="${AP}">${sv(I.play,13)}<span>Autoplay</span><i class="cd-sw" aria-hidden="true"></i></button>
  </div></div>
  <div class="cd-act wrap" id="cd-act" hidden></div>
 </div>
 <div class="wrap cd-main"><div class="cd-head" id="cd-head"></div><div id="cd-body"></div></div></div>`;
 const q=$('#cd-q',el);let qt;q.value=C.q;q.oninput=()=>{clearTimeout(qt);qt=setTimeout(()=>{C.q=q.value;fSave();draw()},180)};
 $('#cd-fbtn',el).onclick=openFilters;
 $('#cd-sort',el).onchange=e=>{C.sort[sortKey()]=e.target.value;draw()};
 const apb=$('#cd-ap',el);apb.onclick=()=>apToggle(!AP);apToggle(AP);
 el.addEventListener('click',onClick);
 el.addEventListener('keydown',e=>{const fr=e.target.closest('.cd-fr');if(fr&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openViewer(fr.dataset.open,fr.dataset.ctx)}})}
const sortKey=()=>C.tab==='brands'?(C.brand?'brand':null):C.tab==='jd'?null:C.tab;
function onClick(e){const t=e.target;
 const cs=t.closest('[data-cs]');if(cs){e.stopPropagation();stepCarousel(cs);return}
 const sb=t.closest('[data-save]');if(sb){toggleSave(sb.dataset.save);return}
 const cp=t.closest('[data-copy]');if(cp){e.preventDefault();e.stopPropagation();copyLink(cp.dataset.copy);return}
 const fb=t.closest('[data-fmt]');if(fb){const[id,k]=fb.dataset.fmt.split('|');C.fmt[id]=k;const art=fb.closest('.cd-card');const it=BYID[id];if(art&&it){const ctx=art.querySelector('.cd-fr').dataset.ctx;const t2=document.createElement('template');t2.innerHTML=ctx==='jd'?jdCard(it,ctx):card(it,ctx);const nw=t2.content.firstElementChild;art.replaceWith(nw);apWatch(nw);apSync()}return}
 const fr=t.closest('.cd-fr');if(fr){openViewer(fr.dataset.open,fr.dataset.ctx);return}
 const rf=t.closest('[data-rmf]');if(rf){const[g,v]=rf.dataset.rmf.split(/\|(.*)/s);rmFilter(g,v||'');return}
 if(t.closest('[data-fclear]')){fReset();fSave();draw();return}
 const sg=t.closest('[data-sugg]');if(sg){const[k,v]=sg.dataset.sugg.split(/\|(.*)/s);if(k==='q'){C.q=v;$('#cd-q').value=v;draw()}else{const F=fClone(C.f);F[k].add(v);C.q='';$('#cd-q').value='';fCommit(F)}return}
 const bd=t.closest('[data-bd]');if(bd){location.hash='discover/boards/'+bd.dataset.bd;return}
 if(t.closest('[data-newboard]')){newBoard();return}
 const rm=t.closest('[data-rmb]');if(rm){e.preventDefault();removeFromBoard(rm.dataset.rmb);return}}
function stepCarousel(b){const fr=b.closest('.cd-fr'),it=BYID[fr.dataset.open]||C.trBy[fr.dataset.open];const m=cur(it);const n=m.imgs.length;
 const i=((+fr.dataset.ci||0)+(+b.dataset.cs)+n)%n;fr.dataset.ci=i;const img=$('img.cd-po',fr);if(img)img.src=m.imgs[i];$('.cd-cnav span',fr).textContent=`${i+1}/${n}`}

/* ---------- filter button, active chips and sort ---------- */
function drawFilters(){const btn=$('#cd-fbtn'),act=$('#cd-act');const usable=C.ready&&C.tab!=='boards'&&!(C.tab==='brands'&&!C.brand)&&!(C.tab==='jd'&&C.jdv==='hooks');
 btn.hidden=!usable;$('.cd-q').hidden=C.tab==='boards'||(C.tab==='brands'&&!C.brand)||(C.tab==='jd'&&C.jdv==='hooks');$('#cd-ap').hidden=!C.ready||(C.tab==='brands'&&!C.brand)||(C.tab==='jd'&&C.jdv==='hooks');
 const n=fCount(C.f);const fc=$('#cd-fcount');fc.hidden=!n;fc.textContent=n?' · '+n:'';btn.setAttribute('aria-label',n?`Filters, ${n} active`:'Filters');
 const on=usable?activeChips():[];
 act.hidden=!on.length;act.innerHTML=on.map(([g,v,l])=>`<button type="button" class="cd-chip on" data-rmf="${g}|${esc(v)}" aria-label="Remove filter ${esc(l)}">${esc(l)} ${sv(I.x,12)}</button>`).join('')+(on.length?`<button type="button" class="cd-link" data-fclear>Clear all</button>`:'');
 const s=$('#cd-sort'),k=sortKey();s.closest('.cd-sort').hidden=!k||!C.ready;if(k){s.innerHTML=SORTS[k].map(([v,l])=>`<option value="${v}" ${C.sort[k]===v?'selected':''}>${l}</option>`).join('')}}

/* ---------- views ---------- */
const LOADER=`<div class="cd-load" role="status" aria-live="polite"><i class="cd-load-mk" aria-hidden="true"><b></b></i><span>Loading creative</span></div>`;

function head(title,sub,extra=''){$('#cd-head').innerHTML=`<div class="cd-h1"><div><h2 class="disp">${title}</h2><p>${sub}</p></div>${extra}</div>`}
function draw(){const el=host();if(!el||el.hidden)return;shell();syncURL();
 $$('[data-cdtab]',el).forEach(a=>{const on=a.dataset.cdtab===C.tab;a.setAttribute('aria-selected',on);a.classList.toggle('on',on)});
 drawFilters();const body=$('#cd-body');
 if(C.err){head('Creative Discovery','');body.innerHTML=`<div class="cd-note"><b>Can't load ads right now.</b> The team database didn't answer (${esc(C.err.slice(0,90))}). <button type="button" class="cd-btn y" id="cd-retry">Try again</button></div>`;$('#cd-retry').onclick=()=>{C.err=null;C.started=false;start()};return}
 if(!C.ready){const T={discover:'Discover',jd:'JD Global',trending:'Trending',brands:'Brands',boards:'Boards'};head(T[C.tab]||'Discover','&nbsp;');body.innerHTML=LOADER;return}
 ((C.tab==='jd'&&C.jdv==='hooks'?vHooks:null)||{discover:vDiscover,jd:vJD,trending:vTrending,brands:vBrands,boards:vBoards}[C.tab]||vDiscover)(body)}
function counts(){const set=(k,n)=>{const s=$(`[data-cnt="${k}"]`);if(s)s.textContent=n==null?'':fmtN(n)};set('discover',ADS.length);set('jd',ADS.filter(a=>a.mk).length);set('trending',C.tr?TR.filter(a=>a.week===C.week).length:null);set('brands',PROF?profList().length:null);set('boards',C.boards.length||null)}
/* Discover mixes brands: each brand's best ad first, then round-robin, so no single brand fills the screen */
function mixBrands(arr){const by=new Map();arr.forEach(a=>{const k=a.bid||a.b;if(!by.has(k))by.set(k,[]);by.get(k).push(a)});const qs=[...by.values()],out=[];
 while(out.length<arr.length)for(const q of qs)if(q.length)out.push(q.shift());return out}
function vDiscover(body){let list=sorted(filtered(ADS,'discover'),C.sort.discover);if(C.sort.discover==='proven'&&!C.f.brand.size)list=mixBrands(list);
 head('Discover',resultLine(list.length)||`${fmtN(list.length)} of ${fmtN(ADS.length)} ads from ${fmtN(BRANDS.length)} brands. ${FINE.matches?'Hover a video to preview it. Click to open.':'Tap any ad to open it.'}`);
 grid(body,list,'discover')}
/* JD tab = the JD Global section from /discovery/ (same stats, market chips, Proven sort, Show more and note).
   The only change: each ad is a larger card (2 per row on desktop, 1 on phones) with the creative uncropped. */
const jdTitle=a=>{const src=(a.h&&a.h.length>3?a.h:a.x)||a.b;return src.split(/(?<=[.!?])\s/)[0].slice(0,90)};
function jdCard(a,ctx){const m=cur(a);const saved=isSaved(a);const r=m.ratio||ratioOf(m.asp)||.8;
 const fseg=a.nf>=2?`<div class="cd-fseg" role="group" aria-label="Format">${a.fl.map(k=>`<button type="button" data-fmt="${esc(a.id)}|${k}" aria-pressed="${k===m.asp}">${k}</button>`).join('')}</div>`:'';
 return`<article class="cd-card cd-jc" data-id="${esc(a.id)}"><div class="cd-jc-m" style="--r:${r.toFixed(4)}">${frameHTML(a,'jd')}</div>
  <div class="cd-jc-i"><b class="cd-jc-t">${esc(a.h||jdTitle(a))}</b><small class="cd-jc-s">${a.d} days · ${m.kind} · ${esc(a.lp)}</small>
   <div class="cd-jc-c"><span class="cd-mk">${esc(a.mk)}</span>${a.nf>=2?`<span class="cd-mk">${a.nf} formats</span>`:''}${a.vf.slice(0,2).map(v=>`<span class="cd-mk">${esc(v)}</span>`).join('')}</div>
   ${fseg}<div class="cd-jc-f">${logoHTML(a.b,a.logo)}<span class="cd-jc-b">${esc(a.b)}</span><button type="button" class="cd-save cd-share" data-copy="${esc(a.id)}" aria-label="Copy link" title="Copy link">${sv(I.link,16)}</button><button type="button" class="cd-save" data-save="${esc(a.id)}" aria-pressed="${saved}" aria-label="${saved?'Remove from saved':'Save'}">${sv(saved?I.bmf:I.bm,17)}</button></div></div></article>`}
const jdCols=w=>w<760?1:2;
const jdEst=(it,r)=>{const one=(host()&&host().clientWidth||1200)<760;return one?Math.min(1/r,1.25)+.45:Math.max(.62,Math.min(440,400/r)/620)+.04};
function vJD(body){const mkts=['all',...WORLD.map(w=>w[0]),'JD France'];
 const all=filtered(ADS.filter(a=>a.mk),'jd');const gm=C.gmk||'all';
 const list=all.filter(a=>gm==='all'||a.mk===gm).sort((a,b)=>b.ps-a.ps);
 const fmt={};all.forEach(a=>a.vf.forEach(v=>fmt[v]=(fmt[v]||0)+1));const live=all.filter(a=>a.st==='active').length;
 const show=Math.min(list.length,C.gshow||60);
 head(`JD Global <span class="cd-dv">${tipHTML(PROVEN_TIP)}</span>`,resultLine(list.length)||`What JD UK, US, Australia, New Zealand and Finish Line run, sorted by Proven score. Ideas to bring to JD Canada.`,jdSub('ads'));
 body.innerHTML=`<div class="cd-dv cd-jd">
  <div class="two three cd-jd-stats">
   <div class="panel"><div class="lbl">Ads from sister banners</div><div class="display num" style="font-size:52px;margin-top:6px">${fmtN(all.length)}</div><div style="color:var(--t3);font-size:12.5px">${fmtN(live)} live now · ${all.filter(a=>a.proven).length} Proven</div></div>
   <div class="panel"><div class="lbl">In 2+ formats</div><div class="display num" style="font-size:52px;margin-top:6px;color:var(--jd)">${all.filter(a=>a.nf>=2).length}</div><div style="color:var(--t3);font-size:12.5px">Same ad cut for Reels, Stories and Feed.</div></div>
   <div class="panel"><div class="lbl">Formats they lean on</div><div class="chiprow" style="margin-top:8px">${Object.entries(fmt).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([t,n])=>`<button type="button" class="tag" data-golib="tag:${esc(t)}">${esc(t)} · ${n}</button>`).join('')||'<span class="tag">Not tagged by Motion</span>'}</div></div>
  </div>
  <div class="chips" style="padding-top:0">${mkts.map(m=>{const n=m==='all'?all.length:all.filter(a=>a.mk===m).length;return`<button type="button" class="chip" data-gmk="${m}" aria-pressed="${gm===m}" ${n?'':'disabled'}>${m==='all'?'All markets':m}<b>${n||'not tracked'}</b></button>`}).join('')}</div>
  <div class="cd-jd-grid" id="cd-jdg"></div>
  ${show<list.length?`<div style="display:flex;justify-content:center;margin-top:16px"><button type="button" class="pill" data-gmore>Show more (${fmtN(list.length-show)} left)</button></div>`:''}
  <div class="note"><div><b>JD Canada isn't in the Motion feed yet.</b> Once its Meta page is added, ads here can be matched to JD Canada's library to show what Canada hasn't run.</div></div></div>`;
 grid($('#cd-jdg',body),list.slice(0,show),'jd',{cols:jdCols,render:jdCard,est:jdEst,base:ADS.filter(a=>a.mk)});C.lists.jd=list;
 body.onclick=e=>{const m=e.target.closest('[data-gmk]');if(m){C.gmk=m.dataset.gmk;C.gshow=60;draw();return}
  if(e.target.closest('[data-gmore]')){const y=scrollY;C.gshow=show+60;draw();scrollTo(0,y);return}
  const g=e.target.closest('[data-golib]');if(g){goTag(g.dataset.golib.slice(4))}}}
function tipHTML(text,label='How the Proven score works'){return`<details class="tip"><summary aria-label="${esc(label)}">${sv(I.info,18)}</summary><div class="tipbox" role="note">${esc(text)}</div></details>`}
function goTag(t){closeViewer('nav');fReset();C.f.tag.add(t);fSave();if(location.hash==='#discover')draw();else location.hash='discover'}
function vTrending(body){if(C.trErr){head('Trending','');body.innerHTML=`<div class="cd-note"><b>Can't load trending ads.</b> ${esc(C.trErr)}</div>`;return}
 if(!C.tr){head('Trending','&nbsp;');body.innerHTML=LOADER;return}
 const weeks=[...new Set(TR.map(r=>r.week))];if(!C.week)C.week=weeks[0];
 const list=sorted(filtered(TR.filter(r=>r.week===C.week),'trending'),C.sort.trending);
 head('Trending',resultLine(list.length)||`The top ads each week in the categories closest to JD, ranked by Runneth community saves. Badge = rank in its category.`,
  `<label class="cd-sel"><span class="lbl">Week</span><select id="cd-week" aria-label="Week">${weeks.map(w=>`<option value="${w}" ${w===C.week?'selected':''}>${esc(fmtWeek(w))}</option>`).join('')}</select></label>`);
 const ws=$('#cd-week');if(ws)ws.onchange=()=>{C.week=ws.value;draw()};
 grid(body,list,'trending',{base:TR})}
/* ---------- Brands: profiles from cd_brand_profiles (stats over every English ad of the brand), list with search, category chips and sort; brand page ---------- */
const BCATS=['JD (our markets)','Sportswear and Athletic','Footwear','Streetwear','Athleisure and Yoga','Outdoor','Fashion and Lifestyle','Luxury and Designer','Multi-brand Retailer','Canadian Retailer','Other'];
const BSORTS=[['ads','Most ads'],['active','Most active'],['growth','Fastest growing (30 days)'],['longest','Longest running'],['az','A to Z']];
const CTRY={CA:'Canada',US:'USA',UK:'UK',AU:'Australia',NZ:'New Zealand',DE:'Germany',FR:'France',ES:'Spain',NL:'Netherlands',SE:'Sweden',DK:'Denmark',CH:'Switzerland',JP:'Japan',IN:'India'};
const MIXK=[['video','Video'],['image','Image'],['carousel','Carousel']];
const pct1=v=>(Math.round((+v||0)*10)/10).toFixed(1).replace(/\.0$/,'.0');
let PROF=null,PROF_ERR=null,NAMES={};
async function loadProfiles(){try{const r=await apiRetry('cd_brand_profiles?select=brand,brand_id,category,subcategory,country,is_focus,stats,summary,summary_basis,updated_at');PROF=r.data||[]}catch(e){PROF_ERR=e.message;PROF=[]}}
/* group released ads by brand name (a brand can have several Meta pages); the brand id in the URL can be any of its pages */
function buildNames(){NAMES={};ADS.forEach(a=>{const n=NAMES[a.b]=NAMES[a.b]||{b:a.b,bids:new Set(),logo:'',n:0,ads:[]};n.bids.add(a.bid);n.n++;n.ads.push(a);if(!n.logo&&a.logo)n.logo=a.logo});
 (PROF||[]).forEach(p=>{const n=NAMES[p.brand];if(n){n.p=p;n.bid=p.brand_id&&n.bids.has(p.brand_id)?p.brand_id:[...n.bids][0]}});Object.values(NAMES).forEach(n=>{if(!n.bid)n.bid=[...n.bids][0]})}
const nameOfBid=bid=>{const b=BRAND_BY[bid];return b?b.b:null};
const brandAds=bid=>{const nm=nameOfBid(bid);return nm&&NAMES[nm]?NAMES[nm].ads:ADS.filter(a=>a.bid===bid)};
const isCanadian=p=>p.country==='CA'||p.category==='Canadian Retailer';
function mixBar(mix,big){const segs=MIXK.filter(([k])=>+(mix||{})[k]>0);
 return`<div class="cd-mix${big?' big':''}" role="img" aria-label="${esc(MIXK.map(([k,l])=>`${l} ${pct1((mix||{})[k])}%`).join(', '))}"><div class="cd-mix-b">${segs.map(([k,l])=>`<i class="m-${k}" style="width:${+mix[k]}%" title="${l} ${pct1(mix[k])}%"></i>`).join('')}</div>
  <div class="cd-mix-l">${MIXK.map(([k,l])=>`<span data-mix="${k}"><i class="m-${k}"></i>${l} <b>${pct1((mix||{})[k])}%</b></span>`).join('')}</div></div>`}
function trendHTML(l){if(!l)return'';const a=+l.last||0,b=+l.prior||0;
 if(b>=5&&l.pct!=null){const up=+l.pct>=0;return`<span class="cd-trend ${up?'up':'dn'}">${up?'▲':'▼'} ${up?'+':''}${l.pct}%<small> launches, last 30 days vs prior 30</small></span>`}
 return`<span class="cd-trend">${fmtN(a)}<small> launch${a===1?'':'es'} in the last 30 days</small></span>`}
const firstSentence=s=>{s=String(s||'');const m=/^(.+?[.!?])(\s|$)/.exec(s.replace(/^Only \d+ English ads? captured, too few for a pattern\. /,''));return m?m[1]:s};
function profList(){const list=Object.values(NAMES).filter(n=>n.p&&n.p.stats);return list}
function bSort(arr,mode){const g=n=>n.p.stats,f={ads:n=>g(n).totals.ads,active:n=>g(n).totals.active,growth:n=>{const l=g(n).l30||{};return(+l.prior>=5&&l.pct!=null)?+l.pct:-1e9},longest:n=>+g(n).median_days||0}[mode];
 return arr.slice().sort((x,y)=>mode==='az'?x.b.localeCompare(y.b,'en-CA',{sensitivity:'base'}):(f(y)-f(x))||x.b.localeCompare(y.b))}
function bCard(n){const p=n.p,s=p.stats;return`<a class="cd-btile cd-bcard" href="#discover/brands/${esc(n.bid)}" data-brand="${esc(n.b)}">
  <div class="cd-bt-h">${logoHTML(n.b,n.logo)}<div class="cd-cht"><b>${esc(n.b)}</b><small>${esc(p.category||'Other')}${p.is_focus?' · Focus':''}</small></div><span class="cd-bact"><b>${fmtN(s.totals.active)}</b><small>active</small></span></div>
  ${mixBar(s.mix)}<div class="cd-bt-t">${trendHTML(s.l30)}</div><p class="cd-bsum">${esc(firstSentence(p.summary))}</p></a>`}
function vBrandsList(body){
 if(!PROF){head('Brands','&nbsp;');body.innerHTML=LOADER;return}
 if(!C.bsort)C.bsort='ads';const all=profList();
 head('Brands',PROF_ERR?`Brand profiles could not load (${esc(PROF_ERR.slice(0,80))}).`:`${fmtN(all.length)} brands. Stats cover every English ad we hold for each brand; summaries come from those numbers only.`);
 body.innerHTML=`<div class="cd-btools"><label class="cd-q cd-bq">${sv(I.search,15)}<input id="cd-bq" type="search" placeholder="Search brands" aria-label="Search brands" autocomplete="off" value="${esc(C.bq||'')}"></label>
  <label class="cd-sort"><span class="lbl">Sort</span><select id="cd-bsort" aria-label="Sort brands">${BSORTS.map(([v,l])=>`<option value="${v}" ${C.bsort===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
  <div class="cd-chips cd-bcats" id="cd-bcats"></div><div id="cd-blist"></div>`;
 const q=$('#cd-bq',body);q.oninput=()=>{C.bq=q.value;drawBrandCards()};$('#cd-bsort',body).onchange=e=>{C.bsort=e.target.value;drawBrandCards()};
 $('#cd-bcats',body).onclick=e=>{const c=e.target.closest('[data-bcat]');if(!c)return;const v=c.dataset.bcat;C.bcat=C.bcat===v?'':v;drawBrandCards()};
 drawBrandCards()}
function drawBrandCards(){const all=profList();const t=nz(C.bq||'');const byQ=all.filter(n=>!t||nz(n.b).includes(t)||nz(n.p.category).includes(t));
 const cat=C.bcat||'';const inCat=(n,c)=>!c?true:c==='__focus'?n.p.is_focus:c==='__ca'?isCanadian(n.p):(n.p.category||'Other')===c;
 const chip=(v,l)=>{const k=byQ.filter(n=>inCat(n,v)).length;return k||cat===v?`<button type="button" class="cd-chip${v.startsWith('__')?' q':''}" data-bcat="${esc(v)}" aria-pressed="${cat===v}">${esc(l)}<small>${k}</small></button>`:''};
 $('#cd-bcats').innerHTML=chip('','All')+chip('__focus','Focus brands')+chip('__ca','Canadian')+BCATS.map(c=>chip(c,c)).join('');
 const list=bSort(byQ.filter(n=>inCat(n,cat)),C.bsort);
 $('#cd-blist').innerHTML=list.length?`<p class="cd-bcount">${fmtN(list.length)} brand${list.length===1?'':'s'}${t?` for "${esc(C.bq.trim())}"`:''}</p><div class="cd-bgrid">${list.map(bCard).join('')}</div>`:`<div class="cd-empty"><b>No brands match${t?` "${esc(C.bq.trim())}"`:''}.</b> Try another name or clear the category.</div>`}
function tile(label,inner,cls=''){return`<section class="cd-stile ${cls}"><div class="lbl">${label}</div>${inner}</section>`}
function hbars(rows,unit='%'){const mx=Math.max(1,...rows.map(r=>+r[1]||0));return`<div class="cd-hb">${rows.map(([l,v,note])=>`<div class="cd-hb-r" title="${esc(l)}: ${pct1(v)}${unit}${note?' · '+esc(note):''}"><span class="cd-hb-l">${esc(l)}</span><span class="cd-hb-t"><i style="width:${(+v||0)/mx*100}%"></i></span><b>${pct1(v)}${unit}</b></div>`).join('')}</div>`}
function weeksChart(ws){const mx=Math.max(1,...ws.map(w=>MIXK.reduce((s,[k])=>s+(+w[k]||0),0)));
 return`<div class="cd-wk" role="img" aria-label="Launches per week, last 8 weeks">${ws.map(w=>{const tot=MIXK.reduce((s,[k])=>s+(+w[k]||0),0);const d=new Date(w.start+'T12:00:00').toLocaleDateString('en-CA',{day:'numeric',month:'short'});
  return`<div class="cd-wk-c" tabindex="0" title="Week of ${d}: ${tot} launches (${MIXK.map(([k,l])=>`${l} ${w[k]||0}`).join(', ')})"><b>${tot||''}</b><span class="cd-wk-s" style="height:${tot/mx*100}%">${MIXK.slice().reverse().filter(([k])=>+w[k]>0).map(([k])=>`<i class="m-${k}" style="flex:${+w[k]}"></i>`).join('')}</span><small>${d}</small></div>`}).join('')}</div>
  <div class="cd-mix-l">${MIXK.map(([k,l])=>`<span><i class="m-${k}"></i>${l}</span>`).join('')}</div>`}
function vBrandPage(body){const nm=nameOfBid(C.brand);const n=nm&&NAMES[nm];if(!n){location.hash='discover/brands';return}
 const p=n.p,s=p&&p.stats;const list=sorted(filtered(n.ads,'brand'),C.sort.brand);
 const sub=[p&&p.category,p&&p.country?(CTRY[p.country]||p.country):null,s?`${fmtN(s.totals.active)} active / ${fmtN(s.totals.ads)} total`:`${fmtN(n.n)} ads`,s&&s.median_days!=null?`median ${Math.round(s.median_days)} days live`:null].filter(Boolean).join(' · ');
 $('#cd-head').innerHTML=`<a class="cd-link back" href="#discover/brands">${sv(I.back,14)} All brands</a><div class="cd-bh">${logoHTML(n.b,n.logo,'cd-logo lg')}<div><h2 class="disp">${esc(n.b)}</h2><p>${esc(sub)}</p></div></div>`;
 let prof='';
 if(s){const l=s.l30||{};const h=s.hooks||{};const hasHooks=(h.top||[]).length;
  const asp=['9:16','4:5','1:1','16:9','unknown'].filter(k=>(s.aspect||{})[k]>0).map(k=>[k==='unknown'?'Not measured':k,s.aspect[k]]);
  const top=(s.top_ads||[]).map(id=>BYID[id]).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,6);
  prof=`<div class="cd-bprof">
   <p class="cd-bsum-l">${esc(p.summary||'')}</p><p class="cd-basis">Based on ${esc(p.summary_basis||'')}.</p>
   <div class="cd-stiles">
    ${tile('Format mix',mixBar(s.mix,true),'w2')}
    ${tile('Aspect mix',hbars(asp))}
    ${tile('UGC share',`<div class="cd-big">${s.ugc_share==null?'n/a':pct1(s.ugc_share)+'%'}</div><small>of tagged ads use UGC Selfie, UGC Overlay, Yapper, Testimonial, Review, Influencer, Street Interview or POV</small>`)}
    ${tile('Studio / product share',`<div class="cd-big">${s.studio_share==null?'n/a':pct1(s.studio_share)+'%'}</div><small>of tagged ads use Product Image, Studio Shot, Lifestyle Image, Cinematic B-Roll, Model Shot or Flatlay</small>`)}
    ${tile('Launches, last 30 days',`<div class="cd-big">${fmtN(l.last||0)}</div>${trendHTML(l)}<small>Prior 30 days: ${fmtN(l.prior||0)}. ${MIXK.map(([k,lb])=>{const f=(l.by_format||{})[k];return f?`${lb} ${f.last} (prior ${f.prior})`:null}).filter(Boolean).join(' · ')}</small>`)}
   </div>
   <div class="cd-bcols">
    <section class="cd-panel2"><div class="lbl">Launches per week by format · last 8 weeks</div>${weeksChart(s.weeks||[])}</section>
    <section class="cd-panel2"><div class="lbl">Top visual formats</div>${(s.top_tags||[]).length?hbars(s.top_tags.slice(0,8).map(t=>[t.tag,t.pct,t.n+' ads'])):'<p class="cd-muted">No visual format tags yet.</p>'}
     <p class="cd-muted">Share of tagged ads. Tags cover ${pct1(s.tag_coverage)}% of this brand's ads (${fmtN(s.tagged||0)} of ${fmtN(s.totals.ads)}; Motion tags plus ours).${s.tag_coverage<40?' Limited tags: read these as indicative.':''}</p></section>
    <section class="cd-panel2"><div class="lbl">Top hook formats</div>${hasHooks?hbars(h.top.map(x=>[x.format,x.n/Math.max(1,h.top.reduce((a,b)=>a+b.n,0))*100,x.n+' ads']))+(h.example?`<p class="cd-hex"><span class="lbl">Example · ${esc(h.example.format)}</span>"${esc(h.example.text)}"${h.example.source==='ocr'?' <em class="cd-mr">machine read</em>':''} <a class="cd-link" href="#discover/brands/${esc(n.bid)}/ad/${esc(h.example.id)}">Open ad</a></p>`:''):`<p class="cd-muted">${h.read?`${fmtN(h.read)} hooks read; formats not classified yet.`:'No hooks read for this brand yet.'}</p>`}
     ${h.read?`<p class="cd-muted">Hooks read on ${fmtN(h.read)} ads${h.machine?', mostly machine read (indicative)':''}. Share of classified hooks.</p>`:''}</section>
   </div>
   ${top.length?`<section class="cd-panel2"><div class="lbl">Top ads · Proven score</div><div class="cd-bstrip">${top.map(x=>card(x,'btop')).join('')}</div></section>`:''}
  </div>`;C.lists.btop=top}
 else prof=`<div class="cd-note">No profile for this brand yet.</div>`;
 body.innerHTML=`${prof}<div class="cd-h1 cd-ball"><div><h3 class="disp">All ${esc(n.b)} ads</h3><p>${fmtN(list.length)} of ${fmtN(n.n)} ads${fCount(C.f)||C.q.trim()?' match your filters':''}. Filters below apply to this brand only.</p></div></div><div id="cd-bads"></div>`;
 grid($('#cd-bads',body),list,'brand',{base:n.ads})}
function vBrands(body){if(C.brand)return vBrandPage(body);return vBrandsList(body)}
/* ---------- JD tab, Hooks sub view: what JD markets put on screen in the first 3 seconds (in_ads.hook_text, hook_format, hook_template) ---------- */
const HFMTS=['Teaser / Knock knock','Callout','Question','POV / Relatable','Drop / New in alert','Offer / Price first','Product name reveal','Countdown / Urgency','List / How to','Statement / Claim','Social proof / Trend','Creator / Talking head','Visual only','Other'];
const HKIND_L={text:'Video, text in first 3s',visual:'Video, visual hook (no text)',image_text:'Image or carousel with text',none:'Image or carousel, no text'};
const HSORTS=[['proven','Proven'],['newest','Newest'],['longest','Longest running']];
/* JD Canada ideas for the most reused JD templates. AI suggestions (written by Claude from the template), not ads that ran. */
const HK_AI={
 "WHAT'S YOUR WAY?":["WHAT'S YOUR WAY THIS WINTER, CANADA?","WHAT'S YOUR WAY? FIND IT AT JD","WHAT'S YOUR WAY TO DO [PRODUCT]?"],
 'CREATE THE NEW':['CREATE THE NEW THIS WINTER','CREATE THE NEW. ONLY AT JD CANADA','CREATE THE NEW WITH [PRODUCT]'],
 'ONLY AT JD':['ONLY AT JD CANADA','ONLY AT JD: [PRODUCT]','NOWHERE ELSE IN CANADA. ONLY AT JD'],
 'JD EXCLUSIVE [PRODUCT]':['JD EXCLUSIVE [PRODUCT], NOW IN CANADA','CANADA, THE JD EXCLUSIVE [PRODUCT] IS HERE','JD EXCLUSIVE: [PRODUCT] IN STORE AND ONLINE'],
 'NOW OPEN':['NOW OPEN: JD [STORE]','WE\'RE OPEN, [CITY]. COME THROUGH','NOW OPEN IN [CITY]'],
 '#ONLYATJD':['#ONLYATJD CANADA','#ONLYATJD: [PRODUCT]','#ONLYATJD THIS HOLIDAY'],
 'UP TO [X]% OFF* OFFERS':['UP TO [X]% OFF* AT JD CANADA','UP TO [X]% OFF* BLACK FRIDAY STARTS NOW','UP TO [X]% OFF* [PRODUCT] AND MORE'],
 'KNOCK KNOCK...[PRODUCT] AT JD':["KNOCK KNOCK... [PRODUCT] AT JD CANADA","KNOCK KNOCK... WHO'S THERE? [PRODUCT]","KNOCK KNOCK... THE [PRODUCT] JUST LANDED"],
 'TOP THREE STREETWEAR PIECES WE ALL NEED THIS WINTER AT NO. [N]...':['TOP 3 PIECES FOR A CANADIAN WINTER. NO. 3...','TOP 3 WINTER FITS AT JD CANADA','TOP 3 [PRODUCT] COLOURWAYS THIS WINTER'],
 'LAYER YOUR LOOK':['LAYER UP, CANADA','LAYER YOUR LOOK FOR -20','LAYER YOUR LOOK WITH [PRODUCT]'],
 'KEEP THINGS COSY':['KEEP THINGS COSY THIS WINTER','COSY SEASON STARTS AT JD CANADA','KEEP THINGS COSY IN [PRODUCT]'],
 'NEVER STOP EXPLORING':['NEVER STOP EXPLORING, CANADA','BUILT FOR A CANADIAN WINTER','NEVER STOP EXPLORING IN [PRODUCT]']};
const HK_AI_FMT={'Teaser / Knock knock':["KNOCK KNOCK... [PRODUCT] AT JD CANADA","WAIT FOR IT... [PRODUCT]","GUESS WHAT JUST LANDED AT JD CANADA"],
 'Callout':['IF YOU NEED A WINTER FIT, THIS IS YOUR SIGN','CALLING ALL [PRODUCT] FANS IN CANADA','YOU NEED THESE BEFORE THE FIRST SNOW'],
 'Question':['WHAT ARE YOU WEARING THIS WINTER?','THIS OR THAT? [PRODUCT] EDITION','WHO ELSE IS COPPING [PRODUCT]?'],
 'POV / Relatable':['POV: YOU FOUND [PRODUCT] AT JD CANADA','POV: THE FIRST SNOW AND YOUR FIT IS READY','ME WHEN THE [PRODUCT] RESTOCK HITS'],
 'Drop / New in alert':['NEW IN AT JD CANADA: [PRODUCT]','JUST LANDED: [PRODUCT]','THE [PRODUCT] IS HERE, CANADA'],
 'Offer / Price first':['UP TO [X]% OFF* AT JD CANADA','[PRICE] [PRODUCT], THIS WEEK ONLY','BLACK FRIDAY STARTS NOW AT JD CANADA'],
 'Product name reveal':['[PRODUCT]','[PRODUCT], ONLY AT JD CANADA','MEET THE [PRODUCT]'],
 'Countdown / Urgency':['LAST CHANCE: [PRODUCT]','ENDS SUNDAY AT JD CANADA','ONLY A FEW SIZES LEFT'],
 'List / How to':['3 WAYS TO STYLE [PRODUCT]','TOP 3 WINTER FITS AT JD CANADA','HOW TO LAYER FOR A CANADIAN WINTER'],
 'Statement / Claim':['BUILT FOR A CANADIAN WINTER','ONLY AT JD CANADA','THE FIT STARTS HERE'],
 'Social proof / Trend':['EVERYONE IN CANADA IS WEARING [PRODUCT]','THE [PRODUCT] EVERYONE IS ASKING ABOUT','SOLD OUT ONCE. BACK AT JD CANADA'],
 'Creator / Talking head':["RIGHT GUYS, I'M AT JD [STORE] AND...","OKAY SO I FOUND [PRODUCT] AT JD","LET ME SHOW YOU MY WINTER PICKS FROM JD"]};
const HK={fmt:'',mkt:'',kind:'',min:0,q:'',sort:'proven',show:60,bym:false};
let HROWS=[];
function hookRows(scope){return ROWS.filter(m=>(scope==='all'||m.mk)&&m.hkind)}
function hkFilter(rows){const t=nz(HK.q);return rows.filter(m=>(!HK.fmt||m.hf===HK.fmt)&&(!HK.mkt||m.mk===HK.mkt)&&(!HK.kind||m.hkind===HK.kind)&&m.d>=(+HK.min||0)&&(!t||nz([m.hk,m.ost,m.hf,m.ht,m.b].join(' ')).includes(t)))}
function hkSort(rows){const f={proven:m=>m.ps*1e4-m.age,newest:m=>-m.age*1e3+m.ps,longest:m=>m.d*1e3+m.ps}[HK.sort];return rows.slice().sort((a,b)=>f(b)-f(a))}
const median=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),k=s.length>>1;return s.length%2?s[k]:(s[k-1]+s[k])/2};
const jdSub=v=>`<div class="cd-seg2" role="tablist" aria-label="JD view"><span class="lbl">JD</span><a role="tab" href="#discover/jd" aria-selected="${v!=='hooks'}" data-jdv="ads">Ads</a><a role="tab" href="#discover/jd/hooks" aria-selected="${v==='hooks'}" data-jdv="hooks">Hooks</a></div>`;
function vHooks(body){
 const all=hookRows('jd');HROWS=all;const mk=[...new Set(all.map(m=>m.mk))].sort();
 const withText=all.filter(m=>m.ost||m.hk).length;const fm={};all.forEach(m=>{const f=m.hf||'Not classified';fm[f]=(fm[f]||0)+1});
 const fmts=Object.entries(fm).sort((a,b)=>b[1]-a[1]);const most=fmts.find(f=>f[0]!=='Visual only')||fmts[0];
 const dates=all.map(m=>m.sd).filter(Boolean).sort();
 head('JD Hooks',`What JD UK, US, Australia, New Zealand and Finish Line put on screen in the first 3 seconds. Hooks read by Claude from each ad's frames${all.some(m=>m.hsrc==='ocr')?' (a few machine read, marked)':''}.`,jdSub('hooks'));
 const tot=all.length||1;
 /* format breakdown: one bar per format (count and share); by market = share within each market */
 const fmtRows=HFMTS.filter(f=>fm[f]).map(f=>[f,fm[f]]);
 const bars=HK.bym?`<div class="cd-hm" role="table" aria-label="Hook format share by market" style="--n:${mk.length}"><div class="cd-hm-r cd-hm-h" role="row"><span role="columnheader">Format</span>${mk.map(k=>`<span role="columnheader">${esc(k.replace('JD ',''))}</span>`).join('')}</div>${fmtRows.map(([f])=>`<button type="button" class="cd-hm-r" role="row" data-hkf="${esc(f)}" aria-pressed="${HK.fmt===f}"><span role="cell">${esc(f)}</span>${mk.map(k=>{const n=all.filter(m=>m.mk===k).length||1,c=all.filter(m=>m.mk===k&&m.hf===f).length,p=c/n*100;return`<span role="cell" class="cd-hm-c" style="--a:${Math.min(1,p/40).toFixed(3)}${p/40>.55?';color:#000':''}" title="${esc(k)}: ${c} of ${n} (${pct1(p)}%)">${pct1(p)}%</span>`}).join('')}</button>`).join('')}</div><p class="cd-muted">Share of each market's hooks. Darker = larger share. Click a row to filter the library.</p>`
  :`<div class="cd-hb cd-hbc">${fmtRows.map(([f,n])=>`<button type="button" class="cd-hb-r" data-hkf="${esc(f)}" aria-pressed="${HK.fmt===f}" title="${esc(f)}: ${n} hooks, ${pct1(n/tot*100)}%"><span class="cd-hb-l">${esc(f)}</span><span class="cd-hb-t"><i style="width:${n/fmtRows[0][1]*100}%"></i></span><b>${fmtN(n)} · ${pct1(n/tot*100)}%</b></button>`).join('')}</div><p class="cd-muted">Click a bar to filter the library below.</p>`;
 const sig=fmtRows.map(([f,n])=>{const r=all.filter(m=>m.hf===f);return[f,n,median(r.map(m=>m.d)),r.reduce((s,m)=>s+m.ps,0)/r.length]});
 /* monthly trend, top 5 formats (small multiples, one yellow series each) */
 const months=[...new Set(all.map(m=>(m.sd||'').slice(0,7)).filter(Boolean))].sort().slice(-12);
 const top5=fmtRows.slice().sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
 const mx=Math.max(1,...top5.flatMap(f=>months.map(mo=>all.filter(m=>m.hf===f&&(m.sd||'').startsWith(mo)).length)));
 const mlab=mo=>new Date(mo+'-15T12:00:00').toLocaleDateString('en-CA',{month:'short'});
 const trend=top5.map(f=>{const v=months.map(mo=>all.filter(m=>m.hf===f&&(m.sd||'').startsWith(mo)).length);
  return`<div class="cd-sm"><div class="cd-sm-h"><b>${esc(f)}</b><small>${fmtN(v[v.length-1]||0)} in ${months.length?mlab(months[months.length-1]):''}</small></div><div class="cd-sm-b">${v.map((x,i)=>`<i style="height:${x/mx*100}%" title="${esc(f)}, ${mlab(months[i])} ${months[i].slice(0,4)}: ${x} hooks"></i>`).join('')}</div><div class="cd-sm-x"><span>${months.length?mlab(months[0]):''}</span><span>${months.length?mlab(months[months.length-1]):''}</span></div></div>`}).join('');
 /* templates: the most reused patterns */
 const tp={};all.forEach(m=>{if(!m.ht)return;const t=tp[m.ht]=tp[m.ht]||{t:m.ht,n:0,mk:new Set(),ex:[],f:m.hf};t.n++;t.mk.add(m.mk);if(t.ex.length<3&&!t.ex.some(e=>e.hk===m.hk))t.ex.push(m)});
 const tps=Object.values(tp).filter(t=>t.n>=2).sort((a,b)=>b.n-a.n||b.mk.size-a.mk.size).slice(0,12);
 const ai=t=>HK_AI[t.t]||HK_AI_FMT[t.f]||HK_AI_FMT['Statement / Claim'];
 body.innerHTML=`<div class="cd-hooks">
  <div class="cd-hstrip">
   <div class="cd-hs"><span class="lbl">Hooks read</span><b>${fmtN(all.length)}</b><small>JD ads, all formats</small></div>
   <div class="cd-hs"><span class="lbl">With on-screen text</span><b>${pct1(withText/tot*100)}%</b><small>${fmtN(withText)} ads</small></div>
   <div class="cd-hs"><span class="lbl">Hook formats</span><b>${fmtRows.length}</b><small>in use</small></div>
   <div class="cd-hs"><span class="lbl">Most used</span><b class="sm">${esc(most?most[0]:'n/a')}</b><small>${most?fmtN(most[1])+' hooks, excluding visual only':''}</small></div>
   <div class="cd-hs"><span class="lbl">Launch dates</span><b class="sm">${dates.length?fmtDate(dates[0])+' to '+fmtDate(dates[dates.length-1]):'n/a'}</b><small>${mk.length} markets</small></div>
  </div>
  <div class="cd-hgrid">
   <section class="cd-panel2"><div class="cd-ph"><div class="lbl">Hook formats · count and share</div><div class="cd-seg" role="group" aria-label="Breakdown"><button type="button" data-hkbym="0" aria-pressed="${!HK.bym}">All</button><button type="button" data-hkbym="1" aria-pressed="${HK.bym}">By market</button></div></div>${bars}</section>
   <section class="cd-panel2"><div class="lbl">Signals per format (not results)</div><div class="cd-tbl" role="table"><div class="cd-tr cd-th" role="row"><span>Format</span><span>Hooks</span><span>Median days live</span><span>Avg Proven</span></div>${sig.map(([f,n,md,ap])=>`<div class="cd-tr" role="row"><span>${esc(f)}</span><span>${fmtN(n)}</span><span>${md==null?'n/a':Math.round(md)}</span><span>${Math.round(ap)}</span></div>`).join('')}</div>
    <p class="cd-muted">Days live and Proven score show how long ads ran, not how they performed. ${esc(PROVEN_TIP)}</p></section>
  </div>
  <section class="cd-panel2"><div class="lbl">Monthly trend · top 5 formats · hooks by launch month</div><div class="cd-sms">${trend}</div></section>
  <section class="cd-panel2"><div class="lbl">Templates · most reused patterns</div><div class="cd-tps">${tps.map(t=>`<div class="cd-tp"><div class="cd-tp-h"><b>${esc(t.t)}</b><span class="cd-mk">${esc(t.f||'')}</span></div><small>${t.n} ads · ${[...t.mk].map(esc).join(', ')}</small>
    <ul class="cd-tp-ex">${t.ex.map(m=>`<li><button type="button" class="cd-tp-a" data-hkopen="${esc(m.id)}">"${esc(m.hk)}"</button> <span>${esc(m.mk)}</span></li>`).join('')}</ul>
    <div class="cd-tp-ai"><span class="lbl">For JD Canada · AI suggestions</span><ul>${ai(t).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`).join('')||'<p class="cd-muted">No template is used twice yet.</p>'}</div>
   <p class="cd-muted">Templates replace brands, products, prices, percentages, dates and numbers with placeholders. AI suggestions are ideas written by Claude from the template, not ads that ran.</p></section>
  <section class="cd-panel2" id="cd-hlib"><div class="cd-ph"><div class="lbl">Hook library</div><div class="cd-hdl"><button type="button" class="cd-btn" data-hkcsv="filtered">Download hooks (CSV)</button><button type="button" class="cd-btn" data-hkcsv="all" title="Every hook read in Creative Discovery, all brands">Download all (CSV)</button></div></div>
   <div class="cd-hf">
    <label class="cd-q">${sv(I.search,14)}<input id="cd-hq" type="search" placeholder="Search hooks" aria-label="Search hooks" value="${esc(HK.q)}" autocomplete="off"></label>
    <label class="cd-sel"><span class="lbl">Format</span><select data-hk="fmt"><option value="">All formats</option>${fmtRows.map(([f,n])=>`<option value="${esc(f)}" ${HK.fmt===f?'selected':''}>${esc(f)} (${n})</option>`).join('')}</select></label>
    <label class="cd-sel"><span class="lbl">Market</span><select data-hk="mkt"><option value="">All markets</option>${mk.map(k=>`<option value="${esc(k)}" ${HK.mkt===k?'selected':''}>${esc(k)}</option>`).join('')}</select></label>
    <label class="cd-sel"><span class="lbl">Kind</span><select data-hk="kind"><option value="">All kinds</option>${Object.entries(HKIND_L).map(([k,l])=>`<option value="${k}" ${HK.kind===k?'selected':''}>${l}</option>`).join('')}</select></label>
    <label class="cd-sel"><span class="lbl">Min days live</span><input type="number" min="0" step="1" data-hk="min" value="${+HK.min||0}" aria-label="Minimum days live"></label>
    <label class="cd-sel"><span class="lbl">Sort</span><select data-hk="sort">${HSORTS.map(([v,l])=>`<option value="${v}" ${HK.sort===v?'selected':''}>${l}</option>`).join('')}</select></label>
   </div><div id="cd-hrows"></div></section></div>`;
 drawHookRows();
 body.onclick=e=>{const t=e.target;
  const f=t.closest('[data-hkf]');if(f){HK.fmt=HK.fmt===f.dataset.hkf?'':f.dataset.hkf;HK.show=60;keepY(()=>vHooks(body));const l=$('#cd-hlib');if(l&&HK.fmt)l.scrollIntoView({block:'start'});return}
  const b=t.closest('[data-hkbym]');if(b){HK.bym=b.dataset.hkbym==='1';keepY(()=>vHooks(body));return}
  const c=t.closest('[data-hkcsv]');if(c){hookCSV(c.dataset.hkcsv);return}
  const o=t.closest('[data-hkopen]');if(o){e.preventDefault();C.lists.hooks=hkList();openViewer(o.dataset.hkopen,'hooks',false,true);return}
  if(t.closest('[data-hkmore]')){HK.show+=60;drawHookRows();return}};
 body.oninput=e=>{const t=e.target;if(t.id==='cd-hq'){HK.q=t.value;HK.show=60;drawHookRows();return}const k=t.dataset.hk;if(k){HK[k]=k==='min'?Math.max(0,+t.value||0):t.value;HK.show=60;drawHookRows()}};
 body.onchange=body.oninput}
function keepY(fn){const y=scrollY;fn();scrollTo(0,y)}
function hkList(){const seen=new Set(),out=[];hkSort(hkFilter(HROWS)).forEach(m=>{const it=BYID[m.id];if(it&&!seen.has(it)){seen.add(it);out.push(it)}});return out}
function drawHookRows(){const el=$('#cd-hrows');if(!el)return;const rows=hkSort(hkFilter(HROWS));const show=rows.slice(0,HK.show);C.lists.hooks=hkList();
 el.innerHTML=`<p class="cd-bcount">${fmtN(rows.length)} hook${rows.length===1?'':'s'}${HK.fmt?' · '+esc(HK.fmt):''}</p>`+(rows.length?`<div class="cd-hl">${show.map(m=>{const r=m.ratio||ratioOf(m.asp)||.8;
  return`<div class="cd-hr" data-id="${esc(m.id)}"><button type="button" class="cd-hr-m" data-hkopen="${esc(m.id)}" aria-label="Open ${esc(m.b)} ad" style="aspect-ratio:${r.toFixed(4)}">${m.thumb?`<img alt="" loading="lazy" src="${esc(m.thumb)}" data-alts="${esc(JSON.stringify(m.alts||[]))}">`:''}</button>
   <div class="cd-hr-t"><button type="button" class="cd-hr-h" data-hkopen="${esc(m.id)}">${m.hk?esc(m.hk):`<span class="hk-none">${m.hkind==='visual'?'Visual hook, no text':'No on-screen text'}</span>`}</button>
    <div class="cd-hr-c"><span class="cd-mk y">${esc(m.hf||'Not classified')}</span><span class="cd-mk">${esc(m.mk)}</span><span>${m.d} days live</span><span>${esc(kindLbl(m.kind))} · ${esc(m.asp)}</span>${m.hsrc==='ocr'?'<em class="cd-mr">machine read</em>':''}</div></div>
   <div class="cd-hr-a"><span class="cd-badge sm${m.proven?'':' lo'}" title="${esc(PROVEN_TIP)}">${m.ps} Proven</span><button type="button" class="cd-save cd-share" data-copy="${esc(m.id)}" aria-label="Copy link" title="Copy link">${sv(I.link,16)}</button></div></div>`}).join('')}</div>
  ${rows.length>show.length?`<div class="cd-more"><button type="button" class="cd-btn" data-hkmore>Show more (${fmtN(rows.length-show.length)} left)</button></div>`:''}`:`<div class="cd-empty">No hooks match these filters.</div>`)}
/* CSV: UTF-8 with BOM, every field quoted */
const HK_COLS=['ad_id','brand','market','launch_date','days_live','format','aspect','hook_text','hook_format','hook_template','onscreen_text','meta_headline','primary_text','landing_url','proven_score','ad_link','ad_library_link'];
function hookCSV(which){const rows=which==='all'?hkSort(hookRows('all')):hkSort(hkFilter(HROWS));
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const base=location.origin+location.pathname+'#discover/ad/';
 const lines=[HK_COLS.join(',')].concat(rows.map(m=>[m.id,m.b,m.mk||MKT_L[m.market]||m.market||'',m.sd||'',m.d,m.kind,m.ar||m.asp,m.hk||'',m.hf||'',m.ht||'',m.ost||'',m.h,m.x,m.l,m.ps,base+m.id,m.lib||''].map(q).join(',')));
 const blob=new Blob(['﻿'+lines.join('\r\n')+'\r\n'],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);
 a.download=`jd-hooks-${which==='all'?'all-brands':'jd'+(HK.fmt?'-'+slug(HK.fmt):'')}-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast(`Downloaded ${fmtN(rows.length)} hooks`)}
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

/* ---------- ad viewer: the batch 1 viewer from /discovery/ ----------
   Phone frame left (Reels, Stories, Feed); Save, Add to board, Reels mode, Landing page; keyboard hints; Proven score;
   Days live / Format / CTA / Offer / Landing; Tags; Hook (first 3 seconds); Key frames; On-screen text.
   Changes against /discovery/: no like or comment numbers anywhere in the phone frame (icons only);
   Hook line = in_ads.hook_text, On-screen text = in_ads.onscreen_text for the variant shown; the Meta headline is shown separately. */
const SBAR='<div class="sb"><span>9:41</span><span class="r"><svg viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5" width="3" height="6" rx="1" fill="#fff"/><rect x="10" y="2.5" width="3" height="8.5" rx="1" fill="#fff"/><rect x="15" y="0" width="3" height="11" rx="1" fill="#fff"/></svg><svg viewBox="0 0 24 11"><rect x=".5" y=".5" width="20" height="10" rx="3" fill="none" stroke="#fff" opacity=".5"/><rect x="2" y="2" width="15" height="7" rx="1.5" fill="#fff"/><rect x="21.5" y="3.5" width="1.5" height="4" rx=".75" fill="#fff" opacity=".5"/></svg></span></div>';
const arCss=b=>({'9:16':'9/16','4:5':'4/5','1:1':'1/1','16:9':'16/9'})[b]||'4/5';
const plFor=(k,pl)=>k==='9:16'?(pl==='stories'?'stories':'reels'):'feed';
const LIKES=new Set();
const vAv=m=>`<span class="av">${esc(initials(m.b))}${m.logo?`<img alt="" src="${esc(m.logo)}" onerror="this.remove()">`:''}</span>`;
function vPh(a,small){return`<div class="cd-shim" aria-hidden="true">${small?'':'<span>Loading creative</span>'}</div>`}
const BUF=`<div class="cd-buf on" id="pv-buf" role="status"><i aria-hidden="true"></i><span>Loading creative</span></div>`;
function vVid(m,{id='',autoplay=false,t=1,still=false}={}){const src=esc(m.video)+'#t='+t;
 return`<video ${id?`id="${id}"`:''} muted playsinline loop preload="metadata" ${(m.poster||m.thumb)?`poster="${esc(m.poster||m.thumb)}"`:''} ${still?'data-still':''} data-valts="${esc(JSON.stringify(m.valts||[]))}" ${autoplay?'autoplay':''} src="${src}"></video>`}
function vMedia(m,opt={}){if(m.kind==='video'&&m.video)return vVid(m,opt);
 if(m.kind==='carousel'&&m.imgs.length>1)return`<div class="car">${m.imgs.map((u,k)=>`<img alt="Card ${k+1}" loading="lazy" src="${esc(u)}">`).join('')}</div><div class="dots">${m.imgs.map((_,k)=>`<i class="${k?'':'on'}"></i>`).join('')}</div>`;
 return`<img alt="" src="${esc(m.thumb||m.imgs[0]||'')}" data-alts="${esc(JSON.stringify(m.alts||[]))}">`}
const capHTML=a=>`<div class="cap" data-cap><b>${esc(a.handle||slug(a.b))}</b> ${esc(a.x||a.h||'')}</div>`;
function igPreview(m,pl){const media=vMedia(m,{id:'pv-video',autoplay:true,t:.1});const av=vAv(m);const cta=esc(m.cta||'Learn more');const handle=esc(m.handle||slug(m.b));
 if(pl==='feed')return`<div class="phone" data-pl="feed">${SBAR}<div class="f-app">
   <div class="f-nav"><span class="wm">Feed</span><span class="r">${I.heart}${I.send}</span></div>
   <div class="f-post"><div class="f-head">${av}<div class="h"><b>${handle}</b><span>Sponsored</span></div>${I.more}</div>
    <div class="f-media ig-media" style="aspect-ratio:${arCss(m.asp==='9:16'?'4:5':m.asp)}">${vPh(m)}${media}${m.kind==='video'?BUF:''}${m.kind==='video'?`<div class="igprog"><i id="pv-prog"></i></div>`:''}</div>
    <div class="f-cta">${cta}${I.chevR}</div>
    <div class="f-acts">${I.heart}${I.comment}${I.send}<span class="sv">${I.bm}</span></div>
    <div class="f-txt">${capHTML(m)}</div></div>
   <div class="f-tabs">${I.homeig}${I.search}${I.reels}${I.shop}${I.user}</div></div></div>`;
 if(pl==='stories')return`<div class="phone" data-pl="stories">${SBAR}<div class="ig-wrap"><div class="ig-media">${vPh(m)}${media}${m.kind==='video'?BUF:''}</div><div class="ig-shade t"></div><div class="ig-shade"></div>
   <div class="s-bars"><i class="done"><b></b></i><i><b id="pv-prog"></b></i><i><b></b></i></div>
   <div class="s-head">${av}<div class="h">${handle}<span>Sponsored</span></div>${I.more}${I.x}</div>
   <div class="s-cta"><span class="up">${I.chevU}</span><span class="lnk">${I.link}${cta}</span></div></div></div>`;
 return`<div class="phone" data-pl="reels">${SBAR}<div class="ig-wrap"><div class="ig-media">${vPh(m)}${media}${m.kind==='video'?BUF:''}</div><div class="ig-shade t"></div><div class="ig-shade"></div>
   ${reelOverlay(m,true)}<div class="igprog"><i id="pv-prog"></i></div></div></div>`}
/* Instagram Reels chrome, icons only (no like, comment or share counts: we have no real engagement data) */
function reelOverlay(a,inPhone){const liked=LIKES.has(a.id),it=BYID[a.id]||a,svd=isSaved(it);const handle=esc(a.handle||slug(a.b));
 return`<div class="r-top" ${inPhone?'':'style="padding-left:60px"'}><b>Reels</b>${I.camera}</div>
 <div class="r-rail">
  <button type="button" class="it" data-like="${esc(a.id)}" aria-label="Like"><span class="${liked?'liked':''}">${liked?I.heartf:I.heart}</span></button>
  <span class="it" aria-label="Comment">${I.comment}</span>
  <span class="it" aria-label="Share">${I.send}</span>
  ${it.src==='ad'?`<button type="button" class="it" data-save="${esc(it.id)}" aria-pressed="${svd}" aria-label="Save">${svd?I.bmf:I.bm}</button>`:`<span class="it">${I.bm}</span>`}
  <span class="it">${I.more}</span>
  <span class="aud">${a.logo?`<img alt="" src="${esc(a.logo)}" onerror="this.remove()">`:''}</span></div>
 <div class="r-bot">
  <div class="r-who">${vAv(a)}<span class="h">${handle}<span>Sponsored</span></span><span class="follow">Follow</span></div>
  ${capHTML(a).replace(`<b>${handle}</b> `,'')}
  <div class="audio">${I.music}<span>${handle} · Original audio</span></div>
  <div class="ctabar">${esc(a.cta||'Learn more')}${I.chevR}</div></div>`}
function toggleLike(id){LIKES.has(id)?LIKES.delete(id):LIKES.add(id);const on=LIKES.has(id);$$(`[data-like="${id}"] span`).forEach(s=>{s.className=on?'liked':'';s.innerHTML=on?I.heartf:I.heart})}
function hookHTML(m){if(m.hk)return esc(m.hk);return`<span class="hk-none">${m.hkind==='visual'?'Visual hook, no text':'Hook not read yet'}</span>`}
function saveBtnViewer(it){const on=isSaved(it);return`<button type="button" class="pill ${on?'on':''}" id="vw-save" data-save="${esc(it.id)}" aria-pressed="${on}">${sv(on?I.bmf:I.bm)} ${on?'Saved':'Save'}</button>`}
function vLayer(id,cls,label){let L=document.getElementById(id);if(!L){L=document.createElement('div');L.id=id;L.className='cd-dv '+cls;L.hidden=true;L.setAttribute('role','dialog');L.setAttribute('aria-modal','true');L.setAttribute('aria-label',label);document.body.appendChild(L);L.addEventListener('click',onLayerClick)}return L}
function onLayerClick(e){const t=e.target;
 const c=t.closest('[data-cap]');if(c){e.stopPropagation();c.classList.toggle('open');return}
 const lk=t.closest('[data-like]');if(lk){e.stopPropagation();toggleLike(lk.dataset.like);return}
 const fb=t.closest('[data-fmt]');if(fb&&C.viewer){e.stopPropagation();viewerFormat(fb.dataset.fmt.split('|')[1]);return}
 const sb=t.closest('[data-save]');if(sb){e.stopPropagation();toggleSave(sb.dataset.save).then(()=>{if(C.viewer){const b=$('#vw-save');const it=BYID[sb.dataset.save];if(b&&it)b.outerHTML=saveBtnViewer(it)}const on=isSaved(BYID[sb.dataset.save]||{members:[]});$$(`.cd-dv [data-save="${sb.dataset.save}"].it`).forEach(x=>{x.setAttribute('aria-pressed',on);x.innerHTML=on?I.bmf:I.bm})});return}
 const bd=t.closest('[data-board]');if(bd){e.stopPropagation();boardDialog(bd.dataset.board);return}
 const cp=t.closest('[data-copy]');if(cp){e.preventDefault();e.stopPropagation();copyLink(cp.dataset.copy);return}
 const rf=t.closest('[data-reelsfrom]');if(rf){const id=rf.dataset.reelsfrom;const list=C.viewer?C.viewer.list:[BYID[id]];closeViewer('nav');openReels(list,id);return}
 const g=t.closest('[data-golib]');if(g){goTag(g.dataset.golib.slice(4));return}
 const bl=t.closest('[data-brandlink]');if(bl){e.preventDefault();closeViewer('nav');location.hash='discover/brands/'+bl.dataset.brandlink;return}
 const op=t.closest('.cd-fr[data-open]');if(op&&C.viewer&&!t.closest('[data-cs]')){openViewer(op.dataset.open,op.dataset.ctx);return}}
function openViewer(id,ctx,fromRoute,exactAd){const it=BYID[id]||(C.trBy&&C.trBy[id]);if(!it)return;hoverOut();[...AP_ON].forEach(apStop);
 const lst=(C.lists[ctx]||[]).includes(it)?C.lists[ctx]:[it];let f=it.src==='ad'?(C.fmt[it.id]||it.def):null;let exact=null;
 if(it.src==='ad'&&(id!==it.id||exactAd||fromRoute)){const mem=it.members.find(m=>m.id===id);if(mem&&(id!==it.id||it.fm[mem.asp]!==mem||exactAd||fromRoute)){f=mem.asp;C.fmt[it.id]=f;exact=mem}}
 const was=C.viewer;const keepFocus=was?was.focus:document.activeElement;
 /* a new history entry when an ad is opened from the page, so Back closes it; inside the viewer the entry is replaced */
 const pushed=was?was.pushed:(!fromRoute&&it.src==='ad');
 C.viewer={it,list:lst,fmt:f,pl:plFor(f||'',null),ctx,focus:keepFocus,exact,pushed};
 if(it.src==='ad'&&!fromRoute&&!was)history.pushState(null,'',hashFor(id));
 const L=vLayer('cd-vw','layer','Ad viewer');L.hidden=false;document.documentElement.style.overflow='hidden';drawViewer();$('[data-x]',L).focus()}
/* mode: 'user' (close button, Esc: Back if the viewer added a history entry), 'nav' (another view opens next), 'route' (the URL already changed) */
function closeViewer(mode){const L=$('#cd-vw');if(!L||L.hidden)return;$$('video',L).forEach(v=>{v.pause();v.removeAttribute('src');v.load()});L.hidden=true;L.innerHTML='';document.documentElement.style.overflow='';
 const V=C.viewer;const f=V&&V.focus;C.viewer=null;
 if(mode!=='route'&&/^#discover[^?]*\/ad\//.test(location.hash)){if(mode==='user'&&V&&V.pushed)history.back();else history.replaceState(null,'',hashFor(null))}
 if(f&&f.isConnected)try{f.focus({preventScroll:true})}catch(e){}apSync()}
function stepViewer(d){const V=C.viewer;const i=V.list.indexOf(V.it);V.it=V.list[(i+d+V.list.length)%V.list.length];V.exact=null;V.fmt=V.it.src==='ad'?(C.fmt[V.it.id]||V.it.def):null;V.pl=plFor(V.fmt||'',V.pl);V.plSet=0;drawViewer()}
function viewerFormat(k){const V=C.viewer;if(!V||V.it.src!=='ad'||!V.it.fm[k])return;V.fmt=k;V.exact=null;V.pl=plFor(k,V.pl);C.fmt[V.it.id]=k;drawViewer(true)}
function viewerPlacement(pl){const V=C.viewer,it=V.it;V.pl=pl;V.plSet=1;
 if(it.src==='ad'){const f0=V.fmt;if(pl==='feed'&&V.fmt==='9:16'){const k=['4:5','1:1','16:9'].find(x=>it.fm[x]);if(k)V.fmt=k}if(pl!=='feed'&&V.fmt!=='9:16'&&it.fm['9:16'])V.fmt='9:16';if(V.fmt!==f0)V.exact=null}drawViewer(true)}
function cycleFormat(){const V=C.viewer,it=V.it;if(it.src!=='ad'||it.nf<2)return;const i=it.fl.indexOf(V.fmt);viewerFormat(it.fl[(i+1)%it.fl.length])}
function miniRow(list,ctx){C.lists[ctx]=list;return`<div class="mini">${list.map(x=>card(x,ctx)).join('')}</div>`}
function drawViewer(keepScroll){const V=C.viewer,it=V.it,L=$('#cd-vw');
 const sc=keepScroll&&L.querySelector('.vw-body')?L.querySelector('.vw-body').scrollTop:0;
 $$('video',L).forEach(v=>{v.pause();v.removeAttribute('src');v.load()});
 const tr=it.src==='tr';const m=tr?it:(V.exact&&V.exact.asp===V.fmt?V.exact:(it.fm[V.fmt]||cur(it)));
 V.mid=tr?null:m.id;if(!tr){const want=hashFor(m.id);if(location.hash!==want)history.replaceState(null,'',want)}
 if(tr&&!V.plSet){const r=parseFloat((document.querySelector(`.cd-fr[data-open="${it.id}"]`)||{dataset:{}}).dataset.nat||0);V.pl=r&&r<.7?'reels':'feed';m.asp=r?(r<.7?'9:16':r<.9?'4:5':r<1.3?'1:1':'16:9'):'4:5'}
 const i=V.list.indexOf(it);
 const plBtns=[['reels','Reels'],['stories','Stories'],['feed','Feed']];
 const top=`<div class="vw-top"><button type="button" class="iconbtn" data-x aria-label="Close viewer (Esc)">${I.x}</button>
   <div class="ttl">${esc(it.b)}<small>${i+1} of ${V.list.length}${!tr&&it.nf>=2?` · ${it.nf} formats`:''}</small></div>
   <button type="button" class="iconbtn" data-prev aria-label="Previous ad">${I.chevL}</button><button type="button" class="iconbtn" data-next aria-label="Next ad">${I.chevR}</button></div>`;
 const stage=`<div class="vw-stage">
   ${!tr&&it.nf>=2?`<div class="fseg big" role="group" aria-label="Format">${it.fl.map(k=>`<button type="button" data-fmt="${esc(it.id)}|${k}" aria-pressed="${k===m.asp}">${k}</button>`).join('')}</div>`:''}
   <div class="seg" role="group" aria-label="Placement">${plBtns.map(([k,l])=>`<button type="button" data-pl="${k}" aria-pressed="${V.pl===k}">${l}${k==='feed'?' '+(m.asp==='9:16'?'4:5':(m.asp||'4:5')):''}</button>`).join('')}</div>
   <div class="placement" id="placement" style="width:100%">${igPreview(m,V.pl)}</div>
   ${m.kind==='video'?`<button type="button" class="pill" id="pv-mute">${sv(I.volOff)} Sound off (M)</button>`:''}</div>`;
 let info;
 if(tr){info=`<div class="vw-info"><div class="meta">${logoHTML(it.b,it.logo,'logo')}<div class="tx"><b>${esc(it.b)}</b><small>Trending · ${esc(TRN[it.cat]||it.cat)}</small></div></div>
   <h2 class="display">#${it.rank} in ${esc(TRN[it.cat]||it.cat)}</h2>
   <div class="kbd"><span><kbd>←</kbd><kbd>→</kbd>Previous, next</span><span><kbd>M</kbd>Mute</span><span><kbd>Esc</kbd>Close</span></div>
   <div class="panel"><dl class="kv"><dt>Rank</dt><dd>#${it.rank} in ${esc(TRN[it.cat]||it.cat)}</dd><dt>Week</dt><dd>${esc(fmtWeek(it.week).replace('Week of ',''))}</dd><dt>Running</dt><dd>${esc(it.age||'Not shown')}</dd><dt>Format</dt><dd>${esc(kindLbl(it.kind).toLowerCase())}</dd><dt>Source</dt><dd>Runneth trending (community saves)</dd></dl></div></div>`}
 else{
  const concept=ADS.filter(x=>x.ck===it.ck&&x!==it).sort((x,y)=>y.ps-x.ps).slice(0,12);
  const same=ADS.filter(x=>x.bid===it.bid&&x!==it&&x.ck!==it.ck).sort((x,y)=>y.ps-x.ps).slice(0,10);
  const like=ADS.filter(x=>x!==it&&x.bid!==it.bid).map(x=>({x,s:x.vf.filter(v=>it.vf.includes(v)).length*3+(x.kind===it.kind?2:0)+(x.g===it.g?1:0)+(x.lp===it.lp?1:0)+(x.market===it.market?1:0)+x.ps/400})).sort((p,q)=>q.s-p.s).slice(0,10).map(p=>p.x);
  const frames=m.kind==='video'?[0.5,1.5,3,5,8,12]:m.kind==='carousel'?m.imgs:[m.thumb];
  info=`<div class="vw-info">
   <div class="meta">${logoHTML(it.b,it.logo,'logo')}<div class="tx"><b>${esc(it.b)}</b><small>${esc(it.g)}${it.market?' · '+esc(it.market):''} · ${it.st==='active'?'Live':'Ended '+fmtDate(m.ed)}${m.pl.length?' · '+esc(m.pl.join(', ')):''}</small></div></div>
   <h2 class="display">${esc(m.h||jdTitle(m))}</h2>
   <div class="actions">${saveBtnViewer(it)}<button type="button" class="pill" data-board="${esc(it.id)}">${sv(I.board)} Add to board</button><button type="button" class="pill" data-reelsfrom="${esc(it.id)}">${sv(I.reels)} Reels mode</button><button type="button" class="pill" id="vw-copy" data-copy="${esc(m.id)}">${sv(I.link)} Copy link</button>${m.l?`<a class="pill ghost" href="${esc(m.l)}" target="_blank" rel="noopener">Landing page ${I.ext}</a>`:''}</div>
   <div class="kbd"><span><kbd>←</kbd><kbd>→</kbd>Previous, next</span>${it.nf>=2?'<span><kbd>F</kbd>Next format</span>':''}<span><kbd>S</kbd>Save</span><span><kbd>B</kbd>Board</span><span><kbd>M</kbd>Mute</span><span><kbd>Esc</kbd>Close</span></div>
   <div class="two">
    <div class="panel"><div class="lbl" style="margin-bottom:8px;display:flex;align-items:center;gap:6px">Proven score ${tipHTML(PROVEN_TIP)}</div>
     <div style="display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap"><span class="display num" style="font-size:56px;color:${m.proven?'var(--jd)':'var(--t1)'}">${m.ps}</span>
     <span style="color:var(--t3);font-size:13px;padding-bottom:6px">${Math.min(m.d,CAP)} days live${m.d>CAP?` (capped, ${m.d} actual)`:''} + ${m.var} variant${m.var>1?'s':''} + ${m.par} parallel launch${m.par===1?'':'es'}</span></div>
     <div style="margin-top:8px;font-size:13px;color:var(--t2)">${m.proven?`Proven: running ${PROVEN_DAYS}+ days.`:`Needs ${PROVEN_DAYS-m.d} more days to count as Proven.`}</div></div>
    <div class="panel"><dl class="kv">
     <dt>Days live</dt><dd class="num">${m.d} (${fmtDate(m.sd)} to ${m.st==='active'?'now':fmtDate(m.ed)})</dd>
     <dt>Format</dt><dd>${m.kind}${m.kind==='carousel'?` · ${m.imgs.length||m.c} cards`:''} · ${esc(m.ar||m.asp)}${m.est?' (estimated)':''}</dd>
     <dt>CTA</dt><dd>${esc(m.cta)}</dd>
     <dt>Offer</dt><dd>${m.of?esc(m.of):'<span style="color:var(--t3)">None detected</span>'}</dd>
     <dt>Landing</dt><dd>${esc(m.lp)}${m.l?` · <a href="${esc(m.l)}" target="_blank" rel="noopener" style="color:var(--jd)">${esc(m.l.replace(/^https?:\/\/(www\.)?/,'').slice(0,48))}</a>`:''}</dd></dl></div></div>
   <div class="panel"><div class="lbl" style="margin-bottom:8px">Tags</div><div class="chiprow">${it.vf.length?it.vf.map(v=>`<button type="button" class="tag y" data-golib="tag:${esc(v)}">${esc(v)}</button>`).join(''):'<span class="tag">Not tagged by Motion</span>'}<span class="tag">${m.kind}</span><span class="tag">${esc(m.lp)}</span>${it.mk?`<span class="tag">${esc(it.mk)}</span>`:''}${it.fl.map(k=>`<span class="tag">${k}</span>`).join('')}</div></div>
   ${m.kind==='video'?`<div class="panel"><div class="lbl" style="margin-bottom:8px">Hook · first 3 seconds</div>
    <div class="tl" id="tl" title="Click to jump"><div class="hook" id="tl-hook" style="width:20%"><span>HOOK</span></div><div class="head" id="tl-head"></div><div class="ticks num" id="tl-ticks"><span>0:00</span><span>&nbsp;</span></div></div>
    <p style="margin:10px 0 0;font-size:14px"><b style="color:var(--jd)">Hook line:</b> ${hookHTML(m)}</p></div>`:''}
   <div class="panel"><div class="lbl" style="margin-bottom:8px">${m.kind==='video'?'Key frames':m.kind==='carousel'?'Cards':'Frame'}</div>
    <div class="frames">${frames.map((f,k)=>m.kind==='video'?`<div class="fr" data-seek="${f}">${vPh(m,1)}${vVid(m,{t:f,still:true})}<span>${fmtDur(f)}</span></div>`:`<div class="fr">${vPh(m,1)}<img alt="" loading="lazy" src="${esc(f)}"><span>${k+1}</span></div>`).join('')}</div></div>
   <div class="panel"><div class="lbl" style="margin-bottom:8px">On-screen text</div><p class="ost" style="margin:0;font-size:14px">${m.ost?esc(m.ost):'<span class="hk-none">Not read yet</span>'}</p>
    ${m.kind!=='video'?`<div class="lbl" style="margin:14px 0 8px">Hook line</div><p style="margin:0;font-size:14px">${hookHTML(m)}</p>`:''}
    <div class="lbl" style="margin:14px 0 8px">Ad headline (Meta)</div><p style="margin:0;font-size:14px">${esc(m.h||'None captured')}</p>
    <div class="lbl" style="margin:14px 0 8px">Ad copy</div><p style="margin:0;font-size:13.5px;color:var(--t2);white-space:pre-line">${esc(m.x||'No primary text')}</p></div>
   ${it.members.length>1?`<div class="panel"><div class="lbl" style="margin-bottom:8px">In this card · ${it.members.length} ads</div><div class="chiprow">${it.members.map(x=>`<span class="tag ${x===m?'y':''}">${esc(x.asp)} · ${x.kind} · ${fmtDate(x.sd)}</span>`).join('')}</div></div>`:''}
   <div class="panel"><div class="sec-h" style="margin-bottom:10px"><div><div class="lbl">Concept variants</div><p style="margin-top:4px">${concept.length?`${concept.length} other ad${concept.length===1?'':'s'} from the same concept (${it.var} in all, ${it.par} launched in parallel).`:'No other ads from this concept yet.'}</p></div><a class="more" href="#discover/brands/${esc(it.bid)}" data-brandlink="${esc(it.bid)}">Brand page</a></div>
    ${concept.length?miniRow(concept,'concept'):''}
    ${same.length?`<div class="lbl" style="margin:14px 0 8px">More from ${esc(it.b)}</div>${miniRow(same,'cluster')}`:''}</div>
   <div class="panel"><div class="lbl" style="margin-bottom:10px">More like this</div>${miniRow(like,'like')}</div></div>`}
 L.innerHTML=`${top}<div class="vw-body"><div class="vw-grid">${stage}${info}</div></div>`;
 L.querySelector('[data-x]').onclick=()=>closeViewer('user');L.querySelector('[data-prev]').onclick=()=>stepViewer(-1);L.querySelector('[data-next]').onclick=()=>stepViewer(1);
 $$('button[data-pl]',L).forEach(b=>b.onclick=()=>viewerPlacement(b.dataset.pl));
 const pm=$('#pv-mute');if(pm)pm.onclick=togglePreviewMute;
 const tl=$('#tl');if(tl)tl.onclick=e=>{const v=$('#pv-video');if(!v||!v.duration)return;const r=tl.getBoundingClientRect();v.currentTime=(e.clientX-r.left)/r.width*v.duration};
 $$('[data-seek]',L).forEach(f=>f.onclick=()=>{const v=$('#pv-video');if(v){v.currentTime=+f.dataset.seek;v.play().catch(()=>{})}});
 const pv=$('#pv-video');if(pv){pv.muted=true;const p=pv.play();if(p)p.catch(()=>{})}
 L.querySelector('.vw-body').scrollTop=sc}
function onPreviewMeta(v){const d=v.duration;if(!isFinite(d))return;const h=$('#tl-hook');if(h)h.style.width=Math.min(100,3/d*100)+'%';const t=$('#tl-ticks');if(t)t.innerHTML=`<span>0:00</span><span>${fmtDur(d/2)}</span><span>${fmtDur(d)}</span>`}
function togglePreviewMute(){const v=$('#pv-video');if(!v)return;v.muted=!v.muted;if(!v.muted)v.play().catch(()=>{});const pm=$('#pv-mute');if(pm)pm.innerHTML=sv(v.muted?I.volOff:I.volOn)+(v.muted?' Sound off (M)':' Sound on (M)')}
document.addEventListener('loadedmetadata',e=>{const v=e.target;if(v instanceof HTMLVideoElement&&v.id==='pv-video')onPreviewMeta(v)},true);
['playing','canplay','waiting','stalled'].forEach(t=>document.addEventListener(t,e=>{const v=e.target;if(!(v instanceof HTMLVideoElement)||v.id!=='pv-video')return;const b=$('#pv-buf');if(b)b.classList.toggle('on',t==='waiting'||t==='stalled')},true));
document.addEventListener('timeupdate',e=>{const v=e.target;if(!(v instanceof HTMLVideoElement)||!v.duration)return;const pct=(v.currentTime/v.duration*100)+'%';
 if(v.id==='pv-video'){const h=$('#tl-head');if(h)h.style.left=pct;const ip=$('#pv-prog');if(ip)ip.style.width=pct}
 const fr=v.closest('.cd-dv .frame');if(fr){const f=fr.querySelector('.igprog i');if(f)f.style.width=pct}},true);
document.addEventListener('scroll',e=>{const c=e.target;if(!(c instanceof Element)||!c.classList.contains('car')||!c.closest('.cd-dv'))return;const i=Math.round(c.scrollLeft/c.clientWidth);c.parentElement.querySelectorAll('.dots i').forEach((d,k)=>d.classList.toggle('on',k===i))},true);
document.addEventListener('loadeddata',e=>{const el=e.target;if(el instanceof HTMLVideoElement)el.closest('.cd-dv .ig-media,.cd-dv .f-media,.cd-dv .fr')?.classList.add('loaded')},true);
document.addEventListener('load',e=>{const el=e.target;if(el instanceof HTMLImageElement)el.closest('.cd-dv .ig-media,.cd-dv .f-media,.cd-dv .fr')?.classList.add('loaded')},true);

/* ---------- Reels mode (from /discovery/): full-screen vertical feed like Instagram, icons only ---------- */
let reelSoundOn=false,reelIO=null,reelLazy=null;
function openReels(list,startId){list=(list&&list.length?list:ADS.filter(a=>a.fm['9:16']).sort((a,b)=>(b.fm['9:16'].kind==='video')-(a.fm['9:16'].kind==='video')||b.ps-a.ps)).filter(x=>x&&x.src==='ad').slice(0,400);
 if(!list.length)return;const R=vLayer('cd-reels','reels','Reels mode');R.hidden=false;document.documentElement.style.overflow='hidden';[...AP_ON].forEach(apStop);hoverOut();
 R.innerHTML=`<button type="button" class="reels-x" id="reelsX" aria-label="Close Reels (Esc)">${I.back}</button>
 <div class="reels-nav"><button type="button" id="rUp" aria-label="Previous reel">${I.chevU}</button><button type="button" id="rDn" aria-label="Next reel">${I.chevD}</button></div>
 <div class="reels-scroll" id="rs">${list.map(it=>{const a=it.fm['9:16']||cur(it);return`<section class="reel" data-rid="${esc(it.id)}"><div class="frame">
  <div class="ig-media" data-tap>${vPh(a)}${a.kind==='video'?`<video muted playsinline loop preload="none" ${a.poster?`poster="${esc(a.poster)}"`:''} data-rsrc="${esc(a.video)}#t=0.1"></video>`:a.kind==='carousel'?vMedia(a):`<img alt="" loading="lazy" src="${esc(a.thumb||a.imgs[0]||'')}">`}</div>
  <div class="ig-shade t"></div><div class="ig-shade"></div>${reelOverlay(a,false)}<div class="snd" aria-hidden="true">${I.volOff}</div>${a.kind==='video'?'<div class="igprog"><i></i></div>':''}</div></section>`}).join('')}</div>`;
 const rs=$('#rs');
 reelLazy=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target;if(e.isIntersecting){if(!v.getAttribute('src')){v.src=v.dataset.rsrc;v.preload='metadata'}}else if(v.getAttribute('src')){v.pause();v.removeAttribute('src');v.load()}}),{root:rs,rootMargin:'150% 0px'});
 reelIO=new IntersectionObserver(es=>es.forEach(e=>{const v=e.target;if(e.isIntersecting&&e.intersectionRatio>.6){if(!v.getAttribute('src'))v.src=v.dataset.rsrc;v.muted=!reelSoundOn;v.currentTime=0;v.play().catch(()=>{v.muted=true;v.play().catch(()=>{})})}else v.pause()}),{root:rs,threshold:[0,.6]});
 $$('video[data-rsrc]',rs).forEach(v=>{reelLazy.observe(v);reelIO.observe(v)});
 $('#reelsX').onclick=()=>closeReels();$('#rUp').onclick=()=>reelStep(-1);$('#rDn').onclick=()=>reelStep(1);
 let lastTap=0;rs.addEventListener('click',e=>{const m=e.target.closest('[data-tap]');if(!m)return;const now=Date.now();
  if(now-lastTap<300){const id=m.closest('.reel').dataset.rid;if(!LIKES.has(id))toggleLike(id);const h=document.createElement('div');h.className='heartpop';h.innerHTML=I.heartf;m.parentElement.appendChild(h);setTimeout(()=>h.remove(),750);lastTap=0;return}
  lastTap=now;setTimeout(()=>{if(lastTap===now)reelSound(m.closest('.frame'))},280)});
 if(startId){const sid=BYID[startId]?BYID[startId].id:startId;const el=rs.querySelector(`[data-rid="${sid}"]`);if(el)rs.scrollTop=el.offsetTop}
 $('#reelsX').focus()}
function reelSound(frame){reelSoundOn=!reelSoundOn;$$('#rs video').forEach(v=>v.muted=!reelSoundOn);const c=frame||$(`#rs [data-rid="${currentReel()}"] .frame`);const v=c&&c.querySelector('video');if(v&&reelSoundOn)v.play().catch(()=>{});
 if(c){const s=c.querySelector('.snd');s.innerHTML=reelSoundOn?I.volOn:I.volOff;s.classList.add('show');clearTimeout(s._t);s._t=setTimeout(()=>s.classList.remove('show'),700)}}
function currentReel(){const rs=$('#rs');if(!rs)return null;const i=Math.round(rs.scrollTop/rs.clientHeight);const el=rs.children[i];return el&&el.dataset.rid}
function reelStep(d){const rs=$('#rs');rs.scrollBy({top:d*rs.clientHeight,behavior:'smooth'})}
function closeReels(){const R=$('#cd-reels');if(!R||R.hidden)return;if(reelIO)reelIO.disconnect();if(reelLazy)reelLazy.disconnect();$$('video',R).forEach(v=>{v.pause();v.removeAttribute('src');v.load()});R.hidden=true;R.innerHTML='';document.documentElement.style.overflow='';apSync()}

/* keyboard (same keys as /discovery/) */
document.addEventListener('keydown',e=>{if(e.target.matches&&e.target.matches('input,textarea,select'))return;if(e.metaKey||e.ctrlKey||e.altKey)return;
 if($('#cd-dlg')&&$('#cd-dlg').innerHTML){if(e.key==='Escape')$('#cd-dlg').innerHTML='';return}
 const R=$('#cd-reels');if(R&&!R.hidden){const k=e.key.toLowerCase();if(k==='escape')closeReels();else if(k==='arrowdown'||k==='arrowright'||k==='j'){e.preventDefault();reelStep(1)}else if(k==='arrowup'||k==='arrowleft'||k==='k'){e.preventDefault();reelStep(-1)}else if(k==='m')reelSound();else if(k==='s'){const a=currentReel();if(a)toggleSave(a)}return}
 if(!C.viewer)return;const k=e.key.toLowerCase();const ad=C.viewer.it.src==='ad';
 if(k==='escape')closeViewer('user');
 else if(k==='arrowright'||k==='arrowdown'||k==='j'){e.preventDefault();stepViewer(1)}
 else if(k==='arrowleft'||k==='arrowup'||k==='k'){e.preventDefault();stepViewer(-1)}
 else if(k==='s'&&ad)toggleSave(C.viewer.it.id).then(()=>{const b=$('#vw-save');if(b&&C.viewer)b.outerHTML=saveBtnViewer(C.viewer.it)});
 else if(k==='b'&&ad)boardDialog(C.viewer.it.id);
 else if(k==='m')togglePreviewMute();
 else if(k==='f')cycleFormat();
 else if(k==='1'||k==='2'||k==='3')viewerPlacement(['reels','stories','feed'][+k-1])});

/* ---------- boot, routing and Briefing Room integration ---------- */
async function start(){if(C.started)return;C.started=true;draw();
 const tr=loadTrending().then(rows=>{TR=rows.map(normTr);C.week=C.week||(TR[0]&&TR[0].week)||null;C.trBy=Object.fromEntries(TR.map(t=>[t.id,t]));C.tr=true;if(C.ready){counts();if(C.tab==='trending')draw()}}).catch(e=>{C.trErr=e.message;if(C.tab==='trending')draw()});
 const pf=loadProfiles();
 try{const[rows]=await Promise.all([loadAds(),loadSaves()]);buildData(rows);C.ready=true}catch(e){C.err=e.message}
 pf.then(()=>{if(C.ready){buildNames();counts();if(C.tab==='brands')draw()}});
 draw();if(C.ready){counts();openPending()}await tr.catch(()=>{})}
const TAB_CTX={discover:'discover',jd:'jd',brands:'brand',boards:'board',trending:'trending'};
function openPending(){const id=C.pendingAd;if(!id||!C.ready)return;C.pendingAd=null;
 if(!BYID[id]){toast("That ad isn't in Creative Discovery yet");history.replaceState(null,'',hashFor(null));return}
 if(C.viewer&&C.viewer.mid===id)return;openViewer(id,C.tab==='brands'&&!C.brand?'discover':C.tab==='jd'&&C.jdv==='hooks'?'hooks':TAB_CTX[C.tab]||'discover',true)}
function routeCD(h){const raw=location.hash.slice(1),rq=raw.indexOf('?');const qi=h.indexOf('?');let path=qi<0?h:h.slice(0,qi);
 const am=/^(?:(.*)\/)?ad\/([^/]+)$/.exec(path);const adId=am?am[2]:null;if(am)path=am[1]||'discover';
 /* only the ad part changed (an ad opened or closed, Back or Forward): keep the grid and its scroll position */
 if(C.started&&path===CD_PATH&&(rq<0?'':raw.slice(rq+1))===fToQS(C.f)&&host()&&host().dataset.built){
  if(adId){if(!C.viewer||C.viewer.mid!==adId){C.pendingAd=adId;openPending()}}else if(C.viewer)closeViewer('route');return}
 C.pendingAd=adId;if(C.viewer)closeViewer('route');
 if(rq>=0){const r=fFromQS(raw.slice(rq+1));C.f=r.F;C.q=r.q;const qe=$('#cd-q');if(qe)qe.value=C.q;fSave()}CD_PATH=path;const p=path.split('/');C.tab=TABS.some(t=>t[0]===p[1])?p[1]:'discover';C.brand=C.tab==='brands'&&p[2]?p[2]:null;C.jdv=C.tab==='jd'&&p[2]==='hooks'?'hooks':'ads';if(C.tab==='boards'&&p[2])C.board=p[2];
 closeFilters();window.scrollTo({top:0});start();draw();openPending()}
function inject(){const row=document.querySelector('.proj .wrap');
 if(!document.getElementById('t-cd')){const g=document.createElement('span');g.className='tr-top';g.innerHTML='<span class="lbl">Always on</span><button type="button" class="pj tr-pj" id="t-cd"><i class="cd-dot"></i>Creative Discovery <i>Discover · JD · Trending</i></button>';row.appendChild(g);g.querySelector('button').onclick=()=>location.hash='discover'}
 if(!document.getElementById('v-cd')){const s=document.createElement('section');s.id='v-cd';s.hidden=true;document.querySelector('main').appendChild(s)}}
const isCD=h0=>{const h=h0.split('?')[0];return h==='discover'||h.startsWith('discover/')||h==='trending'||h==='inspo'||h.startsWith('inspo/')||h.startsWith('ad/')};
function hook(){const _show=window.show;window.show=function(tab){const v=document.getElementById('v-cd'),t=document.getElementById('t-cd');const bar=document.querySelector('nav.bar'),pj=document.querySelector('.proj .pj.on:not(#t-cd), .proj .pj.was');
  if(tab==='cd'){document.querySelectorAll('main > section').forEach(x=>x.hidden=true);document.querySelectorAll('nav.bar [data-tab]').forEach(x=>x.setAttribute('aria-pressed',false));v.hidden=false;t.classList.add('on');t.setAttribute('aria-current','true');if(pj){pj.classList.remove('on');pj.classList.add('was')}if(bar)bar.hidden=true;return}
  hoverOut();closeViewer('route');apReset();v.hidden=true;t.classList.remove('on');t.removeAttribute('aria-current');if(pj){pj.classList.add('on');pj.classList.remove('was')}if(bar)bar.hidden=false;return _show(tab)};
 const _route=window.route;window.route=function(){const h=decodeURIComponent(location.hash.slice(1));
  if(isCD(h)){document.getElementById('drawer').hidden=true;document.getElementById('scrim').hidden=true;
   if(h.startsWith('ad/')){history.replaceState(null,'','#discover/'+h);return window.route()}
   if(h==='trending'||h==='inspo'||h.startsWith('inspo/')){history.replaceState(null,'','#discover'+(h==='trending'?'/trending':''));return window.route()}
   window.show('cd');routeCD(h);return}
  return _route()};
 window.removeEventListener('hashchange',_route);window.addEventListener('hashchange',window.route)}
const wait=setInterval(()=>{if(typeof D==='undefined'||!D||!window.show||!document.getElementById('t-project')||!document.getElementById('t-delivered'))return;clearInterval(wait);inject();hook();if(isCD(decodeURIComponent(location.hash.slice(1))))window.route()},60);
window.CD={C,open:(id)=>openViewer(id,'discover'),shareURL,get AP(){return AP},get ADS(){return ADS},get ROWS(){return ROWS},get TR(){return TR}};
})();

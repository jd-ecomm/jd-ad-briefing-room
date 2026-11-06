/* JD Ad Briefing Room · Discover Ads › Inspo
   Apparel & footwear ad inspiration pulled from Motion's Inspo library (tools/inspo-pull.js) and stored in Supabase in_ads,
   media copied into the "inspo" bucket (tools/inspo-store.js). Favourites (in_favs) and Boards (in_boards / in_board_items) are team-shared. */
(()=>{
const SB='https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/',K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const H={apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json'};
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const me=()=>{try{return JSON.parse(localStorage.getItem('jd-email')||'""')}catch(e){return''}};
const api=async(p,o={})=>{const r=await fetch(SB+p,{...o,headers:{...H,...(o.headers||{})}});if(!r.ok)throw new Error(r.status+' '+(await r.text()).slice(0,160));const t=await r.text();return t?JSON.parse(t):null};

/* Visual format groups. Motion tags each ad with one or more visual formats; these groups are the ones that matter for apparel and footwear. */
const VG=[
 ['Try-On',['Try-On'],'Someone putting the product on, fit and movement on body'],
 ['UGC',['UGC Selfie','UGC Overlay','Review','Testimonial','Unboxing','POV','Duet','Stitch','Reaction Video','Comment Response','Greenscreen','Influencer Endorsement'],'Any creator or customer-shot content'],
 ['Yapper',['Yapper'],'Talking to camera, opinion-led'],
 ['DITL',['Vlog'],'Day in the life: vlog-style, or copy that says day in the life'],
 ['Street Interview',['Street Interview'],'Vox-pop questions on the street'],
 ['Native Search',['Native Search'],'Looks like a search bar or results page'],
 ['Text Overlay',['Text Overlay','Headline','Unconventional Text Placement'],'The message carried by on-image text'],
 ['Product',['Product Image','Studio Shot','Flatlay','Feature Benefit Pointout','Demo'],'Product-led stills and feature callouts'],
 ['Model & Lifestyle',['Model Shot','Lifestyle Image','Editorial','Cinematic B-Roll'],'On-model, campaign and lifestyle imagery'],
 ['Us vs Them',['Us Vs Them'],'Side-by-side comparison with the alternative'],
 ['Montage & Grid',['Grid Swap','Collage','Split Screen','Slideshow','Montage'],'Multiple products or looks in one frame'],
 ['Before & After',['Before and After','Transformation'],'Outfit or fit transformations'],
 ['Celebrity & Athlete',['Celebrity'],'Famous faces and athletes'],
 ['Offer-First',['Offer-First Banner'],'Sale or offer leads the creative'],
 ['Founder & BTS',['Founder','Behind The Scenes'],'Brand story, making-of'],
 ['Lo-fi & Native',['Pattern Interrupt','Notes App','Text Message','Social Comments','Social Media Mockup','Meme','Trend','Skit','Humor'],'Feels like a post, not an ad'],
 ['Craft & Motion',['Stop Motion','ASMR','Animation','Static To Video Hybrid','Time Lapse'],'Stop motion, ASMR, animated statics']];
const VGM={};VG.forEach(([g,tags])=>tags.forEach(t=>(VGM[t]=VGM[t]||[]).push(g)));
const groupsOf=a=>{const s=new Set();(a.visual_formats||[]).forEach(t=>(VGM[t]||[]).forEach(g=>s.add(g)));if(/day in (the|my) life|\bditl\b/i.test((a.copy||'')+' '+(a.headline||'')))s.add('DITL');return [...s]};
const BGO=['JD Global','Brand','Competitor','DTC Fashion','Category finds'];
const TYPES=[['video','Video'],['image','Image'],['carousel','Carousel']];
const LIVE=[['7','Last 7 days',7],['30','Last 30 days',30],['90','Last 90 days',90],['365','Last 12 months',365]];
const RUN=[['u7','Under 7 days',0,7],['7','7 to 30 days',7,30],['30','30 to 90 days',30,90],['90','90+ days (proven)',90,1e9]];
const SORTS=[['new','Newest'],['run','Longest running'],['team','Most saved by the team'],['motion','Motion trending']];

const I={rows:null,err:null,favs:new Set(),allFavs:{},boards:[],items:[],f:{vg:new Set(),type:new Set(),brand:new Set(),grp:new Set(),status:new Set(),live:'',run:new Set(),aspect:new Set()},q:'',sort:'new',show:60,view:'all',board:null,slide:{},openBrands:{}};
const fd=d=>d?new Date(d+'T12:00').toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'}):'';
const days=a=>a.days_live??null;
const ago=d=>d?Math.round((Date.now()-new Date(d+'T12:00'))/864e5):1e9;
const asp=a=>{const m=String(a.aspect||'').match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);if(!m)return 'Unknown';const r=m[1]/m[2];return r<.66?'9:16':r<.9?'4:5':r<1.15?'1:1':r>1.5?'16:9':'Other'};
const thumb=a=>a.thumb_s||a.poster||(a.images_s||[])[0]||(a.images||[])[0]||'';
const imgs=a=>(a.images_s&&a.images_s.length?a.images_s:a.images)||[];

async function load(){
 try{let all=[],from=0;const cols='id,brand,brand_group,logo,logo_s,status,start_date,end_date,days_live,format,visual_formats,aspect,platforms,cards,headline,copy,cta,landing,video,poster,images,thumb_s,images_s,ad_library,saves,variants';
  for(;;){const r=await fetch(SB+'in_ads?select='+cols+'&order=start_date.desc.nullslast',{headers:{...H,Range:from+'-'+(from+999)}});if(!r.ok)throw new Error(r.status);const j=await r.json();all=all.concat(j);if(j.length<1000)break;from+=1000}
  all.forEach(a=>{a.vg=groupsOf(a);a.logo=a.logo_s||a.logo});I.rows=all}catch(e){I.err=e.message;I.rows=[]}
 await loadSaves();render()}
async function loadSaves(){try{const f=await api('in_favs?select=email,ad_id');I.allFavs={};I.favs=new Set();f.forEach(x=>{I.allFavs[x.ad_id]=(I.allFavs[x.ad_id]||0)+1;if(x.email===me())I.favs.add(x.ad_id)});
  I.boards=await api('in_boards?select=id,name,note,created_by,created_at&order=created_at.asc');I.items=await api('in_board_items?select=board_id,ad_id,src,added_by,created_at&order=created_at.desc')}catch(e){I.saveErr=e.message}}
const inBoard=(bid,id)=>I.items.some(x=>x.board_id===bid&&x.ad_id===id);
const boardsOf=id=>I.items.filter(x=>x.ad_id===id).map(x=>x.board_id);

async function toggleFav(id){const m=me();if(!m)return toast('Enter your JD email first');
 if(I.favs.has(id)){I.favs.delete(id);I.allFavs[id]--;try{await api('in_favs?email=eq.'+encodeURIComponent(m)+'&ad_id=eq.'+id,{method:'DELETE'})}catch(e){toast('Could not remove: '+e.message)}}
 else{I.favs.add(id);I.allFavs[id]=(I.allFavs[id]||0)+1;try{await api('in_favs',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({email:m,ad_id:id})})}catch(e){toast('Could not save: '+e.message)}}
 render()}
async function addBoard(name){const m=me();const r=await api('in_boards',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name,created_by:m})});I.boards.push(r[0]);return r[0]}
async function toggleBoard(bid,id){const m=me();if(inBoard(bid,id)){I.items=I.items.filter(x=>!(x.board_id===bid&&x.ad_id===id));await api('in_board_items?board_id=eq.'+bid+'&ad_id=eq.'+id,{method:'DELETE'})}
 else{const it={board_id:bid,ad_id:id,src:'inspo',added_by:m};I.items.unshift({...it,created_at:new Date().toISOString()});await api('in_board_items',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(it)})}}
async function delBoard(bid){I.boards=I.boards.filter(b=>b.id!==bid);I.items=I.items.filter(x=>x.board_id!==bid);if(I.board===bid){I.board=null;I.view='all'}await api('in_boards?id=eq.'+bid,{method:'DELETE'})}
function toast(t){let el=document.getElementById('toast');if(!el)return;el.textContent=t;el.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>el.hidden=true,1800)}

/* ---------- filtering ---------- */
const FAC=[['vg','Visual format',a=>a.vg],['type','Type',a=>[a.format]],['grp','Brand group',a=>[a.brand_group||'Category finds']],['brand','Brand',a=>[a.brand]],['status','Status',a=>[a.status==='active'?'Running now':'Ended']],['run','Running time',a=>{const d=days(a);return d==null?[]:RUN.filter(r=>d>=r[2]&&d<r[3]).map(r=>r[0])}],['aspect','Aspect ratio',a=>[asp(a)]]];
function base(){let L=I.rows||[];
 if(I.view==='favs')L=L.filter(a=>I.favs.has(a.id));
 if(I.view==='board'&&I.board!=null){const ids=new Set(I.items.filter(x=>x.board_id===I.board).map(x=>x.ad_id));L=L.filter(a=>ids.has(a.id))}
 if(I.q){const q=I.q;L=L.filter(a=>[a.brand,a.headline,a.copy,a.cta,a.landing,...(a.visual_formats||[]),...a.vg,a.format].join(' ').toLowerCase().includes(q))}
 if(I.f.live){const n=+I.f.live;L=L.filter(a=>ago(a.start_date)<=n)}
 return L}
function apply(L,skip){for(const [k,,fn] of FAC){if(k===skip)continue;const s=I.f[k];if(s.size)L=L.filter(a=>fn(a).some(v=>s.has(v)))}return L}
function sorted(L){const by={new:(a,b)=>(b.start_date||'').localeCompare(a.start_date||''),run:(a,b)=>(days(b)||0)-(days(a)||0),team:(a,b)=>((I.allFavs[b.id]||0)+boardsOf(b.id).length)-((I.allFavs[a.id]||0)+boardsOf(a.id).length)||(b.start_date||'').localeCompare(a.start_date||''),motion:(a,b)=>(b.saves||0)-(a.saves||0)};return L.slice().sort(by[I.sort])}

/* ---------- render ---------- */
function render(){const el=document.getElementById('v-inspo');if(!el||el.hidden)return;
 if(!I.rows){el.innerHTML='<div class="tr"><div class="note">Loading inspo…</div></div>';return}
 const B=base(),L=sorted(apply(B));const all=I.rows;
 const brandsN=new Set(all.map(a=>a.brand)).size,vids=all.filter(a=>a.format==='video').length,fresh=all.filter(a=>ago(a.start_date)<=7).length;
 const k=(l,n,s)=>`<div class="bb-kpi"><span class="lbl">${l}</span><b>${n}</b>${s?`<small>${s}</small>`:''}</div>`;
 const bd=I.view==='board'?I.boards.find(b=>b.id===I.board):null;
 el.innerHTML=`<div class="tr in">${window.discoverTabs?window.discoverTabs('inspo'):''}
 <div class="tr-head"><div><span class="lbl" style="color:var(--y)"><i class="dv-dot"></i> Apparel &amp; footwear · Motion Inspo</span><h2 class="disp">Inspo</h2>
  <p>Ads from the brands in the Black Friday library (JD, our brand partners, competitors and DTC fashion) plus the strongest apparel and footwear ads by visual format. Every ad is tagged with its visual format, type, brand and when it went live, and copied into the Briefing Room. Star the ones you like and add them to a board.</p></div></div>
 ${I.err?`<div class="bb-warn"><b>Can't load inspo here.</b> This copy can't reach the team database. Open the team site: jd-ecomm.github.io/jd-ad-briefing-room/#inspo</div>`:''}
 <div class="bb-kpis">${k('Ads',all.length.toLocaleString('en-CA'),brandsN+' brands')}${k('▶ Video',Math.round(vids/Math.max(1,all.length)*100)+'%',vids.toLocaleString('en-CA')+' video ads')}${k('New this week',fresh,'went live in the last 7 days')}${k('Your favourites',I.favs.size,I.boards.length+' team board'+(I.boards.length===1?'':'s'))}</div>
 <div class="in-views row">
  <button class="pill" data-view="all" aria-pressed="${I.view==='all'}">All inspo</button>
  <button class="pill" data-view="favs" aria-pressed="${I.view==='favs'}">★ My favourites <span class="cnt">${I.favs.size}</span></button>
  <span class="lbl" style="margin-left:8px">Boards</span>
  ${I.boards.map(b=>`<button class="pill" data-board="${b.id}" aria-pressed="${I.view==='board'&&I.board===b.id}">${E(b.name)} <span class="cnt">${I.items.filter(x=>x.board_id===b.id).length}</span></button>`).join('')}
  <button class="pill in-newb" data-newb>+ New board</button></div>
 ${bd?`<div class="in-bhead"><div><span class="lbl">Board</span><h3 class="disp">${E(bd.name)}</h3><span class="cnt">Created by ${E(bd.created_by||'the team')} · ${fd((bd.created_at||'').slice(0,10))} · shared with everyone in the Briefing Room</span></div><div class="row"><button class="btn g" data-copyb="${bd.id}">Copy board link</button><button class="btn g" data-delb="${bd.id}">Delete board</button></div></div>`:''}
 <div class="lib in-lib"><aside class="rail" aria-label="Inspo filters">
  <div class="fg"><h4 class="lbl">Search</h4><input id="in-q" type="search" placeholder="Brand, copy, format…" value="${E(I.q)}" class="in-q" aria-label="Search inspo"></div>
  <div class="fg"><h4 class="lbl">Sort</h4><div class="chips">${SORTS.map(([id,n])=>`<button class="chip ${I.sort===id?'on':''}" data-sort="${id}">${n}</button>`).join('')}</div></div>
  <div class="fg"><h4 class="lbl">Went live</h4><div class="chips"><button class="chip ${I.f.live===''?'on':''}" data-live="">Any time</button>${LIVE.map(([id,n])=>`<button class="chip ${I.f.live===id?'on':''}" data-live="${id}">${n}</button>`).join('')}</div></div>
  ${FAC.map(([key,t,fn])=>{const P=apply(B,key);const c={};P.forEach(a=>fn(a).forEach(v=>c[v]=(c[v]||0)+1));
   let keys=key==='vg'?VG.map(g=>g[0]):key==='type'?TYPES.map(x=>x[0]):key==='run'?RUN.map(x=>x[0]):key==='grp'?BGO:Object.keys(c).sort((a,b)=>c[b]-c[a]);
   keys=keys.filter(v=>c[v]||I.f[key].has(v));if(!keys.length)return'';
   const lab=v=>key==='type'?(TYPES.find(x=>x[0]===v)||[,v])[1]:key==='run'?RUN.find(x=>x[0]===v)[1]:v;
   const tip=v=>key==='vg'?` title="${E((VG.find(g=>g[0]===v)||[])[2]||'')}"`:'';
   const more=key==='brand'&&keys.length>14&&!I.openBrands.all;const shown=more?keys.slice(0,14):keys;
   return `<div class="fg"><h4 class="lbl">${t}${I.f[key].size?` <button class="in-clr" data-clr="${key}">clear</button>`:''}</h4><div class="chips">${shown.map(v=>`<button class="chip ${I.f[key].has(v)?'on':''}" data-k="${key}" data-v="${E(v)}"${tip(v)}>${E(lab(v))}<small>${c[v]||0}</small></button>`).join('')}${more?`<button class="chip" data-morebrands>+ ${keys.length-14} more</button>`:''}</div></div>`}).join('')}
 </aside><div style="min-width:0">
  <div class="summary"><span class="n">${L.length.toLocaleString('en-CA')}</span><span class="lbl">${L.length===1?'ad':'ads'}</span><span class="cnt">${L.filter(a=>a.format==='video').length} video · ${L.filter(a=>a.format==='image').length} image · ${L.filter(a=>a.format==='carousel').length} carousel</span><span class="sp"></span><button class="pill" data-reset>Clear filters</button></div>
  <div class="in-grid">${L.slice(0,I.show).map(card).join('')||`<div class="bb-empty">${I.view==='favs'?'No favourites yet. Tap ☆ on any ad to save it here.':I.view==='board'?'This board is empty. Use “+ Board” on any ad to add it.':'No ads match these filters.'}</div>`}</div>
  ${L.length>I.show?`<div style="text-align:center;margin-top:16px"><button class="btn y" data-more>Show ${Math.min(60,L.length-I.show)} more</button> <span class="cnt">${I.show} of ${L.length.toLocaleString('en-CA')}</span></div>`:''}
 </div></div>
 <p class="cnt">Source: Motion Inspo (Meta Ad Library), apparel and footwear. “Went live” is the ad's start date; “running time” is how long it ran (or has run so far). Visual formats are Motion's tags, grouped; hover a format for what it covers. Videos stream from Motion's copy; images are stored in the Briefing Room.</p></div>`;
 bind(el,L)}
function card(a){const im=imgs(a);const s=I.slide[a.id]||0;const fav=I.favs.has(a.id);const nb=boardsOf(a.id).length;const team=(I.allFavs[a.id]||0);
 const media=a.format==='video'&&a.video?`<img loading="lazy" class="tr-poster" src="${E(thumb(a))}" alt="${E(a.brand)} video ad"><video data-src="${E(a.video)}" muted playsinline loop preload="none"></video><span class="tr-play" aria-hidden="true">▶</span>`
  :`<img loading="lazy" src="${E(im[s]||thumb(a))}" alt="${E(a.brand)} ad">${im.length>1?`<div class="tr-dots"><button class="tr-nav" data-sl="${a.id}" data-d="-1" aria-label="Previous card">‹</button><span>${s+1}/${im.length}</span><button class="tr-nav" data-sl="${a.id}" data-d="1" aria-label="Next card">›</button></div>`:''}`;
 const d=days(a);
 return `<article class="tr-card in-card"><div class="tr-media ${a.format==='video'?'video':''}" data-open="${a.id}" role="button" tabindex="0" aria-label="Open ${E(a.brand)} ad">${media}
  <span class="in-type">${a.format==='video'?'▶ Video':a.format==='carousel'?'▣ Carousel':'▣ Image'}</span>${a.status==='active'?'<span class="in-live">Live</span>':''}
  <button class="in-star ${fav?'on':''}" data-fav="${a.id}" aria-label="${fav?'Remove from':'Add to'} favourites">${fav?'★':'☆'}</button></div>
  <div class="tr-meta">${a.logo?`<img class="tr-logo" src="${E(a.logo)}" alt="" loading="lazy">`:`<span class="tr-logo tr-ini">${E((a.brand||'?')[0])}</span>`}<div style="min-width:0;flex:1"><b>${E(a.brand)}</b><span class="cnt">${a.start_date?'Live '+E(fd(a.start_date)):''}${d!=null?' · '+d+'d':''}</span></div>
   <button class="in-addb" data-addb="${a.id}" aria-label="Add to a board">+ Board${nb?` <i>${nb}</i>`:''}</button></div>
  <div class="in-tags">${a.vg.slice(0,3).map(g=>`<span class="t p">${E(g)}</span>`).join('')}${(a.visual_formats||[]).filter(t=>!VGM[t]).slice(0,1).map(t=>`<span class="t">${E(t)}</span>`).join('')}${team?`<span class="t">★ ${team}</span>`:''}</div>
  ${a.headline||a.copy?`<div class="in-copy">${E(a.headline||a.copy)}</div>`:''}</article>`}
function bind(el,L){
 const rer=()=>{I.show=60;render()};
 el.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const s=I.f[b.dataset.k];s.has(b.dataset.v)?s.delete(b.dataset.v):s.add(b.dataset.v);rer()});
 el.querySelectorAll('[data-clr]').forEach(b=>b.onclick=()=>{I.f[b.dataset.clr].clear();rer()});
 el.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{I.sort=b.dataset.sort;rer()});
 el.querySelectorAll('[data-live]').forEach(b=>b.onclick=()=>{I.f.live=b.dataset.live;rer()});
 const mb=el.querySelector('[data-morebrands]');if(mb)mb.onclick=()=>{I.openBrands.all=1;render()};
 const q=el.querySelector('#in-q');q.oninput=()=>{I.q=q.value.trim().toLowerCase();clearTimeout(bind.t);bind.t=setTimeout(()=>{rer();const n=document.getElementById('in-q');n.focus();n.setSelectionRange(n.value.length,n.value.length)},250)};
 el.querySelector('[data-reset]').onclick=()=>{Object.values(I.f).forEach(s=>s instanceof Set&&s.clear());I.f.live='';I.q='';rer()};
 const m=el.querySelector('[data-more]');if(m)m.onclick=()=>{I.show+=60;render()};
 el.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{I.view=b.dataset.view;I.board=null;rer()});
 el.querySelectorAll('[data-board]').forEach(b=>b.onclick=()=>{I.view='board';I.board=+b.dataset.board;rer()});
 el.querySelector('[data-newb]').onclick=()=>newBoardForm(el.querySelector('[data-newb]'));
 const db=el.querySelector('[data-delb]');if(db)db.onclick=async()=>{if(!db.dataset.sure){db.dataset.sure=1;db.textContent='Delete for everyone?';setTimeout(()=>{if(db.isConnected){delete db.dataset.sure;db.textContent='Delete board'}},3000);return}await delBoard(+db.dataset.delb);render()};
 const cb=el.querySelector('[data-copyb]');if(cb)cb.onclick=async()=>{try{await navigator.clipboard.writeText(location.href.split('#')[0]+'#inspo/board/'+cb.dataset.copyb);toast('Board link copied')}catch(e){toast('Copy failed')}};
 el.querySelectorAll('[data-fav]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFav(b.dataset.fav)});
 el.querySelectorAll('[data-addb]').forEach(b=>b.onclick=e=>{e.stopPropagation();boardMenu(b,b.dataset.addb)});
 el.querySelectorAll('[data-sl]').forEach(b=>b.onclick=e=>{e.stopPropagation();const a=I.rows.find(x=>x.id===b.dataset.sl);const n=imgs(a).length;I.slide[a.id]=((I.slide[a.id]||0)+(+b.dataset.d)+n)%n;const card=b.closest('.tr-media');card.querySelector('img').src=imgs(a)[I.slide[a.id]];card.querySelector('.tr-dots span').textContent=(I.slide[a.id]+1)+'/'+n});
 const hov=matchMedia('(hover:hover)').matches;
 el.querySelectorAll('.tr-media.video').forEach(mm=>{const v=mm.querySelector('video');if(!hov||!v)return;
  mm.addEventListener('mouseenter',()=>{if(!v.src)v.src=v.dataset.src;v.currentTime=0;const p=v.play();if(p)p.then(()=>mm.classList.add('playing')).catch(()=>{})});
  mm.addEventListener('mouseleave',()=>{v.pause();mm.classList.remove('playing')})});
 el.querySelectorAll('[data-open]').forEach(mm=>{const go=e=>{if(e.target.closest('[data-sl],[data-fav]'))return;mm.querySelector('video')?.pause();drawer(L,L.findIndex(a=>a.id===mm.dataset.open))};mm.addEventListener('click',go);mm.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(e)}})});
}
function newBoardForm(btn,then){const f=document.createElement('form');f.className='pj pj-form in-bform';f.innerHTML='<input type="text" maxlength="60" placeholder="Board name" aria-label="Board name" autocomplete="off"><button type="submit">Create</button><button type="button" data-c aria-label="Cancel">×</button>';
 btn.replaceWith(f);const i=f.querySelector('input');i.focus();
 f.onsubmit=async e=>{e.preventDefault();const v=i.value.trim();if(!v)return;if(!me()){toast('Enter your JD email first');return}try{const b=await addBoard(v);if(then)await then(b);else{I.view='board';I.board=b.id}toast('Board created')}catch(err){toast('Could not create: '+err.message)}render()};
 f.querySelector('[data-c]').onclick=()=>render();i.onkeydown=e=>{if(e.key==='Escape')render()}}
function boardMenu(anchor,id){document.querySelectorAll('.in-menu').forEach(x=>x.remove());const m=document.createElement('div');m.className='in-menu';m.setAttribute('role','menu');
 const draw=()=>{m.innerHTML=`<div class="lbl" style="padding:4px 6px">Add to board</div>${I.boards.map(b=>`<label class="in-mi"><input type="checkbox" data-mb="${b.id}" ${inBoard(b.id,id)?'checked':''}> ${E(b.name)}</label>`).join('')||'<div class="cnt" style="padding:4px 6px">No boards yet.</div>'}<button type="button" class="in-mi in-mnew" data-mnew>+ New board</button>`;
  m.querySelectorAll('[data-mb]').forEach(c=>c.onchange=async()=>{if(!me()){toast('Enter your JD email first');return}try{await toggleBoard(+c.dataset.mb,id);toast(c.checked?'Added to board':'Removed from board')}catch(e){toast('Could not update: '+e.message)}});
  m.querySelector('[data-mnew]').onclick=()=>{const b=m.querySelector('[data-mnew]');newBoardInMenu(b)}};
 const newBoardInMenu=b=>{const f=document.createElement('form');f.className='in-mform';f.innerHTML='<input type="text" maxlength="60" placeholder="Board name" aria-label="Board name"><button type="submit">Add</button>';b.replaceWith(f);const i=f.querySelector('input');i.focus();f.onsubmit=async e=>{e.preventDefault();const v=i.value.trim();if(!v)return;if(!me()){toast('Enter your JD email first');return}try{const nb=await addBoard(v);await toggleBoard(nb.id,id);toast('Added to '+v)}catch(err){toast('Could not create: '+err.message)}draw()}};
 draw();document.body.appendChild(m);const r=anchor.getBoundingClientRect();m.style.top=Math.min(window.innerHeight-20-m.offsetHeight,r.bottom+6)+'px';m.style.left=Math.max(8,Math.min(window.innerWidth-m.offsetWidth-8,r.right-m.offsetWidth))+'px';
 const off=e=>{if(!m.contains(e.target)&&e.target!==anchor){m.remove();document.removeEventListener('mousedown',off);render()}};setTimeout(()=>document.addEventListener('mousedown',off),0)}

/* ---------- detail drawer ---------- */
function drawer(list,i){let s=0;const w=document.createElement('div');w.className='tr-lb in-lb';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');
 const draw=()=>{const a=list[i];const im=imgs(a);s=Math.min(s,Math.max(0,im.length-1));const d=days(a);const fav=I.favs.has(a.id);
  const kv=(k,v)=>v?`<dt>${k}</dt><dd>${v}</dd>`:'';
  w.innerHTML=`<div class="tr-lbc in-lbc"><div class="tr-lbh">${a.logo?`<img class="tr-logo" src="${E(a.logo)}" alt="">`:''}<div style="min-width:0;flex:1"><b>${E(a.brand)}</b><span class="cnt">${E(a.brand_group||'')} · ${a.format==='video'?'▶ Video':a.format==='carousel'?'▣ Carousel':'▣ Image'}${a.start_date?' · live '+E(fd(a.start_date)):''}</span></div>
   <button class="btn ${fav?'y':'g'}" data-dfav>${fav?'★ Favourite':'☆ Favourite'}</button><button class="btn g" data-dboard>+ Board</button><button class="btn g" data-x>Close</button></div>
  <div class="in-dgrid"><div class="tr-lbi"><button class="bb-ib" data-p aria-label="Previous ad">←</button><figure>${a.format==='video'&&a.video?`<video src="${E(a.video)}" poster="${E(thumb(a))}" controls autoplay playsinline></video>`:`<img src="${E(im[s]||thumb(a))}" alt="${E(a.brand)} ad">${im.length>1?`<div class="tr-dots"><button class="tr-nav" data-ss="-1" aria-label="Previous card">‹</button><span>${s+1}/${im.length}</span><button class="tr-nav" data-ss="1" aria-label="Next card">›</button></div>`:''}`}</figure><button class="bb-ib" data-n aria-label="Next ad">→</button></div>
  <div class="in-dside">
   <div class="sec"><div class="lbl">Visual format</div><div class="in-tags">${a.vg.map(g=>`<span class="t p">${E(g)}</span>`).join('')}${(a.visual_formats||[]).filter(t=>!a.vg.includes(t)).map(t=>`<span class="t">${E(t)}</span>`).join('')}${!(a.visual_formats||[]).length?'<span class="cnt">Not tagged by Motion yet</span>':''}</div></div>
   ${a.headline||a.copy?`<div class="sec"><div class="lbl">Copy</div><dl class="kv">${kv('Headline',a.headline?'<b>'+E(a.headline)+'</b>':'')}${kv('Primary text',E(a.copy))}${kv('CTA',E(a.cta))}</dl></div>`:''}
   <dl class="kv">${kv('Went live',E(fd(a.start_date)))}${kv('Status',a.status==='active'?'Running now':(a.end_date?'Ended '+E(fd(a.end_date)):'Ended'))}${kv('Running time',d!=null?d+' day'+(d===1?'':'s'):'')}${kv('Type',E(a.format)+(a.cards>1?' · '+a.cards+' cards':''))}${kv('Aspect',E(asp(a)))}${kv('Platforms',E((a.platforms||[]).join(', ')))}${kv('Variations',a.variants>1?a.variants+' versions in the ad':'')}${kv('Landing page',a.landing?`<a href="${E(a.landing)}" target="_blank" rel="noopener" style="word-break:break-all">${E(a.landing.replace(/^https?:\/\//,'').slice(0,80))}</a>`:'')}${kv('Team',(I.allFavs[a.id]?I.allFavs[a.id]+' favourite'+(I.allFavs[a.id]>1?'s':''):'')+(boardsOf(a.id).length?(I.allFavs[a.id]?' · ':'')+'on '+boardsOf(a.id).map(b=>E((I.boards.find(x=>x.id===b)||{}).name||'')).join(', '):''))}</dl>
   <div class="row">${a.ad_library?`<a class="btn g" href="${E(a.ad_library)}" target="_blank" rel="noopener">Meta Ad Library ↗</a>`:''}<button class="btn g" data-link>Copy link</button></div>
  </div></div>
  <div class="cnt" style="text-align:center;padding:0 16px 14px">Ad ${i+1} of ${list.length} · ← → to move between ads · Esc to close</div></div>`;
  history.replaceState(null,'','#inspo/ad/'+a.id)};
 const move=d=>{w.querySelector('video')?.pause();i=(i+d+list.length)%list.length;s=0;draw()};
 const key=e=>{if(e.target.tagName==='INPUT')return;if(e.key==='Escape')close();else if(e.key==='ArrowRight'&&e.target.tagName!=='VIDEO')move(1);else if(e.key==='ArrowLeft'&&e.target.tagName!=='VIDEO')move(-1)};
 const close=()=>{w.querySelector('video')?.pause();w.remove();document.querySelectorAll('.in-menu').forEach(x=>x.remove());document.removeEventListener('keydown',key);document.body.style.overflow='';history.replaceState(null,'','#inspo');render()};
 draw();document.body.appendChild(w);document.body.style.overflow='hidden';document.addEventListener('keydown',key);
 w.onclick=async e=>{const a=list[i];if(e.target===w||e.target.closest('[data-x]'))close();else if(e.target.closest('[data-n]'))move(1);else if(e.target.closest('[data-p]'))move(-1);
  else if(e.target.closest('[data-ss]')){const n=imgs(a).length;s=(s+(+e.target.closest('[data-ss]').dataset.ss)+n)%n;draw()}
  else if(e.target.closest('[data-dfav]')){await toggleFav(a.id);draw()}
  else if(e.target.closest('[data-dboard]'))boardMenu(e.target.closest('[data-dboard]'),a.id);
  else if(e.target.closest('[data-link]')){try{await navigator.clipboard.writeText(location.href.split('#')[0]+'#inspo/ad/'+a.id);toast('Link copied')}catch(err){toast('Copy failed')}}}}

/* ---------- wiring ---------- */
function inject(){if(!document.getElementById('v-inspo')){const s=document.createElement('section');s.id='v-inspo';s.className='wrap';s.hidden=true;document.querySelector('main').appendChild(s)}}
function hook(){const _show=window.show;window.show=function(tab){const v=document.getElementById('v-inspo');
  if(tab==='inspo'){_show('trending');document.getElementById('v-trending').hidden=true;v.hidden=false;window.scrollTo({top:0});if(!I.rows&&!I.loading){I.loading=1;load()}render();return}
  v.querySelectorAll('video').forEach(x=>x.pause());v.hidden=true;return _show(tab)};
 const _route=window.route;window.route=function(){const h=location.hash.slice(1);if(h==='inspo'||h.startsWith('inspo/')){document.getElementById('drawer').hidden=true;document.getElementById('scrim').hidden=true;
   const m=h.match(/^inspo\/board\/(\d+)/);if(m){I.view='board';I.board=+m[1]}
   show('inspo');const ad=h.match(/^inspo\/ad\/(\w+)/);if(ad){const go=()=>{if(!I.rows){setTimeout(go,200);return}const L=sorted(apply(base()));let k=L.findIndex(a=>a.id===ad[1]);if(k<0){L.unshift(I.rows.find(a=>a.id===ad[1]));k=0}if(L[k]&&!document.querySelector('.in-lb'))drawer(L,k)};go()}return}return _route()};
 window.removeEventListener('hashchange',_route);window.addEventListener('hashchange',window.route)}
const wait=setInterval(()=>{if(!window.discoverTabs||!document.getElementById('v-trending'))return;clearInterval(wait);inject();hook();if(location.hash.startsWith('#inspo'))window.route()},60);
})();

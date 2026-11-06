/* JD Ad Briefing Room · Discover Ads › Trending Ads Weekly (weekly top ads from Runneth's public trending pages, stored in Supabase tr_ads).
   Discover Ads is the always-on top-level section; its sub tabs are Trending Ads Weekly (#trending) and Inspo (#inspo, inspo.js). */
(()=>{
const SB='https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/',K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CATS=[['apparel','Apparel'],['sports-fitness','Sports & Fitness'],['retail','Retail'],['accessories','Accessories'],['health-wellness','Health & Wellness']];
const CN=Object.fromEntries(CATS);
const T={rows:null,err:null,week:null,cat:'all',kind:'all',slide:{}};
window.discoverTabs=cur=>`<div class="dc-tabs" role="tablist" aria-label="Discover Ads"><span class="lbl">Discover Ads</span>${[['trending','Trending Ads Weekly'],['inspo','Inspo']].map(([h,n])=>`<a role="tab" class="pill" href="#${h}" aria-selected="${cur===h}" aria-pressed="${cur===h}">${n}</a>`).join('')}</div>`;
const wk=d=>new Date(d+'T12:00').toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'});
async function load(){try{let all=[],from=0;for(;;){const r=await fetch(SB+'tr_ads?select=week,category,rank,brand,age,kind,video,poster,images,logo,video_s,poster_s,images_s,logo_s&order=week.desc,category.asc,rank.asc',{headers:{apikey:K,Authorization:'Bearer '+K,Range:from+'-'+(from+999)}});if(!r.ok)throw new Error(r.status);const j=await r.json();all=all.concat(j);if(j.length<1000)break;from+=1000}all.forEach(r=>{if(r.video_s)r.video=r.video_s;if(r.poster_s)r.poster=r.poster_s;if(r.images_s&&r.images_s.length)r.images=r.images_s;if(r.logo_s)r.logo=r.logo_s;r.stored=!!(r.video_s||(r.images_s||[]).length)});T.rows=all;T.week=T.week||all[0]?.week||null}catch(e){T.err=e.message;T.rows=[]}render()}
const key=a=>a.category+'|'+a.rank+'|'+a.week;const sig=a=>a.brand+'|'+a.kind+'|'+(a.age||'');
function render(){const el=document.getElementById('v-trending');if(!el||el.hidden)return;
 if(!T.rows){el.innerHTML='<div class="tr"><div class="note">Loading trending ads…</div></div>';return}
 const weeks=[...new Set(T.rows.map(r=>r.week))];const wi=weeks.indexOf(T.week);
 const W=T.rows.filter(r=>r.week===T.week),prev=new Set(T.rows.filter(r=>r.week===weeks[wi+1]).map(r=>r.brand));
 const list=W.filter(r=>(T.cat==='all'||r.category===T.cat)&&(T.kind==='all'||(T.kind==='video'?r.kind==='video':r.kind!=='video')));
 const brands={};W.forEach(r=>brands[r.brand]=(brands[r.brand]||0)+1);const top=Object.entries(brands).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const vids=W.filter(r=>r.kind==='video').length;const isNew=r=>weeks[wi+1]&&!prev.has(r.brand);const nNew=weeks[wi+1]?W.filter(isNew).length:null;
 const k=(l,n,s)=>`<div class="bb-kpi"><span class="lbl">${l}</span><b>${n}</b>${s?`<small>${s}</small>`:''}</div>`;
 el.innerHTML=`<div class="tr">${window.discoverTabs('trending')}
 <div class="tr-head"><div><span class="lbl" style="color:var(--y)"><i class="dv-dot"></i> Updated weekly · Runneth</span><h2 class="disp">Trending Ads</h2>
  <p>The top 30 ads each week in the categories closest to JD, ranked by Runneth community saves. Every ad is copied into the Briefing Room when it's captured, so past weeks stay here after Runneth moves on. Hover a video to preview it; click any ad to open it full size.</p></div>
  <div class="tr-wk"><button class="bb-ib" data-wk="${wi+1}" ${wi+1>=weeks.length?'disabled':''} aria-label="Previous week">←</button>
   <select id="tr-week" aria-label="Week">${weeks.map(w=>`<option value="${w}" ${w===T.week?'selected':''}>Week of ${E(wk(w))}</option>`).join('')}</select>
   <button class="bb-ib" data-wk="${wi-1}" ${wi<=0?'disabled':''} aria-label="Next week">→</button></div></div>
 ${T.err?`<div class="bb-warn"><b>Can't load trending ads here.</b> This copy of the Briefing Room can't reach the team database or Runneth's media. Open the team site (jd-ecomm.github.io/jd-ad-briefing-room/#trending) to see them.</div>`:''}
 ${W.length?`<div class="bb-kpis">${k('Ads this week',W.length,CATS.filter(c=>W.some(r=>r.category===c[0])).length+' categories')}${k('▶ Video',vids,Math.round(vids/W.length*100)+'% of ads')}${k('New vs last week',nNew==null?'–':nNew,nNew==null?'First week tracked':'brands not in last week\'s top ads')}${k('Most featured',E(top[0]?.[0]||'–'),top.map(t=>E(t[0])+' ×'+t[1]).join(' · '))}</div>
 <div class="row tr-f"><span class="lbl">Category</span>${[['all','All'],...CATS].map(([id,n])=>`<button class="pill" data-tc="${id}" aria-pressed="${T.cat===id}">${E(n)} <span class="cnt">${id==='all'?W.length:W.filter(r=>r.category===id).length}</span></button>`).join('')}
  <span class="lbl" style="margin-left:12px">Format</span>${[['all','All'],['video','Video'],['static','Image']].map(([id,n])=>`<button class="pill" data-tk="${id}" aria-pressed="${T.kind===id}">${n}</button>`).join('')}</div>
 <div class="tr-grid">${list.map(card).join('')||'<div class="bb-empty">No ads match these filters.</div>'}</div>`:(!T.err?'<div class="bb-empty">No trending ads captured yet.</div>':'')}
 <p class="cnt">Source: <a href="https://motionapp.com/trending/" target="_blank" rel="noopener" style="color:var(--y)">Runneth trending ads ↗</a> (Apparel, Sports &amp; Fitness, Retail, Accessories, Health &amp; Wellness). Captured and stored every Monday afternoon. “Running” is how long Runneth shows the ad has been live.</p></div>`;
 function card(a){const imgs=a.images||[];const s=T.slide[key(a)]||0;const isn=isNew(a);
  const media=a.kind==='video'?`<img loading="lazy" class="tr-poster" src="${E(a.poster||imgs[0]||'')}" alt="${E(a.brand)} video ad"><video data-src="${E(a.video)}" muted playsinline loop preload="none"></video><span class="tr-play" aria-hidden="true">▶</span>`
   :`<img loading="lazy" src="${E(imgs[s]||imgs[0]||'')}" alt="${E(a.brand)} ad">${imgs.length>1?`<div class="tr-dots"><button class="tr-nav" data-sl="${E(key(a))}" data-d="-1" aria-label="Previous image">‹</button><span>${s+1}/${imgs.length}</span><button class="tr-nav" data-sl="${E(key(a))}" data-d="1" aria-label="Next image">›</button></div>`:''}`;
  return `<article class="tr-card"><div class="tr-media ${a.kind}" data-open="${list.indexOf(a)}" role="button" tabindex="0" aria-label="Open ${E(a.brand)} ${a.kind==='video'?'video':'image'} ad">${media}<span class="tr-rank">#${a.rank}</span>${isn?'<span class="tr-new">New</span>':''}</div>
   <div class="tr-meta">${a.logo?`<img class="tr-logo" src="${E(a.logo)}" alt="" loading="lazy">`:`<span class="tr-logo tr-ini">${E((a.brand||'?')[0])}</span>`}<div style="min-width:0"><b>${E(a.brand||'Unknown brand')}</b><span class="cnt">${E(CN[a.category]||a.category)} · ${a.kind==='video'?'▶ Video':a.kind==='carousel'?'▣ Carousel':'▣ Image'}${a.age?' · Running '+E(a.age):''}</span></div></div></article>`}
 el.querySelectorAll('[data-wk]').forEach(b=>b.onclick=()=>{const i=+b.dataset.wk;if(weeks[i]){T.week=weeks[i];render()}});
 const ws=el.querySelector('#tr-week');if(ws)ws.onchange=()=>{T.week=ws.value;render()};
 el.querySelectorAll('[data-tc]').forEach(b=>b.onclick=()=>{T.cat=b.dataset.tc;render()});
 el.querySelectorAll('[data-tk]').forEach(b=>b.onclick=()=>{T.kind=b.dataset.tk;render()});
 el.querySelectorAll('[data-sl]').forEach(b=>b.onclick=()=>{const k2=b.dataset.sl,a=W.find(r=>key(r)===k2);const n=(a.images||[]).length;T.slide[k2]=((T.slide[k2]||0)+(+b.dataset.d)+n)%n;render()});
 const hov=matchMedia('(hover:hover)').matches;
 el.querySelectorAll('.tr-media.video').forEach(m=>{const v=m.querySelector('video');if(!hov)return;
  m.addEventListener('mouseenter',()=>{if(!v.src)v.src=v.dataset.src;v.currentTime=0;const p=v.play();if(p)p.then(()=>m.classList.add('playing')).catch(()=>{})});
  m.addEventListener('mouseleave',()=>{v.pause();m.classList.remove('playing')})});
 el.querySelectorAll('[data-open]').forEach(m=>{const go=e=>{if(e.target.closest('[data-sl]'))return;m.querySelector('video')?.pause();lightbox(list,+m.dataset.open)};m.addEventListener('click',go);m.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(e)}})});
}
function lightbox(list,i){let s=0;const w=document.createElement('div');w.className='tr-lb';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');
 const draw=()=>{const a=list[i];const imgs=a.images||[];s=Math.min(s,Math.max(0,imgs.length-1));
  w.innerHTML=`<div class="tr-lbc"><div class="tr-lbh"><span class="tr-rank" style="position:static">#${a.rank}</span>${a.logo?`<img class="tr-logo" src="${E(a.logo)}" alt="">`:''}<div style="min-width:0;flex:1"><b>${E(a.brand||'Unknown brand')}</b><span class="cnt">${E(CN[a.category]||a.category)} · ${a.kind==='video'?'▶ Video':a.kind==='carousel'?'▣ Carousel':'▣ Image'}${a.age?' · Running '+E(a.age):''} · week of ${E(wk(a.week))}</span></div><button class="btn g" data-x>Close</button></div>
  <div class="tr-lbi"><button class="bb-ib" data-p aria-label="Previous ad">←</button><figure>${a.kind==='video'?`<video src="${E(a.video)}" poster="${E(a.poster||'')}" controls autoplay playsinline></video>`:`<img src="${E(imgs[s]||'')}" alt="${E(a.brand)} ad">${imgs.length>1?`<div class="tr-dots"><button class="tr-nav" data-ss="-1" aria-label="Previous image">‹</button><span>${s+1}/${imgs.length}</span><button class="tr-nav" data-ss="1" aria-label="Next image">›</button></div>`:''}`}</figure><button class="bb-ib" data-n aria-label="Next ad">→</button></div>
  <div class="cnt" style="text-align:center;padding:0 16px 14px">Ad ${i+1} of ${list.length} · ← → to move between ads · Esc to close</div></div>`};
 const move=d=>{i=(i+d+list.length)%list.length;s=0;draw()};
 const key=e=>{if(e.key==='Escape')close();else if(e.key==='ArrowRight'&&e.target.tagName!=='VIDEO')move(1);else if(e.key==='ArrowLeft'&&e.target.tagName!=='VIDEO')move(-1)};
 const close=()=>{w.querySelector('video')?.pause();w.remove();document.removeEventListener('keydown',key);document.body.style.overflow=''};
 draw();document.body.appendChild(w);document.body.style.overflow='hidden';document.addEventListener('keydown',key);
 w.onclick=e=>{if(e.target===w||e.target.closest('[data-x]'))close();else if(e.target.closest('[data-n]'))move(1);else if(e.target.closest('[data-p]'))move(-1);else if(e.target.closest('[data-ss]')){const n=(list[i].images||[]).length;s=(s+(+e.target.closest('[data-ss]').dataset.ss)+n)%n;draw()}}}
function inject(){if(!document.getElementById('t-trending')){const row=document.querySelector('.proj .wrap');const g=document.createElement('span');g.className='tr-top';g.innerHTML='<span class="lbl">Always on</span><button type="button" class="pj tr-pj" id="t-trending"><i class="dv-dot"></i>Discover Ads <i>Trending · Inspo</i></button>';row.appendChild(g);g.querySelector('button').onclick=()=>location.hash='trending'}
 if(!document.getElementById('v-trending')){const s=document.createElement('section');s.id='v-trending';s.className='wrap';s.hidden=true;document.querySelector('main').appendChild(s)}}
function hook(){const _show=window.show;window.show=function(tab){const v=document.getElementById('v-trending'),t=document.getElementById('t-trending');
  const bar=document.querySelector('nav.bar'),pj=document.querySelector('.proj .pj.on, .proj .pj.was');
  if(tab==='trending'||tab==='inspo'){document.querySelectorAll('main > section').forEach(x=>x.hidden=true);document.querySelectorAll('nav.bar [data-tab]').forEach(x=>x.setAttribute('aria-pressed',false));v.hidden=false;t.classList.add('on');t.setAttribute('aria-current','true');if(pj){pj.classList.remove('on');pj.classList.add('was')}if(bar)bar.hidden=true;window.scrollTo({top:0});if(!T.rows&&!T.loading){T.loading=1;load()}render();return}
  v.querySelectorAll('video').forEach(x=>x.pause());v.hidden=true;t.classList.remove('on');t.removeAttribute('aria-current');if(pj){pj.classList.add('on');pj.classList.remove('was')}if(bar)bar.hidden=false;return _show(tab)};
 const _route=window.route;window.route=function(){if(location.hash==='#trending'){document.getElementById('drawer').hidden=true;document.getElementById('scrim').hidden=true;show('trending');return}return _route()};
 window.removeEventListener('hashchange',_route);window.addEventListener('hashchange',window.route)}
const wait=setInterval(()=>{if(typeof D==='undefined'||!D||!window.show||!document.getElementById('t-project')||!document.getElementById('t-delivered'))return;clearInterval(wait);inject();hook();if(location.hash==='#trending')window.route()},60);
})();

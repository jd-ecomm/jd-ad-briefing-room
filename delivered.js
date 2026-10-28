/* JD Ad Briefing Room · Live: Assets Delivered (Drive links scraped from ClickUp + team email) */
(()=>{
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fd=d=>d?new Date(d+'T12:00').toLocaleDateString('en-CA',{day:'numeric',month:'short'}):'';
const ST={'Live':'live','Delivered':'del','Approved':'del','Ready for review':'rev','In progress':'prog','Reference':'ref'};
const F={lang:'All'};
function render(){const el=document.getElementById('v-delivered');if(!el)return;const P=D.project||{};
 const all=(D.delivered||[]).filter(a=>a.project===P.id).sort((a,b)=>(b.previews?.length||0)-(a.previews?.length||0)||(b.delivered||'').localeCompare(a.delivered||''));
 const pv=all.flatMap(a=>a.previews||[]);const last=all.map(a=>a.delivered).filter(Boolean).sort().pop();
 const k=(lbl,n,sub)=>`<div class="bb-kpi"><span class="lbl">${lbl}</span><b>${n}</b>${sub?`<small>${sub}</small>`:''}</div>`;
 el.innerHTML=`<div class="dv">
 <div class="dv-head"><div><span class="lbl" style="color:var(--y)"><i class="dv-dot"></i> Live · ${E(P.name||'')}</span><h2 class="disp">Assets Delivered</h2><p>Finished creative for this project, pulled from ClickUp tasks and team email threads. Click any preview to see it larger; the Drive buttons open the full-resolution files.</p></div>
  <div class="cnt">Updated by Claude · ${E(new Date((D.delivered_refreshed||'2026-10-28')+'T12:00').toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'}))} · ask Claude to “refresh delivered assets”</div></div>
 <div class="bb-kpis">${k('Asset packs',all.length,'For '+E(P.season||P.name||'this project'))}${k('Files previewed',pv.length,pv.filter(x=>x.kind==='video').length+' video · '+pv.filter(x=>x.kind!=='video').length+' image')}${k('Languages',[...new Set(pv.map(x=>x.lang).filter(l=>l&&l!=='—'))].join(' / ')||'–','French versions included')}${k('Latest delivery',last?fd(last):'–','')}</div>
 <div class="row" style="gap:6px"><span class="lbl" style="margin-right:4px">Language</span>${['All','EN','FR'].map(l=>`<button class="pill" data-dl="${l}" aria-pressed="${F.lang===l}">${l}</button>`).join('')}</div>
 ${all.length?all.map((a,ai)=>{const ps=(a.previews||[]).filter(x=>F.lang==='All'||x.lang===F.lang||x.lang==='—');return `<article class="dv-pack">
  <div class="dv-meta"><div class="row" style="gap:8px"><span class="dv-st ${ST[a.status]||''}">${E(a.status)}</span><span class="dv-ch">${E(a.channel)}</span></div>
   <span class="lbl">${E(a.campaign)}</span><b class="dv-n">${E(a.name)}</b><div class="dv-f">${E(a.formats)}${a.languages?` <span class="dv-lang">${E(a.languages)}</span>`:''}</div>
   <dl class="dv-kv">${a.delivered?`<div><dt>Delivered</dt><dd>${E(fd(a.delivered))}</dd></div>`:''}${a.by?`<div><dt>By</dt><dd>${E(a.by)}</dd></div>`:''}${a.live?`<div><dt>Live</dt><dd>${E(a.live)}</dd></div>`:''}</dl>
   ${a.notes?`<p class="dv-note">${E(a.notes)}</p>`:''}
   <div class="row dv-act"><a class="btn y" href="${E(a.url)}" target="_blank" rel="noopener">Open folder in Drive ↗</a>${a.source_url?`<a class="btn g" href="${E(a.source_url)}" target="_blank" rel="noopener">ClickUp ↗</a>`:''}</div>
   <span class="dv-src">${a.source==='Gmail'?'✉ Email':'☑ ClickUp'} · ${E(a.source_title)}</span></div>
  <div class="dv-gal">${ps.length?ps.map((x,xi)=>`<button type="button" class="dv-pv ${x.kind}" data-pv="${ai}:${(a.previews||[]).indexOf(x)}" title="${E(x.label+' · '+x.lang)}"><img loading="lazy" src="${E(x.src)}" alt="${E(a.name+' '+x.label+' '+x.lang)}">${x.kind==='video'?'<span class="dv-play">▶</span>':''}<span class="dv-cap"><b>${E(x.label)}</b> ${x.lang!=='—'?E(x.lang)+' · ':''}${E(x.size)}</span></button>`).join(''):`<div class="dv-nopv">${a.previews?'No previews in this language.':'Folder of source files. Open in Drive to browse.'}</div>`}</div></article>`}).join(''):'<div class="bb-empty">No delivered assets logged for this project yet.</div>'}
 </div>`;
 el.querySelectorAll('[data-dl]').forEach(b=>b.onclick=()=>{F.lang=b.dataset.dl;render()});
 el.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>{const [ai,xi]=b.dataset.pv.split(':').map(Number);lightbox(all[ai],xi)});}
function lightbox(a,xi){const ps=a.previews||[];let i=xi;const w=document.createElement('div');w.className='pk dv-lb';
 const draw=()=>{const x=ps[i];const file=x.kind==='video'&&a.files?a.files[x.lang]:null;w.innerHTML=`<div class="dv-lbc"><div class="ph"><b>${E(a.name)}</b><span class="cnt">${E(x.label)} · ${E(x.lang)} · ${E(x.size)}</span><button class="btn g addb" data-x>Close</button></div>
  <div class="dv-lbi"><button class="bb-ib" data-p aria-label="Previous">←</button><figure><img src="${E(x.src)}" alt="">${x.kind==='video'?'<span class="dv-play big">▶</span>':''}</figure><button class="bb-ib" data-n aria-label="Next">→</button></div>
  <div class="row" style="gap:8px;padding:0 16px 16px">${file?`<a class="btn y" href="${E(file)}" target="_blank" rel="noopener">▶ Play in Drive ↗</a>`:''}<a class="btn ${file?'g':'y'}" href="${E(a.url)}" target="_blank" rel="noopener">Open folder in Drive ↗</a><span class="cnt">${i+1} / ${ps.length}${x.kind==='video'?' · poster frame, play the Reel in Drive':''}</span></div></div>`};
 draw();document.body.appendChild(w);
 const key=e=>{if(e.key==='Escape')close();if(e.key==='ArrowRight'){i=(i+1)%ps.length;draw()}if(e.key==='ArrowLeft'){i=(i-1+ps.length)%ps.length;draw()}};const close=()=>{w.remove();document.removeEventListener('keydown',key)};document.addEventListener('keydown',key);
 w.onclick=e=>{if(e.target===w||e.target.closest('[data-x]'))close();else if(e.target.closest('[data-n]')){i=(i+1)%ps.length;draw()}else if(e.target.closest('[data-p]')){i=(i-1+ps.length)%ps.length;draw()}}}
function inject(){if(!document.getElementById('t-delivered')){const b=document.createElement('button');b.className='pill';b.dataset.tab='delivered';b.id='t-delivered';b.innerHTML='<i class="dv-dot"></i> Live: Assets Delivered';document.getElementById('t-brief').after(b);b.onclick=()=>location.hash='delivered'}
 if(!document.getElementById('v-delivered')){const s=document.createElement('section');s.id='v-delivered';s.className='wrap';s.hidden=true;document.querySelector('main').appendChild(s)}}
function hook(){const _show=window.show;window.show=function(tab){const v=document.getElementById('v-delivered'),t=document.getElementById('t-delivered');
  if(tab==='delivered'){document.querySelectorAll('main > section').forEach(x=>x.hidden=true);document.querySelectorAll('nav.bar [data-tab]').forEach(x=>x.setAttribute('aria-pressed',false));v.hidden=false;t.setAttribute('aria-pressed',true);render();return}
  v.hidden=true;t.setAttribute('aria-pressed',false);return _show(tab)};
 const _route=window.route;window.route=function(){if(location.hash==='#delivered'){document.getElementById('drawer').hidden=true;document.getElementById('scrim').hidden=true;show('delivered');return}return _route()};
 window.removeEventListener('hashchange',_route);window.addEventListener('hashchange',window.route)}
const wait=setInterval(()=>{if(typeof D==='undefined'||!D||!window.show||!document.getElementById('t-project'))return;clearInterval(wait);inject();hook();if(location.hash==='#delivered')window.route()},60);
})();

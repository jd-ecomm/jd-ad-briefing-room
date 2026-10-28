/* JD Ad Briefing Room · Project tab (summary of the project brief from ClickUp + group emails) */
(()=>{
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fd=(d,o)=>d?new Date(d+'T12:00').toLocaleDateString('en-CA',o||{weekday:'short',day:'numeric',month:'short'}):'';
function render(){const P=D.project||{},el=document.getElementById('v-project');if(!el)return;const today=new Date().toISOString().slice(0,10);
 const ms=P.milestones||[],next=ms.find(m=>m.date>=today);const days=next?Math.round((new Date(next.date+'T12:00')-new Date(today+'T12:00'))/864e5):null;
 el.innerHTML=`<div class="pj-wrap">
 <div class="pj-hero"><div class="pj-hl"><span class="lbl" style="color:var(--y)">Project inputs · ${E(P.season||'')}</span><h2 class="disp">${E(P.name)}</h2><p>${E(P.summary||'')}</p>
   <div class="row" style="gap:8px"><a class="btn y" href="#brief">Build the paid brief →</a>${P.clickup?`<a class="btn" href="${E(P.clickup)}" target="_blank" rel="noopener">Open in ClickUp ↗</a>`:''}</div></div>
  <dl class="pj-facts"><div><dt>Status</dt><dd>${E(P.status||'–')}</dd></div><div><dt>Window</dt><dd>${E(P.window||P.dates||'')}</dd></div><div><dt>Offer</dt><dd>${E(P.offer||'')}</dd></div><div><dt>Owner</dt><dd>${E(P.owner||'')}</dd></div>
   ${next?`<div class="pj-next"><dt>Next milestone</dt><dd><b>${days===0?'Today':days+' day'+(days===1?'':'s')}</b> ${E(next.name)} · ${E(fd(next.date))}</dd></div>`:''}</dl></div>

 <section class="pj-sec"><h3 class="disp">Key dates</h3><div class="pj-time">${ms.map(m=>`<div class="pj-ms ${m.kind||''}${m.date<today?' past':''}${next&&m===next?' now':''}"><span class="pj-d">${E(fd(m.date,{day:'numeric',month:'short'}))}<i>${E(fd(m.date,{weekday:'short'}))}</i></span><b>${E(m.name)}</b><span class="cnt">${E(m.note||'')}</span>${m.kind==='tbc'?'<span class="pj-tbc">Confirm</span>':''}</div>`).join('')}</div>
  <div class="pj-legend"><span class="sale">Sale moment</span><span class="lead">Lead gen / build</span><span class="tbc">To confirm</span></div></section>

 ${P.paid?`<section class="pj-sec"><div class="row" style="justify-content:space-between"><h3 class="disp">What Paid needs to brief</h3><a class="pill" href="${E(P.paid.task)}" target="_blank" rel="noopener" style="text-decoration:none">ClickUp task ↗</a></div>
  <p class="cnt" style="margin:0">${E(P.paid.status)} · ${E(P.paid.owners)}</p>
  <div class="pj-two"><div class="pj-card"><span class="lbl">Tier-1 pack standard</span>${P.paid.standard.map(x=>`<div class="pj-std"><b>${E(x.t)}</b><span>${E(x.v)}</span></div>`).join('')}</div>
  <div class="pj-card"><span class="lbl">Ryan to complete → where it lives in the Brief Builder</span><table class="pj-ask">${P.paid.ask.map(x=>`<tr><td>${E(x[0])}</td><td>→ ${E(x[1])}</td></tr>`).join('')}</table></div></div></section>`:''}

 <section class="pj-sec"><h3 class="disp">Workstreams</h3><div class="pj-tbl"><table><thead><tr><th>Workstream</th><th>Owner</th><th>Status</th><th>Due</th><th>Notes</th></tr></thead><tbody>
  ${(P.workstreams||[]).map(w=>`<tr><td><a href="${E(w.url)}" target="_blank" rel="noopener"><b>${E(w.name)}</b> ↗</a></td><td>${E(w.owner)}</td><td><span class="bb-st ${/progress|delivered/i.test(w.status)?'prog':''}">${E(w.status)}</span></td><td style="white-space:nowrap">${E(w.due||'–')}</td><td class="cnt" style="min-width:260px">${E(w.note)}</td></tr>`).join('')}</tbody></table></div></section>

 <div class="pj-two">
  <section class="pj-sec pj-card"><h3 class="disp">Open questions</h3><p class="cnt" style="margin:0">Only questions raised in ClickUp or in group emails with the wider team.</p><ol class="pj-open">${(P.open||[]).map(o=>`<li><span>${E(o.q)}</span><span class="pj-who">${E(o.who)}</span><span class="pj-qsrc">${E(o.src||'')}${o.url?` · <a href="${E(o.url)}" target="_blank" rel="noopener">Open in ClickUp ↗</a>`:''}</span></li>`).join('')}</ol></section>
  <section class="pj-sec pj-card"><h3 class="disp">Creative direction</h3><ul class="pj-list">${(P.direction||[]).map(x=>`<li>${E(x)}</li>`).join('')}</ul></section></div>

 <div class="pj-two">
  <section class="pj-sec pj-card"><h3 class="disp">Team</h3><div class="pj-team">${(P.team||[]).map(t=>`<div><b>${E(t[0])}</b><span class="cnt">${E(t[1])}</span></div>`).join('')}</div></section>
  <section class="pj-sec pj-card"><h3 class="disp">Sources</h3><ul class="pj-src">${(P.sources||[]).map(x=>`<li><span class="pj-t ${x.t.toLowerCase()}">${E(x.t)}</span>${x.u?`<a href="${E(x.u)}" target="_blank" rel="noopener">${E(x.n)} ↗</a>`:`<span>${E(x.n)}</span>`}${x.d?`<span class="cnt">${E(fd(x.d,{day:'numeric',month:'short'}))}</span>`:''}</li>`).join('')}</ul>
   <p class="cnt" style="margin:8px 0 0">Summarised by Claude from ClickUp and the project email threads · refreshed ${E(fd(P.refreshed,{day:'numeric',month:'short',year:'numeric'}))}. Ask Claude to “refresh the project page” to pull the latest.</p></section></div>

 </div>`}
function inject(){const nav=document.querySelector('nav.bar .wrap');
 if(!document.getElementById('t-project')){const b=document.createElement('button');b.className='pill';b.dataset.tab='project';b.id='t-project';b.textContent='Project Inputs';(document.getElementById('t-brief')||document.getElementById('t-ours')).after(b);b.onclick=()=>location.hash='project'}
 if(!document.getElementById('v-project')){const s=document.createElement('section');s.id='v-project';s.className='wrap';s.hidden=true;document.querySelector('main').appendChild(s)}
 const pj=document.querySelector('.proj .pj.on');if(pj){pj.style.cursor='pointer';pj.onclick=()=>location.hash='project'}}
function hook(){const _show=window.show;window.show=function(tab){const v=document.getElementById('v-project'),t=document.getElementById('t-project');
  if(tab==='project'){document.querySelectorAll('main > section').forEach(x=>x.hidden=true);document.querySelectorAll('nav.bar [data-tab]').forEach(x=>x.setAttribute('aria-pressed',false));v.hidden=false;t.setAttribute('aria-pressed',true);render();return}
  v.hidden=true;t.setAttribute('aria-pressed',false);return _show(tab)};
 const _route=window.route;window.route=function(){const h=location.hash.slice(1);if(h==='project'){document.getElementById('drawer').hidden=true;document.getElementById('scrim').hidden=true;show('project');return}return _route()};
 window.removeEventListener('hashchange',_route);window.addEventListener('hashchange',window.route)}
const wait=setInterval(()=>{if(typeof D==='undefined'||!D||!window.show||!document.querySelector('main')||!document.getElementById('t-brief'))return;clearInterval(wait);inject();hook();window.route()},60);
})();

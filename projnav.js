/* JD Ad Briefing Room · Projects row: add more project titles next to the current project (team-shared in Supabase bb_projects, browser-only fallback). */
(()=>{
const SB='https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/bb_projects',K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I';
const H={apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json'};
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls={get(){try{return JSON.parse(localStorage.getItem('bb-projects')||'[]')}catch(e){return[]}},set(v){try{localStorage.setItem('bb-projects',JSON.stringify(v))}catch(e){}}};
const me=()=>{try{return JSON.parse(localStorage.getItem('jd-email')||'""')}catch(e){return''}};
let P=[],remote=true;
async function load(){try{const r=await fetch(SB+'?select=id,name,ord&order=ord.asc,created_at.asc',{headers:H});if(!r.ok)throw 0;P=await r.json()}catch(e){remote=false;P=ls.get()}draw()}
async function add(name){const row={name,ord:P.length+1,created_by:me()};
 if(remote){try{const r=await fetch(SB,{method:'POST',headers:{...H,Prefer:'return=representation'},body:JSON.stringify(row)});if(!r.ok)throw 0;P.push((await r.json())[0]);draw();return}catch(e){remote=false;P=ls.get()}}
 P.push({...row,id:'l'+Date.now()});ls.set(P);draw()}
async function del(id){P=P.filter(p=>p.id!==id);if(remote&&!String(id).startsWith('l')){try{await fetch(SB+'?id=eq.'+id,{method:'DELETE',headers:H})}catch(e){}}else ls.set(P);draw()}
function draw(){const row=document.querySelector('.proj .wrap');const addb=document.getElementById('pj-add');if(!row||!addb)return;
 row.querySelectorAll('.pj-x').forEach(x=>x.remove());
 P.forEach(p=>{const s=document.createElement('span');s.className='pj pj-x';s.title=p.name+' (no content yet)';s.innerHTML=`${E(p.name)}<button type="button" class="pj-del" aria-label="Remove ${E(p.name)}" title="Remove">×</button>`;
  s.querySelector('button').onclick=e=>{e.stopPropagation();const b=e.currentTarget;if(!b.dataset.sure){b.dataset.sure=1;b.textContent='Remove?';b.classList.add('sure');setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent='×';b.classList.remove('sure')}},3000);return}del(p.id)};
  addb.before(s)})}
function openAdd(){const addb=document.getElementById('pj-add');if(document.getElementById('pj-new'))return;
 const f=document.createElement('form');f.className='pj pj-form';f.innerHTML='<input id="pj-new" type="text" maxlength="60" placeholder="Project title" aria-label="New project title" autocomplete="off"><button type="submit">Add</button><button type="button" data-c aria-label="Cancel">×</button>';
 addb.before(f);addb.hidden=true;const i=f.querySelector('input');i.focus();
 const done=()=>{f.remove();addb.hidden=false};
 f.onsubmit=e=>{e.preventDefault();const v=i.value.trim();if(v)add(v);done()};
 f.querySelector('[data-c]').onclick=done;i.onkeydown=e=>{if(e.key==='Escape')done()}}
function init(){const old=document.querySelector('.proj .pj.soon');if(!old)return;
 const b=document.createElement('button');b.type='button';b.className='pj soon';b.id='pj-add';b.textContent='+ Add project';b.title='Add a project title';old.replaceWith(b);b.onclick=openAdd;load()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

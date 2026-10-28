/* JD Ad Briefing Room · Brief Builder + email gate
   Data: Supabase (team-shared) with a browser-only fallback when the network is blocked. */
(()=>{
const SB={u:'https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/',k:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I'};
const DOMAINS=/@(jdsports\.ca|jdcanada\.ca|jdplc\.com|jdsports\.co\.uk|ryanclarke\.co)$/i;
const ROUNDEL='<svg viewBox="0 0 144 144" aria-hidden="true"><path fill="currentColor" d="M 88.144531 52.375 L 81.914062 91.605469 C 81.914062 91.605469 105.574219 95.359375 109.203125 72.070312 C 112.828125 48.777344 88.144531 52.375 88.144531 52.375"/><path fill="currentColor" d="M 72 0 C 32.234375 0 0 32.234375 0 72 C 0 111.765625 32.234375 144 72 144 C 111.765625 144 144 111.765625 144 72 C 144 52.90625 136.414062 34.589844 122.910156 21.089844 C 109.410156 7.585938 91.097656 0 72 0 M 21.121094 108.078125 L 23.359375 91.359375 C 50.320312 91.359375 54.878906 36.238281 54.878906 36.238281 L 72 36.238281 C 59.839844 115.359375 21.121094 108.078125 21.121094 108.078125 M 87.121094 106.160156 L 63.121094 106.160156 L 74.878906 36.078125 L 98.878906 36.078125 C 121.28125 36.078125 129.601562 53.597656 126.71875 71.199219 C 124.1875 91.152344 107.230469 106.117188 87.121094 106.160156"/></svg>';
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const E=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const say=t=>{try{toast(t)}catch(e){}};
const uid=()=>([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));

/* ---------- constants ---------- */
const SIZES={'1:1':'1080×1080','4:5':'1080×1350','9:16':'1080×1920','16:9':'1920×1080'};
const PLATS={'FB/IG Feed':['4:5','1:1'],'Stories':['9:16'],'Reels':['9:16'],'TikTok':['9:16'],'Catalogue (DPA)':['1:1'],'YouTube':['16:9','9:16']};
const VLEN=['','6s','10s','15s','20s','30s','45s+'];
const isVid=a=>/video|motion/i.test(a.format||'');const conceptKey=a=>String(a.headline||a.overlay||a.name||'').toUpperCase().replace(/[^A-Z0-9%$]+/g,' ').trim();
const VREC={'FB/IG Feed':'6–15s','Stories':'6–15s','Reels':'9–15s','TikTok':'9–21s','Catalogue (DPA)':'n/a','YouTube':'6s bumper · 15–30s'};
const FORMATS=['Static','Video','Carousel','Motion (GIF)','Catalogue frame'];
const CTAS=['Shop Now','Shop the sale','Learn More','Get notified','Download app','Sign up'];
const STATUS=['Not started','Briefed','In design','In review','Approved','Live'];
const EXTRA=[
 {name:"TNF Women's 1996 Retro Nuptse",url:'https://jdsports.ca/products/the-north-face-womens-1996-retro-nuptse-jacket-black-black'},
 {name:'TNF 1996 Retro Nuptse',url:'https://jdsports.ca/products/the-north-face-1996-retro-nupste-jacket-recycled-tnf-black'},
 {name:'Nike Club Fleece Hoodie (Ale Brown)',url:'https://jdsports.ca/products/nike-club-fleece-hoodie-ale-brown'},
 {name:'Nike Club Fleece Bungee Pants',url:'https://jdsports.ca/products/nike-club-fleece-bungee-pants-black'},
 {name:'Nike Tech Fleece Joggers',url:'https://jdsports.ca/products/nike-tech-fleece-jogger-black-black'},
 {name:"Nike Women's Tech Fleece Joggers (Pink)",url:'https://jdsports.ca/products/nike-sportswear-womens-mid-rise-tech-fleece-joggers-pink-rise-black'},
 {name:'Black Friday sale',url:'https://jdsports.ca/collections/black-friday'},
 {name:"Men's sale",url:'https://jdsports.ca/collections/mens-sale'},
 {name:"Women's sale",url:'https://jdsports.ca/collections/womens-sale'},
 {name:"Kids' sale",url:'https://jdsports.ca/collections/kids-sale'}];
const catalog=()=>[...(D.products||[]).map(p=>({name:p.name+(p.colour?' ('+p.colour.split('/')[0].trim()+')':''),url:p.url})),...EXTRA];
const slugName=u=>{try{const s=new URL(u).pathname.split('/').filter(Boolean).pop()||u;return s.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).slice(0,60)}catch(e){return u}};
const absUrl=u=>!u?'':/^https?:/.test(u)?u:'https://'+u.replace(/^\/+/,'').replace(/^(?!jdsports\.ca)/,'jdsports.ca/');

/* ---------- storage: Supabase or local ---------- */
let MODE='remote', ME=ls.get('jd-email','');
async function api(path,opt={}){
  const r=await fetch(SB.u+path,{...opt,headers:{apikey:SB.k,Authorization:'Bearer '+SB.k,'Content-Type':'application/json',Prefer:'return=representation',...(opt.headers||{})}});
  if(!r.ok)throw new Error(r.status+' '+(await r.text()).slice(0,200));const t=await r.text();return t?JSON.parse(t):null}
const LS={k:'bb-local',db(){return ls.get(this.k,{briefs:[],assets:[],queue:[]})},save(d){ls.set(this.k,d)}};
const now=()=>new Date().toISOString();
const store={
 async briefs(){if(MODE==='remote')return api('bb_briefs?select=*&order=updated_at.desc');return LS.db().briefs.sort((a,b)=>b.updated_at.localeCompare(a.updated_at))},
 async addBrief(b){b={id:uid(),created_at:now(),updated_at:now(),status:'Draft',deadline_mode:'single',settings:{},project:'bfcm-2026',owner_email:ME,...b};
  if(MODE==='remote')return (await api('bb_briefs',{method:'POST',body:JSON.stringify(b)}))[0];const d=LS.db();d.briefs.push(b);LS.save(d);return b},
 async patchBrief(id,p){p={...p,updated_by:ME};if(MODE==='remote')return api('bb_briefs?id=eq.'+id,{method:'PATCH',body:JSON.stringify(p)});const d=LS.db();Object.assign(d.briefs.find(x=>x.id===id)||{},p,{updated_at:now()});LS.save(d)},
 async delBrief(id){if(MODE==='remote')return api('bb_briefs?id=eq.'+id,{method:'DELETE'});const d=LS.db();d.briefs=d.briefs.filter(x=>x.id!==id);d.assets=d.assets.filter(a=>a.brief_id!==id);LS.save(d)},
 async assets(bid){if(MODE==='remote')return api('bb_assets?select=*&brief_id=eq.'+bid+'&order=ord.asc,created_at.asc');return LS.db().assets.filter(a=>a.brief_id===bid).sort((a,b)=>a.ord-b.ord)},
 async addAsset(a){a={id:uid(),created_at:now(),updated_at:now(),updated_by:ME,...BLANK(),...a};if(MODE==='remote')return (await api('bb_assets',{method:'POST',body:JSON.stringify(a)}))[0];const d=LS.db();d.assets.push(a);LS.save(d);return a},
 async addAssets(list){list=list.map(a=>({id:uid(),created_at:now(),updated_at:now(),updated_by:ME,...BLANK(),...a}));if(MODE==='remote')return api('bb_assets',{method:'POST',body:JSON.stringify(list)});const d=LS.db();d.assets.push(...list);LS.save(d);return list},
 async counts(){let rows;if(MODE==='remote')rows=await api('bb_assets?select=brief_id');else rows=LS.db().assets;const c={};rows.forEach(r=>c[r.brief_id]=(c[r.brief_id]||0)+1);return c},
 async patchAsset(id,p){p={...p,updated_by:ME};if(MODE==='remote')return api('bb_assets?id=eq.'+id,{method:'PATCH',body:JSON.stringify(p),headers:{Prefer:'return=minimal'}});const d=LS.db();Object.assign(d.assets.find(x=>x.id===id)||{},p,{updated_at:now()});LS.save(d)},
 async delAsset(id){if(MODE==='remote')return api('bb_assets?id=eq.'+id,{method:'DELETE'});const d=LS.db();d.assets=d.assets.filter(x=>x.id!==id);LS.save(d)},
 async queue(bid){if(MODE==='remote')return api('bb_queue?select=*&brief_id=eq.'+bid+'&order=created_at.desc&limit=20');return LS.db().queue.filter(q=>q.brief_id===bid).reverse()},
 async enqueue(q){q={id:uid(),created_at:now(),status:'queued',requested_by:ME,...q};if(MODE==='remote')return (await api('bb_queue',{method:'POST',body:JSON.stringify(q)}))[0];const d=LS.db();d.queue.push(q);LS.save(d);return q},
 async cancel(id){if(MODE==='remote')return api('bb_queue?id=eq.'+id,{method:'PATCH',body:JSON.stringify({status:'cancelled'})});const d=LS.db();(d.queue.find(x=>x.id===id)||{}).status='cancelled';LS.save(d)}
};
const BLANK=()=>({theme:null,name:'New asset',source_type:null,source_id:null,source_url:null,format:'Static',sizes:['4:5','9:16'],platforms:['FB/IG Feed','Stories'],video_len:null,headline:'',overlay:'',primary_text:'',fr_text:'',cta:'Shop Now',cta_note:'',landing_url:'',landing_note:'',products:[],priority:3,impact:3,deadline:null,batch:null,notes:'',status:'Not started'});

/* ---------- email gate ---------- */
function gate(){
  if(ME&&DOMAINS.test(ME)){hello();return}
  const g=document.createElement('div');g.className='gate';g.innerHTML=`<form class="gc" novalidate>
   <div class="gr">${ROUNDEL}</div><h2>Briefing Room</h2>
   <p>JD Sports Canada paid media creative briefs. Enter your JD email to continue.</p>
   <input type="email" id="gm" placeholder="name@jdsports.ca" autocomplete="email" required>
   <div class="err" id="ge"></div><button class="btn y" type="submit" style="justify-content:center">Enter</button></form>`;
  document.body.appendChild(g);const i=g.querySelector('#gm');setTimeout(()=>i.focus(),50);
  g.querySelector('form').onsubmit=e=>{e.preventDefault();const v=i.value.trim().toLowerCase();
    if(!DOMAINS.test(v)){g.querySelector('#ge').textContent='Use your JD email address.';return}
    ME=v;ls.set('jd-email',v);g.remove();hello()};
}
async function hello(){
  const nav=document.querySelector('nav.bar .wrap');
  if(nav&&!document.getElementById('who')){const w=document.createElement('span');w.id='who';w.className='who';w.innerHTML=`${E(ME)} <button type="button" id="signout">Switch</button>`;nav.appendChild(w);
    w.querySelector('#signout').onclick=()=>{ls.set('jd-email','');location.reload()}}
  try{await api('bb_users',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({email:ME,last_seen:now()})})}catch(e){}
}

/* ---------- state ---------- */
const S={briefs:[],brief:null,assets:[],queue:[],loaded:false,poll:null,start:true,counts:{},closed:new Set()};
const cur=()=>S.brief;
async function loadBriefs(){
  try{S.briefs=await store.briefs()}catch(e){MODE='local';S.briefs=await store.briefs()}
  const want=ls.get('bb-active','');S.brief=S.briefs.find(b=>b.id===want)||S.briefs[0]||null;
  if(S.brief)await loadAssets();S.loaded=true}
async function loadAssets(){if(!S.brief)return;S.assets=await store.assets(S.brief.id);try{S.queue=await store.queue(S.brief.id)}catch(e){S.queue=[]}}
async function ensureBrief(){if(S.brief)return S.brief;const b=await store.addBrief({name:'BFCM 2026 · Paid social brief'});S.briefs.unshift(b);S.brief=b;ls.set('bb-active',b.id);S.assets=[];return b}

/* ---------- add from sources ---------- */
/* message themes */
const THEMES=()=>(D.house?.themes||[]);
const VS_T={VS01:'T11',VS02:'T11',VS03:'T9',VS04:'T12',VS05:'T12',VS06:'T13',VS07:'T13',VS08:'T14',VS09:'T14',VS10:'T14',VS11:'T9',VS12:'T9'};
const FAM_T={VB:'T5',VC:'T7',VG:'T8',VD:'T15'};
const GRP_T={'Catalogue':'T10','Gifting':'T8','Brand':'T5','Category':'T7','Persona':'T4','Product hero':'T6','Drop 2':'T15','Lo-fi':'T9','Social-first':'T9','Cyber Monday':'T1','French':'T1'};
const tByAngle=ids=>{for(const id of ids||[]){const t=THEMES().find(t=>t.angles.includes(id));if(t)return t.id}return null};
const tByVar=id=>VS_T[id]||FAM_T[String(id).slice(0,2)]||null;
const themeName=id=>THEMES().find(t=>t.id===id)?.name||'';
function fromVar(v){return{theme:tByVar(v.id),name:`${v.id} · ${v.headline}`.slice(0,90),source_type:'matrix',source_id:v.id,headline:v.headline,overlay:v.headline,primary_text:v.primary,fr_text:v.fr||'',cta:v.cta||'Shop Now',landing_url:absUrl(v.lp),landing_note:v.sub||'',notes:v.kw&&!/no search/i.test(v.kw)?'Search demand: '+v.kw:''}}
function fromAngle(a){return{theme:tByAngle([a.id]),name:`${a.id} · ${a.name}`,source_type:'angle',source_id:a.id,headline:a.headline,overlay:a.headline,primary_text:a.primary,cta:a.cta||'Shop Now',landing_note:a.sub||''}}
function fromMock(s){const sz=s.size.includes('1920')?['9:16']:s.size.includes('1080×1080')?['1:1']:['4:5'];const v=s.variation&&VAR[s.variation];
  const prods=catalog().filter(p=>s.products.toLowerCase().includes(p.name.toLowerCase().split(' (')[0].replace(/^(nike|adidas|puma|asics|new balance|tnf|the north face|ugg)\s+/i,'').slice(0,10).toLowerCase()));
  return{theme:(s.variation&&tByVar(s.variation))||GRP_T[s.group]||tByAngle(s.angles),name:s.title,source_type:'mockup',source_id:s.sid,source_url:'studio/'+s.file+'.png',format:'Static',sizes:sz,platforms:sz[0]==='9:16'?['Stories','Reels']:sz[0]==='1:1'?['FB/IG Feed','Catalogue (DPA)']:['FB/IG Feed'],
   headline:v?v.headline:'',overlay:s.title,primary_text:v?v.primary:(ANG[s.angles[0]]?.primary||''),fr_text:v?v.fr:'',cta:v?.cta||ANG[s.angles[0]]?.cta||'Shop Now',landing_url:v?absUrl(v.lp):'',
   products:prods.slice(0,4),notes:'Products in mockup: '+s.products+'. Prices are placeholders until 10 Nov.'}}
function fromAd(i){const vl=i.vlen?(i.vlen<=7?'6s':i.vlen<=11?'10s':i.vlen<=16?'15s':i.vlen<=24?'20s':i.vlen<=35?'30s':'45s+'):null;
  return{theme:(THEMES().find(t=>t.refs.includes(i.sid))?.id)||tByAngle(i.angles),name:`Inspired by ${i.brand} (${i.sid})`,source_type:'example',source_id:i.sid,source_url:i.img||null,format:i.video?'Video':(i.format==='Carousel'?'Carousel':'Static'),video_len:vl,
   sizes:['4:5','9:16'],platforms:['FB/IG Feed','Reels'],headline:'',overlay:i.headline||'',primary_text:'',notes:`Reference: ${i.brand} ${i.sid}. ${i.why||''}`.trim()}}
async function addFrom(kind,id){await ensureBrief();let a;
  if(kind==='var'){const v=VAR[id];if(!v)return;a=fromVar(v)}
  else if(kind==='angle'){const x=ANG[id];if(!x)return;a=fromAngle(x)}
  else if(kind==='mock'){const s=D.studio.find(x=>x.sid===id);if(!s)return;a=fromMock(s)}
  else if(kind==='ad'){const i=D.items.find(x=>x.sid===id);if(!i)return;a=fromAd(i)}
  else a={};
  a.brief_id=S.brief.id;a.ord=(S.assets.at(-1)?.ord||0)+1;
  try{const r=await store.addAsset(a);S.assets.push(r);say(`Added to “${S.brief.name}”`);if(!$('#v-brief').hidden)render()}catch(e){say('Could not add: '+e.message)}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-addbrief]');if(!b)return;e.preventDefault();e.stopPropagation();const [k,id]=b.dataset.addbrief.split(':');addFrom(k,id)},true);

/* ---------- waterfall ---------- */
const score=a=>(+a.priority||0)*(+a.impact||0);
function waterfall(st){const per=Math.max(1,+st.wf_per||4),gap=Math.max(1,+st.wf_gap||2);const start=st.wf_start?new Date(st.wf_start+'T12:00'):null,end=st.wf_end?new Date(st.wf_end+'T12:00'):null;
  const order=[...S.assets].sort((a,b)=>score(b)-score(a)||(a.ord-b.ord));const nb=Math.ceil(order.length/per);
  let step=gap;if(start&&end&&nb>1){const span=(end-start)/864e5;if((nb-1)*gap>span)step=Math.max(0,span/(nb-1))}
  return order.map((a,k)=>{const b=Math.floor(k/per);let d=null;if(start){d=new Date(start.getTime()+Math.round(b*step)*864e5);if(end&&d>end)d=end;d=d.toISOString().slice(0,10)}return{id:a.id,batch:b+1,deadline:d}})}


/* ---------- preloaded MVP brief ---------- */
const BF='https://jdsports.ca/collections/black-friday';
const MVP={name:'BFCM 2026 · MVP paid social brief',settings:{wf_start:'2026-11-03',wf_end:'2026-11-17',wf_per:4,wf_gap:3,fr:true},
 batches:[['2026-11-03','Launch essentials · live 14 Nov'],['2026-11-06','Tier-1 personas · live 14 Nov'],['2026-11-10','Creator, brand & product heroes · add by 17 Nov'],['2026-11-13','Drop 2 & BF weekend · live 26 Nov'],['2026-11-17','Ends soon & Cyber Monday · live 27–30 Nov']],
 rows:[
 // batch 1
 {sid:'JD-01',t:'T1',b:1,p:5,i:5,sizes:['4:5','9:16','1:1'],platforms:['FB/IG Feed','Stories','Reels'],headline:'UP TO 60% OFF',fr:"JUSQU'À 60 % DE RABAIS",lp:BF,why:'Core offer (T1). The always-on workhorse for prospecting and retargeting across all five phases. Story cut-down = JD-02.'},
 {sid:'JD-40',t:'T2',b:1,p:5,i:5,format:'Motion (GIF)',video_len:'6s',sizes:['4:5','9:16'],platforms:['FB/IG Feed','Stories','Reels'],headline:"IT'S ON.",fr:"C'EST PARTI. JUSQU'À 60 % DE RABAIS",lp:BF,why:"Launch announcer (T2). Runs from Early Access (14 Nov) through the online-only launch (15–18 Nov), so it has to be first off the line."},
 {sid:'JD-31',t:'T10',b:1,p:5,i:5,headline:'BLACK FRIDAY · UP TO 60% OFF',fr:'VENDREDI FOU · JUSQU’À 60 % DE RABAIS',lp:BF,why:'Catalogue (DPA) frame (T10). Highest-spend placement in 2025, so the frame must be approved before launch.'},
 {sid:'JD-03',t:'T1',b:1,p:5,i:4,sizes:['4:5','9:16'],platforms:['FB/IG Feed','Stories'],headline:'OUR BIGGEST SALE OF THE YEAR',fr:"NOTRE PLUS GRANDE SOLDE DE L'ANNÉE",lp:BF,why:'Brand-level launch line (A01). Story cut-down = JD-37.'},
 // batch 2
 {sid:'JD-45',t:'T4',b:2,p:4,i:5,sizes:['4:5','9:16'],platforms:['FB/IG Feed','Reels'],why:'Persona: sneakerhead (T4, tier 1). Biggest BFCM revenue persona.'},
 {sid:'JD-60',t:'T13',b:2,p:4,i:5,sizes:['4:5','9:16'],platforms:['FB/IG Feed','Stories'],why:'Persona: winter (T13 winter wardrobe). Outerwear and fleece demand peaks in BFCM week.'},
 {sid:'JD-43',t:'T4',b:2,p:4,i:4,sizes:['4:5','9:16'],platforms:['FB/IG Feed','Stories'],why:"Persona: runner (T4, tier 1)."},
 {sid:'JD-51',t:'T4',b:2,p:4,i:4,sizes:['4:5','9:16'],platforms:['FB/IG Feed','Stories'],why:"Persona: women's (T4, tier 1). Check the gifts-for-her page is relaunched before this goes live."},
 // batch 3
 {sid:'JD-62',t:'T9',b:3,p:4,i:4,format:'Video',video_len:'15s',sizes:['9:16','4:5'],platforms:['Reels','TikTok','Stories'],why:'Creator launch video (T9 + T14 native creator lines). Brief one creator, 2 hooks; the static mockup is the end-card reference.'},
 {sid:'JD-15',t:'T5',b:3,p:3,i:4,why:'Brand co-op (T5). Nike first; duplicate the row for adidas (JD-16) and New Balance (JD-17) once co-op terms are confirmed.'},
 {sid:'JD-46',t:'T6',b:3,p:3,i:4,sizes:['4:5','1:1'],platforms:['FB/IG Feed','Catalogue (DPA)'],why:'Product hero (T6). Swap in the confirmed top seller and real price on 10 Nov.'},
 {sid:'JD-20',t:'T8',b:3,p:3,i:4,why:'Gifting starts (T8). Under-$50 and gifts-for-him/her can follow as duplicates.'},
 // batch 4
 {sid:'JD-76',t:'T15',b:4,p:3,i:4,sizes:['4:5','9:16'],platforms:['FB/IG Feed','Stories','Reels'],why:'Drop 2 announcer (T15). Gives lapsed visitors a new reason to come back on 26 Nov.'},
 {sid:'JD-77',t:'T15',b:4,p:3,i:3,format:'Motion (GIF)',video_len:'6s',why:'Drop 2 Story/Reels version. Quick motion cut of the line-up.'},
 {sid:'JD-07',t:'T3',b:4,p:3,i:3,headline:'LAST SIZES',fr:'DERNIÈRES TAILLES',lp:BF,why:'Scarcity (T3) for BF weekend retargeting. Feed the real low-stock SKUs.'},
 {sid:'JD-59',t:'T12',b:4,p:3,i:3,why:"Social proof (T12). Confirm Canada's #1 sneaker from sales data before final."},
 // batch 5
 {sid:'JD-55',t:'T11',b:5,p:3,i:3,format:'Video',video_len:'10s',sizes:['9:16'],platforms:['Reels','TikTok','Stories'],why:'Ends soon (T11) native creator caption. FR version = JD-57.'},
 {sid:'JD-12',t:'T1',b:5,p:2,i:4,sizes:['4:5','9:16'],platforms:['FB/IG Feed','Stories'],headline:'EXTRA 20% OFF',fr:'20 % DE RABAIS SUPPLÉMENTAIRE',lp:BF,why:'Cyber Monday stack (P5). Show the price maths. Story = JD-13, FR = JD-36.'},
 {sid:'JD-32',t:'T10',b:5,p:2,i:4,headline:'CYBER MONDAY · EXTRA 20% OFF',fr:'CYBERLUNDI · 20 % DE RABAIS SUPPLÉMENTAIRE',lp:BF,why:'Cyber Monday catalogue frame (T10). Swaps in on 30 Nov.'},
 {sid:'JD-14',t:'T2',b:5,p:2,i:3,headline:'ENDS TONIGHT',fr:'SE TERMINE CE SOIR',lp:BF,why:'Hard deadline for the final 24 hours of Cyber Monday.'}
 ]};
function mvpAssets(bid){return MVP.rows.map((r,k)=>{const s=D.studio.find(x=>x.sid===r.sid);const a=s?fromMock(s):{name:r.sid};
  const o={...a,theme:r.t||a.theme||null,brief_id:bid,ord:k+1,priority:r.p,impact:r.i,batch:r.b,deadline:MVP.batches[r.b-1][0],status:'Not started'};
  ['format','video_len','sizes','platforms'].forEach(f=>{if(r[f])o[f]=r[f]});
  if(r.headline){o.headline=r.headline;if(!o.overlay)o.overlay=r.headline}if(r.fr&&!o.fr_text)o.fr_text=r.fr;if(r.lp&&!o.landing_url)o.landing_url=r.lp;if(!o.landing_url)o.landing_url=BF;
  if(!o.headline)o.headline=(s&&ANG[s.angles[0]]?.headline)||'';
  o.notes=`Batch ${r.b}: ${MVP.batches[r.b-1][1]}. ${r.why} ${o.notes||''}`.trim();return o})}
async function createMVP(){const v=S.briefs.filter(x=>x.settings?.origin==='mvp').length+1;const b=await store.addBrief({name:MVP.name+(v>1?' v'+v:''),deadline_mode:'waterfall',settings:{...MVP.settings,origin:'mvp'}});S.briefs.unshift(b);S.brief=b;ls.set('bb-active',b.id);
  await store.addAssets(mvpAssets(b.id));await loadAssets();S.start=false;render();say('MVP brief loaded: '+S.assets.length+' assets in 5 batches')}
async function createBlank(name){const b=await store.addBrief({name:name||'BFCM 2026 · New brief',settings:{origin:'scratch'}});S.briefs.unshift(b);S.brief=b;ls.set('bb-active',b.id);S.assets=[];S.queue=[];S.start=false;render()}
function startPage(el){const n=MVP.rows.length;const deliv=MVP.rows.reduce((t,r)=>t+((r.sizes||[...(D.studio.find(x=>x.sid===r.sid)?.size.includes('1920')?['9:16']:D.studio.find(x=>x.sid===r.sid)?.size.includes('1080×1080')?['1:1']:['4:5'])]).length*2),0);
  const thumbs=MVP.rows.slice(0,8).map(r=>{const s=D.studio.find(x=>x.sid===r.sid);return s?`<img src="studio/${s.file}.jpg" alt="">`:''}).join('');
  el.innerHTML=`<div class="bb"><div class="bb-start">
   <div class="bs-head"><span class="lbl" style="color:var(--y)">Brief Builder</span><h2 class="disp">Start a brief</h2><p>Pick a starting point. Either way you can add, remove and edit every asset afterwards.</p></div>
   <div class="bs-opts">
    <button type="button" class="bs-card rec" id="bs-mvp"><span class="bs-badge">Recommended</span>
     <div class="bs-thumbs">${thumbs}</div>
     <h3 class="disp">Preloaded MVP brief</h3>
     <p>The minimum set to launch BFCM well: core offer, launch, catalogue frames, tier-1 personas, creator video, Drop 2 and Cyber Monday. Copy, French, CTAs, landing pages, sizes and channels are filled in, and assets are ranked by priority × impact into 5 delivery batches.</p>
     <div class="bs-stats"><div><b>${n}</b><span>assets</span></div><div><b>${deliv}</b><span>deliverables EN/FR</span></div><div><b>5</b><span>batches</span></div><div><b>3–17</b><span>Nov due dates</span></div></div>
     <ol class="bs-batches">${MVP.batches.map((x,k)=>`<li><b>Batch ${k+1} · ${E(fmtD(x[0]))}</b> ${E(x[1])} <span class="cnt">(${MVP.rows.filter(r=>r.b===k+1).length})</span></li>`).join('')}</ol>
     <span class="btn y bs-go">Load MVP brief →</span></button>
    <div class="bs-card" id="bs-scratch">
     <div class="bs-blank" aria-hidden="true"><span>+</span></div>
     <h3 class="disp">Build from scratch</h3>
     <p>Start with an empty brief and add assets from the Messaging Matrix, JD Mockups or Library examples, or add blank rows.</p>
     <label class="bs-name">Brief name<input class="bb-in" id="bs-n" value="BFCM 2026 · New brief"></label>
     <button type="button" class="btn bs-go" id="bs-blank">Start empty brief →</button></div>
   </div>
   ${S.briefs.length?`<div class="bs-list"><div class="row" style="justify-content:space-between"><h3 class="disp" style="margin:0;font-size:34px">Your briefs <span class="cnt" style="font-family:var(--body)">${S.briefs.length}</span></h3><span class="cnt">Keep as many versions as you like. Load the MVP again or start another from scratch to compare.</span></div>
    <div class="bs-grid">${S.briefs.map(x=>{const o=x.settings?.origin;return `<div class="bs-item${cur()&&x.id===cur().id?' on':''}"><div class="row" style="gap:6px"><span class="bs-tag ${o==='mvp'?'mvp':''}">${o==='mvp'?'Preloaded MVP':o==='scratch'?'From scratch':o==='copy'?'Copy':'Brief'}</span><span class="cnt">${S.counts[x.id]||0} assets</span></div>
     <b>${E(x.name)}</b><span class="cnt">Updated ${new Date(x.updated_at).toLocaleString('en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}${x.updated_by||x.owner_email?' · '+E((x.updated_by||x.owner_email).split('@')[0]):''}</span>
     <div class="row" style="gap:6px;margin-top:auto"><button type="button" class="btn y" data-open="${x.id}">Open</button><button type="button" class="btn g" data-copyb="${x.id}">Duplicate</button><button type="button" class="btn g" data-delb="${x.id}">Delete</button></div></div>`}).join('')}</div></div>`:''}
   ${modeNote()}</div></div>`;
  el.querySelector('#bs-mvp').onclick=async e=>{const t=e.currentTarget;if(t.dataset.busy)return;t.dataset.busy=1;t.querySelector('.bs-go').textContent='Loading…';try{await createMVP()}catch(err){say('Could not load: '+err.message);delete t.dataset.busy}};
  el.querySelector('#bs-blank').onclick=()=>createBlank(el.querySelector('#bs-n').value.trim());
  el.querySelectorAll('[data-open]').forEach(b=>b.onclick=async()=>{S.brief=S.briefs.find(x=>x.id===b.dataset.open);ls.set('bb-active',S.brief.id);await loadAssets();S.start=false;render();window.scrollTo({top:$('#v-brief').offsetTop-80})});
  el.querySelectorAll('[data-copyb]').forEach(b=>b.onclick=async()=>{b.textContent='Copying…';await dupBrief(S.briefs.find(x=>x.id===b.dataset.copyb));S.counts=await store.counts().catch(()=>({}));S.start=true;render()});
  el.querySelectorAll('[data-delb]').forEach(b=>b.onclick=async()=>{if(!b.dataset.sure){b.dataset.sure=1;b.textContent='Click to confirm';b.style.background='#FF6B6B';b.style.color='#000';return}
    await store.delBrief(b.dataset.delb);S.briefs=S.briefs.filter(x=>x.id!==b.dataset.delb);if(S.brief?.id===b.dataset.delb){S.brief=S.briefs[0]||null;ls.set('bb-active',S.brief?.id||'');await loadAssets()}render()})}
async function dupBrief(src){const srcA=src.id===S.brief?.id?S.assets:await store.assets(src.id);const nb=await store.addBrief({name:src.name+' (copy)',deadline_mode:src.deadline_mode,settings:{...(src.settings||{}),origin:'copy'}});
  if(srcA.length)await store.addAssets(srcA.map(a=>{const {id,created_at,updated_at,clickup_task_id,clickup_url,clickup_status,clickup_synced_at,...rest}=a;return {...rest,brief_id:nb.id}}));S.briefs.unshift(nb);say('Duplicated as “'+nb.name+'”');return nb}

/* ---------- render ---------- */
const fmtD=d=>d?new Date(d+'T12:00').toLocaleDateString('en-CA',{weekday:'short',day:'numeric',month:'short'}):'';
function chips(name,opts,sel,id){return `<div class="bb-chips">${opts.map(o=>`<button type="button" class="bb-chip" data-chip="${name}" data-id="${id}" data-v="${E(o)}" aria-pressed="${sel.includes(o)}">${E(o)}</button>`).join('')}</div>`}
function srcCell(a){let thumb='',link='';
  if(a.source_type==='mockup'){const s=D.studio.find(x=>x.sid===a.source_id);if(s){thumb=`<img src="studio/${s.file}.jpg" alt="">`;link=`<a href="#${s.sid}">${s.sid} mockup ↗</a>`}}
  else if(a.source_type==='example'){const i=D.items.find(x=>x.sid===a.source_id);if(i){thumb=i.img?`<img src="${i.img}" alt="">`:'';link=`<a href="#${i.sid}">${i.sid} example ↗</a>`}}
  else if(a.source_type==='matrix')link=`<a href="#messaging">${E(a.source_id)} matrix ↗</a>`;
  else if(a.source_type==='angle')link=`<a href="#messaging">${E(a.source_id)} angle ↗</a>`;
  const L=cur()?.settings?.fr===false?1:2,n=(a.sizes||[]).length*L;
  return `<div class="bb-src">${thumb}<div style="flex:1;min-width:0"><textarea rows="2" class="hlx" data-f="name" data-id="${a.id}">${E(a.name)}</textarea>${link}<div class="bb-files ${isVid(a)?'v':'i'}">${isVid(a)?'▶ Video':'▣ Image'} · ${(a.sizes||[]).length} size${(a.sizes||[]).length===1?'':'s'}${L>1?' × EN/FR':''} = <b>${n}</b> file${n===1?'':'s'}</div></div></div>`}
function tagCell(a){return `<div class="bb-chips">${(a.products||[]).map((p,k)=>`<span class="bb-tag"><a href="${E(p.url)}" target="_blank" rel="noopener" title="${E(p.url)}">${E(p.name)}</a><button type="button" data-untag="${a.id}" data-k="${k}" aria-label="Remove">×</button></span>`).join('')}</div>
  <div class="bb-tagin"><input type="text" data-tagin="${a.id}" placeholder="+ product or paste URL" autocomplete="off"></div>`}
function stCell(a){const s=a.clickup_status||a.status||'Not started';const c=/live|approved|complete|done/i.test(s)?'done':/design|review|progress|briefed/i.test(s)?'prog':'';
  return `<span class="bb-st ${c}">${E(s)}</span>${a.clickup_url?`<div><a class="sm" href="${E(a.clickup_url)}" target="_blank" rel="noopener" style="color:var(--y)">ClickUp ↗</a></div>`:''}
  <select data-f="status" data-id="${a.id}" style="margin-top:6px" aria-label="Status">${STATUS.map(x=>`<option ${x===a.status?'selected':''}>${x}</option>`).join('')}</select>`}
function sizeChips(a){return `<div class="bb-chips">${Object.keys(SIZES).map(o=>`<button type="button" class="bb-chip bb-sz" data-chip="sizes" data-id="${a.id}" data-v="${o}" aria-pressed="${(a.sizes||[]).includes(o)}"><b>${o}</b><span>${SIZES[o]}</span></button>`).join('')}</div>`}
function fld(label,html,cls=''){return `<label class="bc-f ${cls}"><span class="lbl">${label}</span>${html}</label>`}
function row(a,i){const isV=isVid(a);const rec=[...new Set((a.platforms||[]).map(p=>VREC[p]).filter(x=>x&&x!=='n/a'))].join(' · ');
  const mode=cur().deadline_mode;const L=cur()?.settings?.fr===false?1:2,n=(a.sizes||[]).length*L;const open=!S.closed.has(a.id);
  let thumb='',link='';
  if(a.source_type==='mockup'){const s=D.studio.find(x=>x.sid===a.source_id);if(s){thumb=`<img src="studio/${s.file}.jpg" alt="">`;link=`<a href="#${s.sid}">${s.sid} mockup ↗</a>`}}
  else if(a.source_type==='example'){const it=D.items.find(x=>x.sid===a.source_id);if(it){thumb=it.img?`<img src="${it.img}" alt="">`:'';link=`<a href="#${it.sid}">${it.sid} example ↗</a>`}}
  else if(a.source_type==='matrix'||a.source_type==='angle')link=`<a href="#messaging">${E(a.source_id)} matrix ↗</a>`;
  return `<article class="bb-card" data-row="${a.id}">
  <div class="bc-head">
   <span class="bc-n">${i+1}</span>
   <div class="bc-thumb">${thumb||`<span>${isV?'▶':'▣'}</span>`}</div>
   <div class="bc-name"><textarea rows="1" class="hlx" data-f="name" data-id="${a.id}" aria-label="Asset name">${E(a.name)}</textarea>
    <div class="bc-meta">${link}<span class="bb-files ${isV?'v':'i'}">${isV?'▶ Video':'▣ Image'} · <b>${n}</b> file${n===1?'':'s'}</span></div></div>
   ${fld('Message theme',`<select data-f="theme" data-id="${a.id}" class="bb-theme${a.theme?'':' none'}"><option value="">– Pick a theme –</option>${THEMES().map(t=>`<option value="${t.id}" ${t.id===a.theme?'selected':''}>${t.id} · ${E(t.name)}</option>`).join('')}</select>`,'w-theme')}
   <div class="bc-pi">${fld('Priority',`<select data-f="priority" data-id="${a.id}">${[5,4,3,2,1].map(k=>`<option value="${k}" ${k==a.priority?'selected':''}>${k}</option>`).join('')}</select>`)}${fld('Impact',`<select data-f="impact" data-id="${a.id}">${[5,4,3,2,1].map(k=>`<option value="${k}" ${k==a.impact?'selected':''}>${k}</option>`).join('')}</select>`)}<div class="bc-f"><span class="lbl">Score</span><span class="bb-score">${score(a)}</span></div></div>
   ${fld('Deadline'+(mode==='waterfall'&&a.batch?` <span class="bb-batch">Batch ${a.batch}</span>`:''),mode==='single'?`<div class="sm" style="padding:7px 0">${E(fmtD(cur().settings?.single)||'Set date above')}</div>`:`<input type="date" data-f="deadline" data-id="${a.id}" value="${E(a.deadline||'')}">`,'w-date')}
   <div class="bc-f w-st"><span class="lbl">Status</span>${stCell(a)}</div>
   <div class="bc-act"><button type="button" class="bb-ib" data-gen="${a.id}" title="Generate mockup">✨ Mockup</button><button type="button" class="bb-ib" data-dup="${a.id}" title="Duplicate">⧉</button><button type="button" class="bb-ib" data-up="${a.id}" title="Move up">↑</button><button type="button" class="bb-ib" data-del="${a.id}" title="Remove">🗑</button></div>
  </div>
  <div class="bc-spec">
   ${fld('Format',`<select data-f="format" data-id="${a.id}">${FORMATS.map(f=>`<option ${f===a.format?'selected':''}>${f}</option>`).join('')}</select>`,'w-fmt')}
   <div class="bc-f w-ch"><span class="lbl">Channels</span>${chips('platforms',Object.keys(PLATS),a.platforms||[],a.id)}</div>
   <div class="bc-f w-sz"><span class="lbl">Sizes</span>${sizeChips(a)}</div>
   <div class="bc-f w-vl"><span class="lbl">Video length</span>${isV?`<select data-f="video_len" data-id="${a.id}">${VLEN.map(v=>`<option value="${v}" ${v===(a.video_len||'')?'selected':''}>${v||'– set length –'}</option>`).join('')}</select>${rec?`<div class="bb-hint">Recommended: ${E(rec)}</div>`:''}`:`<div class="sm" style="padding:7px 0">Static image · no video</div>`}</div>
   <div class="bc-f w-dl"><span class="lbl">Deliverables</span><div class="bc-dl"><b>${n}</b> ${isV?'video':'image'} file${n===1?'':'s'}</div><div class="bb-dim">${(a.sizes||[]).length} size${(a.sizes||[]).length===1?'':'s'}${L>1?' × EN/FR':''}</div></div>
  </div>
  <details class="bc-copy" data-cid="${a.id}" ${open?'open':''}><summary><span>Copy, CTA, landing page &amp; products</span><span class="cnt">${E((a.headline||'').slice(0,60))}</span></summary>
   <div class="bc-grid">
    ${fld('Headline',`<textarea rows="2" class="hlx" data-f="headline" data-id="${a.id}" placeholder="Headline">${E(a.headline)}</textarea>`)}
    ${fld('Text overlay / supers',`<textarea rows="2" data-f="overlay" data-id="${a.id}" placeholder="Text on image">${E(a.overlay)}</textarea>`)}
    ${fld('Primary text',`<textarea rows="3" data-f="primary_text" data-id="${a.id}" placeholder="Primary text">${E(a.primary_text)}</textarea>`,'w2')}
    ${fld('French',`<textarea rows="3" data-f="fr_text" data-id="${a.id}" placeholder="French version">${E(a.fr_text)}</textarea>`)}
    ${fld('CTA',`<select data-f="cta" data-id="${a.id}">${[...new Set([a.cta,...CTAS])].filter(Boolean).map(c=>`<option ${c===a.cta?'selected':''}>${E(c)}</option>`).join('')}</select><textarea rows="2" class="sm" data-f="cta_note" data-id="${a.id}" placeholder="CTA note">${E(a.cta_note)}</textarea>`)}
    ${fld('Landing page'+(a.landing_url?` <a href="${E(a.landing_url)}" target="_blank" rel="noopener" style="color:var(--y)">Open ↗</a>`:''),`<input type="url" data-f="landing_url" data-id="${a.id}" placeholder="https://jdsports.ca/…" value="${E(a.landing_url)}"><textarea rows="2" class="sm" data-f="landing_note" data-id="${a.id}" placeholder="Landing page note">${E(a.landing_note)}</textarea>`)}
    <div class="bc-f"><span class="lbl">Product tags</span>${tagCell(a)}</div>
    ${fld('Notes for design',`<textarea rows="3" data-f="notes" data-id="${a.id}" placeholder="Notes for design">${E(a.notes)}</textarea>`,'w2')}
   </div></details></article>`}
function render(){const el=$('#v-brief');if(!el)return;
  if(!S.loaded){el.innerHTML='<div class="bb"><div class="note">Loading briefs…</div></div>';return}
  const b=cur();const sel=`<select id="bb-sel" aria-label="Brief">${S.briefs.map(x=>`<option value="${x.id}" ${b&&x.id===b.id?'selected':''}>${E(x.name)}</option>`).join('')}</select>`;
  if(!b||S.start){startPage(el);if(!S._cnt){S._cnt=1;store.counts().then(c=>{S.counts=c;S._cnt=0;if(S.start||!cur())startPage(el)}).catch(()=>{S._cnt=0})}return}
  const st=b.settings||{};const A=S.assets;const deliv=A.reduce((n,a)=>n+(a.sizes||[]).length*(st.fr===false?1:2),0);
  const vids=A.filter(a=>/video|motion/i.test(a.format)).length;const dates=A.map(a=>b.deadline_mode==='single'?st.single:a.deadline).filter(Boolean).sort();
  el.innerHTML=`<div class="bb">
  <div class="bb-top">${sel}<button class="btn g" id="bb-new">← All briefs</button><button class="btn g" id="bb-dupb">Duplicate brief</button><span class="sp" style="flex:1"></span><span class="bb-mode">${MODE==='remote'?'● Saved for the team':'● Saved in this browser only'}</span></div>
  <input class="bb-title" id="bb-name" value="${E(b.name)}" aria-label="Brief name">
  ${kpis(A,st,dates)}
  ${diversity(A)}
  <div class="bb-panel"><div class="row"><span class="lbl">Deadlines</span><div class="bb-seg" role="group">${[['single','One date'],['per','Per asset'],['waterfall','Waterfall']].map(([k,t])=>`<button type="button" data-mode="${k}" aria-pressed="${b.deadline_mode===k}">${t}</button>`).join('')}</div>
   <label class="row" style="gap:6px;margin-left:auto;font:600 12px var(--body);color:var(--fg2)"><input type="checkbox" id="bb-fr" ${st.fr===false?'':'checked'}> French version of every asset</label></div>
   ${b.deadline_mode==='single'?`<div class="bb-fields"><label>All assets due<input type="date" id="bb-single" value="${E(st.single||'')}"></label></div>`:''}
   ${b.deadline_mode==='per'?`<div class="cnt">Set a date on each row in the Deadline column.</div>`:''}
   ${b.deadline_mode==='waterfall'?`<div class="bb-fields"><label>First batch due<input type="date" id="wf_start" value="${E(st.wf_start||'')}"></label><label>Last batch due by<input type="date" id="wf_end" value="${E(st.wf_end||'')}"></label><label>Assets per batch<input type="number" min="1" id="wf_per" value="${E(st.wf_per||4)}" style="width:90px"></label><label>Days between batches<input type="number" min="1" id="wf_gap" value="${E(st.wf_gap||2)}" style="width:90px"></label><button class="btn y" id="wf_go" type="button">Plan batches</button></div>
   <div class="cnt">Ranks assets by Priority × Impact (both editable in the table), groups them into batches and spaces the dates to fit your window. Edit any date afterwards.</div>`:''}</div>
  <div class="row"><button class="btn y" id="bb-add">+ Add assets</button><button class="btn g" id="bb-blank">+ Blank asset</button><span style="flex:1"></span>
   <button class="btn" id="bb-sheet">⤓ Export to Google Sheet</button><button class="btn" id="bb-cu">➜ Send to ClickUp</button></div>
  ${A.length?`<div class="row bb-cardbar"><span class="cnt">${A.length} assets</span><span style="flex:1"></span><button type="button" class="btn g" id="bb-collapse">${S.closed.size>=A.length?'Expand all copy':'Collapse all copy'}</button></div><div class="bb-cards">${A.filter(a=>!S.tf||(S.tf==='none'?!a.theme:a.theme===S.tf)).map(row).join('')}</div>`
   :`<div class="bb-empty">No assets yet. Use <b>+ Add assets</b>, or the <b>+ Brief</b> buttons on the Messaging Matrix, JD Mockups and Library.</div>`}
  ${qPanel()}${modeNote()}
  <div class="row"><button class="btn g" id="bb-delb" style="margin-left:auto">Delete this brief</button></div></div>`;
  autosize(el)}
function kpis(A,st,dates){const L=st.fr===false?1:2,f=a=>(a.sizes||[]).length*L;
  const con=new Set(A.map(conceptKey).filter(Boolean)),iA=A.filter(a=>!isVid(a)),vA=A.filter(isVid);
  const iC=new Set(iA.map(conceptKey).filter(Boolean)).size,vC=new Set(vA.map(conceptKey).filter(Boolean)).size;
  const iD=iA.reduce((t,a)=>t+f(a),0),vD=vA.reduce((t,a)=>t+f(a),0),tot=iD+vD,pct=tot?Math.round(iD/tot*100):0;
  return `<div class="bb-kpis k5">
   <div class="bb-kpi"><span class="lbl">Ad variations</span><b>${con.size}</b><small>Unique message concepts</small></div>
   <div class="bb-kpi"><span class="lbl">Total deliverables</span><b>${tot}</b><small>${A.length} asset${A.length===1?'':'s'} × sizes${L>1?' × EN/FR':''}</small></div>
   <div class="bb-kpi"><span class="lbl">▣ Image</span><b>${iC}<i> var</i> · ${iD}<i> files</i></b><small>${iA.length} image asset${iA.length===1?'':'s'}</small></div>
   <div class="bb-kpi"><span class="lbl">▶ Video</span><b>${vC}<i> var</i> · ${vD}<i> files</i></b><small>${vA.length} video asset${vA.length===1?'':'s'}</small></div>
   <div class="bb-kpi"><span class="lbl">First / last deadline</span><b style="font-size:26px">${dates.length?E(fmtD(dates[0]))+' → '+E(fmtD(dates.at(-1))):'–'}</b></div>
   <div class="bb-split" title="Image vs video share of deliverables"><span style="width:${pct}%"></span><em>Image ${pct}% · Video ${tot?100-pct:0}% of deliverables</em></div></div>`}
function diversity(A){const T=THEMES();if(!T.length)return '';const c={};A.forEach(a=>{if(a.theme)c[a.theme]=(c[a.theme]||0)+1});
  const cov=T.filter(t=>c[t.id]).length,none=A.filter(a=>!a.theme).length,max=Math.max(1,...Object.values(c));const heavy=T.filter(t=>A.length>=6&&c[t.id]/A.length>0.3);
  return `<div class="bb-panel bb-div"><div class="row" style="justify-content:space-between;gap:10px"><div><span class="lbl">Creative diversity · message themes</span><div class="bb-cov"><b>${cov}</b>/${T.length} themes covered${none?` · <button type="button" class="bb-link" data-tf="none">${none} untagged</button>`:''}</div></div>
   <div class="cnt">${S.tf?`Showing ${S.tf==='none'?'untagged assets':E(S.tf+' · '+themeName(S.tf))} · <button type="button" class="bb-link" data-tf="">Show all</button>`:'Click a theme to filter the table.'}</div></div>
   <div class="bb-themes">${T.map(t=>{const n=c[t.id]||0;return `<button type="button" class="bb-th${n?' on':''}${S.tf===t.id?' sel':''}" data-tf="${t.id}" title="${E(t.name)}: ${n} asset${n===1?'':'s'}"><span class="ck">${n?'✓':''}</span><span class="nm"><i>${t.id}</i> ${E(t.name)}</span><span class="ct">${n}</span><span class="br"><span style="width:${n/max*100}%"></span></span></button>`}).join('')}</div>
   ${heavy.length?`<div class="cnt" style="color:#FF6B6B">Heavy on ${heavy.map(t=>E(t.name)).join(', ')} (over 30% of assets). Consider swapping some for uncovered themes.</div>`:''}</div>`}
function qPanel(){if(!S.queue.length)return '';const T={export_sheet:'Google Sheet export',generate_mockup:'New mockup',send_clickup:'Send to ClickUp'};
  return `<div class="bb-panel"><span class="lbl">Requests to Claude</span><div class="bb-q">${S.queue.map(q=>`<div class="bb-qi"><b>${T[q.kind]||q.kind}</b>${q.payload?.asset_name?' · '+E(q.payload.asset_name):''}<span class="bb-st ${q.status==='done'?'done':q.status==='queued'?'':'prog'}">${E(q.status)}</span><span class="cnt">${new Date(q.created_at).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'})} · ${E(q.requested_by||'')}</span>${q.result_url?`<a href="${E(q.result_url)}" target="_blank" rel="noopener">Open result ↗</a>`:''}${q.result_note?`<span>${E(q.result_note)}</span>`:''}${q.status==='queued'?`<button class="bb-ib" data-cancel="${q.id}" style="margin-left:auto">Cancel</button>`:''}</div>`).join('')}</div>
  <div class="cnt">Claude picks these up when Ryan runs the queue (and on the scheduled check). ClickUp tasks are created only after Ryan approves.</div></div>`}
function modeNote(){return MODE==='local'?`<div class="bb-warn"><b>Browser-only mode.</b> This copy of the Briefing Room can't reach the team database, so briefs are saved in this browser only. Open the team site (jd-ecomm.github.io/jd-ad-briefing-room) to share briefs and send requests to Claude.</div>`:''}
function autosize(root){root.querySelectorAll('.bb-card textarea').forEach(t=>{t.style.height='auto';t.style.height=Math.min(240,t.scrollHeight+2)+'px'})}

/* ---------- events ---------- */
const deb={};function saveField(id,f,v){clearTimeout(deb[id+f]);deb[id+f]=setTimeout(async()=>{try{await store.patchAsset(id,{[f]:v})}catch(e){say('Save failed: '+e.message)}},450)}
function A_(id){return S.assets.find(a=>a.id===id)}
function bind(){const el=$('#v-brief');
 el.addEventListener('toggle',e=>{const d=e.target;if(!d.dataset||!d.dataset.cid)return;if(d.open)S.closed.delete(d.dataset.cid);else S.closed.add(d.dataset.cid);const b=$('#bb-collapse');if(b)b.textContent=S.closed.size>=S.assets.length?'Expand all copy':'Collapse all copy';if(d.open)autosize(d)},true);
 el.addEventListener('input',e=>{const t=e.target;
   if(t.dataset.f&&t.dataset.id){const a=A_(t.dataset.id);if(!a)return;let v=t.value;if(t.dataset.f==='priority'||t.dataset.f==='impact')v=+v;a[t.dataset.f]=v===''&&t.dataset.f==='deadline'?null:v;saveField(a.id,t.dataset.f,a[t.dataset.f]);if(t.tagName==='TEXTAREA'){t.style.height='auto';t.style.height=Math.min(240,t.scrollHeight+2)+'px'}}
   if(t.id==='bb-name'){cur().name=t.value;clearTimeout(deb.bn);deb.bn=setTimeout(()=>store.patchBrief(cur().id,{name:t.value}).then(()=>{const o=$('#bb-sel option:checked');if(o)o.textContent=t.value}),500)}
   if(t.dataset.tagin)suggest(t)});
 el.addEventListener('change',async e=>{const t=e.target;
   if(t.dataset.f&&(t.tagName==='SELECT'||t.type==='date')){if(['format','priority','impact','status','theme'].includes(t.dataset.f))render()}
   if(t.id==='bb-sel'){S.brief=S.briefs.find(b=>b.id===t.value);ls.set('bb-active',S.brief.id);await loadAssets();render()}
   if(t.id==='bb-single'||/^wf_/.test(t.id)||t.id==='bb-fr'){const st={...(cur().settings||{})};if(t.id==='bb-single')st.single=t.value;else if(t.id==='bb-fr')st.fr=t.checked;else st[t.id]=t.value;cur().settings=st;await store.patchBrief(cur().id,{settings:st});if(t.id!=='bb-single'||true)render()}});
 el.addEventListener('keydown',e=>{const t=e.target;if(!t.dataset.tagin)return;const box=t.parentElement.querySelector('.bb-sug');
   if(e.key==='Enter'){e.preventDefault();const on=box&&box.querySelector('div.on')||box&&box.querySelector('div');if(on&&!/^https?:/.test(t.value.trim()))addTag(t.dataset.tagin,{name:on.dataset.n,url:on.dataset.u});else if(t.value.trim())addTag(t.dataset.tagin,parseTag(t.value))}
   if(e.key==='ArrowDown'&&box){const ds=[...box.children];const i=ds.findIndex(d=>d.classList.contains('on'));ds.forEach(d=>d.classList.remove('on'));(ds[i+1]||ds[0]).classList.add('on');e.preventDefault()}
   if(e.key==='Escape'&&box)box.remove()});
 el.addEventListener('focusout',e=>{if(e.target.dataset.tagin)setTimeout(()=>e.target.parentElement?.querySelector('.bb-sug')?.remove(),180)});
 el.addEventListener('click',async e=>{const t=e.target.closest('button,[data-sug]');if(!t)return;const b=cur();
   if(t.dataset.sug!==undefined){const inp=t.closest('.bb-tagin').querySelector('input');addTag(inp.dataset.tagin,{name:t.dataset.n,url:t.dataset.u});return}
   if(t.id==='bb-new'){S.start=true;render();window.scrollTo({top:$('#v-brief').offsetTop-80});return}
   if(t.id==='bb-dupb'){const nb=await dupBrief(b);S.brief=nb;ls.set('bb-active',nb.id);await loadAssets();render();return}
   if(t.id==='bb-delb'){if(!t.dataset.sure){t.dataset.sure=1;t.textContent='Click again to delete';t.style.background='#FF6B6B';t.style.color='#000';setTimeout(()=>{if(t.isConnected){delete t.dataset.sure;t.textContent='Delete this brief';t.style.cssText='margin-left:auto'}},3000);return}
     await store.delBrief(b.id);S.briefs=S.briefs.filter(x=>x.id!==b.id);S.brief=S.briefs[0]||null;ls.set('bb-active',S.brief?.id||'');await loadAssets();render();return}
   if(t.dataset.mode){b.deadline_mode=t.dataset.mode;await store.patchBrief(b.id,{deadline_mode:b.deadline_mode});render();return}
   if(t.id==='wf_go'){const st=b.settings||{};if(!st.wf_start){say('Set the first batch date');return}const plan=waterfall(st);for(const p of plan){const a=A_(p.id);a.batch=p.batch;a.deadline=p.deadline;await store.patchAsset(a.id,{batch:p.batch,deadline:p.deadline})}
     S.assets.sort((x,y)=>(x.batch||99)-(y.batch||99)||score(y)-score(x));for(let k=0;k<S.assets.length;k++){if(S.assets[k].ord!==k+1){S.assets[k].ord=k+1;store.patchAsset(S.assets[k].id,{ord:k+1})}}render();say(`Planned ${Math.max(...plan.map(p=>p.batch))} batches`);return}
   if(t.dataset.tf!==undefined){S.tf=(S.tf===t.dataset.tf?'':t.dataset.tf);render();return}
   if(t.id==='bb-collapse'){if(S.closed.size>=S.assets.length)S.closed.clear();else S.assets.forEach(a=>S.closed.add(a.id));render();return}
   if(t.id==='bb-add'){picker();return}
   if(t.id==='bb-blank'){await addFrom('blank');return}
   if(t.dataset.chip){const a=A_(t.dataset.id);const f=t.dataset.chip;const v=t.dataset.v;let arr=[...(a[f]||[])];arr=arr.includes(v)?arr.filter(x=>x!==v):[...arr,v];
     if(f==='platforms'&&!a.platforms?.includes(v)){a.sizes=[...new Set([...(a.sizes||[]),...PLATS[v]])];store.patchAsset(a.id,{sizes:a.sizes})}
     a[f]=arr;await store.patchAsset(a.id,{[f]:arr});render();return}
   if(t.dataset.untag){const a=A_(t.dataset.untag);a.products=(a.products||[]).filter((_,k)=>k!=t.dataset.k);await store.patchAsset(a.id,{products:a.products});render();return}
   if(t.dataset.dup){const a=A_(t.dataset.dup);const {id,created_at,updated_at,clickup_task_id,clickup_url,clickup_status,clickup_synced_at,...rest}=a;const r=await store.addAsset({...rest,name:a.name+' (copy)',ord:a.ord+0.5});S.assets.splice(S.assets.indexOf(a)+1,0,r);renumber();render();return}
   if(t.dataset.up){const i=S.assets.findIndex(a=>a.id===t.dataset.up);if(i>0){[S.assets[i-1],S.assets[i]]=[S.assets[i],S.assets[i-1]];renumber();render()}return}
   if(t.dataset.del){const a=A_(t.dataset.del);if(!t.dataset.sure){t.dataset.sure=1;t.textContent='Confirm remove';return}await store.delAsset(a.id);S.assets=S.assets.filter(x=>x.id!==a.id);render();return}
   if(t.dataset.gen){const a=A_(t.dataset.gen);genDialog(a);return}
   if(t.dataset.cancel){await store.cancel(t.dataset.cancel);S.queue=await store.queue(b.id);render();return}
   if(t.id==='bb-sheet'){if(!S.assets.length){say('Add assets first');return}await req('export_sheet',{asset_count:S.assets.length});return}
   if(t.id==='bb-cu'){if(!S.assets.length){say('Add assets first');return}await req('send_clickup',{asset_count:S.assets.length,note:'Create one task per asset after Ryan approves.'});return}
 });
}
function renumber(){S.assets.forEach((a,k)=>{if(a.ord!==k+1){a.ord=k+1;store.patchAsset(a.id,{ord:k+1})}})}
function prompt2(label,def){return def}
async function req(kind,payload,asset){if(MODE!=='remote'){say('Open the team site to send requests to Claude');return}
  try{await store.enqueue({kind,brief_id:cur().id,asset_id:asset?.id||null,payload:{brief_name:cur().name,...payload}});S.queue=await store.queue(cur().id);render();
  say(kind==='send_clickup'?'Sent for approval. Claude will confirm before creating tasks.':kind==='export_sheet'?'Queued. Claude will build the Google Sheet.':'Queued. Claude will build the mockup.')}catch(e){say('Request failed: '+e.message)}}
function genDialog(a){const w=document.createElement('div');w.className='pk';w.innerHTML=`<div class="pc" style="max-width:640px"><div class="ph"><b>Generate a new mockup</b><span class="cnt">${E(a.name)}</span><button class="btn g addb" data-x>Close</button></div>
  <div style="padding:16px;display:flex;flex-direction:column;gap:10px"><p style="margin:0;color:var(--fg2)">Claude will build a JD mockup from this row (sizes ${E((a.sizes||[]).join(', '))}, headline, overlay, products, CTA). Add anything else it should know.</p>
  <textarea id="gnote" rows="5" class="bb-in" style="width:100%;font:500 14px/1.5 var(--body)" placeholder="e.g. Model-forward like Alo, use the pink Tech Fleece, yellow 'App exclusive' sticker, 9:16 first"></textarea>
  <div class="row"><button class="btn y" data-go>Send to Claude</button></div></div></div>`;
  document.body.appendChild(w);w.onclick=async e=>{if(e.target===w||e.target.closest('[data-x]')){w.remove();return}
   if(e.target.closest('[data-go]')){const note=w.querySelector('#gnote').value;w.remove();
     const spec={asset_name:a.name,format:a.format,sizes:a.sizes,platforms:a.platforms,video_len:a.video_len,headline:a.headline,overlay:a.overlay,primary_text:a.primary_text,fr_text:a.fr_text,cta:a.cta,landing_url:a.landing_url,products:a.products,source:a.source_type?a.source_type+':'+a.source_id:null,request:note};
     await req('generate_mockup',spec,a)}}}

/* product tags */
function parseTag(v){v=v.trim();const m=v.match(/^(.*?)\s*[|,]\s*(https?:\S+)$/);if(m)return{name:m[1],url:m[2]};if(/^https?:/.test(v))return{name:slugName(v),url:v};const c=catalog().find(p=>p.name.toLowerCase().includes(v.toLowerCase()));return c||{name:v,url:'https://jdsports.ca/search?q='+encodeURIComponent(v)}}
async function addTag(id,tag){const a=A_(id);if(!a||!tag?.name)return;a.products=[...(a.products||[]),tag];await store.patchAsset(a.id,{products:a.products});render();setTimeout(()=>document.querySelector(`[data-tagin="${id}"]`)?.focus(),30)}
function suggest(inp){let box=inp.parentElement.querySelector('.bb-sug');const q=inp.value.trim().toLowerCase();if(!q||/^https?:/.test(q)){box?.remove();return}
  const L=catalog().filter(p=>p.name.toLowerCase().includes(q)).slice(0,8);if(!box){box=document.createElement('div');box.className='bb-sug';inp.parentElement.appendChild(box)}
  box.innerHTML=(L.length?L:[{name:inp.value.trim(),url:'https://jdsports.ca/search?q='+encodeURIComponent(inp.value.trim())}]).map((p,k)=>`<div data-sug data-n="${E(p.name)}" data-u="${E(p.url)}" class="${k?'':'on'}">${E(p.name)}<small>${E(p.url.replace('https://',''))}</small></div>`).join('')}

/* picker */
function picker(){const w=document.createElement('div');w.className='pk';let tab='matrix',q='';
  const items=()=>{const m=s=>!q||s.toLowerCase().includes(q);
    if(tab==='matrix')return [...(M.variations?.rows||[]).map(v=>({k:'var',id:v.id,t1:v.headline,t2:`${v.id} · ${v.sub}`,img:null})),...M.angles.map(a=>({k:'angle',id:a.id,t1:a.headline,t2:`${a.id} · ${a.name}`,img:null}))].filter(x=>m(x.t1+' '+x.t2));
    if(tab==='mock')return D.studio.map(s=>({k:'mock',id:s.sid,t1:s.title,t2:`${s.sid} · ${s.group} · ${s.size}`,img:'studio/'+s.file+'.jpg'})).filter(x=>m(x.t1+' '+x.t2));
    return D.items.filter(i=>!i.archived).map(i=>({k:'ad',id:i.sid,t1:i.brand+(i.headline?' · '+i.headline:''),t2:`${i.sid} · ${i.video?'Video':i.format}`,img:i.img})).filter(x=>m(x.t1+' '+x.t2))};
  const draw=()=>{w.querySelector('.pb').innerHTML=items().slice(0,120).map(x=>`<button type="button" class="pi" data-k="${x.k}" data-id="${x.id}">${x.img?`<img loading="lazy" src="${E(x.img)}" alt="">`:''}<div class="t1">${E(x.t1)}</div><div class="t2">${E(x.t2)}</div><span class="lbl" style="color:var(--y)">+ Add</span></button>`).join('')||'<div class="cnt">Nothing matches.</div>';
    w.querySelectorAll('[data-tab2]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab2===tab))};
  w.innerHTML=`<div class="pc"><div class="ph"><b>Add assets</b><div class="bb-seg">${[['matrix','Messaging'],['mock','JD Mockups'],['ads','Examples']].map(([k,t])=>`<button type="button" data-tab2="${k}">${t}</button>`).join('')}</div>
   <input class="bb-in" id="pkq" placeholder="Search…" style="flex:1;min-width:160px"><button class="btn y addb" data-x>Done</button></div><div class="pb"></div></div>`;
  document.body.appendChild(w);draw();w.querySelector('#pkq').oninput=e=>{q=e.target.value.toLowerCase();draw()};
  w.onclick=async e=>{if(e.target===w||e.target.closest('[data-x]')){w.remove();render();return}const tb=e.target.closest('[data-tab2]');if(tb){tab=tb.dataset.tab2;draw();return}
    const p=e.target.closest('.pi');if(p){p.classList.add('added');p.querySelector('.lbl').textContent='✓ Added';await addFrom(p.dataset.k,p.dataset.id)}}}

/* ---------- inject UI hooks into the hub ---------- */
function inject(){
  const nav=document.querySelector('nav.bar .wrap'),before=document.getElementById('t-ours');
  if(nav&&!document.getElementById('t-brief')){const b=document.createElement('button');b.className='pill';b.dataset.tab='brief';b.id='t-brief';b.textContent='Brief Builder';before.after(b);b.onclick=()=>location.hash='brief'}
  if(!document.getElementById('v-brief')){const s=document.createElement('section');s.id='v-brief';s.className='wrap';s.hidden=true;document.querySelector('main').appendChild(s);bind()}
  // matrix: + Brief buttons on each row
  const mx=document.getElementById('v-messaging');
  const addMatrixButtons=()=>{mx.querySelectorAll('tbody tr').forEach(tr=>{if(tr.querySelector('[data-addbrief]'))return;const id=tr.querySelector('td b')?.textContent?.trim();if(!id)return;const k=VAR[id]?'var':ANG[id]?'angle':null;if(!k)return;
    const td=document.createElement('td');td.innerHTML=`<button class="pill" data-addbrief="${k}:${id}">+ Brief</button>`;tr.appendChild(td);
    const hr=tr.closest('table')?.querySelector('thead tr');if(hr&&!hr.querySelector('.bbh')){const th=document.createElement('th');th.className='bbh';th.textContent='Brief';hr.appendChild(th)}})};
  new MutationObserver(addMatrixButtons).observe(mx,{childList:true});addMatrixButtons();
  // drawer: + Add to brief
  const dr=document.getElementById('drawer');
  new MutationObserver(()=>{const row=dr.querySelector('.row');if(!row||row.querySelector('[data-addbrief]'))return;const id=dr.querySelector('.dh .disp')?.textContent?.trim();if(!id)return;
    const k=id.startsWith('JD-')?'mock':'ad';const b=document.createElement('button');b.className='btn y';b.dataset.addbrief=k+':'+id;b.textContent='+ Add to brief';row.prepend(b)}).observe(dr,{childList:true});
}
/* router hook: wrap the hub's show() */
function hook(){const _show=window.show;window.show=function(tab){if(tab==='brief'){document.querySelectorAll('main > section').forEach(x=>x.hidden=true);document.querySelectorAll('nav.bar [data-tab]').forEach(x=>x.setAttribute('aria-pressed',false));$('#v-brief').hidden=false;$('#t-brief').setAttribute('aria-pressed',true);render();startPoll();return}
   $('#v-brief').hidden=true;$('#t-brief').setAttribute('aria-pressed',false);stopPoll();return _show(tab)};
  const _route=window.route;window.route=function(){if(location.hash==='#brief'){$('#drawer').hidden=true;$('#scrim').hidden=true;show('brief');return}return _route()};
  window.removeEventListener('hashchange',_route);window.addEventListener('hashchange',window.route)}
function startPoll(){stopPoll();if(MODE!=='remote')return;S.poll=setInterval(async()=>{if(document.hidden||!cur())return;const act=document.activeElement;if(act&&$('#v-brief').contains(act)&&/INPUT|TEXTAREA|SELECT/.test(act.tagName))return;
  try{const [a,q]=await Promise.all([store.assets(cur().id),store.queue(cur().id)]);const sig=x=>JSON.stringify(x.map(r=>[r.id,r.updated_at,r.status,r.clickup_status]));if(sig(a)!==sig(S.assets)||JSON.stringify(q.map(r=>[r.id,r.status]))!==JSON.stringify(S.queue.map(r=>[r.id,r.status]))){S.assets=a;S.queue=q;render()}}catch(e){}},20000)}
function stopPoll(){if(S.poll)clearInterval(S.poll);S.poll=null}

/* ---------- boot ---------- */
gate();
const wait=setInterval(async()=>{if(typeof D==='undefined'||!D||!window.show)return;clearInterval(wait);inject();hook();await loadBriefs();if(location.hash==='#brief')show('brief')},60);
})();

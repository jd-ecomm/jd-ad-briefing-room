/* JD Ad Briefing Room · Creative Discovery (batch 1 preview, /discovery/)
   Data: Supabase in_ads, rows with batch = 1 and is_english = true, paged 1,000 at a time (PostgREST cap).
   One card per variant_group (same ad in several formats); formats jsonb lists every member.
   Media order: R2 (thumb_r2, video_r2, images_r2, logo_r2) > Supabase copies (*_s) > Motion URLs.
   Favourites and boards reuse in_favs, in_boards, in_board_items (shared with the Inspo tab).
   Login: the same JD email gate as the Briefing Room (localStorage "jd-email"). */
"use strict";
const SBU = "https://cymkcvdsxoneojfisjgk.supabase.co/rest/v1/";
const SBK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWtjdmRzeG9uZW9qZmlzamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTg0ODQsImV4cCI6MjEwODY5NDQ4NH0.rgRRRXCab-s5xy4ICFa_l511Gol8EMqPEjBHThnAC9I";
const DOMAINS = /@(jdsports\.ca|jdcanada\.ca|jdplc\.com|jdsports\.co\.uk|ryanclarke\.co)$/i;
const PROJECTS_URL = "../";
const TRENDING_SRC = "../#trending";
const NOW = new Date();
const DAY = 864e5;
const CAP = 90;            // days-live cap in the Proven score
const PROVEN_DAYS = 60;    // Proven = running 60+ days
const PAGE = 1000;         // PostgREST max rows per request
const CHUNK = 48;          // cards rendered per scroll step
const ASPECTS = ["9:16", "4:5", "1:1", "16:9"];
const MK = { "66cf75a0e42d53dcea7879b5": "JD UK", "67aa28cb0a70ccc0c54281c6": "JD US", "686f2d9374342e14cdc10979": "JD Australia", "69925634d7b54bd21a2fcadb": "JD New Zealand", "670ff958a61172249cb1b88d": "Finish Line", "674e4a2a411da97a4980d2db": "JD France" };
const WORLD = [["JD UK", ""], ["JD US", ""], ["JD Australia", ""], ["JD New Zealand", ""], ["Finish Line", "JD Group, USA"]];
const PROVEN_TIP = `Proven score = days live (capped at ${CAP}) + variants of the same concept + parallel launches (ads of the same concept that started within 3 days of this one). An ad counts as Proven once it has run ${PROVEN_DAYS}+ days. A concept is the brand plus the first 60 characters of the ad text.`;

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtN = n => Number(n).toLocaleString("en-CA");
const fmtDate = s => s ? new Date(s + "T12:00:00").toLocaleDateString("en-CA", { day: "numeric", month: "short" }) : "n/a";
const fmtDur = s => !isFinite(s) ? "" : Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const store = {
  get(k, d) { try { const v = localStorage.getItem("cd_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("cd_" + k, JSON.stringify(v)); } catch (e) { } }
};
const me = () => { try { return JSON.parse(localStorage.getItem("jd-email") || '""') || ""; } catch (e) { return ""; } };
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
const initials = s => String(s || "?").replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || String(s || "?")[0];
const sm = (svg, n = 16) => svg.replace("<svg", `<svg width="${n}" height="${n}"`);
async function api(path, opt = {}) {
  const r = await fetch(SBU + path, { ...opt, headers: { apikey: SBK, Authorization: "Bearer " + SBK, "Content-Type": "application/json", ...(opt.headers || {}) } });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 160));
  const t = await r.text(); return { data: t ? JSON.parse(t) : null, range: r.headers.get("content-range") };
}

/* landing page type: same rules as the Inspo tab (inspo.js) */
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
const LPT = ["PDP", "PLP / collection", "Homepage", "Campaign / landing page", "Meta Instant Experience", "Search results", "App / app store", "Social / other site", "Unknown"];
function bucket(a) {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(a || ""); if (!m || !+m[2]) return null;
  const r = Math.log(m[1] / m[2]); let best = null, bd = 9;
  [["9:16", 9 / 16], ["4:5", .8], ["1:1", 1], ["16:9", 16 / 9]].forEach(([k, v]) => { const d = Math.abs(r - Math.log(v)); if (d < bd) { bd = d; best = k; } });
  return best;
}
const arCss = b => ({ "9:16": "9/16", "4:5": "4/5", "1:1": "1/1", "16:9": "16/9" })[b] || "4/5";
const OFFER = /(up to \d{1,2}% off|\d{1,2}% off|bogo|buy one,? get one|free shipping|free delivery|\$\d+ off|half price|sale)/i;

const I = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
  reels: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 8.5h18M8.5 3l3 5.5M14.5 3l3 5.5"/><path d="m10 12 5 3-5 3z" fill="currentColor"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5c0 1.7 1.3 3 3 3s2.7-1.3 2.7-3c0 1.7 1.3 3 2.3 3s2.3-1.3 2.3-3c0 1.7 1 3 2.7 3s3-1.3 3-3"/><path d="M10 20v-5h4v5"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3z"/></svg>',
  board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="3" width="8" height="11" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="16" width="8" height="5" rx="1.5"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 21c4 0 7-2.8 7-6.8 0-4.2-3.3-6.3-4.3-10.2-2.2 1.4-3.4 3.6-3.2 6-1.4-.6-2.4-2-2.5-3.5C7 8.5 5 11 5 14.2 5 18.2 8 21 12 21z"/></svg>',
  ext: '<svg class="ext" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  bm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.5-6 4.5z"/></svg>',
  bmf: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4.5-6 4.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11z"/></svg>',
  heartf: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11z"/></svg>',
  comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5 5 16a8.5 8.5 0 1 1 15.5-4.5z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M21.5 3 3 10.2l7 3 3 7.3z"/><path d="m10 13.2 5.5-5.5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.8"/></svg>',
  volOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>',
  volOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
  chevL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
  chevU: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg>',
  chevD: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 17.5V6l11-2.5v11.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="6.5" cy="17.5" r="2.8"/><circle cx="17.5" cy="15" r="2.8"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  homeig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3.5 10.5 12 3.5l8.5 7V20.5h-6v-6h-5v6h-6z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  fmts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="7" height="12" rx="1.5"/><rect x="12" y="8" width="9" height="9" rx="1.5"/></svg>'
};
const SBAR = '<div class="sb"><span>9:41</span><span class="r"><svg viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5" width="3" height="6" rx="1" fill="#fff"/><rect x="10" y="2.5" width="3" height="8.5" rx="1" fill="#fff"/><rect x="15" y="0" width="3" height="11" rx="1" fill="#fff"/></svg><svg viewBox="0 0 16 11"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5L15.6 3.3A10.7 10.7 0 0 0 8 0 10.7 10.7 0 0 0 .4 3.3l1.4 1.4A8.7 8.7 0 0 1 8 2.2zm0 3.4c1.5 0 2.8.6 3.8 1.5l1.4-1.4A7.3 7.3 0 0 0 8 3.6c-2 0-3.8.8-5.2 2.1l1.4 1.4c1-.9 2.3-1.5 3.8-1.5zM8 9l2.2-2.2a3.2 3.2 0 0 0-4.4 0z" fill="#fff"/></svg><svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="#fff" opacity=".45"/><rect x="2" y="2" width="17" height="8" rx="1.8" fill="#fff"/><rect x="24" y="4" width="2" height="4" rx="1" fill="#fff" opacity=".5"/></svg></span></div><div class="notch"></div>';

/* ---------- data ---------- */
const COLS = "id,brand,brand_id,brand_group,logo,logo_s,logo_r2,status,start_date,end_date,days_live,format,visual_formats,aspect,platforms,cards,headline,copy,cta,landing,video,video_s,video_r2,poster,poster_frame,images,images_s,images_r2,thumb_s,thumb_r2,saves,market,concept_key,variant_group,formats,first_seen";
let ROWS = [], ADS = [], BYAD = {}, BYID = {}, BRANDS = [], BRAND_BY = {}, TOT = {};
const S = {
  favs: new Set(), allFavs: {}, boards: [], items: [], saveErr: null,
  follows: new Set(store.get("follows", ["66cf75a0e42d53dcea7879b5", "66f18dfdaa0d5e9098aec096", "6686cae74eca12a94c097e31"])),
  compare: [], lists: {}, fmt: {}, likes: new Set(),
  lastVisit: store.get("last", null),
  lib: { q: "", f: new Set(), sort: "all", density: store.get("density", "comfortable") },
  view: "discover", gmk: "all", board: null, bfilter: "all", bsort: "live", ready: false, err: null
};
const prevVisit = S.lastVisit;

async function loadAds(onProgress) {
  const q = `in_ads?select=${COLS}&batch=not.is.null&is_english=is.true&order=id.asc`;
  const first = await api(q, { headers: { Range: `0-${PAGE - 1}`, "Range-Unit": "items", Prefer: "count=exact" } });
  let rows = first.data || [];
  const total = +((first.range || "").split("/")[1]) || rows.length;
  onProgress && onProgress(rows.length, total);
  const pages = [];
  for (let from = PAGE; from < total; from += PAGE) pages.push(from);
  let done = rows.length;
  // 4 requests in flight at a time
  for (let i = 0; i < pages.length; i += 4) {
    const res = await Promise.all(pages.slice(i, i + 4).map(from => api(q, { headers: { Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items" } })));
    res.forEach(r => { rows = rows.concat(r.data || []); done += (r.data || []).length; });
    onProgress && onProgress(done, total);
  }
  return rows;
}
async function loadSaves() {
  try {
    const f = (await api("in_favs?select=email,ad_id")).data || [];
    S.allFavs = {}; S.favs = new Set();
    f.forEach(x => { S.allFavs[x.ad_id] = (S.allFavs[x.ad_id] || 0) + 1; if (x.email === me()) S.favs.add(x.ad_id); });
    S.boards = (await api("in_boards?select=id,name,note,created_by,created_at&order=created_at.asc")).data || [];
    S.items = (await api("in_board_items?select=board_id,ad_id,src,added_by,created_at&order=created_at.desc")).data || [];
  } catch (e) { S.saveErr = e.message; }
}

function norm(r) {
  const vid = r.format === "video" || r.video || r.video_s || r.video_r2 ? (r.video_r2 || r.video_s || r.video || null) : null;
  const ir = r.images_r2;
  const imgs = Array.isArray(ir) && ir.length ? ir : (r.images_s && r.images_s.length ? r.images_s : (r.images || []));
  const cleanPoster = ir && !Array.isArray(ir) && ir.poster ? ir.poster : (r.poster_frame && r.thumb_r2 ? r.thumb_r2 : null);
  const kind = vid ? "video" : (r.format === "carousel" || imgs.length > 1 ? "carousel" : "image");
  const thumb = kind === "video" ? (cleanPoster || null) : (r.thumb_r2 || r.thumb_s || imgs[0] || r.poster || "");
  const sd = r.start_date, ed = r.status === "active" ? null : r.end_date;
  const d = sd ? Math.max(0, Math.round(((ed ? new Date(ed + "T12:00:00") : NOW) - new Date(sd + "T12:00:00")) / DAY)) : (r.days_live || 0);
  const a = {
    id: r.id, b: r.brand || "Unknown brand", bid: r.brand_id, g: r.brand_group || "Other", kind, video: vid, poster: cleanPoster, thumb, imgs,
    logo: r.logo_r2 || r.logo_s || r.logo || "", vf: r.visual_formats || [], ar: r.aspect || "", asp: bucket(r.aspect),
    pl: (r.platforms || []).filter(p => p && p !== "unknown"), c: r.cards || imgs.length || 1, h: r.headline || "", x: r.copy || "", cta: r.cta || "Learn more",
    l: r.landing || "", sd, ed: r.end_date, d, st: r.status, mk: MK[r.brand_id] || null, market: r.market || null, ck: r.concept_key || ("c_" + r.id),
    vg: r.variant_group || ("vg_" + r.id), fs: r.first_seen, motion: r.saves || 0, r2: !!(r.thumb_r2 || r.video_r2), formats: r.formats || []
  };
  a._valt = [r.video_r2, r.video_s, r.video].filter(u => u && u !== vid);
  a._ialt = [r.thumb_s, (r.images_s || [])[0], r.poster, (r.images || [])[0]].filter(u => u && u !== thumb);
  if (!a.asp) { const f = (a.formats || []).find(f => f.ad_id === a.id); a.asp = (f && f.aspect) || (a.kind === "carousel" ? "1:1" : "4:5"); a.aspDerived = true; }
  a.lp = lpType(a.l);
  const om = OFFER.exec(a.h + " " + a.x); a.of = om ? om[0].replace(/^./, c => c.toUpperCase()) : null;
  a.handle = slug(a.b) || "brand";
  a.age = sd ? Math.round((NOW - new Date(sd + "T12:00:00")) / DAY) : 999;
  return a;
}
function buildData(rows) {
  ROWS = rows.map(norm);
  BYAD = Object.fromEntries(ROWS.map(a => [a.id, a]));
  // concept stats: variants of the concept and parallel launches (same concept, start within 3 days)
  const byCk = {}; ROWS.forEach(a => (byCk[a.ck] = byCk[a.ck] || []).push(a));
  ROWS.forEach(a => {
    const c = byCk[a.ck];
    a.var = c.length;
    a.par = a.sd ? c.filter(o => o !== a && o.sd && Math.abs(new Date(o.sd) - new Date(a.sd)) <= 3 * DAY).length : 0;
    a.ps = Math.min(a.d, CAP) + a.var + a.par;
    a.proven = a.d >= PROVEN_DAYS;
  });
  // one item per variant group
  const byVg = {}; ROWS.forEach(a => (byVg[a.vg] = byVg[a.vg] || []).push(a));
  ADS = Object.values(byVg).map(ms => {
    ms.sort((p, q) => q.ps - p.ps || (p.sd || "").localeCompare(q.sd || ""));
    const rep = ms[0];
    const fm = {}; ms.forEach(m => { if (!fm[m.asp] || (m.kind === "video" && fm[m.asp].kind !== "video")) fm[m.asp] = m; });
    const fl = ASPECTS.filter(k => fm[k]);
    const it = Object.assign({}, rep, {
      members: ms, fm, fl, nf: fl.length,
      ps: Math.max(...ms.map(m => m.ps)), d: Math.max(...ms.map(m => m.d)), proven: ms.some(m => m.proven),
      st: ms.some(m => m.st === "active") ? "active" : rep.st, vf: [...new Set(ms.flatMap(m => m.vf))],
      age: Math.min(...ms.map(m => m.age)), fs: ms.map(m => m.fs).sort()[0], r2: ms.some(m => m.r2),
      sv: ms.reduce((s, m) => s + (S.allFavs[m.id] || 0), 0), motion: Math.max(...ms.map(m => m.motion))
    });
    it.def = fm["4:5"] ? "4:5" : fl[0] || rep.asp;
    it.isNew = it.age <= 14;
    it.kinds = new Set(ms.map(m => m.kind));
    it.hay = [it.b, ...ms.map(m => m.h + " " + m.x), it.vf.join(" "), [...it.kinds].join(" "), it.lp, it.cta, it.g, it.mk || "", it.market || "", fl.join(" ")].join(" ").toLowerCase();
    return it;
  });
  BYID = {}; ADS.forEach(it => { BYID[it.id] = it; it.members.forEach(m => { if (!BYID[m.id]) BYID[m.id] = it; }); });
  // brand stats
  const bb = {};
  ADS.forEach(a => {
    const b = bb[a.bid] = bb[a.bid] || { b: a.b, bid: a.bid, g: a.g, logo: "", n: 0, ads: 0, live: 0, nw: 0, nw2: 0, dsum: 0, v: 0, im: 0, ca: 0, proven: 0, mk: a.mk, market: a.market };
    b.n++; b.ads += a.members.length; if (a.st === "active") b.live++; if (a.age <= 7) b.nw++; if (a.age <= 14) b.nw2++;
    b.dsum += a.d; b[a.kind === "video" ? "v" : a.kind === "carousel" ? "ca" : "im"]++; if (a.proven) b.proven++; if (!b.logo && a.logo) b.logo = a.logo;
  });
  BRANDS = Object.values(bb).map(b => Object.assign(b, { avgd: Math.round(b.dsum / b.n) })).sort((p, q) => q.n - p.n);
  BRAND_BY = Object.fromEntries(BRANDS.map(b => [b.bid, b]));
  TOT = { ads: ROWS.length, tot: ADS.length, live: ADS.filter(a => a.st === "active").length, proven: ADS.filter(a => a.proven).length,
    wk: ADS.filter(a => a.age <= 7).length, wk2: ADS.filter(a => a.age <= 14).length, brands: BRANDS.length, multi: ADS.filter(a => a.nf >= 2).length };
}
/* the member shown for an item: the picked format, else its default */
const cur = it => it.fm[S.fmt[it.id] || it.def] || it;
const isSaved = it => it.members.some(m => S.favs.has(m.id));

/* ---------- media engine ---------- */
let suspended = null; // the open layer (viewer or Reels), or null
let unmuted = null;
// load media near the viewport, release it again when far away (keeps memory flat on long grids)
const nearIO = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (!v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src; }
  else if (v.getAttribute("src") && v.dataset.src && !v.closest(".layer,.reels")) { v.pause(); v.removeAttribute("src"); v.load(); v.closest(".media,.wtile,.fr")?.classList.remove("loaded"); }
}), { rootMargin: "1200px 600px" });
// play only while at least half in view; pause when off screen or when a layer is open
const playIO = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (suspended && !suspended.contains(v)) { v.pause(); return; }
  if (e.isIntersecting && e.intersectionRatio >= .5) {
    if (!v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src;
    if (!v.dataset.scrub) { const p = v.play(); if (p) p.catch(() => { }); }
  } else v.pause();
}), { threshold: [0, .5, .9] });
function wireMedia(root) {
  $$("video[data-src]", root).forEach(v => {
    if (v.dataset.wired) return; v.dataset.wired = 1;
    v.muted = true; v.defaultMuted = true;
    nearIO.observe(v);
    if (!v.hasAttribute("data-still")) playIO.observe(v);
  });
}
function rearmPlayback(root) { $$("video[data-wired]", root || document).forEach(v => { if (v.hasAttribute("data-still")) return; playIO.unobserve(v); playIO.observe(v); }); }
document.addEventListener("loadeddata", e => {
  const el = e.target; if (!(el instanceof HTMLVideoElement)) return;
  el.closest(".media,.fr,.wtile,.ig-media,.f-media,.frame")?.classList.add("loaded");
}, true);
document.addEventListener("load", e => {
  const el = e.target; if (!(el instanceof HTMLImageElement)) return;
  el.closest(".media,.fr,.wtile,.ig-media,.f-media,.frame,.logo,.av")?.classList.add("loaded");
}, true);
document.addEventListener("error", e => {
  const el = e.target;
  if (el instanceof HTMLImageElement && el.closest(".logo,.av,.aud")) { el.remove(); return; }
  if (el instanceof HTMLVideoElement || el instanceof HTMLImageElement) {
    // R2 not there yet: fall back to the next copy in the chain
    const alt = (el.dataset.alt || "").split("|").filter(Boolean);
    if (alt.length) { let n = alt.shift(); if (el instanceof HTMLVideoElement) n += "#t=1"; el.dataset.alt = alt.join("|"); if (el.dataset.src) el.dataset.src = n; el.src = n; return; }
    el.style.visibility = "hidden";
  }
}, true);
document.addEventListener("loadedmetadata", e => {
  const v = e.target; if (!(v instanceof HTMLVideoElement)) return;
  const b = v.parentElement && v.parentElement.querySelector(":scope > .b-dur");
  if (b) b.textContent = fmtDur(v.duration);
  if (v.id === "pv-video") onPreviewMeta(v);
}, true);
document.addEventListener("timeupdate", e => {
  const v = e.target; if (!(v instanceof HTMLVideoElement) || !v.duration) return;
  const p = v.parentElement && v.parentElement.querySelector(":scope > .prog i, :scope > .igprog i");
  const pct = (v.currentTime / v.duration * 100) + "%";
  if (p) p.style.width = pct;
  if (v.id === "pv-video") { const h = $("#tl-head"); if (h) h.style.left = pct; const ip = $("#pv-prog"); if (ip) ip.style.width = pct; }
  if (v.closest(".frame")) { const f = v.closest(".frame").querySelector(".igprog i"); if (f) f.style.width = pct; }
}, true);
/* hover scrub (desktop mouse only) */
document.addEventListener("pointermove", e => {
  if (e.pointerType !== "mouse") return;
  const m = e.target.closest && e.target.closest(".media");
  if (!m) return;
  const v = m.querySelector(":scope > video");
  if (!v || !v.duration) return;
  const r = m.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  v.dataset.scrub = 1; v.pause();
  v.currentTime = x * v.duration;
});
document.addEventListener("pointerout", e => {
  const m = e.target.closest && e.target.closest(".media");
  if (!m || (e.relatedTarget && m.contains(e.relatedTarget))) return;
  const v = m.querySelector(":scope > video");
  if (v && v.dataset.scrub) { delete v.dataset.scrub; rearmPlayback(m); }
});
/* carousel dots */
document.addEventListener("scroll", e => {
  const c = e.target; if (!(c instanceof Element) || !c.classList.contains("car")) return;
  const i = Math.round(c.scrollLeft / c.clientWidth);
  c.parentElement.querySelectorAll(".dots i").forEach((d, k) => d.classList.toggle("on", k === i));
}, true);

/* ---------- card rendering ---------- */
function ph(a, small) {
  return `<div class="ph" aria-hidden="true"><div class="pht">${esc(a.h || a.x.slice(0, 60) || a.b)}</div><div class="phb"><i>${esc(initials(a.b))}</i><span>${small ? "" : esc(a.b) + " · "}${a.kind} ${esc(a.asp || "")}</span></div></div>`;
}
const altChain = (...u) => u.filter(Boolean).join("|");
function logoHTML(a, cls = "logo") {
  return `<span class="${cls}">${esc(initials(a.b))}${a.logo ? `<img alt="" loading="lazy" src="${esc(a.logo)}">` : ""}</span>`;
}
function vidTag(m, { id = "", autoplay = false, t = 1, still = false, preload = "metadata" } = {}) {
  const src = esc(m.video) + "#t=" + t;
  const alt = esc(altChain(...(m._valt || [])));
  return `<video ${id ? `id="${id}"` : ""} muted playsinline loop preload="${preload}" ${m.poster ? `poster="${esc(m.poster)}"` : ""} ${still ? "data-still" : ""} ${alt ? `data-alt="${alt}"` : ""} ${autoplay ? `autoplay src="${src}"` : `data-src="${src}"`}></video>`;
}
function mediaInner(m, opt = {}) {
  if (m.kind === "video") return vidTag(m, opt);
  if (m.kind === "carousel") return `<div class="car">${m.imgs.map((u, k) => `<img alt="Card ${k + 1}" loading="lazy" src="${esc(u)}">`).join("")}</div><div class="dots">${m.imgs.map((_, k) => `<i class="${k ? "" : "on"}"></i>`).join("")}</div>`;
  return imgTag(m);
}
function imgTag(m) { const alt = esc(altChain(...(m._ialt || []))); return `<img alt="" loading="lazy" ${alt ? `data-alt="${alt}"` : ""} src="${esc(m.thumb || m.imgs[0] || "")}">`; }
function fmtSeg(it, cls = "") {
  if (it.nf < 2) return "";
  const sel = S.fmt[it.id] || it.def;
  return `<div class="fseg ${cls}" role="group" aria-label="Format">${it.fl.map(k => `<button type="button" data-fmt="${it.id}|${k}" aria-pressed="${k === sel}">${k}</button>`).join("")}</div>`;
}
function card(it, ctx, opt = {}) {
  const m = cur(it);
  const saved = isSaved(it);
  const multi = it.nf >= 2;
  const badges = (multi ? `<span class="fb">${sm(I.fmts, 12)} ${it.nf} formats</span>` : "") + (it.proven ? `<span class="pv">Proven ${it.ps}</span>` : "") + (it.isNew ? `<span class="nw">New</span>` : "");
  const sub = opt.sub || `${it.d} days · ${m.kind}${it.members.length > 1 && !multi ? ` · ${it.members.length} variants` : ""}`;
  return `<article class="card" data-id="${it.id}">
  <div class="media ${multi ? "mf" : ""}" style="--ar:${arCss(m.asp)};--far:${arCss(m.asp)}" data-open="${it.id}" data-ctx="${ctx}" role="button" tabindex="0" aria-label="Open ${esc(it.b)} ad: ${esc((it.h || it.x).slice(0, 80))}">
    ${ph(m)}${mediaInner(m)}
    ${badges ? `<div class="badge b-tl">${badges}</div>` : ""}
    ${m.kind === "video" ? `<span class="badge b-dur"></span><div class="prog"><i></i></div><button class="mute" data-mute aria-label="Turn sound on"><span>${I.volOff}</span></button>` : m.kind === "image" ? `<span class="fmt-ico">${I.img}</span>` : ""}
  </div>
  ${opt.nofmt ? "" : fmtSeg(it)}
  ${opt.nometa ? "" : `<div class="meta">${logoHTML(it)}<div class="tx"><b>${esc(it.b)}</b><small>${sub}</small></div>
    ${opt.score ? `<span class="score num" title="Proven score">${it.ps}</span>` : `<button class="savebtn" data-save="${it.id}" aria-pressed="${saved}" aria-label="${saved ? "Unsave" : "Save"} ad">${saved ? I.bmf : I.bm}</button>`}</div>`}
</article>`;
}
function setList(ctx, arr) { S.lists[ctx] = arr.map(a => a.id); return arr; }
function setFormat(id, k) {
  S.fmt[id] = k;
  const it = BYID[id];
  $$(`#main .card[data-id="${id}"]`).forEach(c => {
    const ctx = c.querySelector("[data-open]")?.dataset.ctx || "library";
    const tmp = document.createElement("div");
    const keepMeta = !!c.querySelector(".meta"), keepFmt = !!c.querySelector(".fseg");
    tmp.innerHTML = card(it, ctx, { nometa: !keepMeta, nofmt: !keepFmt, score: !!c.querySelector(".meta .score") });
    const n = tmp.firstElementChild; c.replaceWith(n); wireMedia(n);
  });
}
/* incremental grid: renders CHUNK cards, then more as the sentinel scrolls into view */
const growIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.target._more) e.target._more(); }), { rootMargin: "1400px 0px" });
function growGrid(host, list, ctx, cls = "", opt = {}) {
  host.innerHTML = `<div class="grid ${cls}"></div><div class="sentinel" aria-hidden="true"></div>`;
  const g = host.firstElementChild, sen = host.lastElementChild; let n = 0;
  sen._more = () => {
    if (n >= list.length) { growIO.unobserve(sen); return; }
    const tmp = document.createElement("div");
    tmp.innerHTML = list.slice(n, n + CHUNK).map(a => card(a, ctx, opt)).join("");
    n += CHUNK; const nodes = [...tmp.children]; nodes.forEach(x => g.appendChild(x)); nodes.forEach(x => wireMedia(x));
    if (n >= list.length) growIO.unobserve(sen);
  };
  sen._more(); growIO.observe(sen);
}

/* ---------- navigation ---------- */
const NAV = [
  { k: "discover", label: "Discover", icon: "compass" },
  { k: "directory", label: "Directory", icon: "grid", long: "Directory" },
  { k: "trending", label: "Trending", icon: "fire", long: "Trending Ads Weekly" },
  { k: "brands", label: "Brands", icon: "store" },
  { k: "global", label: "JD Global", icon: "globe" },
  { k: "boards", label: "Boards", icon: "board" },
  { k: "reels", label: "Reels", icon: "reels" },
  { k: "projects", label: "Projects", icon: "doc", href: PROJECTS_URL, ext: 1 }
];
const navHref = n => n.href ? `href="${n.href}"` : `href="#${n.k}"`;
function renderNav() {
  const cur = !$("#reels").hidden ? "reels" : S.view.startsWith("brand") || S.view === "compare" ? "brands" : S.view;
  $("#topnav").innerHTML = NAV.map(n => `<a class="pill ${cur === n.k ? "on" : ""} ${n.k === "reels" || n.ext ? "ghost" : ""}" ${navHref(n)} ${cur === n.k ? 'aria-current="page"' : ""}>${n.long || n.label}${n.ext ? " " + I.ext : ""}</a>`).join("");
  const tabs = ["discover", "directory", "trending", "brands"];
  const inMore = !tabs.includes(cur);
  $("#tabbar").innerHTML = tabs.map(k => { const n = NAV.find(x => x.k === k); return `<a class="tab" ${navHref(n)} ${cur === k ? 'aria-current="page"' : ""}>${I[n.icon]}<span>${n.label}</span></a>`; }).join("") +
    `<button class="tab" id="moreBtn" ${inMore ? 'aria-current="page"' : ""} aria-haspopup="dialog">${I.more}<span>More</span></button>`;
  $("#moreBtn").onclick = openMore;
}
function openMore() {
  const o = $("#overlays");
  o.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet" role="dialog" aria-label="More sections"><div class="grab"></div>
    <a href="#global"><span class="ico">${I.globe}</span><span>JD Global<small>What JD's other markets and Finish Line run</small></span></a>
    <a href="#boards"><span class="ico">${I.board}</span><span>Boards<small>Team moodboards and briefs</small></span></a>
    <a href="#reels"><span class="ico">${I.reels}</span><span>Reels<small>Full-screen vertical feed, like Instagram</small></span></a>
    <a href="${PROJECTS_URL}"><span class="ico">${I.doc}</span><span>Projects ${I.ext}<small>Separate section of the Briefing Room</small></span></a>
  </div>`;
  o.querySelector("[data-close]").onclick = () => o.innerHTML = "";
  o.querySelectorAll("a").forEach(a => a.addEventListener("click", () => o.innerHTML = ""));
}
const VIEWS = ["directory", "discover", "trending", "brands", "global", "boards", "compare"];
function route() {
  if (!S.ready) { renderNav(); return; }
  let h = decodeURIComponent((location.hash || "#discover").slice(1));
  if (h === "home") h = "directory"; if (h === "library") h = "discover";
  if (h.startsWith("ad/")) { const id = h.slice(3); if (BYID[id]) { if (!$("#v-library").dataset.built) { S.view = "discover"; showView("discover"); renderLibrary(); } openViewer(id, "library", true); } return; }
  if (S.viewer) closeViewer(true);
  if (h === "reels") { openReels(defaultReels()); return; }
  if (!$("#reels").hidden) closeReels(true);
  let v = h, sub = null;
  if (h.startsWith("brand-")) { v = "brandpage"; sub = h.slice(6); }
  else if (h.startsWith("board-")) { v = "boards"; S.board = h.slice(6); }
  else if (!VIEWS.includes(h)) v = "discover";
  S.view = v === "brandpage" ? "brand" : v;
  showView(v === "brandpage" || v === "compare" ? "brands" : v);
  const R = { directory: renderHome, discover: renderLibrary, trending: renderTrending, brands: renderBrands, global: renderGlobal, boards: renderBoards, compare: renderCompare };
  if (v === "brandpage") renderBrandPage(sub); else R[v]();
  if (v !== "discover") window.scrollTo(0, 0);
}
function showView(target) {
  $$(".view").forEach(s => {
    const on = s.dataset.view === target;
    if (!on && !s.hidden) $$("video", s).forEach(x => x.pause());
    s.hidden = !on;
  });
  renderNav();
}
window.addEventListener("hashchange", route);

/* ---------- global click delegation ---------- */
document.addEventListener("click", e => {
  const mute = e.target.closest("[data-mute]");
  if (mute) {
    e.stopPropagation(); e.preventDefault();
    const v = mute.parentElement.querySelector("video");
    if (!v) return;
    if (v.muted) { if (unmuted && unmuted !== v) { unmuted.muted = true; syncMute(unmuted); } v.muted = false; unmuted = v; const p = v.play(); if (p) p.catch(() => { }); }
    else { v.muted = true; unmuted = null; }
    syncMute(v); return;
  }
  const fm = e.target.closest("[data-fmt]");
  if (fm) { e.stopPropagation(); const [id, k] = fm.dataset.fmt.split("|"); if (S.viewer && fm.closest("#viewer")) { viewerFormat(k); } else setFormat(id, k); return; }
  const sv = e.target.closest("[data-save]");
  if (sv) { e.stopPropagation(); toggleSave(sv.dataset.save); return; }
  const op = e.target.closest("[data-open]");
  if (op && !e.target.closest(".dots")) { openViewer(op.dataset.open, op.dataset.ctx); return; }
  const gl = e.target.closest("[data-golib]");
  if (gl) { goLibrary(gl.dataset.golib); return; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches && e.target.matches(".media[data-open]")) openViewer(e.target.dataset.open, e.target.dataset.ctx);
});
function syncMute(v) {
  const b = v.parentElement.querySelector("[data-mute]");
  if (b) { b.querySelector("span").innerHTML = v.muted ? I.volOff : I.volOn; b.setAttribute("aria-label", v.muted ? "Turn sound on" : "Turn sound off"); }
}
async function toggleSave(id) {
  const it = BYID[id]; if (!it) return;
  const m = me();
  if (!m) { gate(); return; }
  const on = !isSaved(it);
  const ids = on ? [it.id] : it.members.filter(x => S.favs.has(x.id)).map(x => x.id);
  ids.forEach(x => { if (on) { S.favs.add(x); S.allFavs[x] = (S.allFavs[x] || 0) + 1; } else { S.favs.delete(x); S.allFavs[x] = Math.max(0, (S.allFavs[x] || 1) - 1); } });
  it.sv = it.members.reduce((s, x) => s + (S.allFavs[x.id] || 0), 0);
  $$(`[data-save="${it.id}"]`).forEach(b => { b.setAttribute("aria-pressed", on); if (b.id !== "vw-save") b.innerHTML = on ? I.bmf : I.bm; });
  const vs = $("#vw-save"); if (vs && S.viewer && BYID[S.viewer.id] === it) vs.outerHTML = saveBtnViewer(it.id);
  toast(on ? "Saved to favourites" : "Removed from favourites");
  try {
    for (const x of ids) {
      if (on) await api("in_favs", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ email: m, ad_id: x }) });
      else await api("in_favs?email=eq." + encodeURIComponent(m) + "&ad_id=eq." + x, { method: "DELETE" });
    }
  } catch (err) { toast("Could not sync: " + err.message); }
}
let toastT;
function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200);
}
function goLibrary(spec) {
  if (S.viewer) closeViewer();
  S.lib.f = new Set(); S.lib.q = "";
  if (spec.startsWith("tag:") && !FILTERS.some(f => f.k === spec)) { const t = spec.slice(4); FILTERS.push({ k: spec, fam: "t", label: t, fn: a => a.vf.includes(t) }); }
  if (spec.startsWith("q:")) S.lib.q = spec.slice(2); else S.lib.f.add(spec);
  if (location.hash === "#discover" || (S.view === "discover" && !location.hash)) renderLibrary(); else location.hash = "discover";
}
function tip(text, label = "How the Proven score works") {
  return `<details class="tip"><summary aria-label="${esc(label)}">${sm(I.info, 18)}</summary><div class="tipbox" role="note">${esc(text)}</div></details>`;
}

/* ---------- HOME ---------- */
function shareTable() {
  // share of new launches per Motion visual-format tag: last 28 days vs the 28 before (start dates, every ad in batch 1)
  const cur = {}, prev = {}, tot = {}; let nc = 0, np = 0;
  ROWS.forEach(a => {
    const isC = a.age <= 28, isP = a.age > 28 && a.age <= 56;
    if (isC) nc++; if (isP) np++;
    a.vf.forEach(v => { tot[v] = (tot[v] || 0) + 1; if (isC) cur[v] = (cur[v] || 0) + 1; if (isP) prev[v] = (prev[v] || 0) + 1; });
  });
  return Object.keys(tot).map(v => { const c = cur[v] || 0, p = prev[v] || 0, cs = nc ? c / nc * 100 : 0, prs = np ? p / np * 100 : 0; return { v, cur: c, prev: p, tot: tot[v], cs, prs, d: cs - prs }; });
}
function spark(r) {
  const pts = [r.prs * .9, r.prs, r.prs * 1.05, (r.prs + r.cs) / 2, r.cs * .95, r.cs];
  const mx = Math.max(...pts, .1), w = 64, h = 26;
  const xy = pts.map((p, i) => [i / (pts.length - 1) * (w - 4) + 2, h - 3 - (p / mx) * (h - 6)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="#FFDE14" stroke-width="2" points="${xy.map(p => p.join(",")).join(" ")}"/><circle cx="${xy[5][0]}" cy="${xy[5][1]}" r="2.6" fill="#EFFF04"/></svg>`;
}
function renderHome() {
  const el = $("#v-home");
  const since = prevVisit ? new Date(prevVisit) : null;
  const lastPull = ADS.map(a => a.fs).filter(Boolean).sort().pop();
  const newSinceList = since ? ADS.filter(a => a.fs && new Date(a.fs) > since) : ADS.filter(a => a.fs && lastPull && new Date(lastPull) - new Date(a.fs) < 3 * DAY);
  const sinceList = setList("since", newSinceList.slice().sort((a, b) => a.age - b.age || b.ps - a.ps).slice(0, 16));
  const recent = setList("new", ADS.filter(a => a.age <= 7).sort((a, b) => a.age - b.age || b.ps - a.ps).slice(0, 24));
  const proven = setList("proven", ADS.filter(a => a.proven).sort((a, b) => b.ps - a.ps).slice(0, 16));
  const rising = shareTable().filter(r => r.tot >= 6 && r.cur >= 3).sort((a, b) => b.d - a.d).slice(0, 6);
  const teamSaved = setList("team", ADS.filter(a => a.sv > 0).sort((a, b) => b.sv - a.sv || b.ps - a.ps).slice(0, 12));
  const world = WORLD.map(([m, sub]) => ({ m, sub, list: ADS.filter(a => a.mk === m).sort((a, b) => b.ps - a.ps) }));
  const t = TOT;
  el.innerHTML = `
  <div class="hero"><div class="hero-in">
    <div>
      <h1 class="display"><span>Creative</span><span>Discovery</span></h1>
      <p>The week at a glance: what's new, what's proven, which formats are rising and what JD runs around the world. Week of ${NOW.toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" })}. <span class="sample">Preview · batch 1</span></p>
      <div class="hero-stats num">
        <div><b>${fmtN(t.tot)}</b><span>Ads (${fmtN(t.ads)} incl. formats)</span></div>
        <div><b>${fmtN(t.live)}</b><span>Live now</span></div>
        <div><b>${t.wk}</b><span>Launched this week</span></div>
        <div><b>${t.proven}</b><span>Proven 60+ days</span></div>
      </div>
    </div>
    <div class="rd" aria-hidden="true"><i></i><svg viewBox="0 0 144 144">${$(".top .roundel").innerHTML}</svg></div>
  </div></div>
  <div class="wrap">
    <section class="sec">
      <div class="sec-h"><div><h2 class="display">New since your last visit</h2><p>${since ? `You were last here ${since.toLocaleDateString("en-CA", { weekday: "short", day: "numeric", month: "short" })}. ${newSinceList.length} ads added since.` : `First visit on this device: these came in with the latest pull${lastPull ? " (" + new Date(lastPull).toLocaleDateString("en-CA", { day: "numeric", month: "short" }) + ")" : ""}.`} Newest first.</p></div><a class="more" href="#discover">Discover ${sm(I.chevR)}</a></div>
      ${sinceList.length ? `<div class="rail">${sinceList.map(a => card(a, "since")).join("")}</div>` : `<div class="empty">You're all caught up.</div>`}
    </section>
    <section class="sec">
      <div class="sec-h"><div><h2 class="display">This week</h2><p>Launched in the last 7 days, newest first. ${t.wk} new this week, ${t.wk2} in two weeks.</p></div><button class="more" data-golib="new">See all</button></div>
      ${recent.length ? `<div class="rail">${recent.map(a => card(a, "new", { sub: `Live ${fmtDate(a.sd)} · ${cur(a).kind}` })).join("")}</div>` : `<div class="empty">No launches in the last 7 days.</div>`}
    </section>
    <section class="sec">
      <div class="sec-h"><div><h2 class="display">Proven ads ${tip(PROVEN_TIP)}</h2><p>Running ${PROVEN_DAYS}+ days, ranked by Proven score.</p></div><button class="more" data-golib="proven">See all</button></div>
      <div class="rail">${proven.map(a => card(a, "proven", { score: 1, sub: `${a.d} days · ${a.var} var · ${a.par} parallel` })).join("")}</div>
    </section>
    <section class="sec">
      <div class="sec-h"><div><h2 class="display">Rising formats</h2><p>Share of new launches tagged with each Motion visual format, last 4 weeks vs the 4 before.</p></div></div>
      ${rising.length ? `<div class="rise">${rising.map(r => `<button data-golib="tag:${esc(r.v)}"><span class="nm">${esc(r.v)}<small>${r.cur} new launches · ${r.cs.toFixed(1)}% share</small></span>${spark(r)}<b class="${r.d >= 0 ? "up" : "down"} num">${r.d >= 0 ? "+" : ""}${r.d.toFixed(1)} pts</b></button>`).join("")}</div>` : `<div class="empty">Not enough tagged launches yet.</div>`}
    </section>
    <section class="sec">
      <div class="sec-h"><div><h2 class="display">JD around the world</h2><p>What JD's other markets and Finish Line are running.</p></div><a class="more" href="#global">JD Global</a></div>
      <div class="world">${world.map(w => {
        const a = w.list[0];
        if (!a) return `<div class="wtile off"><span class="lbl">Not tracked yet</span><div class="display">${esc(w.m)}</div><small>No ads from this page in batch 1.</small></div>`;
        const m = cur(a);
        return `<button class="wtile" data-open="${a.id}" data-ctx="world-${slug(w.m)}"><div class="bgm">${m.kind === "video" ? vidTag(m) : imgTag(m)}</div><span class="lbl" style="color:var(--jd)">${w.list.length} ads · top Proven ${a.ps}</span><div class="display">${esc(w.m)}</div><small>${esc(w.sub || (a.h || a.x).slice(0, 60))}</small></button>`;
      }).join("")}</div>
    </section>
    ${teamSaved.length ? `<section class="sec">
      <div class="sec-h"><div><h2 class="display">Saved by the team</h2><p>Ads the team favourited, most saved first.</p></div><a class="more" href="#boards">Boards</a></div>
      <div class="rail">${teamSaved.map(a => card(a, "team", { sub: `${a.sv} save${a.sv === 1 ? "" : "s"} · ${a.d} days` })).join("")}</div>
    </section>` : ""}
  </div>`;
  world.forEach(w => { if (w.list.length) setList("world-" + slug(w.m), w.list); });
  wireMedia(el);
  setTimeout(() => store.set("last", new Date().toISOString()), 4000);
}

/* ---------- LIBRARY ---------- */
let FILTERS = [];
function buildFilters() {
  const tagCount = {}; ADS.forEach(a => a.vf.forEach(v => tagCount[v] = (tagCount[v] || 0) + 1));
  const toptags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 14).map(t => t[0]);
  const topBrands = BRANDS.slice().sort((a, b) => b.n - a.n).slice(0, 18);
  const mkts = {}; ADS.forEach(a => { if (a.market) mkts[a.market] = (mkts[a.market] || 0) + 1; });
  FILTERS = [
    { k: "f:video", fam: "f", label: "Video", fn: a => a.kinds.has("video") },
    { k: "f:image", fam: "f", label: "Image", fn: a => a.kinds.has("image") },
    { k: "f:carousel", fam: "f", label: "Carousel", fn: a => a.kinds.has("carousel") },
    ...ASPECTS.map(k => ({ k: "ar:" + k, fam: "ar", label: k, fn: a => !!a.fm[k] })),
    { k: "multi", fam: "mf", label: "2+ formats", fn: a => a.nf >= 2 },
    { k: "proven", fam: "p", label: "Proven 60+", fn: a => a.proven },
    { k: "new", fam: "n", label: "New this week", fn: a => a.age <= 7 },
    { k: "live", fam: "s", label: "Live", fn: a => a.st === "active" },
    { k: "ended", fam: "s", label: "Ended", fn: a => a.st !== "active" },
    { k: "saved", fam: "sv", label: "My favourites", fn: a => isSaved(a) },
    { k: "g:JD Global", fam: "g", label: "JD", fn: a => a.g === "JD Global" },
    { k: "g:Competitor", fam: "g", label: "Competitors", fn: a => a.g === "Competitor" },
    { k: "g:Brand", fam: "g", label: "Brand partners", fn: a => a.g === "Brand" },
    { k: "g:DTC Fashion", fam: "g", label: "DTC fashion", fn: a => a.g === "DTC Fashion" },
    { k: "g:Category finds", fam: "g", label: "Category finds", fn: a => a.g === "Category finds" },
    ...Object.keys(mkts).sort((a, b) => mkts[b] - mkts[a]).map(m => ({ k: "m:" + m, fam: "m", label: m === "CA" ? "Canada" : m === "UK" ? "UK" : m === "US" ? "USA" : m === "AU" ? "Australia" : m === "NZ" ? "New Zealand" : m, fn: a => a.market === m })),
    ...LPT.map(l => ({ k: "lp:" + l, fam: "lp", label: l, fn: a => a.lp === l })),
    ...toptags.map(t => ({ k: "tag:" + t, fam: "t", label: t, fn: a => a.vf.includes(t) })),
    ...topBrands.map(b => ({ k: "b:" + b.bid, fam: "b", label: b.b, fn: a => a.bid === b.bid }))
  ];
}
const FAM_LABEL = { f: "Type", ar: "Format", p: "Status", g: "Group", m: "Market", lp: "Landing page", t: "Visual format", b: "Brand" };
const STOP = new Set("a an the of from by for with that this show me all ads ad and or in on to running run brands brand which what".split(" "));
let brandNamesCache = null;
function parseQuery(q) {
  const preds = [], said = [];
  let s = " " + q.toLowerCase().replace(/[^a-z0-9:'&.+ -]/g, " ").replace(/\s+/g, " ") + " ";
  if (!brandNamesCache) brandNamesCache = [...new Set(ADS.map(a => a.b))].sort((a, b) => b.length - a.length);
  for (const b of brandNamesCache) {
    const k = " " + b.toLowerCase() + " ";
    if (s.includes(k)) { s = s.replace(k, " "); preds.push(a => a.b === b); said.push(b); }
  }
  const take = (re, label, fn) => { if (re.test(s)) { s = s.replace(re, " "); preds.push(fn); said.push(label); } };
  take(/\btry[ -]?ons?\b/g, "try-on", a => a.vf.includes("Try-On"));
  take(/\bugc\b/g, "UGC", a => a.vf.some(v => v.startsWith("UGC")) || a.vf.includes("Influencer Endorsement"));
  take(/\b(talking heads?|yappers?)\b/g, "talking head", a => a.vf.some(v => ["Yapper", "UGC Selfie", "Testimonial"].includes(v)));
  take(/\b(videos?|reels?)\b/g, "video", a => a.kinds.has("video"));
  take(/\b(statics?|images?|photos?)\b/g, "image", a => a.kinds.has("image"));
  take(/\bcarousels?\b/g, "carousel", a => a.kinds.has("carousel"));
  take(/\b(vertical|9:16|stories)\b/g, "9:16", a => !!a.fm["9:16"]);
  take(/\b(4:5|feed)\b/g, "4:5", a => !!a.fm["4:5"]);
  take(/\b(1:1|square)\b/g, "1:1", a => !!a.fm["1:1"]);
  take(/\b(proven|evergreen|long[ -]running|winners?)\b/g, "proven", a => a.proven);
  take(/\b(new|fresh|latest|this week)\b/g, "new", a => a.isNew);
  take(/\b(live|active)\b/g, "live", a => a.st === "active");
  take(/\b(offers?|sales?|discounts?|deals?|promos?)\b/g, "with an offer", a => !!a.of);
  take(/\bcanad(a|ian)\b/g, "Canada", a => a.market === "CA");
  take(/\bcompetitors?\b/g, "competitors", a => a.g === "Competitor");
  take(/\b(celeb(rity|rities)?|athletes?)\b/g, "celebrity", a => a.vf.includes("Celebrity"));
  take(/\b(shoes?|sneakers?|footwear|kicks)\b/g, "footwear", a => /shoe|sneaker|footwear|kick|run|air max|samba|9060|dunk|jordan|force/i.test(a.hay + " " + a.l));
  take(/\b(jackets?|outerwear|coats?|puffers?)\b/g, "outerwear", a => /jacket|outerwear|coat|puffer|parka|fleece/i.test(a.hay + " " + a.l));
  take(/\b(black friday|bfcm|cyber)\b/g, "Black Friday", a => /black friday|bfcm|cyber/i.test(a.hay));
  take(/\b(holiday|gifts?|christmas)\b/g, "holiday", a => /holiday|gift|christmas|festive/i.test(a.hay));
  s.split(/\s+/).filter(w => w && !STOP.has(w)).forEach(w => { preds.push(a => a.hay.includes(w)); said.push(`"${w}"`); });
  return { preds, said };
}
function libResults(extraKey, base = ADS) {
  const { preds } = parseQuery(S.lib.q);
  const active = [...S.lib.f].map(k => FILTERS.find(f => f.k === k)).filter(Boolean);
  const fams = {};
  active.forEach(f => (fams[f.fam] = fams[f.fam] || []).push(f.fn));
  if (extraKey) { const f = FILTERS.find(x => x.k === extraKey); (fams[f.fam] = fams[f.fam] || []).push(f.fn); }
  const fl = Object.values(fams);
  return base.filter(a => preds.every(p => p(a)) && fl.every(fs => fs.some(fn => fn(a))));
}
function sortAds(arr, mode) {
  if (mode === "all") {
    const by = {}; arr.slice().sort((a, b) => a.age - b.age || b.ps - a.ps).forEach(a => (by[a.b] = by[a.b] || []).push(a));
    const qs = Object.values(by).sort((p, q) => p[0].age - q[0].age), out = [];
    while (qs.some(q => q.length)) qs.forEach(q => { if (q.length) out.push(q.shift()); });
    return out;
  }
  const sc = {
    proven: a => a.ps,
    rising: a => a.var * 4 + a.par * 3 + Math.max(0, 30 - a.age) * 2 + (a.st === "active" ? 5 : 0),
    newest: a => -a.age * 1000 + a.ps,
    saved: a => a.sv * 1000 + a.motion + a.ps / 1000
  }[mode];
  return arr.slice().sort((a, b) => sc(b) - sc(a));
}
function renderLibrary() {
  const el = $("#v-library");
  if (!el.dataset.built) {
    el.dataset.built = 1;
    el.innerHTML = `<div class="wrap">
      <div class="sec" style="margin-top:24px;margin-bottom:4px"><div class="sec-h" style="margin:0"><div><h2 class="display">Discover ${tip(PROVEN_TIP)}</h2><p>JD's markets, Finish Line, the Canadian retailers and every brand in the original library, one card per ad (formats grouped). ${fmtN(TOT.tot)} ads, ${TOT.wk} launched this week, ${TOT.proven} Proven, ${TOT.multi} in 2+ formats.</p></div></div></div>
      <div class="libbar">
        <label class="search" for="q">${I.search}<input id="q" type="search" autocomplete="off" placeholder="Search brand, format, copy: Sport Chek try-on videos" enterkeyhint="search" aria-label="Search ads"><button class="clr" id="qclr" aria-label="Clear search" hidden>${I.x}</button></label>
        <div class="parsed" id="parsed"></div>
        <div class="chips" id="chips" role="group" aria-label="Filters"></div>
        <div class="ctrls">
          <div class="seg" role="group" aria-label="Sort" id="sortseg">${[["all", "All"], ["proven", "Proven"], ["rising", "Rising"], ["newest", "Newest"], ["saved", "Most saved"]].map(([k, l]) => `<button data-sort="${k}">${l}</button>`).join("")}</div>
          <div class="seg" role="group" aria-label="Density" id="denseg">${[["compact", "Compact"], ["comfortable", "Comfortable"], ["reels", "Reels"]].map(([k, l]) => `<button data-den="${k}">${l}</button>`).join("")}</div>
        </div>
      </div>
      <p class="rescount" id="rescount"></p>
      <div id="libgrid"></div>
      <div style="display:flex;justify-content:center;margin-top:20px"><button class="pill on" id="libReels">${sm(I.reels, 18)} Watch these as Reels</button></div>
    </div>`;
    const q = $("#q");
    let t;
    q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { S.lib.q = q.value; drawLib(); }, 160); });
    $("#qclr").onclick = () => { q.value = ""; S.lib.q = ""; drawLib(); q.focus(); };
    $("#sortseg").onclick = e => { const b = e.target.closest("[data-sort]"); if (b) { S.lib.sort = b.dataset.sort; drawLib(); } };
    $("#denseg").onclick = e => { const b = e.target.closest("[data-den]"); if (b) { S.lib.density = b.dataset.den; store.set("density", S.lib.density); drawLib(); } };
    $("#chips").onclick = e => { const b = e.target.closest("[data-f]"); if (!b) return; const k = b.dataset.f; S.lib.f.has(k) ? S.lib.f.delete(k) : S.lib.f.add(k); drawLib(); };
    $("#libReels").onclick = () => openReels(S.lists.library || [], null);
  }
  $("#q").value = S.lib.q;
  drawLib();
}
function drawLib() {
  const res = setList("library", sortAds(libResults(), S.lib.sort));
  const { said } = parseQuery(S.lib.q);
  $("#qclr").hidden = !S.lib.q;
  $("#parsed").innerHTML = said.length ? `Searching for ${said.map(s => `<b>${esc(s)}</b>`).join(" + ")}` : "";
  // live counts: what you'd get if you tapped the chip, given the search and every other active filter
  let chips = "", lastFam = null;
  const fams = new Set([...S.lib.f].map(k => (FILTERS.find(f => f.k === k) || {}).fam));
  FILTERS.forEach(f => {
    if (f.fam !== lastFam) { if (lastFam) chips += `<span class="chip-sep" aria-hidden="true"></span>`; if (FAM_LABEL[f.fam]) chips += `<span class="chip-lbl">${FAM_LABEL[f.fam]}</span>`; }
    lastFam = f.fam;
    const on = S.lib.f.has(f.k);
    const n = on ? res.filter(f.fn).length : (fams.has(f.fam) ? libResults(f.k).length : libResults(f.k).length);
    chips += `<button class="chip" data-f="${esc(f.k)}" aria-pressed="${on}" ${!on && n === 0 ? "disabled" : ""}>${esc(f.label)} <b>${fmtN(n)}</b></button>`;
  });
  const sl = $("#chips").scrollLeft;
  $("#chips").innerHTML = chips; $("#chips").scrollLeft = sl;
  $$("#sortseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.sort === S.lib.sort));
  $$("#denseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.den === S.lib.density));
  $("#rescount").textContent = `${fmtN(res.length)} of ${fmtN(ADS.length)} ads · sorted by ${({ all: "a brand mix, newest first", proven: "Proven score", rising: "Rising", newest: "Newest", saved: "Most saved by the team" })[S.lib.sort]}`;
  const host = $("#libgrid");
  if (!res.length) { host.innerHTML = `<div class="empty">No ads match. Try fewer words or clear a filter.</div>`; return; }
  growGrid(host, res, "library", "d-" + S.lib.density);
}

/* ---------- VIEWER ---------- */
function hookLine(a) {
  const src = (a.h && a.h.length > 3 ? a.h : a.x) || a.b;
  return src.split(/(?<=[.!?])\s/)[0].slice(0, 90);
}
function capHTML(a) { return `<div class="cap" data-cap><b>${esc(a.handle)}</b> ${esc(a.x || a.h || "")}</div>`; }
const likesOf = a => 800 + ((parseInt(a.id.slice(-6), 16) % 9000) * ((a.var || 1) + 1));
function igPreview(m, pl) {
  const media = m.kind === "video" ? vidTag(m, { id: "pv-video", autoplay: true, t: .1 }) : mediaInner(m);
  const av = `<span class="av">${esc(initials(m.b))}${m.logo ? `<img alt="" src="${esc(m.logo)}">` : ""}</span>`;
  const cta = esc(m.cta);
  if (pl === "feed") {
    return `<div class="phone" data-pl="feed">${SBAR}<div class="f-app">
      <div class="f-nav"><span class="wm">Feed</span><span class="r">${I.heart}${I.send}</span></div>
      <div class="f-post">
        <div class="f-head">${av}<div class="h"><b>${esc(m.handle)}</b><span>Sponsored</span></div>${I.more}</div>
        <div class="f-media ig-media" style="aspect-ratio:${arCss(m.asp === "9:16" ? "4:5" : m.asp)}">${ph(m)}${media}${m.kind === "video" ? `<div class="igprog"><i id="pv-prog"></i></div>` : ""}</div>
        <div class="f-cta">${cta}${I.chevR}</div>
        <div class="f-acts">${I.heart}${I.comment}${I.send}<span class="sv">${I.bm}</span></div>
        <div class="f-txt"><b>${fmtN(likesOf(m))} likes</b></div>
        <div class="f-txt">${capHTML(m)}</div>
      </div>
      <div class="f-tabs">${I.homeig}${I.search}${I.reels}${I.shop}${I.user}</div>
    </div></div>`;
  }
  if (pl === "stories") {
    return `<div class="phone" data-pl="stories">${SBAR}<div class="ig-wrap"><div class="ig-media">${ph(m)}${media}</div><div class="ig-shade t"></div><div class="ig-shade"></div>
      <div class="s-bars"><i class="done"><b></b></i><i><b id="pv-prog"></b></i><i><b></b></i></div>
      <div class="s-head">${av}<div class="h">${esc(m.handle)}<span>Sponsored</span></div>${I.more}${I.x}</div>
      <div class="s-cta"><span class="up">${I.chevU}</span><span class="lnk">${I.link}${cta}</span></div>
    </div></div>`;
  }
  return `<div class="phone" data-pl="reels">${SBAR}<div class="ig-wrap"><div class="ig-media">${ph(m)}${media}</div><div class="ig-shade t"></div><div class="ig-shade"></div>
    ${reelOverlay(m, true)}
    <div class="igprog"><i id="pv-prog"></i></div>
  </div></div>`;
}
function reelOverlay(a, inPhone) {
  const liked = S.likes.has(a.id), it = BYID[a.id] || a, sv = isSaved(it), lk = likesOf(a);
  return `<div class="r-top" ${inPhone ? "" : 'style="padding-left:60px"'}><b>Reels</b>${I.camera}</div>
  <div class="r-rail">
    <button class="it" data-like="${a.id}" aria-label="Like"><span class="${liked ? "liked" : ""}">${liked ? I.heartf : I.heart}</span>${fmtN(lk)}</button>
    <span class="it">${I.comment}${fmtN(Math.round(lk / 37))}</span>
    <span class="it">${I.send}</span>
    <button class="it" data-save="${it.id}" aria-pressed="${sv}" aria-label="Save">${sv ? I.bmf : I.bm}</button>
    <span class="it">${I.more}</span>
    <span class="aud">${a.logo ? `<img alt="" src="${esc(a.logo)}">` : ""}</span>
  </div>
  <div class="r-bot">
    <div class="r-who"><span class="av">${esc(initials(a.b))}${a.logo ? `<img alt="" src="${esc(a.logo)}">` : ""}</span><span class="h">${esc(a.handle)}<span>Sponsored</span></span><span class="follow">Follow</span></div>
    ${capHTML(a).replace(`<b>${esc(a.handle)}</b> `, "")}
    <div class="audio">${I.music}<span>${esc(a.handle)} · Original audio</span></div>
    <div class="ctabar">${esc(a.cta)}${I.chevR}</div>
  </div>`;
}
document.addEventListener("click", e => {
  const c = e.target.closest("[data-cap]");
  if (c) { e.stopPropagation(); c.classList.toggle("open"); }
  const lk = e.target.closest("[data-like]");
  if (lk) { e.stopPropagation(); toggleLike(lk.dataset.like); }
}, true);
function toggleLike(id) {
  S.likes.has(id) ? S.likes.delete(id) : S.likes.add(id);
  const on = S.likes.has(id);
  $$(`[data-like="${id}"] span`).forEach(s => { s.className = on ? "liked" : ""; s.innerHTML = on ? I.heartf : I.heart; });
}
function saveBtnViewer(id) { const on = isSaved(BYID[id]); return `<button class="pill ${on ? "on" : ""}" id="vw-save" data-save="${BYID[id].id}" aria-pressed="${on}">${sm(on ? I.bmf : I.bm)} ${on ? "Saved" : "Save"}</button>`; }
const plFor = (k, pl) => k === "9:16" ? (pl === "stories" ? "stories" : "reels") : "feed";
let lastFocus = null;
function openViewer(id, ctx, fromRoute) {
  const it = BYID[id]; if (!it) return;
  const list = (S.lists[ctx] && S.lists[ctx].includes(it.id)) ? S.lists[ctx] : [it.id];
  const f = S.fmt[it.id] || it.def;
  S.viewer = { id: it.id, list, fmt: f, pl: plFor(f, null) };
  lastFocus = document.activeElement;
  const L = $("#viewer");
  L.hidden = false; suspended = L;
  document.documentElement.style.overflow = "hidden";
  $$("#main video").forEach(v => v.pause());
  if (!fromRoute) { if (location.hash && !location.hash.startsWith("#ad/")) S._back = location.hash; history.replaceState(null, "", "#ad/" + it.id); }
  S.viewer.back = S._back || "#discover";
  drawViewer();
  $("#viewer [data-x]").focus();
}
function closeViewer(fromRoute) {
  const L = $("#viewer");
  if (L.hidden) return;
  $$("video", L).forEach(v => { v.pause(); v.removeAttribute("src"); v.load(); });
  const back = S.viewer && S.viewer.back;
  L.hidden = true; L.innerHTML = ""; S.viewer = null; suspended = null;
  document.documentElement.style.overflow = "";
  if (!fromRoute && location.hash.startsWith("#ad/")) history.replaceState(null, "", back || "#discover");
  rearmPlayback($("#main"));
  if (lastFocus && lastFocus.isConnected) try { lastFocus.focus({ preventScroll: true }); } catch (e) { }
}
function stepViewer(d) {
  const { list, id } = S.viewer; const i = list.indexOf(id);
  const n = list[(i + d + list.length) % list.length];
  const it = BYID[n]; const f = S.fmt[it.id] || it.def;
  S.viewer.id = it.id; S.viewer.fmt = f; S.viewer.pl = plFor(f, S.viewer.pl);
  history.replaceState(null, "", "#ad/" + it.id);
  drawViewer();
}
function viewerFormat(k) {
  if (!S.viewer) return; const it = BYID[S.viewer.id];
  if (!it.fm[k]) return;
  S.viewer.fmt = k; S.viewer.pl = plFor(k, S.viewer.pl); S.fmt[it.id] = k;
  drawViewer(true);
}
function viewerPlacement(pl) {
  const it = BYID[S.viewer.id];
  S.viewer.pl = pl;
  if (pl === "feed" && S.viewer.fmt === "9:16") { const k = ["4:5", "1:1", "16:9"].find(x => it.fm[x]); if (k) S.viewer.fmt = k; }
  if (pl !== "feed" && S.viewer.fmt !== "9:16" && it.fm["9:16"]) S.viewer.fmt = "9:16";
  drawViewer(true);
}
function cycleFormat() { const it = BYID[S.viewer.id]; if (it.nf < 2) return; const i = it.fl.indexOf(S.viewer.fmt); viewerFormat(it.fl[(i + 1) % it.fl.length]); }
function drawViewer(keepScroll) {
  const it = BYID[S.viewer.id];
  const m = it.fm[S.viewer.fmt] || cur(it);
  const L = $("#viewer");
  const sc = keepScroll && L.querySelector(".vw-body") ? L.querySelector(".vw-body").scrollTop : 0;
  $$("video", L).forEach(v => { v.pause(); v.removeAttribute("src"); v.load(); });
  const i = S.viewer.list.indexOf(it.id);
  const concept = ADS.filter(x => x.ck === it.ck && x !== it).sort((x, y) => y.ps - x.ps).slice(0, 12);
  const same = ADS.filter(x => x.bid === it.bid && x !== it && x.ck !== it.ck).sort((x, y) => y.ps - x.ps).slice(0, 10);
  const like = ADS.filter(x => x !== it && x.bid !== it.bid).map(x => ({ x, s: x.vf.filter(v => it.vf.includes(v)).length * 3 + (x.kind === it.kind ? 2 : 0) + (x.g === it.g ? 1 : 0) + (x.lp === it.lp ? 1 : 0) + (x.market === it.market ? 1 : 0) + x.ps / 400 })).sort((p, q) => q.s - p.s).slice(0, 10).map(p => p.x);
  setList("concept", concept); setList("cluster", same); setList("like", like);
  const frames = m.kind === "video" ? [0.5, 1.5, 3, 5, 8, 12] : m.kind === "carousel" ? m.imgs : [m.thumb];
  const plBtns = [["reels", "Reels"], ["stories", "Stories"], ["feed", "Feed"]];
  L.innerHTML = `
  <div class="vw-top">
    <button class="iconbtn" data-x aria-label="Close viewer (Esc)">${I.x}</button>
    <div class="ttl">${esc(it.b)}<small>${i + 1} of ${S.viewer.list.length}${it.nf >= 2 ? ` · ${it.nf} formats` : ""}</small></div>
    <button class="iconbtn" data-prev aria-label="Previous ad">${I.chevL}</button>
    <button class="iconbtn" data-next aria-label="Next ad">${I.chevR}</button>
  </div>
  <div class="vw-body"><div class="vw-grid">
    <div class="vw-stage">
      ${it.nf >= 2 ? `<div class="fseg big" role="group" aria-label="Format">${it.fl.map(k => `<button type="button" data-fmt="${it.id}|${k}" aria-pressed="${k === m.asp}">${k}</button>`).join("")}</div>` : ""}
      <div class="seg" role="group" aria-label="Placement">${plBtns.map(([k, l]) => `<button data-pl="${k}" aria-pressed="${S.viewer.pl === k}">${l}${k === "feed" ? " " + (m.asp === "9:16" ? "4:5" : m.asp) : ""}</button>`).join("")}</div>
      <div class="placement" id="placement" style="width:100%">${igPreview(m, S.viewer.pl)}</div>
      ${m.kind === "video" ? `<button class="pill" id="pv-mute">${sm(I.volOff)} Sound off (M)</button>` : ""}
    </div>
    <div class="vw-info">
      <div class="meta">${logoHTML(it)}<div class="tx"><b>${esc(it.b)}</b><small>${esc(it.g)}${it.market ? " · " + esc(it.market) : ""} · ${it.st === "active" ? "Live" : "Ended " + fmtDate(m.ed)}${m.pl.length ? " · " + esc(m.pl.join(", ")) : ""}</small></div></div>
      <h2 class="display">${esc(m.h || hookLine(m))}</h2>
      <div class="actions">${saveBtnViewer(it.id)}<button class="pill" data-board="${it.id}">${sm(I.board)} Add to board</button><button class="pill" data-reelsfrom="${it.id}">${sm(I.reels)} Reels mode</button>${m.l ? `<a class="pill ghost" href="${esc(m.l)}" target="_blank" rel="noopener">Landing page ${I.ext}</a>` : ""}</div>
      <div class="kbd"><span><kbd>←</kbd><kbd>→</kbd>Previous, next</span>${it.nf >= 2 ? "<span><kbd>F</kbd>Next format</span>" : ""}<span><kbd>S</kbd>Save</span><span><kbd>B</kbd>Board</span><span><kbd>M</kbd>Mute</span><span><kbd>Esc</kbd>Close</span></div>
      <div class="two">
        <div class="panel"><div class="lbl" style="margin-bottom:8px;display:flex;align-items:center;gap:6px">Proven score ${tip(PROVEN_TIP)}</div>
          <div style="display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap"><span class="display num" style="font-size:56px;color:${m.proven ? "var(--jd)" : "var(--t1)"}">${m.ps}</span>
          <span style="color:var(--t3);font-size:13px;padding-bottom:6px">${Math.min(m.d, CAP)} days live${m.d > CAP ? ` (capped, ${m.d} actual)` : ""} + ${m.var} variant${m.var > 1 ? "s" : ""} + ${m.par} parallel launch${m.par === 1 ? "" : "es"}</span></div>
          <div style="margin-top:8px;font-size:13px;color:var(--t2)">${m.proven ? `Proven: running ${PROVEN_DAYS}+ days.` : `Needs ${PROVEN_DAYS - m.d} more days to count as Proven.`}</div></div>
        <div class="panel"><dl class="kv">
          <dt>Days live</dt><dd class="num">${m.d} (${fmtDate(m.sd)} to ${m.st === "active" ? "now" : fmtDate(m.ed)})</dd>
          <dt>Format</dt><dd>${m.kind}${m.kind === "carousel" ? ` · ${m.imgs.length || m.c} cards` : ""} · ${esc(m.ar || m.asp)}${m.aspDerived ? " (estimated)" : ""}</dd>
          <dt>CTA</dt><dd>${esc(m.cta)}</dd>
          <dt>Offer</dt><dd>${m.of ? esc(m.of) : '<span style="color:var(--t3)">None detected</span>'}</dd>
          <dt>Landing</dt><dd>${esc(m.lp)}${m.l ? ` · <a href="${esc(m.l)}" target="_blank" rel="noopener" style="color:var(--jd)">${esc(m.l.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48))}</a>` : ""}</dd>
        </dl></div>
      </div>
      <div class="panel"><div class="lbl" style="margin-bottom:8px">Tags</div><div class="chiprow">${it.vf.length ? it.vf.map(v => `<button class="tag y" data-golib="tag:${esc(v)}">${esc(v)}</button>`).join("") : '<span class="tag">Not tagged by Motion</span>'}<span class="tag">${m.kind}</span><span class="tag">${esc(m.lp)}</span>${it.mk ? `<span class="tag">${esc(it.mk)}</span>` : ""}${it.fl.map(k => `<span class="tag">${k}</span>`).join("")}</div></div>
      ${m.kind === "video" ? `<div class="panel"><div class="lbl" style="margin-bottom:8px">Hook · first 3 seconds</div>
        <div class="tl" id="tl" title="Click to jump"><div class="hook" id="tl-hook" style="width:20%"><span>HOOK</span></div><div class="head" id="tl-head"></div><div class="ticks num" id="tl-ticks"><span>0:00</span><span>&nbsp;</span></div></div>
        <p style="margin:10px 0 0;font-size:14px"><b style="color:var(--jd)">Hook line:</b> ${esc(hookLine(m))}</p></div>` : ""}
      <div class="panel"><div class="lbl" style="margin-bottom:8px">${m.kind === "video" ? "Key frames" : m.kind === "carousel" ? "Cards" : "Frame"}</div>
        <div class="frames">${frames.map((f, k) => m.kind === "video" ? `<div class="fr" data-seek="${f}">${ph(m, 1)}${vidTag(m, { t: f, still: true })}<span>${fmtDur(f)}</span></div>` : `<div class="fr">${ph(m, 1)}<img alt="" loading="lazy" src="${esc(f)}"><span>${k + 1}</span></div>`).join("")}</div></div>
      <div class="panel"><div class="lbl" style="margin-bottom:8px">On-screen headline</div><p style="margin:0;font-size:14px">${esc(m.h || "None captured")}</p>
        <div class="lbl" style="margin:14px 0 8px">Ad copy</div><p style="margin:0;font-size:13.5px;color:var(--t2);white-space:pre-line">${esc(m.x || "No primary text")}</p></div>
      ${it.members.length > 1 ? `<div class="panel"><div class="lbl" style="margin-bottom:8px">In this card · ${it.members.length} ads</div><div class="chiprow">${it.members.map(x => `<span class="tag ${x === m ? "y" : ""}">${esc(x.asp)} · ${x.kind} · ${fmtDate(x.sd)}</span>`).join("")}</div></div>` : ""}
      <div class="panel"><div class="sec-h" style="margin-bottom:10px"><div><div class="lbl">Concept variants</div><p style="margin-top:4px">${concept.length ? `${concept.length} other ad${concept.length === 1 ? "" : "s"} from the same concept (${it.var} in all, ${it.par} launched in parallel).` : "No other ads from this concept yet."}</p></div><a class="more" href="#brand-${it.bid}" data-x>Brand page</a></div>
        ${concept.length ? `<div class="mini">${concept.map(x => card(x, "concept", { sub: `${x.d}d`, nofmt: 1 })).join("")}</div>` : ""}
        ${same.length ? `<div class="lbl" style="margin:14px 0 8px">More from ${esc(it.b)}</div><div class="mini">${same.map(x => card(x, "cluster", { sub: `${x.d}d`, nofmt: 1 })).join("")}</div>` : ""}</div>
      <div class="panel"><div class="lbl" style="margin-bottom:10px">More like this</div><div class="mini">${like.map(x => card(x, "like", { sub: `${x.d}d`, nofmt: 1 })).join("")}</div></div>
    </div>
  </div></div>`;
  wireMedia(L);
  L.querySelector("[data-x]").onclick = () => closeViewer();
  L.querySelector("[data-prev]").onclick = () => stepViewer(-1);
  L.querySelector("[data-next]").onclick = () => stepViewer(1);
  $$("[data-pl]", L).forEach(b => { if (b.tagName === "BUTTON") b.onclick = () => viewerPlacement(b.dataset.pl); });
  $$("a[data-x]", L).forEach(x => x.addEventListener("click", () => closeViewer(true)));
  const pm = $("#pv-mute"); if (pm) pm.onclick = togglePreviewMute;
  const tl = $("#tl"); if (tl) tl.onclick = e => { const v = $("#pv-video"); if (!v || !v.duration) return; const r = tl.getBoundingClientRect(); v.currentTime = (e.clientX - r.left) / r.width * v.duration; };
  $$("[data-seek]", L).forEach(f => f.onclick = () => { const v = $("#pv-video"); if (v) { v.currentTime = +f.dataset.seek; v.play().catch(() => { }); } });
  L.querySelector(".vw-body").scrollTop = sc;
}
function onPreviewMeta(v) {
  const d = v.duration; if (!isFinite(d)) return;
  const h = $("#tl-hook"); if (h) h.style.width = Math.min(100, 3 / d * 100) + "%";
  const t = $("#tl-ticks"); if (t) t.innerHTML = `<span>0:00</span><span>${fmtDur(d / 2)}</span><span>${fmtDur(d)}</span>`;
}
function togglePreviewMute() {
  const v = $("#pv-video"); if (!v) return;
  v.muted = !v.muted; if (!v.muted) v.play().catch(() => { });
  const pm = $("#pv-mute"); if (pm) pm.innerHTML = sm(v.muted ? I.volOff : I.volOn) + (v.muted ? " Sound off (M)" : " Sound on (M)");
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-board]"); if (b) { e.stopPropagation(); boardDialog(b.dataset.board); }
  const r = e.target.closest("[data-reelsfrom]"); if (r) { const id = r.dataset.reelsfrom; const list = S.viewer ? S.viewer.list : [id]; closeViewer(true); openReels(list, id); }
});

/* keyboard */
document.addEventListener("keydown", e => {
  if (e.target.matches && e.target.matches("input,textarea,select")) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if ($("#overlays").firstElementChild) { if (e.key === "Escape") $("#overlays").innerHTML = ""; return; }
  if (S.viewer) {
    const k = e.key.toLowerCase();
    if (k === "escape") closeViewer();
    else if (k === "arrowright" || k === "arrowdown" || k === "j") { e.preventDefault(); stepViewer(1); }
    else if (k === "arrowleft" || k === "arrowup" || k === "k") { e.preventDefault(); stepViewer(-1); }
    else if (k === "s") toggleSave(S.viewer.id);
    else if (k === "b") boardDialog(S.viewer.id);
    else if (k === "m") togglePreviewMute();
    else if (k === "f") cycleFormat();
    else if (k === "1" || k === "2" || k === "3") viewerPlacement(["reels", "stories", "feed"][+k - 1]);
    return;
  }
  if (!$("#reels").hidden) {
    const k = e.key.toLowerCase();
    if (k === "escape") closeReels();
    else if (k === "arrowdown" || k === "arrowright" || k === "j") { e.preventDefault(); reelStep(1); }
    else if (k === "arrowup" || k === "arrowleft" || k === "k") { e.preventDefault(); reelStep(-1); }
    else if (k === "m") reelSound();
    else if (k === "s") { const a = currentReel(); if (a) toggleSave(a); }
    return;
  }
  if (e.key === "/" && S.view === "discover") { e.preventDefault(); $("#q") && $("#q").focus(); }
});

/* ---------- boards (team-shared: in_boards, in_board_items) ---------- */
const notes = store.get("notes", {});
const boardItems = bid => {
  const ids = S.items.filter(x => x.board_id === bid).map(x => x.ad_id);
  const order = store.get("order_" + bid, []);
  ids.sort((p, q) => { const a = order.indexOf(p), b = order.indexOf(q); return (a < 0 ? 1e6 : a) - (b < 0 ? 1e6 : b); });
  return ids;
};
const inBoard = (bid, it) => S.items.some(x => x.board_id === bid && it.members.some(m => m.id === x.ad_id));
async function addBoard(name) {
  const r = await api("in_boards", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name, created_by: me() }) });
  const b = r.data[0]; S.boards.push(b); return b;
}
async function toggleBoard(bid, it) {
  const m = me();
  if (inBoard(bid, it)) {
    const ids = S.items.filter(x => x.board_id === bid && it.members.some(mm => mm.id === x.ad_id)).map(x => x.ad_id);
    S.items = S.items.filter(x => !(x.board_id === bid && ids.includes(x.ad_id)));
    for (const id of ids) await api("in_board_items?board_id=eq." + bid + "&ad_id=eq." + id, { method: "DELETE" });
    return false;
  }
  const row = { board_id: bid, ad_id: it.id, src: "discovery", added_by: m };
  S.items.unshift({ ...row, created_at: new Date().toISOString() });
  await api("in_board_items", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
  return true;
}
function boardDialog(id) {
  const it = BYID[id]; if (!it) return;
  if (!me()) { gate(); return; }
  const o = $("#overlays");
  const draw = () => {
    o.innerHTML = `<div class="dlg-bg" data-close><div class="dlg" role="dialog" aria-label="Add to board" onclick="event.stopPropagation()">
      <h3 class="display">Add to board</h3>
      ${S.saveErr ? `<p style="color:var(--t3)">Boards could not load: ${esc(S.saveErr)}</p>` : ""}
      ${S.boards.map(b => { const on = inBoard(b.id, it); return `<button class="row" data-tb="${b.id}"><span class="logo" style="background:${on ? "var(--jd)" : "var(--s3)"};color:${on ? "#000" : "var(--t2)"}">${sm(on ? I.check : I.plus)}</span><span style="flex:1">${esc(b.name)}</span><small style="color:var(--t3)">${S.items.filter(x => x.board_id === b.id).length} ads</small></button>`; }).join("")}
      <form id="nbf"><input id="nbname" placeholder="New board name" aria-label="New board name" maxlength="60"></form>
      <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="pill on" data-done>Done</button></div>
    </div></div>`;
    o.querySelector("[data-close]").onclick = () => o.innerHTML = "";
    o.querySelector("[data-done]").onclick = () => o.innerHTML = "";
    $$("[data-tb]", o).forEach(b => b.onclick = async () => {
      const bd = S.boards.find(x => x.id === b.dataset.tb);
      try { const added = await toggleBoard(bd.id, it); toast(added ? `Added to ${bd.name}` : `Removed from ${bd.name}`); } catch (e) { toast("Could not update board: " + e.message); }
      draw();
    });
    $("#nbf").onsubmit = async e => { e.preventDefault(); const n = $("#nbname").value.trim(); if (!n) return; try { const bd = await addBoard(n); await toggleBoard(bd.id, it); toast(`Added to ${n}`); } catch (err) { toast("Could not create board: " + err.message); } draw(); };
  };
  draw();
}
let sortable = null;
function renderBoards() {
  const el = $("#v-boards");
  if (!S.boards.length) {
    el.innerHTML = `<div class="wrap"><div class="sec"><div class="sec-h"><div><h2 class="display">Boards</h2><p>Team boards, shared with the Inspo tab.</p></div></div>
      ${S.saveErr ? `<div class="note"><div><b>Boards could not load.</b> ${esc(S.saveErr)}</div></div>` : `<div class="empty">No boards yet. Open any ad and press B, or tap Add to board.</div>`}
      <div style="margin-top:16px"><button class="pill on" data-newboard>${sm(I.plus, 14)} New board</button></div></div></div>`;
    el.onclick = e => { if (e.target.closest("[data-newboard]")) newBoard(); };
    return;
  }
  const bd = S.boards.find(b => b.id === S.board) || S.boards[0];
  S.board = bd.id;
  const ids = boardItems(bd.id);
  const seen = new Set(), list = [];
  ids.forEach(id => { const it = BYID[id]; if (it && !seen.has(it.id)) { seen.add(it.id); list.push({ it, ad: id }); } });
  const hidden = ids.filter(id => !BYID[id]).length;
  setList("board", list.map(x => x.it));
  el.innerHTML = `<div class="wrap"><div class="sec">
    <div class="sec-h"><div><h2 class="display">Boards</h2><p>Team boards, shared with the Inspo tab. Collect references, drag to reorder, add a note to each, then turn the board into a brief.</p></div></div>
    <div class="boardbar">${S.boards.map(b => `<button class="chip" data-bd="${b.id}" aria-pressed="${b.id === bd.id}">${esc(b.name)}<b>${S.items.filter(x => x.board_id === b.id).length}</b></button>`).join("")}<button class="chip" data-newboard>${sm(I.plus, 14)} New board</button></div>
    <div class="ctrls" style="margin:10px 0 16px"><h3 class="display" style="margin:0;font-size:30px;padding-top:4px">${esc(bd.name)}</h3>
      <div class="actions"><button class="pill" data-share>${sm(I.link)} Share</button><button class="pill" data-boardreels>${sm(I.reels)} Play</button><button class="pill on" data-brief>${sm(I.doc)} Make a brief from this board</button></div></div>
    ${hidden ? `<p class="rescount">${hidden} saved ad${hidden === 1 ? " isn't" : "s aren't"} in this preview yet (later batch or non-English). They still show in the Inspo tab.</p>` : ""}
    ${list.length ? `<div class="mood" id="mood">${list.map(({ it, ad }) => `<div class="mitem" data-iid="${ad}">
      <div class="hdl"><span class="grip" aria-label="Drag to reorder" title="Drag to reorder">${I.grip}</span><b>${esc(it.b)}</b><button class="iconbtn" data-rm="${it.id}" aria-label="Remove from board" style="width:44px;height:44px">${sm(I.trash, 18)}</button></div>
      ${card(it, "board", { nometa: 1 })}
      <label class="lbl" for="n-${ad}">Note <span style="text-transform:none;letter-spacing:0;font-weight:500">(saved on this device)</span></label><textarea id="n-${ad}" data-note="${ad}" placeholder="Why this one?">${esc(notes[bd.id + "|" + ad] || "")}</textarea></div>`).join("")}</div>` : `<div class="empty">This board is empty. Open any ad and press B, or tap Add to board.</div>`}
    <div id="briefOut"></div>
  </div></div>`;
  wireMedia(el);
  if (sortable) { sortable.destroy(); sortable = null; }
  const mood = $("#mood");
  if (mood && window.Sortable) {
    sortable = Sortable.create(mood, { handle: ".grip", animation: 180, ghostClass: "ghost", chosenClass: "chosen", onEnd: () => {
      store.set("order_" + bd.id, $$(".mitem", mood).map(m => m.dataset.iid)); setList("board", boardItems(bd.id).map(id => BYID[id]).filter(Boolean)); toast("Order saved on this device");
    } });
  }
  el.onclick = async e => {
    const b = e.target.closest("[data-bd]"); if (b) { S.board = b.dataset.bd; history.replaceState(null, "", "#board-" + S.board); renderBoards(); return; }
    if (e.target.closest("[data-newboard]")) { newBoard(); return; }
    const rm = e.target.closest("[data-rm]"); if (rm) { try { await toggleBoard(bd.id, BYID[rm.dataset.rm]); toast("Removed from board"); } catch (err) { toast("Could not remove: " + err.message); } renderBoards(); return; }
    if (e.target.closest("[data-share]")) { shareBoard(bd); return; }
    if (e.target.closest("[data-boardreels]")) { openReels(S.lists.board, null); return; }
    if (e.target.closest("[data-brief]")) { $("#briefOut").innerHTML = briefHTML(bd, list); wireMedia($("#briefOut")); $("#briefOut").scrollIntoView({ behavior: "smooth", block: "start" }); }
  };
  el.oninput = e => { const t = e.target.closest("[data-note]"); if (t) { notes[bd.id + "|" + t.dataset.note] = t.value; store.set("notes", notes); } };
}
function newBoard() {
  if (!me()) { gate(); return; }
  const o = $("#overlays");
  o.innerHTML = `<div class="dlg-bg" data-close><div class="dlg" onclick="event.stopPropagation()" role="dialog" aria-label="New board"><h3 class="display">New board</h3><form id="nb2"><input id="nb2n" placeholder="Board name" aria-label="Board name" maxlength="60" required><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button type="button" class="pill" data-close2>Cancel</button><button class="pill on">Create</button></div></form></div></div>`;
  o.querySelector("[data-close]").onclick = () => o.innerHTML = "";
  o.querySelector("[data-close2]").onclick = () => o.innerHTML = "";
  $("#nb2n").focus();
  $("#nb2").onsubmit = async e => { e.preventDefault(); const n = $("#nb2n").value.trim(); if (!n) return; try { const bd = await addBoard(n); S.board = bd.id; o.innerHTML = ""; renderBoards(); toast("Board created"); } catch (err) { toast("Could not create board: " + err.message); } };
}
function shareBoard(bd) {
  const url = location.href.split("#")[0] + "#board-" + bd.id;
  const done = () => toast(`Link to “${bd.name}” copied`);
  const fallback = () => {
    const o = $("#overlays");
    o.innerHTML = `<div class="dlg-bg" data-close><div class="dlg" onclick="event.stopPropagation()"><h3 class="display">Share board</h3><p style="color:var(--t3);margin:0">Copy this link. Boards are shared with everyone on the team.</p><input id="shareurl" readonly value="${esc(url)}"><div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="pill on" data-close2>Done</button></div></div></div>`;
    o.querySelector("[data-close]").onclick = () => o.innerHTML = ""; o.querySelector("[data-close2]").onclick = () => o.innerHTML = "";
    const i = $("#shareurl"); i.focus(); i.select();
  };
  try { navigator.clipboard.writeText(url).then(done, fallback); } catch (e) { fallback(); }
}
function briefHTML(bd, list) {
  const ads = list.map(x => x.it);
  if (!ads.length) return `<div class="empty" style="margin-top:20px">Add a few ads first.</div>`;
  const tags = {}; ads.forEach(a => a.vf.forEach(v => tags[v] = (tags[v] || 0) + 1));
  const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 3).map(t => t[0]);
  const brands = [...new Set(ads.map(a => a.b))];
  const vids = ads.filter(a => a.kinds.has("video")).length;
  const avg = Math.round(ads.reduce((s, a) => s + a.d, 0) / ads.length);
  const offers = ads.filter(a => a.of).map(a => a.of);
  return `<div class="brief" style="margin-top:24px">
    <div class="bh"><span class="lbl" style="color:#000">Draft brief · ${new Date().toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" })}</span><h3 class="display">${esc(bd.name)}</h3><div style="font-weight:600;margin-top:6px">JD Sports Canada · Meta paid social</div></div>
    <div class="bb">
      <div><h4>What the references have in common</h4><ul>
        <li>${ads.length} references from ${brands.length} brand${brands.length === 1 ? "" : "s"} (${esc(brands.slice(0, 5).join(", "))}${brands.length > 5 ? " and more" : ""}).</li>
        <li>${vids} of ${ads.length} are video. Average run ${avg} days.</li>
        ${top.length ? `<li>Most common formats: ${top.map(esc).join(", ")}.</li>` : ""}
        ${offers.length ? `<li>Offers used: ${esc([...new Set(offers)].slice(0, 3).join("; "))}.</li>` : "<li>Most lead with product, not price.</li>"}
      </ul></div>
      <div><h4>Hook direction</h4><ul>${ads.slice(0, 4).map(a => `<li>Like ${esc(a.b)}: “${esc(hookLine(a))}”</li>`).join("")}</ul></div>
      <div><h4>Deliverables</h4><ul><li>Reels 9:16, 15s and 6s cuts, safe zones respected, captions burned in.</li><li>Stories 9:16 with the CTA sticker in the lower third.</li><li>Feed 4:5 static and a 3 to 5 card carousel.</li><li>File naming: JD_DDMMYY_Campaign_Project_Deliverable_Spec_v1.</li></ul></div>
      <div><h4>Mandatories</h4><ul><li>JD Roundel flush right, JD Yellow #FFDE14, Forever Forward Sans headlines.</li><li>Canadian pricing in CAD, Canadian English, French versions for Québec.</li><li>No generated people or places.</li></ul></div>
      <div><h4>References</h4><div class="refs">${list.map(({ it: a, ad }) => { const n = notes[bd.id + "|" + ad]; return `<div class="ref">${card(a, "board", { nometa: 1, nofmt: 1 })}<b style="color:var(--t1)">${esc(a.b)}</b><span>${a.d} days · ${cur(a).kind}${a.vf[0] ? " · " + esc(a.vf[0]) : ""}</span>${n ? `<span style="color:var(--jd)">${esc(n)}</span>` : ""}</div>`; }).join("")}</div></div>
    </div></div>`;
}

/* ---------- REELS MODE ---------- */
let reelSoundOn = false, reelIO = null, reelLazy = null;
function defaultReels() {
  return ADS.filter(a => a.fm["9:16"]).sort((a, b) => (b.fm["9:16"].kind === "video") - (a.fm["9:16"].kind === "video") || b.ps - a.ps).slice(0, 300).map(a => a.id);
}
function openReels(list, startId) {
  if (!list || !list.length) list = defaultReels();
  list = list.slice(0, 400);
  const R = $("#reels");
  R.hidden = false; suspended = R;
  document.documentElement.style.overflow = "hidden";
  $$("#main video").forEach(v => v.pause());
  R.innerHTML = `<button class="reels-x" id="reelsX" aria-label="Close Reels (Esc)">${I.back}</button>
  <div class="reels-nav"><button id="rUp" aria-label="Previous reel">${I.chevU}</button><button id="rDn" aria-label="Next reel">${I.chevD}</button></div>
  <div class="reels-scroll" id="rs">${list.map(id => { const it = BYID[id]; if (!it) return ""; const a = it.fm["9:16"] || cur(it); return `<section class="reel" data-rid="${it.id}"><div class="frame">
    <div class="ig-media" data-tap>${ph(a)}${a.kind === "video" ? `<video muted playsinline loop preload="none" ${a.poster ? `poster="${esc(a.poster)}"` : ""} data-rsrc="${esc(a.video)}#t=0.1"></video>` : a.kind === "carousel" ? mediaInner(a) : `<img alt="" loading="lazy" src="${esc(a.thumb || a.imgs[0] || "")}">`}</div>
    <div class="ig-shade t"></div><div class="ig-shade"></div>
    ${reelOverlay(a, false)}
    <div class="snd" aria-hidden="true">${I.volOff}</div>
    ${a.kind === "video" ? `<div class="igprog"><i></i></div>` : ""}
  </div></section>`; }).join("")}</div>`;
  const rs = $("#rs");
  reelLazy = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { if (!v.getAttribute("src")) { v.src = v.dataset.rsrc; v.preload = "metadata"; } } else if (v.getAttribute("src")) { v.pause(); v.removeAttribute("src"); v.load(); } }), { root: rs, rootMargin: "150% 0px" });
  reelIO = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && e.intersectionRatio > .6) { if (!v.getAttribute("src")) v.src = v.dataset.rsrc; v.muted = !reelSoundOn; v.currentTime = 0; v.play().catch(() => { v.muted = true; v.play().catch(() => { }); }); }
    else v.pause();
  }), { root: rs, threshold: [0, .6] });
  $$("video[data-rsrc]", rs).forEach(v => { reelLazy.observe(v); reelIO.observe(v); });
  $("#reelsX").onclick = () => closeReels();
  $("#rUp").onclick = () => reelStep(-1);
  $("#rDn").onclick = () => reelStep(1);
  let lastTap = 0;
  rs.addEventListener("click", e => {
    const m = e.target.closest("[data-tap]"); if (!m) return;
    const now = Date.now();
    if (now - lastTap < 300) { const id = m.closest(".reel").dataset.rid; if (!S.likes.has(id)) toggleLike(id); const h = document.createElement("div"); h.className = "heartpop"; h.innerHTML = I.heartf; m.parentElement.appendChild(h); setTimeout(() => h.remove(), 750); lastTap = 0; return; }
    lastTap = now;
    setTimeout(() => { if (lastTap === now) reelSound(m.closest(".frame")); }, 280);
  });
  if (startId) { const el = rs.querySelector(`[data-rid="${BYID[startId] ? BYID[startId].id : startId}"]`); if (el) rs.scrollTop = el.offsetTop; }
  if (location.hash !== "#reels") { S._reelsBack = location.hash.startsWith("#ad/") ? "#discover" : (location.hash || "#discover"); history.replaceState(null, "", "#reels"); }
  renderNav();
  $("#reelsX").focus();
}
function reelSound(frame) {
  reelSoundOn = !reelSoundOn;
  $$("#rs video").forEach(v => v.muted = !reelSoundOn);
  const c = frame || $(`#rs [data-rid="${currentReel()}"] .frame`);
  const v = c && c.querySelector("video"); if (v && reelSoundOn) v.play().catch(() => { });
  if (c) { const s = c.querySelector(".snd"); s.innerHTML = reelSoundOn ? I.volOn : I.volOff; s.classList.add("show"); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove("show"), 700); }
}
function currentReel() { const rs = $("#rs"); if (!rs) return null; const i = Math.round(rs.scrollTop / rs.clientHeight); const el = rs.children[i]; return el && el.dataset.rid; }
function reelStep(d) { const rs = $("#rs"); rs.scrollBy({ top: d * rs.clientHeight, behavior: "smooth" }); }
function closeReels(fromRoute) {
  const R = $("#reels");
  if (reelIO) reelIO.disconnect(); if (reelLazy) reelLazy.disconnect();
  $$("video", R).forEach(v => { v.pause(); v.removeAttribute("src"); v.load(); });
  R.hidden = true; R.innerHTML = ""; suspended = null;
  document.documentElement.style.overflow = "";
  if (!fromRoute) {
    const back = S._reelsBack || "#discover";
    if (location.hash === "#reels") { history.replaceState(null, "", back); if (!$(`.view[data-view="${S.view === "brand" ? "brands" : S.view}"]`)?.innerHTML) route(); }
    renderNav();
  }
  rearmPlayback($("#main"));
}

/* ---------- BRANDS ---------- */
function mixBar(b) { const t = b.v + b.im + b.ca || 1; return `<div class="mix" title="Video ${b.v}, image ${b.im}, carousel ${b.ca}"><i class="v" style="width:${b.v / t * 100}%"></i><i class="im" style="width:${b.im / t * 100}%"></i><i class="ca" style="width:${b.ca / t * 100}%"></i></div>`; }
function brandLogo(b, cls = "logo") { return `<span class="${cls}">${esc(initials(b.b))}${b.logo ? `<img alt="" loading="lazy" src="${esc(b.logo)}">` : ""}</span>`; }
const gName = g => g === "Brand" ? "Brand partner" : g === "JD Global" ? "JD Group" : g;
function renderBrands() {
  const el = $("#v-brands");
  const groups = ["all", "following", "JD Global", "Competitor", "Brand", "DTC Fashion", "Category finds"];
  const shown = BRANDS.filter(b => b.n >= 3);
  let list = shown.filter(b => S.bfilter === "all" || (S.bfilter === "following" ? S.follows.has(b.bid) : b.g === S.bfilter));
  list = list.slice().sort((a, b) => ({ live: b.live - a.live, new: b.nw2 - a.nw2, run: b.avgd - a.avgd, proven: b.proven - a.proven })[S.bsort] || a.b.localeCompare(b.b));
  el.innerHTML = `<div class="wrap">
    <div class="sec"><div class="sec-h"><div><h2 class="display">Brands</h2><p>${shown.length} brands with 3+ ads in batch 1. Follow brands to pin them. Tick Compare on 2 or 3 to see them side by side.</p></div></div>
    <div class="chips" style="padding-top:0">${groups.map(g => `<button class="chip" data-bf="${g}" aria-pressed="${S.bfilter === g}">${g === "all" ? "All" : g === "following" ? "Following" : g === "Brand" ? "Brand partners" : g === "JD Global" ? "JD" : g}<b>${g === "all" ? shown.length : g === "following" ? shown.filter(b => S.follows.has(b.bid)).length : shown.filter(b => b.g === g).length}</b></button>`).join("")}</div>
    <div class="ctrls" style="margin:6px 0 16px"><div class="seg" role="group" aria-label="Sort brands">${[["live", "Most live"], ["new", "New in 2 weeks"], ["run", "Longest runs"], ["proven", "Most proven"]].map(([k, l]) => `<button data-bs="${k}" aria-pressed="${S.bsort === k}">${l}</button>`).join("")}</div>
      <div class="legend"><span><i style="background:var(--jd)"></i>Video</span><span><i style="background:var(--t2)"></i>Image</span><span><i style="background:var(--teal)"></i>Carousel</span></div></div>
    <div class="bgrid">${list.map(b => {
      const f = S.follows.has(b.bid), c = S.compare.includes(b.bid);
      return `<div class="bcard"><a class="hd" href="#brand-${b.bid}" style="text-decoration:none">${brandLogo(b)}<span class="nm"><b>${esc(b.b)}</b><small>${esc(gName(b.g))}${b.market ? " · " + esc(b.market) : ""} · ${b.n} ads</small></span>${I.chevR.replace("<svg", '<svg width="18" height="18" style="color:var(--t3);flex:none"')}</a>
        <div class="bstats num"><div><b>${b.live}</b><span>Live ads</span></div><div><b>${b.nw2}</b><span>New, 2 wks</span></div><div><b>${b.avgd}d</b><span>Avg run</span></div></div>
        ${mixBar(b)}
        <div class="row"><button class="pill ${f ? "on" : ""}" data-follow="${b.bid}" aria-pressed="${f}">${f ? "Following" : "Follow"}</button><button class="pill ${c ? "on" : ""}" data-cmp="${b.bid}" aria-pressed="${c}">${c ? sm(I.check, 14) + " " : ""}Compare</button></div></div>`;
    }).join("")}</div></div></div>
    ${S.compare.length ? `<div class="cmpbar"><span class="tx">${S.compare.length} of 3 selected: ${S.compare.map(id => esc(BRAND_BY[id].b)).join(", ")}</span><button class="pill" data-cmpclear>Clear</button><a class="pill" href="#compare" ${S.compare.length < 2 ? 'aria-disabled="true" style="opacity:.5;pointer-events:none"' : ""}>Compare</a></div>` : ""}`;
  el.onclick = e => {
    const bf = e.target.closest("[data-bf]"); if (bf) { S.bfilter = bf.dataset.bf; renderBrands(); return; }
    const bs = e.target.closest("[data-bs]"); if (bs) { S.bsort = bs.dataset.bs; renderBrands(); return; }
    const fo = e.target.closest("[data-follow]"); if (fo) { toggleFollow(fo.dataset.follow); renderBrands(); return; }
    const cm = e.target.closest("[data-cmp]"); if (cm) { const id = cm.dataset.cmp; const i = S.compare.indexOf(id); if (i >= 0) S.compare.splice(i, 1); else { if (S.compare.length >= 3) { toast("Compare up to 3 brands"); return; } S.compare.push(id); } renderBrands(); return; }
    if (e.target.closest("[data-cmpclear]")) { S.compare = []; renderBrands(); }
  };
}
function toggleFollow(id) { S.follows.has(id) ? S.follows.delete(id) : S.follows.add(id); store.set("follows", [...S.follows]); toast(S.follows.has(id) ? `Following ${BRAND_BY[id].b}` : `Unfollowed ${BRAND_BY[id].b}`); }
function renderBrandPage(bid) {
  const el = $("#v-brands");
  const b = BRAND_BY[bid];
  if (!b) { el.innerHTML = `<div class="wrap"><div class="empty" style="margin-top:32px">Brand not found in batch 1. <a href="#brands">Back to brands</a></div></div>`; return; }
  const all = ADS.filter(a => a.bid === bid);
  const proven = setList("brand", all.slice().sort((x, y) => y.ps - x.ps));
  const newest = setList("brand-new", all.slice().sort((x, y) => x.age - y.age || y.ps - x.ps));
  const f = S.follows.has(bid);
  const tags = {}; all.forEach(a => a.vf.forEach(v => tags[v] = (tags[v] || 0) + 1));
  const topTags = Object.entries(tags).sort((p, q) => q[1] - p[1]).slice(0, 8);
  const asp = {}; all.forEach(a => a.fl.forEach(k => asp[k] = (asp[k] || 0) + 1));
  const lps = {}; all.forEach(a => lps[a.lp] = (lps[a.lp] || 0) + 1);
  el.innerHTML = `<div class="wrap"><div class="sec">
    <a class="pill ghost" href="#brands" style="margin-bottom:16px">${sm(I.back)} All brands</a>
    <div class="bhead">${brandLogo(b)}<div style="flex:1;min-width:0"><span class="lbl">${esc(gName(b.g))}${b.market ? " · " + esc(b.market) : ""}</span><h1 class="display">${esc(b.b)}</h1></div>
      <button class="pill ${f ? "on" : ""}" data-follow="${bid}" aria-pressed="${f}">${f ? "Following" : "Follow"}</button></div>
    <div class="bstats num" style="margin-top:18px;grid-template-columns:repeat(auto-fit,minmax(110px,1fr))"><div><b>${b.n}</b><span>Ads</span></div><div><b>${b.live}</b><span>Live now</span></div><div><b>${b.nw}</b><span>New this week</span></div><div><b>${b.avgd}d</b><span>Avg run</span></div><div><b>${b.proven}</b><span>Proven 60+</span></div></div>
    <div class="panel" style="margin-top:14px"><div class="lbl" style="margin-bottom:8px">Creative mix</div>${mixBar(b)}
      <div class="legend" style="margin-top:8px"><span><i style="background:var(--jd)"></i>Video ${b.v}</span><span><i style="background:var(--t2)"></i>Image ${b.im}</span><span><i style="background:var(--teal)"></i>Carousel ${b.ca}</span></div>
      <div class="chiprow" style="margin-top:12px">${ASPECTS.filter(k => asp[k]).map(k => `<span class="tag">${k} · ${asp[k]}</span>`).join("")}${Object.entries(lps).sort((p, q) => q[1] - p[1]).slice(0, 4).map(([k, n]) => `<span class="tag">${esc(k)} · ${n}</span>`).join("")}</div>
      ${topTags.length ? `<div class="chiprow" style="margin-top:8px">${topTags.map(([t, n]) => `<button class="tag y" data-golib="tag:${esc(t)}">${esc(t)} · ${n}</button>`).join("")}</div>` : ""}</div>
  </div>
  <section class="sec"><div class="sec-h"><div><h2 class="display">Proven ${tip(PROVEN_TIP)}</h2><p>Top ${Math.min(10, proven.length)} by Proven score.</p></div><button class="more" data-reelslist="brand">Watch as Reels</button></div>
  <div class="rail">${proven.slice(0, 10).map(a => card(a, "brand", { score: 1, sub: `${a.d} days · ${a.var} var` })).join("")}</div></section>
  <section class="sec"><div class="sec-h"><div><h2 class="display">Newest</h2><p>All ${all.length} ads, newest first.</p></div></div><div id="bgridhost"></div></section></div>`;
  wireMedia(el);
  growGrid($("#bgridhost"), newest, "brand-new");
  el.onclick = e => {
    const fo = e.target.closest("[data-follow]"); if (fo) { toggleFollow(bid); const p = fo; const on = S.follows.has(bid); p.classList.toggle("on", on); p.setAttribute("aria-pressed", on); p.textContent = on ? "Following" : "Follow"; return; }
    const rl = e.target.closest("[data-reelslist]"); if (rl) openReels(S.lists.brand, null);
  };
}
function renderCompare() {
  const el = $("#v-brands");
  if (S.compare.length < 2) S.compare = BRANDS.slice(0, 3).map(b => b.bid);
  const bs = S.compare.map(id => BRAND_BY[id]).filter(Boolean);
  const row = (label, fn, best) => { const vals = bs.map(fn); const mx = Math.max(...vals.map(v => typeof v === "number" ? v : -1)); return `<tr><th scope="row" class="lbl">${label}</th>${vals.map(v => `<td class="n num" style="${best && v === mx ? "color:var(--jd)" : ""}">${v}</td>`).join("")}</tr>`; };
  el.innerHTML = `<div class="wrap"><div class="sec">
    <a class="pill ghost" href="#brands" style="margin-bottom:16px">${sm(I.back)} All brands</a>
    <div class="sec-h"><div><h2 class="display">Compare</h2><p>Yellow marks the leader on each row.</p></div></div>
    <div class="scrollx"><table class="cmpt"><thead><tr><th></th>${bs.map(b => `<th><span style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:14px;color:var(--t1)">${brandLogo(b)}${esc(b.b)}</span></th>`).join("")}</tr></thead><tbody>
      ${row("Ads", b => b.n, 1)}${row("Live now", b => b.live, 1)}${row("New this week", b => b.nw, 1)}${row("New in 2 weeks", b => b.nw2, 1)}${row("Avg run (days)", b => b.avgd, 1)}${row("Proven 60+", b => b.proven, 1)}
      <tr><th scope="row" class="lbl">Format mix</th>${bs.map(b => `<td>${mixBar(b)}<div class="legend" style="margin-top:6px"><span>${Math.round(b.v / b.n * 100)}% video</span><span>${Math.round(b.im / b.n * 100)}% image</span><span>${Math.round(b.ca / b.n * 100)}% carousel</span></div></td>`).join("")}</tr>
    </tbody></table></div></div>
    ${bs.map(b => { const ads = setList("cmp-" + b.bid, ADS.filter(a => a.bid === b.bid).sort((x, y) => y.ps - x.ps).slice(0, 8)); return `<section class="sec"><div class="sec-h"><div><h2 class="display">${esc(b.b)}</h2><p>Top ads by Proven score.</p></div><a class="more" href="#brand-${b.bid}">Brand page</a></div><div class="rail">${ads.map(a => card(a, "cmp-" + b.bid)).join("")}</div></section>`; }).join("")}
  </div>`;
  wireMedia(el);
}

/* ---------- JD GLOBAL ---------- */
function renderGlobal() {
  const el = $("#v-global");
  const mkts = ["all", ...WORLD.map(w => w[0]), "JD France"];
  const all = ADS.filter(a => a.mk);
  const list = setList("global", all.filter(a => S.gmk === "all" || a.mk === S.gmk).sort((a, b) => b.ps - a.ps));
  const fmt = {}; all.forEach(a => a.vf.forEach(v => fmt[v] = (fmt[v] || 0) + 1));
  const live = all.filter(a => a.st === "active").length;
  const show = Math.min(list.length, S.gshow || 60);
  el.innerHTML = `<div class="wrap"><div class="sec">
    <div class="sec-h"><div><h2 class="display">JD Global ${tip(PROVEN_TIP)}</h2><p>What JD UK, US, Australia, New Zealand and Finish Line run, sorted by Proven score. Ideas to bring to JD Canada.</p></div></div>
    <div class="two three" style="display:grid;gap:12px;margin-bottom:16px">
      <div class="panel"><div class="lbl">Ads from sister banners</div><div class="display num" style="font-size:52px;margin-top:6px">${fmtN(all.length)}</div><div style="color:var(--t3);font-size:12.5px">${fmtN(live)} live now · ${all.filter(a => a.proven).length} Proven</div></div>
      <div class="panel"><div class="lbl">In 2+ formats</div><div class="display num" style="font-size:52px;margin-top:6px;color:var(--jd)">${all.filter(a => a.nf >= 2).length}</div><div style="color:var(--t3);font-size:12.5px">Same ad cut for Reels, Stories and Feed.</div></div>
      <div class="panel"><div class="lbl">Formats they lean on</div><div class="chiprow" style="margin-top:8px">${Object.entries(fmt).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, n]) => `<button class="tag" data-golib="tag:${esc(t)}">${esc(t)} · ${n}</button>`).join("") || '<span class="tag">Not tagged by Motion</span>'}</div></div>
    </div>
    <div class="chips" style="padding-top:0">${mkts.map(m => { const n = m === "all" ? all.length : all.filter(a => a.mk === m).length; return `<button class="chip" data-mk="${m}" aria-pressed="${S.gmk === m}" ${n ? "" : "disabled"}>${m === "all" ? "All markets" : m}<b>${n || "not tracked"}</b></button>`; }).join("")}</div>
    <div style="margin-top:8px">${list.slice(0, show).map(a => { const m = cur(a); return `<div class="lrow"><div class="media" data-open="${a.id}" data-ctx="global" role="button" tabindex="0" aria-label="Open ad">${ph(m, 1)}${m.kind === "video" ? vidTag(m) : imgTag(m)}</div>
      <div class="tx"><b>${esc(a.h || hookLine(a))}</b><small>${a.d} days · ${m.kind} · ${esc(a.lp)}</small><div class="chiprow"><span class="mk">${esc(a.mk)}</span>${a.nf >= 2 ? `<span class="mk">${a.nf} formats</span>` : ""}${a.vf.slice(0, 2).map(v => `<span class="mk">${esc(v)}</span>`).join("")}</div></div>
      <div class="rt"><span class="score num" style="font-size:30px">${a.ps}</span><small>Proven</small></div></div>`; }).join("")}</div>
    ${show < list.length ? `<div style="display:flex;justify-content:center;margin-top:16px"><button class="pill" data-gmore>Show more (${fmtN(list.length - show)} left)</button></div>` : ""}
    <div class="note"><div><b>JD Canada isn't in the Motion feed yet.</b> Once its Meta page is added, ads here can be matched to JD Canada's library to show what Canada hasn't run.</div></div>
  </div></div>`;
  wireMedia(el);
  el.onclick = e => {
    const m = e.target.closest("[data-mk]"); if (m) { S.gmk = m.dataset.mk; S.gshow = 60; renderGlobal(); return; }
    if (e.target.closest("[data-gmore]")) { const y = scrollY; S.gshow = show + 60; renderGlobal(); scrollTo(0, y); }
  };
}

/* ---------- TRENDING (existing Briefing Room view, embedded unchanged) ---------- */
function renderTrending() {
  const el = $("#v-trending");
  if (el.dataset.built) return;
  el.dataset.built = 1;
  el.innerHTML = `<div class="wrap trend-h"><div class="sec-h" style="margin:18px 0 10px"><div><h2 class="display">Trending Ads Weekly</h2><p>Runneth's weekly top ads, the same view as the Briefing Room's Discover Ads tab.</p></div><a class="more" href="../#trending">Open full page ${I.ext}</a></div></div>
  <iframe class="trend-frame" src="${TRENDING_SRC}" title="Trending Ads Weekly" loading="lazy"></iframe>`;
}

/* ---------- email gate (same rule as the Briefing Room) ---------- */
function gate() {
  if (document.getElementById("gate")) return;
  const g = document.createElement("div"); g.id = "gate"; g.className = "gate";
  g.innerHTML = `<form class="gc" novalidate role="dialog" aria-modal="true" aria-label="Sign in">
    <svg class="gr" viewBox="0 0 144 144" aria-hidden="true">${$(".top .roundel").innerHTML}</svg><h2 class="display">Creative Discovery</h2>
    <p>JD Sports Canada paid social. Enter your JD email to continue. Favourites and boards are shared with the team.</p>
    <input type="email" id="gm" placeholder="name@jdsports.ca" autocomplete="email" required aria-label="JD email">
    <div class="err" id="ge" role="alert"></div><button class="pill on" type="submit">Enter</button></form>`;
  document.body.appendChild(g);
  const i = g.querySelector("#gm"); setTimeout(() => i.focus(), 50);
  g.querySelector("form").onsubmit = e => {
    e.preventDefault(); const v = i.value.trim().toLowerCase();
    if (!DOMAINS.test(v)) { g.querySelector("#ge").textContent = "Use your JD email address."; return; }
    try { localStorage.setItem("jd-email", JSON.stringify(v)); } catch (err) { }
    g.remove(); loadSaves().then(() => { ADS.forEach(it => it.sv = it.members.reduce((s, m) => s + (S.allFavs[m.id] || 0), 0)); });
  };
}

/* ---------- boot ---------- */
async function boot() {
  renderNav();
  const status = $("#loadnote");
  if (!DOMAINS.test(me())) gate();
  try {
    const [rows] = await Promise.all([loadAds((n, t) => { if (status) status.textContent = `Loading ads… ${fmtN(n)} of ${fmtN(t)}`; }), loadSaves()]);
    buildData(rows); buildFilters();
    S.ready = true;
    status && status.closest(".loading")?.remove();
    route();
  } catch (e) {
    S.err = e.message;
    if (status) status.innerHTML = `<b>Can't load ads.</b> This page couldn't reach the team database (${esc(e.message)}). Check your connection and reload.`;
  }
}
boot();

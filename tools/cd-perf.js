/* Creative Discovery loading timings (Playwright, Google Chrome channel in CI).
   Usage: node tools/cd-perf.js <site-root> <out-dir> [page-path, default preview/]
   Scenarios: desktop 1440x900, phone 390x844 (touch, CPU 4x slower), desktop on throttled Fast 3G.
   Measures, from navigation start: first card in the DOM, first card with its poster painted, grid usable
   (cards + header count + Filters button), long tasks (count, longest, total), bytes transferred (all, Supabase),
   time for the next batch after scrolling to the bottom, JD Hooks open time, Brands open time.
   Also a hidden-tab run (document hidden, no requestAnimationFrame, timers clamped to 1s): first card time.
   Used by .github/workflows/cd-perf.yml (baseline) and by tools/cd-preview-check.js (timing assertions). */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const FAST3G = { offline: false, latency: 562.5, downloadThroughput: Math.round(1.6 * 1024 * 1024 * 0.9 / 8), uploadThroughput: Math.round(750 * 1024 * 0.9 / 8) };

/* runs in the page before any script: first-card / usable marks, long tasks */
function probe() {
  const P = window.__cdp = { lt: [], firstCard: null, firstPoster: null, usable: null };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => P.lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true }); } catch (e) { }
  const tick = () => {
    const now = performance.now();
    if (P.firstCard == null && document.querySelector('#v-cd .cd-card')) P.firstCard = now;
    if (P.firstPoster == null) { const i = document.querySelector('#v-cd .cd-card img.cd-po'); if (i && i.complete && i.naturalWidth) P.firstPoster = now; }
    if (P.usable == null) { const b = document.getElementById('cd-fbtn'), h = document.querySelector('#cd-head p'); if (document.querySelector('#v-cd .cd-card') && b && !b.hidden && h && /\d/.test(h.textContent)) P.usable = now; }
    if (P.usable == null || P.firstPoster == null) setTimeout(tick, 25);
  };
  setTimeout(tick, 0);
}
/* background tab emulation: hidden document, requestAnimationFrame never fires, timers clamped to 1s (Chrome's background throttling) */
function hiddenTab() {
  Object.defineProperty(document, 'hidden', { get: () => true }); Object.defineProperty(document, 'visibilityState', { get: () => 'hidden' });
  window.requestAnimationFrame = () => 0;
  const st = window.setTimeout; window.setTimeout = (f, d, ...a) => st(f, Math.max(1000, +d || 0), ...a);
}

async function scenario(browser, base, pagePath, name, { vp, mobile = false, cpu = 0, net = null, hidden = false, extras = true }) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: 'dark', isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('jd-email', JSON.stringify('preview-check@ryanclarke.co')); } catch (e) { } });
  if (hidden) await ctx.addInitScript(hiddenTab);
  await ctx.addInitScript(probe);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if (net) await cdp.send('Network.emulateNetworkConditions', net);
  if (cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const bytes = { all: 0, sb: 0, reqSb: 0 }; const urls = {};
  cdp.on('Network.requestWillBeSent', e => { urls[e.requestId] = e.request.url; });
  cdp.on('Network.loadingFinished', e => { const u = urls[e.requestId] || ''; bytes.all += e.encodedDataLength; if (/supabase\.co\/rest/.test(u)) { bytes.sb += e.encodedDataLength; bytes.reqSb++; } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const out = { name, vp: `${vp.width}x${vp.height}`, cpu, net: net ? 'Fast 3G' : 'none', hidden };
  const LIMIT = net ? 240000 : 90000;
  try {
    await page.goto(base + pagePath + '#discover', { waitUntil: 'domcontentloaded', timeout: LIMIT });
    await page.waitForFunction(() => window.__cdp && window.__cdp.firstCard != null, null, { timeout: LIMIT, polling: 100 });
    out.firstCard = Math.round(await page.evaluate(() => window.__cdp.firstCard));
    if (!hidden) {
      await page.waitForFunction(() => window.__cdp.usable != null && window.__cdp.firstPoster != null, null, { timeout: LIMIT, polling: 100 }).catch(() => { });
      const p = await page.evaluate(() => window.__cdp);
      out.firstPoster = p.firstPoster == null ? null : Math.round(p.firstPoster); out.usable = p.usable == null ? null : Math.round(p.usable);
      await page.waitForTimeout(2500);
      const lt = await page.evaluate(() => window.__cdp.lt);
      out.longTasks = { n: lt.length, max: lt.reduce((m, x) => Math.max(m, x[1]), 0), total: lt.reduce((s, x) => s + x[1], 0) };
      out.bytes = { all: bytes.all, supabase: bytes.sb, supabaseRequests: bytes.reqSb };
      out.cards = await page.evaluate(() => document.querySelectorAll('#v-cd .cd-card').length);
      out.timeline = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0] || {};
        const r = performance.getEntriesByType('resource').filter(e => /supabase\.co|data\.json|\.js(\?|$)|fonts\.g/.test(e.name) && e.startTime < (window.__cdp.usable || 1e9) + 50)
          .map(e => [e.name.replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '').slice(0, 40), Math.round(e.startTime), Math.round(e.responseEnd)]);
        return { html: Math.round(n.responseEnd || 0), dcl: Math.round(n.domContentLoadedEventEnd || 0), res: r }; });
      if (extras) {
        /* next batch: jump to the bottom of the grid, time until more cards are in the DOM */
        const nb = [];
        for (let k = 0; k < 3; k++) {
          const t = await page.evaluate(async () => { const ids = () => [...document.querySelectorAll('#cd-body .cd-card')].map(c => c.dataset.id); const n0 = new Set(ids()).size; const t0 = performance.now();
            const sent = document.querySelector('#cd-body .cd-sent'); const y = sent ? sent.getBoundingClientRect().top + scrollY - innerHeight + 40 : document.body.scrollHeight; window.scrollTo(0, y);
            return await new Promise(res => { const iv = setInterval(() => { const n = new Set(ids()).size; if (n > n0) { clearInterval(iv); res(Math.round(performance.now() - t0)); } else if (performance.now() - t0 > 20000) { clearInterval(iv); res(null); } }, 20); }); });
          nb.push(t); await page.waitForTimeout(600);
        }
        out.nextBatch = nb;
        const lt2 = await page.evaluate(() => window.__cdp.lt); out.longTasksAfterScroll = { n: lt2.length, max: lt2.reduce((m, x) => Math.max(m, x[1]), 0) };
        out.domCards = await page.evaluate(() => ({ cards: document.querySelectorAll('#v-cd .cd-card').length, withContent: document.querySelectorAll('#v-cd .cd-card .cd-fr').length, videos: document.querySelectorAll('#v-cd video[src]').length }));
        /* JD Hooks and Brands open times */
        out.hooks = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); const t0 = performance.now(); location.hash = 'discover/jd/hooks';
          return await new Promise(res => { const iv = setInterval(() => { if (document.querySelector('.cd-hooks .cd-hr') && document.querySelector('.cd-hbc [data-hkf]')) { clearInterval(iv); res(Math.round(performance.now() - t0)); } else if (performance.now() - t0 > 30000) { clearInterval(iv); res(null); } }, 20); }); });
        out.brands = await page.evaluate(async () => { const t0 = performance.now(); location.hash = 'discover/brands';
          return await new Promise(res => { const iv = setInterval(() => { if (document.querySelector('.cd-bcard')) { clearInterval(iv); res(Math.round(performance.now() - t0)); } else if (performance.now() - t0 > 30000) { clearInterval(iv); res(null); } }, 20); }); });
        out.brandPage = await page.evaluate(async () => { const c = [...document.querySelectorAll('.cd-bcard')].find(x => x.dataset.brand === 'Gymshark') || document.querySelector('.cd-bcard'); const t0 = performance.now(); location.hash = c.getAttribute('href').slice(1);
          return await new Promise(res => { const iv = setInterval(() => { if (document.querySelector('#cd-bads .cd-card')) { clearInterval(iv); res(Math.round(performance.now() - t0)); } else if (performance.now() - t0 > 30000) { clearInterval(iv); res(null); } }, 20); }); });
      }
    }
  } catch (e) { out.error = (e.message || String(e)).slice(0, 300); }
  out.errors = errors.slice(0, 3);
  await ctx.close();
  return out;
}

const SCEN = [
  ['desktop', { vp: { width: 1440, height: 900 } }],
  ['phone', { vp: { width: 390, height: 844 }, mobile: true, cpu: 4 }],
  ['fast3g', { vp: { width: 1440, height: 900 }, net: FAST3G, extras: false }],
  ['hidden', { vp: { width: 1440, height: 900 }, hidden: true }],
];
async function measure(base, pagePath = 'preview/', { runs = 1, only = null } = {}) {
  const browser = await chromium.launch({ ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}), args: ['--autoplay-policy=no-user-gesture-required'] });
  const res = [];
  for (const [n, o] of SCEN) { if (only && !only.includes(n)) continue; for (let r = 0; r < runs; r++) res.push(await scenario(browser, base, pagePath, n, o)); }
  await browser.close();
  return res;
}
module.exports = { measure, scenario, FAST3G, probe, hiddenTab };

if (require.main === module) (async () => {
  const [, , BASE = 'https://jd-ecomm.github.io/jd-ad-briefing-room/', OUT = 'cd-perf', PG = 'preview/'] = process.argv;
  fs.mkdirSync(OUT, { recursive: true });
  const r = await measure(BASE, PG, { runs: +(process.env.RUNS || 1) });
  const doc = { base: BASE, page: PG, when: new Date().toISOString(), results: r };
  fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify(doc, null, 2));
  console.log(JSON.stringify(doc, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const L = [`## Creative Discovery loading timings (${PG})`, '', '| Scenario | First card | First poster | Usable | Long tasks (n / max / total ms) | Bytes (all / Supabase) | Next batch ms | Hooks | Brands | Brand page |', '|---|---|---|---|---|---|---|---|---|---|'];
    for (const x of r) L.push(`| ${x.name} | ${x.firstCard ?? '-'} | ${x.firstPoster ?? '-'} | ${x.usable ?? '-'} | ${x.longTasks ? `${x.longTasks.n} / ${x.longTasks.max} / ${x.longTasks.total}` : '-'} | ${x.bytes ? `${(x.bytes.all / 1e6).toFixed(2)} MB / ${(x.bytes.supabase / 1e6).toFixed(2)} MB (${x.bytes.supabaseRequests} req)` : '-'} | ${(x.nextBatch || []).join(', ') || '-'} | ${x.hooks ?? '-'} | ${x.brands ?? '-'} | ${x.brandPage ?? '-'} |${x.error ? ' ' + x.error.replace(/\|/g, '/') : ''}`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, L.join('\n') + '\n');
  }
})();

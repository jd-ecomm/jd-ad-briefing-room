/* Creative Discovery preview check (Playwright, chromium).
   Usage: node tools/cd-preview-check.js <base-url> <out-dir> [--fixture <media-dir>]
   <base-url> is the site root, e.g. https://jd-ecomm.github.io/jd-ad-briefing-room/ ; the page tested is <base-url>preview/.
   Without --fixture it runs against live Supabase and R2 data. With --fixture it serves synthetic rows and local media (offline dev).
   Writes screenshots and results.json to <out-dir>; exits 1 if any check fails. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [, , BASE = 'http://localhost:8000/', OUT = 'cd-shots'] = process.argv;
const FX = process.argv.includes('--fixture') ? process.argv[process.argv.indexOf('--fixture') + 1] : null;
fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail: String(detail).slice(0, 400) }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); };

function fixtureRows() {
  const brands = [['66cf75a0e42d53dcea7879b5', 'JD Sports UK', 'JD Global', 'UK'], ['686f2d9374342e14cdc10979', 'JD Sports Australia', 'JD Global', 'AU'], ['67aa28cb0a70ccc0c54281c6', 'JD Sports US', 'JD Global', 'US'],
    ['b1', 'Nike', 'Brand', 'Global'], ['b2', 'adidas', 'Brand', 'Global'], ['b3', 'Foot Locker Canada', 'Competitor', 'CA'], ['b4', 'Gymshark', 'DTC Fashion', 'UK'], ['b5', 'New Balance', 'Brand', 'Global'], ['b6', 'Aritzia', 'Competitor', 'CA']];
  const asp = ['9:16', '4:5', '1:1', '16:9', '4:5', '9:16', '1:1'], fmts = ['video', 'image', 'video', 'carousel', 'image', 'video'];
  const rows = [];
  for (let i = 0; i < 140; i++) {
    const [bid, b, g, mk] = brands[i % brands.length]; const a = asp[i % asp.length], f = fmts[i % fmts.length]; const k = a.replace(':', 'x'); const id = 'fx' + String(i).padStart(4, '0');
    const sd = new Date(Date.now() - (5 + (i * 7) % 140) * 864e5).toISOString().slice(0, 10);
    rows.push({ id, brand: b, brand_id: bid, brand_group: g, logo: null, logo_s: null, logo_r2: null, status: i % 5 ? 'active' : 'inactive', start_date: sd, end_date: sd, days_live: 0, format: f,
      visual_formats: [['UGC Selfie', 'Text Overlay'], ['Model Shot'], ['Product Image', 'Headline'], ['Try-On']][i % 4], aspect: a, platforms: ['instagram'], cards: f === 'carousel' ? 3 : 1,
      headline: 'Fixture headline ' + i, copy: 'Fixture ad copy for ad ' + i + '. Shop the drop.', cta: 'Shop now', landing: 'https://example.com/collections/x', video: null, video_s: null,
      video_r2: f === 'video' ? `https://pub-fx.r2.dev/cd/${id}/v_${k}.mp4` : null, poster: null, poster_frame: true, images: [], images_s: [],
      images_r2: f === 'video' ? { poster: `https://pub-fx.r2.dev/cd/${id}/p_${k}.jpg` } : f === 'carousel' ? [1, 2, 3].map(n => `https://pub-fx.r2.dev/cd/${id}/p_${k}.jpg?${n}`) : [`https://pub-fx.r2.dev/cd/${id}/p_${k}.jpg`],
      thumb_s: null, thumb_r2: `https://pub-fx.r2.dev/cd/${id}/p_${k}.jpg`, saves: i % 13, market: mk, hook_text: i % 3 === 0 ? null : 'FIXTURE HOOK ' + i, onscreen_text: i % 3 === 0 ? null : 'FIXTURE HOOK ' + i + ' | SHOP NOW', hook_kind: i % 3 === 0 ? 'visual' : 'text', concept_key: bid + (i % 11), variant_group: i % 9 === 0 && i < 130 ? 'vg' + i : 'vgs' + i, formats: [], first_seen: sd });
    if (i % 9 === 0 && i < 130) { const b2 = Object.assign({}, rows[rows.length - 1], { id: id + 'b', aspect: '9:16', format: 'video', video_r2: `https://pub-fx.r2.dev/cd/${id}b/v_9x16.mp4`, images_r2: { poster: `https://pub-fx.r2.dev/cd/${id}b/p_9x16.jpg` }, thumb_r2: `https://pub-fx.r2.dev/cd/${id}b/p_9x16.jpg` }); rows.push(b2); }
  }
  return rows;
}
function fixtureTr() {
  const cats = ['apparel', 'sports-fitness', 'retail', 'accessories', 'health-wellness'], out = [];
  for (let i = 0; i < 40; i++) { const k = ['9x16', '4x5', '1x1'][i % 3]; const v = i % 2 === 0;
    out.push({ week: '2026-11-02', category: cats[i % 5], rank: 1 + Math.floor(i / 5), brand: 'Trend brand ' + i, age: (i + 3) + 'd', kind: v ? 'video' : 'image', video: null, poster: null, images: [], logo: null,
      video_s: v ? `https://x.supabase.co/storage/v1/object/public/trending/v_${k}.mp4` : null, poster_s: `https://x.supabase.co/storage/v1/object/public/trending/p_${k}.jpg`, images_s: v ? [] : [`https://x.supabase.co/storage/v1/object/public/trending/p_${k}.jpg`], logo_s: null }); }
  return out;
}
async function routeFixture(ctx, fx = FX) {
  const rows = fixtureRows(), tr = fixtureTr();
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
  await ctx.route(/supabase\.co\/rest\/v1\//, r => {
    const u = r.request().url();
    if (/\/in_ads\?/.test(u)) { const h = r.request().headers(); const m = /(\d+)-(\d+)/.exec(h.range || '0-999'); const a = +m[1], b = +m[2]; const sl = rows.slice(a, b + 1);
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `${a}-${a + sl.length - 1}/${rows.length}`, 'access-control-expose-headers': 'content-range' }, body: JSON.stringify(sl) }); }
    if (/\/tr_ads\?/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tr) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: r.request().method() === 'GET' ? '[]' : '' });
  });
  await ctx.route(/(r2\.dev|supabase\.co\/storage)\//, async r => {
    const u = new URL(r.request().url()); const f = path.join(fx, path.basename(u.pathname)); if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    const buf = fs.readFileSync(f); const type = f.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'; const range = r.request().headers().range;
    if (range && type === 'video/mp4') { const m = /bytes=(\d+)-(\d*)/.exec(range); const s = +m[1], e = m[2] ? Math.min(+m[2], buf.length - 1) : buf.length - 1;
      return r.fulfill({ status: 206, headers: { 'content-type': type, 'content-range': `bytes ${s}-${e}/${buf.length}`, 'accept-ranges': 'bytes', 'content-length': String(e - s + 1) }, body: buf.subarray(s, e + 1) }); }
    return r.fulfill({ status: 200, headers: { 'content-type': type, 'accept-ranges': 'bytes' }, body: buf });
  });
}

async function run(vp) {
  const tag = vp.width < 600 ? 'm' : 'd';
  const browser = await chromium.launch({ ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}), args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: vp, colorScheme: 'dark', deviceScaleFactor: tag === 'm' ? 2 : 1, hasTouch: tag === 'm', isMobile: tag === 'm' });
  await ctx.addInitScript(() => { try { localStorage.setItem('jd-email', JSON.stringify('preview-check@ryanclarke.co')); localStorage.removeItem('cd_autoplay'); } catch (e) { } });
  if (FX) await routeFixture(ctx);
  const page = await ctx.newPage();
  const errors = [], loadFails = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|ERR_|net::/.test(t)) loadFails.push(t); else errors.push('console: ' + t); } });
  const shot = async n => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) }); };
  const R = fn => page.evaluate(`(() => { const R = document.getElementById('v-cd').shadowRoot; return (${fn})(R); })()`);
  const settle = async () => { await page.waitForFunction(() => { const R = document.getElementById('v-cd').shadowRoot; const imgs = [...R.querySelectorAll('.view:not([hidden]) .media img')].slice(0, 30); return imgs.length && imgs.every(i => i.complete); }, null, { timeout: 30000 }).catch(() => { }); await page.waitForTimeout(600); };
  const noHScroll = async where => { const r = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok(`${tag} ${where}: no horizontal scroll`, r[0] <= r[1] + 1, `scrollWidth ${r[0]} vs ${r[1]}`); };
  const cropCheck = async where => {
    const r = await R(`R => { const out = { n: 0, bad: [] }; R.querySelectorAll('.view:not([hidden]) .media').forEach(fr => {
      if (fr.closest('.d-reels')) return; const img = fr.querySelector(':scope > img, :scope > .car > img'); if (!img || !img.complete || !img.naturalWidth) return; const b = fr.getBoundingClientRect(); if (!b.width || !b.height || b.bottom < 0 || b.top > innerHeight * 3) return;
      const nat = img.naturalWidth / img.naturalHeight, ren = b.width / b.height; const fit = getComputedStyle(img).objectFit; out.n++;
      if (fit !== 'contain' || (!fr.closest('.jcard') && Math.abs(ren - nat) / nat > 0.03)) out.bad.push(fr.dataset.open + ' rendered ' + ren.toFixed(3) + ' natural ' + nat.toFixed(3) + ' fit ' + fit); }); return out; }`);
    ok(`${tag} ${where}: no creative cropped (${r.n} measured)`, r.n > 0 && !r.bad.length, r.bad.slice(0, 4).join('; '));
  };
  const noAutoplay = async where => { const r = await R(`R => [...R.querySelectorAll('main video')].filter(v => !v.paused).length`); ok(`${tag} ${where}: no video playing without hover`, r === 0, r + ' playing'); };
  const go = async h => { await page.evaluate(h => { location.hash = h; }, h); await page.waitForTimeout(700); };

  await page.goto(BASE + (process.env.PREVIEW_PATH || 'preview2/') + '#discover', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#v-cd .card', { timeout: 90000 }).catch(() => { });
  const nCards = await page.locator('#v-cd .card').count();
  if (!nCards) await page.screenshot({ path: path.join(OUT, `${tag}-fail-discover.png`) });
  ok(`${tag} discover: cards render`, nCards > 0, nCards + ' cards');
  ok(`${tag} inside the Briefing Room (hero + Projects row + section)`, await page.evaluate(() => !!document.querySelector('header.hero') && !!document.querySelector('.proj #t-cd.on') && !document.getElementById('v-cd').hidden));
  ok(`${tag} old Discover Ads section gone`, await page.evaluate(() => !document.getElementById('v-trending') && !document.getElementById('v-inspo') && !document.getElementById('t-trending')));
  const nav = await R(`R => [...R.querySelectorAll('#topnav a')].map(a => a.textContent.trim())`);
  ok(`${tag} sub tabs: Directory (not Home), Discover, JD, Trending, Brands, Boards`, ['Directory', 'Discover', 'JD', 'Trending', 'Brands', 'Boards'].every(x => nav.includes(x)) && !nav.includes('Home'), nav.join(' | '));
  ok(`${tag} no bottom tab bar`, await page.evaluate(() => ![...document.querySelectorAll('*')].concat([...document.getElementById('v-cd').shadowRoot.querySelectorAll('*')]).some(e => { const s = getComputedStyle(e); return s.position === 'fixed' && s.display !== 'none' && parseFloat(s.bottom) <= 1 && e.offsetHeight > 30 && e.offsetHeight < 120 && e.offsetWidth > innerWidth * .8; })));
  const ldr = await R(`R => ({ n: R.querySelectorAll('.media .ldr').length, txt: (R.querySelector('.media .ldr') || {}).textContent || '' })`);
  ok(`${tag} "Loading creative" loader on cards`, ldr.n > 0 && /Loading creative/.test(ldr.txt), JSON.stringify(ldr));
  ok(`${tag} Autoplay button present and off by default`, await R(`R => { const b = R.querySelector('#apbtn'); return !!b && b.getAttribute('aria-pressed') === 'false' && /Autoplay/.test(b.textContent); }`));
  await settle();
  await page.evaluate(() => window.scrollTo(0, document.getElementById('v-cd').offsetTop + 200)); await page.waitForTimeout(900);
  await noAutoplay('discover'); await cropCheck('discover'); await noHScroll('discover');
  const cols = await R(`R => R.querySelectorAll('#libgrid .grid > .col').length`); ok(`${tag} discover: responsive columns`, tag === 'm' ? cols === 2 : cols >= 5, cols + ' columns');
  await shot('discover');

  // Filters panel
  await page.evaluate(() => window.scrollTo(0, document.getElementById('v-cd').offsetTop));
  await page.locator('#v-cd #fbtn').click(); await page.waitForTimeout(400);
  const fp = await R(`R => ({ open: !R.querySelector('#fpanel').hidden, groups: [...R.querySelectorAll('#fpanel .fgrp > .lbl')].map(x => x.textContent) })`);
  ok(`${tag} Filters panel opens with all groups`, fp.open && fp.groups.length >= 8, fp.groups.join(', '));
  await noHScroll('filters'); await shot('filters');
  await page.locator('#v-cd #fpanel [data-f="f:video"]').click(); await page.waitForTimeout(500);
  ok(`${tag} filter applies and shows as an active chip`, await R(`R => !!R.querySelector('#factive [data-f="f:video"]') && R.querySelector('#fcount').textContent === '1'`));
  await page.locator('#v-cd #fclear').click(); await page.locator('#v-cd #fdone').click(); await page.waitForTimeout(400);

  if (tag === 'd') {
    // hover = play, no scrubbing
    const target = page.locator('#v-cd #libgrid .media:has(> video[data-po])').first();
    await target.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(500);
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5);
    const played = await target.evaluate(el => new Promise(res => { const v = el.querySelector('video'); const t0 = Date.now(); const ck = () => { if (!v.paused && v.currentTime > .2) res(true); else if (Date.now() - t0 > 15000) res(false); else setTimeout(ck, 150); }; ck(); }));
    ok(`${tag} hover: video plays muted`, played && await target.evaluate(e => e.querySelector('video').muted));
    const t1 = await target.evaluate(e => e.querySelector('video').currentTime);
    for (let k = 0; k <= 12; k++) { await page.mouse.move(box.x + box.width * (0.1 + 0.07 * k), box.y + box.height * (0.3 + 0.03 * k)); await page.waitForTimeout(35); }
    await page.waitForTimeout(300);
    const t2 = await target.evaluate(e => { const v = e.querySelector('video'); return { t: v.currentTime, p: v.paused, d: v.duration }; });
    ok(`${tag} hover: moving the mouse does not pause or scrub`, !t2.p && t2.t >= t1 && t2.t - t1 < 2.5, JSON.stringify({ t1, ...t2 }));
    ok(`${tag} hover: video shows above the poster`, await target.evaluate(e => { const b = e.getBoundingClientRect(); const R = document.getElementById('v-cd').shadowRoot; const el = R.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!el && el.tagName === 'VIDEO'; }));
    await page.screenshot({ path: path.join(OUT, `${tag}-hover-play.png`), clip: { x: Math.max(0, box.x - 14), y: Math.max(0, box.y - 70), width: Math.min(box.width + 28, 1440), height: Math.min(box.height + 130, 900 - Math.max(0, box.y - 70)) } });
    await page.mouse.move(5, 5); await page.waitForTimeout(400);
    ok(`${tag} hover: mouse out pauses`, await target.evaluate(e => e.querySelector('video').paused));
    // Autoplay button
    await page.locator('#v-cd #apbtn').click(); await page.waitForTimeout(400);
    const apOn = await page.waitForFunction(() => { const R = document.getElementById('v-cd').shadowRoot; return [...R.querySelectorAll('#libgrid video')].some(v => !v.paused); }, null, { timeout: 20000 }).then(() => true).catch(() => false);
    ok(`${tag} Autoplay on: videos in view play by themselves`, apOn && await R(`R => R.querySelector('#apbtn').getAttribute('aria-pressed') === 'true'`));
    await page.locator('#v-cd #apbtn').click(); await page.waitForTimeout(600);
    await noAutoplay('Autoplay off again');
  } else await noAutoplay('touch grid');

  // Directory
  await go('directory'); await settle();
  ok(`${tag} Directory renders (Home renamed)`, await R(`R => !R.querySelector('#v-home').hidden && !!R.querySelector('#v-home .hero') && R.querySelector('#topnav .on').textContent.trim() === 'Directory'`));
  await noAutoplay('Directory'); await noHScroll('Directory'); await shot('directory');

  // JD tab
  await go('jd'); await settle();
  const jd = await R(`R => { const c = R.querySelector('.jcard'); const m = c && c.querySelector('.media').getBoundingClientRect(); const g = R.querySelector('.jgrid'); return { n: R.querySelectorAll('.jcard').length, score: (R.querySelector('.jcard .jscore') || {}).textContent || '', mk: R.querySelectorAll('#v-global [data-mk]').length, kpi: R.querySelectorAll('#v-global .panel').length, w: m ? Math.round(m.width) : 0, cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0, chips: c ? c.querySelectorAll('.mk').length : 0 }; }`);
  ok(`${tag} JD: previous JD Global info (KPIs, market chips, tags, Proven score) in a grid`, jd.n > 0 && /\d+\s*Proven/.test(jd.score) && jd.mk >= 3 && jd.kpi >= 3 && jd.chips >= 1, JSON.stringify(jd));
  ok(`${tag} JD: bigger creatives`, tag === 'm' ? jd.w >= 150 : (jd.cols === 2 && jd.w >= 220), JSON.stringify(jd));
  await page.evaluate(() => window.scrollTo(0, document.getElementById('v-cd').offsetTop + 380)); await page.waitForTimeout(600);
  await cropCheck('JD'); await noAutoplay('JD'); await noHScroll('JD'); await shot('jd');

  // Trending
  await go('trending'); await page.waitForFunction(() => document.getElementById('v-cd').shadowRoot.querySelectorAll('#trgrid .card').length > 0, null, { timeout: 30000 }).catch(() => { }); await settle();
  const tr = await R(`R => ({ n: R.querySelectorAll('#trgrid .card').length, badge: (R.querySelector('#trgrid .b-tl .pv') || {}).textContent || '', iframe: R.querySelectorAll('iframe').length })`);
  ok(`${tag} Trending: native cards with rank badge, no iframe`, tr.n > 0 && /^#\d+/.test(tr.badge) && !tr.iframe, JSON.stringify(tr));
  await page.evaluate(() => window.scrollTo(0, document.getElementById('v-cd').offsetTop + 200)); await page.waitForTimeout(500);
  await cropCheck('Trending'); await noAutoplay('Trending'); await noHScroll('Trending'); await shot('trending');

  // Brands, Boards
  await go('brands'); ok(`${tag} Brands renders`, await page.locator('#v-cd .bcard').count() > 0); await noHScroll('Brands');
  await go('boards'); ok(`${tag} Boards renders`, await R(`R => !R.querySelector('#v-boards').hidden && R.querySelector('#v-boards').textContent.length > 10`)); await noHScroll('Boards');

  // Viewer: a JD video (hooks are read for JD ads)
  await go('jd'); await settle();
  const vid = await R(`R => { const m = [...R.querySelectorAll('.jcard .media')].find(x => x.querySelector('video')); return m && m.dataset.open; }`);
  if (vid) {
    const el = page.locator(`#v-cd .jcard .media[data-open="${vid}"]`).first(); await el.scrollIntoViewIfNeeded();
    if (tag === 'm') await el.tap(); else await el.click();
    await page.waitForSelector('#v-cd #viewer:not([hidden]) .phone', { timeout: 10000 });
    if (await page.locator('#v-cd #viewer button[data-pl="reels"]').count()) await page.locator('#v-cd #viewer button[data-pl="reels"]').click();
    await page.waitForTimeout(1500);
    const rv = await R(`R => { const ph = R.querySelector('#viewer .phone[data-pl="reels"]'); const v = R.querySelector('#pv-video'); const txt = ph ? [...ph.querySelectorAll('.sb,.r-rail,.r-top')].map(e => e.innerText).join(' ') : ''; const info = R.querySelector('#viewer .vw-info').innerText;
      return { reels: !!ph, digits: txt.match(/\d[\d,.]*/g) || [], controls: v ? v.controls : null, hook: /Hook line/i.test(info), onscreen: /On-screen text/i.test(info), meta: /Meta headline/i.test(info), frames: R.querySelectorAll('#viewer .frames .fr').length, concept: /Concept variants/i.test(info) }; }`);
    ok(`${tag} viewer: Reels frame has no numbers`, rv.reels && !rv.digits.length, JSON.stringify(rv));
    ok(`${tag} viewer: video has native controls (one scrubber)`, rv.controls === true, JSON.stringify(rv));
    ok(`${tag} viewer: hooks, key frames and concept panels kept, hook labels fixed`, rv.hook && rv.onscreen && rv.meta && rv.frames > 0 && rv.concept, JSON.stringify(rv));
    await noHScroll('viewer'); await shot('viewer');
    await page.evaluate(() => document.getElementById('v-cd').shadowRoot.querySelector('#viewer .vw-body').scrollTo(0, 99999)); await page.waitForTimeout(500); await shot('viewer-info');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    ok(`${tag} viewer: Esc closes`, await R(`R => R.querySelector('#viewer').hidden`));
  } else ok(`${tag} viewer: found a JD video to open`, false);

  await page.locator('.proj .pj:not(#t-cd)').first().click().catch(() => { }); await page.waitForTimeout(600);
  ok(`${tag} Projects section still opens`, await page.evaluate(() => document.getElementById('v-cd').hidden && !document.querySelector('nav.bar').hidden));
  ok(`${tag} no console errors`, !errors.length, errors.slice(0, 5).join(' | '));
  results.push({ name: `${tag} media load failures (info)`, pass: true, detail: loadFails.length + ' failed resource loads' });
  await browser.close();
}

module.exports = { routeFixture };
if (require.main === module) (async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }].filter(v => !process.env.ONLY || String(v.width) === process.env.ONLY)) { try { await run(vp); } catch (e) { ok(`run ${vp.width}`, false, e.stack || e.message); } }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ base: BASE, when: new Date().toISOString(), passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, results }, null, 2));
  const f = results.filter(r => !r.pass).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();

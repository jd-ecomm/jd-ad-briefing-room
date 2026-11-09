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
      thumb_s: null, thumb_r2: `https://pub-fx.r2.dev/cd/${id}/p_${k}.jpg`, saves: i % 13, market: mk, concept_key: bid + (i % 11), variant_group: i % 9 === 0 && i < 130 ? 'vg' + i : 'vgs' + i, formats: [], first_seen: sd });
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
  await ctx.addInitScript(() => { try { localStorage.setItem('jd-email', JSON.stringify('preview-check@ryanclarke.co')); } catch (e) { } });
  if (FX) await routeFixture(ctx);
  const page = await ctx.newPage();
  const errors = [], loadFails = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|ERR_|net::/.test(t)) loadFails.push(t); else errors.push('console: ' + t); } });
  const shot = async n => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) }); };
  const settle = async () => { await page.waitForFunction(() => { const imgs = [...document.querySelectorAll('.cd-fr img.cd-po')].slice(0, 30); return imgs.length && imgs.every(i => i.complete); }, null, { timeout: 30000 }).catch(() => { }); await page.waitForTimeout(500); };
  const noHScroll = async where => { const r = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok(`${tag} ${where}: no horizontal scroll`, r[0] <= r[1] + 1, `scrollWidth ${r[0]} vs ${r[1]}`); };
  const cropCheck = async where => {
    const r = await page.evaluate(() => { const out = { n: 0, bad: [] }; document.querySelectorAll('.cd-fr').forEach(fr => {
      const img = fr.querySelector('img.cd-po'); if (!img || !img.complete || !img.naturalWidth) return; const b = fr.getBoundingClientRect(); if (!b.width || !b.height) return;
      const nat = img.naturalWidth / img.naturalHeight, ren = b.width / b.height; const cs = getComputedStyle(img).objectFit; out.n++;
      if (Math.abs(ren - nat) / nat > 0.03 || cs !== 'contain') out.bad.push(`${fr.dataset.open} rendered ${ren.toFixed(3)} natural ${nat.toFixed(3)} fit ${cs}`); }); return out; });
    ok(`${tag} ${where}: no creative cropped (${r.n} measured)`, r.n > 0 && !r.bad.length, r.bad.slice(0, 5).join('; ') || '');
  };
  const noAutoplay = async where => { const r = await page.evaluate(() => [...document.querySelectorAll('#v-cd video')].filter(v => !v.paused).length); ok(`${tag} ${where}: no video playing without hover`, r === 0, r + ' playing'); };

  await page.goto(BASE + 'preview/#discover', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.cd-card', { timeout: 60000 }).catch(() => { });
  const nCards = await page.locator('.cd-card').count();
  if (!nCards) { await page.screenshot({ path: path.join(OUT, `${tag}-fail-discover.png`) }); }
  ok(`${tag} discover: cards render`, nCards > 0, nCards + ' cards' + (nCards ? '' : ' | body: ' + (await page.evaluate(() => (document.getElementById('v-cd') || document.body).innerText.slice(0, 200))) + ' | hash ' + (await page.evaluate(() => location.href)) + ' | errors: ' + errors.concat(loadFails).slice(0, 4).join(' / ')));
  ok(`${tag} discover: inside Briefing Room (hero + projects row + section)`, await page.evaluate(() => !!document.querySelector('header.hero') && !!document.querySelector('.proj #t-cd.on') && !document.getElementById('v-cd').hidden));
  ok(`${tag} discover: no old Discover Ads / Trending section`, await page.evaluate(() => !document.getElementById('v-trending') && !document.getElementById('v-inspo') && !document.getElementById('t-trending')));
  ok(`${tag} discover: no bottom tab bar`, await page.evaluate(() => ![...document.querySelectorAll('nav,div')].some(e => { const s = getComputedStyle(e); return s.position === 'fixed' && parseFloat(s.bottom) <= 1 && e.offsetHeight > 30 && e.offsetHeight < 120 && e.offsetWidth > innerWidth * .8; })));
  await settle();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.cd-main').offsetTop - 60));
  await page.waitForTimeout(800);
  await noAutoplay('discover');
  await cropCheck('discover');
  await noHScroll('discover');
  const cols = await page.evaluate(() => document.querySelectorAll('.cd-mas > .cd-col').length); ok(`${tag} discover: responsive columns`, tag === 'm' ? cols === 2 : cols >= 5, cols + ' columns');
  await shot('discover');

  // filters open
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#cd-fbtn'); await page.waitForTimeout(300);
  ok(`${tag} filters: panel opens`, await page.locator('#cd-fp:not([hidden]) .cd-chip').count() > 3);
  await noHScroll('filters');
  await shot('filters');
  await page.locator('#cd-fp [data-f="kind|video"]').click(); await page.waitForTimeout(400);
  const allVid = await page.evaluate(() => [...document.querySelectorAll('.cd-card .cd-fr')].slice(0, 20).every(f => f.dataset.k === 'video' || f.closest('.cd-card').querySelector('.cd-fseg')));
  ok(`${tag} filters: type = video applies`, allVid);
  await page.click('[data-fclear]'); await page.waitForTimeout(300);
  if (await page.locator('#cd-fdone').count()) await page.click('#cd-fdone');

  // hover + scrub (pointer devices only)
  if (tag === 'd') {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    const fr = page.locator('.cd-fr[data-v]').filter({ has: page.locator('img.cd-po') });
    let target = null; const n = await fr.count();
    for (let i = 0; i < n && !target; i++) { const r = await fr.nth(i).evaluate(e => { const b = e.getBoundingClientRect(); return { r: b.width / b.height, top: b.top, h: b.height }; }); if (r.r < 0.7 && r.top > 120 && r.top + r.h < 900) target = fr.nth(i); }
    if (!target) target = fr.first();
    await target.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(400);
    const box = await target.boundingBox();
    await page.mouse.move(box.x + 5, box.y + box.height / 2); await page.mouse.move(box.x + box.width * .1, box.y + box.height / 2);
    const played = await page.waitForFunction(el => { const v = el.querySelector('video'); return v && !v.paused && v.currentTime > 0.05; }, await target.elementHandle(), { timeout: 15000 }).then(() => true).catch(() => false);
    ok(`${tag} hover: video plays muted on hover`, played && await target.evaluate(e => e.querySelector('video').muted));
    for (let k = 1; k <= 10; k++) { await page.mouse.move(box.x + box.width * (0.1 + 0.04 * k), box.y + box.height / 2); await page.waitForTimeout(40); }
    await page.waitForTimeout(500);
    await page.waitForFunction(el => { const v = el.querySelector('video'); return v && !v.seeking && Math.abs(v.currentTime / v.duration - 0.5) < 0.08; }, await target.elementHandle(), { timeout: 8000 }).catch(() => { });
    const sc = await target.evaluate(e => { const v = e.querySelector('video'); return { t: v.currentTime, d: v.duration, p: v.paused, bar: e.querySelector('.cd-prog b').style.transform }; });
    sc.cls = await target.evaluate(e => e.className);
    sc.top = await target.evaluate(e => { const b = e.getBoundingClientRect(); const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return el && el.tagName; });
    ok(`${tag} hover: the video is visible above the poster while scrubbing`, sc.top === 'VIDEO', sc.top);
    ok(`${tag} hover: scrub to 50% sets the video to the middle`, sc.d && Math.abs(sc.t / sc.d - 0.5) < 0.08 && sc.p, JSON.stringify(sc));
    await page.screenshot({ path: path.join(OUT, `${tag}-hover-scrub-50.png`), clip: { x: Math.max(0, box.x - 12), y: Math.max(0, box.y - 70), width: Math.min(box.width + 24, 1440), height: Math.min(box.height + 130, 900 - Math.max(0, box.y - 70)) } });
    await shot('hover-scrub-page');
    // scrub back and forward again: no stutter means currentTime follows the pointer
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2); await page.waitForTimeout(450);
    await page.waitForFunction(el => { const v = el.querySelector('video'); return v && !v.seeking && Math.abs(v.currentTime / v.duration - 0.2) < 0.08; }, await target.elementHandle(), { timeout: 8000 }).catch(() => { });
    const back = await target.evaluate(e => { const v = e.querySelector('video'); return v.currentTime / v.duration; });
    ok(`${tag} hover: scrub back follows the pointer`, Math.abs(back - 0.2) < 0.08, back.toFixed(3));
    await page.mouse.move(5, 5); await page.waitForTimeout(400);
    const after = await target.evaluate(e => { const v = e.querySelector('video'); return { p: v.paused, vis: e.classList.contains('vis') }; });
    ok(`${tag} hover: mouse out pauses and returns to poster`, after.p && !after.vis, JSON.stringify(after));
  } else {
    await noAutoplay('touch grid');
  }

  // JD tab
  await page.evaluate(() => { location.hash = 'discover/jd'; }); await page.waitForTimeout(600); await settle();
  const jd = await page.evaluate(() => ({ n: document.querySelectorAll('.cd-card').length, badge: document.querySelector('.cd-card .cd-badge')?.textContent || '', mk: document.querySelector('.cd-card .cd-mk')?.textContent || '' }));
  ok(`${tag} JD: grid with Proven badge`, jd.n > 0 && /\d+ Proven/.test(jd.badge), JSON.stringify(jd));
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.cd-main').offsetTop - 60)); await page.waitForTimeout(500);
  await cropCheck('JD'); await noHScroll('JD'); await noAutoplay('JD');
  await shot('jd');

  // Trending tab
  await page.evaluate(() => { location.hash = 'discover/trending'; }); await page.waitForTimeout(800); await settle();
  const tr = await page.evaluate(() => ({ n: document.querySelectorAll('.cd-card').length, badge: document.querySelector('.cd-card .cd-badge')?.textContent || '', iframe: document.querySelectorAll('#v-cd iframe').length }));
  ok(`${tag} Trending: native cards with rank badge, no iframe`, tr.n > 0 && /^#\d+/.test(tr.badge) && !tr.iframe, JSON.stringify(tr));
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.cd-main').offsetTop - 60)); await page.waitForTimeout(500);
  await cropCheck('Trending'); await noHScroll('Trending'); await noAutoplay('Trending');
  await shot('trending');

  // Brands + Boards render
  await page.evaluate(() => { location.hash = 'discover/brands'; }); await page.waitForTimeout(500);
  ok(`${tag} Brands: tiles render`, await page.locator('.cd-btile').count() > 0); await noHScroll('Brands');
  await page.evaluate(() => { location.hash = 'discover/boards'; }); await page.waitForTimeout(500);
  ok(`${tag} Boards: renders`, await page.locator('#cd-head h2').count() > 0); await noHScroll('Boards');

  // Viewer on a 9:16 video in Reels
  await page.evaluate(() => { location.hash = 'discover'; }); await page.waitForTimeout(600); await settle();
  const vid = await page.evaluate(() => { const f = [...document.querySelectorAll('.cd-fr[data-k="video"]')].find(f => parseFloat(f.style.aspectRatio) < .7) || document.querySelector('.cd-fr[data-k="video"]'); return f && f.dataset.open; });
  if (vid) {
    const el = page.locator(`.cd-fr[data-open="${vid}"]`).first(); await el.scrollIntoViewIfNeeded();
    if (tag === 'm') await el.tap(); else await el.click();
    await page.waitForSelector('#cd-vw:not([hidden]) .cd-ph', { timeout: 10000 });
    if (await page.locator('[data-vpl="reels"]').count()) await page.click('[data-vpl="reels"]');
    await page.waitForTimeout(1500);
    const rv = await page.evaluate(() => { const ph = document.querySelector('.cd-ph[data-pl="reels"]'); if (!ph) return { reels: false };
      const txt = [...ph.querySelectorAll('.cd-sb,.cd-rail,.cd-ov.top,.cd-sh,.cd-aud,.cd-rcta')].map(e => e.innerText).join(' '); const v = ph.querySelector('video');
      return { reels: true, digits: (txt.match(/\d[\d,.]*/g) || []), controls: v ? v.controls : null, vids: document.querySelectorAll('#cd-vw video').length }; });
    ok(`${tag} viewer: Reels frame has no numbers`, rv.reels && !rv.digits.length, JSON.stringify(rv));
    ok(`${tag} viewer: one video with native controls (single scrubber)`, rv.controls === true && rv.vids === 1, JSON.stringify(rv));
    await noHScroll('viewer');
    await shot('viewer');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    ok(`${tag} viewer: Esc closes`, await page.evaluate(() => document.getElementById('cd-vw').hidden));
  } else ok(`${tag} viewer: found a video to open`, false);

  // Projects still works
  await page.click('.proj .pj:not(#t-cd)').catch(() => { });
  await page.waitForTimeout(500);
  ok(`${tag} Projects section still opens`, await page.evaluate(() => document.getElementById('v-cd').hidden && !document.querySelector('nav.bar').hidden));

  ok(`${tag} no console errors`, !errors.length, errors.slice(0, 5).join(' | '));
  results.push({ name: `${tag} media load failures (info)`, pass: true, detail: loadFails.length + ' failed resource loads' });
  await browser.close();
}

module.exports = { routeFixture };
if (require.main === module) (async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) { try { await run(vp); } catch (e) { ok(`run ${vp.width}`, false, e.stack || e.message); } }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ base: BASE, when: new Date().toISOString(), passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, results }, null, 2));
  const f = results.filter(r => !r.pass).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(f ? 1 : 0);
})();

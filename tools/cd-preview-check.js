/* Creative Discovery preview check (Playwright, chromium).
   Usage: node tools/cd-preview-check.js <base-url> <out-dir> [--fixture <media-dir>]
   <base-url> is the site root, e.g. https://jd-ecomm.github.io/jd-ad-briefing-room/ ; the page tested is <base-url>preview/.
   Without --fixture it runs against live Supabase and R2 data. With --fixture it serves synthetic rows and local media (offline dev).
   Writes screenshots and results.json to <out-dir>; exits 1 if any check fails. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [, , BASE = 'http://localhost:8000/', OUT = 'cd-shots'] = process.argv;
const FX = process.argv.includes('--fixture') ? process.argv[process.argv.indexOf('--fixture') + 1] : null;
const KNOCK_ID = FX ? 'fx0000' : '6a7f47c4bd1fb9616677cdd4';
fs.mkdirSync(OUT, { recursive: true });
const results = []; const ok = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail: String(detail).slice(0, 400) }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); };

function fixtureRows() {
  const brands = [['66cf75a0e42d53dcea7879b5', 'JD Sports UK', 'JD Global', 'UK'], ['686f2d9374342e14cdc10979', 'JD Sports Australia', 'JD Global', 'AU'], ['67aa28cb0a70ccc0c54281c6', 'JD Sports US', 'JD Global', 'US'],
    ['b1', 'Nike', 'Brand', 'Global'], ['b2', 'adidas', 'Brand', 'Global'], ['b3', 'Foot Locker Canada', 'Competitor', 'CA'], ['b4', 'Gymshark', 'DTC Fashion', 'UK'], ['b5', 'New Balance', 'Brand', 'Global'], ['b6', 'Aritzia', 'Competitor', 'CA'], ['b7', 'The North Face', 'Brand', 'US']];
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
      thumb_s: null, thumb_r2: `https://pub-fx.r2.dev/cd/${id}/p_${k}.jpg`, saves: i % 13, market: mk, concept_key: bid + (i % 11), variant_group: i % 9 === 0 && i < 130 ? 'vg' + i : 'vgs' + i, formats: [], first_seen: sd, hook_text: i === 0 ? 'KNOCK KNOCK...NEW BALANCE 204L AT JD' : (i % 3 ? null : 'Fixture hook ' + i), onscreen_text: i % 4 ? null : 'On-screen ' + i, hook_kind: i % 5 === 1 ? 'visual' : 'text', vf_source: i % 2 ? 'motion' : 'claude', focus: i % 7 === 0, hook_source: 'claude', ad_library: 'https://www.facebook.com/ads/library/?id=' + (1000 + i),
      hook_format: i === 0 ? 'Teaser / Knock knock' : i % 5 === 1 ? 'Visual only' : ['Question', 'Callout', 'Drop / New in alert', 'Offer / Price first', 'Statement / Claim'][i % 5], hook_template: i === 0 ? 'KNOCK KNOCK...[PRODUCT] AT JD' : (i % 3 ? null : 'FIXTURE HOOK [N]') });
    if (i % 9 === 0 && i < 130) { const b2 = Object.assign({}, rows[rows.length - 1], { id: id + 'b', aspect: '9:16', format: 'video', video_r2: `https://pub-fx.r2.dev/cd/${id}b/v_9x16.mp4`, images_r2: { poster: `https://pub-fx.r2.dev/cd/${id}b/p_9x16.jpg` }, thumb_r2: `https://pub-fx.r2.dev/cd/${id}b/p_9x16.jpg` }); rows.push(b2); }
  }
  return rows;
}
function fixtureProfiles(rows) {
  const by = {}; rows.forEach(r => (by[r.brand] = by[r.brand] || []).push(r));
  const cat = { 'Nike': 'Sportswear and Athletic', 'adidas': 'Sportswear and Athletic', 'Foot Locker Canada': 'Canadian Retailer', 'Gymshark': 'Sportswear and Athletic', 'New Balance': 'Footwear', 'Aritzia': 'Canadian Retailer', 'The North Face': 'Outdoor' };
  const lr = c => { const t = Object.values(c).reduce((a, b) => a + b, 0) || 1; const f = Object.entries(c).map(([k, n]) => [k, Math.floor(n * 1000 / t), n * 1000 / t % 1]); let need = 1000 - f.reduce((a, x) => a + x[1], 0); f.sort((a, b) => b[2] - a[2]).forEach(x => { if (need > 0) { x[1]++; need--; } }); return Object.fromEntries(f.map(x => [x[0], x[1] / 10])); };
  return Object.entries(by).map(([b, rs]) => { const mix = lr({ video: rs.filter(r => r.format === 'video').length, image: rs.filter(r => r.format === 'image').length, carousel: rs.filter(r => r.format === 'carousel').length });
    return { brand: b, brand_id: rs[0].brand_id, category: /^JD/.test(b) ? 'JD (our markets)' : (cat[b] || 'Other'), subcategory: null, country: rs[0].market === 'CA' ? 'CA' : 'US', is_focus: ['Gymshark', 'The North Face', 'Nike'].includes(b),
      stats: { totals: { ads: rs.length, active: rs.filter(r => r.status === 'active').length, concepts: 5, cards: rs.length }, mix, aspect: lr({ '9:16': 3, '4:5': 2, '1:1': 2 }), tag_coverage: 100, tagged: rs.length,
        top_tags: [{ tag: 'Try-On', n: 5, pct: 40 }, { tag: 'Model Shot', n: 3, pct: 25 }], ugc_share: 30.5, studio_share: 22.1, weeks: [0, 1, 2, 3, 4, 5, 6, 7].map(w => ({ w, start: '2026-09-' + String(14 + w).padStart(2, '0'), video: w, image: 2, carousel: w % 2 })),
        l30: { last: 12, prior: 8, pct: 50, by_format: { video: { last: 6, prior: 4, pct: 50 } }, tags: [] }, median_days: 21, live30_share: 40.2, hooks: { read: 6, top: [{ format: 'Callout', n: 4 }, { format: 'Question', n: 2 }], example: { id: rs[0].id, text: 'You need this', format: 'Callout', source: 'ocr' }, machine: true },
        top_ads: rs.slice(0, 6).map(r => r.id), as_of: '2026-11-09' }, summary: 'Leans on video ads (50% video, mostly Try-On and Model Shot). Ads run a median of 21 days.', summary_basis: 'fixture' }; });
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
    if (/\/cd_brand_profiles\?/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureProfiles(rows)) });
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
  const ctx = await browser.newContext({ viewport: vp, colorScheme: 'dark', deviceScaleFactor: tag === 'm' ? 2 : 1, hasTouch: tag === 'm', isMobile: tag === 'm', permissions: ['clipboard-read', 'clipboard-write'] });
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
  const gutterCheck = async where => {
    const r = await page.evaluate(() => { const cols = [...document.querySelectorAll('.cd-mas > .cd-col')].map(c => c.getBoundingClientRect()); const hg = [], vg = [], w = cols.map(c => c.width);
      for (let i = 1; i < cols.length; i++) hg.push(cols[i].left - cols[i - 1].right);
      document.querySelectorAll('.cd-mas > .cd-col').forEach(c => { const k = [...c.children].map(e => e.getBoundingClientRect()).filter(b => b.top < innerHeight * 2.5); for (let i = 1; i < k.length; i++) vg.push(k[i].top - k[i - 1].bottom); });
      const all = hg.concat(vg); const sp = a => a.length ? Math.max(...a) - Math.min(...a) : 0; return { hg: [...new Set(hg.map(x => x.toFixed(1)))], vg: [...new Set(vg.map(x => x.toFixed(1)))], spread: sp(all), wspread: sp(w), n: all.length }; });
    ok(`${tag} ${where}: gutters equal within 2px, equal column widths`, r.n > 2 && r.spread <= 2 && r.wspread <= 1, JSON.stringify(r));
  };
  const playing = () => page.evaluate(() => [...document.querySelectorAll('#v-cd video')].filter(v => !v.paused).length);
  const noAutoplay = async where => { if (tag === 'd') { await page.mouse.move(2, 2); await page.waitForTimeout(300); } const r = await page.evaluate(() => [...document.querySelectorAll('#v-cd video')].filter(v => !v.paused).length); ok(`${tag} ${where}: no video playing without hover`, r === 0, r + ' playing'); };

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
  await gutterCheck('discover');
  await noHScroll('discover');
  const cols = await page.evaluate(() => document.querySelectorAll('.cd-mas > .cd-col').length); ok(`${tag} discover: responsive columns`, tag === 'm' ? cols === 2 : cols >= 5, cols + ' columns');
  await shot('discover');

  // hover = play only (pointer devices): enter plays muted from the start, moving never pauses or seeks, leave pauses on the poster
  if (tag === 'd') {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    const fr = page.locator('.cd-fr[data-v]').filter({ has: page.locator('img.cd-po') });
    let target = null; const n = await fr.count();
    for (let i = 0; i < n && !target; i++) { const r = await fr.nth(i).evaluate(e => { const b = e.getBoundingClientRect(); return { r: b.width / b.height, top: b.top, h: b.height }; }); if (r.r < 0.7 && r.top > 120 && r.top + r.h < 900) target = fr.nth(i); }
    if (!target) target = fr.first();
    await target.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(400);
    const box = await target.boundingBox();
    await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2);
    const played = await page.waitForFunction(el => { const v = el.querySelector('video'); return v && !v.paused && v.currentTime > 0.05; }, await target.elementHandle(), { timeout: 15000 }).then(() => true).catch(() => false);
    ok(`${tag} hover: video plays muted on hover`, played && await target.evaluate(e => e.querySelector('video').muted));
    ok(`${tag} hover: the video is visible above the poster`, await target.evaluate(e => { const b = e.getBoundingClientRect(); const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return el && el.tagName === 'VIDEO'; }));
    const t0 = await target.evaluate(e => e.querySelector('video').currentTime);
    const samples = [];
    for (let k = 0; k <= 16; k++) { await page.mouse.move(box.x + box.width * (0.1 + 0.05 * k), box.y + box.height * (0.3 + 0.02 * k)); await page.waitForTimeout(60); samples.push(await target.evaluate(e => { const v = e.querySelector('video'); return [v.currentTime, v.paused, v.seeking]; })); }
    const mono = samples.every((x, k) => k === 0 || x[0] >= samples[k - 1][0] - 0.02 || x[0] < 0.3); // loops back to 0 only at the end of the clip
    const anyPause = samples.some(x => x[1]);
    ok(`${tag} hover: moving the pointer never pauses or seeks (plays straight through)`, !anyPause && mono && samples[samples.length - 1][0] > t0, JSON.stringify(samples.map(x => +x[0].toFixed(2))));
    await page.screenshot({ path: path.join(OUT, `${tag}-hover-play.png`), clip: { x: Math.max(0, box.x - 12), y: Math.max(0, box.y - 70), width: Math.min(box.width + 24, 1440), height: Math.min(box.height + 130, 900 - Math.max(0, box.y - 70)) } });
    await page.mouse.move(5, 5); await page.waitForTimeout(400);
    const after = await target.evaluate(e => { const v = e.querySelector('video'); return { p: v.paused, vis: e.classList.contains('vis') }; });
    ok(`${tag} hover: mouse out pauses and returns to poster`, after.p && !after.vis, JSON.stringify(after));
    ok(`${tag} hover: no scrub code path (no pointermove seeking)`, await page.evaluate(() => fetch('preview/cd.js', { cache: 'no-store' }).then(r => r.text()).then(t => !/hoverMove|H\.scrub|pointermove/.test(t))));
  } else {
    await noAutoplay('touch grid');
  }

  // JD tab = JD Global from /discovery/ (stats, market chips, Proven sort, Show more), entries as larger cards
  await page.evaluate(() => { location.hash = 'discover/jd'; }); await page.waitForTimeout(600); await settle();
  const jd = await page.evaluate(() => { const cards = [...document.querySelectorAll('.cd-jc')]; const cols = document.querySelectorAll('#cd-jdg .cd-mas > .cd-col').length; const c = cards[0];
    const ps = (window.CD.C.lists.jd || []).slice(0, 60).map(x => x.ps);
    return { n: cards.length, cols, h: document.querySelector('#cd-head h2')?.textContent || '', stats: document.querySelectorAll('.cd-jd .panel').length, chips: document.querySelectorAll('.cd-jd [data-gmk]').length,
      badge: c?.querySelector('.cd-badge')?.textContent || '', mk: c?.querySelector('.cd-mk')?.textContent || '', sub: c?.querySelector('.cd-jc-s')?.textContent || '', sorted: ps.every((v, i) => !i || v <= ps[i - 1]),
      cw: c ? Math.round(c.querySelector('.cd-fr').getBoundingClientRect().width) : 0, ch: c ? Math.round(c.querySelector('.cd-fr').getBoundingClientRect().height) : 0, rows: document.querySelectorAll('.lrow').length, more: !!document.querySelector('[data-gmore]'), filters: !document.getElementById('cd-fbtn').hidden }; });
  ok(`${tag} JD: JD Global section (stats, market chips, Show more)`, /JD Global/i.test(jd.h) && jd.stats === 3 && jd.chips >= 6 && (jd.more || jd.n < 60), JSON.stringify(jd));
  ok(`${tag} JD: larger cards, ${tag === 'm' ? 1 : 2} per row, sorted by Proven, no list rows`, jd.n > 0 && jd.cols === (tag === 'm' ? 1 : 2) && jd.sorted && !jd.rows && Math.max(jd.cw, jd.ch) >= (tag === 'm' ? 300 : 380), JSON.stringify(jd));
  ok(`${tag} JD: card keeps Proven score, market pill, days · format · landing`, /^\d+ Proven$/.test(jd.badge.trim()) && /^(JD|Finish)/.test(jd.mk) && /\d+ days · \w+ · /.test(jd.sub), JSON.stringify(jd));
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#cd-jdg').offsetTop - 60)); await page.waitForTimeout(500);
  await cropCheck('JD'); await noHScroll('JD'); await noAutoplay('JD');
  await shot('jd');
  await page.locator('.cd-jd [data-gmk="JD UK"]').click().catch(() => { }); await page.waitForTimeout(500);
  ok(`${tag} JD: market chip filters to that market`, await page.evaluate(() => { const m = [...document.querySelectorAll('.cd-jc .cd-mk:first-child')].map(x => x.textContent); return m.length > 0 && m.every(x => x === 'JD UK'); }));

  // Trending tab
  await page.evaluate(() => { location.hash = 'discover/trending'; }); await page.waitForTimeout(800); await settle();
  const tr = await page.evaluate(() => ({ n: document.querySelectorAll('.cd-card').length, badge: document.querySelector('.cd-card .cd-badge')?.textContent || '', iframe: document.querySelectorAll('#v-cd iframe').length }));
  ok(`${tag} Trending: native cards with rank badge, no iframe`, tr.n > 0 && /^#\d+/.test(tr.badge) && !tr.iframe, JSON.stringify(tr));
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.cd-main').offsetTop - 60)); await page.waitForTimeout(500);
  await cropCheck('Trending'); await noHScroll('Trending'); await noAutoplay('Trending');
  await shot('trending');

  // Autoplay toggle: off by default, on = videos in view play muted (max 8), remembered per browser, off again = nothing plays
  await page.evaluate(() => { location.hash = 'discover'; }); await page.waitForTimeout(600); await settle();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.cd-main').offsetTop - 60)); await page.waitForTimeout(400);
  ok(`${tag} autoplay: toggle visible and off by default`, await page.evaluate(() => { const b = document.getElementById('cd-ap'); return !!b && !b.hidden && b.offsetWidth > 0 && b.getAttribute('aria-pressed') === 'false'; }));
  await page.click('#cd-ap');
  const apOn = await page.waitForFunction(() => [...document.querySelectorAll('#v-cd video')].filter(v => !v.paused && v.currentTime > 0.05).length > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(1500);
  const ap = await page.evaluate(() => ({ n: [...document.querySelectorAll('#v-cd video')].filter(v => !v.paused).length, muted: [...document.querySelectorAll('#v-cd video')].filter(v => !v.paused).every(v => v.muted), stored: (() => { try { return localStorage.getItem('cd2_autoplay'); } catch (e) { return 'err'; } })(), offscreen: [...document.querySelectorAll('#v-cd video')].filter(v => { if (v.paused) return false; const b = v.getBoundingClientRect(); return b.bottom < 0 || b.top > innerHeight; }).length }));
  ok(`${tag} autoplay on: videos in view play muted, max 8, none off screen`, apOn && ap.n > 0 && ap.n <= 8 && ap.muted && !ap.offscreen, JSON.stringify(ap));
  ok(`${tag} autoplay: choice remembered in this browser`, ap.stored === 'true', ap.stored);
  await shot('autoplay-on');
  await page.click('#cd-ap'); await page.waitForTimeout(600);
  ok(`${tag} autoplay off again: nothing plays`, (await playing()) === 0, (await playing()) + ' playing');

  // Filters drawer: button with label on every grid tab, right drawer (desktop) / bottom sheet (phone), 3 filters with live counts, chips, URL state
  await page.evaluate(() => { location.hash = 'discover'; }); await page.waitForTimeout(600); await settle(); await page.evaluate(() => window.scrollTo(0, 0));
  const fb = await page.evaluate(() => { const b = document.getElementById('cd-fbtn'); const r = b.getBoundingClientRect(); return { vis: !b.hidden && r.width > 0 && r.right <= innerWidth, txt: b.innerText.trim() }; });
  ok(`${tag} filters: "Filters" button visible with its label`, fb.vis && /^Filters/i.test(fb.txt), JSON.stringify(fb));
  await page.click('#cd-fbtn'); await page.waitForSelector('#cd-fd:not([hidden]) .cd-fd', { timeout: 5000 }).catch(() => { }); await page.waitForTimeout(300);
  const dr = await page.evaluate(() => { const d = document.querySelector('#cd-fd .cd-fd'); if (!d) return { open: false }; const r = d.getBoundingClientRect();
    return { open: true, right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight,
      groups: [...d.querySelectorAll('.cd-fd-gh .lbl')].map(x => x.textContent), counts: d.querySelectorAll('.cd-chip small').length, brandSearch: !!d.querySelector('#cd-fdbq'), quick: d.querySelectorAll('[data-fdq]').length, slider: d.querySelectorAll('input[type=range]').length, dates: d.querySelectorAll('input[type=date]').length, ai: !!d.querySelector('[data-fdai]') }; });
  ok(`${tag} filters: opens as a ${tag === 'm' ? 'bottom sheet' : 'right drawer'}`, dr.open && (tag === 'm' ? (Math.abs(dr.bottom - dr.vh) <= 1 && dr.w === dr.vw) : (Math.abs(dr.right - dr.vw) <= 1 && dr.h === dr.vh && dr.w <= 460)), JSON.stringify({ ...dr, groups: undefined }));
  const wantG = ['Brand', 'Market', 'Media type', 'Aspect', 'Visual format', 'Status', 'Days live', 'Launch date', 'Proven, Rising, Most saved', 'Landing page type', 'CTA'];
  ok(`${tag} filters: all groups with live counts, brand search, quick groups, slider, dates, AI toggle`, wantG.every(g => dr.groups.includes(g)) && dr.counts > 20 && dr.brandSearch && dr.quick >= 2 && dr.slider === 2 && dr.dates === 2 && dr.ai, JSON.stringify(dr));
  await shot('filters');
  const before = await page.evaluate(() => document.querySelector('[data-fdapply]').textContent);
  await page.click('#cd-fd [data-fd="kind|video"]'); await page.waitForTimeout(250);
  await page.click('#cd-fd [data-fd="asp|9:16"]'); await page.waitForTimeout(250);
  await page.click('#cd-fd [data-fd="st|live"]'); await page.waitForTimeout(250);
  const after3 = await page.evaluate(() => document.querySelector('[data-fdapply]').textContent);
  ok(`${tag} filters: live result count updates in the drawer`, before !== after3 && /Show [\d,]+ result/.test(after3), before + ' -> ' + after3);
  await page.click('#cd-fd [data-fdapply]'); await page.waitForTimeout(800); await settle();
  const ap3 = await page.evaluate(() => ({ chips: document.querySelectorAll('#cd-act [data-rmf]').length, btn: document.getElementById('cd-fbtn').innerText.replace(/\s+/g, ' ').trim(), hash: location.hash,
    ok: window.CD.C.lists.discover.slice(0, 200).every(a => a.kinds.has('video') && a.fl.includes('9:16') && a.st === 'active'), n: window.CD.C.lists.discover.length }));
  ok(`${tag} filters: 3 filters applied, 3 removable chips, "Filters · 3", state in the URL`, ap3.chips === 3 && /Filters · 3/i.test(ap3.btn) && /kind=video/.test(ap3.hash) && /asp=9%3A16|asp=9:16/.test(ap3.hash) && ap3.ok && ap3.n > 0, JSON.stringify(ap3));
  await noHScroll('filters applied');
  await shot('filters-applied');
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.cd-card', { timeout: 60000 }).catch(() => { }); await page.waitForTimeout(800);
  ok(`${tag} filters: shared URL restores the same filters`, await page.evaluate(() => document.querySelectorAll('#cd-act [data-rmf]').length === 3));
  await page.click('#cd-act [data-rmf]'); await page.waitForTimeout(400);
  ok(`${tag} filters: removing a chip removes that filter`, await page.evaluate(() => document.querySelectorAll('#cd-act [data-rmf]').length === 2));
  await page.click('#cd-act [data-fclear]'); await page.waitForTimeout(400);
  ok(`${tag} filters: Clear all`, await page.evaluate(() => !document.querySelectorAll('#cd-act [data-rmf]').length && !/\?/.test(location.hash)));

  // Search: brand, hook_text, onscreen_text, headline, copy, tags, landing URL; case and accent insensitive; every word must match
  const search = async q => { await page.fill('#cd-q', q); await page.waitForTimeout(700); return page.evaluate(() => ({ n: window.CD.C.lists.discover.length, sub: document.querySelector('#cd-head p')?.textContent || '', empty: document.querySelector('#cd-body .cd-empty')?.innerText || '', sugg: document.querySelectorAll('#cd-body [data-sugg]').length, ids: window.CD.C.lists.discover.flatMap(a => a.members.map(m => m.id)), brands: [...new Set(window.CD.C.lists.discover.map(a => a.b))].slice(0, 6) })); };
  await page.evaluate(() => { location.hash = 'discover'; }); await page.waitForTimeout(500);
  const s1 = await search('knock knock');
  ok(`${tag} search: "knock knock" finds the New Balance 204L ad (hook text)`, s1.ids.includes(KNOCK_ID) && /results? for "knock knock"/.test(s1.sub), JSON.stringify({ ...s1, ids: s1.ids.length }));
  const s1b = await search('KNÔCK knoc');
  ok(`${tag} search: case and accent insensitive, partial words`, s1b.ids.includes(KNOCK_ID), JSON.stringify({ n: s1b.n }));
  const s2 = await search('north face');
  ok(`${tag} search: "north face" finds The North Face`, s2.n > 0 && s2.brands.some(b => /north face/i.test(b)), JSON.stringify({ ...s2, ids: s2.ids.length }));
  await shot('search');
  const s3 = await search('north zzqxq');
  ok(`${tag} search: 0 results shows "No results for" with suggestions`, s3.n === 0 && /No results for/.test(s3.empty) && s3.sugg > 0, JSON.stringify({ ...s3, ids: 0 }));
  await page.fill('#cd-q', ''); await page.waitForTimeout(600);

  // Hook line for the variant shown: ad 6a7f47c4bd1fb9616677cdd4 starts "KNOCK KNOCK"; the Meta headline is separate
  await page.evaluate(id => window.CD.open(id), KNOCK_ID); await page.waitForSelector('#cd-vw:not([hidden]) .phone', { timeout: 10000 }).catch(() => { }); await page.waitForTimeout(800);
  const kk = await page.evaluate(() => { const L = document.getElementById('cd-vw'); const p = [...L.querySelectorAll('p')].find(x => /Hook line:/.test(x.textContent)) || [...L.querySelectorAll('.lbl')].find(x => x.textContent === 'Hook line')?.nextElementSibling;
    const hd = [...L.querySelectorAll('.lbl')].find(x => /Ad headline \(Meta\)/.test(x.textContent)); return { hook: p ? p.textContent.replace('Hook line:', '').trim() : null, headline: hd ? hd.nextElementSibling.textContent : null }; });
  ok(`${tag} viewer: ad ${KNOCK_ID} Hook line starts "KNOCK KNOCK", Meta headline shown separately`, /^KNOCK KNOCK/.test(kk.hook || '') && kk.headline !== null && kk.headline !== kk.hook, JSON.stringify(kk));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);

  await shareChecks(page, ctx, tag, shot);
  await brandChecks(page, tag, shot);
  await hookChecks(page, tag, shot);

  // No diagonal placeholders or "Loading ads" text anywhere
  ok(`${tag} loading: no "Loading ads" bar or diagonal placeholders`, await page.evaluate(() => !/Loading ads/i.test(document.body.innerText) && !document.querySelector('#v-cd .ph, #cd-vw .ph')));

  // Brands + Boards render
  await page.evaluate(() => { location.hash = 'discover/brands'; }); await page.waitForTimeout(500);
  ok(`${tag} Brands: tiles render`, await page.locator('.cd-btile').count() > 0); await noHScroll('Brands');
  await page.evaluate(() => { location.hash = 'discover/boards'; }); await page.waitForTimeout(500);
  ok(`${tag} Boards: renders`, await page.locator('#cd-head h2').count() > 0); await noHScroll('Boards');

  // Viewer = the batch 1 viewer from /discovery/ (Reels frame without numbers, hook_text / onscreen_text, Meta headline separate)
  await page.evaluate(() => { location.hash = 'discover'; }); await page.waitForTimeout(600); await settle();
  const vid = await page.evaluate(() => { const f = [...document.querySelectorAll('.cd-fr[data-k="video"]')].find(f => parseFloat(f.style.aspectRatio) < .7) || document.querySelector('.cd-fr[data-k="video"]'); return f && f.dataset.open; });
  if (vid) {
    const el = page.locator(`.cd-fr[data-open="${vid}"]`).first(); await el.scrollIntoViewIfNeeded();
    if (tag === 'm') await el.tap(); else await el.click();
    await page.waitForSelector('#cd-vw:not([hidden]) .phone', { timeout: 10000 });
    if (await page.locator('#cd-vw button[data-pl="reels"]').count()) await page.click('#cd-vw button[data-pl="reels"]');
    await page.waitForTimeout(1500);
    const rv = await page.evaluate(() => { const ph = document.querySelector('#cd-vw .phone[data-pl="reels"]'); if (!ph) return { reels: false };
      const txt = [...ph.querySelectorAll('.r-rail,.r-top,.r-who,.audio,.ctabar,.sb')].map(e => e.innerText).join(' ').replace(/9:41/, ''); const b = ph.getBoundingClientRect();
      return { reels: true, digits: (txt.match(/\d[\d,.]*/g) || []), w: Math.round(b.width), vw: innerWidth, rail: ph.querySelectorAll('.r-rail .it').length }; });
    ok(`${tag} viewer: Reels frame matches Instagram (rail icons, no numbers)`, rv.reels && !rv.digits.length && rv.rail >= 5, JSON.stringify(rv));
    if (tag === 'm') ok(`${tag} viewer: Reels frame fits a 390px screen`, rv.w >= 340 && rv.w <= rv.vw, JSON.stringify(rv));
    const pan = await page.evaluate(() => { const L = document.getElementById('cd-vw'); const t = L.innerText;
      const it = window.CD.C.viewer.it; const m = it.fm[window.CD.C.viewer.fmt] || it;
      const hookP = [...L.querySelectorAll('p')].find(p => /Hook line:/.test(p.textContent)); const hookTxt = hookP ? hookP.textContent.replace('Hook line:', '').trim() : null;
      return { labels: ['Proven score', 'Days live', 'Format', 'CTA', 'Offer', 'Landing', 'Tags', 'Hook · first 3 seconds', 'Key frames', 'On-screen text', 'Ad headline (Meta)'].filter(x => !t.toUpperCase().includes(x.toUpperCase())),
        acts: ['Save', 'Add to board', 'Reels mode'].filter(x => !t.toUpperCase().includes(x.toUpperCase())), hookTxt, hk: m.hk, hkind: m.hkind, h: m.h,
        hookOk: m.hk ? hookTxt === m.hk : hookTxt === (m.hkind === 'visual' ? 'Visual hook, no text' : 'Hook not read yet') }; });
    ok(`${tag} viewer: batch 1 panels and actions present`, !pan.labels.length && !pan.acts.length, JSON.stringify(pan));
    ok(`${tag} viewer: Hook line = hook_text (never the Meta headline)`, pan.hookOk && (!pan.h || pan.hookTxt !== pan.h || pan.hk === pan.h), JSON.stringify(pan));
    await noHScroll('viewer');
    await shot('viewer');
    // Reels mode (full screen) from the viewer
    await page.click('#cd-vw [data-reelsfrom]'); await page.waitForSelector('#cd-reels:not([hidden]) .reel', { timeout: 10000 }).catch(() => { }); await page.waitForTimeout(1500);
    const rm = await page.evaluate(() => { const R = document.getElementById('cd-reels'); if (!R || R.hidden) return { open: false }; const f = R.querySelector('.reel .frame'); const b = f.getBoundingClientRect();
      const txt = [...R.querySelectorAll('.reel:first-child .r-rail,.reel:first-child .r-top')].map(e => e.innerText).join(' ');
      return { open: true, digits: txt.match(/\d[\d,.]*/g) || [], w: Math.round(b.width), h: Math.round(b.height), vw: innerWidth, vh: innerHeight, playing: [...R.querySelectorAll('video')].filter(v => !v.paused).length }; });
    ok(`${tag} Reels mode: opens full height, icons only`, rm.open && !rm.digits.length && Math.abs(rm.h - rm.vh) <= 2 && rm.w <= rm.vw, JSON.stringify(rm));
    await shot('reels-mode');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    ok(`${tag} viewer: Esc closes`, await page.evaluate(() => document.getElementById('cd-vw').hidden && document.getElementById('cd-reels').hidden));
  } else ok(`${tag} viewer: found a video to open`, false);

  // Projects still works
  await page.click('.proj .pj:not(#t-cd)').catch(() => { });
  await page.waitForTimeout(500);
  ok(`${tag} Projects section still opens`, await page.evaluate(() => document.getElementById('v-cd').hidden && !document.querySelector('nav.bar').hidden));

  ok(`${tag} no console errors`, !errors.length, errors.slice(0, 5).join(' | '));
  results.push({ name: `${tag} media load failures (info)`, pass: true, detail: loadFails.length + ' failed resource loads' });
  await browser.close();
}

// Part 1: shareable ad links (#discover/ad/<id>), Copy link in the viewer and on cards, Back / Esc returns to the same scroll position
async function shareChecks(page, ctx, tag, shot) {
  const clip = () => page.evaluate(() => navigator.clipboard.readText().catch(e => 'ERR ' + e.message));
  const base = await page.evaluate(() => location.origin + location.pathname);
  // fresh deep link
  const p2 = await ctx.newPage();
  await p2.goto(BASE + 'preview/#discover/ad/' + KNOCK_ID, { waitUntil: 'domcontentloaded' });
  const open = await p2.waitForSelector('#cd-vw:not([hidden]) .phone', { timeout: 60000 }).then(() => true).catch(() => false); await p2.waitForTimeout(800);
  const dl = await p2.evaluate(() => { const L = document.getElementById('cd-vw'); const p = L && ([...L.querySelectorAll('p')].find(x => /Hook line:/.test(x.textContent)) || [...L.querySelectorAll('.lbl')].find(x => x.textContent === 'Hook line')?.nextElementSibling);
    return { hash: location.hash, mid: window.CD.C.viewer && window.CD.C.viewer.mid, hook: p ? p.textContent.replace('Hook line:', '').trim().slice(0, 40) : null, copyBtn: !!document.querySelector('#cd-vw #vw-copy') }; });
  ok(`${tag} share: fresh deep link #discover/ad/<id> opens that ad's viewer`, open && dl.mid === KNOCK_ID && /^KNOCK KNOCK/.test(dl.hook || '') && dl.hash.includes('/ad/' + KNOCK_ID), JSON.stringify(dl));
  ok(`${tag} share: viewer has a Copy link button`, dl.copyBtn);
  await p2.screenshot({ path: path.join(OUT, `${tag}-share-deeplink.png`) });
  await p2.click('#vw-copy'); await p2.waitForTimeout(400);
  const c1 = await p2.evaluate(() => navigator.clipboard.readText().catch(e => 'ERR ' + e.message)); const t1 = await p2.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
  ok(`${tag} share: viewer Copy link writes the full URL and shows "Link copied"`, c1 === base + '#discover/ad/' + KNOCK_ID && /Link copied/.test(t1), c1 + ' | ' + t1);
  await p2.keyboard.press('Escape'); await p2.waitForTimeout(500);
  ok(`${tag} share: Esc on a deep link closes to the grid`, await p2.evaluate(() => document.getElementById('cd-vw').hidden && !/\/ad\//.test(location.hash) && document.querySelectorAll('.cd-card').length > 0), await p2.evaluate(() => location.hash));
  // old #ad/<id> link
  await p2.goto(BASE + 'preview/#ad/' + KNOCK_ID, { waitUntil: 'domcontentloaded' }); await p2.reload({ waitUntil: 'domcontentloaded' });
  const old = await p2.waitForSelector('#cd-vw:not([hidden]) .phone', { timeout: 60000 }).then(() => true).catch(() => false);
  const oh = await p2.evaluate(() => ({ hash: location.hash, mid: window.CD && window.CD.C.viewer && window.CD.C.viewer.mid }));
  ok(`${tag} share: old #ad/<id> links still open the ad`, old && oh.mid === KNOCK_ID && oh.hash.startsWith('#discover/ad/'), JSON.stringify(oh));
  await p2.close();
  // open from the grid, Esc and Back return to the same scroll position
  await page.evaluate(() => { location.hash = 'discover'; }); await page.waitForTimeout(600); await settleP(page);
  await page.evaluate(() => window.scrollTo(0, 1400)); await page.waitForTimeout(700);
  const pick = async () => page.evaluate(() => { const f = [...document.querySelectorAll('.cd-mas .cd-fr')].find(f => { const b = f.getBoundingClientRect(); return b.top > 140 && b.bottom < innerHeight - 20; }); return f ? f.dataset.open : null; });
  const id1 = await pick(); const y0 = await page.evaluate(() => scrollY);
  if (id1) {
    await page.evaluate(id => document.querySelector(`.cd-mas .cd-fr[data-open="${id}"]`).click(), id1); await page.waitForTimeout(700);
    const h1 = await page.evaluate(() => location.hash);
    ok(`${tag} share: opening an ad puts /ad/<id> in the URL`, /\/ad\/[^/?]+/.test(h1), h1);
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    const e1 = await page.evaluate(() => ({ y: scrollY, hidden: document.getElementById('cd-vw').hidden, hash: location.hash }));
    ok(`${tag} share: Esc closes and keeps the scroll position`, e1.hidden && Math.abs(e1.y - y0) <= 4 && !/\/ad\//.test(e1.hash), JSON.stringify({ y0, ...e1 }));
    await page.evaluate(id => document.querySelector(`.cd-mas .cd-fr[data-open="${id}"]`).click(), id1); await page.waitForTimeout(700);
    await page.goBack(); await page.waitForTimeout(800);
    const b1 = await page.evaluate(() => ({ y: scrollY, hidden: document.getElementById('cd-vw').hidden, hash: location.hash }));
    ok(`${tag} share: browser Back closes the viewer and keeps the scroll position`, b1.hidden && Math.abs(b1.y - y0) <= 4 && /^#discover/.test(b1.hash) && !/\/ad\//.test(b1.hash), JSON.stringify({ y0, ...b1 }));
  } else ok(`${tag} share: found a card to open`, false);
  // Copy link on a card
  const cid = await page.evaluate(() => { const b = [...document.querySelectorAll('.cd-mas .cd-card [data-copy]')].find(b => { const r = b.getBoundingClientRect(); return r.top > 120 && r.bottom < innerHeight; }); return b ? b.dataset.copy : null; });
  if (cid) { await page.locator(`.cd-mas .cd-card [data-copy="${cid}"]`).first().click(); await page.waitForTimeout(400);
    const c2 = await clip(); ok(`${tag} share: card Copy link copies #discover/ad/<id>`, c2 === base + '#discover/ad/' + cid && await page.evaluate(() => document.getElementById('cd-vw').hidden), c2);
    await shot('share-card-copied');
  } else ok(`${tag} share: card has a Copy link button`, false);
}
// Part 2: Brands section (search, category chips, sort, brand cards with format mix, brand pages)
async function brandChecks(page, tag, shot) {
  await page.evaluate(() => { location.hash = 'discover/brands'; }); await page.waitForSelector('.cd-bcard', { timeout: 30000 }).catch(() => { }); await page.waitForTimeout(500);
  const mixOk = () => page.evaluate(() => { const bad = []; let n = 0; document.querySelectorAll('.cd-mix').forEach(m => { n++; const v = [...m.querySelectorAll('.cd-mix-l b')].map(b => parseFloat(b.textContent)); const t = v.reduce((a, b) => a + b, 0); if (Math.abs(t - 100) > 0.05) bad.push(m.closest('[data-brand]')?.dataset.brand + ' ' + t.toFixed(1)); }); return { n, bad }; });
  const l0 = await page.evaluate(() => ({ n: document.querySelectorAll('.cd-bcard').length, chips: document.querySelectorAll('[data-bcat]').length, focus: !!document.querySelector('[data-bcat="__focus"]'), ca: !!document.querySelector('[data-bcat="__ca"]'), sort: document.querySelectorAll('#cd-bsort option').length, search: !!document.getElementById('cd-bq'),
    card: (() => { const c = document.querySelector('.cd-bcard'); return c ? { logo: !!c.querySelector('.cd-logo'), name: c.querySelector('.cd-cht b')?.textContent, cat: c.querySelector('.cd-cht small')?.textContent, active: c.querySelector('.cd-bact b')?.textContent, bar: c.querySelectorAll('.cd-mix-b i').length, trend: !!c.querySelector('.cd-trend'), sum: (c.querySelector('.cd-bsum')?.textContent || '').length } : null; })() }));
  ok(`${tag} Brands: search bar, category chips with counts, Focus and Canadian chips, 5 sorts`, l0.search && l0.chips >= 4 && l0.focus && l0.ca && l0.sort === 5, JSON.stringify(l0));
  ok(`${tag} Brands: card has logo, name, category, active ads, mix bar, 30-day trend, summary`, l0.card && l0.card.logo && l0.card.name && l0.card.cat && l0.card.active && l0.card.bar > 0 && l0.card.trend && l0.card.sum > 10, JSON.stringify(l0.card));
  const m0 = await mixOk(); ok(`${tag} Brands: video / image / carousel % sums to 100 on every card`, m0.n > 0 && !m0.bad.length, JSON.stringify(m0));
  await noHScrollP(page, tag, 'Brands list');
  await shot('brands');
  const q = async t => { await page.fill('#cd-bq', t); await page.waitForTimeout(250); return page.evaluate(() => [...document.querySelectorAll('.cd-bcard')].map(c => c.dataset.brand)); };
  const g = await q('gym'); ok(`${tag} Brands: search "gym" finds Gymshark`, g.length >= 1 && g.includes('Gymshark') && g.every(b => /gym/i.test(b)), JSON.stringify(g));
  const nf = await q('NÖRTH'); ok(`${tag} Brands: search "north" (case and accent insensitive) finds The North Face`, nf.includes('The North Face'), JSON.stringify(nf));
  await shot('brands-search');
  await q('');
  const cat = await page.evaluate(() => { const c = [...document.querySelectorAll('[data-bcat]')].find(b => b.dataset.bcat && !b.dataset.bcat.startsWith('__') && +b.querySelector('small').textContent > 0); return c ? c.dataset.bcat : null; });
  if (cat) { await page.click(`[data-bcat="${cat}"]`); await page.waitForTimeout(250);
    const cs = await page.evaluate(() => [...document.querySelectorAll('.cd-bcard .cd-cht small')].map(s => s.textContent.split(' · ')[0]));
    ok(`${tag} Brands: category chip "${cat}" filters the list`, cs.length > 0 && cs.every(x => x === cat), JSON.stringify(cs.slice(0, 8)));
    await page.click(`[data-bcat="${cat}"]`); await page.waitForTimeout(200); }
  await page.click('[data-bcat="__focus"]'); await page.waitForTimeout(200);
  const fb = await page.evaluate(() => [...document.querySelectorAll('.cd-bcard')].map(c => c.dataset.brand)); ok(`${tag} Brands: Focus brands chip`, fb.includes('Gymshark') && fb.includes('The North Face'), JSON.stringify(fb.slice(0, 12)));
  await page.click('[data-bcat="__focus"]'); await page.waitForTimeout(200);
  for (const [b, qq] of [['Gymshark', 'gym'], ['The North Face', 'north']]) {
    await q(qq); await page.click(`.cd-bcard[data-brand="${b}"]`); await page.waitForSelector('.cd-bprof, #cd-bads', { timeout: 15000 }).catch(() => { }); await page.waitForTimeout(800);
    const bp = await page.evaluate(() => ({ h: document.querySelector('#cd-head h2')?.textContent, sub: document.querySelector('#cd-head p')?.textContent, sum: document.querySelector('.cd-bsum-l')?.textContent.length || 0,
      tiles: [...document.querySelectorAll('.cd-stile .lbl')].map(x => x.textContent), panels: [...document.querySelectorAll('.cd-panel2 > .lbl')].map(x => x.textContent), weeks: document.querySelectorAll('.cd-wk-c').length, strip: document.querySelectorAll('.cd-bstrip .cd-card').length,
      grid: document.querySelectorAll('#cd-bads .cd-card').length, brands: [...new Set((window.CD.C.lists.brand || []).map(a => a.b))], filters: !document.getElementById('cd-fbtn').hidden }));
    const want = ['Format mix', 'Aspect mix', 'UGC share', 'Studio / product share', 'Launches, last 30 days'];
    ok(`${tag} Brand page ${b}: header, summary, 5 stat tiles, 8-week chart, tags, hooks, top ads, grid of only this brand, Filters`, new RegExp(b, 'i').test(bp.h || '') && /active \/ [\d,]+ total/.test(bp.sub || '') && /median \d+ days live/.test(bp.sub || '') && bp.sum > 20 && want.every(w => bp.tiles.includes(w)) && bp.weeks === 8 && bp.panels.some(p => /visual formats/i.test(p)) && bp.panels.some(p => /hook/i.test(p)) && bp.strip > 0 && bp.grid > 0 && bp.brands.length === 1 && bp.brands[0] === b && bp.filters, JSON.stringify(bp));
    const m1 = await mixOk(); ok(`${tag} Brand page ${b}: format mix sums to 100`, m1.n > 0 && !m1.bad.length, JSON.stringify(m1));
    await noHScrollP(page, tag, 'Brand page ' + b);
    await shot('brand-' + (b === 'Gymshark' ? 'gymshark' : 'tnf'));
    await page.evaluate(() => window.scrollTo(0, document.getElementById('cd-bads').offsetTop - 80)); await page.waitForTimeout(500); await shot('brand-' + (b === 'Gymshark' ? 'gymshark' : 'tnf') + '-grid');
    await page.click('#cd-head .cd-link.back'); await page.waitForTimeout(500);
    const back = await page.evaluate(() => ({ q: document.getElementById('cd-bq')?.value, n: document.querySelectorAll('.cd-bcard').length }));
    ok(`${tag} Brands: back keeps the search`, back.q === qq && back.n >= 1, JSON.stringify(back));
  }
  await q('');
}
// Part 3: JD > Hooks view, chart click filters the library, CSV downloads, Hook format filter in the Filters drawer
async function hookChecks(page, tag, shot) {
  await page.evaluate(() => { location.hash = 'discover/jd'; }); await page.waitForTimeout(600);
  ok(`${tag} JD: Ads | Hooks switch`, await page.evaluate(() => !!document.querySelector('.cd-seg2 [data-jdv="hooks"]') && document.querySelector('.cd-seg2 [data-jdv="ads"]').getAttribute('aria-selected') === 'true'));
  await page.click('.cd-seg2 [data-jdv="hooks"]'); await page.waitForSelector('.cd-hooks', { timeout: 15000 }).catch(() => { }); await page.waitForTimeout(700);
  const hv = await page.evaluate(() => ({ hash: location.hash, strip: [...document.querySelectorAll('.cd-hs .lbl')].map(x => x.textContent), bars: document.querySelectorAll('.cd-hbc [data-hkf]').length, sig: document.querySelectorAll('.cd-tbl .cd-tr:not(.cd-th)').length,
    trend: document.querySelectorAll('.cd-sm').length, tps: document.querySelectorAll('.cd-tp').length, ai: document.querySelectorAll('.cd-tp-ai li').length, rows: document.querySelectorAll('.cd-hr').length, thumb: !!document.querySelector('.cd-hr-m img'), copy: document.querySelectorAll('.cd-hr [data-copy]').length,
    signalsLbl: /not results/i.test(document.body.innerText), filters: ['fmt', 'mkt', 'kind', 'min', 'sort'].every(k => document.querySelector(`[data-hk="${k}"]`)), csv: document.querySelectorAll('[data-hkcsv]').length, fb: document.getElementById('cd-fbtn').hidden }));
  ok(`${tag} Hooks: header strip, format bars, signals (not results), trend, templates with AI suggestions, library with thumbs and Copy link`, /#discover\/jd\/hooks/.test(hv.hash) && hv.strip.length === 5 && hv.bars >= 3 && hv.sig >= 3 && hv.trend >= 1 && hv.trend <= 5 && hv.tps >= 1 && hv.ai >= 3 && hv.rows > 0 && hv.thumb && hv.copy === hv.rows && hv.signalsLbl && hv.filters && hv.csv === 2, JSON.stringify(hv));
  const bw = await page.evaluate(() => [...document.querySelectorAll('.cd-hbc [data-hkf]')].map(b => [+b.querySelector('b').textContent.split(' ')[0].replace(/,/g, ''), b.querySelector('.cd-hb-t i').getBoundingClientRect().width]));
  const bmax = Math.max(...bw.map(x => x[0])), wmax = Math.max(...bw.map(x => x[1]));
  ok(`${tag} Hooks: bar lengths match the counts (longest bar = most used)`, bw.length > 1 && bw.every(([n, w]) => Math.abs(w - n / bmax * wmax) <= 2), JSON.stringify(bw.map(x => [x[0], Math.round(x[1])])));
  await noHScrollP(page, tag, 'Hooks');
  await shot('hooks');
  const fmt = await page.evaluate(() => { const b = [...document.querySelectorAll('.cd-hbc [data-hkf]')].find(b => b.dataset.hkf !== 'Visual only'); return b ? b.dataset.hkf : null; });
  await page.click(`.cd-hbc [data-hkf="${fmt}"]`); await page.waitForTimeout(500);
  const fl = await page.evaluate(f => ({ chips: [...document.querySelectorAll('.cd-hr .cd-mk.y')].map(x => x.textContent), count: document.querySelector('#cd-hrows .cd-bcount')?.textContent, want: window.CD.ROWS.filter(m => m.mk && m.hkind && m.hf === f).length, sel: document.querySelector('[data-hk="fmt"]').value }), fmt);
  ok(`${tag} Hooks: clicking a bar ("${fmt}") filters the library`, fl.chips.length > 0 && fl.chips.every(x => x === fmt) && fl.sel === fmt && new RegExp('^' + fl.want.toLocaleString('en-CA') + ' hook').test(fl.count || ''), JSON.stringify({ ...fl, chips: fl.chips.length }));
  await shot('hooks-filtered');
  if (tag === 'd') {
    const dl = async which => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click(`[data-hkcsv="${which}"]`)]); const f = await d.path(); const buf = fs.readFileSync(f); const txt = buf.toString('utf8');
      const rows = []; let row = [], cur = '', q = false; const t = txt.replace(/^\ufeff/, ''); for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; } else cur += c; }
      return { bom: buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF, header: rows[0], n: rows.length - 1, name: d.suggestedFilename(), widths: [...new Set(rows.map(r => r.length))] }; };
    const want = 'ad_id,brand,market,launch_date,days_live,format,aspect,hook_text,hook_format,hook_template,onscreen_text,meta_headline,primary_text,landing_url,proven_score,ad_link,ad_library_link';
    const c1 = await dl('filtered');
    ok(`${tag} Hooks: "Download hooks (CSV)" has BOM, the right header and ${fl.want} rows`, c1.bom && c1.header.join(',') === want && c1.n === fl.want && c1.widths.length === 1, JSON.stringify(c1));
    const wantAll = await page.evaluate(() => window.CD.ROWS.filter(m => m.hkind).length);
    const c2 = await dl('all');
    ok(`${tag} Hooks: "Download all (CSV)" has every hook read (${wantAll} rows), same header`, c2.bom && c2.header.join(',') === want && c2.n === wantAll && c2.widths.length === 1, JSON.stringify(c2));
  }
  await page.click(`.cd-hbc [data-hkf="${fmt}"]`); await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = 'discover/jd/hooks'; }); await page.waitForTimeout(300);
  await page.click('[data-hkbym="1"]'); await page.waitForTimeout(300);
  ok(`${tag} Hooks: by-market toggle shows each market's share`, await page.evaluate(() => document.querySelectorAll('.cd-hm-h [role=columnheader]').length >= 3 && document.querySelectorAll('.cd-hm-c').length > 3));
  await page.click('[data-hkbym="0"]'); await page.waitForTimeout(300);
  const rid = await page.evaluate(() => document.querySelector('.cd-hr')?.dataset.id);
  await page.evaluate(id => document.querySelector(`.cd-hr[data-id="${id}"] .cd-hr-h`).click(), rid); await page.waitForSelector('#cd-vw:not([hidden]) .phone', { timeout: 10000 }).catch(() => { }); await page.waitForTimeout(500);
  const ov = await page.evaluate(() => ({ mid: window.CD.C.viewer && window.CD.C.viewer.mid, hash: location.hash }));
  ok(`${tag} Hooks: clicking a hook opens the viewer on that ad`, ov.mid === rid && ov.hash.includes('/ad/' + rid), JSON.stringify(ov));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  ok(`${tag} Hooks: Esc returns to the Hooks view`, await page.evaluate(() => document.getElementById('cd-vw').hidden && !!document.querySelector('.cd-hooks') && location.hash === '#discover/jd/hooks'));
  // Hook format in the Filters drawer (Discover)
  await page.evaluate(() => { location.hash = 'discover'; }); await page.waitForTimeout(600);
  await page.click('#cd-fbtn'); await page.waitForSelector('#cd-fd:not([hidden]) .cd-fd', { timeout: 5000 }).catch(() => { }); await page.waitForTimeout(300);
  const g = await page.evaluate(() => { const s = [...document.querySelectorAll('#cd-fd .cd-fd-g')].find(x => x.querySelector('.lbl')?.textContent === 'Hook format'); return s ? [...s.querySelectorAll('[data-fd]')].map(b => [b.dataset.fd, +b.querySelector('small').textContent.replace(/,/g, '')]) : null; });
  ok(`${tag} filters: Hook format group with counts`, g && g.length >= 3 && g.every(x => /^hf\|/.test(x[0])), JSON.stringify(g));
  const pick = g && (g.find(x => x[0] === 'hf|Question') || g.find(x => x[1] > 0));
  if (pick) { await page.click(`#cd-fd [data-fd="${pick[0]}"]`); await page.waitForTimeout(250); await page.click('#cd-fd [data-fdapply]'); await page.waitForTimeout(700);
    const r = await page.evaluate(v => ({ n: window.CD.C.lists.discover.length, ok: window.CD.C.lists.discover.every(a => a.hfs.has(v)), chip: document.querySelectorAll('#cd-act [data-rmf^="hf|"]').length, hash: location.hash }), pick[0].slice(3));
    ok(`${tag} filters: Hook format "${pick[0].slice(3)}" applies in Discover (${pick[1]} cards)`, r.n === pick[1] && r.ok && r.chip === 1 && /hf=/.test(r.hash), JSON.stringify(r));
    await shot('filter-hookformat');
    await page.click('#cd-act [data-fclear]'); await page.waitForTimeout(400); }
}
async function noHScrollP(page, tag, where) { const r = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok(`${tag} ${where}: no horizontal scroll`, r[0] <= r[1] + 1, `scrollWidth ${r[0]} vs ${r[1]}`); }
async function settleP(page) { await page.waitForFunction(() => { const imgs = [...document.querySelectorAll('.cd-fr img.cd-po')].slice(0, 30); return imgs.length && imgs.every(i => i.complete); }, null, { timeout: 30000 }).catch(() => { }); await page.waitForTimeout(500); }

async function loadingRun() {
  const browser = await chromium.launch({ ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}), args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await ctx.addInitScript(() => { try { localStorage.setItem('jd-email', JSON.stringify('preview-check@ryanclarke.co')); } catch (e) { } });
  let slowMedia = false;
  if (FX) { await routeFixture(ctx); await ctx.route(/in_ads\?/, async r => { await new Promise(z => setTimeout(z, 2500)); return r.fallback(); }); await ctx.route(/(r2\.dev|supabase\.co\/storage)\//, async r => { if (slowMedia) await new Promise(z => setTimeout(z, 4000)); return r.fallback(); }); }
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const slow = on => cdp.send('Network.emulateNetworkConditions', on ? { offline: false, latency: 600, downloadThroughput: 120 * 1024, uploadThroughput: 60 * 1024 } : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.send('Network.enable'); await slow(true);
  await page.goto(BASE + 'preview/#discover', { waitUntil: 'domcontentloaded' });
  const ld = await page.waitForSelector('#v-cd .cd-load', { timeout: 30000 }).then(() => true).catch(() => false);
  const box = await page.evaluate(() => { const l = document.querySelector('#v-cd .cd-load'); if (!l) return null; const r = l.getBoundingClientRect(); return { txt: l.innerText.trim(), top: Math.round(r.top), h: Math.round(r.height), main: Math.round(document.getElementById('cd-body').getBoundingClientRect().top) }; });
  await page.screenshot({ path: path.join(OUT, 'd-loading-page.png') });
  ok('throttled: page loader "Loading creative"', ld && box && /Loading creative/i.test(box.txt), JSON.stringify(box));
  await slow(false); // the full ad list is several MB; lift the throttle until the grid is in, then throttle again for the media
  await page.waitForSelector('.cd-card', { timeout: 120000 }).catch(() => { });
  const top2 = await page.evaluate(() => Math.round(document.getElementById('cd-body').getBoundingClientRect().top));
  ok('throttled: no layout jump when the loader goes (grid starts where the loader was)', box && Math.abs(top2 - box.main) <= 2, JSON.stringify({ before: box && box.main, after: top2 }));
  await page.waitForTimeout(1500); await slow(true); slowMedia = true;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5)); await page.waitForTimeout(900);
  const sk = await page.evaluate(() => ({ shim: document.querySelectorAll('.cd-fr:not(.ld) .cd-shim').length, label: (document.querySelector('.cd-fr:not(.ld) .cd-shim span') || {}).textContent || '' }));
  await page.screenshot({ path: path.join(OUT, 'd-loading-cards.png') });
  ok('throttled: card shimmer at the true aspect with "Loading creative"', sk.shim > 0 && /Loading creative/i.test(sk.label), JSON.stringify(sk));
  const vid = await page.evaluate(() => (document.querySelector('.cd-fr[data-k="video"]') || {}).dataset?.open);
  if (vid) {
    await page.evaluate(id => window.CD.open(id), vid); await page.waitForTimeout(700);
    const vb = await page.evaluate(() => { const b = document.getElementById('pv-buf'); return b ? { on: b.classList.contains('on'), txt: b.innerText.trim() } : null; });
    await page.screenshot({ path: path.join(OUT, 'd-loading-viewer.png') });
    ok('throttled: viewer shows spinner + "Loading creative" while the video buffers', vb && vb.on && /Loading creative/i.test(vb.txt), JSON.stringify(vb));
  }
  // Directory, never Home (batch 1 page nav)
  await slow(false); slowMedia = false;
  await page.goto(BASE + 'discovery/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
  const nav = await page.evaluate(() => [...document.querySelectorAll('#topnav a, #tabbar a, #tabbar button')].map(a => a.textContent.trim()));
  ok('naming: "Directory" in the Creative Discovery nav, no "Home"', nav.some(t => /^Directory/.test(t)) && !nav.some(t => /^Home$/.test(t)), JSON.stringify(nav));
  await page.goto(BASE + 'preview/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
  await page.click('#t-cd').catch(() => { }); await page.waitForTimeout(500);
  ok('naming: Creative Discovery opens on Discover by default', await page.evaluate(() => /^#discover(\?|$)/.test(location.hash) && document.querySelector('[data-cdtab="discover"]')?.getAttribute('aria-selected') === 'true'));
  await browser.close();
}

module.exports = { routeFixture };
if (require.main === module) (async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) { try { await run(vp); } catch (e) { ok(`run ${vp.width}`, false, e.stack || e.message); } }
  try { await loadingRun(); } catch (e) { ok('loading run', false, e.stack || e.message); }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ base: BASE, when: new Date().toISOString(), passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, results }, null, 2));
  const f = results.filter(r => !r.pass).length; console.log(`\n${results.length - f} passed, ${f} failed`); process.exit(0); // failures are reported in results.json and the step summary, never as a failed job
})();

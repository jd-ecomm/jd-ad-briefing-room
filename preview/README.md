# /preview/: Creative Discovery inside the Briefing Room

A copy of the Briefing Room (`index.html`) where **Creative Discovery replaces Discover Ads**. The live root pages are unchanged; `/discovery/` stays as it was.

- `preview/index.html` is the root `index.html` with `<base href="../">` (so it uses the live `brief.js`, `data.json`, fonts and studio images), a small patch that keeps hash links on `/preview/`, `trending.js` and `inspo.js` removed, and `preview/cd.js` + `preview/cd.css` + `preview/cd-dv.css` added.
- `preview/cd-dv.css` is `discovery/discovery.css` scoped to `.cd-dv` (generated): the batch 1 viewer, Instagram frames, Reels mode and JD Global styles, carried over as they were.
- Entry: the **Creative Discovery** button in the Projects row ("Always on"), same place as the old Discover Ads button. Projects and every other section are untouched.
- Routes: `#discover`, `#discover/jd`, `#discover/trending`, `#discover/brands`, `#discover/brands/<brand_id>`, `#discover/boards`, `#discover/boards/<board_id>`. Old `#trending` and `#inspo` links redirect.
- Data: Supabase `in_ads` (every released batch, `batch is not null`, English; same rule as `/discovery/`), `tr_ads` (Runneth trending), `in_favs`, `in_boards`, `in_board_items`. Media: R2 first, then Supabase copies, then Motion.
- Cards: masonry columns (2 at phone width up to 6 on wide screens), every creative in a frame of its real aspect ratio, `object-fit: contain`; the frame re-sizes to the image's natural size on load.
- Video: off by default nothing autoplays in the grid. Pointer devices: hover = play only (enter plays muted from the start, leave pauses on the poster; moving the pointer never seeks or pauses). Touch: tap opens the viewer.
- Autoplay button (top right of the bar, off by default, remembered per browser in `localStorage` `cd2_autoplay`): every grid video in view plays muted on a loop (IntersectionObserver, paused off screen, at most 8 at once).
- JD tab = the JD Global section from `/discovery/` (stats, market chips, Proven sort, Show more, note). The only change: each ad is a larger card (2 per row on desktop, 1 on phones), creative uncropped, same title, days, format, landing type, market pill and Proven score.
- Viewer = the batch 1 viewer from `/discovery/` (phone frame, Save / Add to board / Reels mode / Landing page, keyboard hints, Proven score, Days live / Format / CTA / Offer / Landing, Tags, Hook timeline, Key frames, On-screen text, concept variants) and its Reels mode. Changes: no like or comment numbers anywhere (icons only); Hook line = `in_ads.hook_text` ("Hook not read yet", or "Visual hook, no text" when `hook_kind = 'visual'`), On-screen text = `in_ads.onscreen_text`, the Meta headline shown separately as "Ad headline (Meta)".
- Check: `.github/workflows/cd-preview-check.yml` runs `tools/cd-preview-check.js` against the deployed page (1440x900 and 390x844) and pushes screenshots to `cd-preview-shots/run-<id>`. Offline: `node tools/cd-preview-check.js http://localhost:8000/ out --fixture <dir with v_9x16.mp4, p_9x16.jpg, ...>`.

To go live: point the root `index.html` at `preview/cd.js` and `preview/cd.css` in place of `trending.js` and `inspo.js` (or move them to the root).

# /preview/: Creative Discovery inside the Briefing Room

A copy of the Briefing Room (`index.html`) where **Creative Discovery replaces Discover Ads**. The live root pages are unchanged; `/discovery/` stays as it was.

- `preview/index.html` is the root `index.html` with `<base href="../">` (so it uses the live `brief.js`, `data.json`, fonts and studio images), a small patch that keeps hash links on `/preview/`, `trending.js` and `inspo.js` removed, and `preview/cd.js` + `preview/cd.css` added.
- Entry: the **Creative Discovery** button in the Projects row ("Always on"), same place as the old Discover Ads button. Projects and every other section are untouched.
- Routes: `#discover`, `#discover/jd`, `#discover/trending`, `#discover/brands`, `#discover/brands/<brand_id>`, `#discover/boards`, `#discover/boards/<board_id>`. Old `#trending` and `#inspo` links redirect.
- Data: Supabase `in_ads` (batch 1, English), `tr_ads` (Runneth trending), `in_favs`, `in_boards`, `in_board_items`. Media: R2 first, then Supabase copies, then Motion.
- Cards: masonry columns (2 at phone width up to 6 on wide screens), every creative in a frame of its real aspect ratio, `object-fit: contain`; the frame re-sizes to the image's natural size on load.
- Video: nothing autoplays in the grid. Pointer devices: hover plays muted from the start; moving across the card scrubs (x position = time, `currentTime` set in `requestAnimationFrame`, only when the last seek has finished); leaving pauses and shows the poster. Touch: tap opens the viewer. At most 8 hover videos stay loaded.
- Viewer: Reels, Stories and Feed placements with icons only (no like or comment counts). One `<video>` with native controls, no custom scrubber.
- Check: `.github/workflows/cd-preview-check.yml` runs `tools/cd-preview-check.js` against the deployed page (1440x900 and 390x844) and pushes screenshots to `cd-preview-shots/run-<id>`. Offline: `node tools/cd-preview-check.js http://localhost:8000/ out --fixture <dir with v_9x16.mp4, p_9x16.jpg, ...>`.

To go live: point the root `index.html` at `preview/cd.js` and `preview/cd.css` in place of `trending.js` and `inspo.js` (or move them to the root).

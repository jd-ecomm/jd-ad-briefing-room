# JD Ad Briefing Room

JD Sports Canada paid social creative hub for BFCM 2026. Static site, served by GitHub Pages from `main`.

- `index.html`: the app (Library, Message Themes, Messaging Matrix, JD Mockups, Our 2025 Results)
- `data.json`: all content (ads, themes, messaging rows, mockups)
- `atria/`: reference ad media (poster `.jpg`, `.mp4` previews)
- `studio/`: JD mockups (`.png` full size, `.jpg` previews)
- `deck/`: 2024/25 deck examples
- `fonts/`: JD brand fonts

Edit `data.json` to change content; no build step.

## Discover Ads (always on)
Top-level section with two sub tabs:
- **Trending Ads Weekly** (`#trending`, `trending.js`): top 30 Runneth trending ads per category each week, Supabase `tr_ads`, media in bucket `trending` (`tools/runneth-pull.js`, `tools/runneth-store.js`).
- **Inspo** (`#inspo`, `inspo.js`): apparel and footwear ads from Motion's Inspo library for the brands in the BFCM library (JD, brand partners, competitors, DTC fashion) plus the top apparel/footwear ads per visual format.
  - Data: Supabase `in_ads` (one row per Motion creative: brand, brand group, status, went live, running time, type, Motion visual-format tags, copy, CTA, landing page, media).
  - Pull: `tools/inspo-pull.js` in a signed-in Motion tab, `window.__inspoRun({mode:'weekly'})` (or `'full'` for a deep backfill). Brand list and Motion brand ids live at the top of that file.
  - Media: `tools/inspo-store.js` on a motionswipefile.blob.core.windows.net page copies a 640px thumbnail, every image/carousel card (1080px JPEG) and the brand logo into bucket `inspo`. Videos stream from Motion's copy.
  - Favourites (`in_favs`, per JD email) and Boards (`in_boards`, `in_board_items`) are shared with the whole team. Deep links: `#inspo/ad/<id>`, `#inspo/board/<id>`.
  - Visual format groups (Try-On, UGC, Yapper, DITL, Native Search, Text Overlay, Product, Us vs Them…) are defined at the top of `inspo.js` and map Motion's tags; change the grouping there, no re-pull needed.

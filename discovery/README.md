# Creative Discovery (preview, batch 1)

`/discovery/` is a separate page; the Briefing Room's existing tabs are untouched. Projects stays in the main app.

- Data: Supabase `in_ads` where `batch = 1` and `is_english = true`, paged 1,000 rows per request (PostgREST cap), 4 requests at a time.
- One card per `variant_group` (same brand, same ad text, same landing page without query string, start dates within 7 days).
  `formats` lists every member; the card shows a 9:16 / 4:5 / 1:1 toggle and an "N formats" badge.
  The viewer switches placement with the format: 9:16 shows Reels or Stories, 4:5 and 1:1 show Feed.
- Media order: R2 (`thumb_r2`, `video_r2`, `images_r2`, `logo_r2`) then Supabase copies (`*_s`) then Motion URLs; a failed URL falls back to the next.
  Videos without a clean poster use `<video preload="metadata" src="...#t=1">`, so no baked-in play icon shows.
- Proven score = days live (capped at 90) + variants in the `concept_key` + parallel launches (same `concept_key`, start within 3 days). Proven = 60+ days live.
- Favourites and boards: `in_favs`, `in_boards`, `in_board_items` (shared with the Inspo tab). Board notes and drag order are saved on the device.
- Trending Ads Weekly is the existing view (`../#trending`) embedded unchanged.
- Login: the Briefing Room's JD email rule (`localStorage["jd-email"]`).
- SQL: `migrations/20261109_creative_discovery_batch1.sql`.

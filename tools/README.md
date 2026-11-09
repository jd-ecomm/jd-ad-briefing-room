# tools

Browser-console helpers for the Discover Ads / Creative Discovery data in Supabase (`in_ads`).

| Script | What it does |
| --- | --- |
| `inspo-pull.js` | Pulls Motion swipe-file ads into `in_ads`. |
| `inspo-store.js` | Copies ad media into the Supabase bucket `inspo` (free plan, 1 GB cap). |
| `r2-store.js` | Copies ad media into Cloudflare R2 (bucket `jd-creative-discovery`) and makes clean video posters. |
| `runneth-pull.js`, `runneth-store.js` | Runneth equivalents. |

## R2 media (`r2-store.js`)

Where to run it: a tab on any `https://motionswipefile.blob.core.windows.net/...` media URL (take any `in_ads.poster` or `in_ads.video`).
That makes Motion's media same-origin, so `fetch` and canvas work. On a `https://jd-ecomm.github.io` tab it falls back to the
stored Supabase copies (`video_s`, `thumb_s`, `images_s`, `logo_s`), which allow cross-origin reads.

How to run it: paste the file into the console, then

```js
await window.__r2Start()            // every row still to do
await window.__r2Start({limit:200}) // weekly refresh: just the newest 200
window.__r2Status()                 // poll until done is true
```

What it does, per `in_ads` row where `r2_at` is null and `is_english` is true or null (focus brands first, newest first, 6 in parallel, one retry per ad):

- Video ads: grabs the frame at 1.0s (or 10% of the duration, whichever is earlier), saves `cd/<id>/poster.jpg` (720px wide) and
  `cd/<id>/thumb.jpg` (480px wide), JPEG 0.82, and sets `poster_frame = true`. These replace Motion's thumbnails, which have a play
  button baked in. Uploads the video as is to `cd/<id>/video.mp4` when it is under 25 MB and the bucket total is under 9 GB.
- Image and carousel ads: each image at 1080px max (JPEG 0.85) as `cd/<id>/img<n>.jpg`, plus a 480px `cd/<id>/thumb.jpg`.
- Brand logo once per brand: `cd/logos/<brand_id>.jpg` (192px).
- Writes the public URLs to `thumb_r2`, `images_r2` (an array of image URLs, or `{poster}` for videos), `video_r2`, `logo_r2`,
  plus `r2_bytes` and `r2_at`.
- Ads whose media is gone on both Motion and Supabase (404) are skipped and listed in `window.__r2.gone`; `r2_at` stays null.

Uploads go through the Supabase edge function `cd-r2-sign` (presigned PUT URLs, valid 10 minutes, keys must start with `cd/`,
types `image/jpeg`, `image/png`, `image/webp`, `video/mp4`). No Cloudflare credentials live in the browser.
Public base: `https://pub-26f4afc574474ba5a4df4463a8948adb.r2.dev`. Bucket budget is 10 GB; videos stop at 9 GB (sum of `r2_bytes`),
images and posters carry on.

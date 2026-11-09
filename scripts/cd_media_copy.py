#!/usr/bin/env python3
"""Creative Discovery: copy English ad media from Motion's Azure blobs into Cloudflare R2.

Runs in GitHub Actions (.github/workflows/cd-media-copy.yml). Resumable: rows with r2_at set are skipped,
so re-dispatching the workflow picks up where the last run stopped.

Key layout (matches rows already copied by the browser task):
  cd/<id>/thumb.jpg          480px wide JPEG
  cd/<id>/poster.jpg         720px wide JPEG, video ads only   -> images_r2 = {"poster": url}
  cd/<id>/video.mp4          video ads                          -> video_r2
  cd/<id>/img1.jpg, img2...  image and carousel ads             -> images_r2 = [url, ...]
  cd/logos/<brand_id>.jpg    shared per brand                   -> logo_r2
poster_frame (boolean): true when the poster came from a video frame (ffmpeg), false otherwise.
Expired source media (403/404 on everything): r2_at = now(), r2 urls null, images_r2 = {"missing": true}.

Env: SUPABASE_URL, SUPABASE_ANON_KEY, MAX_ADS (0 = all), WORKERS (8), ONLY_BATCH (optional int).
"""
import io
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import requests
from PIL import Image, ImageStat

SB = os.environ.get("SUPABASE_URL", "https://cymkcvdsxoneojfisjgk.supabase.co").rstrip("/")
KEY = os.environ["SUPABASE_ANON_KEY"]
MAX_ADS = int(os.environ.get("MAX_ADS") or 0)
WORKERS = max(1, int(os.environ.get("WORKERS") or 8))
ONLY_BATCH = (os.environ.get("ONLY_BATCH") or "").strip()
CAP_BYTES = 9 * 1024 ** 3
SIGN_URL = f"{SB}/functions/v1/cd-r2-sign"
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
TASK = "cd-media-copy-gha"
OK_IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

http = requests.Session()
http.headers["User-Agent"] = "jd-creative-discovery-media-copy/1.0"
adapter = requests.adapters.HTTPAdapter(pool_connections=32, pool_maxsize=32)
http.mount("https://", adapter)

lock = threading.Lock()
stats = {"done": 0, "skipped": 0, "missing": 0, "failed": 0, "bytes": 0, "video_bytes": 0, "throttled": 0,
         "videos_capped": 0}
start_total = 0
logo_cache = {}  # brand_id -> public url


def log(*a):
    print(datetime.now(timezone.utc).strftime("%H:%M:%S"), *a, flush=True)


class Missing(Exception):
    """Source returned 403/404 (expired link)."""


# ---------- adaptive concurrency + global backoff ----------
class Limiter:
    def __init__(self, n):
        self.limit = n
        self.active = 0
        self.cv = threading.Condition()
        self.pause_until = 0.0
        self.strikes = 0

    def acquire(self):
        with self.cv:
            while self.active >= self.limit or time.time() < self.pause_until:
                self.cv.wait(timeout=1)
            self.active += 1

    def release(self):
        with self.cv:
            self.active -= 1
            self.cv.notify_all()

    def throttle(self):
        with self.cv:
            now = time.time()
            if now < self.pause_until:
                return  # already backing off
            self.strikes += 1
            wait = 30 if self.strikes == 1 else 60
            self.pause_until = now + wait
            old = self.limit
            self.limit = max(2, self.limit // 2)
            log(f"THROTTLED by source: pausing {wait}s, workers {old} -> {self.limit}")
        with lock:
            stats["throttled"] += 1


limiter = Limiter(WORKERS)


def fetch(url, timeout=60):
    """GET with 3 retries + exponential backoff. Raises Missing on 403/404."""
    last = None
    for attempt in range(4):
        try:
            r = http.get(url, timeout=timeout)
            if r.status_code in (403, 404, 410):
                raise Missing(f"{r.status_code} {url[:90]}")
            if r.status_code in (429, 503):
                limiter.throttle()
                time.sleep(30 if attempt == 0 else 60)
                last = Exception(f"HTTP {r.status_code}")
                continue
            r.raise_for_status()
            return r.content, (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        except Missing:
            raise
        except Exception as e:  # network error, 5xx
            last = e
            time.sleep(2 ** attempt * 2)
    raise last


# ---------- Supabase ----------
def rest(method, path, **kw):
    h = dict(HDR)
    h.update(kw.pop("headers", {}))
    for attempt in range(4):
        try:
            r = http.request(method, f"{SB}/rest/v1/{path}", headers=h, timeout=60, **kw)
            if r.status_code >= 500 or r.status_code == 429:
                raise Exception(f"{r.status_code} {r.text[:200]}")
            return r
        except Exception as e:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt * 2)


def sign(items):
    for attempt in range(4):
        try:
            r = http.post(SIGN_URL, headers={**HDR, "Content-Type": "application/json"},
                          data=json.dumps({"keys": items}), timeout=60)
            r.raise_for_status()
            return {it["key"]: it for it in r.json()["items"]}
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt * 2)


def put(signed, data, ctype):
    for attempt in range(4):
        try:
            r = http.put(signed["url"], data=data, headers={"Content-Type": ctype}, timeout=300)
            r.raise_for_status()
            return signed["public"]
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt * 2)


def load_rows():
    rows, last = [], ""
    flt = "is_english=eq.true&r2_at=is.null"
    if ONLY_BATCH:
        flt += f"&batch=eq.{int(ONLY_BATCH)}"
    while True:
        q = f"in_ads?select=id,video,poster,images,logo,brand_id,batch,start_date&{flt}&order=id.asc&limit=200"
        if last:
            q += f"&id=gt.{last}"
        r = rest("GET", q)
        r.raise_for_status()
        page = r.json()
        if not page:
            break
        rows += page
        last = page[-1]["id"]
        if len(page) < 200:
            break
    # batch 1 first, then newest start_date first
    rows.sort(key=lambda x: x.get("start_date") or "", reverse=True)
    rows.sort(key=lambda x: 0 if x.get("batch") == 1 else 1)
    return rows


def load_done_state():
    global start_total
    total, last = 0, ""
    while True:
        q = "in_ads?select=id,brand_id,logo_r2,r2_bytes&r2_at=not.is.null&order=id.asc&limit=1000"
        if last:
            q += f"&id=gt.{last}"
        r = rest("GET", q)
        r.raise_for_status()
        page = r.json()
        if not page:
            break
        for x in page:
            total += x.get("r2_bytes") or 0
            if x.get("brand_id") and x.get("logo_r2"):
                logo_cache[x["brand_id"]] = x["logo_r2"]
        last = page[-1]["id"]
        if len(page) < 1000:
            break
    start_total = total


def still_todo(ad_id):
    r = rest("GET", f"in_ads?select=r2_at&id=eq.{ad_id}")
    r.raise_for_status()
    j = r.json()
    return bool(j) and j[0]["r2_at"] is None


def patch(ad_id, body):
    r = rest("PATCH", f"in_ads?id=eq.{ad_id}&r2_at=is.null", json=body, headers={"Prefer": "return=minimal"})
    if r.status_code >= 300:
        raise Exception(f"patch {r.status_code} {r.text[:200]}")


def log_run(status, message):
    try:
        r = rest("POST", "cb_runs", json={"task": TASK, "step": "copy", "status": status, "message": message},
                 headers={"Prefer": "return=minimal"})
        if r.status_code >= 300:
            log(f"(cb_runs insert not allowed: {r.status_code}) {status}: {message}")
    except Exception as e:
        log(f"(cb_runs insert failed: {e}) {status}: {message}")


# ---------- media helpers ----------
def jpeg(img, width, q=85):
    img = img.convert("RGB")
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    b = io.BytesIO()
    img.save(b, "JPEG", quality=q, optimize=True, progressive=True)
    return b.getvalue()


def norm_image(data, ctype):
    """Return (bytes, ctype, ext) in an R2-allowed type, converting anything else to JPEG."""
    img = Image.open(io.BytesIO(data))
    fmt = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}.get(img.format)
    if fmt:
        return data, fmt, OK_IMG[fmt], img
    return jpeg(img, 1080, 90), "image/jpeg", "jpg", img


def frame_at(path, ss):
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        out = f.name
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(ss), "-i", path, "-frames:v", "1", out],
                       check=True, timeout=120, capture_output=True)
        if os.path.getsize(out) == 0:
            return None
        img = Image.open(out)
        img.load()
        return img
    except Exception:
        return None
    finally:
        try:
            os.unlink(out)
        except OSError:
            pass


def luma(img):
    return ImageStat.Stat(img.convert("L")).mean[0]


# ---------- per ad ----------
def process(ad):
    ad_id = ad["id"]
    base = f"cd/{ad_id}"
    uploads = []  # (key, bytes, ctype)
    body = {"thumb_r2": None, "images_r2": None, "video_r2": None, "logo_r2": None, "poster_frame": False}
    missing, got_any = 0, False
    video_bytes = 0
    capped = False

    video = ad.get("video")
    images = [u for u in (ad.get("images") or []) if u][:45]
    poster = ad.get("poster")

    if video:
        vdata = None
        try:
            vdata, _ = fetch(video, timeout=120)
        except Missing:
            missing += 1
        if vdata:
            got_any = True
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
                f.write(vdata)
                vpath = f.name
            try:
                img = None
                for ss in (1, 0.3):
                    fr = frame_at(vpath, ss)
                    if fr is not None and luma(fr) >= 16:
                        img = fr
                        break
            finally:
                os.unlink(vpath)
            if img is not None:
                body["poster_frame"] = True
            elif poster:
                try:
                    pdata, pct = fetch(poster)
                    img = Image.open(io.BytesIO(pdata))
                    img.load()
                except Missing:
                    missing += 1
            if img is not None:
                uploads.append((f"{base}/poster.jpg", jpeg(img, 720), "image/jpeg"))
                uploads.append((f"{base}/thumb.jpg", jpeg(img, 480), "image/jpeg"))
            with lock:
                over = start_total + stats["bytes"] + len(vdata) > CAP_BYTES
            if over:
                capped = True
            else:
                uploads.append((f"{base}/video.mp4", vdata, "video/mp4"))
                video_bytes = len(vdata)
        elif poster:
            # video expired but Motion poster still there: keep a still
            try:
                pdata, _ = fetch(poster)
                img = Image.open(io.BytesIO(pdata))
                img.load()
                got_any = True
                uploads.append((f"{base}/poster.jpg", jpeg(img, 720), "image/jpeg"))
                uploads.append((f"{base}/thumb.jpg", jpeg(img, 480), "image/jpeg"))
            except Missing:
                missing += 1
    else:
        srcs = images or ([poster] if poster else [])
        first = None
        for i, u in enumerate(srcs, 1):
            try:
                data, ct = fetch(u)
            except Missing:
                missing += 1
                continue
            got_any = True
            data, ct, ext, img = norm_image(data, ct)
            uploads.append((f"{base}/img{i}.{ext}", data, ct))
            if first is None:
                img.load()
                first = img
        if first is not None:
            uploads.append((f"{base}/thumb.jpg", jpeg(first, 480), "image/jpeg"))

    # logo (shared per brand)
    logo_key = None
    bid = ad.get("brand_id")
    if ad.get("logo"):
        with lock:
            cached = logo_cache.get(bid) if bid else None
        if cached:
            body["logo_r2"] = cached
        else:
            try:
                ldata, lct = fetch(ad["logo"])
                ldata, lct, lext, _ = norm_image(ldata, lct)
                logo_key = f"cd/logos/{bid}.{lext}" if bid else f"{base}/logo.{lext}"
                uploads.append((logo_key, ldata, lct))
            except Missing:
                pass
            except Exception as e:
                log(f"{ad_id} logo skipped: {e}")

    if not got_any:
        if missing:
            if still_todo(ad_id):
                patch(ad_id, {**body, "logo_r2": body["logo_r2"], "images_r2": {"missing": True}, "r2_bytes": 0,
                              "r2_at": datetime.now(timezone.utc).isoformat()})
            return "missing", 0
        raise Exception("no source media on row")

    if not still_todo(ad_id):
        return "skipped", 0

    signed = sign([{"key": k, "contentType": ct} for k, _, ct in uploads])
    urls, total = {}, 0
    for k, data, ct in uploads:
        urls[k] = put(signed[k], data, ct)
        total += len(data)

    body["thumb_r2"] = urls.get(f"{base}/thumb.jpg")
    if video:
        if f"{base}/poster.jpg" in urls:
            body["images_r2"] = {"poster": urls[f"{base}/poster.jpg"]}
        body["video_r2"] = urls.get(f"{base}/video.mp4")
        if capped:
            body["images_r2"] = {**(body["images_r2"] or {}), "video_skipped_cap": True}
    else:
        body["images_r2"] = [urls[k] for k, _, _ in uploads if k.startswith(f"{base}/img")]
    if logo_key:
        body["logo_r2"] = urls[logo_key]
        if bid:
            with lock:
                logo_cache[bid] = urls[logo_key]
    body["r2_bytes"] = total
    body["r2_at"] = datetime.now(timezone.utc).isoformat()
    patch(ad_id, body)
    with lock:
        stats["video_bytes"] += video_bytes
        if capped:
            stats["videos_capped"] += 1
    return "done", total


def worker(ad):
    limiter.acquire()
    try:
        return ad["id"], *process(ad)
    except Exception as e:
        return ad["id"], "failed", str(e)[:200]
    finally:
        limiter.release()


def summary():
    s = stats
    return (f"done {s['done']}, skipped {s['skipped']}, missing {s['missing']}, failed {s['failed']}, "
            f"{s['bytes'] / 1e6:.1f} MB uploaded ({s['video_bytes'] / 1e6:.1f} MB video), "
            f"throttle events {s['throttled']}, videos skipped for cap {s['videos_capped']}")


def main():
    t0 = time.time()
    load_done_state()
    rows = load_rows()
    if MAX_ADS:
        rows = rows[:MAX_ADS]
    log(f"start: {len(rows)} ads to copy, workers {WORKERS}, R2 total so far {start_total / 1e9:.2f} GB, "
        f"{len(logo_cache)} brand logos cached")
    n = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = [ex.submit(worker, ad) for ad in rows]
        for f in as_completed(futs):
            ad_id, status, extra = f.result()
            n += 1
            with lock:
                stats[status] += 1
                if status == "done":
                    stats["bytes"] += extra
            if status == "failed":
                log(f"FAIL {ad_id}: {extra}")
            if n % 50 == 0:
                rate = n / max(1, (time.time() - t0) / 60)
                log(f"{n}/{len(rows)} ({rate:.1f} ads/min) {summary()}")
            if n % 500 == 0:
                log_run("progress", f"{n}/{len(rows)} processed: {summary()}")
    mins = (time.time() - t0) / 60
    msg = f"finished {n}/{len(rows)} in {mins:.1f} min ({n / max(mins, 0.01):.1f} ads/min): {summary()}"
    log(msg)
    log_run("progress", msg)
    if stats["done"] == 0 and stats["failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()

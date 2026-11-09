#!/usr/bin/env python3
"""Creative Discovery: hook sheets for reading ON-SCREEN text (hook_text / onscreen_text).

Unlike cd_contact_sheets.py, these sheets show NO headline or copy (to avoid bias) and use
large frames (540px wide) so text written on the creative can be read.

SET=pilot  -> ids from tools/cd-hooks/pilot.json (list of ids)
SET=all    -> every JD ad (brand ilike JD*), English first, then id
SET=priority -> English video ads of PRIORITY brands (sheets, read by Claude)
SET=ocr    -> English video ads of all other non-JD brands; no sheets, RapidOCR on the same
              frames, writes out/ocr_p<PART>of<PARTS>.json (hook_text, onscreen_text, hook_kind)
Optional ONLY_UNREAD=1 skips rows with hook_read_at set.

Videos: frames at 0.0, 0.5, 1.0, 1.5, 2.0, 3.0s (hook window) + 25%, 50%, 75% of duration,
        one ad per sheet, 5 frames per row. Poster used if the video fails.
Images / carousels: up to 3 cards at 540px wide, side by side, two ads per sheet.
Identical media files (same sha1) are shown once; the index lists every ad id sharing it.
Captions: ad id and timestamp only.

Output: out/<set>_NNNN.jpg, out/<set>_index.json
  index = {"sheets": {name: [{"rep": id, "ids": [...], "format": f, "frames": [labels]}]},
           "failed": {id: reason}}
Env: SUPABASE_URL, SUPABASE_ANON_KEY, SET, ONLY_UNREAD
"""
import concurrent.futures as cf
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import time

import requests
from PIL import Image, ImageDraw, ImageFont

SB = os.environ.get("SUPABASE_URL", "https://cymkcvdsxoneojfisjgk.supabase.co").rstrip("/")
KEY = os.environ["SUPABASE_ANON_KEY"]
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
SET = os.environ.get("SET", "pilot")
ONLY_UNREAD = os.environ.get("ONLY_UNREAD") == "1"
OUT = "out"
FW = 540            # frame width
MAX_FH = 960        # cap frame height
COLS_V = 5
CAP_H = 40
COLS = "id,brand,format,video,poster,images,thumb_r2,images_r2,video_r2,is_english"
DEBUG = SET == "debug"
PRIORITY = [b.strip() for b in os.environ.get(
    "PRIORITY", "Foot Locker,Foot Locker Canada,Nike,adidas,New Balance,Jordan").split(",") if b.strip()]
PART = int(os.environ.get("PART") or 1)
PARTS = int(os.environ.get("PARTS") or 1)
HOOK_TS = [0.0, 0.5, 1.0, 1.5, 2.0, 3.0]
OCR_CONF = float(os.environ.get("OCR_CONF") or 0.8)
OCR_MIN_H = float(os.environ.get("OCR_MIN_H") or 0.018)  # box height as share of frame height


def get(url, **kw):
    last = None
    for i in range(3):
        try:
            r = requests.get(url, timeout=90, **kw)
            if r.status_code == 200:
                return r
            last = f"HTTP {r.status_code}"
            if r.status_code in (403, 404):
                break
        except Exception as e:  # noqa
            last = str(e)
        time.sleep(2 ** i * 2)
    raise RuntimeError(last)


def fetch(params):
    out, off = [], 0
    while True:
        r = get(f"{SB}/rest/v1/in_ads", headers=HDR,
                params={"select": COLS, "limit": 1000, "offset": off, **params})
        b = r.json()
        out += b
        if len(b) < 1000:
            break
        off += 1000
    return out


def load_rows():
    if SET in ("pilot", "debug"):
        ids = json.load(open(f"tools/cd-hooks/{SET}.json"))
        rows = fetch({"id": "in.(" + ",".join(ids) + ")"})
        m = {r["id"]: r for r in rows}
        return [m[i] for i in ids if i in m]
    if SET in ("priority", "ocr"):
        pri = "(" + ",".join(f'"{b}"' for b in PRIORITY) + ")"
        p = {"brand": ("in." if SET == "priority" else "not.in.") + pri, "is_english": "is.true",
             "format": "eq.video", "order": "brand.asc,id.asc"}
        if SET == "ocr":
            p["and"] = "(brand.not.ilike.JD*)"
        if ONLY_UNREAD:
            p["hook_read_at"] = "is.null"
        rows = fetch(p)
        if PARTS > 1:
            rows = rows[PART - 1::PARTS]
        return rows
    p = {"brand": "ilike.JD*", "order": "is_english.desc.nullslast,id.asc"}
    if ONLY_UNREAD:
        p["hook_read_at"] = "is.null"
    return fetch(p)


def font(sz):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


F = None


def fit(im):
    im = im.convert("RGB")
    w, h = im.size
    nh = max(1, int(h * FW / w))
    im = im.resize((FW, nh), Image.LANCZOS)
    if nh > MAX_FH:
        im = im.crop((0, 0, FW, MAX_FH))
    return im


def video_frames(url):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "v.mp4")
        data = get(url).content
        sha = hashlib.sha1(data).hexdigest()
        open(p, "wb").write(data)
        try:
            dur = float(subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                capture_output=True, text=True, timeout=60).stdout.strip() or 0)
        except Exception:
            dur = 0
        if DEBUG:
            print(url, len(data), subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", p],
                                                  capture_output=True, text=True).stdout, flush=True)
        hook = [i / 4 for i in range(17)] if DEBUG else HOOK_TS
        ts = [t for t in hook if dur == 0 or t < dur - 0.05]
        if dur > 0:
            ts += [round(dur * q, 1) for q in (0.25, 0.5, 0.75)]
        frames = []
        for k, t in enumerate(ts):
            o = os.path.join(d, f"f{k}.jpg")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, "-ss", f"{t:.2f}", "-frames:v", "1",
                            "-q:v", "2", o], timeout=180)
            if os.path.exists(o):
                frames.append((f"{t:.1f}s", fit(Image.open(o))))
        return frames, sha, dur


def poster_of(row):
    ir2 = row.get("images_r2")
    return (ir2.get("poster") if isinstance(ir2, dict) else None) or row.get("thumb_r2") or row.get("poster")


def image_urls(row):
    ir2 = row.get("images_r2")
    if isinstance(ir2, list) and ir2:
        return ir2[:3]
    if row.get("images"):
        return list(row["images"])[:3]
    if row.get("thumb_r2"):
        return [row["thumb_r2"]]
    return []


def build_debug(row):
    out = []
    for key in ("video_r2", "video"):
        if row.get(key):
            try:
                fr, sha, dur = video_frames(row[key])
                out.append({"kind": "video", "frames": [(f"{key} {l}", im) for l, im in fr], "sha": key + sha})
            except Exception as e:
                print(row["id"], key, "failed", e, flush=True)
    for key in ("poster", "thumb_r2"):
        u = row.get(key) if key != "poster" else poster_of(row)
        if u:
            try:
                data = get(u).content
                out.append({"kind": "poster", "frames": [(key, fit(Image.open(io.BytesIO(data))))], "sha": key + u})
            except Exception as e:
                print(row["id"], key, "failed", e, flush=True)
    return out


def build(row):
    fmt = row.get("format") or "image"
    try:
        if fmt == "video":
            url = row.get("video_r2") or row.get("video")
            if url:
                try:
                    frames, sha, dur = video_frames(url)
                    if frames:
                        return {"kind": "video", "frames": frames, "sha": sha}
                except Exception as e:
                    print(f"{row['id']} video failed: {e}", flush=True)
            p = poster_of(row)
            if p:
                data = get(p).content
                return {"kind": "poster", "frames": [("poster", fit(Image.open(io.BytesIO(data))))],
                        "sha": "p" + hashlib.sha1(data).hexdigest()}
            return {"error": "no media"}
        frames, h = [], hashlib.sha1()
        for k, u in enumerate(image_urls(row)):
            try:
                data = get(u).content
                h.update(data)
                frames.append((f"card {k + 1}" if fmt == "carousel" else "image", fit(Image.open(io.BytesIO(data)))))
            except Exception as e:
                print(f"{row['id']} image failed: {e}", flush=True)
        if not frames:
            return {"error": "images failed"}
        return {"kind": "image", "frames": frames, "sha": "i" + h.hexdigest()}
    except Exception as e:
        return {"error": str(e)[:200]}


def block(ad_id, frames, cols):
    f = font(26)
    rows = [frames[i:i + cols] for i in range(0, len(frames), cols)]
    rh = [max(fr.size[1] for _, fr in r) + CAP_H for r in rows]
    W = cols * FW + (cols + 1) * 8
    b = Image.new("RGB", (W, sum(rh) + 8 * (len(rows) + 1)), (20, 20, 20))
    d = ImageDraw.Draw(b)
    y = 8
    for r, h in zip(rows, rh):
        x = 8
        for lab, fr in r:
            d.text((x + 4, y + 6), f"{ad_id}  {lab}", font=f, fill=(255, 230, 0))
            b.paste(fr, (x, y + CAP_H))
            x += FW + 8
        y += h + 8
    return b


def save(blocks, path):
    W = max(b.size[0] for b in blocks)
    H = sum(b.size[1] for b in blocks) + 12 * (len(blocks) - 1)
    s = Image.new("RGB", (W, H), (0, 0, 0))
    y = 0
    for b in blocks:
        s.paste(b, (0, y))
        y += b.size[1] + 12
    s.save(path, "JPEG", quality=80)


def ocr_texts(engine, im):
    """Return caption-like text lines in reading order (filters tiny or low-confidence boxes)."""
    import numpy as np
    res, _ = engine(np.array(im))
    H = im.size[1]
    lines = []
    for box, text, score in res or []:
        ys = [pt[1] for pt in box]
        xs = [pt[0] for pt in box]
        h = max(ys) - min(ys)
        if float(score) < OCR_CONF or h < H * OCR_MIN_H or len(text.strip()) < 2:
            continue
        lines.append((min(ys), min(xs), text.strip()))
    lines.sort(key=lambda t: (round(t[0] / (H * 0.03)), t[1]))
    return [t for _, _, t in lines]


def norm(t):
    return " ".join("".join(c for c in t.lower() if c.isalnum() or c.isspace()).split())


_TL = None


def _engine():
    import threading
    global _TL
    if _TL is None:
        _TL = threading.local()
    if not hasattr(_TL, "e"):
        from rapidocr_onnxruntime import RapidOCR
        _TL.e = RapidOCR()
    return _TL.e


def ocr_raw(engine, im):
    """Raw OCR lines: [text, score, height/H, top/H, left/W] (loose filter; final rules in cd_hook_ocr_post.py)."""
    import numpy as np
    res, _ = engine(np.array(im))
    W, H = im.size
    out = []
    for box, text, score in res or []:
        ys = [pt[1] for pt in box]
        xs = [pt[0] for pt in box]
        h = (max(ys) - min(ys)) / H
        if float(score) < 0.6 or h < 0.012 or not text.strip():
            continue
        out.append([text.strip(), round(float(score), 3), round(h, 4), round(min(ys) / H, 4), round(min(xs) / W, 4)])
    return out


def ocr_one(row):
    b = build(row)
    if "error" in b:
        return {"id": row["id"], "error": b["error"]}
    engine = _engine()
    frames = [{"t": lab, "lines": ocr_raw(engine, im)} for lab, im in b["frames"]]
    return {"id": row["id"], "brand": row.get("brand"), "sha": b["sha"], "frames": frames}


def ocr_run(rows):
    out, failed = [], {}
    with cf.ThreadPoolExecutor(4) as ex:
        for i, r in enumerate(ex.map(ocr_one, rows), 1):
            if "error" in r:
                failed[r["id"]] = r["error"]
            else:
                out.append(r)
            if i % 50 == 0:
                print(f"ocr {i}/{len(rows)}", flush=True)
    name = f"ocr_raw_p{PART}of{PARTS}.json"
    json.dump({"results": out, "failed": failed}, open(os.path.join(OUT, name), "w"), ensure_ascii=False, indent=0)
    print(f"ocr: {len(out)} results, {len(failed)} failed")


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = load_rows()
    print(f"{SET}: {len(rows)} ads", flush=True)
    if SET == "ocr":
        return ocr_run(rows)
    if DEBUG:
        built, rr = [], []
        for row in rows:
            for b in build_debug(row):
                built.append(b)
                rr.append(row)
        rows = rr
    else:
        with cf.ThreadPoolExecutor(8) as ex:
            built = list(ex.map(build, rows))

    groups, order, failed = {}, [], {}
    for row, b in zip(rows, built):
        if "error" in b:
            failed[row["id"]] = b["error"]
            continue
        g = groups.get(b["sha"])
        if g:
            g["ids"].append(row["id"])
        else:
            groups[b["sha"]] = {"rep": row["id"], "ids": [row["id"]], "format": row.get("format"),
                                "kind": b["kind"], "frames": b["frames"]}
            order.append(b["sha"])
    vids = [groups[s] for s in order if groups[s]["kind"] != "image"]
    imgs = [groups[s] for s in order if groups[s]["kind"] == "image"]
    units = [[g] for g in vids] + [imgs[i:i + 2] for i in range(0, len(imgs), 2)]
    index = {"set": SET, "sheets": {}, "failed": failed}
    for n, unit in enumerate(units, 1):
        name = f"{SET}_{n:04d}.jpg"
        blocks = [block(g["rep"], g["frames"], COLS_V if g["kind"] != "image" else 3) for g in unit]
        save(blocks, os.path.join(OUT, name))
        index["sheets"][name] = [{"rep": g["rep"], "ids": g["ids"], "format": g["format"], "kind": g["kind"],
                                  "frames": [lab for lab, _ in g["frames"]]} for g in unit]
    json.dump(index, open(os.path.join(OUT, f"{SET}_index.json"), "w"), indent=1)
    print(f"sheets={len(units)} unique={len(order)} ads={len(rows)} failed={len(failed)}")


if __name__ == "__main__":
    sys.exit(main())

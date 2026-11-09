#!/usr/bin/env python3
"""Creative Discovery: build labelled contact sheets for visual-format tagging.

Reads tools/cd-tagging/<set>.json. Each entry needs an "id" (optional "label" for examples).
Media urls and text are resolved from Supabase in_ads (anon key, read only):
  video ads: video_r2 or video (Motion), plus poster (images_r2.poster / thumb_r2 / poster)
  image/carousel: up to 3 of images_r2, else images (Motion), else thumb_r2
If <set>.json is an object with "query": "gaps", the live JD gap rows are used
(brand ilike JD*, visual_formats null or empty), English first, then id.

For videos: ffmpeg grabs 3 frames (0.5s, middle, near end) at 360px wide (poster as fallback).
Sheets: 4 ads per sheet, one row per ad, caption = id, format, text (+ label for examples).
Output: out/<set>_001.jpg ..., out/<set>_index.json, out/<set>_resolved.json

Env: SUPABASE_URL, SUPABASE_ANON_KEY, SET, PART (1-based, optional), PART_SIZE (default 300)
"""
import concurrent.futures as cf
import io
import json
import os
import subprocess
import sys
import tempfile
import textwrap
import time

import requests
from PIL import Image, ImageDraw, ImageFont

SB = os.environ.get("SUPABASE_URL", "https://cymkcvdsxoneojfisjgk.supabase.co").rstrip("/")
KEY = os.environ["SUPABASE_ANON_KEY"]
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
SET = os.environ.get("SET", "blind")
PART = int(os.environ.get("PART") or 0)
PART_SIZE = int(os.environ.get("PART_SIZE") or 300)
OUT = "out"
FRAME_W = 360
ROW_H = 400  # max frame height per row
PER_SHEET = 4
COLS = ("id,brand,format,headline,copy,video,poster,images,thumb_r2,images_r2,video_r2,"
        "is_english,visual_formats")


def get(url, **kw):
    last = None
    for i in range(3):
        try:
            r = requests.get(url, timeout=60, **kw)
            if r.status_code == 200:
                return r
            last = f"HTTP {r.status_code}"
            if r.status_code in (403, 404):
                break
        except Exception as e:  # noqa
            last = str(e)
        time.sleep(2 ** i * 2)
    raise RuntimeError(last)


def fetch_rows(ids):
    rows = {}
    for i in range(0, len(ids), 80):
        chunk = ids[i:i + 80]
        r = get(f"{SB}/rest/v1/in_ads", headers=HDR,
                params={"select": COLS, "id": "in.(" + ",".join(chunk) + ")"})
        for row in r.json():
            rows[row["id"]] = row
    return rows


def fetch_gaps():
    out, off = [], 0
    while True:
        r = get(f"{SB}/rest/v1/in_ads", headers={**HDR, "Range-Unit": "items"},
                params={"select": COLS, "brand": "ilike.JD*",
                        "or": "(visual_formats.is.null,visual_formats.eq.{})",
                        "order": "is_english.desc.nullslast,id.asc",
                        "limit": 1000, "offset": off})
        b = r.json()
        out += b
        if len(b) < 1000:
            break
        off += 1000
    return out


def media(row):
    fmt = row.get("format") or "image"
    ir2 = row.get("images_r2")
    if fmt == "video":
        poster = (ir2.get("poster") if isinstance(ir2, dict) else None) or row.get("thumb_r2") or row.get("poster")
        return {"video": row.get("video_r2") or row.get("video"), "poster": poster}
    imgs = []
    if isinstance(ir2, list) and ir2:
        imgs = ir2[:3]
    elif row.get("images"):
        imgs = list(row["images"])[:3]
    elif row.get("thumb_r2"):
        imgs = [row["thumb_r2"]]
    return {"images": imgs}


def text_of(row):
    t = f"{row.get('headline') or ''} | {row.get('copy') or ''}"
    return " ".join(t.split())[:120]


def to_img(data):
    im = Image.open(io.BytesIO(data))
    im = im.convert("RGB")
    return fit(im)


def fit(im):
    w, h = im.size
    nh = int(h * FRAME_W / w)
    im = im.resize((FRAME_W, max(1, nh)))
    if im.size[1] > ROW_H:
        im = im.resize((int(FRAME_W * ROW_H / im.size[1]), ROW_H))
    return im


def video_frames(url):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "v.mp4")
        with open(p, "wb") as f:
            f.write(get(url).content)
        try:
            dur = float(subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                capture_output=True, text=True, timeout=60).stdout.strip() or 0)
        except Exception:
            dur = 0
        ts = [0.5, max(dur / 2, 0.6), max(dur - 0.7, 0.7)] if dur > 2 else [0.2, max(dur / 2, 0.3), max(dur - 0.2, 0.4)]
        frames = []
        for k, t in enumerate(ts):
            o = os.path.join(d, f"f{k}.jpg")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", p, "-frames:v", "1",
                            "-vf", f"scale={FRAME_W}:-2", o], timeout=120)
            if os.path.exists(o):
                frames.append(fit(Image.open(o).convert("RGB")))
        return frames, dur


def build(entry):
    m = entry["media"]
    frames, note = [], ""
    try:
        if entry["format"] == "video":
            if m.get("video"):
                try:
                    frames, dur = video_frames(m["video"])
                    note = f"{dur:.0f}s"
                except Exception as e:
                    note = f"video failed ({e}); poster only"
            if not frames and m.get("poster"):
                frames = [to_img(get(m["poster"]).content)]
                note = note or "poster only"
        else:
            for u in m.get("images", [])[:3]:
                try:
                    frames.append(to_img(get(u).content))
                except Exception as e:
                    note = f"some images failed ({e})"
    except Exception as e:
        note = f"failed: {e}"
    return frames, note


FONT = None


def font(sz):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def sheet(rows, path):
    f_big, f_sm = font(22), font(18)
    W = FRAME_W * 3 + 40 + 420
    blocks = []
    for e, frames, note in rows:
        h = max([fr.size[1] for fr in frames] + [220]) + 20
        b = Image.new("RGB", (W, h), (24, 24, 24))
        x = 10
        for fr in frames:
            b.paste(fr, (x, 10))
            x += fr.size[0] + 10
        d = ImageDraw.Draw(b)
        tx = FRAME_W * 3 + 40
        y = 10
        lines = [(f"#{e['n']}  {e['id']}", f_big, (255, 230, 0)),
                 (f"{e['format']}  {note}", f_sm, (200, 200, 200))]
        if e.get("label"):
            lines.append((f"EXAMPLE OF: {e['label']}", f_big, (0, 255, 160)))
            if e.get("all_tags"):
                for ln in textwrap.wrap("Motion tags: " + ", ".join(e["all_tags"]), 34):
                    lines.append((ln, f_sm, (0, 220, 140)))
        for ln in textwrap.wrap(e.get("text") or "", 36)[:6]:
            lines.append((ln, f_sm, (240, 240, 240)))
        for t, fnt, col in lines:
            d.text((tx, y), t, font=fnt, fill=col)
            y += fnt.size + 6
        blocks.append(b)
    H = sum(b.size[1] for b in blocks) + 4 * (len(blocks) + 1)
    s = Image.new("RGB", (W, H), (0, 0, 0))
    y = 4
    for b in blocks:
        s.paste(b, (0, y))
        y += b.size[1] + 4
    if s.size[0] > 1600:
        s = s.resize((1600, int(s.size[1] * 1600 / s.size[0])))
    s.save(path, "JPEG", quality=80)


def main():
    os.makedirs(OUT, exist_ok=True)
    src = json.load(open(f"tools/cd-tagging/{SET}.json"))
    if isinstance(src, dict) and src.get("query") == "gaps":
        rows = fetch_gaps()
        entries = [{"id": r["id"]} for r in rows]
        rowmap = {r["id"]: r for r in rows}
    else:
        entries = src
        rowmap = fetch_rows(sorted({e["id"] for e in entries}))
    if PART:
        entries = entries[(PART - 1) * PART_SIZE: PART * PART_SIZE]
    tag = SET + (f"_p{PART}" if PART else "")
    resolved = []
    for n, e in enumerate(entries, 1):
        row = rowmap.get(e["id"])
        if not row:
            continue
        r = {"n": n, "id": e["id"], "format": row.get("format") or "image", "media": media(row), "text": text_of(row)}
        if e.get("label"):
            r["label"] = e["label"]
            r["all_tags"] = row.get("visual_formats") or []
        resolved.append(r)
    print(f"{tag}: {len(resolved)} ads", flush=True)
    with cf.ThreadPoolExecutor(8) as ex:
        built = list(ex.map(build, resolved))
    index = {"set": tag, "sheets": {}, "failed": [], "notes": {}}
    good = []
    for e, (frames, note) in zip(resolved, built):
        if not frames:
            index["failed"].append(e["id"])
            index["notes"][e["id"]] = note
        else:
            good.append((e, frames, note))
    for i in range(0, len(good), PER_SHEET):
        name = f"{tag}_{i // PER_SHEET + 1:03d}.jpg"
        chunk = good[i:i + PER_SHEET]
        sheet(chunk, os.path.join(OUT, name))
        index["sheets"][name] = [e["id"] for e, _, _ in chunk]
    for r in resolved:
        r.pop("all_tags", None)
    json.dump(index, open(os.path.join(OUT, f"{tag}_index.json"), "w"), indent=1)
    json.dump(resolved, open(os.path.join(OUT, f"{tag}_resolved.json"), "w"), indent=1)
    print(f"sheets={len(index['sheets'])} failed={len(index['failed'])}")


if __name__ == "__main__":
    sys.exit(main())

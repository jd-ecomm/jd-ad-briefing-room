#!/usr/bin/env python3
"""Creative Discovery: measure ad aspect ratios from R2 media and re-make video posters.

Runs in GitHub Actions (.github/workflows/cd-aspect.yml). Reads scripts/cd_aspect/jobs.json:
  {"aspect":  [{id, video, image, thumb, video_any, ...}],   -> ffprobe the video, else PIL on the first image
   "posters": [{id, video}]}                                 -> ffmpeg frame at 1s (0.3s if dark), 720px poster + 480px thumb
Posters upload through the cd-r2-sign edge function exactly like scripts/cd_media_copy.py (keys cd/<id>/poster.jpg, thumb.jpg).
Writes results.json (no database writes; the run reads the file and updates in_ads itself).
"""
import io
import json
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from math import gcd

import requests
from PIL import Image, ImageStat

SB = os.environ.get("SUPABASE_URL", "https://cymkcvdsxoneojfisjgk.supabase.co").rstrip("/")
KEY = os.environ["SUPABASE_ANON_KEY"]
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
SIGN_URL = f"{SB}/functions/v1/cd-r2-sign"
JOBS = os.environ.get("JOBS", "scripts/cd_aspect/jobs.json")
OUT = os.environ.get("OUT", "results.json")
http = requests.Session()
http.headers["User-Agent"] = "jd-creative-discovery-aspect/1.0"

COMMON = [(9, 16), (4, 5), (1, 1), (16, 9), (2, 3), (3, 4), (3, 2), (4, 3), (191, 100), (5, 4)]


def get(url, timeout=120):
    for a in range(3):
        try:
            r = http.get(url, timeout=timeout)
            r.raise_for_status()
            return r.content
        except Exception:
            if a == 2:
                raise


def ratio(w, h):
    """Snap to a common ratio within 2%, else reduce w:h."""
    r = w / h
    for a, b in COMMON:
        if abs(r / (a / b) - 1) <= 0.02:
            return "1.91:1" if (a, b) == (191, 100) else f"{a}:{b}"
    g = gcd(w, h)
    return f"{w // g}:{h // g}"


def probe_video(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height:stream_side_data=rotation:stream_tags=rotate", "-of", "json", path],
                         capture_output=True, text=True, timeout=120, check=True).stdout
    s = json.loads(out)["streams"][0]
    w, h = int(s["width"]), int(s["height"])
    rot = 0
    try:
        rot = int(float((s.get("tags") or {}).get("rotate", 0)))
    except ValueError:
        pass
    for sd in s.get("side_data_list") or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    if abs(rot) % 180 == 90:
        w, h = h, w
    return w, h


def to_tmp(data, suffix):
    f = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    f.write(data)
    f.close()
    return f.name


def aspect_job(j):
    res = {"id": j["id"]}
    try:
        if j.get("video"):
            p = to_tmp(get(j["video"]), ".mp4")
            try:
                w, h = probe_video(p)
            finally:
                os.unlink(p)
            res["src"] = "video"
        else:
            url = j.get("image") or j.get("thumb")
            img = Image.open(io.BytesIO(get(url)))
            w, h = img.size
            res["src"] = "image" if j.get("image") else "thumb"
        res.update(w=w, h=h, aspect=ratio(w, h))
    except Exception as e:
        res["error"] = str(e)[:200]
    return res


def frame_at(path, ss):
    out = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
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


def jpeg(img, width, q=85):
    img = img.convert("RGB")
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    b = io.BytesIO()
    img.save(b, "JPEG", quality=q, optimize=True, progressive=True)
    return b.getvalue()


def sign(items):
    r = http.post(SIGN_URL, headers={**HDR, "Content-Type": "application/json"}, data=json.dumps({"keys": items}), timeout=60)
    r.raise_for_status()
    return {it["key"]: it for it in r.json()["items"]}


def put(signed, data, ctype):
    for a in range(3):
        try:
            r = http.put(signed["url"], data=data, headers={"Content-Type": ctype}, timeout=300)
            r.raise_for_status()
            return signed["public"]
        except Exception:
            if a == 2:
                raise


def poster_job(j):
    res = {"id": j["id"]}
    try:
        p = to_tmp(get(j["video"]), ".mp4")
        try:
            img = None
            for ss in (1, 0.3, 0):
                fr = frame_at(p, ss)
                if fr is not None and ImageStat.Stat(fr.convert("L")).mean[0] >= 16:
                    img = fr
                    break
            if img is None:
                img = frame_at(p, 1) or frame_at(p, 0)
            try:
                res["w"], res["h"] = probe_video(p)
                res["aspect"] = ratio(res["w"], res["h"])
            except Exception:
                pass
        finally:
            os.unlink(p)
        if img is None:
            raise Exception("no frame")
        base = f"cd/{j['id']}"
        ups = [(f"{base}/poster.jpg", jpeg(img, 720)), (f"{base}/thumb.jpg", jpeg(img, 480))]
        signed = sign([{"key": k, "contentType": "image/jpeg"} for k, _ in ups])
        res["poster"] = put(signed[ups[0][0]], ups[0][1], "image/jpeg")
        res["thumb"] = put(signed[ups[1][0]], ups[1][1], "image/jpeg")
        res["bytes"] = len(ups[0][1]) + len(ups[1][1])
    except Exception as e:
        res["error"] = str(e)[:200]
    return res


def main():
    jobs = json.load(open(JOBS))
    with ThreadPoolExecutor(8) as ex:
        a = list(ex.map(aspect_job, jobs.get("aspect") or []))
        p = list(ex.map(poster_job, jobs.get("posters") or []))
    json.dump({"aspect": a, "posters": p}, open(OUT, "w"), indent=0)
    ea = sum(1 for x in a if "error" in x)
    ep = sum(1 for x in p if "error" in x)
    print(f"aspect {len(a)} ({ea} errors), posters {len(p)} ({ep} errors)")
    for x in a + p:
        if "error" in x:
            print("ERR", x)


if __name__ == "__main__":
    main()

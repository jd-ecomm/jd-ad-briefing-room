#!/usr/bin/env python3
"""Write OCR hook results (cd_hook_ocr_post.py output) to Supabase in_ads.

Only rows with hook_source null are touched, so Claude-read hooks are never overwritten.
Sets hook_text, onscreen_text, hook_kind, hook_source='ocr', hook_read_at=now.
Env: SUPABASE_URL, SUPABASE_ANON_KEY. Usage: cd_hook_ocr_apply.py results.json
"""
import concurrent.futures as cf
import datetime as dt
import json
import os
import sys
import time

import requests

SB = os.environ.get("SUPABASE_URL", "https://cymkcvdsxoneojfisjgk.supabase.co").rstrip("/")
KEY = os.environ["SUPABASE_ANON_KEY"]
HDR = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Prefer": "return=representation",
       "Content-Type": "application/json"}


def patch(r):
    body = {"hook_text": r["hook_text"], "onscreen_text": r["onscreen_text"], "hook_kind": r["hook_kind"],
            "hook_source": "ocr", "hook_read_at": dt.datetime.now(dt.timezone.utc).isoformat()}
    for i in range(4):
        try:
            x = requests.patch(f"{SB}/rest/v1/in_ads", headers=HDR, json=body, timeout=60,
                               params={"id": f"eq.{r['id']}", "hook_source": "is.null", "select": "id"})
            if x.status_code < 300:
                return len(x.json())
            err = f"{x.status_code} {x.text[:200]}"
        except Exception as e:  # noqa
            err = str(e)
        time.sleep(2 ** i)
    print("failed", r["id"], err, flush=True)
    return -1


def main():
    res = json.load(open(sys.argv[1]))["results"]
    with cf.ThreadPoolExecutor(8) as ex:
        out = list(ex.map(patch, res))
    print(f"results={len(res)} updated={sum(1 for o in out if o > 0)} skipped={out.count(0)} failed={out.count(-1)}")


if __name__ == "__main__":
    main()

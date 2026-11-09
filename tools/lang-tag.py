#!/usr/bin/env python3
"""Language tagging for in_ads (Creative Discovery).

Input : a JSON file of rows [{"id","copy","headline","cta","market"}, ...] ordered by id
        (exported from Supabase, e.g. via the Supabase MCP execute_sql or the REST API).
Output: a compact code string, 2 chars per row in the same order:
        char 1 = index into LANGS (base62), char 2 = confidence bucket round(conf*61) (base62),
        plus the LANGS table, so the result can be written back in one SQL statement
        (see tools/lang-tag.sql). Detector: langdetect (pip install langdetect), seed 0.

is_english rule (applied in SQL): lang = 'en' and lang_conf >= 0.8, or the copy is shorter than
4 words and the brand's market is English-speaking (UK, US, AU, CA, NZ, IE, ZA, IN, SG, Global).
"""
import json, re, sys, hashlib
from langdetect import DetectorFactory, detect_langs
from langdetect.lang_detect_exception import LangDetectException

DetectorFactory.seed = 0
B62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
CLEAN = [
    (re.compile(r"https?://\S+|www\.\S+"), " "),
    (re.compile(r"[@#][\w.]+"), " "),
    (re.compile(r"[^\w\s'’.,!?-]", re.U), " "),
    (re.compile(r"\d+"), " "),
    (re.compile(r"\s+"), " "),
]


def clean(t):
    t = t or ""
    for rx, rep in CLEAN:
        t = rx.sub(rep, t)
    return t.strip()


def detect(row):
    text = clean(" ".join(x for x in (row.get("copy"), row.get("headline")) if x))
    if len(re.findall(r"[^\W\d_]{2,}", text)) == 0:
        return "und", 0.0
    try:
        best = detect_langs(text)[0]
        return best.lang, float(best.prob)
    except LangDetectException:
        return "und", 0.0


def main(src):
    rows = json.load(open(src))
    langs, out = [], []
    for r in rows:
        lang, conf = detect(r)
        if lang not in langs:
            langs.append(lang)
        out.append(B62[langs.index(lang)] + B62[round(conf * 61)])
    ids = hashlib.md5(",".join(r["id"] for r in rows).encode()).hexdigest()
    print(json.dumps({"n": len(rows), "md5": ids, "langs": langs, "codes": "".join(out)}))


if __name__ == "__main__":
    main(sys.argv[1])

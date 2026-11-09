#!/usr/bin/env python3
"""Creative Discovery: turn raw OCR lines (cd_hook_sheets.py SET=ocr) into hook_text / onscreen_text.

Rules (machine tier, hook_source = 'ocr'):
  - keep lines with score >= MIN_SCORE and height >= MIN_H of frame height, and >= 3 letters/digits
  - drop brand wordmarks: lines whose words are all brand-name words (any brand in BRANDS, plus
    generic logo words), or that fuzzy-match a brand name
  - frame text = kept lines in reading order (top, then left); long run-together words split with wordninja
  - frames deduped with fuzzy matching (OCR jitter between frames)
  - hook_text = text in frames 0.0 to 3.0s; onscreen_text = all distinct text joined with " | "
  - hook_kind = 'text' if hook_text else 'visual'
Usage: cd_hook_ocr_post.py raw1.json [raw2.json ...] > results.json
"""
import json
import re
import sys

import wordninja
from rapidfuzz import fuzz

MIN_SCORE = 0.8
MIN_H = 0.016
BRANDS = """Abercrombie & Fitch|Adanola|adidas|Allbirds|ALO Wellness Club|Alo Yoga|Arc'teryx|Aritzia|ARKET|ASICS|ASOS|
Axel Arigato|Bandit Running|Birkenstock|Boden|Boody|Brooks Running|Browns Shoes|Buck Mason|Carhartt|Champs Sports|
Chubbies|Cole Buxton|Comfrt|Converse|COS|Crocs|Cuts|Daily Paper|DICK'S Sporting Goods|Dissh|Dore & Rose|Dr. Martens|
DTLR|END.|Fabindia|Fear of God|FIGS|Finish Line|Foot Locker|Footasylum|FP Movement|Frankies Bikinis|GANNI|Gymshark|
H&M|Halara|HAVEN|Heaven Mayhem|Hibbett|HIKE Footwear|HOKA|Hollow Alpaca Socks|JD Sports|Jenni Kayne|Jordan|Kill Crew|
Kotn|Levi's|Little Burgundy Shoes|Loro Piana|lululemon|Lulus|Lunya|Mars Men|Merrell|Meshki|MeUndies|Mott & Bow|
MR PORTER|New Balance|Nike|Nisolo|Nude Project|nuuly|On|Organic Basics|Outdoor Voices|Outerknown|Patta|Peter Millar|
PRINCESS POLLY|PUMA|Ralph Lauren|Reformation|Reiss|Rent The Runway|Represent Clo|Represent|Rhone|Salomon|Saucony|Sezane|
SHEIN|Shoe Palace|Showpo|size?|SKIMS|Sneakersnstuff|SOFTMOC SHOES|SPANX|Sport Chek|Sporting Life|SSENSE|Stance|
Suitsupply|tentree|The Frankie Shop|The North Face|The Oodie|The Perfect Jean|Thursday Boot Company|Todd Snyder|
Trapstar|Triangl|True Classic|UGG|Uniqlo|Urban Outfitters|Vans|Veronica Beard|Vessi|Vuori|ZARA|Arcteryx|Polo"""
BRAND_NAMES = [b.strip() for b in BRANDS.replace("\n", "").split("|") if b.strip()]
GENERIC = {"the", "and", "co", "inc", "ltd", "tm", "r", "est", "official", "x", "by"}


def toks(t):
    return re.findall(r"[a-z0-9]+", t.lower())


COMMON = {"running", "shoes", "shoe", "sports", "sport", "sporting", "goods", "club", "wellness", "life", "line",
          "footwear", "socks", "company", "boot", "perfect", "jean", "new", "balance", "fear", "god", "daily", "paper",
          "project", "nude", "basics", "organic", "outdoor", "voices", "movement", "shop", "true", "classic", "cuts",
          "end", "on", "haven", "heaven", "mayhem", "kill", "crew", "mars", "men", "palace", "rent", "runway", "represent",
          "little", "burgundy", "urban", "outfitters", "dore", "rose", "browns", "hike", "stance", "boden", "patta",
          "reformation", "champs", "finish", "locker", "foot", "axel", "beard", "veronica", "frankie", "oodie"}
BRAND_WORDS = ({w for b in BRAND_NAMES for w in toks(b) if len(w) > 1} - COMMON) | GENERIC
BRAND_SQUASH = [re.sub(r"[^a-z0-9]", "", b.lower()) for b in BRAND_NAMES]


BRAND_LONG = [w for w in BRAND_WORDS if len(w) >= 4]


def brandish(w):
    return w in BRAND_WORDS or (len(w) >= 4 and any(fuzz.ratio(w, b) >= 80 for b in BRAND_LONG))


def is_wordmark(text):
    ws = [w for w in toks(text) if w]
    if not ws:
        return True
    if all(brandish(w) for w in ws):
        return True
    sq = "".join(ws)
    return any(len(b) >= 3 and fuzz.ratio(sq, b) >= 85 for b in BRAND_SQUASH)


def split_runs(t):
    def sp(m):
        w = m.group(0)
        if brandish(w.lower()) or any(fuzz.ratio(w.lower(), b) >= 85 for b in BRAND_SQUASH):
            return w
        parts = wordninja.split(w.lower())
        if len(parts) < 2 or any(len(p) <= 2 and p not in SHORT_OK for p in parts):
            return w
        out, i = [], 0
        for p in parts:
            out.append(w[i:i + len(p)])
            i += len(p)
        return " ".join(out)
    return re.sub(r"[A-Za-z']{6,}", sp, t)


SHORT_OK = {"a", "i", "in", "on", "to", "of", "at", "is", "it", "my", "me", "we", "up", "so", "no", "go", "do",
            "be", "by", "or", "an", "us", "he", "if", "as", "am"}
_COST = wordninja.DEFAULT_LANGUAGE_MODEL._wordcost


def junk(text):
    """Single short token that is not a dictionary word (logo fragments like 'THEI')."""
    ws = toks(text)
    return len(ws) == 1 and len(ws[0]) <= 5 and not ws[0].isdigit() and ws[0] not in _COST


def frame_text(lines):
    keep = [ln for ln in lines
            if ln[1] >= MIN_SCORE and ln[2] >= MIN_H and len(re.sub(r"[^A-Za-z0-9]", "", ln[0])) >= 3
            and not is_wordmark(ln[0]) and not junk(ln[0])]
    keep.sort(key=lambda ln: (round(ln[3] / 0.03), ln[4]))
    parts = []
    for ln in keep:
        add(parts, split_runs(ln[0]))
    return " ".join(parts)


def tval(lab):
    try:
        return float(lab.rstrip("s"))
    except ValueError:
        return 99.0


def similar(a, b):
    na, nb = " ".join(toks(a)), " ".join(toks(b))
    short, long_ = sorted((na, nb), key=len)
    if len(short) >= 3 and fuzz.partial_ratio(short, long_) >= 88:
        return True
    return fuzz.token_set_ratio(na, nb) >= 85 or fuzz.ratio(na.replace(" ", ""), nb.replace(" ", "")) >= 85


def add(lst, txt):
    for i, prev in enumerate(lst):
        if similar(prev, txt):
            if len(" ".join(toks(txt))) > len(" ".join(toks(prev))):
                lst[i] = txt   # longer version of the same caption (text still animating in)
            return
    lst.append(txt)


def process(ad):
    hook, allt = [], []
    for fr in ad["frames"]:
        txt = frame_text(fr["lines"])
        if not txt:
            continue
        add(allt, txt)
        if tval(fr["t"]) <= 3.0:
            add(hook, txt)
    h = " ".join(hook) or None
    return {"id": ad["id"], "hook_text": h, "onscreen_text": " | ".join(allt) or None,
            "hook_kind": "text" if h else "visual"}


def main():
    out, failed = [], {}
    for p in sys.argv[1:]:
        d = json.load(open(p))
        out += [process(a) for a in d["results"]]
        failed.update(d.get("failed", {}))
    json.dump({"results": out, "failed": failed}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()

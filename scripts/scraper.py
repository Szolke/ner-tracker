#!/usr/bin/env python3
"""
NER Tracker RSS Scraper v2.0
Napi automatikus futtatás: GitHub Actions (8:00 UTC)
Források: Telex, HVG, 444, Direkt36
"""

import feedparser
import requests
import json
import re
import os
import hashlib
import logging
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger("ner-scraper")

# ── Szűrőkulcsszavak ─────────────────────────────────────────────────
PRIMARY = [
    'fidesz','mészáros','NER','közpénz','kormány','miniszter',
    'orbán','állami','közbeszerzés','pályázat','tender','alapítvány'
]
SECONDARY = [
    'korrupció','visszaélés','nyomozás','vizsgálat','gyanú','vád',
    'túlárazás','szabálytalan','átláthatatlan','OLAF','EPPO','ügyészség',
    'pénzmosás','sikkasztás','vesztegetés','közbeszerzési','anomália',
    'milliárd','milliós','EU-s forrás','visszaigénylés','bírság',
]
EXCLUDE_TERMS = ['sport eredmény','foci meccs','időjárás','horoszkóp','recept']

# ── RSS Feed definíciók ───────────────────────────────────────────────
FEEDS = [
    {"name": "Telex",    "url": "https://telex.hu/rss",                          "source": "Telex"},
    {"name": "HVG",      "url": "https://hvg.hu/rss",                            "source": "HVG"},
    {"name": "444",      "url": "https://444.hu/feed",                           "source": "444"},
    {"name": "Direkt36", "url": "https://direkt36.hu/feed/",                     "source": "Direkt36"},
    {"name": "MérceKor", "url": "https://merce.hu/tag/korrupcio/feed/",          "source": "Mérce"},
    {"name": "Átlátszó", "url": "https://atlatszo.hu/feed/",                     "source": "Átlátszó"},
]

# ── Régió koordináta térkép ───────────────────────────────────────────
REGION_COORDS = {
    "Budapest": [47.4979, 19.0402], "Pest": [47.5800, 19.1600],
    "Fejér": [47.1180, 18.4322], "Győr-Moson-Sopron": [47.6829, 17.6271],
    "Vas": [47.2308, 16.6225], "Veszprém": [47.0931, 17.9108],
    "Zala": [46.6678, 16.9897], "Somogy": [46.3568, 17.7761],
    "Baranya": [46.0727, 18.2323], "Tolna": [46.4677, 18.5595],
    "Bács-Kiskun": [46.5935, 19.3542], "Csongrád-Csanád": [46.2530, 20.1414],
    "Békés": [46.7568, 21.0920], "Hajdú-Bihar": [47.5316, 21.6273],
    "Szabolcs-Szatmár-Bereg": [47.9590, 22.0024], "Heves": [47.8930, 20.0773],
    "Jász-Nagykun-Szolnok": [47.1784, 20.1823], "Borsod-Abaúj-Zemplén": [48.1035, 20.7784],
    "Nógrád": [48.0139, 19.5148], "Komárom-Esztergom": [47.7416, 18.3878],
}

REGION_KEYWORDS = {
    "Budapest": ["budapest","fővárosi","fővár"],
    "Debrecen":  ["debrecen"],    "Miskolc": ["miskolc"],
    "Pécs":      ["pécs","baranya"], "Győr": ["győr"],
    "Szeged":    ["szeged","csongrád"], "Felcsút": ["felcsút"],
    "Balaton":   ["balaton","somogy","siófok","keszthely"],
}

REGION_MAP = {
    "Debrecen":"Hajdú-Bihar","Miskolc":"Borsod-Abaúj-Zemplén",
    "Pécs":"Baranya","Győr":"Győr-Moson-Sopron",
    "Szeged":"Csongrád-Csanád","Felcsút":"Fejér","Balaton":"Somogy",
}

def detect_region(text):
    tl = text.lower()
    for city, kws in REGION_KEYWORDS.items():
        if any(k in tl for k in kws):
            county = REGION_MAP.get(city, city)
            return county, REGION_COORDS.get(county, REGION_COORDS["Budapest"])
    return "Budapest", REGION_COORDS["Budapest"]

def detect_category(text):
    tl = text.lower()
    if any(k in tl for k in ['közbeszerzés','tender','pályázat','ajánlat']): return "közbeszerzés"
    if any(k in tl for k in ['korrupció','vesztegetés','sikkasztás','megvesztegetés']): return "korrupció"
    return "pénzügyi"

def detect_amount(text):
    patterns = [
        r'(\d+[,\.]?\d*)\s*milliárd', r'(\d+[,\.]?\d*)\s*mrd',
        r'(\d+[,\.]?\d*)\s*milliós', r'(\d+)\s*millió'
    ]
    for p in patterns:
        m = re.search(p, text.lower())
        if m:
            val = float(m.group(1).replace(',','.'))
            if 'milliárd' in p or 'mrd' in p: return int(val * 1e9)
            return int(val * 1e6)
    return 500_000_000  # default 500M HUF

def is_relevant(title, summary=''):
    text = (title + ' ' + summary).lower()
    if any(ex in text for ex in EXCLUDE_TERMS): return False
    has_primary   = any(k in text for k in PRIMARY)
    has_secondary = any(k in text for k in SECONDARY)
    return has_primary and has_secondary

def make_id(url):
    return 'sc_' + hashlib.md5(url.encode()).hexdigest()[:8]

def scrape_feed(feed_def):
    items = []
    try:
        log.info(f"Fetching {feed_def['name']} …")
        d = feedparser.parse(feed_def['url'])
        for entry in d.entries[:40]:
            title   = getattr(entry, 'title', '')
            summary = BeautifulSoup(getattr(entry, 'summary', ''), 'html.parser').get_text()
            link    = getattr(entry, 'link', '')
            if not is_relevant(title, summary): continue

            try:
                pub = dateparser.parse(str(entry.published)).strftime('%Y-%m-%d')
            except Exception:
                pub = datetime.now(timezone.utc).strftime('%Y-%m-%d')

            region, coords = detect_region(title + ' ' + summary)
            items.append({
                "id":               make_id(link),
                "title":            title.strip(),
                "description":      summary[:400].strip(),
                "link":             link,
                "date":             pub,
                "source":           feed_def['source'],
                "category":         detect_category(title + ' ' + summary),
                "status":           "active",
                "region":           region,
                "coordinates":      coords,
                "amount_huf":       detect_amount(title + ' ' + summary),
                "tags":             [],
                "involved_persons": [],
            })
        log.info(f"  {feed_def['name']}: {len(items)} releváns cikk")
    except Exception as e:
        log.error(f"  {feed_def['name']} hiba: {e}")
    return items

def load_existing():
    path = 'public/data/news.json'
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"cases":[], "investigations":[], "connections":[], "metadata":{}}

def merge(existing, new_items):
    existing_ids = {c['id'] for c in existing['cases']}
    existing_links = {c['link'] for c in existing['cases']}
    added = 0
    for item in new_items:
        if item['id'] not in existing_ids and item['link'] not in existing_links:
            existing['cases'].insert(0, item)
            added += 1
    # Keep max 200 cases
    existing['cases'] = existing['cases'][:200]
    log.info(f"Hozzáadva: {added} új ügy | Összesen: {len(existing['cases'])}")
    return existing

def update_metadata(data):
    cases = data['cases']
    data['metadata'] = {
        "last_updated":               datetime.now(timezone.utc).isoformat(),
        "version":                    "2.2.0",
        "total_cases":                len(cases),
        "total_investigations":       len(data.get('investigations', [])),
        "total_involved_amount_huf":  sum(c.get('amount_huf',0) for c in cases),
        "status_breakdown": {
            s: sum(1 for c in cases if c.get('status') == s)
            for s in ['active','investigation','closed','appeal']
        },
        "category_breakdown": {
            cat: sum(1 for c in cases if c.get('category') == cat)
            for cat in ['korrupció','pénzügyi','közbeszerzés']
        },
        "sources":         list({c['source'] for c in cases}),
        "regions_covered": list({c['region'] for c in cases}),
    }
    return data

def save(data):
    os.makedirs('public/data', exist_ok=True)
    os.makedirs('data', exist_ok=True)
    out = json.dumps(data, indent=2, ensure_ascii=False)
    with open('public/data/news.json', 'w') as f: f.write(out)
    with open('data/news.json', 'w') as f: f.write(out)
    log.info("Elmentve: public/data/news.json + data/news.json")

def main():
    log.info("=== NER Tracker Scraper v2.0 ===")
    existing = load_existing()
    new_items = []
    for feed in FEEDS:
        new_items.extend(scrape_feed(feed))
    data = merge(existing, new_items)
    data = update_metadata(data)
    save(data)
    log.info(f"=== Kész | {data['metadata']['total_cases']} ügy | {data['metadata']['last_updated']} ===")

if __name__ == '__main__':
    main()

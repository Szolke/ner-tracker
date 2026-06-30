#!/usr/bin/env python3
"""NER Tracker Scraper v3.0 – NLP névfelismerés, RSS feed, backup"""

import feedparser, requests, json, re, os, hashlib, logging, difflib
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger("ner-scraper")

# NER-specifikus személyek/intézmények — KÖTELEZŐ legalább egy
NER_CORE = [
    'fidesz', 'orbán', 'mészáros', 'rogán', 'tiborcz', 'habony',
    'szijjártó', 'lázár', 'kásler', 'palkovics', 'gulyás', 'csányi',
    'polt', 'parragh', 'borkai', 'simicska', 'vida ildikó',
    'varga mihály', 'deutsch', 'kövér', 'semjén', 'pintér',
    'vitézy', 'karácsony', 'demeter',
    'közpénz', 'nér', 'olaf', 'eppo', 'elios', 'közgép', 'quaestor',
    'rimaholding', 'mediaworks', 'felcsút', 'nkm', 'mohu',
    'közfeladatot ellátó', 'fideszhez közel', 'kormányközeli',
    'tao-rendszer', 'tao ', 'mol-vezér', 'mol rt', 'mol zrt',
    'pegasus', 'paks', 'budapest airport', 'liszt ferenc repülő',
    'mészáros-közeli', 'fidesz-közeli', 'orbán-közeli',
    'közbeszerzési', 'közpénzből', 'pályázati pénz',
    'eu-s pályázat', 'állami forrás', 'közpénz-elszámolás',
    'bdpst', 'városliget', 'liget projekt', 'garancsi', 'tiborcz',
    'k-monitor', 'eppo magyarország', 'tényfeltáró',
]

# Korrupciós indikátorok — KÖTELEZŐ legalább egy
SECONDARY = [
    'korrupció','visszaélés','nyomozás','vizsgálat','gyanú','vád',
    'túlárazás','szabálytalan','átláthatatlan','olaf','eppo',
    'ügyészség','pénzmosás','sikkasztás','vesztegetés','anomália',
    'milliárd','eu-s forrás','visszaigénylés','bírság',
    'érdekeltség','összefonódás','oligarcha',
    'pályázatot nyert','megfigyelés','kémprogram','nyernek',
]

EXCLUDE = [
    'sport eredmény','időjárás','horoszkóp','recept','szórakozás',
    'kézigránát','ruszin-szendi','katonai baleset',
    'dél-korea','koreai elnök','ausztrál kormány','ausztrália ',
    'trump','fehér ház','putyin','ukrán front','izraeli hadsereg',
    'brit kormány','francia kormány','német kormány','kínai kormány',
    'foci vb','labdarúgó','válogatott kiesett',
]

NER_ERA_START = '2010-01-01'

# ── RSS Proxy beállítás ──────────────────────────────────────────────
# Ha a PROXY_URL env változó be van állítva, azon keresztül kéri le a feedeket.
# Cloudflare Worker URL: https://ner-tracker-rss-proxy.<accountname>.workers.dev
# Aktiválás: GitHub repo → Settings → Secrets → PROXY_URL
import os as _os
_PROXY = _os.environ.get("PROXY_URL", "").rstrip("/")

def _feed_url(url):
    """Proxy-n keresztül kéri le a feed URL-t ha PROXY_URL be van állítva."""
    if _PROXY:
        import urllib.parse
        return f"{_PROXY}?url={urllib.parse.quote(url, safe='')}"
    return url

FEEDS = [
    # Általános hírportálok (széles lefedettség)
    {"name":"Telex",       "url":"https://telex.hu/rss",                                    "source":"Telex"},
    {"name":"HVG",         "url":"https://hvg.hu/rss",                                      "source":"HVG"},
    {"name":"444",         "url":"https://444.hu/feed",                                     "source":"444"},
    # Nyomozó újságírás (NER-korrupció fókusz)
    {"name":"Direkt36",    "url":"https://direkt36.hu/feed/",                               "source":"Direkt36"},
    {"name":"Atlatszo",    "url":"https://atlatszo.hu/feed/",                               "source":"Átlátszó"},
    {"name":"AtlatszoPenz","url":"https://atlatszo.hu/category/kozpenz/feed/",              "source":"Átlátszó"},
    {"name":"Abcug",       "url":"https://abcug.hu/feed/",                                  "source":"Abcúg"},
    {"name":"G7",          "url":"https://g7.hu/feed/",                                     "source":"G7"},
    # Politikai elemzők, balliberális sajtó
    {"name":"Narancs",     "url":"https://magyarnarancs.hu/rss",                            "source":"Magyar Narancs"},
    {"name":"Merce",       "url":"https://merce.hu/tag/korrupcio/feed/",                    "source":"Mérce"},
    {"name":"Partizan",    "url":"https://partizan.online/feed",                            "source":"Partizán"},
    # Nemzetközi magyar szerkesztőségek
    {"name":"SzabadEu",    "url":"https://www.szabad-europa.hu/z/rss",                      "source":"Szabad Európa"},
    # Témakör-specifikus feedek
    {"name":"AtlatszoPalyazat","url":"https://atlatszo.hu/tag/palyazat/feed/",             "source":"Átlátszó"},
    {"name":"HVGKozpenz",  "url":"https://hvg.hu/gazdasag/rss",                            "source":"HVG Gazdaság"},
]

REGION_COORDS = {
    "Budapest":[47.4979,19.0402],"Pest":[47.58,19.16],"Fejér":[47.118,18.432],
    "Győr-Moson-Sopron":[47.6829,17.6271],"Vas":[47.2308,16.6225],"Veszprém":[47.0931,17.9108],
    "Zala":[46.6678,16.9897],"Somogy":[46.3568,17.7761],"Baranya":[46.0727,18.2323],
    "Tolna":[46.4677,18.5595],"Bács-Kiskun":[46.5935,19.3542],"Csongrád-Csanád":[46.253,20.1414],
    "Békés":[46.7568,21.092],"Hajdú-Bihar":[47.5316,21.6273],"Szabolcs-Szatmár-Bereg":[47.959,22.0024],
    "Heves":[47.893,20.0773],"Jász-Nagykun-Szolnok":[47.1784,20.1823],"Borsod-Abaúj-Zemplén":[48.1035,20.7784],
    "Nógrád":[48.0139,19.5148],"Komárom-Esztergom":[47.7416,18.3878],
}
REGION_KW = {
    "Budapest":["budapest","fővárosi"],"Hajdú-Bihar":["debrecen","hajdú"],
    "Borsod-Abaúj-Zemplén":["miskolc","borsod"],"Baranya":["pécs","baranya"],
    "Győr-Moson-Sopron":["győr"],"Csongrád-Csanád":["szeged","csongrád"],
    "Fejér":["felcsút","fejér","székesfehérvár"],"Somogy":["balaton","siófok","kaposvár"],
    "Zala":["zalaegerszeg","keszthely"],"Veszprém":["veszprém"],
}

# ── NLP: known politicians & roles ──────────────────────────────────
KNOWN_PERSONS = [
    ("Mészáros Lőrinc",   "vállalkozó, volt felcsúti polgármester"),
    ("Orbán Viktor",      "miniszterelnök"),
    ("Rogán Antal",       "miniszter, Kabinetirodát vezető"),
    ("Tiborcz István",    "vállalkozó, Orbán Viktor veje"),
    ("Szijjártó Péter",   "külügyminiszter"),
    ("Lázár János",       "építési és közlekedési miniszter"),
    ("Gulyás Gergely",    "miniszterelnöki kabinetfőnök"),
    ("Palkovics László",  "volt innovációs és felsőoktatási miniszter"),
    ("Kásler Miklós",     "volt emberi erőforrások minisztere"),
    ("Nagy István",       "agrárminiszter"),
    ("Habony Árpád",      "politikai tanácsadó, Orbán-közeli"),
    ("Csányi Sándor",     "OTP Bank elnök, MLSZ elnök"),
    ("Parragh László",    "Magyar Kereskedelmi és Iparkamara elnöke"),
    ("Polt Péter",        "legfőbb ügyész"),
    ("Simicska Lajos",    "vállalkozó, volt Fidesz-kasszás"),
    ("Garancsi István",   "vállalkozó, Videoton FC tulajdonos"),
    ("Demeter Szilárd",   "NKA elnök, PIM főigazgató"),
    ("Vida Ildikó",       "volt NAV elnök (USA szankcionálta)"),
    ("Varga Mihály",      "pénzügyminiszter"),
    ("Deutsch Tamás",     "EP-képviselő, Fidesz"),
    ("Semjén Zsolt",      "miniszterelnök-helyettes, KDNP elnök"),
    ("Pintér Sándor",     "belügyminiszter"),
    ("Nagy Márton",       "gazdaságfejlesztési miniszter"),
    ("Karácsony Gergely", "Budapest főpolgármestere"),
    ("Vitézy Dávid",      "BKK volt vezérigazgató"),
]

def extract_persons(text):
    found = []
    seen  = set()
    for name, pos in KNOWN_PERSONS:
        if name.lower() in text.lower() and name not in seen:
            pid = 'p_' + hashlib.md5(name.encode()).hexdigest()[:6]
            found.append({"id": pid, "name": name, "position": pos})
            seen.add(name)
    # Generic: Lastname Firstname pattern (capital letters)
    for m in re.finditer(r'\b([A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+)\b', text):
        name = m.group(1)
        if name not in seen and len(name) > 6:
            pid = 'p_' + hashlib.md5(name.encode()).hexdigest()[:6]
            found.append({"id": pid, "name": name, "position": "ismeretlen"})
            seen.add(name)
        if len(found) >= 4: break
    return found[:4]

def extract_tags(text):
    kw = ['korrupció','közbeszerzés','EU','OLAF','EPPO','alapítvány','stadion',
          'sport','médai','hirdetés','agrárium','IT','önkormányzat','tender']
    return [k for k in kw if k.lower() in text.lower()][:5]

def detect_region(text):
    tl = text.lower()
    for region, kws in REGION_KW.items():
        if any(k in tl for k in kws):
            return region, REGION_COORDS.get(region, REGION_COORDS["Budapest"])
    return "Budapest", REGION_COORDS["Budapest"]

def detect_category(text):
    tl = text.lower()
    if any(k in tl for k in ['közbeszerzés','tender','pályázat','ajánlat','versenyeljárás',
                               'megbízás nélkül','nyilvános versenytárgyalás']): return "közbeszerzés"
    if any(k in tl for k in ['korrupció','vesztegetés','sikkasztás','megvesztegetés',
                               'kenőpénz','megfigyelés','lehallgat','pegasus','kémprogram',
                               'zsarolás','hatalommal visszaélés','visszaélés']): return "korrupció"
    return "pénzügyi"

def detect_amount(text):
    for p,mult in [(r'(\d+[,\.]?\d*)\s*milliárd',1e9),(r'(\d+[,\.]?\d*)\s*mrd',1e9),(r'(\d+)\s*millió',1e6)]:
        m = re.search(p, text.lower())
        if m: return int(float(m.group(1).replace(',','.'))*mult)
    return None

def relevance_reason(title, summary='', date_str=None):
    """Visszaadja (relevant: bool, reason: str|None) — a reason a cleanup loghoz kell."""
    text = (title+' '+summary).lower()
    if any(ex in text for ex in EXCLUDE):
        return False, 'exclude_keyword'
    if date_str and date_str < NER_ERA_START:
        return False, 'before_ner_era'
    if not any(k in text for k in NER_CORE):
        return False, 'no_ner_core_match'
    if not any(k in text for k in SECONDARY):
        return False, 'no_secondary_match'
    return True, None

def is_relevant(title, summary='', date_str=None):
    ok, _ = relevance_reason(title, summary, date_str)
    return ok

def find_similar_title(title, existing_titles, threshold=0.82):
    """Fuzzy cím-egyezés difflib-bel — ugyanaz az ügy más forrásból, kicsit eltérő címmel."""
    tl = title.lower().strip()
    for et in existing_titles:
        if not et: continue
        if difflib.SequenceMatcher(None, tl, et.lower().strip()).ratio() >= threshold:
            return et
    return None

def make_id(url): return 'sc_'+hashlib.md5(url.encode()).hexdigest()[:8]

def scrape_all():
    items = []
    for feed in FEEDS:
        try:
            log.info(f"Fetching {feed['name']}…")
            d = feedparser.parse(_feed_url(feed['url']))
            for entry in d.entries[:40]:
                title   = getattr(entry,'title','')
                summary = BeautifulSoup(getattr(entry,'summary',''),'html.parser').get_text()
                link    = getattr(entry,'link','')
                try:    pub = dateparser.parse(str(entry.published)).strftime('%Y-%m-%d')
                except: pub = datetime.now(timezone.utc).strftime('%Y-%m-%d')
                if not is_relevant(title, summary, pub): continue
                region, coords = detect_region(title+' '+summary)
                full_text = title+' '+summary
                items.append({
                    "id":               make_id(link),
                    "title":            title.strip(),
                    "description":      summary[:400].strip(),
                    "link":             link,
                    "date":             pub,
                    "source":           feed['source'],
                    "category":         detect_category(full_text),
                    "status":           "active",
                    "region":           region,
                    "coordinates":      coords,
                    "amount_huf":       detect_amount(full_text),
                    "tags":             extract_tags(full_text),
                    "involved_persons": extract_persons(full_text),
                })
            log.info(f"  {feed['name']}: {len([x for x in items if x['source']==feed['source']])} cikk")
        except Exception as e:
            log.error(f"  {feed['name']} hiba: {e}")
    return items

def generate_rss(data):
    cases = data['cases'][:20]
    items_xml = ''
    for c in cases:
        items_xml += f"""  <item>
    <title><![CDATA[{c['title']}]]></title>
    <link>{c['link']}</link>
    <guid>{c['id']}</guid>
    <pubDate>{c['date']}</pubDate>
    <description><![CDATA[{c['description'][:200]} | {c['region']} | {f"{c['amount_huf']//1000000} M HUF" if c['amount_huf'] else 'Összeg ismeretlen'} | {c['category']}]]></description>
    <category>{c['category']}</category>
  </item>
"""
    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NER Tracker – Magyar Közpénz Figyelő</title>
    <link>https://ner-tracker.pages.dev</link>
    <description>Magyar kormányzati korrupciós ügyek, közbeszerzési visszaélések és pénzügyi anomáliák</description>
    <language>hu</language>
    <lastBuildDate>{datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S +0000')}</lastBuildDate>
    <atom:link href="https://ner-tracker.pages.dev/feed.xml" rel="self" type="application/rss+xml"/>
{items_xml}  </channel>
</rss>"""
    os.makedirs('public', exist_ok=True)
    with open('public/feed.xml','w',encoding='utf-8') as f: f.write(rss)
    log.info("RSS feed generálva: public/feed.xml")

def backup(data):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    os.makedirs(f'data/archive', exist_ok=True)
    path = f'data/archive/{today}.json'
    if not os.path.exists(path):
        with open(path,'w') as f: json.dump(data,f,ensure_ascii=False,indent=2)
        log.info(f"Backup: {path}")

def load_existing():
    for p in ['public/data/news.json','data/news.json']:
        if os.path.exists(p):
            with open(p) as f: return json.load(f)
    return {"cases":[],"investigations":[],"connections":[],"metadata":{}}

def log_cleanup(entries):
    """Logolja a merge() által eltávolított/kihagyott cikkeket data/archive/cleanup-log.json-be,
    hogy vissza lehessen ellenőrizni a hamis negatívokat (irrelevánsnak ítélt, de valós ügyek)."""
    if not entries:
        return
    path = 'data/archive/cleanup-log.json'
    os.makedirs('data/archive', exist_ok=True)
    log_data = []
    if os.path.exists(path):
        try:
            with open(path, encoding='utf-8') as f:
                log_data = json.load(f)
        except Exception:
            log_data = []
    log_data.append({
        "run_at": datetime.now(timezone.utc).isoformat(),
        "entries": entries,
    })
    log_data = log_data[-100:]  # csak az utolsó 100 futás
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(log_data, f, ensure_ascii=False, indent=2)
    log.info(f"Cleanup log frissítve: {path} ({len(entries)} esemény ebben a futásban)")

def merge(existing, new_items):
    cleanup_entries = []

    # Meglévő irreleváns cikkek eltávolítása
    before = len(existing['cases'])
    kept = []
    for c in existing['cases']:
        ok, reason = relevance_reason(c.get('title',''), c.get('description',''), c.get('date'))
        if ok:
            kept.append(c)
        else:
            cleanup_entries.append({
                "id": c.get('id'), "title": c.get('title'),
                "action": "removed", "reason": reason,
            })
    existing['cases'] = kept
    removed = before - len(existing['cases'])
    if removed:
        log.info(f"Eltávolítva (irreleváns): {removed} régi ügy")

    ids    = {c['id'] for c in existing['cases']}
    links  = {c['link'] for c in existing['cases']}
    titles = [c.get('title','') for c in existing['cases']]
    added, skipped_dupe = 0, 0
    for item in new_items:
        if item['id'] in ids or item['link'] in links:
            continue
        similar = find_similar_title(item['title'], titles)
        if similar:
            skipped_dupe += 1
            cleanup_entries.append({
                "id": item['id'], "title": item['title'],
                "action": "skipped_duplicate", "reason": f"similar_to: {similar}",
            })
            log.info(f"  Duplikátum kihagyva: \"{item['title'][:60]}\" ~ \"{similar[:60]}\"")
            continue
        existing['cases'].insert(0, item)
        titles.append(item['title'])
        ids.add(item['id']); links.add(item['link'])
        added += 1
    existing['cases'] = existing['cases'][:200]
    log.info(f"Új: {added} | Duplikátum kihagyva: {skipped_dupe} | Összesen: {len(existing['cases'])}")
    log_cleanup(cleanup_entries)
    return existing

def update_metadata(data):
    cases = data['cases']
    data['metadata'] = {
        "last_updated":              datetime.now(timezone.utc).isoformat(),
        "version":                   "3.0.0",
        "total_cases":               len(cases),
        "total_investigations":      len(data.get('investigations',[])),
        "total_involved_amount_huf": sum(c.get('amount_huf') or 0 for c in cases),
        "status_breakdown":  {s:sum(1 for c in cases if c.get('status')==s) for s in ['active','investigation','closed','appeal']},
        "category_breakdown":{cat:sum(1 for c in cases if c.get('category')==cat) for cat in ['korrupció','pénzügyi','közbeszerzés']},
        "sources":         sorted(list({c['source'] for c in cases})),
        "regions_covered": list({c['region'] for c in cases}),
    }
    return data

def save(data):
    os.makedirs('public/data',exist_ok=True)
    os.makedirs('data',exist_ok=True)
    out = json.dumps(data,indent=2,ensure_ascii=False)
    for p in ['public/data/news.json','data/news.json']:
        with open(p,'w') as f: f.write(out)
    log.info("Mentve.")


def auto_connections(data):
    """Automatikusan észleli az összefüggéseket: ha két ügy ugyanazon személyt érinti"""
    cases = data['cases']
    existing_conns = {(c['from'], c['to']) for c in data.get('connections', [])}
    new_conns = []

    # Build person → cases mapping
    person_cases = {}
    for case in cases:
        for p in case.get('involved_persons', []):
            if p['id'] not in person_cases:
                person_cases[p['id']] = {'person': p, 'cases': []}
            person_cases[p['id']]['cases'].append(case['id'])

    # Find pairs of persons who share cases
    person_ids = list(person_cases.keys())
    for i, pid_a in enumerate(person_ids):
        for pid_b in person_ids[i+1:]:
            shared = set(person_cases[pid_a]['cases']) & set(person_cases[pid_b]['cases'])
            if not shared:
                continue
            key = (pid_a, pid_b)
            rev = (pid_b, pid_a)
            if key in existing_conns or rev in existing_conns:
                continue
            # Determine connection type
            pa = person_cases[pid_a]['person']
            pb = person_cases[pid_b]['person']
            conn_type = 'business_connection'
            pol_kw = ['miniszter', 'polgármester', 'kabinetfőnök', 'elnök', 'képviselő']
            if any(k in (pa.get('position','') + pb.get('position','')).lower() for k in pol_kw):
                conn_type = 'political_ally'
            new_conns.append({
                'from': pid_a,
                'to':   pid_b,
                'type': conn_type,
                'cases': list(shared),
                'description': f'Automatikusan felismert – {len(shared)} közös ügy',
                'auto': True
            })
            existing_conns.add(key)
            log.info(f"  Auto-kapcsolat: {pa.get('name','?')} ↔ {pb.get('name','?')} ({len(shared)} ügy)")

    if new_conns:
        data.setdefault('connections', []).extend(new_conns)
        log.info(f"Auto-connections: {len(new_conns)} új összefüggés hozzáadva")
    return data

def main():
    log.info("=== NER Tracker Scraper v3.0 ===")
    existing = load_existing()
    backup(existing)
    new_items = scrape_all()
    data = merge(existing, new_items)
    data = auto_connections(data)
    data = update_metadata(data)
    save(data)
    generate_rss(data)
    log.info(f"=== Kész | {data['metadata']['total_cases']} ügy ===")

if __name__ == '__main__':
    main()


# NER Tracker — Claude instrukciók

## Projekt áttekintés

Magyar kormányzati (NER/Fidesz) korrupciós és közpénz-eltulajdonítási ügyek nyilvántartása.
React/Vite SPA, Python RSS scraper, Cloudflare Pages hosting.

- **Élő oldal:** https://ner-tracker.pages.dev
- **GitHub repo:** https://github.com/Szolke/ner-tracker
- **Branch:** `main`

---

## Tech stack

| Réteg | Technológia |
|-------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Adatok | `public/data/news.json` (scraper írja, React olvassa) |
| Scraper | Python 3.11 (`scripts/scraper.py`) — napi RSS fetch |
| Hosting | Cloudflare Pages (Direct Upload, `wrangler pages deploy`) |
| Edge | Cloudflare Pages Function (`functions/_middleware.js`) — dinamikus OG |
| CI/CD | GitHub Actions (`.github/workflows/scraper.yml`) |
| i18n | Magyar/angol (`src/i18n.jsx`, `useLang()` hook, `tr.xxx` kulcsok) |

---

## Repo struktúra

```
ner-tracker/
├── functions/
│   └── _middleware.js          ← CF Pages Function: dinamikus OG/Twitter meta crawlereknek
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       ← FŐ komponens: 4 tab, összes chart (CaseDetail KISZERVEZVE)
│   │   ├── CaseDetail.jsx      ← Ügy-modal (kiszervezve Dashboard.jsx-ből)
│   │   ├── AdminPanel.jsx      ← Új ügy felvitele + "Scraper egészség" widget
│   │   ├── PersonProfile.jsx   ← Személy oldal, kapcsolódó ügyek időrendben (status_history)
│   │   ├── LiveFeed.jsx        ← Jobb oldali hírfolyam widget
│   │   ├── Timeline.jsx        ← Idővonal tab (drag-scroll, lejátszás)
│   │   ├── NetworkGraph.jsx    ← Nyomozások tab (kapcsolati háló)
│   │   ├── ChoroplethMap.jsx   ← Hőtérkép (Idővonal tab)
│   │   ├── EUComparison.jsx    ← EU korrupciós index összehasonlítás
│   │   ├── EmbedCard.jsx       ← Beágyazható ügy-kártya (/embed/:id)
│   │   ├── ErrorBoundary.jsx   ← Hibakezelő wrapper
│   │   └── TrendAnalysis.jsx   ← Trend elemzés + inflációkövetés (KSH CPI deflátor)
│   ├── hooks/
│   │   └── useFilteredCases.js ← Ügyszűrés (title+persons+description+TAGS)
│   ├── utils/
│   │   ├── pdfExport.js
│   │   └── format.js           ← mrd()/mrdS()/shareCase() — közös formázók
│   ├── i18n.jsx                ← Fordítások (hu/en), useLang() hook
│   ├── App.jsx
│   └── main.jsx
├── public/data/
│   ├── news.json               ← Adatfájl (élesben innen tölt a frontend)
│   └── cleanup-log.json        ← Publikus másolat (utolsó 20 futás) az AdminPanelnek
├── data/
│   ├── news.json               ← Scraper backup
│   └── archive/
│       ├── YYYY-MM-DD.json         ← Napi archívumok
│       ├── cleanup-log.json        ← Teljes (utolsó 100 futás) cleanup-napló
│       └── person-review-queue.json ← Kiszűrt "Nagybetű Nagybetű" jelöltek
├── scripts/
│   ├── scraper.py              ← Python RSS scraper (fuzzy duplikátum-szűréssel)
│   └── rss-proxy.js            ← Cloudflare Worker proxy
├── .github/workflows/scraper.yml
├── wrangler.toml               ← CF Pages config
└── CLAUDE.md                   ← Ez a fájl
```

---

## CI/CD pipeline

`.github/workflows/scraper.yml` — napi 8:00 UTC, manuálisan is indítható:

```
1. actions/checkout@v4.2.2 + actions/setup-python@v5
2. pip install -r requirements.txt
3. python scripts/scraper.py   → frissíti news.json + cleanup-log.json + person-review-queue.json
4. git fetch origin
   git reset --soft origin/main   ← staged változások megmaradnak
   git commit + git push
5. npm install && npm run build   → dist/
6. npx wrangler pages deploy dist --project-name=ner-tracker
```

### GitHub Secrets (kötelező)

| Secret | Leírás |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Account → Cloudflare Pages → Edit jogosultság |
| `CLOUDFLARE_ACCOUNT_ID` | CF dashboard jobb sáv |
| `PROXY_URL` | Cloudflare Worker RSS proxy URL |
| `RESEND_API_KEY` | (opcionális) email értesítő |
| `NOTIFY_EMAIL` | (opcionális) értesítési cím |

---

## Scraper logika (`scripts/scraper.py`)

### RSS Források (14 feed)
Telex, HVG, 444, Direkt36, Átlátszó (fő + közpénz + pályázat feed),
Abcúg, G7, Magyar Narancs, Mérce, Partizán, Szabad Európa, HVG Gazdaság

### Relevancia-szűrők

**NER_CORE** (kötelező — legalább egy): konkrét NER-személyek és intézmények
(`fidesz`, `orbán`, `mészáros`, `rogán`, `tiborcz`, `olaf`, `eppo`, `elios`,
`közgép`, `quaestor`, `mediaworks`, `felcsút`, `pegasus`, `paks`, `közbeszerzési`,
`mészáros-közeli`, `bdpst`, `liget`, stb.)

**SECONDARY** (kötelező — legalább egy): korrupciós indikátorok
(`korrupció`, `visszaélés`, `nyomozás`, `vizsgálat`, `milliárd`, `sikkasztás`,
`vesztegetés`, `oligarcha`, `megfigyelés`, `kémprogram`, stb.)

**EXCLUDE**: külföldi kormányok, katonai balesetek, sport, stb.

**NER_ERA_START**: `'2010-01-01'` — csak Fidesz-éra ügyek

`relevance_reason(title, summary, date)` → `(ok: bool, reason: str|None)` —
ugyanazt dönti el mint a régi `is_relevant()`, de az okot is visszaadja a
cleanup loghoz. `is_relevant()` ennek vékony wrappere, megmaradt kompatibilitásból.

### detect_category()
```python
'közbeszerzés' ha: közbeszerzés, tender, pályázat, ajánlat, versenyeljárás
'korrupció'    ha: korrupció, vesztegetés, megfigyelés, pegasus, lehallgat, visszaélés
'pénzügyi'     egyébként
```

### KNOWN_PERSONS (25 személy)
Orbán Viktor, Mészáros Lőrinc, Rogán Antal, Tiborcz István, Szijjártó Péter,
Lázár János, Gulyás Gergely, Palkovics László, Kásler Miklós, Nagy István,
Habony Árpád, Csányi Sándor, Parragh László, Polt Péter, Simicska Lajos,
Garancsi István, Demeter Szilárd, Vida Ildikó, Varga Mihály, Deutsch Tamás,
Semjén Zsolt, Pintér Sándor, Nagy Márton, Karácsony Gergely, Vitézy Dávid

### extract_persons() — fals pozitív szűrés
A `KNOWN_PERSONS` lista mellett egy generikus "Nagybetű Nagybetű" regex is
keres személyeket. Ez gyakran intézmény-/helyneveket talál el (pl. "Európai
Unió", "Legfelsőbb Bíróság"). Ezeket egy blacklist szűri ki:
`NON_PERSON_FIRST_WORDS` / `NON_PERSON_SECOND_WORDS` (kb. 35 szó, intézmény-
és közigazgatási kifejezések). A kiszűrt jelölteket a futás végén
`save_person_review_queue()` írja a `data/archive/person-review-queue.json`-be
(utolsó 50 futás), hogy alkalmanként manuálisan átnézhető legyen a fals
pozitív/negatív arány.

### merge() — aktív tisztítás + duplikátum-szűrés
Minden futásnál az összes meglévő ügy átmegy a relevancia-szűrőn — az
irrelevánssá vált régi cikkek automatikusan eltávolítódnak, az okkal együtt.

Az új cikkek címét `find_similar_title()` (difflib `SequenceMatcher`,
küszöb: 0.82) is összeveti a meglévő (és az ugyanebben a futásban már
felvett) címekkel, hogy elkerülje ugyanazon ügy kétszeri felvételét
különböző forrásokból (pl. Telex és HVG ugyanarról, kicsit eltérő címmel).

`log_cleanup()` minden eltávolítást/kihagyott duplikátumot naplóz:
- `data/archive/cleanup-log.json` — teljes napló, utolsó 100 futás
- `public/data/cleanup-log.json` — publikus, kisebb másolat (utolsó 20 futás),
  ezt olvassa be token nélkül az AdminPanel "Scraper egészség" widgetje

---

## Adatformátum (`news.json`)

```json
{
  "metadata": {
    "last_updated": "2026-06-29T08:00:00Z",
    "total_cases": 47
  },
  "cases": [{
    "id": "sc_xxxxxxxx",       ← scraped: sc_; kézzel: seed_xxx_001
    "title": "Cím",
    "description": "Max 400 karakter RSS összefoglaló",
    "link": "https://...",
    "date": "2026-06-25",
    "source": "Telex",
    "category": "korrupció|pénzügyi|közbeszerzés",
    "status": "active|investigation|closed|appeal",
    "region": "Budapest|Pest|Tolna|Országos|...",
    "coordinates": [47.4979, 19.0402],
    "amount_huf": 4500000000,   ← NULL ha ismeretlen! Ne 500000000!
    "verified": false,
    "media_count": 3,
    "tags": ["OLAF", "közbeszerzés"],
    "status_history": [{"date": "2017-03-02", "status": "active"}, ...],
    "involved_persons": [
      {"id": "p_xxxxxx", "name": "Teljes Név", "position": "Pozíció"}
    ]
  }]
}
```

**Fontos:** `amount_huf: null` ha nem ismert. A `500_000_000` placeholder TILOS.
Mindkét helyen módosítani kell: `public/data/news.json` ÉS `data/news.json`.

`status_history` opcionális — ha hiányzik, a `PersonProfile` az ügy jelenlegi
státuszát + dátumát mutatja a "Kapcsolódó ügyek időrendben" szekcióban.

---

## UI konvenciók

### Pénznem formátum
```js
// src/utils/format.js
export const mrd  = huf => huf != null
  ? (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF'
  : 'Összeg ismeretlen';
export const mrdS = huf => huf != null
  ? (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF'
  : '—';
export function shareCase(c) { /* navigator.share / clipboard fallback */ }
```
Tilos: `Mrd Ft`, `MrdB`, `milliárd HUF`, `35B HUF`.
**Mindig** `src/utils/format.js`-ből importálva — ne definiálj helyi
mrd/mrdS-t új komponensben (kivéve PersonProfile.jsx/EmbedCard.jsx, ahol
történeti okokból még saját, ugyanilyen formátumú helyi verzió van).

### i18n
```js
const { t: tr, lang, setLang } = useLang();
// Minden UI szöveg: tr.kulcsNev
// Új szövegnél: add hozzá MINDKÉT nyelvhez (i18n.jsx hu + en blokkba)
// FONTOS: 't' változónév tilos — a TABS.map(tab=>) loop miatt 'tr'-t használunk
```

### React Hooks szabály
Minden `useState`, `useCallback`, `useMemo`, `useEffect` hook az
`if (!data) return (...)` early return ELŐTT kell legyen.
Megsértése → React error #310 ("Rendered more hooks than during previous render").

A szűrők (`searchTerm`/`filterStatus`/`filterCat`/`maxAmount`) változására a
lapozás `useEffect(() => setPage(1), [...])`-fel áll vissza 1-re — NE
`setPage()`-et hívj egy `useMemo` belsejéből (render közbeni side-effect,
korábbi hiba volt, javítva).

### Modal (CaseDetail)
- `CaseDetail` saját fájlban: `src/components/CaseDetail.jsx`
- A Dashboard `return()` LEGELEJÉN renderelődik, `<>` fragmentbe, NEM a tab
  tartalmon belül: `{selectedCase && <CaseDetail .../>}`
- `closeCase = useCallback(...)` a Dashboard-ban, az early return előtt
- ESC + backdrop click zárja
- Formázók (`mrd`/`mrdS`/`shareCase`) a `../utils/format`-ból importálva

### Keresés (Ügyek tab)
`src/hooks/useFilteredCases.js` — title + involved_persons.name +
description + **tags[]** mezőkben keres (a tags hozzáadásával olyan
kulcsszavak is megtalálhatók, mint "OLAF", amik nem feltétlenül szerepelnek
a címben). Tiszta `useMemo`, side-effect nélkül.

### Pagination
`PAGE_SIZE = 9`, `page` state. A kártya lista:
```jsx
filteredCases.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(c => <CaseCard .../>)
```
Prev/Next gombokkal. Lapozás-reset: ld. fenti React Hooks szabály.

---

## Dashboard vizualizációk (Overview tab)

| Chart | Adat | Típus |
|-------|------|-------|
| Kategória | categoryData | BarChart |
| Évente (dual-axis) | yearlyDual | ComposedChart (Bar+Line) |
| Státusz megoszlás | statusData | PieChart |
| Forrás-eloszlás | sourceData | PieChart (donut, innerRadius=40) |
| Top érintett személyek | topPersons | BarChart (layout="vertical") |
| Kategória × Státusz mátrix | catStatusMatrix | HTML table (szín-intenzitás) |

Az `amountVsCases` (ScatterChart) el lett távolítva, helyette Forrás donut van.

### TrendAnalysis — inflációkövetés
`src/components/TrendAnalysis.jsx` egy kapcsolóval vált nominális (nyers Ft)
és inflációval korrigált (KSH CPI-alapú, `CURRENT_YEAR`-re deflált) éves
összeg-nézet között. `INFLATION_HU` táblázat évenkénti %-os rátákkal,
ismeretlen évre 4%-os átlagot feltételez. `CURRENT_YEAR`-t évente frissíteni
kell, ha a deflátor bázisévét tovább akarjuk tolni.

### PersonProfile — időrend
A személy oldalon a "Kapcsolódó ügyek időrendben" szekció az érintett ügyek
`status_history` bejegyzéseit fűzi össze dátum szerint rendezve (vagy az
ügy jelenlegi státuszát, ha nincs history).

---

## Seed ügyek (fontosabb historikus esetek)

47+ ügy, ebből egy rész automatikusan scraped (`sc_` prefix), egy rész
kézzel felvett seed (`seed_xxx_001` / `case_...` prefix).

Főbb seed ügyek: Elios/OLAF/EPPO, Mészáros vagyongyarapodás, Közgép,
Borkai, Quaestor, Pegasus, NKA/Demeter, KESMA/500médium, Fudan Egyetem,
Paks II/Rosatom, Száz Magyar Falu, Rogán-büdzsé, NAV politikai ellenőrzések,
MVM Connect, BDPST/Tiborcz, Liget projekt, EPPO magyar ügyek összesítő,
EU agrártámogatások, Covid-közbeszerzések, MÁV/vasút, Simicska/Közgép,
KEA alapítványok, Garancsi/stadionok, Budapest Airport, Pécsi közbeszerzések.

---

## Dinamikus Open Graph (közösségimédia-megosztás)

`functions/_middleware.js` — Cloudflare Pages Function. Felismeri a social
crawlerek User-Agentjét (Facebook, Twitter, Slack, LinkedIn, Discord, stb.)
és nekik egy könnyű, az adott ügy/személy adataival kitöltött HTML-t ad
vissza a `/szemely/:id`, `/embed/:id` és `/?case=:id` linkekhez, hogy
megosztáskor ne csak az általános `og-image.svg` + statikus cím jelenjen
meg. Valódi böngészőknél (nem crawler UA) változatlanul a normál SPA
töltődik be — a middleware ilyenkor egyszerűen `next()`-tel továbbenged.

Új bot felismeréséhez: `BOT_UA_PATTERNS` tömb bővítése a fájl tetején.

## Admin panel — "Scraper egészség"

Az `/admin` oldal authentikáció után (`ScraperHealth` komponens,
`AdminPanel.jsx` alján) megjeleníti az utolsó 7 nap cleanup-statisztikáját
(`public/data/cleanup-log.json` alapján): hány irreleváns cikket
távolított el és hány duplikátumot hagyott ki a scraper, okok szerint
bontva (`REASON_LABELS`). 30 feletti eltávolítás/duplikátum esetén
figyelmeztetést mutat, hogy érdemes-e átnézni a szűrőt.

---

## Lokális fejlesztés

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # dist/ mappa
```

### Scraper helyi futtatása
```bash
pip install -r requirements.txt
python scripts/scraper.py
```
Ellenőrizendő utána: `public/data/news.json`, `data/archive/cleanup-log.json`,
`data/archive/person-review-queue.json`.

## Deploy (manuális)

```bash
npm run build
npx wrangler pages deploy dist --project-name=ner-tracker
```

GitHub Actions: "Daily News Scraper" → Run workflow (ez buildel ÉS deployol).

---

## Amit minden módosítás után meg kell tenni

1. Frissítsd ezt a `CLAUDE.md`-t, ha struktúra/konvenció/fájl-lista változott
2. `git pull --rebase` (vagy `git pull`), majd `git push`
3. UI változásnál: trigger a "Daily News Scraper" GitHub Actions workflow-t
   (ez buildeli és deployolja a `dist/`-et — pusholás önmagában NEM deployol,
   csak a következő napi/manuális workflow-futáskor)
4. Build előtt mindig `npm run build` helyi teszt, hogy ne kerüljön be
   szintaxishiba (pl. esbuild "Unexpected }" — gyakori refaktor-hiba)

---

## Biztonsági ellenőrzés (ajánlott build után)

```bash
grep -rn "ghp_" dist/                                   # GitHub token nem kerülhet bele
grep -rEn "(api[_-]?key|secret)\s*[:=]\s*['\"][A-Za-z0-9_-]{15,}" dist/
```
Az admin jelszó (`ner2026admin`) SZÁNDÉKOSAN szerepel a kliensoldali
bundle-ben — ez egy egyszerű, dokumentált belépési kapu, nem valódi
authentikáció. A GitHub token mindig futásidőben, `localStorage`-ban
tárolva, SOHA nem hardcode-olva.

---

## Code-splitting (App.jsx)

A `Dashboard` eager importálva (ez a fő, mindenkit érintő route), de az
`AdminPanel`, `PersonProfile`, `EmbedCard`, `Methodology` route-ok
`React.lazy()` + `<Suspense fallback={<RouteLoading/>}>`-pel lazy-loadolva —
ezek kódja csak akkor töltődik le, ha a felhasználó ténylegesen meglátogatja
az adott útvonalat. Új route hozzáadásakor kövesd ezt a mintát, hacsak nem
egy minden látogatót érintő, kritikus route-ról van szó.

## CI: Build Check (PR-ok és nem-main branch-ek)

`.github/workflows/build-check.yml` minden Pull Requesten és nem-`main`
branch push-on lefuttatja: `npm run build`, `ghp_` token-leak grep a
`dist/`-ben, és `python -m py_compile scripts/scraper.py`. Ez korán elkapja
a szintaxishibákat, mielőtt a "Daily News Scraper" workflow (ami buildel ÉS
deployol) élesben futna rájuk. Ez a workflow SOSEM deployol, csak ellenőriz.

## RSS-forrás egészség monitorozás

`scrape_all()` minden forráshoz visszaadja a nyers (relevancia-szűrés
előtti) cikkszámot és az esetleges hibát (`feed_health` lista).
`check_feed_health()` ezt összeveti az előző futásokkal
(`data/archive/feed-health.json`, utolsó 30 futás), és ha egy forrás
3+ egymást követő futásban 0 cikket ad vagy hibázik, warning logot ír —
ez gyakran azt jelzi, hogy megváltozott a feed URL-je vagy védelem lépett
életbe. Publikus összesítő: `public/data/feed-health.json`, amit az
AdminPanel "RSS-forrás állapot" widgetje (`FeedHealth` komponens) jelenít
meg token nélkül.

## Akadálymentesség (a11y)

Minden ikon-only gombnak (csillag/megosztás/bezárás/sötét mód/nyelv váltás)
legyen `aria-label`-je a `title` mellett — screen reader nem mindig olvassa
a `title` attribútumot. Új ikon-only gomb hozzáadásakor mindig adj hozzá
`aria-label`-t is.

## Módszertan és helyesbítés oldal

`src/components/Methodology.jsx`, route: `/modszertan`, link a Dashboard
láblécében. Tartalmazza: hogyan kerülnek be az ügyek, a `verified`
mező jelentését, a `status`/`amount_huf` korlátait (sajtóhír-alapú, nem
hatósági megállapítás), és a helyesbítés-kérés folyamatát (GitHub Issues).
Ez egy nyilvános, valós személyeket megnevező adatbázisnál fontos jogi/
szerkesztői átláthatósági elem — tartalmát ne törd le, csak bővítsd, ha
a scraper logikája vagy az adatformátum változik.

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
| CI/CD | GitHub Actions (`.github/workflows/scraper.yml`) |
| i18n | Magyar/angol (`src/i18n.jsx`, `useLang()` hook, `tr.xxx` kulcsok) |

---

## Repo struktúra

```
ner-tracker/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       ← FŐ komponens: 4 tab, modal, összes chart
│   │   ├── LiveFeed.jsx        ← Jobb oldali hírfolyam widget
│   │   ├── Timeline.jsx        ← Idővonal tab (drag-scroll, lejátszás)
│   │   ├── NetworkGraph.jsx    ← Nyomozások tab (kapcsolati háló)
│   │   ├── ChoroplethMap.jsx   ← Hőtérkép (Idővonal tab)
│   │   ├── EUComparison.jsx    ← EU korrupciós index összehasonlítás
│   │   ├── ErrorBoundary.jsx   ← Hibakezelő wrapper
│   │   └── TrendAnalysis.jsx   ← Trend elemzés komponens
│   ├── i18n.jsx                ← Fordítások (hu/en), useLang() hook
│   ├── App.jsx
│   └── main.jsx
├── public/data/news.json       ← Adatfájl (~47 ügy)
├── data/
│   ├── news.json               ← Scraper backup
│   └── archive/YYYY-MM-DD.json ← Napi archívumok
├── scripts/
│   ├── scraper.py              ← Python RSS scraper
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
3. python scripts/scraper.py   → frissíti news.json
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

### Szűrők

**NER_CORE** (kötelező — legalább egy): konkrét NER-személyek és intézmények
(`fidesz`, `orbán`, `mészáros`, `rogán`, `tiborcz`, `olaf`, `eppo`, `elios`,
`közgép`, `quaestor`, `mediaworks`, `felcsút`, `pegasus`, `paks`, `közbeszerzési`,
`mészáros-közeli`, `bdpst`, `liget`, stb.)

**SECONDARY** (kötelező — legalább egy): korrupciós indikátorok
(`korrupció`, `visszaélés`, `nyomozás`, `vizsgálat`, `milliárd`, `sikkasztás`,
`vesztegetés`, `oligarcha`, `megfigyelés`, `kémprogram`, stb.)

**EXCLUDE**: külföldi kormányok, katonai balesetek, sport, stb.

**NER_ERA_START**: `'2010-01-01'` — csak Fidesz-éra ügyek

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

### merge() — aktív tisztítás
Minden futásnál az összes meglévő ügy átmegy a szűrőn — az irrelevánssá
vált régi cikkek automatikusan eltávolítódnak.

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
    "involved_persons": [
      {"id": "p_xxxxxx", "name": "Teljes Név", "position": "Pozíció"}
    ]
  }]
}
```

**Fontos:** `amount_huf: null` ha nem ismert. A `500_000_000` placeholder TILOS.
Mindkét helyen módosítani kell: `public/data/news.json` ÉS `data/news.json`.

---

## UI konvenciók

### Pénznem formátum
```js
// Dashboard.jsx:55-56
const mrd  = huf => huf != null
  ? (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF'
  : 'Összeg ismeretlen';
const mrdS = huf => huf != null
  ? (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF'
  : '—';
```
Tilos: `Mrd Ft`, `MrdB`, `milliárd HUF`, `35B HUF`

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
Megsértése → React error #310 ("Rendered more hooks than during previous render")

### Modal (CaseDetail)
- `CaseDetail` komponens a Dashboard `return()` LEGELEJÉN van, `<>` fragment-be
- NEM a tab tartalmon belül
- `closeCase = useCallback(...)` szintén az early return előtt
- ESC + backdrop click zárja

### Keresés (Ügyek tab)
Title + involved_persons.name + description — mindhármat ellenőrzi.

### Pagination
`PAGE_SIZE = 9`, `page` state. A kártya lista:
```jsx
filteredCases.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(c => <CaseCard .../>)
```
Prev/Next gombokkal, `setPage(1)` a filteredCases useMemo-ban.

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

---

## Seed ügyek (fontosabb historikus esetek)

47 ügy, ebből ~15 automatikusan scraped, ~32 kézzel felvett seed.

Főbb seed ügyek: Elios/OLAF/EPPO, Mészáros vagyongyarapodás, Közgép,
Borkai, Quaestor, Pegasus, NKA/Demeter, KESMA/500médium, Fudan Egyetem,
Paks II/Rosatom, Száz Magyar Falu, Rogán-büdzsé, NAV politikai ellenőrzések,
MVM Connect, BDPST/Tiborcz, Liget projekt, EPPO magyar ügyek összesítő,
EU agrártámogatások, Covid-közbeszerzések, MÁV/vasút, Simicska/Közgép,
KEA alapítványok, Garancsi/stadionok, Budapest Airport, Pécsi közbeszerzések.

---

## Lokális fejlesztés

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # dist/ mappa
```

## Deploy (manuális)

```bash
npm run build
npx wrangler pages deploy dist --project-name=ner-tracker
```

GitHub Actions: "Daily News Scraper" → Run workflow

---

## Amit minden módosítás után meg kell tenni

1. Frissítsd ezt a `CLAUDE.md`-t ha struktúra/konvenció/lista változott
2. `git pull --rebase` majd `git push`
3. UI változásnál: trigger GitHub Actions workflow

# NER Tracker — Claude instrukciók

## Projekt áttekintés

Magyar kormányzati korrupciós ügyek nyilvántartása. React/Vite SPA, Python scraper, Cloudflare Pages hosting.

- **Élő oldal:** https://ner-tracker.pages.dev
- **GitHub repo:** https://github.com/Szolke/ner-tracker
- **Branch:** `main`

---

## Tech stack

| Réteg | Technológia |
|-------|-------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Adatok | `public/data/news.json` (statikus JSON, ezt olvassa a React) |
| Scraper | Python 3.11 (`scripts/scraper.py`) — napi RSS fetch |
| Hosting | Cloudflare Pages (Direct Upload módban) |
| CI/CD | GitHub Actions (`.github/workflows/scraper.yml`) |

---

## Repo struktúra

```
ner-tracker/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       ← FŐ UI komponens (4 tab + modal)
│   │   ├── LiveFeed.jsx        ← Jobb oldali hírfolyam
│   │   ├── Timeline.jsx        ← Idővonal tab
│   │   ├── NetworkGraph.jsx    ← Nyomozások tab
│   │   ├── ChoroplethMap.jsx   ← Hőtérkép (Idővonalon)
│   │   ├── EUComparison.jsx    ← EU korrupciós index összehasonlítás
│   │   └── ...egyéb komponensek
│   ├── App.jsx
│   ├── i18n.jsx                ← Magyar/angol fordítások (useLang hook)
│   └── main.jsx
├── public/
│   └── data/news.json          ← Adatfájl (scraper írja, React olvassa)
├── data/
│   ├── news.json               ← Scraper output (backup)
│   └── archive/                ← Napi archív (YYYY-MM-DD.json)
├── scripts/
│   ├── scraper.py              ← Python RSS scraper
│   └── rss-proxy.js            ← Cloudflare Worker proxy
├── .github/workflows/
│   └── scraper.yml             ← CI/CD pipeline
├── wrangler.toml               ← Cloudflare Pages config
└── package.json
```

---

## CI/CD pipeline

A `scraper.yml` workflow minden nap 8:00 UTC-kor fut (és manuálisan indítható):

1. Python scraper → frissíti `public/data/news.json`
2. `git fetch origin && git reset --soft origin/main` → commit mindig a legfrissebb remote HEAD-re épül
3. `git push` → adatok felkerülnek GitHub-ra
4. `npm install && npm run build` → Vite build (`dist/`)
5. `wrangler pages deploy dist` → Cloudflare Pages-re feltöltés

### Szükséges GitHub Secrets

| Secret | Leírás |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | **Account → Cloudflare Pages → Edit** jogosultság |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard jobb sáv |
| `PROXY_URL` | Cloudflare Worker proxy URL az RSS kérésekhez |
| `RESEND_API_KEY` | (opcionális) Email értesítőhöz |
| `NOTIFY_EMAIL` | (opcionális) Email értesítő cím |

### Fontos: push a workflow-ban

```bash
git fetch origin
git reset --soft origin/main   # staged változások megmaradnak, HEAD = remote HEAD
git commit -m "..."
git push                       # mindig fast-forward
```

---

## Scraper szűrőlogika

### NER_CORE (kötelező — legalább egy)
Konkrét NER-személyek és intézmények: `fidesz`, `orbán`, `mészáros`, `rogán`, `tiborcz`, `olaf`, `eppo`, `elios`, `közgép`, `quaestor`, `mediaworks`, `felcsút`, `pegasus`, `paks`, `közbeszerzési`, stb.

### SECONDARY (kötelező — legalább egy)
Korrupciós indikátorok: `korrupció`, `visszaélés`, `nyomozás`, `vizsgálat`, `milliárd`, `sikkasztás`, `vesztegetés`, `oligarcha`, stb.

### EXCLUDE
Kizárt témák: külföldi kormányok, katonai balesetek, sport hírek, stb.

### Dátum szűrő
Csak 2010-01-01 utáni ügyek (Fidesz-éra kezdete).

### merge() — aktív tisztítás
Minden futásnál a meglévő ügyek is átmennek a szűrőn: az irrelevánssá váló régi cikkek automatikusan eltávolítódnak.

### RSS Források (14 feed)
Telex, HVG, 444, Direkt36, Átlátszó (2 feed), Abcúg, G7, Magyar Narancs, Mérce, Partizán, Szabad Európa, Átlátszó/pályázat, HVG Gazdaság

---

## Adatformátum

### `news.json` séma

```json
{
  "metadata": {
    "last_updated": "2026-06-28T11:54:01Z",
    "total_cases": 47,
    "sources": ["telex.hu", "hvg.hu", ...]
  },
  "cases": [{
    "id": "sc_xxxxxxxx",
    "title": "Cím",
    "description": "Leírás (max 400 kar)",
    "link": "https://...",
    "date": "2026-06-25",
    "source": "Telex",
    "category": "korrupció|pénzügyi|közbeszerzés",
    "status": "active|investigation|closed|appeal",
    "region": "Budapest|Pest|...",
    "coordinates": [47.4979, 19.0402],
    "amount_huf": 4500000000,
    "verified": false,
    "media_count": 3,
    "tags": [],
    "involved_persons": [
      {"id": "p_xxxxxx", "name": "Teljes Név", "position": "Pozíció"}
    ]
  }],
  "investigations": [...]
}
```

**amount_huf:** `null` ha nem ismert (NE használj `500000000` placeholdert!)

---

## Seed ügyek vs. scraped ügyek

- **Seed ügyek** (`id`: `seed_xxx_001`): kézzel felvett historikus ügyek, mindig az adatbázisban maradnak, a scraper szűrőjén is átmennek
- **Scraped ügyek** (`id`: `sc_xxxxxxxx`): automatikusan gyűjtött RSS cikkek, naponta frissülnek

Új seed ügy hozzáadásához: szerkeszd a `public/data/news.json`-t és a `data/news.json`-t is.

---

## UI konvenciók

### Pénznem formátum
**MINDIG:** `8 547,4 Mrd HUF`

```js
const mrd  = huf => huf != null
  ? (huf/1e9).toLocaleString('hu-HU', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' Mrd HUF'
  : 'Összeg ismeretlen';
const mrdS = huf => huf != null
  ? (huf/1e9).toLocaleString('hu-HU', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' Mrd HUF'
  : '—';
```

Ne: `Mrd Ft`, `MrdB`, `milliárd HUF`, `500 000 000` placeholder.

### Státusz értékek
`active` · `investigation` · `closed` · `appeal`

### Kategóriák
`korrupció` · `pénzügyi` · `közbeszerzés`

### i18n
Minden UI szöveg `tr.xxx` kulcsot használ (`useLang()` hook, `i18n.jsx`). Új szövegeknél mindig add hozzá a magyar ÉS angol fordítást is.

### React hooks szabály
Minden `useState`, `useCallback`, `useMemo`, `useEffect` hook az early return (`if (!data) return ...`) ELŐTT kell legyen a Dashboard komponensben.

### Modal (CaseDetail)
Az ügy részletes nézete modálként jelenik meg (fixed overlay, backdrop blur). A `CaseDetail` komponens a Dashboard `return()` elejére van helyezve `<>` fragment-be csomagolva, nem a tab tartalmán belül.

---

## Lokális fejlesztés

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # dist/ mappa
```

---

## Deploy (manuális)

```bash
npm run build
npx wrangler pages deploy dist --project-name=ner-tracker
```

Vagy: GitHub Actions → "Daily News Scraper" → Run workflow

---

## Minden módosítás után

1. Frissítsd ezt a `CLAUDE.md`-t ha struktúra/konvenció változott
2. Commitolj és pusholj (`git pull --rebase` előtte ha szükséges)
3. Ha UI változott: trigger a GitHub Actions workflow-t

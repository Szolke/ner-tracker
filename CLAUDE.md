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
| Adatok | `/public/data/news.json` (statikus JSON, ezt olvassa a React) |
| Scraper | Python 3.11 (`scripts/scraper.py`) — napi RSS fetch |
| Hosting | Cloudflare Pages (Direct Upload módban) |
| CI/CD | GitHub Actions (`.github/workflows/scraper.yml`) |

---

## Repo struktúra

```
ner-tracker/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       ← FŐ UI komponens (4 tab)
│   │   ├── LiveFeed.jsx        ← Jobb oldali hírfolyam
│   │   ├── Timeline.jsx        ← Idővonal tab
│   │   ├── NetworkGraph.jsx    ← Nyomozások tab
│   │   └── ...egyéb komponensek
│   ├── App.jsx
│   ├── i18n.jsx                ← Magyar/angol fordítások
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
├── wrangler.worker.toml        ← Cloudflare Worker config
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## CI/CD pipeline

A `scraper.yml` workflow minden nap 8:00 UTC-kor fut (és manuálisan indítható):

1. Python scraper lefut → frissíti `public/data/news.json`
2. `git fetch origin && git reset --soft origin/main` → commit mindig a legfrissebb remote HEAD-re épül
3. `git push` → adatok felkerülnek GitHub-ra
4. `npm install && npm run build` → Vite build elkészül (`dist/`)
5. `wrangler pages deploy dist` → Cloudflare Pages-re feltöltés

### Szükséges GitHub Secrets

| Secret | Leírás |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token — **Account → Cloudflare Pages → Edit** jogosultság kell |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID (dashboard jobb sáv) |
| `PROXY_URL` | Cloudflare Worker proxy URL az RSS kérésekhez |
| `RESEND_API_KEY` | (opcionális) Email értesítőhöz |
| `NOTIFY_EMAIL` | (opcionális) Email értesítő cím |

### Fontos: push a workflow-ban

A scraper a checkout SHA-ból indul, ami régebbi lehet a remote HEAD-nél. Ezért a commit lépésben:

```bash
git fetch origin
git reset --soft origin/main   # staged változások megmaradnak, HEAD = remote HEAD
git commit -m "..."
git push                       # mindig fast-forward
```

---

## Adatformátum

### `news.json` séma

```json
{
  "metadata": {
    "last_updated": "2026-06-28T11:54:01Z",
    "total_cases": 34,
    "sources": ["telex.hu", "hvg.hu", "444.hu", "direkt36.hu", "atlatszo.hu"]
  },
  "cases": [{
    "id": "telex-2026-06-25-001",
    "title": "Cím",
    "description": "Leírás",
    "link": "https://...",
    "date": "2026-06-25",
    "source": "telex.hu",
    "category": "korrupció|pénzügyi|közbeszerzés",
    "status": "active|investigation|closed|appeal",
    "region": "Budapest|Pest megye|Országos|...",
    "amount_huf": 4500000000,
    "verified": false,
    "media_count": 3,
    "tags": [],
    "involved_persons": [
      {"id": "p1", "name": "Teljes Név", "position": "Pozíció"}
    ]
  }],
  "investigations": [{
    "id": "inv_001",
    "title": "Nyomozás neve",
    "status": "active|investigation",
    "investigating_authority": "Szerv neve",
    "estimated_closure": "2027-03-15",
    "involved_amount": 4500000000,
    "key_figures": [],
    "description": "Leírás"
  }]
}
```

---

## UI konvenciók

### Pénznem formátum

**Mindig:** `8 547,4 Mrd HUF` — a `mrd()` és `mrdS()` függvények (Dashboard.jsx:55-56) ezt adják vissza.

```js
const mrd  = huf => (huf/1e9).toLocaleString('hu-HU', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' Mrd HUF';
const mrdS = huf => (huf/1e9).toLocaleString('hu-HU', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' Mrd HUF';
```

Ne használj `Mrd Ft`, `MrdB`, `milliárd HUF` formátumokat.

### Nyomozás szám

- A banner és a "Nyomozás" metrika kártya **mindkettő** `data.investigations.length`-et használ (nem a `cases.filter(status==='investigation')` értéket).

### Státusz értékek

| Kód | Magyar felirat |
|-----|---------------|
| `active` | Aktív |
| `investigation` | Nyomozás |
| `closed` | Lezárult |
| `appeal` | Fellebbezés |

### Kategóriák

`korrupció` · `pénzügyi` · `közbeszerzés`

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

## Amit minden módosításnál meg kell tenni

1. Frissítsd ezt a `CLAUDE.md` fájlt, ha a struktúra, konvenciók vagy pipeline változott
2. Commitolj és pusholj (`git pull --rebase` előtte ha szükséges)
3. Ha UI változott: trigger a GitHub Actions workflow-t a deploy-hoz

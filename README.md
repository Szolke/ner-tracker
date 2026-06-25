# 🚀 NER Tracker - Közérdekű Adatok Dashboard

Valós időben összegyűjtött, automatikusan frissített magyar nyelvű hírek a kormányzati korrupciós ügyekről.

## 🏗️ Architektúra

```
GitHub Actions (napi scraping 8:00 UTC)
    ↓
RSS feeds (Telex, 444, HVG)
    ↓
data/news.json
    ↓
React Dashboard (Cloudflare Pages)
```

## 🚀 Gyors Start

### 1️⃣ Cloudflare Pages Deploy

```
1. https://pages.cloudflare.com
2. "Create a project" → "Connect to Git"
3. GitHub repo kiválasztása
4. Build command: npm run build
5. Build output: dist
6. Deploy!
```

### 2️⃣ Helyi Fejlesztés

```bash
npm install
npm run dev
# Opens http://localhost:3000
```

### 3️⃣ Production Build

```bash
npm run build
# Output: dist/
```

## 📊 Funkciók

- ✅ Valós idejű keresés
- ✅ Tag szűrés
- ✅ Forrás szűrés
- ✅ Napi automatikus frissítés
- ✅ Dark mode
- ✅ Mobil responsive

## 🛠️ Technológia

- **Frontend:** React 18 + Tailwind CSS + Vite
- **Backend:** Python (RSS + Web scraping)
- **Automation:** GitHub Actions (napi)
- **Hosting:** Cloudflare Pages
- **Storage:** GitHub (JSON)

## 📝 Scraper Beállítás

`scripts/scraper.py` - RSS és web scraping

### Szűrési Logika:
- Fidesz/NER + korrupció/nyomozás/pénz kulcsszavak

## 🔄 GitHub Actions

`.github/workflows/scraper.yml` - Napi futtatás 8:00 UTC

## 💰 Költség

✅ **$0/hó** - Teljesen ingyenes!

## 📋 Fájlstruktúra

```
├── src/
│   ├── components/Dashboard.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
│   └── index.html
├── data/
│   └── news.json
├── scripts/
│   └── scraper.py
├── .github/workflows/
│   └── scraper.yml
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🎉 Kész!

Cloudflare Pages-en deploy-olva és GitHub-ról automata update!

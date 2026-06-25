# 🤖 Claude Projekt Instrukciók — NER Tracker

## 🔑 Kulcs adatok (tokenek a Claude memóriában tárolva)

| | |
|---|---|
| **GitHub repo** | https://github.com/Szolke/ner-tracker |
| **Élő oldal** | https://ner-tracker.pages.dev |
| **GitHub token** | Lásd Claude memória |
| **Cloudflare webhook** | Lásd Claude memória |

> ⚠️ A Cloudflare webhook-ot a bash_tool NEM tudja hívni (domain tiltva).  
> Deploy trigger: Szolke kézzel a Cloudflare dashboardon, VAGY GitHub push automatikusan.

---

## 📁 Repo struktúra

```
ner-tracker/
├── src/components/Dashboard.jsx   ← FŐ KOMPONENS (3 tab UI)
├── public/data/news.json          ← STATIKUS ADAT (React ezt olvassa)
├── data/news.json                 ← SCRAPER OUTPUT
├── scripts/scraper.py             ← Python scraper
├── .github/workflows/scraper.yml  ← Napi 8:00 UTC cron
├── wrangler.toml                  ← Cloudflare build config
├── vite.config.js / tailwind / package.json
```

---

## 🛠️ GitHub API minta (SHA kötelező frissítésnél!)

```python
import subprocess, json, base64

TOKEN = "<env: GITHUB_TOKEN>"
BASE = "https://api.github.com/repos/Szolke/ner-tracker/contents"

def get_sha(path):
    cmd = ["curl", "-s", "-H", f"Authorization: token {TOKEN}",
           "-H", "Accept: application/vnd.github.v3+json", f"{BASE}/{path}"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(r.stdout).get("sha", "")

def upload(path, content_str, msg, sha=None):
    body = {"message": msg, "content": base64.b64encode(content_str.encode()).decode()}
    if sha: body["sha"] = sha
    cmd = ["curl", "-s", "-X", "PUT",
           "-H", f"Authorization: token {TOKEN}",
           "-H", "Accept: application/vnd.github.v3+json",
           f"{BASE}/{path}", "-d", json.dumps(body, ensure_ascii=False)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    resp = json.loads(r.stdout)
    ok = "commit" in resp
    print(f"{'OK' if ok else 'FAIL'}: {path}" + (f" ({resp['commit']['sha'][:8]})" if ok else f" — {resp.get('message','')}"))
    return ok
```

---

## 📊 news.json séma

```json
{
  "cases": [{
    "id": "telex-2026-06-25-001",
    "title": "...", "description": "...", "link": "...",
    "date": "2026-06-25T08:30:00+00:00",
    "source": "telex.hu",
    "category": "korrupció|pénzügyi|közbeszerzés",
    "status": "active|investigation|closed|appeal",
    "region": "Budapest|Pest megye|Országos",
    "amount_huf": 4500000000,
    "tags": [], "involved_persons": [{"id":"p1","name":"Neve","position":"Pozíciója"}]
  }],
  "investigations": [{
    "id": "inv_001", "title": "...", "status": "active|investigation",
    "investigating_authority": "...", "estimated_closure": "2027-03-15",
    "involved_amount": 4500000000, "key_figures": [], "description": "..."
  }]
}
```

---

## 🎨 Dashboard (3 tab)

- 📊 **Áttekintés** — 5 metrika + legújabb ügyek
- 📋 **Ügyek** — Szűrés (keresés/régió/státusz/kategória) + kártyák
- 🔍 **Nyomozások** — Részletes nyomozás kártyák

---

## ⚡ Tipikus workflow

```
1. SHA lekérés → upload() → új commit
2. Cloudflare auto-detect → npm run build → deploy
3. Ha nem auto: Szolke Cloudflare dashboardon Retry
```

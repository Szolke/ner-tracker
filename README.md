# NER Tracker

Magyar kormányzati korrupciós ügyek nyilvántartása.

**Élő oldal:** https://ner-tracker.pages.dev

## RSS Scraper Proxy beállítása

A GitHub Actions runner Azure IP-jéről sok magyar híroldal blokkolja az RSS kéréseket.
A Cloudflare Worker proxy megkerüli ezt.

### Lépések:

1. **Cloudflare Worker deploy:**
   ```bash
   npm install -g wrangler
   wrangler login
   wrangler deploy scripts/rss-proxy.js --config wrangler.worker.toml
   ```
   A kapott URL: `https://ner-tracker-rss-proxy.<accountname>.workers.dev`

2. **GitHub Secret beállítása:**
   GitHub repo → Settings → Secrets → New repository secret
   - Name: `PROXY_URL`
   - Value: `https://ner-tracker-rss-proxy.<accountname>.workers.dev`

3. **scraper.yml frissítése** (már tartalmazza):
   ```yaml
   - name: Run scraper
     env:
       PROXY_URL: ${{ secrets.PROXY_URL }}
     run: python scripts/scraper.py
   ```

## Email értesítő beállítása

1. Regisztrálj: https://resend.com (ingyenes: 3000 email/hó)
2. GitHub Secrets:
   - `RESEND_API_KEY` = API kulcs
   - `NOTIFY_EMAIL` = értesítési email

## Admin panel

https://ner-tracker.pages.dev/admin (jelszó: ner2026admin)

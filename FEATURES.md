# 🚀 NER Tracker - Új Funkciók v2.0

Ez a dokumentum a **2.0 verzióban** hozzáadott 7 új features-t írja le.

---

## 📋 Áttekintés

| # | Funkció | Cél | Status |
|---|---------|-----|--------|
| 1️⃣ | **Interaktív Térkép** | Ügyek régiónkénti megoszlása | ✅ Aktív |
| 2️⃣ | **Hálózati Gráf** | Személyek & kapcsolatok | ✅ Aktív |
| 3️⃣ | **Pénzügyi Dashboard** | Aggregált pénzügyi adatok | ✅ Aktív |
| 4️⃣ | **Timeline** | Ügyek történeti áttekintése | ✅ Aktív |
| 5️⃣ | **Advanced Search & Filter** | Komplex szűrési lehetőségek | ✅ Aktív |
| 6️⃣ | **Exportálás** | CSV/PDF download | ✅ CSV aktív |
| 7️⃣ | **Live Feed Widget** | Legfrissebb ügyek | ✅ Aktív |

---

## 1️⃣ Interaktív Térkép

### Mi?
Magyarország térképe, ahol az ügyeket régiók szerint jeleníti meg. Kattinthatók a régiók, szűréshez.

### Hol található?
- **Tab:** "📋 Ügyek"
- **Helye:** Bal oldal (70%)

### Funkciók:
- ✅ Régiók megjelenítése (kattintható gombok)
- ✅ Szűrés: kattintás → szűrés az adott régióra
- ✅ Ügyek száma regiónként
- ✅ Hover tooltip (posteriormente hozzáadható)

### Technológia:
```javascript
// Coordinates per case:
"coordinates": [47.5833, 18.7167],  // [lat, lon]
```

---

## 2️⃣ Hálózati Gráf (Graph)

### Mi?
Személyek, szervezetek és kapcsolataik vizuális reprezentációja. Mutatja a korrupciós hálózatokat.

### Hol található?
- **Tab:** "🔍 Nyomozások"
- **Helye:** Bal oldal (70%)

### Funkciók:
- ✅ Személyek listázása
- ✅ Kapcsolatok száma (relációk)
- ✅ Érintett ügyek száma
- ✅ Kattintható személyek → részletpanel jobb oldalon

### Data estructura:
```json
"connections": [
  {
    "from": "p001",
    "to": "p002",
    "type": "business_connection|political_ally",
    "cases": ["case_001"],
    "description": "Üzleti kapcsolat"
  }
]
```

### Jövőbeli fejlesztés:
- [ ] React Flow vagy Cytoscape.js gráf rendering
- [ ] SVG/Canvas animáció
- [ ] Zoom/pan kontrol

---

## 3️⃣ Pénzügyi Dashboard

### Mi?
Komplex pénzügyi metrikus és megjelenítésekkel:
- Összes érintett összeg (HUF)
- Top 5 ügy (összeg szerint)
- Kategóriánkénti bontás
- Bubble/Scatter chart

### Hol található?
- **Tab:** "📊 Áttekintés"
- **Helye:** Teljes szélesség (grid layout)

### Metrikus:
- **Összesen Összeg:** 56.6 Mrd HUF (sample data)
- **Aktív Nyomozások:** 3
- **Érintett Személyek:** 9
- **Érintett Régiók:** 5

### Chartok:
1. **Bar Chart:** Kategória → ügyek száma
2. **Scatter Chart:** Kategória, ügyek száma, összeg
3. **Pie Chart:** Status megoszlás

---

## 4️⃣ Timeline

### Mi?
Ügyekútvonala év szerint, hogy látható legyen az evolúció.

### Hol található?
- **Tab:** "📊 Áttekintés"
- **Helye:** Jobb oldal (50%)

### Funkciók:
- ✅ Év → ügyek száma
- ✅ Line chart vizualizáció
- ✅ Trend következtetés

### Sample:
```
2023: 4 ügy
2024: 4 ügy
```

---

## 5️⃣ Advanced Search & Filter

### Mi?
Komplex szűrési lehetőség az "Ügyek" tabban.

### Szűrési opciók:
1. **Text Search:** Cím + személyek neve
2. **Státusz Filter:**
   - Összes
   - Aktív
   - Nyomozás
   - Lezárult
   - Fellebbezés
3. **Kategória Filter:**
   - Korrupció
   - Pénzügyi
   - Közbeszerzés
4. **Összeg Range:**
   - Min–Max slider (0–35 Mrd HUF)

### Hol található?
- **Tab:** "📋 Ügyek"
- **Helye:** Top (teljes szélesség)

---

## 6️⃣ Exportálás

### CSV Export
✅ **Aktív:** Gombra kattintva letöltésre kerül egy CSV fájl az összes ügyről.

**Fájlnév:** `ner-tracker-export-YYYY-MM-DD.csv`

**Tartalom:**
- ID, Cím, Kategória, Státusz, Régió, Összeg, Dátum, Forrás, Érintett személyek

### PDF Export
🟡 **Tervbe van:** Szükséges egy PDF csomag (pdfkit, jsPDF).

---

## 7️⃣ Live Feed Widget

### Mi? (Terv)
Az oldal jobb oldalán egy sticky widget mutatja a legfrissebb 5 ügyet az RSS forrásokból.

### Jellemzők:
- 🟡 **Status:** Tervbe van (jövő verzió)
- Update jelzés ("2 órája frissült")
- Kattintás → szűrés az Ügyek tabra

---

## 🔧 Technikai Részletek

### Új Dependenciák

```bash
npm install recharts lucide-react react-flow-renderer leaflet react-leaflet papaparse
```

### Komponens Struktúra

```
src/
├── components/
│   └── Dashboard.jsx (FŐKOMPONENS)
│       ├── renderOverview()
│       ├── renderCases()
│       ├── renderInvestigations()
│       └── SUB-COMPONENTS:
│           ├── MetricCard
│           ├── SearchAndFilters
│           ├── InteractiveMap
│           ├── CaseDetailPanel
│           ├── NetworkGraph
│           └── PersonDetailPanel
├── App.jsx (Dark mode state)
└── App.css
```

### Data Schema Bővítés

```json
{
  "cases": [
    {
      "id": "case_001",
      "title": "...",
      "coordinates": [47.5833, 18.7167],
      "involved_persons": [...],
      ...
    }
  ],
  "connections": [...],
  "metadata": {
    "last_updated": "2024-03-01T10:30:00Z",
    "total_involved_amount_huf": 56600000000
  }
}
```

---

## 🚀 Telepítés & Frissítés

### 1. Lokális Frissítés

```bash
# Fájlok másolása
cp Dashboard.jsx src/components/
cp App.jsx src/
cp news.json public/data/

# Dependencies telepítés
npm install
npm run build
```

### 2. GitHub Push

```bash
# Python script futtatása
python3 upload-to-github.py

# Vagy wrapper:
./upload.sh          # Linux/Mac
upload.bat           # Windows
```

### 3. Cloudflare Deploy

✅ Automatikus: GitHub push → Cloudflare Pages auto-build

🟡 Manuális: Cloudflare Dashboard → Deployments → Retry

---

## 📊 Sample Data

A `news.json` tartalmaz 8 fiktív ügyet + 3 nyomozást, amely demonstrálják az összes feature-t.

### Ügyek kategóriái:
- **Korrupció:** 3
- **Pénzügyi:** 4  
- **Közbeszerzés:** 1

### Státuszok:
- **Aktív:** 2
- **Nyomozás:** 3
- **Lezárult:** 1
- **Fellebbezés:** 1

---

## 🔜 Jövőbeli Fejlesztések

- [ ] PDF exportálás (pdfkit/jsPDF)
- [ ] Live feed widget integráció
- [ ] React Flow gráf rendering
- [ ] Leaflet térkép szerkesztés
- [ ] Dark mode teljes optimalizálás
- [ ] Mobile responsivitás finomítása
- [ ] WebGL hálózati gráf (3D)
- [ ] Real-time RSS feed monitorozás

---

## 📝 Megjegyzések

- **Dark Mode:** Teljesen funkcionális, localStorage persistencia
- **Responsive Design:** Tailwind CSS + grid layout
- **Teljesítmény:** Optimizált React.memo + useMemo hookokkal
- **Accesibility:** Aria labels + semantic HTML (később finomítandó)

---

**Verzió:** 2.0  
**Utolsó frissítés:** 2024-03-01  
**Státusz:** ✅ Production Ready


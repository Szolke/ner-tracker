import React, { createContext, useContext, useState } from 'react';

const T = {
  hu: {
    // App
    appTitle: 'NER Tracker',
    appSubtitle: 'Magyar kormányzati korrupciós ügyek nyilvántartása',
    lastUpdated: 'Frissítve',
    loadingText: 'Adatok betöltése...',
    // Tabs
    overview: 'Áttekintés', cases: 'Ügyek', timeline: 'Idővonal',
    investigations: 'Nyomozások',
    // Banner
    total: 'Összesen', publicFunds: 'érintett közpénz',
    caseUnit: 'ügy', investigationUnit: 'nyomozás', personUnit: 'érintett személy',
    // Metric cards
    totalCases: 'Ügyek', activeInvestigation: 'Nyomozás',
    affectedPersons: 'Érintett személyek', totalAmount: 'Összes összeg',
    affectedRegions: 'Érintett régiók',
    // Charts
    categoryChart: 'Kategória', yearlyChart: 'Évente',
    statusChart: 'Státusz megoszlás', amountVsCases: 'Összeg vs. Ügyek (Mrd HUF)',
    recentCases: 'Legújabb ügyek',
    // Cases filter
    searchPlaceholder: 'Keresés ügy vagy személy neve szerint...',
    status_label: 'Státusz', category_label: 'Kategória', max_label: 'Max',
    statusAll: 'Összes', catAll: 'Összes',
    catCorruption: 'Korrupció', catFinancial: 'Pénzügyi', catProcurement: 'Közbeszerzés',
    displayedCases: 'ügy megjelenítve',
    // Map
    interactiveMap: 'Interaktív térkép', mapClickHint: 'kattints a körökre',
    // Status labels
    statusActive: 'Aktív', statusInvestigation: 'Nyomozás',
    statusClosed: 'Lezárult', statusAppeal: 'Fellebbezés',
    // Timeline tab
    caseTimeline: 'Ügyek idővonala',
    heatmapTitle: 'Összeg-hőtérkép megyénként',
    euComparison: 'Magyarország az EU-ban – Korrupció & Jogállamiság',
    // Investigations tab
    networkGraph: 'Kapcsolati háló',
    networkHint: 'fizikai szimuláció · kattints',
    ongoing: 'Folyamatban', pending: 'Függőben',
    authority: 'Hatóság', closure: 'Lezárás',
    // Case detail
    watchedCases: 'Követett ügyek',
    removeCase: 'Eltávolítás a követettekből', followCase: 'Követés',
    share: 'Link másolása / Megosztás',
    involvedPersons: 'Érintett személyek', relatedCases: 'Kapcsolódó ügyek',
    details: 'Részletek',
    sourceLabel: 'Forrás', dateLabel: 'Dátum', amountLabel: 'Összeg',
    regionLabel: 'Régió',
    documents: 'Dokumentumok', viewSource: '→ Forrás megtekintése',
    linkCopied: 'Link másolva: ',
    // Person detail
    involvedCases: 'Érintett ügyek', connections: 'Kapcsolatok',
    noConnections: 'Nincs rögzített kapcsolat',
    businessConn: '🤝 Üzleti', politicalConn: '🏛️ Politikai',
    // Timeline
    play: 'Lejátszás', pause: 'Megállítás', allCases: 'Összes ügy',
    playing: 'Lejátszás…', dragOrScroll: '← húzd vagy görgess →',
    // Heatmap scale
    scaleMin: 'Kevés', scaleMax: 'Sok / Nagy összeg',
    // EU comparison
    huCpi: 'Magyarország CPI 2023', cpiScale: '100-ból (0 = legsúlyosabb)',
    euAvgCpi: 'EU átlag CPI', huBehind: 'ponttal elmarad',
    euRanking: 'Sorrend az EU-ban', euLaggards: 'Sereghajtók között',
    euChartTitle: 'Transparency International CPI 2023 – EU tagállamok',
    euSource: 'Forrás: Transparency International Corruption Perceptions Index 2023',
    // Amounts
    unknownAmount: 'Összeg ismeretlen', unknownShort: '—',
    // Export
    exportCSV: 'CSV', exportPDF: 'PDF',
    verified: 'Ellenőrzött', unverified: 'Nem ellenőrzött', scraped: 'Scraper',
    verifiedTitle: 'Forrás-ellenőrzött', scrapedTitle: 'Scraper által generált',
    articleCount: 'cikk', follow: 'Követés', unfollow: 'Eltávolítás',
  },
  en: {
    // App
    appTitle: 'NER Tracker',
    appSubtitle: 'Hungarian government corruption case tracker',
    lastUpdated: 'Updated',
    loadingText: 'Loading data...',
    // Tabs
    overview: 'Overview', cases: 'Cases', timeline: 'Timeline',
    investigations: 'Investigations',
    // Banner
    total: 'Total', publicFunds: 'public funds at risk',
    caseUnit: 'case', investigationUnit: 'investigation', personUnit: 'person involved',
    // Metric cards
    totalCases: 'Cases', activeInvestigation: 'Investigations',
    affectedPersons: 'Persons involved', totalAmount: 'Total amount',
    affectedRegions: 'Regions affected',
    // Charts
    categoryChart: 'Category', yearlyChart: 'Yearly',
    statusChart: 'Status breakdown', amountVsCases: 'Amount vs. Cases (Mrd HUF)',
    recentCases: 'Recent cases',
    // Cases filter
    searchPlaceholder: 'Search by case name or person...',
    status_label: 'Status', category_label: 'Category', max_label: 'Max',
    statusAll: 'All', catAll: 'All',
    catCorruption: 'Corruption', catFinancial: 'Financial', catProcurement: 'Procurement',
    displayedCases: 'cases displayed',
    // Map
    interactiveMap: 'Interactive map', mapClickHint: 'click on circles',
    // Status labels
    statusActive: 'Active', statusInvestigation: 'Under investigation',
    statusClosed: 'Closed', statusAppeal: 'Appeal',
    // Timeline tab
    caseTimeline: 'Case timeline',
    heatmapTitle: 'Amount heatmap by county',
    euComparison: 'Hungary in the EU – Corruption & Rule of Law',
    // Investigations tab
    networkGraph: 'Network graph',
    networkHint: 'physics simulation · click',
    ongoing: 'Ongoing', pending: 'Pending',
    authority: 'Authority', closure: 'Closure',
    // Case detail
    watchedCases: 'Watched cases',
    removeCase: 'Remove from watchlist', followCase: 'Follow',
    share: 'Copy link / Share',
    involvedPersons: 'Involved persons', relatedCases: 'Related cases',
    details: 'Details',
    sourceLabel: 'Source', dateLabel: 'Date', amountLabel: 'Amount',
    regionLabel: 'Region',
    documents: 'Documents', viewSource: '→ View source',
    linkCopied: 'Link copied: ',
    // Person detail
    involvedCases: 'Involved cases', connections: 'Connections',
    noConnections: 'No connections recorded',
    businessConn: '🤝 Business', politicalConn: '🏛️ Political',
    // Timeline
    play: 'Play', pause: 'Pause', allCases: 'All cases',
    playing: 'Playing…', dragOrScroll: '← drag or scroll →',
    // Heatmap scale
    scaleMin: 'Low', scaleMax: 'High / Large amount',
    // EU comparison
    huCpi: 'Hungary CPI 2023', cpiScale: 'out of 100 (0 = most corrupt)',
    euAvgCpi: 'EU average CPI', huBehind: 'points behind EU avg',
    euRanking: 'EU ranking', euLaggards: 'Among laggards',
    euChartTitle: 'Transparency International CPI 2023 – EU member states',
    euSource: 'Source: Transparency International Corruption Perceptions Index 2023',
    // Amounts
    unknownAmount: 'Amount unknown', unknownShort: '—',
    // Export
    exportCSV: 'CSV', exportPDF: 'PDF',
    verified: 'Verified', unverified: 'Unverified', scraped: 'Auto-scraped',
    verifiedTitle: 'Source-verified', scrapedTitle: 'Auto-scraped',
    articleCount: 'articles', follow: 'Follow', unfollow: 'Remove',
  }
};

const LangContext = createContext({ lang:'hu', t: T.hu, setLang:()=>{} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('ner-lang') || 'hu'; } catch { return 'hu'; }
  });
  const switchLang = l => {
    setLang(l);
    try { localStorage.setItem('ner-lang', l); } catch {}
  };
  return (
    <LangContext.Provider value={{ lang, t: T[lang] || T.hu, setLang: switchLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
export default T;

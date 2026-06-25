import React, { createContext, useContext, useState } from 'react';

const T = {
  hu: {
    appTitle: 'NER Tracker',
    appSubtitle: 'Magyar kormányzati korrupciós ügyek nyilvántartása',
    overview: 'Áttekintés', cases: 'Ügyek', timeline: 'Idővonal',
    investigations: 'Nyomozások', totalAmount: 'Összes összeg',
    totalCases: 'Ügyek', activeInvestigation: 'Nyomozás',
    affectedPersons: 'Érintett személyek', affectedRegions: 'Érintett régiók',
    searchPlaceholder: 'Keresés ügy vagy személy neve szerint...',
    statusAll: 'Összes', statusActive: 'Aktív', statusInvestigation: 'Nyomozás',
    statusClosed: 'Lezárult', statusAppeal: 'Fellebbezés',
    catAll: 'Összes', catCorruption: 'Korrupció', catFinancial: 'Pénzügyi', catProcurement: 'Közbeszerzés',
    sourceLabel: 'Forrás', dateLabel: 'Dátum', amountLabel: 'Összeg',
    relatedCases: 'Kapcsolódó ügyek', involvedPersons: 'Érintett személyek',
    verified: 'Ellenőrzött', unverified: 'Nem ellenőrzött', scraped: 'Scraper',
    lastUpdated: 'Frissítve', showMore: 'Több', showLess: 'Kevesebb',
    investigation: 'Nyomozás', ongoing: 'Folyamatban', pending: 'Függőben',
    authority: 'Hatóság', closure: 'Lezárás',
    exportCSV: 'CSV', exportPDF: 'PDF',
  },
  en: {
    appTitle: 'NER Tracker',
    appSubtitle: 'Hungarian government corruption case tracker',
    overview: 'Overview', cases: 'Cases', timeline: 'Timeline',
    investigations: 'Investigations', totalAmount: 'Total amount',
    totalCases: 'Cases', activeInvestigation: 'Investigations',
    affectedPersons: 'Persons involved', affectedRegions: 'Regions affected',
    searchPlaceholder: 'Search by case name or person...',
    statusAll: 'All', statusActive: 'Active', statusInvestigation: 'Under investigation',
    statusClosed: 'Closed', statusAppeal: 'Appeal',
    catAll: 'All', catCorruption: 'Corruption', catFinancial: 'Financial', catProcurement: 'Procurement',
    sourceLabel: 'Source', dateLabel: 'Date', amountLabel: 'Amount',
    relatedCases: 'Related cases', involvedPersons: 'Involved persons',
    verified: 'Verified', unverified: 'Unverified', scraped: 'Auto-scraped',
    lastUpdated: 'Updated', showMore: 'More', showLess: 'Less',
    investigation: 'Investigation', ongoing: 'Ongoing', pending: 'Pending',
    authority: 'Authority', closure: 'Closure',
    exportCSV: 'CSV', exportPDF: 'PDF',
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

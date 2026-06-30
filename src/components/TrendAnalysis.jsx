import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';

const mrd = huf => (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF';

// Magyar éves átlagos fogyasztói árindex (KSH, %) — a CURRENT_YEAR-ig ismert/becsült értékek.
// Ezekből épül fel a kumulált deflátor, ami egy adott évi forintösszeget a CURRENT_YEAR-i
// vásárlóerőre számít át. Csak hozzávetőleges, tájékoztató jellegű korrekció.
const CURRENT_YEAR = 2026;
const INFLATION_HU = {
  2010:4.9, 2011:3.9, 2012:5.7, 2013:1.7, 2014:-0.2, 2015:-0.1, 2016:0.4,
  2017:2.4, 2018:2.8, 2019:3.4, 2020:3.3, 2021:5.1, 2022:14.5, 2023:17.6,
  2024:3.7, 2025:4.5, 2026:4.0,
};

// Kumulált deflátor egy adott évre: hányszorosára nőttek az árak az adott év óta CURRENT_YEAR-ig.
function deflatorTo(year) {
  let factor = 1;
  for (let y = year; y < CURRENT_YEAR; y++) {
    const rate = INFLATION_HU[y] ?? 4.0; // ismeretlen évekre 4%-os átlagot feltételezünk
    factor *= (1 + rate / 100);
  }
  return factor;
}

export default function TrendAnalysis({ data, darkMode }) {
  const [expanded, setExpanded] = useState(false);
  const [adjustInflation, setAdjustInflation] = useState(false);

  const analysis = useMemo(() => {
    if (!data?.cases?.length) return null;
    const cases = data.cases;

    // Group by year
    const byYear = {};
    cases.forEach(c => {
      const y = c.date.slice(0,4);
      if (!byYear[y]) byYear[y] = { count:0, amount:0, amountAdjusted:0, korrupció:0, pénzügyi:0, közbeszerzés:0 };
      byYear[y].count++;
      byYear[y].amount += c.amount_huf || 0;
      byYear[y].amountAdjusted += (c.amount_huf || 0) * deflatorTo(+y);
      byYear[y][c.category]++;
    });
    const years = Object.entries(byYear).sort();
    const yearlyAdjusted = years.map(([year, v]) => ({
      year,
      nominal: +(v.amount/1e9).toFixed(1),
      adjusted: +(v.amountAdjusted/1e9).toFixed(1),
    }));

    // Trend: last 2 years
    const last = years[years.length-1]?.[1];
    const prev = years[years.length-2]?.[1];
    const countTrend = prev ? ((last?.count - prev?.count) / prev?.count * 100) : 0;
    const amountTrend = prev ? ((last?.amount - prev?.amount) / prev?.amount * 100) : 0;

    // Top region
    const regionCount = {};
    cases.forEach(c => { regionCount[c.region] = (regionCount[c.region]||0) + 1; });
    const topRegion = Object.entries(regionCount).sort((a,b)=>b[1]-a[1])[0];

    // Most common category
    const catCount = {};
    cases.forEach(c => { catCount[c.category] = (catCount[c.category]||0) + 1; });
    const topCat = Object.entries(catCount).sort((a,b)=>b[1]-a[1])[0];

    // Average case amount
    const avgAmount = cases.reduce((s,c)=>s+(c.amount_huf||0),0) / cases.length;

    // Insights
    const insights = [];

    if (countTrend > 20) insights.push({ type:'warn', text:`Az ügyek száma ${countTrend.toFixed(0)}%-kal nőtt az előző évhez képest — növekvő tendencia.` });
    else if (countTrend < -20) insights.push({ type:'good', text:`Az ügyek száma ${Math.abs(countTrend).toFixed(0)}%-kal csökkent az előző évhez képest.` });
    else insights.push({ type:'neutral', text:`Az ügyek száma az elmúlt két évben stabil maradt.` });

    if (amountTrend > 30) insights.push({ type:'warn', text:`Az érintett összegek ${amountTrend.toFixed(0)}%-kal emelkedtek — az ügyek egyre nagyobb közpénzt érintenek.` });

    insights.push({ type:'info', text:`A legtöbb ügy ${topRegion?.[0]} régióban koncentrálódik (${topRegion?.[1]} ügy).` });
    insights.push({ type:'info', text:`Leggyakoribb kategória: ${topCat?.[0]} (${topCat?.[1]} ügy, ${(topCat?.[1]/cases.length*100).toFixed(0)}%).` });
    insights.push({ type:'info', text:`Egy ügy átlagos érintettsége: ${mrd(avgAmount)}.` });

    const activeCount = cases.filter(c=>c.status==='investigation').length;
    if (activeCount > cases.length * 0.3) {
      insights.push({ type:'warn', text:`Az ügyek ${(activeCount/cases.length*100).toFixed(0)}%-a jelenleg nyomozás alatt — magas az aktív vizsgálatok aránya.` });
    }

    const totalNominal  = years.reduce((s,[,v])=>s+v.amount,0);
    const totalAdjusted = years.reduce((s,[,v])=>s+v.amountAdjusted,0);
    if (totalAdjusted > 0 && years.length > 3) {
      const inflationGap = ((totalNominal - totalAdjusted) / totalAdjusted) * 100;
      if (Math.abs(inflationGap) > 15) {
        insights.push({ type:'info', text:`Inflációval korrigálva a teljes érintett összeg ${mrd(totalAdjusted)} ${CURRENT_YEAR}-os vásárlóerőn — a nyers (nominális) összeg ${inflationGap > 0 ? 'felülbecsüli' : 'alulbecsüli'} a tényleges gazdasági súlyt kb. ${Math.abs(inflationGap).toFixed(0)}%-kal.` });
      }
    }

    return { insights, years, yearlyAdjusted, last, prev, countTrend, amountTrend, topRegion, topCat, avgAmount };
  }, [data]);

  if (!analysis) return null;

  const iconFor = type => type==='warn' ? '⚠️' : type==='good' ? '✅' : type==='info' ? '📊' : '➡️';
  const colorFor = type => type==='warn' ? 'border-yellow-500/30 bg-yellow-500/10' : type==='good' ? 'border-green-500/30 bg-green-500/10' : 'border-blue-500/30 bg-blue-500/10';

  return (
    <div className={`rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}>
      <button onClick={()=>setExpanded(e=>!e)}
        className="w-full flex items-center justify-between p-5">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400"/>
          Adatalapú trendelemzés
          <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode?'bg-purple-500/20 text-purple-400':'bg-purple-100 text-purple-600'}`}>
            Auto
          </span>
        </h3>
        {expanded ? <ChevronUp className="w-4 h-4 opacity-50"/> : <ChevronDown className="w-4 h-4 opacity-50"/>}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Trend indicators */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg flex items-center gap-3 ${darkMode?'bg-gray-700':'bg-gray-50'}`}>
              {analysis.countTrend > 5 ? <TrendingUp className="w-5 h-5 text-red-400"/> :
               analysis.countTrend < -5 ? <TrendingDown className="w-5 h-5 text-green-400"/> :
               <Minus className="w-5 h-5 text-gray-400"/>}
              <div>
                <p className="text-xs opacity-50">Ügyek trendje</p>
                <p className="font-bold text-sm">{analysis.countTrend > 0 ? '+' : ''}{analysis.countTrend.toFixed(0)}% YoY</p>
              </div>
            </div>
            <div className={`p-3 rounded-lg flex items-center gap-3 ${darkMode?'bg-gray-700':'bg-gray-50'}`}>
              {analysis.amountTrend > 5 ? <TrendingUp className="w-5 h-5 text-red-400"/> :
               analysis.amountTrend < -5 ? <TrendingDown className="w-5 h-5 text-green-400"/> :
               <Minus className="w-5 h-5 text-gray-400"/>}
              <div>
                <p className="text-xs opacity-50">Összeg trendje</p>
                <p className="font-bold text-sm">{analysis.amountTrend > 0 ? '+' : ''}{analysis.amountTrend.toFixed(0)}% YoY</p>
              </div>
            </div>
          </div>

          {/* Inflációval korrigált éves összegek */}
          <div className={`p-3 rounded-lg ${darkMode?'bg-gray-700':'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold opacity-60">Éves összegek — {adjustInflation ? `${CURRENT_YEAR}-os vásárlóerőn` : 'nominális (nyers) Ft-ban'}</p>
              <button onClick={()=>setAdjustInflation(v=>!v)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${adjustInflation
                  ? 'bg-purple-500/20 text-purple-400'
                  : (darkMode?'bg-gray-600 text-gray-300':'bg-gray-200 text-gray-600')}`}>
                {adjustInflation ? `✓ Inflációkövetés be (${CURRENT_YEAR})` : 'Inflációkövetés ki'}
              </button>
            </div>
            <div className="space-y-1">
              {analysis.yearlyAdjusted.map(y => {
                const value = adjustInflation ? y.adjusted : y.nominal;
                const max = Math.max(...analysis.yearlyAdjusted.map(yy => adjustInflation ? yy.adjusted : yy.nominal), 1);
                return (
                  <div key={y.year} className="flex items-center gap-2 text-xs">
                    <span className="w-10 opacity-50 flex-shrink-0">{y.year}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden bg-black/10">
                      <div className="h-full bg-purple-400 rounded-full" style={{width: `${(value/max*100).toFixed(0)}%`}}/>
                    </div>
                    <span className="w-20 text-right font-semibold flex-shrink-0">{value.toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})} Mrd</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] opacity-40 mt-2">
              {adjustInflation
                ? `KSH átlagos éves CPI-vel deflálva ${CURRENT_YEAR}-ra. Tájékoztató becslés, nem hivatalos statisztika.`
                : 'A nyers forintösszegek évek óta gyűlnek — a "Inflációkövetés" gombbal összehasonlíthatók azonos vásárlóerőn.'}
            </p>
          </div>

          {/* Insights */}
          <div className="space-y-2">
            {analysis.insights.map((ins,i) => (
              <div key={i} className={`p-3 rounded-lg border text-sm ${colorFor(ins.type)} ${darkMode?'text-gray-200':'text-gray-700'}`}>
                <span className="mr-2">{iconFor(ins.type)}</span>{ins.text}
              </div>
            ))}
          </div>

          <p className="text-xs opacity-30 text-right">Automatikusan számított a news.json alapján</p>
        </div>
      )}
    </div>
  );
}

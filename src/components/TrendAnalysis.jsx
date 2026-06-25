import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';

const mrd = huf => (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd Ft';

export default function TrendAnalysis({ data, darkMode }) {
  const [expanded, setExpanded] = useState(false);

  const analysis = useMemo(() => {
    if (!data?.cases?.length) return null;
    const cases = data.cases;

    // Group by year
    const byYear = {};
    cases.forEach(c => {
      const y = c.date.slice(0,4);
      if (!byYear[y]) byYear[y] = { count:0, amount:0, korrupció:0, pénzügyi:0, közbeszerzés:0 };
      byYear[y].count++;
      byYear[y].amount += c.amount_huf;
      byYear[y][c.category]++;
    });
    const years = Object.entries(byYear).sort();

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
    const avgAmount = cases.reduce((s,c)=>s+c.amount_huf,0) / cases.length;

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

    return { insights, years, last, prev, countTrend, amountTrend, topRegion, topCat, avgAmount };
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

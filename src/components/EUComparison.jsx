import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const CPI_DATA = [
  { country: 'Dánia',       score: 90 },
  { country: 'Finnország',  score: 87 },
  { country: 'Írország',    score: 77 },
  { country: 'Svédország',  score: 82 },
  { country: 'Hollandia',   score: 79 },
  { country: 'Németország', score: 78 },
  { country: 'Ausztria',    score: 71 },
  { country: 'Franciao.',   score: 71 },
  { country: 'Csehország',  score: 56 },
  { country: 'Lengyelorsz.',score: 54 },
  { country: 'Szlovákia',   score: 53 },
  { country: 'Görögország', score: 49 },
  { country: 'Románia',     score: 46 },
  { country: 'Bulgária',    score: 45 },
  { country: 'Magyarország',score: 42, highlight: true },
].sort((a, b) => b.score - a.score);

const EU_AVG = Math.round(CPI_DATA.reduce((s, c) => s + c.score, 0) / CPI_DATA.length);
const HU_RANK = CPI_DATA.findIndex(c => c.highlight) + 1;

export default function EUComparison({ darkMode }) {
  const [view, setView] = useState('cpi');

  const tt = {
    backgroundColor: darkMode ? '#1f2937' : '#fff',
    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
    color: darkMode ? '#f9fafb' : '#111'
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-4 rounded-xl border-l-4 border-red-500 ${darkMode?'bg-gray-700':'bg-red-50'}`}>
          <p className="text-xs opacity-50">Magyarország CPI 2023</p>
          <p className="text-3xl font-bold text-red-500">42</p>
          <p className="text-xs opacity-60 mt-1">100-ból (0 = legsúlyosabb)</p>
        </div>
        <div className={`p-4 rounded-xl border-l-4 border-blue-500 ${darkMode?'bg-gray-700':'bg-blue-50'}`}>
          <p className="text-xs opacity-50">EU átlag CPI</p>
          <p className="text-3xl font-bold text-blue-500">{EU_AVG}</p>
          <p className="text-xs opacity-60 mt-1">Magyarország {EU_AVG - 42} ponttal elmarad</p>
        </div>
        <div className={`p-4 rounded-xl border-l-4 border-orange-500 ${darkMode?'bg-gray-700':'bg-orange-50'}`}>
          <p className="text-xs opacity-50">Sorrend az EU-ban</p>
          <p className="text-3xl font-bold text-orange-500">{HU_RANK}. / {CPI_DATA.length}</p>
          <p className="text-xs opacity-60 mt-1">Sereghajtók között</p>
        </div>
      </div>

      <div className={`p-4 rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}>
        <p className="text-xs font-semibold opacity-50 mb-3">Transparency International CPI 2023 – EU tagállamok</p>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={CPI_DATA} layout="vertical"
            margin={{ top: 0, right: 50, bottom: 0, left: 90 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false}
              stroke={darkMode?'#374151':'#e5e7eb'}/>
            <XAxis type="number" domain={[0,100]}
              tick={{ fill: darkMode?'#9ca3af':'#555', fontSize: 10 }}/>
            <YAxis type="category" dataKey="country" width={85}
              tick={{ fill: darkMode?'#d1d5db':'#374151', fontSize: 10 }}/>
            <Tooltip contentStyle={tt}
              formatter={(v) => [`${v}/100`, 'CPI']}/>
            <Bar dataKey="score" radius={[0,4,4,0]} maxBarSize={20}>
              {CPI_DATA.map((entry, i) => (
                <Cell key={i} fill={entry.highlight ? '#ef4444'
                  : entry.score >= 70 ? '#10b981'
                  : entry.score >= 55 ? '#3b82f6'
                  : '#f59e0b'}/>
              ))}
              <LabelList dataKey="score" position="right"
                style={{ fill: darkMode?'#9ca3af':'#6b7280', fontSize: 10 }}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs opacity-30 text-right">
        Forrás: Transparency International Corruption Perceptions Index 2023
      </p>
    </div>
  );
}

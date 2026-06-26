import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Transparency International CPI 2023 (0=nagyon korrupt, 100=teljesen tiszta)
const CPI_DATA = [
  { country: 'Dánia',       code: 'DK', score: 90, eu: true },
  { country: 'Finnország',  code: 'FI', score: 87, eu: true },
  { country: 'Svédország',  code: 'SE', score: 82, eu: true },
  { country: 'Hollandia',   code: 'NL', score: 79, eu: true },
  { country: 'Németország', code: 'DE', score: 78, eu: true },
  { country: 'Ausztria',    code: 'AT', score: 71, eu: true },
  { country: 'Franciao.',   code: 'FR', score: 71, eu: true },
  { country: 'Írország',    code: 'IE', score: 77, eu: true },
  { country: 'Portugália',  code: 'PT', score: 61, eu: true },
  { country: 'Lengyelorsz.', code: 'PL', score: 54, eu: true },
  { country: 'Csehország',  code: 'CZ', score: 56, eu: true },
  { country: 'Szlovákia',   code: 'SK', score: 53, eu: true },
  { country: 'Görögország', code: 'GR', score: 49, eu: true },
  { country: 'Románia',     code: 'RO', score: 46, eu: true },
  { country: 'Bulgária',    code: 'BG', score: 45, eu: true },
  { country: 'Magyarország',code: 'HU', score: 42, eu: true, highlight: true },
].sort((a, b) => b.score - a.score);

const EU_AVG = Math.round(CPI_DATA.reduce((s, c) => s + c.score, 0) / CPI_DATA.length);

// Rule of Law Index 2023 (World Justice Project, 0-1 scale → ×100)
const ROL_DATA = [
  { country: 'Dánia',       score: 90 },
  { country: 'Finnország',  score: 87 },
  { country: 'Hollandia',   score: 83 },
  { country: 'Svédország',  score: 83 },
  { country: 'Németország', score: 76 },
  { country: 'Ausztria',    score: 75 },
  { country: 'Franciao.',   score: 69 },
  { country: 'Csehország',  score: 65 },
  { country: 'Lengyelorsz.', score: 58 },
  { country: 'Románia',     score: 52 },
  { country: 'Bulgária',    score: 49 },
  { country: 'Magyarország',score: 44, highlight: true },
].sort((a, b) => b.score - a.score);

export default function EUComparison({ darkMode }) {
  const [view, setView] = useState('cpi');
  const data = view === 'cpi' ? CPI_DATA : ROL_DATA;

  const tt = {
    backgroundColor: darkMode ? '#1f2937' : '#fff',
    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
    color: darkMode ? '#f9fafb' : '#111'
  };

  const huRank = CPI_DATA.filter(c => !c.highlight).filter(c => c.score > 42).length + 1;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-4 rounded-xl border-l-4 border-red-500 ${darkMode?'bg-gray-700':'bg-red-50'}`}>
          <p className="text-xs opacity-50">Magyarország CPI 2023</p>
          <p className="text-3xl font-bold text-red-500">42</p>
          <p className="text-xs opacity-60 mt-1">100-ból (0 = legsúlyosabb)</p>
        </div>
        <div className={`p-4 rounded-xl border-l-4 border-blue-500 ${darkMode?'bg-gray-700':'bg-blue-50'}`}>
          <p className="text-xs opacity-50">EU átlag CPI</p>
          <p className="text-3xl font-bold text-blue-500">{EU_AVG}</p>
          <p className="text-xs opacity-60 mt-1">{EU_AVG - 42} ponttal jobb az EU átlagnál</p>
        </div>
        <div className={`p-4 rounded-xl border-l-4 border-orange-500 ${darkMode?'bg-gray-700':'bg-orange-50'}`}>
          <p className="text-xs opacity-50">Sorrend az EU-ban</p>
          <p className="text-3xl font-bold text-orange-500">{huRank}. / {CPI_DATA.length}</p>
          <p className="text-xs opacity-60 mt-1">Sereghajtók között</p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex gap-2">
        {[
          { id:'cpi', label:'Korrupció Érzékelési Index (TI 2023)' },
          { id:'rol', label:'Jogállamiság Index (WJP 2023)' }
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              view === v.id
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className={`p-4 rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'} horizontal={false}/>
            <XAxis type="number" domain={[0, 100]}
              tick={{ fill: darkMode?'#9ca3af':'#555', fontSize: 11 }}
              tickFormatter={v => v}/>
            <YAxis type="category" dataKey="country" width={75}
              tick={({ x, y, payload }) => (
                <text x={x} y={y} dy={4} textAnchor="end" fontSize={11}
                  fill={payload.value === 'Magyarország' ? '#ef4444' : darkMode?'#d1d5db':'#374151'}
                  fontWeight={payload.value === 'Magyarország' ? 'bold' : 'normal'}>
                  {payload.value}
                </text>
              )}/>
            <Tooltip contentStyle={tt} formatter={(v) => [`${v}/100`, view==='cpi'?'CPI Score':'RoL Score']}/>
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((entry, i) => (
                <Cell key={i}
                  fill={entry.highlight ? '#ef4444' : entry.score >= 70 ? '#10b981' : entry.score >= 55 ? '#3b82f6' : entry.score >= 45 ? '#f59e0b' : '#f97316'}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Source */}
      <p className="text-xs opacity-30 text-right">
        Forrás: Transparency International CPI 2023 · World Justice Project Rule of Law Index 2023
      </p>
    </div>
  );
}

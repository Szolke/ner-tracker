import React, { useState } from 'react';

// Hexagonal grid layout of Hungarian counties (~geographic position)
// [id, name, col, row]
const COUNTY_GRID = [
  ['gyor',    'Győr-Moson-Sopron', 0, 0],
  ['komarom', 'Komárom-Esztergom', 1, 0],
  ['pest',    'Pest',              3, 0],
  ['nograd',  'Nógrád',            4, 0],
  ['heves',   'Heves',             5, 0],
  ['baz',     'Borsod-A-Z',        6, 0],
  ['szabolcs','Szabolcs-Sz-B',     7, 0],
  ['vas',     'Vas',               0, 1],
  ['veszprem','Veszprém',          1, 1],
  ['fejer',   'Fejér',             2, 1],
  ['budapest','Budapest',          3, 1],
  ['jnkszolnok','Jász-NK-Szolnok',5, 1],
  ['hajdu',   'Hajdú-Bihar',       6, 1],
  ['zala',    'Zala',              0, 2],
  ['somogy',  'Somogy',            1, 2],
  ['tolna',   'Tolna',             2, 2],
  ['bacskiskun','Bács-Kiskun',     3, 2],
  ['csongradcsanad','Csongrád-Cs.',4, 2],
  ['bekes',   'Békés',             5, 2],
  ['baranya', 'Baranya',           1, 3],
];

const REGION_MAP = {
  'Budapest':'budapest','Pest':'pest','Fejér':'fejer',
  'Győr-Moson-Sopron':'gyor','Vas':'vas','Veszprém':'veszprem',
  'Zala':'zala','Somogy':'somogy','Baranya':'baranya','Tolna':'tolna',
  'Bács-Kiskun':'bacskiskun','Csongrád-Csanád':'csongradcsanad',
  'Békés':'bekes','Hajdú-Bihar':'hajdu',
  'Szabolcs-Szatmár-Bereg':'szabolcs','Heves':'heves',
  'Jász-Nagykun-Szolnok':'jnkszolnok','Borsod-Abaúj-Zemplén':'baz',
  'Nógrád':'nograd','Komárom-Esztergom':'komarom',
};

function lerp(a, b, t) {
  const ah = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab2 = parseInt(a.slice(5,7),16);
  const bh = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb2 = parseInt(b.slice(5,7),16);
  const r = Math.round(ah+(bh-ah)*t).toString(16).padStart(2,'0');
  const g = Math.round(ag+(bg-ag)*t).toString(16).padStart(2,'0');
  const bl = Math.round(ab2+(bb2-ab2)*t).toString(16).padStart(2,'0');
  return `#${r}${g}${bl}`;
}

export default function ChoroplethMap({ cases, onCaseSelect, darkMode }) {
  const [hovered, setHovered] = useState(null);

  // Aggregate by county id
  const stats = {};
  cases.forEach(c => {
    const id = REGION_MAP[c.region];
    if (!id) return;
    if (!stats[id]) stats[id] = { amount: 0, count: 0, cases: [] };
    stats[id].amount += c.amount_huf;
    stats[id].count++;
    stats[id].cases.push(c);
  });

  const maxAmount = Math.max(1, ...Object.values(stats).map(s => s.amount));

  const HEX_W = 86, HEX_H = 72, GAP = 4;
  const cols = 8, rows = 4;
  const svgW = cols * (HEX_W + GAP) + HEX_W/2 + 20;
  const svgH = rows * (HEX_H + GAP) + 60;

  const hexPath = (cx, cy, w, h) => {
    const r = Math.min(w, h) * 0.12;
    return `M${cx-w/2+r},${cy-h/2} h${w-2*r} q${r},0 ${r},${r} v${h-2*r} q0,${r} -${r},${r} h-${w-2*r} q-${r},0 -${r},-${r} v-${h-2*r} q0,-${r} ${r},-${r} z`;
  };

  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-xl border overflow-x-auto ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}>
        <svg width={svgW} height={svgH} style={{display:'block', minWidth: svgW}}>
          {COUNTY_GRID.map(([id, name, col, row]) => {
            const offset = row % 2 === 1 ? (HEX_W+GAP)/2 : 0;
            const cx = 50 + col * (HEX_W + GAP) + offset;
            const cy = 36 + row * (HEX_H + GAP);
            const s = stats[id];
            const t = s ? Math.pow(s.amount / maxAmount, 0.5) : 0;
            const fill = s
              ? lerp(darkMode ? '#1e3a5f' : '#dbeafe', '#ef4444', t)
              : darkMode ? '#1f2937' : '#f3f4f6';
            const isHov = hovered === id;
            const isBudapest = id === 'budapest';

            return (
              <g key={id}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => s?.cases[0] && onCaseSelect && onCaseSelect(s.cases[0])}
                style={{cursor: s ? 'pointer' : 'default'}}>
                <path
                  d={hexPath(cx, cy, isBudapest ? HEX_W*1.1 : HEX_W, isBudapest ? HEX_H*1.1 : HEX_H)}
                  fill={fill}
                  stroke={isHov ? 'white' : darkMode?'#374151':'#d1d5db'}
                  strokeWidth={isHov ? 2 : 1}
                  opacity={isHov ? 1 : 0.92}
                />
                {/* Name */}
                <text x={cx} y={cy - (s ? 6 : 0)} textAnchor="middle"
                  fontSize={isBudapest ? 9.5 : 8.5} fontWeight="600"
                  fill={s ? (t > 0.5 ? 'white' : darkMode?'#f3f4f6':'#1f2937') : darkMode?'#6b7280':'#9ca3af'}>
                  {name.length > 10 ? name.slice(0,10) : name}
                </text>
                {/* Stats */}
                {s && (
                  <>
                    <text x={cx} y={cy+8} textAnchor="middle" fontSize="8"
                      fill={t > 0.5 ? 'rgba(255,255,255,0.85)' : darkMode?'#d1d5db':'#6b7280'}>
                      {s.count} ügy
                    </text>
                    <text x={cx} y={cy+18} textAnchor="middle" fontSize="8" fontWeight="700"
                      fill={t > 0.5 ? 'white' : '#ef4444'}>
                      {(s.amount/1e9).toFixed(1)}B
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {hovered && stats[hovered] && (() => {
        const s = stats[hovered];
        const county = COUNTY_GRID.find(([id]) => id === hovered);
        return (
          <div className={`p-3 rounded-lg text-sm ${darkMode?'bg-gray-700':'bg-gray-100'}`}>
            <p className="font-bold">{county?.[1]}</p>
            <p className="opacity-70">{s.count} ügy · {(s.amount/1e9).toFixed(2)}B HUF</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {s.cases.map(c => (
                <span key={c.id} onClick={() => onCaseSelect && onCaseSelect(c)}
                  className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500 cursor-pointer hover:bg-red-500/30">
                  {c.title.length > 30 ? c.title.slice(0,30)+'…' : c.title}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Scale */}
      <div className="flex items-center gap-2 text-xs opacity-50">
        <span>Kevés</span>
        <div className="flex h-3 rounded overflow-hidden" style={{width:120}}>
          {Array.from({length:10},(_,i)=>(
            <div key={i} style={{flex:1, background: lerp(darkMode?'#1e3a5f':'#dbeafe','#ef4444',i/9)}}/>
          ))}
        </div>
        <span>Sok / Nagy összeg</span>
      </div>
    </div>
  );
}

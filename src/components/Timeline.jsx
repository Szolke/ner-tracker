import React, { useRef, useState } from 'react';

const STATUS_COLORS = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const STATUS_LABELS = { active:'Aktív', investigation:'Nyomozás', closed:'Lezárult', appeal:'Fellebbezés' };
const CAT_ICONS = { 'korrupció':'🔴', 'pénzügyi':'🔵', 'közbeszerzés':'🟣' };

export default function Timeline({ cases, onCaseSelect, darkMode }) {
  const scrollRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (!cases.length) return null;

  const sorted = [...cases].sort((a,b) => a.date.localeCompare(b.date));
  const minDate = new Date(sorted[0].date);
  const maxDate = new Date(sorted[sorted.length-1].date);
  const totalDays = Math.max(1, (maxDate - minDate) / 86400000);
  const W = Math.max(900, totalDays * 4 + 200);
  const H = 320;
  const PAD = 80;

  const xFor = date => PAD + ((new Date(date) - minDate) / 86400000 / totalDays) * (W - PAD*2);

  // Group by year for axis
  const years = [];
  for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) {
    const d = new Date(y, 0, 1);
    if (d >= minDate && d <= maxDate) years.push({ year: y, x: xFor(d.toISOString().slice(0,10)) });
  }

  const handleMouseDown = e => { setIsDragging(true); setStartX(e.pageX - scrollRef.current.offsetLeft); setScrollLeft(scrollRef.current.scrollLeft); };
  const handleMouseMove = e => { if (!isDragging) return; e.preventDefault(); const x = e.pageX - scrollRef.current.offsetLeft; scrollRef.current.scrollLeft = scrollLeft - (x - startX); };
  const handleMouseUp = () => setIsDragging(false);

  const select = c => { setSelected(selected?.id === c.id ? null : c); if (onCaseSelect) onCaseSelect(c); };

  // Alternate rows to avoid overlap
  const rows = {};
  sorted.forEach((c,i) => { rows[c.id] = i % 2 === 0 ? 0 : 1; });

  return (
    <div className="space-y-4">
      {/* Scroll hint */}
      <p className={`text-xs opacity-40 flex items-center gap-1`}>← húzd vagy görgess vízszintesen →</p>

      <div
        ref={scrollRef}
        className={`overflow-x-auto rounded-xl border select-none ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        <svg width={W} height={H} style={{ display:'block', minWidth: W }}>
          {/* Background */}
          <rect width={W} height={H} fill={darkMode?'#1f2937':'#f9fafb'} rx="12"/>

          {/* Year gridlines */}
          {years.map(({year, x}) => (
            <g key={year}>
              <line x1={x} y1={40} x2={x} y2={H-40} stroke={darkMode?'#374151':'#e5e7eb'} strokeWidth="1" strokeDasharray="4,4"/>
              <text x={x} y={30} textAnchor="middle" fontSize="11" fontWeight="600"
                fill={darkMode?'#6b7280':'#9ca3af'}>{year}</text>
            </g>
          ))}

          {/* Center axis */}
          <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2}
            stroke={darkMode?'#4b5563':'#d1d5db'} strokeWidth="1.5"/>

          {/* Case nodes */}
          {sorted.map(c => {
            const x = xFor(c.date);
            const isTop = rows[c.id] === 0;
            const cy = isTop ? H/2 - 65 : H/2 + 65;
            const stemY1 = isTop ? H/2 - 8 : H/2 + 8;
            const stemY2 = isTop ? cy + 20 : cy - 20;
            const isSel = selected?.id === c.id;
            const r = isSel ? 9 : 7;

            return (
              <g key={c.id} onClick={() => select(c)} style={{cursor:'pointer'}}>
                {/* Stem */}
                <line x1={x} y1={stemY1} x2={x} y2={stemY2}
                  stroke={STATUS_COLORS[c.status]} strokeWidth={isSel?2:1.5} opacity="0.7"/>
                {/* Dot on axis */}
                <circle cx={x} cy={H/2} r={r}
                  fill={STATUS_COLORS[c.status]}
                  stroke={isSel?'white':darkMode?'#1f2937':'white'}
                  strokeWidth={isSel?2.5:1.5}/>
                {/* Card */}
                <foreignObject
                  x={x - 70} y={isTop ? cy - 48 : cy}
                  width="140" height="52">
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                      background: isSel ? STATUS_COLORS[c.status] : (darkMode?'#374151':'#fff'),
                      border: `1.5px solid ${STATUS_COLORS[c.status]}`,
                      borderRadius: '8px',
                      padding: '5px 7px',
                      fontSize: '10px',
                      color: isSel ? 'white' : (darkMode?'#f3f4f6':'#111827'),
                      boxShadow: isSel ? `0 0 0 3px ${STATUS_COLORS[c.status]}44` : '0 2px 8px rgba(0,0,0,0.12)',
                      transition: 'all 0.15s',
                      lineHeight: '1.3',
                    }}>
                    <div style={{fontWeight:700, marginBottom:2}}>
                      {CAT_ICONS[c.category]} {c.title.length > 38 ? c.title.slice(0,38)+'…' : c.title}
                    </div>
                    <div style={{opacity:0.75, fontSize:'9px'}}>
                      {c.date} · {(c.amount_huf/1e9).toFixed(1)}B HUF
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Start / End labels */}
          <text x={PAD} y={H-20} textAnchor="middle" fontSize="10" fill={darkMode?'#6b7280':'#9ca3af'}>{sorted[0]?.date}</text>
          <text x={W-PAD} y={H-20} textAnchor="middle" fontSize="10" fill={darkMode?'#6b7280':'#9ca3af'}>{sorted[sorted.length-1]?.date}</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs opacity-60">
        {Object.entries(STATUS_LABELS).map(([k,v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{background:STATUS_COLORS[k]}}/>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

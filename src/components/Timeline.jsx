import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useLang } from '../i18n.jsx';

const STATUS_COLORS = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const STATUS_LABELS = { active:'Aktív', investigation:'Nyomozás', closed:'Lezárult', appeal:'Fellebbezés' };
const CAT_ICONS = { 'korrupció':'🔴', 'pénzügyi':'🔵', 'közbeszerzés':'🟣' };

export default function Timeline({ cases, onCaseSelect, darkMode, selectedId, onSelectId }) {
  const { t: tr } = useLang();
  const scrollRef   = useRef(null);
  // A kiemelt elem azonosítója a szülő (Dashboard) is birtokolhatja (selectedId/onSelectId
  // prop), hogy a CaseDetail modal nyitása/zárása ne törölje a kiemelést — ugyanaz a minta,
  // mint a ChoroplethMap/NetworkGraph-nál. Ha a szülő nem ad vezérlést, helyi state-tel működik tovább.
  const [localSelectedId, setLocalSelectedId] = useState(null);
  const isControlled = selectedId !== undefined && typeof onSelectId === 'function';
  const selected = isControlled ? selectedId : localSelectedId;
  const setSelectedId = isControlled ? onSelectId : setLocalSelectedId;
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX]         = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [visibleCount, setVisible]  = useState(0);
  const [playing, setPlaying]       = useState(false);
  const intervalRef = useRef(null);

  if (!cases.length) return null;

  const CARD_W = 144;
  const CARD_H = 56;
  const CARD_SPACING = CARD_W + 6;   // min horizontal gap between cards sharing a date
  const LANE_GAP = 80;               // vertical distance between stacked lanes on the same side
  const BASE_OFFSET = 70;            // distance from axis to first lane

  const sorted = [...cases].sort((a,b) => a.date.localeCompare(b.date));
  const minDate = new Date(sorted[0].date);
  const maxDate = new Date(sorted[sorted.length-1].date);
  const totalDays = Math.max(1, (maxDate - minDate) / 86400000);

  // Spread cases that share the exact same date across x so they don't all
  // land on one pixel column (which caused the dense striped overlap).
  const dateCounts = {};
  sorted.forEach(c => { dateCounts[c.date] = (dateCounts[c.date] || 0) + 1; });
  const maxGroupSize = Math.max(1, ...Object.values(dateCounts));
  const halfClusterExtent = maxGroupSize > 1 ? ((maxGroupSize - 1) / 2) * CARD_SPACING + CARD_W / 2 : 0;

  const coreW = Math.max(900, totalDays * 4 + 200) - 160; // drawable width (same density as before)
  const PAD = 80 + halfClusterExtent;
  const W = coreW + PAD * 2;

  const xFor = date => PAD + ((new Date(date) - minDate) / 86400000 / totalDays) * (W - PAD*2);

  const dateSeen = {};
  const xJitter = {};
  sorted.forEach(c => {
    const n = dateCounts[c.date];
    const seen = dateSeen[c.date] || 0;
    dateSeen[c.date] = seen + 1;
    xJitter[c.id] = n > 1 ? (seen - (n - 1) / 2) * CARD_SPACING : 0;
  });
  const xForCase = c => xFor(c.date) + xJitter[c.id];

  const years = [];
  for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) {
    const d = new Date(y, 0, 1);
    if (d >= minDate && d <= maxDate)
      years.push({ year: y, x: xFor(d.toISOString().slice(0,10)) });
  }

  // Pack cards into vertical lanes (alternating above/below the axis) so that
  // any two cards whose x-ranges would overlap end up on different lanes
  // instead of stacking on top of each other.
  const layout = {};
  const topLaneEnds = [];
  const bottomLaneEnds = [];
  const byX = sorted.map(c => ({ c, x: xForCase(c) })).sort((a,b) => a.x - b.x);
  let sideToggle = 0;
  byX.forEach(({ c, x }) => {
    const left = x - CARD_SPACING / 2;
    const findLane = lanes => {
      for (let i = 0; i < lanes.length; i++) if (lanes[i] <= left) return i;
      return lanes.length;
    };
    const topLane = findLane(topLaneEnds);
    const bottomLane = findLane(bottomLaneEnds);
    let side;
    if (topLane < bottomLane) side = 'top';
    else if (bottomLane < topLane) side = 'bottom';
    else side = (sideToggle++ % 2 === 0) ? 'top' : 'bottom';
    const lanes = side === 'top' ? topLaneEnds : bottomLaneEnds;
    const lane = side === 'top' ? topLane : bottomLane;
    const right = x + CARD_SPACING / 2;
    if (lane === lanes.length) lanes.push(right); else lanes[lane] = right;
    layout[c.id] = { side, lane };
  });

  const halfFor = laneCount => laneCount > 0
    ? BASE_OFFSET + (laneCount - 1) * LANE_GAP + CARD_H + 24
    : 170;
  const H = Math.max(340, Math.round(Math.max(halfFor(topLaneEnds.length), halfFor(bottomLaneEnds.length))) * 2);

  // Playback
  const startPlay = useCallback(() => {
    setVisible(0);
    setPlaying(true);
    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      setVisible(count);
      // Auto-scroll to keep up
      if (scrollRef.current && count <= sorted.length) {
        const c = sorted[count-1];
        const x = xForCase(c);
        scrollRef.current.scrollTo({ left: x - 200, behavior: 'smooth' });
      }
      if (count >= sorted.length) {
        clearInterval(intervalRef.current);
        setPlaying(false);
        setVisible(sorted.length);
      }
    }, 600);
  }, [sorted]);

  const stopPlay = useCallback(() => {
    clearInterval(intervalRef.current);
    setPlaying(false);
  }, []);

  const reset = useCallback(() => {
    stopPlay();
    setVisible(0);
    if (scrollRef.current) scrollRef.current.scrollTo({ left: W - scrollRef.current.clientWidth, behavior: 'smooth' });
  }, [stopPlay]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  // Scroll to most recent events on mount
  useEffect(() => {
    if (scrollRef.current && W > scrollRef.current.clientWidth) {
      scrollRef.current.scrollLeft = W - scrollRef.current.clientWidth;
    }
  }, [W]);

  const displayCount = visibleCount === 0 && !playing ? sorted.length : visibleCount;

  const handleMouseDown = e => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseMove = e => {
    if (!isDragging) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = scrollLeft - (e.pageX - scrollRef.current.offsetLeft - startX);
  };
  const handleMouseUp = () => setIsDragging(false);

  const select = c => { setSelectedId(selected === c.id ? null : c.id); if (onCaseSelect) onCaseSelect(c); };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={playing ? stopPlay : startPlay}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            playing ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}>
          {playing ? <><Pause className="w-4 h-4"/> {tr.pause}</> : <><Play className="w-4 h-4"/> {tr.play}</>}
        </button>
        <button onClick={reset}
          className={`p-2 rounded-lg transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'}`}>
          <RotateCcw className="w-4 h-4"/>
        </button>
        <span className={`text-sm ${darkMode?'text-gray-400':'text-gray-500'}`}>
          {displayCount === sorted.length ? `${tr.allCases} (${sorted.length})` : `${displayCount} / ${sorted.length}`}
        </span>
        {playing && (
          <span className="flex items-center gap-1.5 text-sm text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"/>
            {tr.playing}
          </span>
        )}
        <p className={`text-xs opacity-40 ml-auto`}>{tr.dragOrScroll}</p>
      </div>

      {/* Timeline SVG */}
      <div
        ref={scrollRef}
        className={`overflow-x-auto rounded-xl border select-none ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <svg width={W} height={H} style={{ display:'block', minWidth: W }}>
          <rect width={W} height={H} fill={darkMode?'#1f2937':'#f9fafb'} rx="12"/>

          {/* Year gridlines */}
          {years.map(({year, x}) => (
            <g key={year}>
              <line x1={x} y1={40} x2={x} y2={H-40}
                stroke={darkMode?'#374151':'#e5e7eb'} strokeWidth="1" strokeDasharray="4,4"/>
              <text x={x} y={28} textAnchor="middle" fontSize="11" fontWeight="600"
                fill={darkMode?'#6b7280':'#9ca3af'}>{year}</text>
            </g>
          ))}

          {/* Center axis */}
          <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2}
            stroke={darkMode?'#4b5563':'#d1d5db'} strokeWidth="2"/>

          {/* Animated progress line */}
          {playing && visibleCount > 0 && visibleCount <= sorted.length && (
            <line x1={PAD} y1={H/2}
              x2={xForCase(sorted[visibleCount-1])} y2={H/2}
              stroke="#3b82f6" strokeWidth="2" opacity="0.4"/>
          )}

          {/* Case nodes */}
          {sorted.slice(0, displayCount).map((c, idx) => {
            const x = xForCase(c);
            const { side, lane } = layout[c.id];
            const isTop = side === 'top';
            const offset = BASE_OFFSET + lane * LANE_GAP;
            const cy = isTop ? H/2 - offset : H/2 + offset;
            const stemY1 = isTop ? H/2 - 9 : H/2 + 9;
            const stemY2 = isTop ? cy + 22 : cy - 22;
            const isSel = selected === c.id;
            const isNew = visibleCount > 0 && idx === visibleCount - 1;
            const r = isSel ? 10 : 7;

            return (
              <g key={c.id} onClick={() => select(c)} style={{cursor:'pointer'}}
                opacity={displayCount === sorted.length || idx < displayCount ? 1 : 0}>
                {/* Appear animation ring */}
                {isNew && (
                  <circle cx={x} cy={H/2} r={20}
                    fill="none" stroke={STATUS_COLORS[c.status]}
                    strokeWidth="2" opacity="0.5">
                  </circle>
                )}
                {/* Stem */}
                <line x1={x} y1={stemY1} x2={x} y2={stemY2}
                  stroke={STATUS_COLORS[c.status]} strokeWidth={isSel?2:1.5} opacity="0.7"/>
                {/* Axis dot */}
                <circle cx={x} cy={H/2} r={r}
                  fill={STATUS_COLORS[c.status]}
                  stroke={isSel?'white':darkMode?'#1f2937':'white'}
                  strokeWidth={isSel?2.5:1.5}/>
                {/* Card */}
                <foreignObject x={x-CARD_W/2} y={isTop ? cy-CARD_H-4 : cy} width={CARD_W} height={CARD_H}>
                  <div xmlns="http://www.w3.org/1999/xhtml" style={{
                    background: isSel ? STATUS_COLORS[c.status] : isNew ? (darkMode?'#1e3a5f':'#eff6ff') : (darkMode?'#374151':'#fff'),
                    border: `2px solid ${STATUS_COLORS[c.status]}`,
                    borderRadius: '8px', padding: '5px 8px',
                    fontSize: '10px', lineHeight: '1.35',
                    color: isSel ? 'white' : (darkMode?'#f3f4f6':'#111827'),
                    boxShadow: isNew ? `0 0 12px ${STATUS_COLORS[c.status]}88` : '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box', height: '100%', overflow: 'hidden',
                  }}>
                    <div style={{
                      fontWeight:700, marginBottom:2,
                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                      overflow:'hidden',
                    }}>
                      {CAT_ICONS[c.category]} {c.title}
                    </div>
                    <div style={{opacity:0.7,fontSize:'9px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {c.date}{c.amount_huf != null ? ` · ${(c.amount_huf/1e9).toLocaleString('hu-HU',{maximumFractionDigits:1})} Mrd HUF` : ''}
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Date labels */}
          <text x={PAD} y={H-16} textAnchor="middle" fontSize="10" fill={darkMode?'#6b7280':'#9ca3af'}>
            {sorted[0]?.date}
          </text>
          <text x={W-PAD} y={H-16} textAnchor="middle" fontSize="10" fill={darkMode?'#6b7280':'#9ca3af'}>
            {sorted[sorted.length-1]?.date}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs opacity-50">
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

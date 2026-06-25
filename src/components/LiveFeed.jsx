import React, { useState, useEffect } from 'react';
import { Rss, ExternalLink, Clock, ChevronRight } from 'lucide-react';

const STATUS_COLORS = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const STATUS_LABELS = { active:'Aktív', investigation:'Nyomozás', closed:'Lezárult', appeal:'Fellebbezés' };

function timeAgo(dateStr) {
  const now  = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 3600)  return `${Math.floor(diff/60)} perce`;
  if (diff < 86400) return `${Math.floor(diff/3600)} órája`;
  const days = Math.floor(diff/86400);
  if (days < 30)  return `${days} napja`;
  if (days < 365) return `${Math.floor(days/30)} hónapja`;
  return `${Math.floor(days/365)} éve`;
}

export default function LiveFeed({ cases, onCaseSelect, darkMode }) {
  const [visible, setVisible] = useState(true);
  const [highlight, setHighlight] = useState(null);
  const [tick, setTick] = useState(0);

  // Pulse the newest item every 8s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!cases.length) return;
    setHighlight(cases[0].id);
    const t = setTimeout(() => setHighlight(null), 1800);
    return () => clearTimeout(t);
  }, [tick]);

  const sorted = [...cases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const lastUpdated = sorted[0]?.date || '';

  return (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ background: darkMode ? '#111827' : '#f9fafb' }}
        onClick={() => setVisible(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <Rss className="w-4 h-4 text-red-500" />
          <span className="font-bold text-sm">Live Feed</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
            {sorted.length} ügy
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Clock className="w-3 h-3" />{timeAgo(lastUpdated)}
            </span>
          )}
          <ChevronRight className={`w-4 h-4 opacity-40 transition-transform ${visible ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Feed items */}
      {visible && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {sorted.map((c, i) => (
            <div
              key={c.id}
              onClick={() => onCaseSelect && onCaseSelect(c)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-500 ${
                highlight === c.id
                  ? darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
            >
              {/* Status dot */}
              <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLORS[c.status] }} />
                {i < sorted.length - 1 && (
                  <span className={`w-px flex-1 min-h-[20px] ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug line-clamp-2">{c.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                  <span className="text-xs font-semibold" style={{ color: STATUS_COLORS[c.status] }}>
                    {STATUS_LABELS[c.status]}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {c.region}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {(c.amount_huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})} Mrd Ft
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {c.source} · {timeAgo(c.date)}
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-30" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {visible && (
        <div className={`px-4 py-2 text-xs text-center ${darkMode ? 'bg-gray-900/50 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
          Automatikus frissítés · napi 8:00 UTC · GitHub Actions
        </div>
      )}
    </div>
  );
}

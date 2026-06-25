import React, { useState, useEffect } from 'react';
import { Filter, TrendingUp, ExternalLink, MapPin, AlertTriangle, CheckCircle, Clock, DollarSign, Users } from 'lucide-react';

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    fetch('/data/news.json')
      .then(r => r.json())
      .then(data => {
        setCases(data.cases || []);
        setInvestigations(data.investigations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let f = cases;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      f = f.filter(c =>
        c.title.toLowerCase().includes(t) ||
        c.description.toLowerCase().includes(t) ||
        c.involved_persons?.some(p => p.name.toLowerCase().includes(t))
      );
    }
    if (selectedRegion !== 'all') f = f.filter(c => c.region === selectedRegion);
    if (selectedStatus !== 'all') f = f.filter(c => c.status === selectedStatus);
    if (selectedCategory !== 'all') f = f.filter(c => c.category === selectedCategory);
    setFilteredCases(f);
  }, [cases, searchTerm, selectedRegion, selectedStatus, selectedCategory]);

  const total = cases.reduce((s, c) => s + (c.amount_huf || 0), 0);
  const bg = darkMode ? 'bg-slate-900' : 'bg-gray-50';
  const text = darkMode ? 'text-slate-100' : 'text-slate-900';
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500';
  const accent = darkMode ? 'text-red-400' : 'text-red-600';

  const inp = `w-full px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`;

  const statusBadge = {
    active: 'bg-red-900/40 text-red-300 border-red-700',
    investigation: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    closed: 'bg-green-900/40 text-green-300 border-green-700',
    appeal: 'bg-orange-900/40 text-orange-300 border-orange-700',
  };
  const statusLabel = { active: 'Aktív', investigation: 'Nyomozás', closed: 'Lezárt', appeal: 'Fellebbezés' };

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <header className={`${card} border-b sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className={`text-2xl font-black ${accent} tracking-tight`}>🚨 NER Korrupció Tracker</h1>
              <p className={`text-xs ${sub}`}>Közérdekű adatok — Telex · 444 · HVG · Direkt36 · Átlátszó</p>
            </div>
            <button onClick={() => setDarkMode(!darkMode)}
              className={`px-3 py-1.5 rounded-lg text-sm ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
              {darkMode ? '🌙 Sötét' : '☀️ Világos'}
            </button>
          </div>
          <div className="flex gap-1">
            {[['overview','📊 Áttekintés'],['cases','📋 Ügyek'],['investigations','🔍 Nyomozások']].map(([id,label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id
                    ? `${accent} ${darkMode ? 'bg-slate-700' : 'bg-red-50'}`
                    : `${sub} hover:${text}`
                }`}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className={`text-center ${sub}`}>
              <div className="text-4xl mb-3 animate-spin">⟳</div>
              <p>Adatok betöltése...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { icon: <AlertTriangle size={20}/>, label: 'Összes ügy', value: cases.length, color: 'red' },
                    { icon: <DollarSign size={20}/>, label: 'Hiányzó vagyon', value: `${(total/1e9).toFixed(1)} Md Ft`, color: 'orange' },
                    { icon: <Clock size={20}/>, label: 'Aktív nyomozás', value: investigations.filter(i=>i.status==='active').length, color: 'yellow' },
                    { icon: <MapPin size={20}/>, label: 'Érintett régió', value: new Set(cases.map(c=>c.region)).size, color: 'blue' },
                    { icon: <Users size={20}/>, label: 'Érintett személy', value: new Set(cases.flatMap(c=>c.involved_persons?.map(p=>p.id)||[])).size, color: 'purple' },
                  ].map(m => (
                    <div key={m.label} className={`${card} border rounded-xl p-4`}>
                      <div className={`flex items-center gap-2 mb-1 ${
                        m.color==='red'?'text-red-400':m.color==='orange'?'text-orange-400':m.color==='yellow'?'text-yellow-400':m.color==='blue'?'text-blue-400':'text-purple-400'
                      }`}>{m.icon}<span className="text-xs font-medium">{m.label}</span></div>
                      <div className="text-2xl font-black">{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Recent cases */}
                <div className={`${card} border rounded-xl p-5`}>
                  <h2 className={`font-bold text-lg mb-4 flex items-center gap-2`}>
                    <TrendingUp size={18} className={accent}/> Legújabb ügyek
                  </h2>
                  <div className="space-y-3">
                    {cases.slice(0,5).map(c => (
                      <div key={c.id} className={`${darkMode?'bg-slate-700/60':'bg-slate-50'} rounded-lg p-4 flex justify-between items-start gap-4`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge[c.status]||statusBadge.active}`}>
                              {statusLabel[c.status]||c.status}
                            </span>
                            <span className={`text-xs ${sub}`}>{c.source} · {c.date.split('T')[0]}</span>
                          </div>
                          <p className="font-semibold text-sm leading-snug">{c.title}</p>
                          <p className={`text-xs ${sub} mt-1 line-clamp-2`}>{c.description}</p>
                        </div>
                        {c.amount_huf && (
                          <div className={`text-right shrink-0`}>
                            <div className={`font-black text-sm ${accent}`}>{(c.amount_huf/1e9).toFixed(1)} Md</div>
                            <div className={`text-xs ${sub}`}>Ft</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── CASES ── */}
            {activeTab === 'cases' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className={`${card} border rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Filter size={16} className={sub}/>
                    <span className="font-semibold text-sm">Szűrés</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className={`block text-xs ${sub} mb-1`}>Keresés</label>
                      <input type="text" placeholder="Ügy, név, leírás..." value={searchTerm}
                        onChange={e=>setSearchTerm(e.target.value)} className={inp}/>
                    </div>
                    <div>
                      <label className={`block text-xs ${sub} mb-1`}>Régió</label>
                      <select value={selectedRegion} onChange={e=>setSelectedRegion(e.target.value)} className={inp}>
                        <option value="all">Összes régió</option>
                        {[...new Set(cases.map(c=>c.region))].map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs ${sub} mb-1`}>Státusz</label>
                      <select value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)} className={inp}>
                        <option value="all">Összes státusz</option>
                        <option value="active">Aktív</option>
                        <option value="investigation">Nyomozás</option>
                        <option value="closed">Lezárt</option>
                        <option value="appeal">Fellebbezés</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs ${sub} mb-1`}>Kategória</label>
                      <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className={inp}>
                        <option value="all">Összes kategória</option>
                        <option value="korrupció">Korrupció</option>
                        <option value="pénzügyi">Pénzügyi</option>
                        <option value="közbeszerzés">Közbeszerzés</option>
                      </select>
                    </div>
                  </div>
                </div>

                <p className={`text-sm ${sub}`}>{filteredCases.length} ügy találat</p>

                <div className="space-y-3">
                  {filteredCases.map(c => (
                    <div key={c.id} className={`${card} border rounded-xl p-5`}>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge[c.status]||statusBadge.active}`}>
                              {statusLabel[c.status]||c.status}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode?'bg-slate-700':'bg-slate-100'} ${sub}`}>{c.category}</span>
                            <span className={`text-xs ${sub}`}>{c.source} · {c.date.split('T')[0]}</span>
                          </div>
                          <h3 className="font-bold leading-snug">{c.title}</h3>
                        </div>
                        {c.amount_huf && (
                          <div className="text-right shrink-0">
                            <div className={`font-black text-lg ${accent}`}>{(c.amount_huf/1e9).toFixed(1)}</div>
                            <div className={`text-xs ${sub}`}>Md Ft</div>
                          </div>
                        )}
                      </div>
                      <p className={`text-sm ${sub} mb-3`}>{c.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div><span className={sub}>Régió: </span><span className="font-medium">{c.region}</span></div>
                        <div><span className={sub}>Forrás: </span><span className="font-medium">{c.source}</span></div>
                      </div>
                      {c.involved_persons?.length > 0 && (
                        <div className="mb-3">
                          <span className={`text-xs ${sub}`}>Érintett személyek: </span>
                          {c.involved_persons.map(p=>(
                            <span key={p.id} className={`inline-block text-xs px-2 py-0.5 rounded mr-1 ${darkMode?'bg-slate-700':'bg-slate-100'}`}>
                              {p.name} ({p.position})
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1 flex-wrap mb-3">
                        {c.tags?.map(t=>(
                          <span key={t} className={`text-xs px-2 py-0.5 rounded ${darkMode?'bg-red-900/30 text-red-300':'bg-red-50 text-red-700'}`}>#{t}</span>
                        ))}
                      </div>
                      {c.link && (
                        <a href={c.link} target="_blank" rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs ${accent} hover:underline`}>
                          Forrás megnyitása <ExternalLink size={12}/>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── INVESTIGATIONS ── */}
            {activeTab === 'investigations' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={20} className={accent}/>
                  <h2 className="font-bold text-xl">Aktív nyomozások</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {investigations.map(inv => (
                    <div key={inv.id} className={`${card} border rounded-xl p-5`}>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold leading-snug flex-1 pr-3">{inv.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${statusBadge[inv.status]||statusBadge.active}`}>
                          {statusLabel[inv.status]||inv.status}
                        </span>
                      </div>
                      {inv.involved_amount && (
                        <div className={`font-black text-2xl ${accent} mb-3`}>
                          {(inv.involved_amount/1e9).toFixed(1)} <span className="text-base font-normal">Md Ft</span>
                        </div>
                      )}
                      <div className={`grid grid-cols-2 gap-3 text-xs mb-3 p-3 rounded-lg ${darkMode?'bg-slate-700/50':'bg-slate-50'}`}>
                        <div>
                          <div className={sub}>Nyomozó szerv</div>
                          <div className="font-semibold mt-0.5">{inv.investigating_authority||'—'}</div>
                        </div>
                        <div>
                          <div className={sub}>Lezárás (becsült)</div>
                          <div className="font-semibold mt-0.5">{inv.estimated_closure||'—'}</div>
                        </div>
                      </div>
                      {inv.key_figures?.length > 0 && (
                        <div className="mb-3">
                          <div className={`text-xs ${sub} mb-1`}>Kulcsfigurák</div>
                          <div className="flex flex-wrap gap-1">
                            {inv.key_figures.map(f=>(
                              <span key={f} className={`text-xs px-2 py-0.5 rounded ${darkMode?'bg-slate-700':'bg-slate-100'}`}>{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {inv.description && <p className={`text-xs ${sub} leading-relaxed`}>{inv.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MapPin, TrendingUp, Users, Calendar, Download, Search,
  BarChart3, Network, Globe, AlertCircle, Moon, Sun, FileText,
  Star, Share2, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter,
  Legend, ComposedChart } from 'recharts';
import NetworkGraph  from './NetworkGraph';
import LiveFeed      from './LiveFeed';
import Timeline      from './Timeline';
import ChoroplethMap from './ChoroplethMap';
import { exportToPDF }   from '../utils/pdfExport';
import EUComparison      from './EUComparison';
import ErrorBoundary      from './ErrorBoundary';
import TrendAnalysis       from './TrendAnalysis';
import { useLang }         from '../i18n.jsx';
import CaseDetail          from './CaseDetail';
import useFilteredCases    from '../hooks/useFilteredCases';
import { mrd, mrdS, shareCase } from '../utils/format';

const STATUS_COLORS = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const STATUS_LABELS = { active:'Aktív', investigation:'Nyomozás', closed:'Lezárult', appeal:'Fellebbezés' };
const CATEGORY_COLORS = { 'korrupció':'#ef4444', 'pénzügyi':'#3b82f6', 'közbeszerzés':'#8b5cf6' };
const PIE_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b'];

// ── Watchlist hook ────────────────────────────────────────────────────
function useWatchlist() {
  const [watched, setWatched] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ner-watchlist') || '[]')); }
    catch { return new Set(); }
  });
  const toggle = useCallback(id => {
    setWatched(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('ner-watchlist', JSON.stringify([...next]));
      return next;
    });
  }, []);
  return [watched, toggle];
}

export default function Dashboard({ darkMode, toggleDarkMode }) {
  const { lang, t: tr, setLang } = useLang();
  const STATUS_LABELS_I18N = { active: tr.statusActive, investigation: tr.statusInvestigation, closed: tr.statusClosed, appeal: tr.statusAppeal };
  const navigate = useNavigate();
  const [data, setData]                     = useState(null);
  const [page, setPage]                     = useState(1);
  const PAGE_SIZE = 9;
  const [activeTab, setActiveTab]           = useState('overview');
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterCat, setFilterCat]           = useState('all');
  const [maxAmount, setMaxAmount]           = useState(Infinity); // alapból nincs felső korlát — a tényleges skálát a data alapján számoljuk (ld. amountCeiling)
  const [selectedCase, setSelectedCase]     = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null); // ChoroplethMap pin — itt él, hogy a CaseDetail modal nyitása/zárása ne törölje
  const [selectedPersonId, setSelectedPersonId] = useState(null); // NetworkGraph kiválasztott személy — ugyanaz a minta
  const [timelineSelectedId, setTimelineSelectedId] = useState(null); // Timeline kiemelt elem — ugyanaz a minta
  const [watched, toggleWatch]              = useWatchlist();
  const [searchParams, setSearchParams]     = useSearchParams();

  useEffect(() => {
    fetch('/data/news.json').then(r=>r.json()).then(d => {
      setData(d);
      // Deep link: ?case=case_001
      const caseId = searchParams.get('case');
      if (caseId) {
        const found = d.cases.find(c => c.id === caseId);
        if (found) { setSelectedCase(found); setActiveTab('cases'); }
      }
      // Deep link: ?county=budapest — megosztható ChoroplethMap-pin
      const countyId = searchParams.get('county');
      if (countyId) {
        setSelectedCounty(countyId);
        if (!caseId) setActiveTab('timeline');
      }
    }).catch(e => console.error(e));
  }, []);

  const handleCaseSelect = useCallback(c => {
    setSelectedCase(c);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('case', c.id);
      return next;
    });
  }, [setSearchParams]);

  const closeCase = useCallback(() => {
    setSelectedCase(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('case');
      return next;
    });
  }, [setSearchParams]);

  // ChoroplethMap pin szinkronizálása az URL-lel, hogy megosztható legyen (?county=budapest)
  const selectCounty = useCallback(id => {
    setSelectedCounty(id);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id) next.set('county', id); else next.delete('county');
      return next;
    });
  }, [setSearchParams]);

  const filteredCases = useFilteredCases(data, { searchTerm, filterStatus, filterCat, maxAmount: effectiveMaxAmount });

  // Lapozás visszaállítása 1-re, ha bármelyik szűrő változik.
  // (Korábban ez a filteredCases useMemo-ján belül futott setPage(1) hívással,
  // ami render közbeni state-mutáció volt — most tiszta useEffect-tel.)
  useEffect(() => { setPage(1); }, [searchTerm, filterStatus, filterCat, maxAmount]);

  const watchedCases  = useMemo(() => data?.cases.filter(c => watched.has(c.id)) || [], [data, watched]);
  const totalAmount   = useMemo(() => data?.cases.reduce((s,c) => s+(c.amount_huf||0),0)??0, [data]);
  // A "Max összeg" csúszka felső határa a tényleges adatok alapján — korábban 35 Mrd HUF
  // volt beégetve, ami azóta jóval az adatok skálája alatt maradt (a legnagyobb ügyek
  // 1000+ Mrd HUF-osak), így a csúszka a legtöbb nagy ügyet sosem tudta megjeleníteni.
  const amountCeiling = useMemo(() => {
    if (!data) return 50;
    const maxMrd = Math.max(0, ...data.cases.map(c => (c.amount_huf || 0) / 1e9));
    return Math.max(50, Math.ceil(maxMrd / 50) * 50); // legalább 50 Mrd, 50-es lépésekre kerekítve felfelé
  }, [data]);
  const effectiveMaxAmount = Math.min(maxAmount, amountCeiling); // a csúszka aktuális (kijelzett) értéke
  const categoryData  = useMemo(() => { if(!data)return[]; const m={}; data.cases.forEach(c=>{m[c.category]=(m[c.category]||0)+1;}); return Object.entries(m).map(([name,value])=>({name,value})); }, [data]);
  const statusData    = useMemo(() => { if(!data)return[]; const m={}; data.cases.forEach(c=>{m[c.status]=(m[c.status]||0)+1;}); return Object.entries(m).map(([name,value])=>({name:STATUS_LABELS_I18N[name]||name,value})); }, [data]);
  const allPersons    = useMemo(() => { if(!data)return[]; const seen=new Set(); return data.cases.flatMap(c=>c.involved_persons).filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}); }, [data]);

  // Dual-axis: éves ügyszám + összeg
  const yearlyDual = useMemo(() => {
    if (!data) return [];
    const m = {};
    data.cases.forEach(c => {
      const y = c.date.slice(0,4);
      if (!m[y]) m[y] = { year: y, count: 0, amount: 0 };
      m[y].count++;
      m[y].amount = +((m[y].amount * 1e9 + (c.amount_huf||0)) / 1e9).toFixed(1);
    });
    return Object.values(m).sort((a,b) => a.year.localeCompare(b.year));
  }, [data]);

  // Top érintett személyek
  const topPersons = useMemo(() => {
    if (!data) return [];
    const counts = {};
    data.cases.forEach(c => c.involved_persons.forEach(p => {
      counts[p.name] = (counts[p.name]||0) + 1;
    }));
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>({name,count}));
  }, [data]);

  // Forrás eloszlás
  const sourceData = useMemo(() => {
    if (!data) return [];
    const m = {};
    data.cases.forEach(c => { m[c.source] = (m[c.source]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));
  }, [data]);

  // Kategória × Státusz mátrix
  const catStatusMatrix = useMemo(() => {
    if (!data) return null;
    const cats = ['korrupció','pénzügyi','közbeszerzés'];
    const stats = ['active','investigation','closed','appeal'];
    const m = {};
    cats.forEach(cat => { m[cat] = {}; stats.forEach(s => { m[cat][s] = 0; }); });
    data.cases.forEach(c => { if (m[c.category]?.[c.status] !== undefined) m[c.category][c.status]++; });
    return { matrix: m, cats, stats };
  }, [data]);

  const yearlyStats = useMemo(() => {
    if (!data) return [];
    const m = {};
    data.cases.forEach(c => {
      const y = c.date.slice(0,4);
      if (!m[y]) m[y] = { year:y, korrupció:0, pénzügyi:0, közbeszerzés:0, total:0 };
      m[y][c.category] = (m[y][c.category]||0) + 1;
      m[y].total++;
    });
    return Object.values(m).sort((a,b)=>a.year.localeCompare(b.year));
  }, [data]);

  const lastUpdated = data?.metadata?.last_updated
    ? new Date(data.metadata.last_updated).toLocaleString('hu-HU')
    : null;

  const tt = { backgroundColor:darkMode?'#1f2937':'#fff', border:`1px solid ${darkMode?'#374151':'#e5e7eb'}`, color:darkMode?'#f9fafb':'#111' };

  const csvExport = (subset = null, filenameSuffix = '') => {
    if (!data) return;
    const rows = [['ID','Cím','Kategória','Státusz','Régió','Összeg HUF','Dátum','Forrás','Személyek'],
      ...(subset || data.cases).map(c=>[c.id,`"${c.title}"`,c.category,c.status,c.region,c.amount_huf,c.date,c.source,`"${c.involved_persons.map(p=>p.name).join('; ')}"`])
    ].map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows],{type:'text/csv;charset=utf-8;'}));
    a.download = `ner-tracker${filenameSuffix}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const P = ({children, className=''}) => (
    <div className={`p-5 rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'} ${className}`}>{children}</div>
  );

  const CaseCard = ({c}) => (
    <div
      onClick={() => handleCaseSelect(c)}
      className={`p-4 rounded-xl border-l-4 cursor-pointer transition group ${
        selectedCase?.id===c.id
          ?(darkMode?'bg-blue-900/40 border-blue-400':'bg-blue-50 border-blue-400')
          :(darkMode?'bg-gray-800 border-gray-700 hover:bg-gray-700':'bg-white border-gray-200 hover:bg-gray-50')
      }`}
      style={{borderLeftColor:CATEGORY_COLORS[c.category]}}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold opacity-50">{c.source}</span>
          {c.verified === true && <span title={tr.verifiedTitle} className="text-xs text-green-400">✅</span>}
          {c.verified === false && <span title={tr.scrapedTitle} className="text-xs text-yellow-500">⚠️</span>}
          {c.media_count > 0 && <span className="text-xs opacity-40">· {c.media_count} cikk</span>}
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
          <button onClick={e=>{e.stopPropagation();toggleWatch(c.id);}}
            title={watched.has(c.id)?tr.unfollow:tr.follow} aria-label={watched.has(c.id)?tr.unfollow:tr.follow}
            className={`p-1 rounded transition ${watched.has(c.id)?'text-yellow-400':'opacity-40 hover:opacity-100'}`}>
            <Star className="w-3.5 h-3.5" fill={watched.has(c.id)?'currentColor':'none'}/>
          </button>
          <button onClick={e=>{e.stopPropagation();shareCase(c);}}
            title={tr.share} aria-label={tr.share} className="p-1 rounded opacity-40 hover:opacity-100">
            <Share2 className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
      <p className="font-semibold text-sm leading-snug">{c.title}</p>
      <p className="text-xs mt-1 opacity-50">{c.region} · {c.date}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm font-bold">{mrd(c.amount_huf)}</p>
        <span className="text-xs font-bold" style={{color:STATUS_COLORS[c.status]}}>{STATUS_LABELS_I18N[c.status]}</span>
      </div>
    </div>
  );

  if (!data) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode?'bg-gray-900 text-white':'bg-gray-50 text-gray-900'}`}>
      <div className="text-center"><div className="text-4xl mb-3 animate-spin">⚙️</div><p className="font-semibold">{tr.loadingText}</p></div>
    </div>
  );

  // ── TABS ─────────────────────────────────────────────────────────────
  const TABS = [
    {id:'overview',       label:`📊 ${tr.overview}`},
    {id:'cases',          label:`🗺️ ${tr.cases}`},
    {id:'timeline',       label:`📅 ${tr.timeline}`},
    {id:'investigations', label:`🔍 ${tr.investigations}`},
  ];

  return (
    <>
    {selectedCase && (
      <CaseDetail c={selectedCase} darkMode={darkMode} watched={watched} data={data}
        toggleWatch={toggleWatch} onClose={closeCase}/>
    )}
    <div className={`min-h-screen ${darkMode?'bg-gray-900 text-white':'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode?'border-gray-700':'border-gray-200'}`}>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="w-7 h-7"/> NER Tracker</h1>
            <p className={`text-xs mt-0.5 ${darkMode?'text-gray-400':'text-gray-500'}`}>
              {tr.appSubtitle}
              {lastUpdated && <span className="ml-2 opacity-60">· {tr.lastUpdated}: {lastUpdated}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {watched.size > 0 && (
              <button onClick={()=>setActiveTab('overview')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-500 rounded-lg text-sm transition hover:bg-yellow-500/30">
                <Star className="w-4 h-4" fill="currentColor"/> {watched.size}
              </button>
            )}
            <button onClick={csvExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">
              <Download className="w-4 h-4"/> CSV
            </button>
            <button onClick={()=>exportToPDF(data)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition">
              <FileText className="w-4 h-4"/> PDF
            </button>
            <button onClick={()=>setLang(lang==='hu'?'en':'hu')} aria-label={lang==='hu'?'Switch to English':'Váltás magyarra'}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'}`}>
              {lang==='hu'?'EN':'HU'}
            </button>
            <button onClick={toggleDarkMode} aria-label={darkMode?'Világos mód bekapcsolása':'Sötét mód bekapcsolása'}
              className={`p-2 rounded-lg transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'}`}>
              {darkMode?<Sun className="w-4 h-4"/>:<Moon className="w-4 h-4"/>}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 px-6 pt-4 border-b ${darkMode?'border-gray-700':'border-gray-200'}`}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${activeTab===tab.id?'border-blue-500 text-blue-500':darkMode?'border-transparent text-gray-400 hover:text-gray-200':'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── OVERVIEW ── */}
          {activeTab==='overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-5 flex items-center gap-4 shadow-lg">
                <AlertCircle className="w-9 h-9 flex-shrink-0"/>
                <div>
                  <p className="font-bold text-xl">{tr.total} {mrdS(totalAmount)} {tr.publicFunds}</p>
                  <p className="text-sm opacity-90 mt-0.5">{data.cases.length} {tr.caseUnit} · {data.investigations.length} {tr.investigationUnit} · {allPersons.length} {tr.personUnit}</p>
                </div>
              </div>

              {/* Watchlist */}
              {watchedCases.length > 0 && (
                <P>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" fill="currentColor"/> {tr.watchedCases} ({watchedCases.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {watchedCases.map(c => <CaseCard key={c.id} c={c}/>)}
                  </div>
                </P>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  [<TrendingUp className="w-4 h-4"/>, tr.totalCases, data.cases.length, null, 'bg-blue-500/20 border-blue-500/40'],
                  [<AlertCircle className="w-4 h-4"/>, tr.activeInvestigation, data.investigations.length, null, 'bg-red-500/20 border-red-500/40'],
                  [<Users className="w-4 h-4"/>, tr.affectedPersons, allPersons.length, null, 'bg-purple-500/20 border-purple-500/40'],
                  [<BarChart3 className="w-4 h-4"/>, tr.totalAmount, mrdS(totalAmount), null, 'bg-green-500/20 border-green-500/40'],
                  [<MapPin className="w-4 h-4"/>, tr.affectedRegions, new Set(data.cases.map(c=>c.region)).size, null, 'bg-orange-500/20 border-orange-500/40'],
                ].map(([icon,label,value,sub,cls],i) => (
                  <div key={i} className={`p-4 rounded-xl border ${cls}`}>
                    <div className="flex items-center gap-2 mb-2 opacity-70 text-sm">{icon}{label}</div>
                    <p className="text-2xl font-bold">{value}</p>
                    {sub && <p className="text-xs opacity-50">{sub}</p>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Kategória bar */}
                  <P><h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4"/>{tr.categoryChart}</h3>
                    <ResponsiveContainer width="100%" height={200}><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'}/><XAxis dataKey="name" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><YAxis tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><Tooltip contentStyle={tt}/><Bar dataKey="value" radius={[6,6,0,0]}>{categoryData.map((e,i)=><Cell key={i} fill={CATEGORY_COLORS[e.name]||'#6b7280'}/>)}</Bar></BarChart></ResponsiveContainer></P>
                  {/* Dual-axis: ügyszám + összeg évente */}
                  <P><h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4"/>{tr.yearlyChart}</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={yearlyDual}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'}/>
                        <XAxis dataKey="year" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:10}}/>
                        <YAxis yAxisId="left" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:10}}/>
                        <YAxis yAxisId="right" orientation="right" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:10}} unit=" Mrd"/>
                        <Tooltip contentStyle={tt} formatter={(v,n)=>n==='amount'?`${v} Mrd HUF`:v}/>
                        <Bar yAxisId="left" dataKey="count" fill="#8b5cf6" radius={[4,4,0,0]} opacity={0.8}/>
                        <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2.5} dot={{fill:'#f59e0b',r:4}}/>
                      </ComposedChart>
                    </ResponsiveContainer></P>
                  {/* Státusz pie */}
                  <P><h3 className="font-semibold mb-4">{tr.statusChart}</h3>
                    <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{statusData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}</Pie><Tooltip contentStyle={tt}/></PieChart></ResponsiveContainer></P>
                  {/* Forrás donut */}
                  <P><h3 className="font-semibold mb-4 flex items-center gap-2"><Network className="w-4 h-4"/>Forrás-eloszlás</h3>
                    <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" label={({name,percent})=>percent>0.05?`${name} ${(percent*100).toFixed(0)}%`:''} labelLine={false}>{sourceData.map((_,i)=><Cell key={i} fill={['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#84cc16'][i%8]}/>)}</Pie><Tooltip contentStyle={tt}/></PieChart></ResponsiveContainer></P>
                </div>
                <LiveFeed cases={[...data.cases].sort((a,b)=>b.date.localeCompare(a.date))} onCaseSelect={handleCaseSelect} darkMode={darkMode}/>
              </div>

              {/* Top személyek */}
              {topPersons.length > 0 && (
                <P><h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4"/>Top érintett személyek</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topPersons} layout="vertical" margin={{left:10,right:30}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'} horizontal={false}/>
                      <XAxis type="number" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}} allowDecimals={false}/>
                      <YAxis type="category" dataKey="name" width={130} tick={{fill:darkMode?'#d1d5db':'#374151',fontSize:11}}/>
                      <Tooltip contentStyle={tt} formatter={(v)=>[`${v} ügy`,'Előfordulás']}/>
                      <Bar dataKey="count" radius={[0,6,6,0]} maxBarSize={20}>
                        {topPersons.map((_,i)=><Cell key={i} fill={['#ef4444','#f97316','#f59e0b','#3b82f6','#8b5cf6','#06b6d4','#10b981','#84cc16'][i]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </P>
              )}

              {/* Kategória × Státusz heatmap */}
              {catStatusMatrix && (
                <P><h3 className="font-semibold mb-4">Kategória × Státusz mátrix</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr>
                        <th className="text-left py-2 pr-4 opacity-50 font-medium text-xs">Kategória</th>
                        {catStatusMatrix.stats.map(s=><th key={s} className="px-3 py-2 text-center text-xs font-medium opacity-50" style={{color:STATUS_COLORS[s]}}>{STATUS_LABELS_I18N[s]}</th>)}
                      </tr></thead>
                      <tbody>{catStatusMatrix.cats.map(cat=>(
                        <tr key={cat} className={`border-t ${darkMode?'border-gray-700':'border-gray-100'}`}>
                          <td className="py-2 pr-4 font-semibold text-xs" style={{color:CATEGORY_COLORS[cat]}}>{cat}</td>
                          {catStatusMatrix.stats.map(s=>{
                            const v = catStatusMatrix.matrix[cat][s];
                            const max = Math.max(...catStatusMatrix.stats.map(ss=>catStatusMatrix.matrix[cat][ss]));
                            const intensity = max > 0 ? v/max : 0;
                            return <td key={s} className="px-3 py-2 text-center">
                              <span className="inline-block min-w-[2rem] px-2 py-1 rounded-lg text-xs font-bold"
                                style={{background:v>0?`${STATUS_COLORS[s]}${Math.round(intensity*60+20).toString(16).padStart(2,'0')}`:'transparent',
                                        color:v>0?STATUS_COLORS[s]:'rgba(128,128,128,0.3)'}}>
                                {v > 0 ? v : '—'}
                              </span>
                            </td>;
                          })}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </P>
              )}

              {/* Recent */}
              <P><h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4"/>{tr.recentCases}</h3>
                <div className="space-y-2">{[...data.cases].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(c=>(
                  <div key={c.id} onClick={()=>handleCaseSelect(c)}
                    className={`flex items-center justify-between p-3 rounded-lg border-l-4 cursor-pointer transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-50 hover:bg-gray-100'}`}
                    style={{borderLeftColor:STATUS_COLORS[c.status]}}>
                    <div><p className="font-semibold text-sm">{c.title}</p><p className={`text-xs mt-0.5 ${darkMode?'text-gray-400':'text-gray-500'}`}>{c.region} · {c.date} · {c.source}</p></div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <span className="text-sm font-bold opacity-60">{mrdS(c.amount_huf)}</span>
                      <span className="text-xs font-bold" style={{color:STATUS_COLORS[c.status]}}>{STATUS_LABELS_I18N[c.status]}</span>
                    </div>
                  </div>
                ))}</div></P>
            </div>
          )}

          {/* ── CASES ── */}
          {activeTab==='cases' && (
            <div className="space-y-5">
              <P>
                <div className="flex items-center gap-2 mb-4"><Search className="w-4 h-4 opacity-40"/>
                  <input type="text" placeholder={tr.searchPlaceholder}
                    value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm ${darkMode?'bg-gray-700 border-gray-600 text-white placeholder-gray-400':'bg-white border-gray-300'}`}/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="text-xs font-semibold opacity-50 block mb-1">{tr.status_label}</label>
                    <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode?'bg-gray-700 border-gray-600 text-white':'bg-white border-gray-300'}`}>
                      <option value="all">{tr.statusAll}</option>{Object.entries(STATUS_LABELS_I18N).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
                  <div><label className="text-xs font-semibold opacity-50 block mb-1">{tr.category_label}</label>
                    <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode?'bg-gray-700 border-gray-600 text-white':'bg-white border-gray-300'}`}>
                      <option value="all">{tr.catAll}</option><option value="korrupció">{tr.catCorruption}</option><option value="pénzügyi">{tr.catFinancial}</option><option value="közbeszerzés">{tr.catProcurement}</option></select></div>
                  <div><label className="text-xs font-semibold opacity-50 block mb-1">{tr.max_label}: {effectiveMaxAmount.toLocaleString('hu-HU')} Mrd HUF</label>
                    <input type="range" min="1" max={amountCeiling} value={effectiveMaxAmount} onChange={e=>setMaxAmount(+e.target.value)} className="w-full mt-2"/></div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs opacity-40">{filteredCases.length} {tr.displayedCases}</p>
                  {filteredCases.length > 0 && filteredCases.length < data.cases.length && (
                    <button onClick={() => csvExport(filteredCases, '-szurt')}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition">
                      <Download className="w-3 h-3"/> Szűrt lista CSV-ben ({filteredCases.length})
                    </button>
                  )}
                </div>
              </P>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCases.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(c => <CaseCard key={c.id} c={c}/>)}
              </div>
              {filteredCases.length > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${page===1?'opacity-30 cursor-not-allowed':darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'}`}>
                    ← Előző
                  </button>
                  <span className="text-sm opacity-60">{page} / {Math.ceil(filteredCases.length/PAGE_SIZE)}</span>
                  <button onClick={()=>setPage(p=>Math.min(Math.ceil(filteredCases.length/PAGE_SIZE),p+1))} disabled={page===Math.ceil(filteredCases.length/PAGE_SIZE)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${page===Math.ceil(filteredCases.length/PAGE_SIZE)?'opacity-30 cursor-not-allowed':darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'}`}>
                    Következő →
                  </button>
                </div>
              )}
              <div className="hidden">{/* pagination placeholder */}
              </div>
            </div>
          )}

          {/* ── TIMELINE ── */}
          {activeTab==='timeline' && (
            <div className="space-y-6">
              <P>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4"/>{tr.caseTimeline}</h3>
                <Timeline cases={data.cases} onCaseSelect={handleCaseSelect} darkMode={darkMode}
                  selectedId={timelineSelectedId} onSelectId={setTimelineSelectedId}/>
              </P>
              <P>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4"/>{tr.heatmapTitle}</h3>
                <ChoroplethMap cases={data.cases} onCaseSelect={handleCaseSelect} darkMode={darkMode}
                  selectedCounty={selectedCounty} onSelectCounty={selectCounty}/>
              </P>
              <P>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  🇪🇺 {tr.euComparison}
                </h3>
                <EUComparison darkMode={darkMode}/>
              </P>
            </div>
          )}

          {/* ── INVESTIGATIONS ── */}
          {activeTab==='investigations' && (
            <div className="space-y-5">
              <P>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Network className="w-4 h-4"/>{tr.networkGraph}
                  <span className="text-xs font-normal opacity-40 ml-1">— {tr.networkHint}</span></h3>
                <NetworkGraph data={data} darkMode={darkMode} onCaseSelect={handleCaseSelect}
                  selectedNodeId={selectedPersonId} onSelectNode={setSelectedPersonId}/>
              </P>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.investigations.map(inv => (
                  <P key={inv.id}>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold pr-3 leading-snug">{inv.title}</h4>
                      <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${inv.status==='ongoing'?'bg-red-500/20 text-red-500':'bg-yellow-500/20 text-yellow-500'}`}>
                        {inv.status==='ongoing'?`🔴 ${tr.ongoing}`:`🟡 ${tr.pending}`}
                      </span>
                    </div>
                    <p className={`text-sm mb-4 leading-relaxed ${darkMode?'text-gray-300':'text-gray-600'}`}>{inv.description}</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[[tr.authority,inv.investigating_authority],[tr.closure,inv.estimated_closure],[tr.amountLabel,mrdS(inv.involved_amount)]].map(([k,v])=>(
                        <div key={k} className={`p-2.5 rounded-lg ${darkMode?'bg-gray-700':'bg-gray-50'}`}>
                          <p className="text-xs opacity-40">{k}</p>
                          <p className="font-semibold text-xs mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                  </P>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-center ${darkMode?'border-gray-700':'border-gray-200'}`}>
          <Link to="/modszertan" className={`text-xs ${darkMode?'text-gray-500 hover:text-gray-300':'text-gray-400 hover:text-gray-600'} transition`}>
            Módszertan és helyesbítés
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

function PersonDetail({ person, data, darkMode, onClose }) {
  const { t: tr } = useLang();
  const relCases = data.cases.filter(c => c.involved_persons.some(p => p.id === person.id));
  const conns = (data.connections || []).filter(c => c.from === person.id || c.to === person.id);
  return (
    <div className={`p-5 rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{person.name}</h3>
          <p className="text-sm opacity-60">{person.position}</p>
        </div>
        <button onClick={onClose} className="text-2xl opacity-40 hover:opacity-100">×</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-semibold mb-2 opacity-60">{tr.involvedCases} ({relCases.length})</p>
          <div className="space-y-2">
            {relCases.map(c => (
              <div key={c.id} className={`p-2 rounded-lg ${darkMode?'bg-gray-700':'bg-gray-100'}`}>
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-xs opacity-60">{c.region} · {c.date}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2 opacity-60">{tr.connections} ({conns.length})</p>
          <div className="space-y-2">
            {conns.length === 0 && <p className="text-sm opacity-40">{tr.noConnections}</p>}
            {conns.map((conn, i) => {
              const otherId = conn.from === person.id ? conn.to : conn.from;
              const other = data.cases.flatMap(c => c.involved_persons).find(p => p.id === otherId);
              return (
                <div key={i} className={`p-2 rounded-lg ${darkMode?'bg-gray-700':'bg-gray-100'}`}>
                  <p className="text-sm font-semibold">{other?.name || otherId}</p>
                  <p className="text-xs opacity-60">
                    {conn.type === 'business_connection' ? tr.businessConn : tr.politicalConn} · {conn.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

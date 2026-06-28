import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, TrendingUp, Users, Calendar, Download, Search,
  BarChart3, Network, Globe, AlertCircle, Moon, Sun, FileText,
  Star, Share2, Clock, Bookmark } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, Legend } from 'recharts';
import HungaryMap    from './HungaryMap';
import NetworkGraph  from './NetworkGraph';
import LiveFeed      from './LiveFeed';
import Timeline      from './Timeline';
import ChoroplethMap from './ChoroplethMap';
import { exportToPDF }   from '../utils/pdfExport';
import GiscusComments    from './GiscusComments';
import EUComparison      from './EUComparison';
import ErrorBoundary      from './ErrorBoundary';
import TrendAnalysis       from './TrendAnalysis';
import { useLang }         from '../i18n.jsx';

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

// ── Share helper ──────────────────────────────────────────────────────
function shareCase(c) {
  const url = `${window.location.origin}/?case=${c.id}`;
  const text = `${c.title} – ${mrd(c.amount_huf)} | NER Tracker`;
  if (navigator.share) {
    navigator.share({ title: 'NER Tracker', text, url }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(url).then(() => alert('Link másolva: ' + url));
  }
}


// ── Magyar számformázó ───────────────────────────────────────────────
const mrd  = huf => huf != null ? (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF' : 'Összeg ismeretlen';
const mrdS = huf => huf != null ? (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF' : '—';

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
  const [maxAmount, setMaxAmount]           = useState(35);
  const [selectedCase, setSelectedCase]     = useState(null);
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
    }).catch(e => console.error(e));
  }, []);

  const handleCaseSelect = useCallback(c => {
    setSelectedCase(c);
    setSearchParams({ case: c.id });
    setActiveTab('cases');
  }, [setSearchParams]);

  const filteredCases = useMemo(() => {
    if (!data) return [];
    setPage(1);
    const q = searchTerm.toLowerCase();
    return data.cases.filter(c =>
      (!q || c.title.toLowerCase().includes(q) || c.involved_persons.some(p => p.name.toLowerCase().includes(q))) &&
      (filterStatus === 'all' || c.status === filterStatus) &&
      (filterCat === 'all' || c.category === filterCat) &&
      (c.amount_huf == null || c.amount_huf <= maxAmount * 1e9)
    );
  }, [data, searchTerm, filterStatus, filterCat, maxAmount]);

  const watchedCases  = useMemo(() => data?.cases.filter(c => watched.has(c.id)) || [], [data, watched]);
  const totalAmount   = useMemo(() => data?.cases.reduce((s,c) => s+(c.amount_huf||0),0)??0, [data]);
  const categoryData  = useMemo(() => { if(!data)return[]; const m={}; data.cases.forEach(c=>{m[c.category]=(m[c.category]||0)+1;}); return Object.entries(m).map(([name,value])=>({name,value})); }, [data]);
  const timelineData  = useMemo(() => { if(!data)return[]; const m={}; data.cases.forEach(c=>{const y=c.date.slice(0,4);m[y]=(m[y]||0)+1;}); return Object.entries(m).sort().map(([year,count])=>({year,count})); }, [data]);
  const statusData    = useMemo(() => { if(!data)return[]; const m={}; data.cases.forEach(c=>{m[c.status]=(m[c.status]||0)+1;}); return Object.entries(m).map(([name,value])=>({name:STATUS_LABELS_I18N[name]||name,value})); }, [data]);
  const scatterData   = useMemo(() => categoryData.map(cat=>({name:cat.name,count:data?.cases.filter(c=>c.category===cat.name).length||0,total:+((data?.cases.filter(c=>c.category===cat.name).reduce((s,c)=>s+(c.amount_huf||0),0)||0)/1e9).toFixed(1)})), [data,categoryData]);
  const allPersons    = useMemo(() => { if(!data)return[]; const seen=new Set(); return data.cases.flatMap(c=>c.involved_persons).filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}); }, [data]);

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

  const csvExport = () => {
    if (!data) return;
    const rows = [['ID','Cím','Kategória','Státusz','Régió','Összeg HUF','Dátum','Forrás','Személyek'],
      ...data.cases.map(c=>[c.id,`"${c.title}"`,c.category,c.status,c.region,c.amount_huf,c.date,c.source,`"${c.involved_persons.map(p=>p.name).join('; ')}"`])
    ].map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows],{type:'text/csv;charset=utf-8;'}));
    a.download = `ner-tracker-${new Date().toISOString().slice(0,10)}.csv`;
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
            title={watched.has(c.id)?tr.unfollow:tr.follow}
            className={`p-1 rounded transition ${watched.has(c.id)?'text-yellow-400':'opacity-40 hover:opacity-100'}`}>
            <Star className="w-3.5 h-3.5" fill={watched.has(c.id)?'currentColor':'none'}/>
          </button>
          <button onClick={e=>{e.stopPropagation();shareCase(c);}}
            title={tr.share} className="p-1 rounded opacity-40 hover:opacity-100">
            <Share2 className="w-3.5 h-3.5"/>
          </button>
          {c.link && (
            <a href={c.link} target="_blank" rel="noopener noreferrer"
              onClick={e=>e.stopPropagation()}
              title={tr.viewSource}
              className="p-1 rounded opacity-40 hover:opacity-100 hover:text-blue-400 transition">
              <ExternalLink className="w-3.5 h-3.5"/>
            </a>
          )}
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
            <button onClick={()=>setLang(lang==='hu'?'en':'hu')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'}`}>
              {lang==='hu'?'EN':'HU'}
            </button>
            <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'}`}>
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
                  <P><h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4"/>{tr.categoryChart}</h3>
                    <ResponsiveContainer width="100%" height={200}><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'}/><XAxis dataKey="name" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><YAxis tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><Tooltip contentStyle={tt}/><Bar dataKey="value" radius={[6,6,0,0]}>{categoryData.map((e,i)=><Cell key={i} fill={CATEGORY_COLORS[e.name]||'#6b7280'}/>)}</Bar></BarChart></ResponsiveContainer></P>
                  <P><h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4"/>{tr.yearlyChart}</h3>
                    <ResponsiveContainer width="100%" height={200}><LineChart data={timelineData}><CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'}/><XAxis dataKey="year" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><YAxis tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><Tooltip contentStyle={tt}/><Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} dot={{fill:'#8b5cf6',r:5}}/></LineChart></ResponsiveContainer></P>
                  <P><h3 className="font-semibold mb-4">{tr.statusChart}</h3>
                    <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{statusData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}</Pie><Tooltip contentStyle={tt}/></PieChart></ResponsiveContainer></P>
                  <P><h3 className="font-semibold mb-4">{tr.amountVsCases}</h3>
                    <ResponsiveContainer width="100%" height={200}><ScatterChart margin={{top:10,right:10,bottom:20,left:10}}><CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'}/><XAxis type="number" dataKey="count" name="Ügyek" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:10}}/><YAxis type="number" dataKey="total" name="Mrd HUF" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:10}}/><Tooltip contentStyle={tt}/><Scatter data={scatterData} fill="#8b5cf6"/></ScatterChart></ResponsiveContainer></P>
                </div>
                <LiveFeed cases={[...data.cases].sort((a,b)=>b.date.localeCompare(a.date))} onCaseSelect={handleCaseSelect} darkMode={darkMode}/>
              </div>

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
                  <div><label className="text-xs font-semibold opacity-50 block mb-1">{tr.max_label}: {maxAmount} Mrd HUF</label>
                    <input type="range" min="1" max="35" value={maxAmount} onChange={e=>setMaxAmount(+e.target.value)} className="w-full mt-2"/></div>
                </div>
                <p className="text-xs mt-3 opacity-40">{filteredCases.length} {tr.displayedCases}</p>
              </P>

              <P>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4"/>{tr.interactiveMap}
                  <span className="text-xs font-normal opacity-40 ml-1">— {tr.mapClickHint}</span></h3>
                <div className="flex flex-wrap gap-3 mb-3 text-xs">
                  {Object.entries(STATUS_LABELS_I18N).map(([k,v])=>(
                    <span key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{background:STATUS_COLORS[k]}}/>{v}</span>
                  ))}
                </div>
                <ErrorBoundary label="Térkép">
          <HungaryMap cases={filteredCases} onCaseSelect={handleCaseSelect} darkMode={darkMode}/>
        </ErrorBoundary>
              </P>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCases.map(c => <CaseCard key={c.id} c={c}/>)}
              </div>

              {selectedCase && (
                <CaseDetail c={selectedCase} darkMode={darkMode} watched={watched} data={data}
                  toggleWatch={toggleWatch} onClose={()=>{setSelectedCase(null);setSearchParams({});}}/>
              )}
            </div>
          )}

          {/* ── TIMELINE ── */}
          {activeTab==='timeline' && (
            <div className="space-y-6">
              <P>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4"/>{tr.caseTimeline}</h3>
                <Timeline cases={data.cases} onCaseSelect={handleCaseSelect} darkMode={darkMode}/>
              </P>
              <P>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4"/>{tr.heatmapTitle}</h3>
                <ChoroplethMap cases={data.cases} onCaseSelect={handleCaseSelect} darkMode={darkMode}/>
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
                <NetworkGraph data={data} darkMode={darkMode}/>
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
      </div>
    </div>
  );
}


// ── Keresési kiemelés ────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'));
  return <>{parts.map((p,i) => p.toLowerCase()===query.toLowerCase()
    ? <mark key={i} className="bg-yellow-300 text-gray-900 rounded px-0.5">{p}</mark>
    : p)}</>;
}

function CaseDetail({ c, darkMode, watched, toggleWatch, onClose, data }) {
  const { t: tr } = useLang();
  const STATUS_LABELS_I18N = { active: tr.statusActive, investigation: tr.statusInvestigation, closed: tr.statusClosed, appeal: tr.statusAppeal };

  const relatedCases = data?.cases.filter(other =>
    other.id !== c.id && (
      other.region === c.region ||
      other.involved_persons.some(p => c.involved_persons.some(cp => cp.id === p.id))
    )
  ).slice(0, 3) || [];

  return (
    <div className={`p-5 rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold pr-4">{c.title}</h3>
        <div className="flex items-center gap-2">
          <button onClick={()=>toggleWatch(c.id)}
            title={watched.has(c.id)?tr.removeCase:tr.followCase}
            className={`p-1.5 rounded-lg transition ${watched.has(c.id)?'bg-yellow-500/20 text-yellow-400':'opacity-40 hover:opacity-100'}`}>
            <Star className="w-4 h-4" fill={watched.has(c.id)?'currentColor':'none'}/>
          </button>
          <button onClick={()=>shareCase(c)} title={tr.share}
            className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition">
            <Share2 className="w-4 h-4"/>
          </button>
          <button onClick={onClose} className="text-2xl opacity-40 hover:opacity-100 ml-1">×</button>
        </div>
      </div>
      <p className={`text-sm mb-4 leading-relaxed ${darkMode?'text-gray-300':'text-gray-600'}`}>{c.description}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[[tr.status_label,STATUS_LABELS_I18N[c.status]],[tr.category_label,c.category],[tr.regionLabel,c.region],[tr.amountLabel,`${mrd(c.amount_huf)}`]].map(([k,v])=>(
          <div key={k} className={`p-3 rounded-lg ${darkMode?'bg-gray-700':'bg-gray-100'}`}><p className="text-xs opacity-40">{k}</p><p className="font-semibold text-sm mt-0.5">{v}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><p className="text-sm font-semibold mb-2 opacity-60">{tr.involvedPersons}</p>
          <div className="space-y-2">{c.involved_persons.map(p=>(
            <div key={p.id} className={`p-2.5 rounded-lg ${darkMode?'bg-gray-700':'bg-gray-100'}`}>
              <p className="font-semibold text-sm">{p.name}</p><p className="text-xs opacity-50">{p.position}</p>
            </div>
          ))}</div></div>
        <div><p className="text-sm font-semibold mb-2 opacity-60">{tr.details}</p>
          <div className={`p-3 rounded-lg space-y-2 ${darkMode?'bg-gray-700':'bg-gray-100'}`}>
            <p className="text-sm"><b>{tr.sourceLabel}:</b> {c.source}</p>
            <p className="text-sm"><b>{tr.dateLabel}:</b> {c.date}</p>
            {c.tags?.length>0 && <div className="flex flex-wrap gap-1 pt-1">{c.tags.map(t=><span key={t} className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">{t}</span>)}</div>}
            <a href={c.link} target="_blank" rel="noopener noreferrer"
              className="block pt-1 text-sm text-blue-500 hover:underline">
              {tr.viewSource}
            </a>
            {c.document_links?.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs opacity-40 font-semibold">{tr.documents}</p>
                {c.document_links.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="block text-xs text-purple-400 hover:underline truncate">
                    📎 {doc.title}
                  </a>
                ))}
              </div>
            )}
          </div></div>
      </div>
      {relatedCases.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2 opacity-60">{tr.relatedCases}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {relatedCases.map(rc => (
              <div key={rc.id} className={`p-3 rounded-lg cursor-pointer transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => onClose()}>
                <p className="text-xs font-semibold leading-snug">{rc.title}</p>
                <p className="text-xs opacity-50 mt-1">{rc.region} · {mrdS(rc.amount_huf)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, TrendingUp, Users, Calendar, Download, Search,
  BarChart3, Network, Globe, AlertCircle, Moon, Sun, FileText } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import HungaryMap   from './HungaryMap';
import NetworkGraph from './NetworkGraph';
import LiveFeed     from './LiveFeed';
import { exportToPDF } from '../utils/pdfExport';

const STATUS_COLORS = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const STATUS_LABELS = { active:'Aktív', investigation:'Nyomozás', closed:'Lezárult', appeal:'Fellebbezés' };
const CATEGORY_COLORS = { 'korrupció':'#ef4444', 'pénzügyi':'#3b82f6', 'közbeszerzés':'#8b5cf6' };
const PIE_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b'];

export default function Dashboard({ darkMode, toggleDarkMode }) {
  const [data, setData]                     = useState(null);
  const [activeTab, setActiveTab]           = useState('overview');
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterCat, setFilterCat]           = useState('all');
  const [maxAmount, setMaxAmount]           = useState(35);
  const [selectedCase, setSelectedCase]     = useState(null);

  useEffect(() => {
    fetch('/data/news.json').then(r => r.json()).then(setData)
      .catch(e => console.error('Data fetch error:', e));
  }, []);

  const filteredCases = useMemo(() => {
    if (!data) return [];
    const q = searchTerm.toLowerCase();
    return data.cases.filter(c =>
      (!q || c.title.toLowerCase().includes(q) || c.involved_persons.some(p => p.name.toLowerCase().includes(q))) &&
      (filterStatus === 'all' || c.status === filterStatus) &&
      (filterCat === 'all' || c.category === filterCat) &&
      c.amount_huf <= maxAmount * 1e9
    );
  }, [data, searchTerm, filterStatus, filterCat, maxAmount]);

  const totalAmount   = useMemo(() => data?.cases.reduce((s,c) => s+c.amount_huf,0)??0, [data]);
  const categoryData  = useMemo(() => { if(!data)return[]; const m={}; data.cases.forEach(c=>{m[c.category]=(m[c.category]||0)+1;}); return Object.entries(m).map(([name,value])=>({name,value})); }, [data]);
  const timelineData  = useMemo(() => { if(!data)return[]; const m={}; data.cases.forEach(c=>{const y=c.date.slice(0,4); m[y]=(m[y]||0)+1;}); return Object.entries(m).sort().map(([year,count])=>({year,count})); }, [data]);
  const statusData    = useMemo(() => { if(!data)return[]; const m={}; data.cases.forEach(c=>{m[c.status]=(m[c.status]||0)+1;}); return Object.entries(m).map(([name,value])=>({name:STATUS_LABELS[name]||name,value})); }, [data]);
  const scatterData   = useMemo(() => categoryData.map(cat=>({ name:cat.name, count:data?.cases.filter(c=>c.category===cat.name).length||0, total:+((data?.cases.filter(c=>c.category===cat.name).reduce((s,c)=>s+c.amount_huf,0)||0)/1e9).toFixed(1) })), [data,categoryData]);
  const allPersons    = useMemo(() => { if(!data)return[]; const seen=new Set(); return data.cases.flatMap(c=>c.involved_persons).filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}); }, [data]);

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

  if (!data) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode?'bg-gray-900 text-white':'bg-gray-50 text-gray-900'}`}>
      <div className="text-center"><div className="text-4xl mb-3 animate-spin">⚙️</div><p className="font-semibold">Adatok betöltése...</p></div>
    </div>
  );

  // ── OVERVIEW ────────────────────────────────────────────────────────
  const Overview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-5 flex items-center gap-4 shadow-lg">
        <AlertCircle className="w-9 h-9 flex-shrink-0"/>
        <div>
          <p className="font-bold text-xl">Összesen {(totalAmount/1e9).toFixed(1)} milliárd HUF érintett közpénz</p>
          <p className="text-sm opacity-90 mt-0.5">{data.cases.length} ügy · {data.investigations.length} nyomozás · {allPersons.length} érintett személy</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          [<TrendingUp className="w-4 h-4"/>, 'Ügyek',            data.cases.length,  null,       'bg-blue-500/20 border-blue-500/40'],
          [<AlertCircle className="w-4 h-4"/>,'Nyomozás',         data.cases.filter(c=>c.status==='investigation').length, null, 'bg-red-500/20 border-red-500/40'],
          [<Users className="w-4 h-4"/>,      'Érintett személyek', allPersons.length, null,       'bg-purple-500/20 border-purple-500/40'],
          [<BarChart3 className="w-4 h-4"/>,  'Összes összeg',    `${(totalAmount/1e9).toFixed(1)}B`, 'HUF', 'bg-green-500/20 border-green-500/40'],
          [<MapPin className="w-4 h-4"/>,     'Érintett régiók',  new Set(data.cases.map(c=>c.region)).size, null, 'bg-orange-500/20 border-orange-500/40'],
        ].map(([icon,label,value,sub,cls],i) => (
          <div key={i} className={`p-4 rounded-xl border ${cls}`}>
            <div className="flex items-center gap-2 mb-2 opacity-70 text-sm">{icon}{label}</div>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs opacity-50">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Charts (2/3) */}
        <div className="xl:col-span-2 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <P><h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4"/>Kategória</h3>
              <ResponsiveContainer width="100%" height={210}><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'}/><XAxis dataKey="name" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><YAxis tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><Tooltip contentStyle={tt}/><Bar dataKey="value" radius={[6,6,0,0]}>{categoryData.map((e,i)=><Cell key={i} fill={CATEGORY_COLORS[e.name]||'#6b7280'}/>)}</Bar></BarChart></ResponsiveContainer></P>
            <P><h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4"/>Időbeli megoszlás</h3>
              <ResponsiveContainer width="100%" height={210}><LineChart data={timelineData}><CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'}/><XAxis dataKey="year" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><YAxis tick={{fill:darkMode?'#9ca3af':'#555',fontSize:11}}/><Tooltip contentStyle={tt}/><Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} dot={{fill:'#8b5cf6',r:5}}/></LineChart></ResponsiveContainer></P>
            <P><h3 className="font-semibold mb-4">Státusz megoszlás</h3>
              <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>{statusData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}</Pie><Tooltip contentStyle={tt}/></PieChart></ResponsiveContainer></P>
            <P><h3 className="font-semibold mb-4">Összeg vs. Ügyek (Mrd HUF)</h3>
              <ResponsiveContainer width="100%" height={200}><ScatterChart margin={{top:10,right:10,bottom:20,left:10}}><CartesianGrid strokeDasharray="3 3" stroke={darkMode?'#374151':'#e5e7eb'}/><XAxis type="number" dataKey="count" name="Ügyek" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:10}}/><YAxis type="number" dataKey="total" name="Mrd HUF" tick={{fill:darkMode?'#9ca3af':'#555',fontSize:10}}/><Tooltip contentStyle={tt}/><Scatter data={scatterData} fill="#8b5cf6"/></ScatterChart></ResponsiveContainer></P>
          </div>
        </div>

        {/* Live Feed (1/3) */}
        <div className="space-y-4">
          <LiveFeed
            cases={[...data.cases].sort((a,b)=>b.date.localeCompare(a.date))}
            onCaseSelect={c => { setSelectedCase(c); setActiveTab('cases'); }}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Latest cases strip */}
      <P>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>Legújabb ügyek</h3>
        <div className="space-y-2">
          {[...data.cases].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(c=>(
            <div key={c.id} onClick={()=>{setSelectedCase(c);setActiveTab('cases');}}
              className={`flex items-center justify-between p-3 rounded-lg border-l-4 cursor-pointer transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-50 hover:bg-gray-100'}`}
              style={{borderLeftColor:STATUS_COLORS[c.status]}}>
              <div><p className="font-semibold text-sm">{c.title}</p><p className={`text-xs mt-0.5 ${darkMode?'text-gray-400':'text-gray-500'}`}>{c.region} · {c.date} · {c.source}</p></div>
              <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                <span className="text-sm font-bold opacity-70">{(c.amount_huf/1e9).toFixed(1)}B HUF</span>
                <span className="text-xs font-bold" style={{color:STATUS_COLORS[c.status]}}>{STATUS_LABELS[c.status]}</span>
              </div>
            </div>
          ))}
        </div>
      </P>
    </div>
  );

  // ── CASES ───────────────────────────────────────────────────────────
  const Cases = () => (
    <div className="space-y-5">
      <P>
        <div className="flex items-center gap-2 mb-4"><Search className="w-4 h-4 opacity-40"/>
          <input type="text" placeholder="Keresés ügy vagy személy neve szerint..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${darkMode?'bg-gray-700 border-gray-600 text-white placeholder-gray-400':'bg-white border-gray-300'}`}/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="text-xs font-semibold opacity-50 block mb-1">Státusz</label>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode?'bg-gray-700 border-gray-600 text-white':'bg-white border-gray-300'}`}>
              <option value="all">Összes</option>{Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="text-xs font-semibold opacity-50 block mb-1">Kategória</label>
            <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className={`w-full px-3 py-2 rounded-lg border text-sm ${darkMode?'bg-gray-700 border-gray-600 text-white':'bg-white border-gray-300'}`}>
              <option value="all">Összes</option><option value="korrupció">Korrupció</option><option value="pénzügyi">Pénzügyi</option><option value="közbeszerzés">Közbeszerzés</option></select></div>
          <div><label className="text-xs font-semibold opacity-50 block mb-1">Max: {maxAmount}B HUF</label>
            <input type="range" min="1" max="35" value={maxAmount} onChange={e=>setMaxAmount(+e.target.value)} className="w-full mt-2"/></div>
        </div>
        <p className="text-xs mt-3 opacity-40">{filteredCases.length} ügy megjelenítve</p>
      </P>

      <P>
        <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4"/>Interaktív térkép
          <span className="text-xs font-normal opacity-40 ml-1">— kattints a körökre</span></h3>
        <div className="flex flex-wrap gap-3 mb-3 text-xs">
          {Object.entries(STATUS_LABELS).map(([k,v])=>(
            <span key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{background:STATUS_COLORS[k]}}/>{v}</span>
          ))}
          <span className="opacity-30 ml-1">· körméret ∝ összeg</span>
        </div>
        <HungaryMap cases={filteredCases} onCaseSelect={setSelectedCase} darkMode={darkMode}/>
      </P>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCases.map(c=>(
          <div key={c.id} onClick={()=>setSelectedCase(c)}
            className={`p-4 rounded-xl border-l-4 cursor-pointer transition ${selectedCase?.id===c.id?(darkMode?'bg-blue-900/40 border-blue-400':'bg-blue-50 border-blue-400'):(darkMode?'bg-gray-800 border-gray-700 hover:bg-gray-700':'bg-white border-gray-200 hover:bg-gray-50')}`}
            style={{borderLeftColor:CATEGORY_COLORS[c.category]}}>
            <div className="flex justify-between items-start mb-2"><span className="text-xs font-semibold opacity-50">{c.source}</span><span className="text-xs font-bold" style={{color:STATUS_COLORS[c.status]}}>{STATUS_LABELS[c.status]}</span></div>
            <p className="font-semibold text-sm leading-snug">{c.title}</p>
            <p className="text-xs mt-1 opacity-50">{c.region} · {c.date}</p>
            <p className="text-sm font-bold mt-2">{(c.amount_huf/1e9).toFixed(1)}B HUF</p>
          </div>
        ))}
      </div>

      {selectedCase && <CaseDetail c={selectedCase} darkMode={darkMode} onClose={()=>setSelectedCase(null)}/>}
    </div>
  );

  // ── INVESTIGATIONS ──────────────────────────────────────────────────
  const Investigations = () => (
    <div className="space-y-5">
      {/* SVG Network Graph */}
      <P>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Network className="w-4 h-4"/>Kapcsolati háló
          <span className="text-xs font-normal opacity-40 ml-1">— erők szimulációja · kattints a csomópontokra</span>
        </h3>
        <NetworkGraph data={data} darkMode={darkMode}/>
      </P>

      {/* Investigations list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.investigations.map(inv=>(
          <P key={inv.id}>
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold pr-3 leading-snug">{inv.title}</h4>
              <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${inv.status==='ongoing'?'bg-red-500/20 text-red-500':'bg-yellow-500/20 text-yellow-500'}`}>
                {inv.status==='ongoing'?'🔴 Folyamatban':'🟡 Függőben'}
              </span>
            </div>
            <p className={`text-sm mb-4 leading-relaxed ${darkMode?'text-gray-300':'text-gray-600'}`}>{inv.description}</p>
            <div className="grid grid-cols-3 gap-3">
              {[['Hatóság', inv.investigating_authority],['Lezárás', inv.estimated_closure],['Összeg', `${(inv.involved_amount/1e9).toFixed(1)}B HUF`]].map(([k,v])=>(
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
  );

  // ── SHELL ───────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode?'bg-gray-900 text-white':'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode?'border-gray-700':'border-gray-200'}`}>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="w-7 h-7"/> NER Tracker</h1>
            <p className={`text-xs mt-0.5 ${darkMode?'text-gray-400':'text-gray-500'}`}>Magyar kormányzati korrupciós ügyek nyilvántartása</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={csvExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">
              <Download className="w-4 h-4"/> CSV
            </button>
            <button onClick={() => exportToPDF(data)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition">
              <FileText className="w-4 h-4"/> PDF
            </button>
            <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-200 hover:bg-gray-300'}`}>
              {darkMode?<Sun className="w-4 h-4"/>:<Moon className="w-4 h-4"/>}
            </button>
          </div>
        </div>

        <div className={`flex gap-1 px-6 pt-4 border-b ${darkMode?'border-gray-700':'border-gray-200'}`}>
          {[{id:'overview',label:'📊 Áttekintés'},{id:'cases',label:'🗺️ Ügyek & Térkép'},{id:'investigations',label:'🔍 Nyomozások'}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${activeTab===t.id?'border-blue-500 text-blue-500':darkMode?'border-transparent text-gray-400 hover:text-gray-200':'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab==='overview'       && <Overview/>}
          {activeTab==='cases'          && <Cases/>}
          {activeTab==='investigations' && <Investigations/>}
        </div>
      </div>
    </div>
  );
}

function CaseDetail({ c, darkMode, onClose }) {
  return (
    <div className={`p-5 rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-start mb-4"><h3 className="text-xl font-bold pr-4">{c.title}</h3><button onClick={onClose} className="text-2xl opacity-40 hover:opacity-100">×</button></div>
      <p className={`text-sm mb-4 leading-relaxed ${darkMode?'text-gray-300':'text-gray-600'}`}>{c.description}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[['Státusz',STATUS_LABELS[c.status]],['Kategória',c.category],['Régió',c.region],['Összeg',`${(c.amount_huf/1e9).toFixed(1)}B HUF`]].map(([k,v])=>(
          <div key={k} className={`p-3 rounded-lg ${darkMode?'bg-gray-700':'bg-gray-100'}`}><p className="text-xs opacity-40">{k}</p><p className="font-semibold text-sm mt-0.5">{v}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><p className="text-sm font-semibold mb-2 opacity-60">Érintett személyek</p>
          <div className="space-y-2">{c.involved_persons.map(p=>(
            <div key={p.id} className={`p-2.5 rounded-lg ${darkMode?'bg-gray-700':'bg-gray-100'}`}>
              <p className="font-semibold text-sm">{p.name}</p><p className="text-xs opacity-50">{p.position}</p>
            </div>
          ))}</div></div>
        <div><p className="text-sm font-semibold mb-2 opacity-60">Részletek</p>
          <div className={`p-3 rounded-lg space-y-2 ${darkMode?'bg-gray-700':'bg-gray-100'}`}>
            <p className="text-sm"><b>Forrás:</b> {c.source}</p>
            <p className="text-sm"><b>Dátum:</b> {c.date}</p>
            {c.tags?.length>0 && <div className="flex flex-wrap gap-1 pt-1">{c.tags.map(t=><span key={t} className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">{t}</span>)}</div>}
            <a href={c.link} target="_blank" rel="noopener noreferrer" className="block pt-1 text-sm text-blue-500 hover:underline">→ Forrás megtekintése</a>
          </div></div>
      </div>
    </div>
  );
}

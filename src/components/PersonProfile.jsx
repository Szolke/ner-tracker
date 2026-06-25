import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, MapPin, Network } from 'lucide-react';

const mrd = huf => (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+'\u00a0Mrd\u00a0Ft';
const STATUS_COLORS = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const STATUS_LABELS = { active:'Aktív', investigation:'Nyomozás', closed:'Lezárult', appeal:'Fellebbezés' };
const CATEGORY_COLORS = { 'korrupció':'#ef4444', 'pénzügyi':'#3b82f6', 'közbeszerzés':'#8b5cf6' };

export default function PersonProfile({ darkMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/data/news.json').then(r=>r.json()).then(setData);
  }, []);

  if (!data) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode?'bg-gray-900 text-white':'bg-gray-50'}`}>
      <div className="animate-spin text-4xl">⚙️</div>
    </div>
  );

  // Find person
  const person = data.cases.flatMap(c=>c.involved_persons).find(p=>p.id===id);
  if (!person) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode?'bg-gray-900 text-white':'bg-gray-50'}`}>
      <div className="text-center">
        <p className="text-4xl mb-4">👤</p>
        <p className="font-bold text-xl">Személy nem található</p>
        <button onClick={()=>navigate('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Vissza</button>
      </div>
    </div>
  );

  const relCases = data.cases.filter(c=>c.involved_persons.some(p=>p.id===id));
  const conns = (data.connections||[]).filter(c=>c.from===id||c.to===id);
  const totalAmt = relCases.reduce((s,c)=>s+c.amount_huf,0);
  const byStatus = {};
  relCases.forEach(c=>{ byStatus[c.status]=(byStatus[c.status]||0)+1; });
  const byYear = {};
  relCases.forEach(c=>{ const y=c.date.slice(0,4); byYear[y]=(byYear[y]||0)+1; });

  const P = ({children,className=''}) => (
    <div className={`p-5 rounded-xl border ${darkMode?'bg-gray-800 border-gray-700':'bg-white border-gray-200'} ${className}`}>
      {children}
    </div>
  );

  return (
    <div className={`min-h-screen ${darkMode?'bg-gray-900 text-white':'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={()=>navigate('/')}
            className={`p-2 rounded-lg transition ${darkMode?'bg-gray-800 hover:bg-gray-700':'bg-white hover:bg-gray-100 border border-gray-200'}`}>
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <p className="text-sm opacity-50">Személy profil</p>
            <h1 className="text-3xl font-bold">{person.name}</h1>
            <p className={`text-sm mt-0.5 ${darkMode?'text-gray-400':'text-gray-600'}`}>{person.position}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            [<TrendingUp className="w-4 h-4"/>, 'Érintett ügyek', relCases.length, 'bg-red-500/20 border-red-500/40'],
            [<MapPin className="w-4 h-4"/>, 'Érintett összeg', mrd(totalAmt), 'bg-blue-500/20 border-blue-500/40'],
            [<Network className="w-4 h-4"/>, 'Kapcsolatok', conns.length, 'bg-purple-500/20 border-purple-500/40'],
            [<Users className="w-4 h-4"/>, 'Régiók', new Set(relCases.map(c=>c.region)).size, 'bg-green-500/20 border-green-500/40'],
          ].map(([icon,label,val,cls],i)=>(
            <div key={i} className={`p-4 rounded-xl border ${cls}`}>
              <div className="flex items-center gap-2 text-sm opacity-60 mb-1">{icon}{label}</div>
              <p className="text-xl font-bold">{val}</p>
            </div>
          ))}
        </div>

        {/* Timeline of activity */}
        <P>
          <h3 className="font-semibold mb-4">Érintettség idővonalon</h3>
          <div className="flex items-end gap-3">
            {Object.entries(byYear).sort().map(([year,count])=>(
              <div key={year} className="flex flex-col items-center gap-1">
                <div className="bg-red-500 rounded-t w-10" style={{height: `${count*32}px`}}/>
                <span className="text-xs opacity-50">{year}</span>
                <span className="text-xs font-bold">{count}</span>
              </div>
            ))}
          </div>
        </P>

        {/* Cases */}
        <P>
          <h3 className="font-semibold mb-4">Érintett ügyek ({relCases.length})</h3>
          <div className="space-y-3">
            {relCases.map(c=>(
              <div key={c.id} onClick={()=>navigate(`/?case=${c.id}`)}
                className={`p-4 rounded-lg border-l-4 cursor-pointer transition ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-50 hover:bg-gray-100'}`}
                style={{borderLeftColor:CATEGORY_COLORS[c.category]}}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className={`text-sm mt-0.5 ${darkMode?'text-gray-400':'text-gray-500'}`}>
                      {c.region} · {c.date} · {mrd(c.amount_huf)}
                    </p>
                  </div>
                  <span className="text-xs font-bold ml-3 flex-shrink-0"
                    style={{color:STATUS_COLORS[c.status]}}>{STATUS_LABELS[c.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </P>

        {/* Connections */}
        {conns.length > 0 && (
          <P>
            <h3 className="font-semibold mb-4">Kapcsolatok ({conns.length})</h3>
            <div className="space-y-2">
              {conns.map((conn,i)=>{
                const otherId = conn.from===id ? conn.to : conn.from;
                const other = data.cases.flatMap(c=>c.involved_persons).find(p=>p.id===otherId);
                return (
                  <div key={i} onClick={()=>navigate(`/szemely/${otherId}`)}
                    className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between ${darkMode?'bg-gray-700 hover:bg-gray-600':'bg-gray-100 hover:bg-gray-200'}`}>
                    <div>
                      <p className="font-semibold text-sm">{other?.name||otherId}</p>
                      <p className="text-xs opacity-50">{other?.position}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${conn.type==='business_connection'?'bg-blue-500/20 text-blue-400':'bg-yellow-500/20 text-yellow-400'}`}>
                      {conn.type==='business_connection'?'🤝 Üzleti':'🏛️ Politikai'}
                    </span>
                  </div>
                );
              })}
            </div>
          </P>
        )}
      </div>
    </div>
  );
}

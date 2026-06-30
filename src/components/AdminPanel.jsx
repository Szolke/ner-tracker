import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Plus, Send, ArrowLeft, CheckCircle, XCircle, Activity } from 'lucide-react';

const API      = "https://api.github.com/repos/Szolke/ner-tracker/contents";
const PASSWORD = "ner2026admin";

const REGIONS = [
  "Budapest","Pest","Fejér","Győr-Moson-Sopron","Vas","Veszprém","Zala","Somogy",
  "Baranya","Tolna","Bács-Kiskun","Csongrád-Csanád","Békés","Hajdú-Bihar",
  "Szabolcs-Szatmár-Bereg","Heves","Jász-Nagykun-Szolnok","Borsod-Abaúj-Zemplén",
  "Nógrád","Komárom-Esztergom"
];
const COORDS = {
  "Budapest":[47.4979,19.0402],"Pest":[47.58,19.16],"Fejér":[47.118,18.432],
  "Győr-Moson-Sopron":[47.6829,17.6271],"Vas":[47.2308,16.6225],"Veszprém":[47.0931,17.9108],
  "Zala":[46.6678,16.9897],"Somogy":[46.3568,17.7761],"Baranya":[46.0727,18.2323],
  "Tolna":[46.4677,18.5595],"Bács-Kiskun":[46.5935,19.3542],"Csongrád-Csanád":[46.253,20.1414],
  "Békés":[46.7568,21.092],"Hajdú-Bihar":[47.5316,21.6273],"Szabolcs-Szatmár-Bereg":[47.959,22.0024],
  "Heves":[47.893,20.0773],"Jász-Nagykun-Szolnok":[47.1784,20.1823],"Borsod-Abaúj-Zemplén":[48.1035,20.7784],
  "Nógrád":[48.0139,19.5148],"Komárom-Esztergom":[47.7416,18.3878],
};

const empty = {
  title:'', description:'', link:'', date: new Date().toISOString().slice(0,10),
  source:'Telex', category:'korrupció', status:'active',
  region:'Budapest', amount_huf:'', tags:'',
  person_name:'', person_position:''
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const [authed, setAuthed]   = useState(false);
  const [ghToken, setGhToken] = useState(() => { try { return localStorage.getItem('ner-gh-token')||''; } catch{ return ''; } });
  const [pw, setPw]           = useState('');
  const [form, setForm]       = useState(empty);
  const [status, setStatus]   = useState(null); // null | 'loading' | 'ok' | 'err'
  const [errMsg, setErrMsg]   = useState('');
  const [cleanupLog, setCleanupLog] = useState(null); // null=betöltés alatt, []=nincs adat

  useEffect(() => {
    if (!authed) return;
    fetch('/data/cleanup-log.json')
      .then(r => r.ok ? r.json() : [])
      .then(setCleanupLog)
      .catch(() => setCleanupLog([]));
  }, [authed]);

  const checkPw = () => {
    if (pw === PASSWORD && ghToken.startsWith('ghp_')) {
      try { localStorage.setItem('ner-gh-token', ghToken); } catch {}
      setAuthed(true);
    } else if (pw !== PASSWORD) {
      alert('Helytelen jelszó');
    } else {
      alert('Érvénytelen GitHub token (ghp_... formátum szükséges)');
    }
  };

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submit = async () => {
    if (!form.title || !form.description || !form.amount_huf) {
      alert('Cím, leírás és összeg kötelező!'); return;
    }
    setStatus('loading');

    try {
      // 1. Get current news.json
      const r1 = await fetch(`${API}/public/data/news.json`, {
        headers: { Authorization: `token ${ghToken}` }
      });
      const d1 = await r1.json();
      const current = JSON.parse(atob(d1.content.replace(/\n/g,'')));

      // 2. Build new case
      const newCase = {
        id: 'case_' + Date.now().toString(36),
        title:       form.title,
        description: form.description,
        link:        form.link,
        date:        form.date,
        source:      form.source,
        category:    form.category,
        status:      form.status,
        region:      form.region,
        coordinates: COORDS[form.region] || [47.4979,19.0402],
        amount_huf:  parseInt(form.amount_huf.replace(/\D/g,'')) || 0,
        tags:        form.tags.split(',').map(t=>t.trim()).filter(Boolean),
        involved_persons: form.person_name ? [{
          id: 'p_' + Date.now().toString(36),
          name: form.person_name,
          position: form.person_position
        }] : []
      };

      current.cases.unshift(newCase);
      current.metadata.total_cases = current.cases.length;
      current.metadata.last_updated = new Date().toISOString();

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(current, null, 2))));

      // 3. Push to GitHub
      const r2 = await fetch(`${API}/public/data/news.json`, {
        method: 'PUT',
        headers: { Authorization: `token ${ghToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `➕ Új ügy: ${form.title.slice(0,60)}`,
          content,
          sha: d1.sha
        })
      });
      const d2 = await r2.json();
      if (d2.commit) {
        setStatus('ok');
        setForm(empty);
      } else {
        throw new Error(d2.message || 'GitHub hiba');
      }
    } catch(e) {
      setStatus('err');
      setErrMsg(e.message);
    }
  };

  const inp = `w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`;
  const lbl = `text-xs font-semibold text-gray-400 block mb-1`;

  if (!authed) return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm border border-gray-700 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-red-500"/>
          <h1 className="text-xl font-bold">Admin Belépés</h1>
        </div>
        <p className="text-sm text-gray-400 mb-4">NER Tracker adminisztrációs felület</p>
        <input type="text" placeholder="GitHub token (ghp_...)" value={ghToken}
          onChange={e=>setGhToken(e.target.value)}
          className={inp + ' mb-3'}/>
        <input type="password" placeholder="Admin jelszó..." value={pw}
          onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&checkPw()}
          className={inp + ' mb-4'}/>
        <button onClick={checkPw}
          className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition">
          Belépés
        </button>
        <button onClick={()=>navigate('/')}
          className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4"/> Vissza a dashboardra
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Plus className="w-6 h-6 text-green-500"/>
            <h1 className="text-2xl font-bold">Új Ügy Felvitele</h1>
          </div>
          <button onClick={()=>navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4"/> Dashboard
          </button>
        </div>

        {status === 'ok' && (
          <div className="bg-green-900/40 border border-green-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400"/>
            <div>
              <p className="font-semibold text-green-400">Sikeresen feltöltve!</p>
              <p className="text-sm text-gray-400">Az ügy 30 másodpercen belül megjelenik az oldalon.</p>
            </div>
          </div>
        )}

        {status === 'err' && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400"/>
            <div>
              <p className="font-semibold text-red-400">Hiba történt</p>
              <p className="text-sm text-gray-400">{errMsg}</p>
            </div>
          </div>
        )}

        <ScraperHealth cleanupLog={cleanupLog}/>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-5">
          {/* Cím */}
          <div>
            <label className={lbl}>Cím *</label>
            <input type="text" value={form.title} onChange={e=>set('title',e.target.value)}
              placeholder="Az ügy rövid, informatív neve" className={inp}/>
          </div>

          {/* Leírás */}
          <div>
            <label className={lbl}>Leírás *</label>
            <textarea rows={4} value={form.description} onChange={e=>set('description',e.target.value)}
              placeholder="Az ügy részletes leírása, háttér, érintett összeg, miért közérdekű..."
              className={inp + ' resize-none'}/>
          </div>

          {/* Forrás link */}
          <div>
            <label className={lbl}>Forrás URL</label>
            <input type="url" value={form.link} onChange={e=>set('link',e.target.value)}
              placeholder="https://telex.hu/..." className={inp}/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Dátum */}
            <div>
              <label className={lbl}>Dátum</label>
              <input type="date" value={form.date} onChange={e=>set('date',e.target.value)} className={inp}/>
            </div>

            {/* Forrás */}
            <div>
              <label className={lbl}>Médium</label>
              <select value={form.source} onChange={e=>set('source',e.target.value)} className={inp}>
                {['Telex','HVG','444','Direkt36','Átlátszó','Mérce','Magyar Narancs','Egyéb'].map(s=>
                  <option key={s}>{s}</option>
                )}
              </select>
            </div>

            {/* Kategória */}
            <div>
              <label className={lbl}>Kategória</label>
              <select value={form.category} onChange={e=>set('category',e.target.value)} className={inp}>
                <option value="korrupció">Korrupció</option>
                <option value="pénzügyi">Pénzügyi</option>
                <option value="közbeszerzés">Közbeszerzés</option>
              </select>
            </div>

            {/* Státusz */}
            <div>
              <label className={lbl}>Státusz</label>
              <select value={form.status} onChange={e=>set('status',e.target.value)} className={inp}>
                <option value="active">Aktív</option>
                <option value="investigation">Nyomozás alatt</option>
                <option value="closed">Lezárult</option>
                <option value="appeal">Fellebbezés</option>
              </select>
            </div>

            {/* Régió */}
            <div>
              <label className={lbl}>Régió</label>
              <select value={form.region} onChange={e=>set('region',e.target.value)} className={inp}>
                {REGIONS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Összeg */}
            <div>
              <label className={lbl}>Összeg (HUF) *</label>
              <input type="text" value={form.amount_huf} onChange={e=>set('amount_huf',e.target.value)}
                placeholder="pl. 5000000000" className={inp}/>
            </div>
          </div>

          {/* Tagek */}
          <div>
            <label className={lbl}>Tagek (vesszővel elválasztva)</label>
            <input type="text" value={form.tags} onChange={e=>set('tags',e.target.value)}
              placeholder="korrupció, EU, közbeszerzés" className={inp}/>
          </div>

          {/* Érintett személy */}
          <div className="border border-gray-600 rounded-xl p-4 space-y-3">
            <p className={lbl + ' text-gray-300'}>Érintett személy (opcionális)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Név</label>
                <input type="text" value={form.person_name} onChange={e=>set('person_name',e.target.value)}
                  placeholder="Kovács János" className={inp}/>
              </div>
              <div>
                <label className={lbl}>Beosztás</label>
                <input type="text" value={form.person_position} onChange={e=>set('person_position',e.target.value)}
                  placeholder="miniszterelnök" className={inp}/>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={status==='loading'}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition flex items-center justify-center gap-2">
            {status==='loading'
              ? <><span className="animate-spin">⚙️</span> Feltöltés...</>
              : <><Send className="w-5 h-5"/> Ügy Hozzáadása</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

const REASON_LABELS = {
  exclude_keyword:      'Kizáró kulcsszó találat',
  before_ner_era:       '2010 előtti dátum',
  no_ner_core_match:    'Nincs NER-kulcsszó',
  no_secondary_match:   'Nincs korrupciós indikátor',
};

function ScraperHealth({ cleanupLog }) {
  if (cleanupLog === null) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-6 text-sm text-gray-400">
        Scraper egészség betöltése…
      </div>
    );
  }
  if (cleanupLog.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-6 text-sm text-gray-400 flex items-center gap-2">
        <Activity className="w-4 h-4"/> Még nincs cleanup-log adat — az első automatikus scraper-futás után jelenik meg.
      </div>
    );
  }

  // Utolsó 7 nap futásai
  const weekAgo = Date.now() - 7*24*60*60*1000;
  const recent = cleanupLog.filter(run => new Date(run.run_at).getTime() >= weekAgo);
  const allEntries = recent.flatMap(r => r.entries);
  const removed   = allEntries.filter(e => e.action === 'removed');
  const duplicate = allEntries.filter(e => e.action === 'skipped_duplicate');
  const byReason = {};
  removed.forEach(e => { byReason[e.reason] = (byReason[e.reason]||0) + 1; });
  const lastRun = cleanupLog[cleanupLog.length - 1];

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400"/> Scraper egészség (utolsó 7 nap)</h2>
        <span className="text-xs text-gray-500">Utolsó futás: {new Date(lastRun.run_at).toLocaleString('hu-HU')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-700/60 rounded-lg p-3">
          <p className="text-xs text-gray-400">Eltávolított irreleváns cikk</p>
          <p className="text-xl font-bold">{removed.length}</p>
        </div>
        <div className="bg-gray-700/60 rounded-lg p-3">
          <p className="text-xs text-gray-400">Kihagyott duplikátum</p>
          <p className="text-xl font-bold">{duplicate.length}</p>
        </div>
      </div>
      {Object.keys(byReason).length > 0 && (
        <div className="text-xs text-gray-400 space-y-1">
          {Object.entries(byReason).map(([reason, count]) => (
            <div key={reason} className="flex justify-between">
              <span>{REASON_LABELS[reason] || reason}</span>
              <span className="font-semibold text-gray-300">{count}</span>
            </div>
          ))}
        </div>
      )}
      {(removed.length > 30 || duplicate.length > 30) && (
        <p className="text-xs text-yellow-500 mt-3">
          ⚠️ Magas eltávolítási/duplikátum arány — érdemes átnézni, hogy a szűrő nem túl agresszív-e.
        </p>
      )}
    </div>
  );
}

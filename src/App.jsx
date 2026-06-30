import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LangProvider } from './i18n.jsx';
import Dashboard     from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

// A Dashboard a fő, mindenkit érintő route — eagerly importálva.
// A ritkábban látogatott route-ok (admin, személy profil, embed) lazy-loadolva,
// hogy az első betöltéskor (Dashboard) ne kelljen ezek kódját is letölteni.
const AdminPanel    = lazy(() => import('./components/AdminPanel'));
const PersonProfile = lazy(() => import('./components/PersonProfile'));
const EmbedCard     = lazy(() => import('./components/EmbedCard'));
const Methodology   = lazy(() => import('./components/Methodology'));

const RouteLoading = () => (
  <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111827'}}>
    <div style={{fontSize:32}} className="animate-spin">⚙️</div>
  </div>
);

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const s = localStorage.getItem('darkMode');
      if (s !== null) return JSON.parse(s);
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    try { localStorage.setItem('darkMode', JSON.stringify(darkMode)); } catch {}
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <LangProvider>
      <ErrorBoundary
        label="Alkalmazás"
        fallback={
          <div style={{
            minHeight:'100vh', display:'flex', alignItems:'center',
            justifyContent:'center', flexDirection:'column', gap:16,
            background:'#111827', color:'white', fontFamily:'sans-serif'
          }}>
            <p style={{fontSize:48}}>⚠️</p>
            <p style={{fontSize:20, fontWeight:'bold'}}>Alkalmazás betöltési hiba</p>
            <p style={{fontSize:14, opacity:0.6}}>Kérjük frissítse az oldalt (Ctrl+Shift+R)</p>
            <button onClick={()=>window.location.reload()}
              style={{padding:'8px 24px',background:'#ef4444',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:14}}>
              Újratöltés
            </button>
          </div>
        }>
        <Routes>
          <Route path="/" element={
            <Dashboard darkMode={darkMode} toggleDarkMode={() => setDarkMode(d => !d)} />
          } />
          <Route path="/admin" element={
            <Suspense fallback={<RouteLoading/>}><AdminPanel /></Suspense>
          } />
          <Route path="/szemely/:id" element={
            <ErrorBoundary label="Személy profil">
              <Suspense fallback={<RouteLoading/>}><PersonProfile darkMode={darkMode} /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/embed/:id" element={
            <Suspense fallback={<RouteLoading/>}><EmbedCard /></Suspense>
          } />
          <Route path="/modszertan" element={
            <Suspense fallback={<RouteLoading/>}><Methodology darkMode={darkMode} /></Suspense>
          } />
        </Routes>
      </ErrorBoundary>
    </LangProvider>
  );
}

export default App;

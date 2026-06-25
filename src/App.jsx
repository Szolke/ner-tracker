import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LangProvider } from './i18n.jsx';
import Dashboard    from './components/Dashboard';
import AdminPanel   from './components/AdminPanel';
import PersonProfile from './components/PersonProfile';
import EmbedCard    from './components/EmbedCard';
import ErrorBoundary from './components/ErrorBoundary';

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
      <ErrorBoundary label="Alkalmazás">
        <Routes>
          <Route path="/" element={
            <Dashboard darkMode={darkMode} toggleDarkMode={() => setDarkMode(d => !d)} />
          } />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/szemely/:id" element={
            <ErrorBoundary label="Személy profil">
              <PersonProfile darkMode={darkMode} />
            </ErrorBoundary>
          } />
          <Route path="/embed/:id" element={<EmbedCard />} />
        </Routes>
      </ErrorBoundary>
    </LangProvider>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) return JSON.parse(stored);
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    try { localStorage.setItem('darkMode', JSON.stringify(darkMode)); } catch {}
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <Routes>
      <Route path="/" element={
        <Dashboard darkMode={darkMode} toggleDarkMode={() => setDarkMode(d => !d)} />
      } />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}

export default App;

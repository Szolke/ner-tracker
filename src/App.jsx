import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';

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
    <Dashboard
      darkMode={darkMode}
      toggleDarkMode={() => setDarkMode(d => !d)}
    />
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    // Load from localStorage or default to system preference
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return JSON.parse(stored);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Dashboard 
        darkMode={darkMode} 
        toggleDarkMode={() => setDarkMode(!darkMode)} 
      />
    </div>
  );
}

export default App;

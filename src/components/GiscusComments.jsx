import React from 'react';

// GiscusComments – aktiváláshoz GitHub Discussions szükséges
// Beállítás: https://giscus.app + repo ID megadása
export default function GiscusComments({ caseId, darkMode }) {
  return (
    <div className={`mt-4 p-4 rounded-xl border border-dashed ${darkMode?'border-gray-600 text-gray-500':'border-gray-300 text-gray-400'}`}>
      <p className="text-sm text-center">
        💬 Kommentek – aktiváláshoz GitHub Discussions szükséges
        <a href="https://giscus.app" target="_blank" rel="noopener noreferrer"
          className="ml-2 text-blue-400 hover:underline text-xs">
          Beállítás →
        </a>
      </p>
    </div>
  );
}

import React, { useEffect, useRef } from 'react';

export default function GiscusComments({ caseId, darkMode }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    // Remove previous instance
    ref.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'Szolke/ner-tracker');
    script.setAttribute('data-repo-id', 'R_kgDONer-tracker');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDONer-tracker');
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', caseId);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    script.setAttribute('data-lang', 'hu');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    ref.current.appendChild(script);

    return () => { if (ref.current) ref.current.innerHTML = ''; };
  }, [caseId, darkMode]);

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold opacity-60 mb-3 flex items-center gap-2">
        💬 Megjegyzések & reakciók
        <span className="text-xs font-normal opacity-50">(GitHub bejelentkezés szükséges)</span>
      </p>
      <div ref={ref} />
    </div>
  );
}

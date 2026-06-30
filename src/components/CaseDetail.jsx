import React, { useEffect } from 'react';
import { Star, Share2, ExternalLink } from 'lucide-react';
import { useLang } from '../i18n.jsx';
import { mrd, mrdS, shareCase } from '../utils/format';

const STATUS_COLORS_LOCAL   = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const CATEGORY_COLORS_LOCAL = { 'korrupció':'#ef4444', 'pénzügyi':'#3b82f6', 'közbeszerzés':'#8b5cf6' };

export default function CaseDetail({ c, darkMode, watched, toggleWatch, onClose, data }) {
  const { t: tr } = useLang();
  const STATUS_LABELS_I18N = { active: tr.statusActive, investigation: tr.statusInvestigation, closed: tr.statusClosed, appeal: tr.statusAppeal };

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const relatedCases = data?.cases.filter(other =>
    other.id !== c.id && (
      other.region === c.region ||
      other.involved_persons.some(p => c.involved_persons.some(cp => cp.id === p.id))
    )
  ).slice(0, 3) || [];

  const catColor  = CATEGORY_COLORS_LOCAL[c.category] || '#6b7280';
  const statColor = STATUS_COLORS_LOCAL[c.status] || '#6b7280';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{backdropFilter:'blur(4px)', background:'rgba(0,0,0,0.65)'}}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${darkMode?'bg-gray-900 text-white':'bg-white text-gray-900'}`}>

        {/* Colour bar */}
        <div className="h-1.5 rounded-t-2xl" style={{background:`linear-gradient(90deg,${catColor},${statColor})`}}/>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{background:`${catColor}22`,color:catColor}}>{c.category}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{background:`${statColor}22`,color:statColor}}>{STATUS_LABELS_I18N[c.status]}</span>
              {c.verified === true && <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">✅ {tr.verified}</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={()=>toggleWatch(c.id)} title={watched.has(c.id)?tr.removeCase:tr.followCase} aria-label={watched.has(c.id)?tr.removeCase:tr.followCase}
                className={`p-1.5 rounded-lg transition ${watched.has(c.id)?'bg-yellow-500/20 text-yellow-400':'opacity-40 hover:opacity-80'}`}>
                <Star className="w-4 h-4" fill={watched.has(c.id)?'currentColor':'none'}/>
              </button>
              <button onClick={()=>shareCase(c)} title={tr.share} aria-label={tr.share}
                className="p-1.5 rounded-lg opacity-40 hover:opacity-80 transition">
                <Share2 className="w-4 h-4"/>
              </button>
              <button onClick={onClose} aria-label={tr.close || 'Bezárás'}
                className={`p-1.5 rounded-lg transition opacity-40 hover:opacity-100 ${darkMode?'hover:bg-gray-700':'hover:bg-gray-100'}`}>
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
          </div>
          <h2 className="text-xl font-bold leading-snug mb-2">{c.title}</h2>
          <p className={`text-sm ${darkMode?'text-gray-400':'text-gray-500'}`}>
            {c.source} · {c.region} · {c.date}
            {c.media_count > 0 && <span className="ml-2 opacity-70">· {c.media_count} {tr.articleCount}</span>}
          </p>
        </div>

        <div className={`mx-6 border-t ${darkMode?'border-gray-700':'border-gray-200'}`}/>

        <div className="p-6 space-y-5">
          <p className={`text-sm leading-relaxed ${darkMode?'text-gray-300':'text-gray-700'}`}>{c.description}</p>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {[[tr.amountLabel, mrd(c.amount_huf)],[tr.regionLabel, c.region],[tr.dateLabel, c.date]].map(([label,value])=>(
              <div key={label} className={`p-3 rounded-xl ${darkMode?'bg-gray-800':'bg-gray-50'}`}>
                <p className="text-xs opacity-40 mb-0.5">{label}</p>
                <p className="font-semibold text-sm">{value}</p>
              </div>
            ))}
          </div>

          {/* Tags */}
          {c.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {c.tags.map(tag=><span key={tag} className="px-2.5 py-0.5 text-xs rounded-full bg-blue-500/15 text-blue-400">{tag}</span>)}
            </div>
          )}

          {/* Persons */}
          {c.involved_persons?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-40 mb-2">{tr.involvedPersons}</p>
              <div className="flex flex-wrap gap-2">
                {c.involved_persons.map(p=>(
                  <div key={p.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${darkMode?'bg-gray-800':'bg-gray-50'}`}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{p.name}</p>
                      {p.position && p.position !== 'ismeretlen' && <p className="text-xs opacity-50">{p.position}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related */}
          {relatedCases.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-40 mb-2">{tr.relatedCases}</p>
              <div className="space-y-2">
                {relatedCases.map(rc=>(
                  <div key={rc.id} className={`p-3 rounded-xl flex items-center justify-between gap-3 ${darkMode?'bg-gray-800':'bg-gray-50'}`}>
                    <p className="text-xs font-semibold leading-snug">{rc.title}</p>
                    <span className="text-xs opacity-40 flex-shrink-0">{mrdS(rc.amount_huf)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {c.document_links?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-40 mb-2">{tr.documents}</p>
              {c.document_links.map((doc,i)=>(
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-purple-400 hover:underline">📎 {doc.title}</a>
              ))}
            </div>
          )}

          {/* CTA */}
          {c.link && (
            <a href={c.link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition">
              <ExternalLink className="w-4 h-4"/>
              {tr.viewSource} — {c.source}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

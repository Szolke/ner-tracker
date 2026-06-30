// ── Magyar számformázó ───────────────────────────────────────────────
// MINDIG "X,X Mrd HUF" formátum. amount_huf === null → "Összeg ismeretlen" / "—".
export const mrd  = huf => huf != null
  ? (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF'
  : 'Összeg ismeretlen';

export const mrdS = huf => huf != null
  ? (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF'
  : '—';

// ── Share helper ──────────────────────────────────────────────────────
export function shareCase(c) {
  const url = `${window.location.origin}/?case=${c.id}`;
  const text = `${c.title} – ${mrd(c.amount_huf)} | NER Tracker`;
  if (navigator.share) {
    navigator.share({ title: 'NER Tracker', text, url }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(url).then(() => alert('Link másolva: ' + url));
  }
}

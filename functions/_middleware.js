// Cloudflare Pages Function — dinamikus Open Graph metaadatok közösségimédia-crawlerek számára.
//
// A NER Tracker egy kliensoldali SPA (nincs SSR), ezért alapból minden megosztott link
// (pl. /szemely/p_abc123 vagy /?case=sc_xyz) ugyanazt az általános og-image.svg-t és
// statikus címet mutatja Facebookon/Twitteren/Slacken. Ez a middleware felismeri a
// közismert social-crawler User-Agenteket, és nekik egy könnyű, előre kitöltött HTML
// választ ad a konkrét ügy/személy címével és leírásával — minden más kérést
// (valódi böngészők) változtatás nélkül továbbenged a statikus oldal felé.
//
// Megjegyzés: ez SZÁNDÉKOSAN csak a crawlerek számára aktív. Emberi látogatóknál
// a normál SPA töltődik be, a kliensoldali useEffect(fetch news.json) logikával.

const BOT_UA_PATTERNS = [
  'facebookexternalhit', 'twitterbot', 'slackbot', 'linkedinbot',
  'discordbot', 'whatsapp', 'telegrambot', 'pinterest', 'redditbot',
  'skypeuripreview', 'vkshare', 'embedly', 'quora link preview',
  'w3c_validator', 'baiduspider', 'yandex', 'googlebot',
];

function isCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some(p => ua.includes(p));
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function mrd(huf) {
  if (huf == null) return 'Összeg ismeretlen';
  return (huf / 1e9).toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Mrd HUF';
}

function renderMetaPage({ title, description, url, image }) {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<title>${escapeHtml(title)}</title>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
<a href="${escapeHtml(url)}">Megnyitás a NER Trackeren</a>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const ua = request.headers.get('User-Agent') || '';

  if (!isCrawler(ua)) {
    return next();
  }

  // Melyik tartalomra van szükség?
  let kind = null, id = null;
  const personMatch = url.pathname.match(/^\/szemely\/([^/]+)\/?$/);
  const embedMatch   = url.pathname.match(/^\/embed\/([^/]+)\/?$/);
  const caseParam    = url.searchParams.get('case');

  if (personMatch)      { kind = 'person'; id = decodeURIComponent(personMatch[1]); }
  else if (embedMatch)  { kind = 'case';   id = decodeURIComponent(embedMatch[1]); }
  else if (caseParam)   { kind = 'case';   id = caseParam; }
  else                  { return next(); }

  try {
    const dataRes = await env.ASSETS.fetch(new URL('/data/news.json', url.origin));
    if (!dataRes.ok) return next();
    const data = await dataRes.json();

    if (kind === 'case') {
      const c = data.cases.find(x => x.id === id);
      if (!c) return next();
      const title = `${c.title} | NER Tracker`;
      const description = `${c.region} · ${c.date} · ${mrd(c.amount_huf)} — ${(c.description || '').slice(0, 180)}`;
      return new Response(renderMetaPage({
        title, description, url: url.toString(), image: `${url.origin}/og-image.svg`,
      }), { headers: { 'content-type': 'text/html; charset=UTF-8' } });
    }

    if (kind === 'person') {
      const person = data.cases.flatMap(c => c.involved_persons).find(p => p.id === id);
      if (!person) return next();
      const relCases = data.cases.filter(c => c.involved_persons.some(p => p.id === id));
      const totalAmt = relCases.reduce((s, c) => s + (c.amount_huf || 0), 0);
      const title = `${person.name} | NER Tracker`;
      const description = `${person.position || ''} — ${relCases.length} érintett ügy, összesen ${mrd(totalAmt)}.`;
      return new Response(renderMetaPage({
        title, description, url: url.toString(), image: `${url.origin}/og-image.svg`,
      }), { headers: { 'content-type': 'text/html; charset=UTF-8' } });
    }
  } catch (e) {
    // Ha bármi hiba történik (pl. parse error), essünk vissza a normál SPA-ra.
    return next();
  }

  return next();
}

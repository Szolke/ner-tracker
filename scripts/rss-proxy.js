// NER Tracker RSS Proxy Worker
// Deploy: wrangler deploy scripts/rss-proxy.js
// Ez a worker Cloudflare IP-jéről kéri le az RSS feedeket,
// amelyek az Azure/GitHub Actions IP-ről blokkolva vannak.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const feedUrl = url.searchParams.get('url');

    if (!feedUrl) {
      return new Response('Hiányzó ?url= paraméter', { status: 400 });
    }

    // Csak engedélyezett domain-ek
    const allowed = [
      'telex.hu', 'hvg.hu', '444.hu', 'direkt36.hu',
      'atlatszo.hu', 'merce.hu', 'magyarnarancs.hu',
      'szabad-europa.hu', 'partizan.online', 'g7.hu',
      'euractiv.hu', 'k-monitor.hu'
    ];

    const feedDomain = new URL(feedUrl).hostname.replace('www.', '');
    if (!allowed.some(d => feedDomain.includes(d))) {
      return new Response('Domain nem engedélyezett', { status: 403 });
    }

    try {
      const resp = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NERTracker/2.0; +https://ner-tracker.pages.dev)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'hu-HU,hu;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        }
      });

      const body = await resp.text();

      return new Response(body, {
        status: resp.status,
        headers: {
          'Content-Type': resp.headers.get('Content-Type') || 'application/xml',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=1800', // 30 perces cache
        }
      });
    } catch (err) {
      return new Response(`Hiba: ${err.message}`, { status: 500 });
    }
  }
};

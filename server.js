const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Allow simple CORS for local dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Basic health
app.get('/', (req, res) => res.send('Local image proxy is running'));

// /img?url=<encoded_url>
app.get('/img', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('url query parameter is required');

  let parsed;
  try { parsed = new URL(url); } catch (e) { return res.status(400).send('Invalid URL'); }

  // Allowlist hosts to avoid becoming an open proxy
  const allowedHosts = ['imgur.com', 'i.imgur.com', 'placehold.co', 'placeimg.com', 'placehold.it'];
  if (!allowedHosts.some(h => parsed.hostname.includes(h))) {
    return res.status(403).send('Host not allowed');
  }

  // Require Node 18+ for global fetch
  if (typeof fetch !== 'function') {
    return res.status(500).send('Server requires Node 18+ (global fetch)');
  }

  try {
    const upstream = await fetch(url, { headers: { 'User-Agent': 'local-img-proxy' } });
    if (!upstream.ok) return res.status(upstream.status).send('Upstream fetch failed');

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Proxy fetch error:', err);
    res.status(500).send('Proxy fetch error');
  }
});

app.listen(PORT, () => console.log(`Image proxy listening on http://localhost:${PORT}`));

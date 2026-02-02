Local Image Proxy

This project includes a small Node/Express proxy to fetch images from Imgur (and a few allowed hosts) to avoid hotlink 403 errors during development.

Requirements
- Node.js 18+

Run
1. In the project root run:
   npm start
   or
   node server.js
2. Keep the proxy running. The front-end will call `/img?url=ENCODED_URL` automatically for Imgur images.

Security
- The proxy restricts hosts to a small allowlist to avoid becoming an open proxy. Do not expose this proxy publicly without additional security (authentication, rate-limiting, caching).
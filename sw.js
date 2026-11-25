/* Pixel Pigskin service worker.
   BUMP CACHE_VERSION whenever you change sw.js, the manifest, an icon or the font (anything in PRECACHE other than index.html).
   index.html itself is fetched network-first, so a new index.html reaches players on their next online visit even without a bump;
   bumping on every release is still harmless and keeps the cache tidy. */
const CACHE_VERSION = 'pp-v20';   /* v2.51: bumped for the new index.html; v2.50 was pp-v19: bumped for the new index.html; v2.49 was pp-v18: bumped for the new index.html; v2.48 was pp-v17: v2.48: bumped for the new index.html; v2.47 was pp-v16: v2.47: bumped for the new index.html; v2.46 was pp-v15: v2.46: bumped for the new index.html; v2.45: bumped for the new index.html; v2.44: bumped for the new index.html; v2.43: bumped for the new index.html; v2.40: bumped for the new index.html; v2.39 was pp-v8: v2.39: bumped for the new index.html; v2.38 was pp-v7: bumped for the new index.html; v2.37 was pp-v6: bumped for the new index.html (the game page is part of PRECACHE); v2.36 was pp-v5; v2.35 was pp-v4; v2.34 was pp-v3: the manifest changed (fullscreen display_override) */
const CACHE = 'pixel-pigskin-' + CACHE_VERSION;
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './fonts/press-start-2p-latin-400-normal.woff2'
];

const BASE = new URL('./', location).pathname;
const OWN = new Set(PRECACHE.map(u => new URL(u, location).pathname));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u =>
    fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return c.put(u, r) })
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('pixel-pigskin-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;               /* never touch other origins */
  /* Only THE GAME's own files are handled here (the PRECACHE list). Anything else on this site, such as hq.html, pc.html, a pc/ folder,
     their scripts or a test page, is a different app: leave it completely alone (never cached, never answered, never saved over the game page). */
  if (!OWN.has(url.pathname)) return;
  const isPage = url.pathname === BASE || url.pathname === BASE + 'index.html';
  if (isPage) {
    /* network first so updates arrive, cache fallback so it works offline */
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)) }
      return r;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  /* everything else (icons, font, manifest): cache first, then network, and remember what the network gave */
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
    return r;
  })));
});

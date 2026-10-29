/**
 * The deep-DOM fixtures: a tiny static site whose pages are right or wrong in the one way a browser suite has to catch,
 * with the defect inside an open shadow root. See README.md for the pages and the manifest (expected.json).
 *
 *   node scripts/fixtures/deep/server.ts [--port <n>]
 *
 * It prints `listening on <url>` once it answers, on a free port unless --port names one. Every route that is not a
 * fixture page answers a clean page (no shadow root, no control), which is what the audit's embed pass reaches: it passes
 * every suite, except a path under /gone/, which answers 404. Kept outside node_modules: Node does not strip types there.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { CLEAN, NAV_PAGES, PAGES } from './pages.ts';

const ALL: Record<string, string> = { ...PAGES, ...NAV_PAGES };

const i = process.argv.indexOf('--port');
const server = http.createServer((req, res) => {
  const [pathname, search] = (req.url ?? '/').split('?');
  // The image /slow-load waits for: answered after 6 s, past the 4 s open() gives fonts, so the page's load event comes well after its HTML.
  if (req.url === '/slow-asset') { setTimeout(() => res.writeHead(200, { 'content-type': 'image/gif' }).end(Buffer.from('R0lGODlhAQABAAAAACw=', 'base64')), 6000); return; }
  // The live pages' resync action: the answer the provider's refreshCollections gives.
  if (pathname === '/live-act' && req.method === 'POST') { res.writeHead(200, { 'content-type': 'text/x-component' }).end('0:{"ok":true}\n'); return; }
  // A rail route that redirects to a page under it, for navigate's journey (#97).
  if (pathname === '/nav-redirect') { res.writeHead(302, { location: '/nav-redirect/thing-a' }).end(); return; }
  // Two redirects, for the audit's address rules: one page that answers at another address, and one that keeps its
  // address and loses the view it was asked for. Both are answered before the page is, so the browser is on the second
  // address by the time anything is measured — the state the rules are about, and not one a page can arrange itself.
  if (pathname === '/moved-page') { res.writeHead(302, { location: '/moved-page-now' }).end(); return; }
  if (pathname === '/drops-query' && search) { res.writeHead(302, { location: pathname }).end(); return; }
  // A link that leads nowhere, for the presses' relative-link case.
  if (pathname.startsWith('/gone/')) { res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(CLEAN); return; }
  const html = ALL[pathname] ?? CLEAN;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
});
server.listen(i >= 0 ? Number(process.argv[i + 1]) : 0, '127.0.0.1', () => {
  console.log(`listening on http://127.0.0.1:${(server.address() as AddressInfo).port}`);
});

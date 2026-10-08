/**
 * The deep-DOM fixtures: a tiny static site whose pages are right or wrong in the one way a browser suite has to catch,
 * with the defect inside an open shadow root. See README.md for the pages and the manifest (expected.json).
 *
 *   node scripts/fixtures/deep/server.ts [--port <n>]
 *
 * It prints `listening on <url>` once it answers, on a free port unless --port names one. Every route that is not a
 * fixture page answers a clean page (no shadow root, no control), which is what the audit's embed pass reaches: it passes
 * every suite. Kept outside node_modules: Node does not strip types there.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { CLEAN, NAV_PAGES, PAGES } from './pages.ts';

const ALL: Record<string, string> = { ...PAGES, ...NAV_PAGES };

const i = process.argv.indexOf('--port');
const server = http.createServer((req, res) => {
  const html = ALL[(req.url ?? '/').split('?')[0]] ?? CLEAN;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
});
server.listen(i >= 0 ? Number(process.argv[i + 1]) : 0, '127.0.0.1', () => {
  console.log(`listening on http://127.0.0.1:${(server.address() as AddressInfo).port}`);
});

/**
 * The readiness fixtures: a tiny static site whose pages are right or wrong in the one way navigate.ts has to catch.
 *
 *   node scripts/fixtures/readiness/server.ts [--port <n>]
 *
 * It prints `listening on <url>` once it answers. Measure it with
 *
 *   node scripts/navigate.ts --base <url> --config scripts/fixtures/readiness/config.ts --rail /,/slow-data,/dead-control --routes /,/slow-data,/dead-control
 *
 * `/` is right. `/slow-data` has its heading and a working control at once and its table only after three seconds, so its
 * shell and interaction pass and its data does not. `/dead-control` has everything at once and a visible button that does
 * nothing, so its shell and data pass and its interaction does not. Kept outside node_modules: Node does not strip types there.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const NAV = [['/', 'Home'], ['/slow-data', 'Slow data'], ['/dead-control', 'Dead control']];
const links = NAV.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('');
const TABLE = '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Rows</td></tr></tbody></table>';

/** A rail from 1024 px up and a drawer under it, the way the template does it. */
const page = (title: string, main: string, script = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  body { margin: 0; font: 16px system-ui; display: flex; min-height: 100vh; }
  aside { width: 240px; padding: 16px; border-right: 1px solid #888; }
  main { flex: 1; padding: 16px; }
  [role="dialog"] { position: fixed; inset: 0 auto 0 0; width: 240px; padding: 16px; background: #fff; }
  [role="dialog"][hidden] { display: none; }
  button { min-height: 36px; }
  @media (max-width: 1023px) { aside { display: none; } }
  @media (min-width: 1024px) { #open { display: none; } }
</style></head>
<body>
<aside aria-label="Primary"><nav aria-label="Main"><ul>${links}</ul></nav></aside>
<div role="dialog" aria-label="Navigation" hidden><nav aria-label="Main"><ul>${links}</ul></nav></div>
<main>
  <button id="open" aria-label="Open navigation">Menu</button>
  <h1>${title}</h1>
  ${main}
</main>
<script>
  document.getElementById('open').addEventListener('click', () => { document.querySelector('[role="dialog"]').hidden = false; });
  ${script}
</script>
</body></html>`;

const TOGGLE = '<button id="toggle" aria-pressed="false">Toggle</button>';
const WIRE = `document.getElementById('toggle').addEventListener('click', (e) => e.currentTarget.setAttribute('aria-pressed', String(e.currentTarget.getAttribute('aria-pressed') !== 'true')));`;

const PAGES: Record<string, string> = {
  '/': page('Home', `${TOGGLE}${TABLE}`, WIRE),
  '/slow-data': page('Slow data', `${TOGGLE}<div id="body"></div>`, `${WIRE} setTimeout(() => { document.getElementById('body').innerHTML = ${JSON.stringify(TABLE)}; }, 3000);`),
  '/dead-control': page('Dead control', `<button id="sort">Sort</button>${TABLE}`),
};

const i = process.argv.indexOf('--port');
const server = http.createServer((req, res) => {
  const html = PAGES[(req.url ?? '/').split('?')[0]];
  if (!html) return void res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
});
server.listen(i >= 0 ? Number(process.argv[i + 1]) : 0, '127.0.0.1', () => {
  console.log(`listening on http://127.0.0.1:${(server.address() as AddressInfo).port}`);
});

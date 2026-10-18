// @vitest-environment node
// Named deep-* so the payload leaves it out: it drives headless Chrome.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { launch, type Page } from '../scripts/lib/chrome.ts';

/**
 * A check presses every control, and an Export button is a real download (`downloadFile()` in src/lib/csv.ts, a Blob
 * and an `<a download>` click). With no download directory, Chrome saved each file in the person's own Downloads folder,
 * outside the temporary profile the run removes, so every `pnpm verify --full` left Home's, Revenue's and Usage's CSVs
 * there. A download belongs inside the profile, and goes with it.
 */
const name = `meridian-download-probe-${randomBytes(6).toString('hex')}.csv`;
const PAGE = `<!doctype html><html lang="en"><body><main><h1>Export</h1><button id="export">Export</button></main><script>
document.getElementById('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob(['a,b\\n1,2\\n'], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: ${JSON.stringify(name)} });
  document.body.append(a); a.click(); a.remove();
});
</script></body></html>`;

let server: http.Server;
let page: Page;
let base = '';

beforeAll(async () => {
  server = http.createServer((_, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(PAGE));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  page = await launch();
}, 60_000);

afterAll(() => { page?.close(); server?.close(); });

/** The profiles of every browser `launch()` has open on this machine whose downloads hold the file. */
const holding = () => fs.readdirSync(os.tmpdir())
  .filter((d) => d.startsWith('meridian-chrome-'))
  .filter((d) => { try { return fs.readdirSync(path.join(os.tmpdir(), d), { recursive: true }).some((f) => path.basename(String(f)) === name); } catch { return false; } });

it("saves a pressed control's download inside the browser's own profile", async () => {
  await page.open(`${base}/`, { width: 1000, wait: 200 });
  await page.eval(`document.getElementById('export').click()`);
  let found: string[] = [];
  for (let i = 0; i < 50 && !found.length; i++) {
    await new Promise((r) => setTimeout(r, 100));
    found = holding();
  }
  expect(found, `${name} was not saved under any meridian-chrome-* profile`).toHaveLength(1);
}, 30_000);

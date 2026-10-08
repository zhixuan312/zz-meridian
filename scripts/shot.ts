/**
 * Screenshot routes of the running app at exact widths, in either theme.
 *
 *   node scripts/shot.ts <path ...> [--width 1440,390] [--theme light,dark] [--full] [--base http://localhost:3100] [--out out/shots]
 *                                   [--press "<name>" ...]
 *
 * Motion is reduced, so every page shows its final state. Files land in out/shots/<route>-<width>-<theme>.png.
 *
 * `--press` opens what only a press shows (a dialog, a sheet, a menu, a popover) before the shot: the control whose
 * accessible name or text is `<name>` is pressed with the mouse, as a person presses it, and repeated `--press` flags
 * press in order (a row's menu, then an item in it). The file name ends with the last name pressed. A name that matches
 * nothing fails, so a shot never shows the closed page under the open state's name.
 */
import path from 'node:path';
import { launch, type Page } from './lib/chrome.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const flag = (k: string) => { const i = args.indexOf(k); return i >= 0 ? (args.splice(i, 1), true) : false; };
const presses: string[] = [];
for (let i = args.indexOf('--press'); i >= 0; i = args.indexOf('--press')) presses.push(args.splice(i, 2)[1]);
const base = opt('--base', process.env.BASE ?? 'http://localhost:3100');
const widths = opt('--width', '1440').split(',').map(Number);
const themes = opt('--theme', 'light').split(',') as ('light' | 'dark')[];
const out = opt('--out', 'out/shots');
const full = flag('--full');
const routes = args.length ? args : ['/'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Press the visible control named `name` with the mouse, once it has stopped moving; false when nothing matches. */
async function press(page: Page, name: string): Promise<boolean> {
  const where = `(() => {
    const want = ${JSON.stringify(name)};
    const named = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ');
    const all = [...document.querySelectorAll('button, a, [role="button"], [role="menuitem"], [role="tab"], [role="combobox"], summary')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const el = all.find((x) => named(x) === want) ?? all.find((x) => named(x).startsWith(want));
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`;
  let at = await page.eval<{ x: number; y: number } | null>(where);
  for (let i = 0; i < 20 && at; i++) {
    await sleep(100);
    const next = await page.eval<{ x: number; y: number } | null>(where);
    if (next && next.x === at.x && next.y === at.y) break;
    at = next;
  }
  if (!at) return false;
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'] as const) await page.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
  await sleep(500);
  return true;
}

const page = await launch();
let failed = false;
for (const r of routes) {
  for (const w of widths) {
    for (const t of themes) {
      await page.open(base + r, { width: w, height: w < 600 ? 844 : 900, theme: t });
      const missing = [];
      for (const p of presses) if (!(await press(page, p))) { missing.push(p); break; }
      if (missing.length) { console.log(`FAIL ${r} at ${w}px ${t}: nothing to press named "${missing[0]}"`); failed = true; continue; }
      const name = (r.replace(/^\//, '').replace(/[/?=&#]+/g, '-') || 'overview') + (presses.length ? `-${slug(presses.at(-1)!)}` : '') + `-${w}-${t}.png`;
      const h = await page.shot(path.join(out, name), { full });
      console.log(`${path.join(out, name)} ${w}x${h}`);
    }
  }
}
page.close();
process.exitCode = failed ? 1 : 0;

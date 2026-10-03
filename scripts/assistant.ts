/**
 * Walk through the assistant against a running build.
 *
 *   node scripts/assistant.ts --base <url> --expect off
 *   node scripts/assistant.ts --base <url> --expect on --llm <fake llm url>
 *
 * off: no panel and no launcher on / and /settings, and POST /api/assistant answers 404.
 * on:  the launcher opens the panel, a question gets the streamed reply, and the model was told which page it was on.
 */
import { launch } from './lib/chrome.ts';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const base = (opt('--base') ?? '').replace(/\/$/, '');
const expect = opt('--expect');
const llm = opt('--llm')?.replace(/\/$/, '');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

if (!base || (expect !== 'off' && expect !== 'on') || (expect === 'on' && !llm)) {
  console.error('usage: node scripts/assistant.ts --base <url> --expect off | --expect on --llm <url>');
  process.exit(1);
}

const ok = (what: string) => console.log(`ok   assistant ${expect}: ${what}`);
const fail = (why: string): never => { throw new Error(why); };
const until = async <T>(what: string, read: () => Promise<T>, done: (v: T) => boolean, ms = 15000) => {
  let v = await read();
  for (const end = Date.now() + ms; !done(v) && Date.now() < end; ) { await sleep(200); v = await read(); }
  return done(v) ? v : fail(`timed out waiting for ${what} (last: ${JSON.stringify(v)})`);
};

const page = await launch();
try {
  if (expect === 'off') {
    for (const route of ['/', '/settings']) {
      await page.open(`${base}${route}`, { width: 1440 });
      const found = await page.eval<number>(`document.querySelectorAll('[data-assistant], button[aria-label="Assistant"]').length`);
      if (found) fail(`${route} has ${found} assistant element(s)`);
    }
    ok('/ and /settings have no panel and no launcher');
    const status = (await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"messages":[]}' })).status;
    if (status !== 404) fail(`POST /api/assistant answered ${status}, expected 404`);
    ok('POST /api/assistant answers 404');
  } else {
    await page.open(`${base}/`, { width: 1440 });
    const LAUNCHER = 'button[aria-label="Assistant"]';
    if (!(await page.eval<boolean>(`!!document.querySelector('${LAUNCHER}')`))) fail('no launcher on /');
    ok('the launcher is on /');

    await page.eval(`document.querySelector('${LAUNCHER}').click()`);
    await until('the panel to open', () => page.eval<boolean>(`!!document.querySelector('aside[data-assistant]')`), Boolean);
    ok('pressing the launcher opens the panel');

    await page.eval(`document.querySelector('aside[data-assistant] textarea[aria-label="Message"]').focus()`);
    await page.send('Input.insertText', { text: 'What is this page?' });
    await until('Send to enable', () => page.eval<boolean>(`!document.querySelector('aside[data-assistant] button[aria-label="Send"]').disabled`), Boolean);
    await page.eval(`document.querySelector('aside[data-assistant] button[aria-label="Send"]').click()`);
    const reply = await until('the reply', () => page.eval<string>(`[...document.querySelectorAll('aside[data-assistant] [data-role=assistant] p')].map((e) => e.textContent.trim()).join('|')`), (t) => t === 'This is the Overview page.');
    ok(`the streamed reply reads "${reply}"`);

    const requests = (await (await fetch(`${llm}/requests`)).json()) as unknown[];
    if (!JSON.stringify(requests).includes('Page: Overview (/)')) fail('no request to the model carried "Page: Overview (/)"');
    ok('the model request carried "Page: Overview (/)"');
  }
} catch (e) {
  console.log(`FAIL assistant ${expect}: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  page.close();
}

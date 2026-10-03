/**
 * Walk through the assistant against a running build.
 *
 *   node scripts/assistant.ts --base <url> --expect off
 *   node scripts/assistant.ts --base <url> --expect on --llm <fake llm url>
 *
 * off: no panel and no launcher on / and /settings, and POST /api/assistant answers 404.
 * on:  the launcher opens the panel, a question gets the streamed reply, and the model was told which page it was on;
 *      then on /members: a query lists two members with no Proposal, an approved change shows in the table without a
 *      reload, a dismissed removal leaves the member, and a member suspended from the row menu is found by the next query.
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
const MESSAGE = 'aside[data-assistant] textarea[aria-label="Message"]';
const SEND = 'aside[data-assistant] button[aria-label="Send"]';
const PROPOSALS = 'aside[data-assistant] article[aria-label^="Proposal from Assistant"]';

/** Type `text` into the panel and press Send. */
async function ask(text: string) {
  await page.eval(`document.querySelector('${MESSAGE}').focus()`);
  await page.send('Input.insertText', { text });
  await until('Send to enable', () => page.eval<boolean>(`!document.querySelector('${SEND}').disabled`), Boolean);
  await page.eval(`document.querySelector('${SEND}').click()`);
}
/** What the assistant's latest text says (a Proposal card's own text is not the assistant speaking). */
const said = () => page.eval<string>(`[...document.querySelectorAll('aside[data-assistant] [data-role=assistant] > p')].at(-1)?.textContent.trim() ?? ''`);
/** The titles of the Proposal cards in the panel. */
const proposals = () => page.eval<string[]>(`[...document.querySelectorAll('${PROPOSALS}')].map((a) => a.getAttribute('aria-label'))`);
/** A table row's text: the member's name, role, team, status and activity. */
const row = (name: string) => page.eval<string | null>(`[...document.querySelectorAll('tbody tr')].find((r) => r.textContent.includes(${JSON.stringify(name)}))?.textContent ?? null`);
/** Press with the mouse, as a person does: menus open on the pointer, not on a synthetic click. */
async function press(find: string) {
  const where = `(() => { const el = ${find}; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })()`;
  // A menu animates open: wait for the target to exist and stop moving.
  let at = await page.eval<{ x: number; y: number } | null>(where);
  for (let i = 0; i < 50; i++) {
    await sleep(150);
    const next = await page.eval<{ x: number; y: number } | null>(where);
    if (next && at && next.x === at.x && next.y === at.y) break;
    at = next;
  }
  if (!at) return fail(`nothing to press: ${find}`);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'] as const) await page.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
}
/** Press the button named `label` in the open Proposal card. */
const decide = (label: string) => press(`[...document.querySelectorAll('${PROPOSALS} button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`);
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

    // The collections: ask, approve, dismiss, and a change made on the page.
    await page.open(`${base}/members`, { width: 1440 });
    await page.eval(`window.__walk = true`);
    await page.eval(`document.querySelector('${LAUNCHER}').click()`);
    await until('the panel to open', () => page.eval<boolean>(`!!document.querySelector('aside[data-assistant]')`), Boolean);

    // The table is newest-joined first at 20 a page, so the long-tenured members are on page 2: show 50 to read them all.
    await press(`[...document.querySelectorAll('nav[aria-label="Pagination"] button')].find((b) => b.textContent.includes('per page'))`);
    await press(`[...document.querySelectorAll('[role="menuitem"]')].find((i) => i.textContent.includes('50 per page'))`);
    await until('every member to show', () => row('Alice Moreno'), Boolean);

    await ask('Which Support viewers have been inactive for more than 60 days?');
    const listed = await until('the query result', said, (t) => t.includes('Alice Moreno') && t.includes('Ravi Patel'));
    if ((await proposals()).length) fail(`the query raised a Proposal: ${JSON.stringify(await proposals())}`);
    if (/Amara|Noah|Grace/.test(listed)) fail(`the query listed more than two members: "${listed}"`);
    ok(`the query listed Alice Moreno and Ravi Patel with no Proposal ("${listed}")`);

    await ask('Suspend them');
    await until('a Proposal to change two members', proposals, (t) => t.some((l) => l?.startsWith('Proposal from Assistant: Change 2 members')));
    await decide('Approve');
    const suspended = await until('both rows to read Suspended', async () => [await row('Alice Moreno'), await row('Ravi Patel')], (r) => r.every((t) => t?.includes('Suspended')));
    if (!(await page.eval<boolean>(`window.__walk === true`))) fail('the page reloaded instead of refreshing');
    ok(`the approved suspension shows Alice Moreno and Ravi Patel as Suspended without a reload (${suspended.length} rows)`);
    await until('the assistant to say Done.', said, (t) => t === 'Done.');

    await ask('Remove Alice Moreno');
    await until('a removal Proposal', proposals, (t) => t.some((l) => l?.startsWith('Proposal from Assistant: Remove')));
    await decide('Dismiss');
    await until('the assistant to say Nothing changed.', said, (t) => t === 'Nothing changed.');
    const kept = await row('Alice Moreno');
    if (!kept) fail('the dismissed removal took Alice Moreno out of the table');
    ok('the dismissed removal left Alice Moreno in the table');

    await press(`document.querySelector('button[aria-label="Actions for Amara Okafor"]')`);
    await until('the row menu', () => page.eval<boolean>(`!!document.querySelector('[role="menu"]')`), Boolean);
    await press(`[...document.querySelectorAll('[role="menuitem"]')].find((i) => i.textContent.trim() === 'Suspend')`);
    await until('Amara Okafor to read Suspended', () => row('Amara Okafor'), (t) => !!t?.includes('Suspended'));
    await ask('Who is suspended?');
    const found = await until('the answer to name Amara Okafor', said, (t) => t.includes('Amara Okafor'));
    ok(`a member suspended from the row menu is found by the assistant's next query ("${found}")`);
  }
} catch (e) {
  console.log(`FAIL assistant ${expect}: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  page.close();
}

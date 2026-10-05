/**
 * Walk through the assistant against a running build.
 *
 *   node scripts/assistant.ts --base <url> --expect off
 *   node scripts/assistant.ts --base <url> --expect on --llm <fake llm url> --key <the app's ASSISTANT_API_KEY>
 *
 * off: no panel and no launcher on / and /settings, and POST /api/assistant answers 404.
 * on:  the launcher opens the panel, a question gets the streamed reply, and the model was told which page it was on;
 *      then on /members: a query lists two members with no Proposal, an approved change shows in the table without a
 *      reload, a dismissed removal leaves the member, and a member suspended from the row menu is found by the next query;
 *      then the whole panel: the page the model was given, the thread across navigation, reload, moving on and Clear,
 *      the Settings switch, the layout at 1440px and 390px, a provider that refuses the key, and the key itself never
 *      reaching the browser.
 */
import { slug } from '../src/app.config.ts';
import { launch } from './lib/chrome.ts';
import { discover } from './lib/routes.ts';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const base = (opt('--base') ?? '').replace(/\/$/, '');
const expect = opt('--expect');
const llm = opt('--llm')?.replace(/\/$/, '');
const key = opt('--key');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

if (!base || (expect !== 'off' && expect !== 'on') || (expect === 'on' && (!llm || !key))) {
  console.error('usage: node scripts/assistant.ts --base <url> --expect off | --expect on --llm <url> --key <key>');
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
/** What the assistant's latest text says (a Proposal card's own text is not the assistant speaking).
 *  `data-assistant-text` is the reply block's own handle: a reply is markdown, so its text may be in a paragraph, a
 *  list item or a table cell, and a selector that assumed a paragraph would break the day a model answers with a list. */
const said = () => page.eval<string>(`[...document.querySelectorAll('aside[data-assistant] [data-assistant-text]')].at(-1)?.textContent.trim() ?? ''`);
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

    // The panel is a SEPARATE CHUNK, and this is what says so. The page is measured with the panel closed, then again
    // with it open: the scripts that appear in between are the panel's. If the launcher's own chunk carried the panel
    // — which it did until issue #7 — opening it fetches nothing new, because every page already had all of it.
    const loadedScripts = () => page.eval<string[]>(`performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js')).map((e) => e.name)`);
    const beforeOpen = await loadedScripts();

    await page.eval(`document.querySelector('${LAUNCHER}').click()`);
    await until('the panel to open', () => page.eval<boolean>(`!!document.querySelector('aside[data-assistant]')`), Boolean);
    const panelChunks = (await loadedScripts()).filter((u) => !beforeOpen.includes(u));
    if (!panelChunks.length) fail('opening the panel downloaded no script a page with it closed had not already fetched, so the panel is in every page\'s first load');
    ok(`the panel is its own chunk: opening it fetched ${panelChunks.length} script(s) that a page with it closed never downloads`);
    ok('pressing the launcher opens the panel');

    await page.eval(`document.querySelector('aside[data-assistant] textarea[aria-label="Message"]').focus()`);
    await page.send('Input.insertText', { text: 'What is this page?' });
    await until('Send to enable', () => page.eval<boolean>(`!document.querySelector('aside[data-assistant] button[aria-label="Send"]').disabled`), Boolean);
    await page.eval(`document.querySelector('aside[data-assistant] button[aria-label="Send"]').click()`);
    const reply = await until('the reply', said, (t) => t === 'This is the Overview page.');
    ok(`the streamed reply reads "${reply}"`);

    const requests = (await (await fetch(`${llm}/requests`)).json()) as unknown[];
    if (!JSON.stringify(requests).includes('Page: Overview (/)')) fail('no request to the model carried "Page: Overview (/)"');
    ok('the model request carried "Page: Overview (/)"');

    // A reply is rendered as markdown, never as the model's own markup: the list, the bold and the table are
    // ELEMENTS, and the characters that made them are gone from the panel's text.
    await ask('Show me a markdown summary');
    const md = await until('the markdown reply', () => page.eval<{ list: number; bold: number; table: number; text: string }>(
      `(() => { const b = [...document.querySelectorAll('aside[data-assistant] [data-assistant-text]')].at(-1);
                return b ? { list: b.querySelectorAll('li').length, bold: b.querySelectorAll('strong').length,
                             table: b.querySelectorAll('table').length, text: b.textContent } : { list: 0, bold: 0, table: 0, text: '' }; })()`),
      (v) => v.table > 0);
    if (!md.list || !md.bold) fail(`the markdown reply rendered ${md.list} list items and ${md.bold} bold runs`);
    if (md.text.includes('**') || md.text.includes('|---') || md.text.includes('| ---')) fail(`the markdown reply still shows its markup: "${md.text}"`);
    ok(`the reply is rendered markdown: ${md.list} list items, ${md.bold} bold runs and a table, with no markup characters left`);

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

    // The whole panel, from the page the model was given to the key staying on the server.
    const LAUNCH = `document.querySelector('${LAUNCHER}').click()`;
    const panelOpen = () => page.eval<boolean>(`!!document.querySelector('aside[data-assistant]')`);
    const openPanel = async () => { await page.eval(LAUNCH); await until('the panel to open', panelOpen, Boolean); };
    const stored = () => page.eval<string | null>(`localStorage.getItem(${JSON.stringify(`${slug}.assistant`)})`);
    const here = () => page.eval<string>(`location.pathname`);
    const cards = () => page.eval<{ text: string; buttons: string[] }[]>(`[...document.querySelectorAll('${PROPOSALS}')].map((a) => ({ text: a.textContent, buttons: [...a.querySelectorAll('button')].map((b) => b.textContent.trim()) }))`);
    const follow = async (href: string) => { await press(`document.querySelector('aside[aria-label="Primary"] a[href="${href}"]')`); await until(`the address to be ${href}`, here, (p) => p === href); };
    const recorded = async () => (await (await fetch(`${llm}/requests`)).json()) as { messages?: { role: string; content: unknown }[] }[];
    const LOCAL = `${slug}.assistant`;

    // 1. The page context: the title and path, and the page's text, capped.
    const onMembers = (await recorded()).filter((r) => JSON.stringify(r.messages?.[0]).includes('Page: Members (/members)')).at(-1);
    const system = String(onMembers?.messages?.find((m) => m.role === 'system')?.content ?? '');
    if (!system) fail('no request to the model carried "Page: Members (/members)"');
    const text = /<page-text>\n([\s\S]*?)\n<\/page-text>/.exec(system)?.[1] ?? '';
    if (!text.includes('Alice Moreno')) fail('the page text the model was given does not contain "Alice Moreno"');
    if (text.length > 24_000) fail(`the page text the model was given is ${text.length} characters, over 24,000`);
    ok(`the last request from /members carried "Page: Members (/members)" and ${text.length} characters of page text with "Alice Moreno"`);

    // 2. Navigation: the rail keeps the panel open with the thread.
    await follow('/keys');
    if (!(await panelOpen())) fail('following the rail to /keys closed the panel');
    const labels = () => page.eval<string[]>(`[...document.querySelectorAll('aside[data-assistant] span')].map((s) => s.textContent.trim()).filter((t) => t.startsWith('On '))`);
    const tagged = await labels();
    if (!tagged.includes('On Members')) fail(`/keys shows the labels ${JSON.stringify(tagged)}, none "On Members"`);
    if (!(await page.eval<boolean>(`document.querySelector('aside[data-assistant]').textContent.includes('Which Support viewers have been inactive')`))) fail('/keys lost the earlier messages');
    ok(`following the rail to /keys kept the panel open with the earlier messages and their "On Members" labels (${tagged.length} labels)`);

    // 3. Reload: a removal that waited is Expired with the reload reason and cannot be approved.
    await ask('Remove Ravi Patel');
    await until('a waiting removal', cards, (c) => c.length > 0 && c.at(-1)!.buttons.some((b) => b.startsWith('Approve')));
    await sleep(500);
    await page.open(`${base}/keys`, { width: 1440 });
    await openPanel();
    const afterReload = await until('the stored thread', cards, (c) => c.length > 0);
    const reloaded = afterReload.at(-1)!;
    if (!reloaded.text.includes('Expired') || !reloaded.text.includes('The page was reloaded before anyone approved it.')) fail(`after a reload the waiting card reads "${reloaded.text}"`);
    if (afterReload.some((c) => c.buttons.some((b) => b.startsWith('Approve')))) fail('after a reload a card still offers Approve');
    ok('after a reload the thread is back and the waiting removal reads Expired with the reload reason and no Approve');

    // 4. Moved on: a new message closes whatever still waits.
    const before = afterReload.length;
    await ask('Remove Ravi Patel');
    await until('a new waiting removal', cards, (c) => c.length === before + 1 && c.at(-1)!.buttons.some((b) => b.startsWith('Approve')));
    await ask('What is this page?');
    await until('the reply', said, (t) => t === 'This is the API keys page.');
    const closed = (await cards()).at(-1)!;
    if (!closed.text.includes('Expired') || !closed.text.includes('You moved on before approving it.') || closed.buttons.length) fail(`after moving on the waiting card reads "${closed.text}" with buttons ${JSON.stringify(closed.buttons)}`);
    ok('asking something else closes the waiting removal as Expired with the moved-on reason');

    // 5. Clear: the panel and the stored thread are both emptied.
    await press(`document.querySelector('aside[data-assistant] button[aria-label="Clear conversation"]')`);
    await until('the panel to empty', () => page.eval<number>(`document.querySelectorAll('aside[data-assistant] [data-role]').length`), (n) => n === 0);
    await until('the stored thread to go', stored, (v) => v === null);
    ok(`Clear conversation empties the panel and removes ${LOCAL} from local storage`);

    // 6. The switch: off hides the launcher and the panel and keeps the thread; on brings both back.
    await ask('What is this page?');
    await until('the reply', said, (t) => t === 'This is the API keys page.');
    await until('the thread to be stored', stored, (v) => !!v?.includes('What is this page?'));
    await follow('/settings');
    const SWITCH = `(() => { const l = [...document.querySelectorAll('label')].find((x) => x.textContent.includes('Show the assistant')); return l && document.getElementById(l.htmlFor); })()`;
    const absent = () => page.eval<boolean>(`!document.querySelector('${LAUNCHER}') && !document.querySelector('aside[data-assistant]')`);
    await press(SWITCH);
    await until('the launcher and panel to go from /settings', absent, Boolean);
    await page.open(`${base}/members`, { width: 1440 });
    if (!(await absent())) fail('/members still shows the assistant with the switch off');
    if (!(await stored())?.includes('What is this page?')) fail('switching the assistant off removed the stored thread');
    await page.open(`${base}/settings`, { width: 1440 });
    if (!(await absent())) fail('/settings still shows the assistant with the switch off');
    await press(SWITCH);
    await until('the launcher to return', () => page.eval<boolean>(`!!document.querySelector('${LAUNCHER}')`), Boolean);
    await openPanel();
    await until('the thread to return', () => page.eval<boolean>(`document.querySelector('aside[data-assistant]').textContent.includes('What is this page?')`), Boolean);
    ok('Show the assistant off hides the launcher on /settings and /members and keeps the thread; on brings the launcher and the thread back');

    // 7. Layout: a column beside the page at 1440px, over it at 390px; Escape closes it.
    const geometry = () => page.eval<{ position: string; main: number; panel: number; width: number }>(`(() => { const a = document.querySelector('aside[data-assistant]'); return { position: getComputedStyle(a).position, main: Math.round(document.querySelector('main').getBoundingClientRect().right), panel: Math.round(a.getBoundingClientRect().left), width: innerWidth }; })()`);
    const wide = await geometry();
    if (wide.position === 'fixed' || Math.abs(wide.main - wide.panel) > 1) fail(`at 1440px the panel is ${wide.position} with the page ending at ${wide.main}px and the panel starting at ${wide.panel}px`);
    await page.open(`${base}/settings`, { width: 390 });
    await openPanel();
    const narrow = await geometry();
    if (narrow.position !== 'fixed' || narrow.main !== narrow.width || narrow.panel >= narrow.main) fail(`at 390px the panel is ${narrow.position}, the page ends at ${narrow.main}px and the panel starts at ${narrow.panel}px`);
    await page.eval(`document.querySelector('${MESSAGE}').focus()`);
    for (const type of ['keyDown', 'keyUp'] as const) await page.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await until('Escape to close the panel', panelOpen, (v) => !v);
    ok(`at 1440px the panel is a column (page ends at ${wide.main}px, panel starts at ${wide.panel}px); at 390px it is fixed over the page; Escape closes it`);

    // 8. A provider that refuses the key: plain words and Retry, and nothing of the key. Responses are kept as the browser got them.
    await page.open(`${base}/`, { width: 1440 });
    await page.eval(`(() => { window.__api = []; const f = window.fetch; window.fetch = async (...a) => { const r = await f(...a); if (String(a[0]).includes('/api/assistant')) r.clone().text().then((t) => window.__api.push(t)); return r; }; })()`);
    await openPanel();
    await ask('Please fail now');
    const panelText = () => page.eval<string>(`document.querySelector('aside[data-assistant]').textContent`);
    await until('the failure to show', panelText, (t) => t.includes('The assistant is not set up correctly'));
    if (!(await page.eval<boolean>(`[...document.querySelectorAll('aside[data-assistant] button')].some((b) => b.textContent.trim() === 'Retry')`))) fail('the failure offers no Retry');
    if ((await panelText()).includes(key!)) fail('the panel shows the key');
    ok('a refused key shows "The assistant is not set up correctly" with Retry');
    const seen = await page.eval<string[]>(`window.__api`);

    // 9. The key never reaches the browser: console pages, their RSC payloads, their scripts and the route's answers.
    const bodies: [string, string][] = seen.map((t, i) => [`the panel's /api/assistant response ${i + 1}`, t]);
    const post = async (said: string) => {
      const res = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: said }] }], page: { path: '/', title: 'Overview', text: '' } }) });
      return await res.text();
    };
    bodies.push(['POST /api/assistant (an answer)', await post('Hello')], ['POST /api/assistant (a refused key)', await post('Please fail')]);
    const scripts = new Set<string>();
    let pages = 0;
    for (const route of discover()) {
      const html = await (await fetch(`${base}${route}`)).text();
      const rsc = await (await fetch(`${base}${route}`, { headers: { RSC: '1' } })).text();
      pages += 1;
      bodies.push([`${route} (HTML)`, html], [`${route} (RSC)`, rsc]);
      for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)]+?\.js/g)) scripts.add(m[0]);
    }
    for (const src of scripts) bodies.push([src, await (await fetch(`${base}${src}`)).text()]);
    if (!bodies.some(([, t]) => t.includes('not set up correctly'))) fail('no /api/assistant response carried the failure sentence, so the key check proved nothing');
    const leaked = bodies.filter(([, t]) => t.includes(key!)).map(([what]) => what);
    if (leaked.length) fail(`the key appears in: ${leaked.join(', ')}`);
    ok(`the key is in none of ${pages} pages, ${pages} RSC payloads, ${scripts.size} scripts or ${seen.length + 2} /api/assistant responses`);
  }
} catch (e) {
  console.log(`FAIL assistant ${expect}: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  page.close();
}

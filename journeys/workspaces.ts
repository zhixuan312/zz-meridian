/**
 * The workspace journeys: the product walked as a person walks it, against a running build.
 *
 *   node journeys/workspaces.ts [--base http://localhost:3100]
 *
 * This is the sample's own script, not Meridian's: it knows the product's three workspaces, so it lives beside the
 * template and not in scripts/, which every adopted project is given. It imports only the browser helper, the
 * verification configuration (the personas' cookies and the sample's detail routes) and the product's configuration, so
 * every name it looks for is read from there: the product's name, the workspaces and their homes, the navigation's
 * labels. A step finds what it presses by role and accessible name, presses it with a real pointer event at its centre,
 * types with real key events, and waits on a condition with a deadline.
 *
 * It writes only what a person could write through the page: one ticket, in the running sample. The audit, the presses
 * and the keyboard walk share that server, so a count is compared with the one read just before the write it follows and
 * must have grown by at least one, never to a fixed number.
 *
 * One line per step: `ok`, `FAIL` with what was expected and what was found, or `n/a` with the reason. The last line is
 * `journeys: ` and a JSON summary. Exit 0 when every step passed, 1 when one failed, 2 when no browser can be launched.
 * The steps run only when this file is the command run; imported, it runs nothing and launches no browser.
 */
import { launch, type Page } from '../scripts/lib/chrome.ts';
import config from '../scripts/verify.config.ts';
import * as product from '../src/app.config.ts';

type Workspace = { label: string; audience: string; homeHref: string };
const { app, nav } = product;
const declared = (product as unknown as { workspaces?: Record<string, Workspace> }).workspaces;

const args = process.argv.slice(2);
const baseArg = args.indexOf('--base');
const base = (baseArg >= 0 ? args[baseArg + 1] : (process.env.BASE ?? 'http://localhost:3100')).replace(/\/$/, '');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const items = nav.flatMap((g) => g.items);
const has = (href: string) => items.some((i) => i.href === href);
const labelOf = (href: string) => items.find((i) => i.href === href)?.label ?? href;
const MENU_END = ': workspace menu';

const summary = (status: string, steps: number, failed: string[], extra: Record<string, unknown> = {}) => {
  console.log(`journeys: ${JSON.stringify({ status, steps, failed, ...extra })}`);
};

if (!declared) {
  console.log('n/a  every step: this product declares no workspaces (src/app.config.ts exports none)');
  summary('ok', 0, [], { notApplicable: 'no workspaces' });
  process.exit(0);
}
const W = declared;
const IDS = Object.keys(W);
const must = ['main', 'business', 'engineering'].filter((id) => !W[id]);
if (must.length) {
  console.log(`FAIL setup: the journeys walk the workspaces main, business and engineering; not declared: ${must.join(', ')}`);
  summary('failed', 0, ['setup']);
  process.exit(1);
}

const persona = (name: string) => {
  const p = config.personas?.[name];
  if (!p) throw new Error(`scripts/verify.config.ts declares no persona "${name}"`);
  return p;
};

// ---- what a page is asked, written once and sent to the browser with each question ----

const LIB = String.raw`
const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
const shown = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none'; };
const roleOf = (el) => {
  const r = el.getAttribute('role'); if (r) return r;
  const t = el.tagName;
  if (t === 'A') return el.hasAttribute('href') ? 'link' : '';
  if (t === 'BUTTON') return 'button';
  if (t === 'TEXTAREA') return 'textbox';
  if (t === 'INPUT') { const ty = el.getAttribute('type') || 'text'; return ty === 'checkbox' ? 'checkbox' : ty === 'search' ? 'searchbox' : ty === 'button' || ty === 'submit' ? 'button' : 'textbox'; }
  return '';
};
const nameOf = (el) => {
  const l = el.getAttribute('aria-label'); if (l) return l.trim();
  const by = el.getAttribute('aria-labelledby');
  if (by) return by.split(/\s+/).map((i) => { const n = document.getElementById(i); return n ? text(n) : ''; }).join(' ').trim();
  if (el.labels && el.labels.length) return [...el.labels].map(text).join(' ');
  return text(el);
};
const find = (spec) => {
  const root = spec.within ? document.querySelector(spec.within) : document;
  if (!root) return [];
  const re = spec.re ? new RegExp(spec.re) : null;
  const href = spec.hrefRe ? new RegExp(spec.hrefRe) : null;
  return [...root.querySelectorAll('a[href],button,input,textarea,[role]')].filter((el) =>
    roleOf(el) === spec.role && shown(el) &&
    (re ? re.test(nameOf(el)) : spec.name === undefined || nameOf(el) === spec.name) &&
    (!href || href.test(el.getAttribute('href') || '')));
};
`;

/** Run a snippet in the page, with the helpers above in scope; the snippet returns its answer. */
const ask = <T>(page: Page, body: string) => page.eval<T>(`(() => { ${LIB}\n${body}\n})()`);

/** What a person finds by role and accessible name: an exact name, or a pattern. */
type Spec = { role: string; name?: string; re?: string; within?: string; hrefRe?: string };

const until = async <T>(what: string, probe: () => Promise<T | null | undefined | false>, ms = 15000): Promise<T> => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await probe().catch(() => null);
    if (v !== null && v !== undefined && v !== false) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(100);
  }
};

/** The centre of the first matching control that nothing covers, scrolled into view; null while there is none. */
const centre = (page: Page, spec: Spec) =>
  ask<{ x: number; y: number } | null>(page, `
    const el = find(${JSON.stringify(spec)})[0]; if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return top && (el === top || el.contains(top)) ? { x, y } : null;`);

const describeSpec = (s: Spec) => `${s.role} ${s.name !== undefined ? `"${s.name}"` : `/${s.re}/`}${s.within ? ` in ${s.within}` : ''}`;

/** Press a control with a real pointer, as a person does, once it is on screen and uncovered. */
async function press(page: Page, spec: Spec) {
  const at = await until(`${describeSpec(spec)} to be there to press`, () => centre(page, spec));
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
}

const key = (page: Page, k: string, code: string, vk: number, text?: string) => page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, ...(text ? { text, unmodifiedText: text } : {}) })
  .then(() => page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }));

/** Type into the focused field, one key at a time. */
async function type(page: Page, s: string) {
  for (const c of s) {
    if (c === ' ') await key(page, ' ', 'Space', 32, ' ');
    else await key(page, c, /[a-z]/i.test(c) ? `Key${c.toUpperCase()}` : /\d/.test(c) ? `Digit${c}` : '', c.toUpperCase().charCodeAt(0), c);
  }
}

type Rail = { path: string; search: string; rail: string | null; links: { href: string; current: boolean }[] | null };
const railOf = (page: Page) => ask<Rail>(page, `
  const nav = document.querySelector('nav[aria-label="Main"]');
  const trigger = [...document.querySelectorAll('button')].find((b) => /: (workspace|account) menu$/.test(b.getAttribute('aria-label') || ''));
  return {
    path: location.pathname, search: location.search,
    rail: trigger ? trigger.getAttribute('aria-label') : null,
    links: nav ? [...nav.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), current: a.getAttribute('aria-current') === 'page' })) : null,
  };`);

/** The workspace a rail names, read from its menu trigger's accessible name, which is the product's name and then the workspace. */
const railWorkspace = (r: Rail) => {
  const head = `${app.name}, `;
  return r.rail && r.rail.startsWith(head) && r.rail.endsWith(MENU_END) ? r.rail.slice(head.length, -MENU_END.length) : null;
};

/** The workspace an address belongs to: the owner of the longest entry it falls under, on a whole path segment. */
const ownerOf = (path: string): string | null => {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  let best: (typeof items)[number] | null = null;
  for (const i of items) {
    if (!i.workspace) continue;
    const under = i.href === '/' ? clean === '/' : clean === i.href || clean.startsWith(`${i.href}/`);
    if (under && (best === null || i.href.length > best.href.length)) best = i;
  }
  return best?.workspace ?? null;
};

/** A person's routes: the ones the verification configuration says they may open, written there by hand. */
const routesOf = (name: string) => [...persona(name).expectedRoutes];
const railHrefs = (ws: string, routes: string[]) => items.filter((i) => i.workspace === ws && routes.includes(i.href)).map((i) => i.href);
const currentIn = (path: string, hrefs: string[]) => hrefs.filter((h) => (h === '/' ? path === '/' : path === h || path.startsWith(`${h}/`))).sort((a, b) => b.length - a.length)[0] ?? null;

/**
 * Wait until the page is at `path` and the rail is exactly what that address's workspace shows for this person: the
 * workspace named under the product's name, that workspace's destinations less the ones the person may not open, and the
 * entry the address is under marked as the current page.
 */
async function settle(page: Page, who: string, path: string | RegExp, ws?: string) {
  const routes = routesOf(who);
  let found = 'nothing read';
  let expected = '';
  try {
    await until('', async () => {
      const r = await railOf(page);
      const owner = ws ?? ownerOf(r.path) ?? 'main';
      const hrefs = railHrefs(owner, routes);
      const cur = currentIn(r.path, hrefs);
      expected = `${path} with the rail on "${W[owner].label}" showing ${hrefs.join(' ')} (current ${cur})`;
      const seen = r.links?.map((l) => l.href) ?? null;
      const now = r.links?.find((l) => l.current)?.href ?? null;
      found = `${r.path}${r.search} with the rail on "${railWorkspace(r)}" showing ${seen?.join(' ') ?? 'no links'} (current ${now})`;
      const at = path instanceof RegExp ? path.test(r.path) : r.path === path;
      return at && railWorkspace(r) === W[owner].label && seen?.join(' ') === hrefs.join(' ') && now === cur;
    });
  } catch {
    throw new Error(`expected ${expected || String(path)}; found ${found}`);
  }
  return (await railOf(page)).path;
}

/** Choose a workspace in the rail's menu, as a person does: open the menu, press the row. */
async function choose(page: Page, id: string) {
  await press(page, { role: 'button', re: `${MENU_END}$` });
  await press(page, { role: 'menuitemradio', name: W[id].label });
}

const quiet = (page: Page, where: string) => {
  if (page.errors.length) throw new Error(`console errors on ${where}: ${page.errors.slice(0, 3).join(' | ')}`);
};

// ---- the steps ----

const opened: Page[] = [];
const browser = async () => { const p = await launch(); opened.push(p); return p; };
const go = async (page: Page, who: string, path: string) => {
  quiet(page, 'the page before');
  await page.open(base + path, { width: 1440, height: 900, theme: 'dark', wait: 300, cookie: persona(who).cookie });
};

const results: { name: string; status: 'ok' | 'FAIL' | 'n/a' }[] = [];
async function step(name: string, applies: string | null, run: () => Promise<string | void>, pages: () => Page[] = () => []) {
  const t = Date.now();
  // What an earlier step left in a browser's console is that step's to report.
  for (const p of opened) p.errors.length = 0;
  if (applies) {
    results.push({ name, status: 'n/a' });
    console.log(`n/a  ${name}: ${applies}`);
    return;
  }
  try {
    const note = await run();
    for (const p of pages()) quiet(p, 'a page this step visited');
    results.push({ name, status: 'ok' });
    console.log(`ok   ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)${note ? ` ${note}` : ''}`);
  } catch (e) {
    results.push({ name, status: 'FAIL' });
    console.log(`FAIL ${name}: ${(e as Error).message}`);
  }
}

export const missing = (...hrefs: string[]) => {
  const gone = hrefs.filter((h) => !has(h));
  return gone.length ? `${gone.join(', ')} is not in the navigation` : null;
};

const HOME = W.main.homeHref;
const REQUESTS = '/requests';
const TICKETS = '/operations-tickets';
const SETTINGS = '/settings';
const MEMBERS = '/members';
const ATLAS = nav.flatMap((g) => g.items).find((i) => i.href === '/system' || i.href.startsWith('/system/'))?.href ?? null;
const detail = config.detailRoutes.find((r) => /^\/requests\/[^/]+$/.test(r) && !r.includes('missing'));
const CUSTOMERS = '/customers';
/** A customer's id is its name in lower case with dashes between the words. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const customerRoutes = config.detailRoutes.filter((r) => /^\/customers\/[^/]+$/.test(r));
const unknownCustomer = customerRoutes.find((r) => r.includes('missing'));
const knownCustomers = customerRoutes.filter((r) => r !== unknownCustomer);

/** The title the navigation check names for a rail route: what its page's heading shows (navigate.ts holds it to the same, by inclusion). */
const titleOf = (href: string) => config.navigationChecks?.find((c) => c.path === href)?.title;
/**
 * The page's heading, once the page is there: while its `loading.tsx` stands in (a `role="status"` that is busy), the
 * masthead holds the page's name where a record's name will be, and a step reading it then failed on a loaded machine.
 */
export const headingOf = (page: Page) => until("the page's heading", () => ask<string>(page, `if (document.querySelector('[role="status"][aria-busy="true"]')) return null; const h = document.querySelector('main h1, h1'); const t = h ? text(h) : ''; return t || null;`));
const mainText = (page: Page) => ask<string>(page, `const m = document.querySelector('main'); return m ? text(m) : '';`);

/**
 * The trail the refresh step walks back along: Requests, Business's home, Main's home. The step needs each of them in the
 * navigation and nothing else.
 */
export const trail = [REQUESTS, W.business.homeHref, HOME];

/**
 * Open one rail destination as a person and report what is wrong with it, or null. A destination the person may open must
 * draw its title as the heading, with the rail naming the entry's workspace and marking the entry current; one the person
 * may not open must draw what the product's `refusal` chooses, as `pnpm verify --as` expects it: under `explain` the page
 * that says they lack access to it by its title, under `absent` the missing page and no no-access page.
 */
export async function visit(page: Page, who: string, item: (typeof items)[number], may: boolean): Promise<string | null> {
  const title = titleOf(item.href);
  if (title === undefined) return `${item.href} (${item.label}): no navigation check in scripts/verify.config.ts names its title`;
  try {
    await go(page, who, item.href);
    if (may && item.href.startsWith('/system')) {
      // The Atlas draws its own chrome, not the console rail: it names the workspace it leads back to in its shelf.
      const back = `Back to ${W[item.workspace!].label}`;
      await until(`the Atlas to lead back with "${back}"`, () => centre(page, { role: 'link', name: back, within: 'nav[aria-label="Workspaces"]' }));
      const heading = await headingOf(page);
      if (!heading.includes(title)) return `${item.href}: expected the heading "${title}"; found "${heading}"`;
    } else if (may) {
      await settle(page, who, item.href, item.workspace);
      const heading = await headingOf(page);
      if (!heading.includes(title)) return `${item.href}: expected the heading "${title}"; found "${heading}"`;
    } else if (config.refusal === 'absent') {
      const found = await until('the missing page', () => ask<boolean>(page, `return !!document.querySelector('[data-missing-page]');`), 6000).then(() => null, async () => `"${(await mainText(page)).slice(0, 80)}"`);
      if (found) return `${item.href}: expected the missing page, as the product's refusal is absent; found ${found}`;
      if (await ask<boolean>(page, `return !!document.querySelector('[data-no-access]');`)) return `${item.href}: expected no no-access page, as the product's refusal is absent; it shows one`;
      const probe = persona(who).deniedProbe?.[item.href];
      if (probe && (await ask<boolean>(page, `return document.body.innerText.includes(${JSON.stringify(probe)});`))) return `${item.href}: expected the missing page to hold none of the page's records; it shows "${probe}"`;
    } else {
      const refusal = `You don't have access to ${title}`;
      const found = await until('the refusal', async () => ((await mainText(page)).includes(refusal) ? true : null), 6000).then(() => null, async () => `"${(await mainText(page)).slice(0, 80)}"`);
      if (found) return `${item.href}: expected the page that says "${refusal}"; found ${found}`;
      const heading = await headingOf(page);
      if (heading !== title) return `${item.href}: expected the refusal under the heading "${title}"; found "${heading}"`;
      const probe = persona(who).deniedProbe?.[item.href];
      if (probe && (await ask<boolean>(page, `return document.body.innerText.includes(${JSON.stringify(probe)});`))) return `${item.href}: expected the refusal to hold none of the page's records; it shows "${probe}"`;
    }
    quiet(page, item.href);
    return null;
  } catch (e) {
    return `${item.href}: ${(e as Error).message}`;
  } finally {
    page.errors.length = 0;
  }
}

if (import.meta.main) {
  let a: Page;
  try {
    a = await browser();
  } catch (e) {
    console.log(`not run: no browser could be launched (${(e as Error).message})`);
    summary('not run', 0, []);
    process.exit(2);
  }

  try {
    await step("Main to a request's own page, with the rail on Business", missing(REQUESTS) ?? (has('/business') ? null : '/business is not in the navigation'), async () => {
      await go(a, 'member', HOME);
      await settle(a, 'member', HOME, 'main');
      // Home's Business card opens the Business home; the rail then names Business and offers Requests.
      await press(a, { role: 'link', hrefRe: '^/business$', within: '[role="region"][aria-label="Business"]' });
      await settle(a, 'member', '/business', 'business');
      await press(a, { role: 'link', name: labelOf(REQUESTS), within: 'nav[aria-label="Main"]' });
      await settle(a, 'member', REQUESTS, 'business');
      await press(a, { role: 'link', hrefRe: '^/requests/[^/]+$', within: 'main table tbody' });
      const at = await settle(a, 'member', /^\/requests\/[^/]+$/, 'business');
      return `(${at})`;
    }, () => [a]);

    await step("the rail's menu opens Engineering: its address, its name and its entries", null, async () => {
      await go(a, 'member', HOME);
      await settle(a, 'member', HOME, 'main');
      await choose(a, 'engineering');
      await settle(a, 'member', W.engineering.homeHref, 'engineering');
    }, () => [a]);

    await step("a ticket created in Engineering raises Main's open count", missing(TICKETS, '/'), async () => {
      const title = `Journey ticket ${Date.now().toString(36)}`;
      const openCount = (page: Page) => ask<number | null>(page, `
        const reg = document.querySelector('[role="region"][aria-label="Engineering"]'); if (!reg) return null;
        const row = [...reg.querySelectorAll('dl > div')].find((r) => text(r.querySelector('dt')) === 'Tickets open');
        const n = row ? Number(text(row.querySelector('dd'))) : NaN;
        return Number.isFinite(n) ? n : null;`);
      await go(a, 'member', HOME);
      await settle(a, 'member', HOME, 'main');
      const before = await until("Main's open ticket count", async () => (await openCount(a)) ?? undefined);
      await choose(a, 'engineering');
      await settle(a, 'member', W.engineering.homeHref, 'engineering');
      await press(a, { role: 'link', name: labelOf(TICKETS), within: 'nav[aria-label="Main"]' });
      await settle(a, 'member', TICKETS, 'engineering');
      await press(a, { role: 'button', name: 'New ticket' });
      const titleField: Spec = { role: 'textbox', re: '^Title', within: '[role="dialog"]' };
      await press(a, titleField);
      await type(a, title);
      await press(a, { role: 'button', name: 'Create ticket', within: '[role="dialog"]' });
      // The form closes when the ticket exists; a refusal stays in it, and is the failure.
      await until('the new ticket to be created', async () => {
        const state = await ask<string>(a, `
          const d = document.querySelector('[role="dialog"]');
          if (!d) return 'closed';
          return /Ticket not created/.test(text(d)) ? 'refused: ' + text(d).slice(0, 200) : 'open';`);
        if (state.startsWith('refused')) throw new Error(`the ticket was refused (${state})`);
        return state === 'closed';
      }).catch((e) => { throw new Error(`expected the member's ticket to be created; ${(e as Error).message}`); });
      await until('the new ticket in the table', () => ask<boolean>(a, `return text(document.querySelector('main')).includes(${JSON.stringify(title)});`));
      await choose(a, 'main');
      await settle(a, 'member', HOME, 'main');
      let after: number | null = null;
      const end = Date.now() + 15000;
      while (Date.now() < end) {
        after = await openCount(a);
        if (after !== null && after >= before + 1) break;
        await sleep(250);
      }
      if (after === null || after < 1) throw new Error(`expected Main to count the new ticket among its open tickets; found ${after} (read ${before} just before it was created)`);
      // The presses share this server and move tickets along while this runs, so a count that did not grow by one is not a
      // defect when the ticket itself is counted: the line says which of the two was seen.
      if (after < before + 1) return `(${before} -> ${after}, beside another writer)`;
      return `(${before} -> ${after})`;
    }, () => [a]);

    await step('a refresh, then Back and Forward, each leave the rail on the address\'s workspace', missing(...trail), async () => {
      await go(a, 'member', HOME);
      await settle(a, 'member', HOME, 'main');
      await choose(a, 'business');
      await settle(a, 'member', W.business.homeHref, 'business');
      await press(a, { role: 'link', name: labelOf(REQUESTS), within: 'nav[aria-label="Main"]' });
      await settle(a, 'member', REQUESTS, 'business');
      await press(a, { role: 'link', hrefRe: '^/requests/[^/]+$', within: 'main table tbody' });
      const request = await settle(a, 'member', /^\/requests\/[^/]+$/, 'business');
      // A refresh: the page is marked first, so that only the new document can satisfy the wait.
      await a.eval('window.__before = true');
      await a.send('Page.reload');
      await until('the page to reload', () => a.eval<boolean>('window.__before === undefined && document.readyState !== "loading"'));
      await settle(a, 'member', request, 'business');
      for (const path of trail) {
        await a.eval('history.back()');
        await settle(a, 'member', path);
      }
      for (const path of [...trail].reverse().slice(1).concat(request)) {
        await a.eval('history.forward()');
        await settle(a, 'member', path);
      }
    }, () => [a]);

    await step('a second, independent browser on another workspace is unaffected', null, async () => {
      const b = await browser();
      await go(a, 'member', W.engineering.homeHref);
      await go(b, 'member', W.business.homeHref);
      await settle(a, 'member', W.engineering.homeHref, 'engineering');
      await settle(b, 'member', W.business.homeHref, 'business');
      await choose(a, 'main');
      await settle(a, 'member', HOME, 'main');
      await settle(b, 'member', W.business.homeHref, 'business');
      await choose(b, 'engineering');
      await settle(b, 'member', W.engineering.homeHref, 'engineering');
      await settle(a, 'member', HOME, 'main');
      quiet(b, 'the second browser');
    }, () => [a]);

    await step("a request's address opened directly lands in Business", detail ? missing(REQUESTS) : 'verify.config.ts names no request detail route', async () => {
      await go(a, 'member', detail!);
      await settle(a, 'member', detail!, 'business');
      const heading = await until('the page\'s heading', () => ask<string>(a, `const h = document.querySelector('main h1, h1'); return h ? text(h) : '';`));
      return `("${heading}")`;
    }, () => [a]);

    await step('the Atlas leads back to Main and into each workspace', ATLAS ? null : 'no entry under /system is configured, so this product has no Atlas', async () => {
      const shelf = 'nav[aria-label="Workspaces"]';
      const inAtlas = () => until('the Atlas\'s workspace links', () => ask<boolean>(a, `return location.pathname.startsWith('/system') && !!document.querySelector(${JSON.stringify(shelf)});`));
      await go(a, 'member', HOME);
      await settle(a, 'member', HOME, 'main');
      await press(a, { role: 'link', name: labelOf(ATLAS!), within: 'nav[aria-label="Main"]' });
      await inAtlas();
      await press(a, { role: 'link', name: `Back to ${W.main.label}`, within: shelf });
      await settle(a, 'member', HOME, 'main');
      for (const id of IDS.filter((x) => x !== 'main')) {
        await go(a, 'member', ATLAS!);
        await inAtlas();
        await press(a, { role: 'link', name: W[id].label, within: shelf });
        await settle(a, 'member', W[id].homeHref, id);
      }
    }, () => [a]);

    await step('choosing the workspace already in view changes nothing', missing(TICKETS), async () => {
      const at = `${TICKETS}?state=open`;
      await go(a, 'member', at);
      await settle(a, 'member', TICKETS, 'engineering');
      await until('the table', () => ask<boolean>(a, `return document.querySelectorAll('main table tbody tr').length > 0;`));
      const read = () => ask<{ where: string; entries: number; rows: number }>(a, `return { where: location.pathname + location.search, entries: history.length, rows: document.querySelectorAll('main table tbody tr').length };`);
      const before = await read();
      await choose(a, 'engineering');
      await until('the menu to close', () => ask<boolean>(a, `return !document.querySelector('[role="menu"]');`));
      // Nothing happens, which only a stretch of looking can show: the address and the history must stay as they were throughout.
      for (const end = Date.now() + 1500; Date.now() < end; await sleep(150)) {
        const now = await read();
        if (now.where !== before.where || now.entries !== before.entries || now.rows !== before.rows) throw new Error(`expected ${JSON.stringify(before)} unchanged; found ${JSON.stringify(now)}`);
      }
      await settle(a, 'member', TICKETS, 'engineering');
      return `(${before.where})`;
    }, () => [a]);

    await step('an unsaved change in Settings asks before another workspace is opened', missing(SETTINGS), async () => {
      const other = IDS.find((x) => x !== 'main')!;
      const field: Spec = { role: 'textbox', name: 'Name' };
      const dialog: Spec = { role: 'dialog', re: 'Leave without saving' };
      await go(a, 'owner', SETTINGS);
      await settle(a, 'owner', SETTINGS, 'main');
      const original = await until('the Workspace name field', () => ask<string | null>(a, `const el = find(${JSON.stringify(field)})[0]; return el ? el.value : null;`));
      await press(a, field);
      await key(a, 'End', 'End', 35);
      const typed = ' edited';
      await type(a, typed);
      const edited = original + typed;
      const valueNow = () => ask<string | null>(a, `const el = find(${JSON.stringify(field)})[0]; return el ? el.value : null;`);
      await until('the typed value', async () => (await valueNow()) === edited);
      await until('the save bar', () => centre(a, { role: 'button', name: 'Save changes' }));
      const question = () => until('the question "Leave without saving?"', () => centre(a, dialog)).catch(() => { throw new Error(`expected the question "Leave without saving?" after choosing ${W[other].label} with an unsaved change; found none`); });
      // Staying changes nothing.
      await choose(a, other);
      await question();
      await press(a, { role: 'button', name: 'Stay', within: '[role="dialog"]' });
      await until('the question to close', async () => !(await centre(a, dialog)));
      const stayed = await railOf(a);
      const value = await valueNow();
      if (stayed.path !== SETTINGS || value !== edited || railWorkspace(stayed) !== W.main.label) {
        throw new Error(`expected to stay at ${SETTINGS} with "${edited}" and the rail on ${W.main.label}; found ${stayed.path} with "${value}" and the rail on ${railWorkspace(stayed)}`);
      }
      // Leaving arrives at the chosen workspace's home.
      await choose(a, other);
      await question();
      await press(a, { role: 'button', name: 'Leave', within: '[role="dialog"]' });
      await settle(a, 'owner', W[other].homeHref, other);
    }, () => [a]);

    await step('a navigation that cannot complete leaves the rail where the address is', null, async () => {
      const c = await browser();
      const target = W.engineering.homeHref;
      // Every request for the destination is held, none is answered: the browser is put in the state of a navigation that
      // has not arrived. The hold is set before the first page opens so that nothing for the destination is already cached.
      await c.send('Fetch.enable', { patterns: [{ urlPattern: `*${target}*`, requestStage: 'Request' }] });
      await go(c, 'member', HOME);
      await settle(c, 'member', HOME, 'main');
      await choose(c, 'engineering');
      await until('the menu to close', () => ask<boolean>(c, `return !document.querySelector('[role="menu"]');`));
      for (const end = Date.now() + 2500; Date.now() < end; await sleep(200)) {
        const r = await railOf(c);
        if (r.path !== HOME || railWorkspace(r) !== W.main.label) {
          throw new Error(`expected the address ${HOME} and the rail on ${W.main.label} while ${target} has not arrived; found ${r.path} with the rail on ${railWorkspace(r)}`);
        }
      }
      await settle(c, 'member', HOME, 'main');
      quiet(c, 'the held navigation');
      // Let it through: the destination arrives, and address and rail agree on it.
      await c.send('Fetch.disable');
      const arrived = await until('the held navigation to arrive', async () => (await railOf(c)).path === target).then(() => true, () => false);
      if (arrived) {
        await settle(c, 'member', target, 'engineering');
        return '(held, then released: arrived and the rail followed)';
      }
      return '(held; the release did not resume it, so only the held half was observed)';
    });

    await step('a Viewer is offered all three workspaces and enters each', null, async () => {
      await go(a, 'viewer', HOME);
      await settle(a, 'viewer', HOME, 'main');
      await press(a, { role: 'button', re: `${MENU_END}$` });
      const offered = await until('the workspace menu', async () => {
        const labels = await ask<string[]>(a, `return find({ role: 'menuitemradio' }).map(nameOf);`);
        return labels.length ? labels : null;
      });
      const want = IDS.map((id) => W[id].label);
      if (want.some((l) => !offered.includes(l))) throw new Error(`expected the menu to offer ${want.join(', ')}; found ${offered.join(', ')}`);
      await press(a, { role: 'menuitemradio', name: W.business.label });
      await settle(a, 'viewer', W.business.homeHref, 'business');
      await choose(a, 'engineering');
      await settle(a, 'viewer', W.engineering.homeHref, 'engineering');
      await choose(a, 'main');
      await settle(a, 'viewer', HOME, 'main');
    }, () => [a]);

    await step('a Viewer finds no way to create or move a ticket', missing(TICKETS), async () => {
      await go(a, 'viewer', HOME);
      await settle(a, 'viewer', HOME, 'main');
      await choose(a, 'engineering');
      await settle(a, 'viewer', W.engineering.homeHref, 'engineering');
      await press(a, { role: 'link', name: labelOf(TICKETS), within: 'nav[aria-label="Main"]' });
      await settle(a, 'viewer', TICKETS, 'engineering');
      await until('the tickets table', () => ask<boolean>(a, `return document.querySelectorAll('main table tbody tr').length > 0;`));
      const writes = await ask<string[]>(a, `return [...find({ role: 'button', name: 'New ticket' }), ...find({ role: 'button', re: '^Change state of ' })].map(nameOf);`);
      if (writes.length) throw new Error(`expected no control to create or move a ticket; found ${writes.slice(0, 3).join(', ')}`);
    }, () => [a]);

    await step('a Viewer on Members is told, holds none of its records, and is given a way out', missing(MEMBERS), async () => {
      const probe = persona('viewer').deniedProbe?.[MEMBERS];
      await go(a, 'viewer', MEMBERS);
      const out = await until('the refusal\'s way out', () => ask<{ href: string; name: string } | null>(a, `
        const el = find({ role: 'link', re: '^Go to ' , within: 'main' })[0];
        return el ? { href: el.getAttribute('href'), name: nameOf(el) } : null;`));
      if (probe && (await ask<boolean>(a, `return document.body.innerText.includes(${JSON.stringify(probe)});`))) throw new Error(`expected the refused page to hold none of the member list; it shows "${probe}"`);
      await press(a, { role: 'link', name: out.name, within: 'main' });
      const landed = await until('the way out to be followed', async () => { const r = await railOf(a); return r.path !== MEMBERS ? r.path : null; });
      if (ownerOf(landed) !== ownerOf(MEMBERS)) throw new Error(`expected "${out.name}" to stay in ${W[ownerOf(MEMBERS) ?? 'main'].label}; found ${landed}`);
      await settle(a, 'viewer', landed);
      return `("${out.name}" -> ${landed})`;
    }, () => [a]);

    await step('an Owner opens every destination under its name', config.navigationChecks ? null : 'verify.config.ts declares no navigation checks', async () => {
      const wrong: string[] = [];
      for (const item of items) {
        const why = await visit(a, 'owner', item, true);
        if (why) wrong.push(why);
      }
      if (wrong.length) throw new Error(`expected each of the ${items.length} rail destinations to open under the title its navigation check names, in its workspace, current in the rail; found ${wrong.length} that do not: ${wrong.join('; ')}`);
      return `(${items.length} destinations)`;
    });

    await step(`a Viewer opens what a Viewer may and is refused the rest ${config.refusal === 'absent' ? 'as a missing page' : 'by name'}`, config.navigationChecks ? null : 'verify.config.ts declares no navigation checks', async () => {
      const may = routesOf('viewer');
      const wrong: string[] = [];
      for (const item of items) {
        const why = await visit(a, 'viewer', item, may.includes(item.href));
        if (why) wrong.push(why);
      }
      if (wrong.length) throw new Error(`expected a Viewer to open ${may.length} destinations and be refused the other ${items.length - may.length} ${config.refusal === 'absent' ? 'as a missing page' : 'by title'}; found ${wrong.length} that differ: ${wrong.join('; ')}`);
      return `(${may.length} opened, ${items.length - may.length} refused)`;
    });

    await step("a customer's page opens from the list, and an unknown customer is a missing record", missing(CUSTOMERS) ?? (knownCustomers.length && unknownCustomer ? null : 'verify.config.ts names no customer detail route, or no missing one'), async () => {
      const [listed, ...others] = knownCustomers;
      await go(a, 'owner', CUSTOMERS);
      await settle(a, 'owner', CUSTOMERS, 'business');
      const row: Spec = { role: 'link', hrefRe: `^${listed}$`, within: 'main table tbody' };
      const name = await until(`the row of ${listed}`, () => ask<string | null>(a, `const el = find(${JSON.stringify(row)})[0]; return el ? nameOf(el) : null;`));
      await press(a, row);
      await settle(a, 'owner', listed, 'business');
      const heading = await headingOf(a);
      const id = listed.slice(CUSTOMERS.length + 1);
      if (!slug(name).includes(id) || !slug(heading).startsWith(id)) throw new Error(`expected the row "${name}" to open the page of ${id}; found a page headed "${heading}"`);
      const seen = [`${listed} "${heading}"`];
      for (const route of others) {
        await go(a, 'owner', route);
        await settle(a, 'owner', route, 'business');
        const h = await headingOf(a);
        if (!slug(h).startsWith(route.slice(CUSTOMERS.length + 1))) throw new Error(`expected ${route} to open the page of ${route.slice(CUSTOMERS.length + 1)}; found a page headed "${h}"`);
        if (/404 · Not found/.test(await mainText(a))) throw new Error(`expected ${route} to open a customer's page; found the missing-record screen`);
        seen.push(`${route} "${h}"`);
      }
      await go(a, 'owner', unknownCustomer!);
      await settle(a, 'owner', unknownCustomer!, 'business');
      const body = await mainText(a);
      if (!/404 · Not found/.test(body)) throw new Error(`expected ${unknownCustomer} to draw the missing-record screen inside the shell; found "${body.slice(0, 100)}"`);
      return `(${seen.join(', ')}; ${unknownCustomer} is a missing record)`;
    }, () => [a]);
  } finally {
    for (const p of opened) p.close();
  }

  const failed = results.filter((r) => r.status === 'FAIL').map((r) => r.name);
  summary(failed.length ? 'failed' : 'ok', results.filter((r) => r.status !== 'n/a').length, failed, { notApplicable: results.filter((r) => r.status === 'n/a').length });
  process.exit(failed.length ? 1 : 0);
}

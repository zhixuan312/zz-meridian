/**
 * The deep-DOM fixture pages: plain HTML with custom elements defined inline, each right except for one planted defect.
 *
 * A page has an `h1`, a `lang` and a `main`, an opaque ground and no other defect, so a suite that fails it fails it for
 * the planted reason alone. Every page renders the same in both colour schemes. `PAGES` maps a route to its HTML; the
 * server answers any other route with `CLEAN`, a page with no shadow root at all.
 *
 * The cases, each as a broken page and a corrected one (see README.md for the table):
 *   deep-clipped, deep-unnamed, deep-target, deep-contrast, deep-alpha   a defect in nested open roots
 *   deep-ringless, deep-ring-ancestor, deep-decorative-border            focus rings
 *   deep-dead-control                                                    a press that changes nothing
 *   deep-shift-tab                                                       a control only Shift+Tab reaches
 *   deep-closed, deep-undefined                                          content the suites cannot enter
 *   nav-*                                                                pages for scripts/navigate.ts
 */

const BASE_CSS = `
  html, body { margin: 0; background: #ffffff; color: #1a1a1a; font: 16px/1.5 system-ui, sans-serif; }
  main { padding: 16px; }
  x-outer, x-inner, x-box, x-card, x-ring, x-sealed, x-ghost, x-mid { display: block; }
  button { min-width: 44px; min-height: 44px; font: inherit; }
`;

type Options = { css?: string; body: string; script?: string };

/** A deep page: the heading and landmark, the shared style, then the case. */
function deep(title: string, { css = '', body, script = '' }: Options): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>${BASE_CSS}${css}</style></head>
<body>
<main>
<h1>${title}</h1>
${body}
</main>
<script>
${script}
</script>
</body></html>`;
}

/** Defines `tag` with an open (or closed) shadow root holding `html` and `style`. */
const define = (tag: string, html: string, style = '', mode: 'open' | 'closed' = 'open', extra = '') =>
  `customElements.define(${JSON.stringify(tag)}, class extends HTMLElement { constructor() { super(); const root = this.attachShadow({ mode: ${JSON.stringify(mode)} }); root.innerHTML = ${JSON.stringify(`<style>:host { display: block; } button { min-width: 44px; min-height: 44px; font: inherit; } ${style}</style>${html}`)}; ${extra} } });`;

/**
 * A host shows a ring while focus is inside it. The cases that are not about rings use it, so a suite that stops at the
 * host (`document.activeElement` is the host, not the control) still finds the ring it expects there and the only
 * defect on the page is the planted one.
 */
const HOST_RING = ':host(:focus-within) { outline: 3px solid #0a58ca; outline-offset: 2px; }';

/** Two open roots nested: x-outer holds x-inner, which holds `inner`. `innerStyle` styles the inner root. */
const nested = (inner: string, innerStyle: string, outerStyle = HOST_RING) =>
  `${define('x-inner', inner, innerStyle)}\n${define('x-outer', '<section><x-inner></x-inner></section>', outerStyle)}`;

// ---- a defect in nested open roots ----

const CLIP = '.label { width: 120px; overflow: hidden; white-space: nowrap; }';
const LABEL = '<div class="label">Quarterly revenue by region and segment</div>';

const UNNAMED = 'button.icon { width: 44px; height: 44px; }';
const ICON = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2"/></svg>';

const SMALL = 'button.tiny { width: 24px; height: 24px; min-width: 0; min-height: 0; padding: 0; }';
const BIG = 'button.tiny { width: 44px; height: 44px; }';

const FAINT = 'p { margin: 0; color: #9a9a9a; }';
const DARK = 'p { margin: 0; color: #404040; }';

// A dark alpha ground on the host, a transparent layer between, and the text on the layer: the ground the text sits on
// is the host's, composited over the page, and only a measurement that steps from the root to its host can find it.
const ALPHA_HOST = 'x-panel { display: block; padding: 16px; background: rgba(0, 0, 0, 0.85); }';
const alpha = (colour: string) =>
  define('x-panel', `<div class="layer"><p class="note">Settlement is due on the first working day.</p></div>`, `.layer { background: transparent; } .note { margin: 0; color: ${colour}; }`);

// ---- focus rings ----

const RINGLESS_SHADOW = 'button { outline: none; } button:focus, button:focus-visible { outline: none; box-shadow: none; }';
const RING_OWN = 'button { outline: none; } button:focus-visible { outline: 3px solid #0a58ca; outline-offset: 2px; }';
const RING_ANCESTOR = '.frame { padding: 4px; border-radius: 4px; } .frame:focus-within { outline: 3px solid #0a58ca; outline-offset: 2px; } button { outline: none; }';

const DECORATIVE = 'button.deco { outline: none; border: 2px solid #0a58ca; box-shadow: 0 0 0 2px #0a58ca; background: #ffffff; }';
const DECORATIVE_FIXED = `${DECORATIVE} button.deco:focus-visible { outline: 3px solid #b3261e; outline-offset: 4px; }`;

// ---- a press that changes nothing ----

const SAVE = '<div class="actions"><button type="button" class="save">Save</button><p class="status" aria-live="polite"></p></div>';
const SAVE_WIRED = `this.shadowRoot.querySelector('.save').addEventListener('click', () => { this.shadowRoot.querySelector('.status').textContent = 'Saved'; });`;

// ---- content the suites cannot enter ----

const SEALED_HTML = '<p class="sealed">Totals are computed by the sealed component.</p>';

export const PAGES: Record<string, string> = {
  '/deep-clipped': deep('Clipped label', { body: '<x-outer></x-outer>', script: nested(LABEL, CLIP) }),
  '/deep-clipped-fixed': deep('Clipped label, corrected', { body: '<x-outer></x-outer>', script: nested(LABEL, `${CLIP} .label { text-overflow: ellipsis; }`) }),

  '/deep-unnamed': deep('Unnamed control', { body: '<x-outer></x-outer>', script: nested(`<button type="button" class="icon">${ICON}</button>`, UNNAMED) }),
  '/deep-unnamed-fixed': deep('Unnamed control, corrected', { body: '<x-outer></x-outer>', script: nested(`<button type="button" class="icon" aria-label="Close">${ICON}</button>`, UNNAMED) }),

  '/deep-target': deep('Small target', { body: '<x-outer></x-outer>', script: nested('<button type="button" class="tiny">OK</button>', SMALL) }),
  '/deep-target-fixed': deep('Small target, corrected', { body: '<x-outer></x-outer>', script: nested('<button type="button" class="tiny">OK</button>', BIG) }),

  '/deep-contrast': deep('Low contrast', { body: '<x-outer></x-outer>', script: nested('<p>Quarterly figures are final.</p>', FAINT) }),
  '/deep-contrast-fixed': deep('Low contrast, corrected', { body: '<x-outer></x-outer>', script: nested('<p>Quarterly figures are final.</p>', DARK) }),

  '/deep-alpha': deep('Text on an alpha ground', { css: ALPHA_HOST, body: '<x-panel></x-panel>', script: alpha('#555555') }),
  '/deep-alpha-fixed': deep('Text on an alpha ground, corrected', { css: ALPHA_HOST, body: '<x-panel></x-panel>', script: alpha('#ffffff') }),

  // ---- focus rings ----
  '/deep-ringless': deep('Ringless control', { body: '<x-ring></x-ring>', script: define('x-ring', '<button type="button">Run</button>', RINGLESS_SHADOW) }),
  '/deep-ringless-fixed': deep('Ringless control, corrected', { body: '<x-ring></x-ring>', script: define('x-ring', '<button type="button">Run</button>', RING_OWN) }),
  '/deep-ring-ancestor': deep('Ring on an ancestor', { body: '<x-ring></x-ring>', script: define('x-ring', '<div class="frame"><button type="button">Run</button></div>', RING_ANCESTOR) }),
  '/deep-decorative-border': deep('Decorative border', { css: DECORATIVE, body: '<button type="button" class="deco">Export</button>' }),
  '/deep-decorative-border-fixed': deep('Decorative border, corrected', { css: DECORATIVE_FIXED, body: '<button type="button" class="deco">Export</button>' }),

  // ---- a press that changes nothing ----
  '/deep-dead-control': deep('Dead control', { body: '<x-card></x-card>', script: define('x-card', SAVE) }),
  '/deep-dead-control-fixed': deep('Dead control, corrected', { body: '<x-card></x-card>', script: define('x-card', SAVE, '', 'open', SAVE_WIRED) }),

  // ---- a control only Shift+Tab reaches ----
  // The first button sends a forward Tab past the middle one (inside an open root) to the last; Shift+Tab from the last
  // lands on the middle one. Walking forward alone never reaches it.
  '/deep-shift-tab': deep('Reached only backwards', {
    body: '<button type="button" id="first">First</button><x-mid></x-mid><button type="button" id="last">Last</button>',
    script: `${define('x-mid', '<button type="button">Middle</button>', HOST_RING)}
document.getElementById('first').addEventListener('keydown', (e) => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); document.getElementById('last').focus(); } });`,
  }),
  '/deep-shift-tab-fixed': deep('Reached only backwards, corrected', {
    body: '<button type="button" id="first">First</button><x-mid></x-mid><button type="button" id="last">Last</button>',
    script: define('x-mid', '<button type="button">Middle</button>', HOST_RING),
  }),

  // ---- content the suites cannot enter ----
  '/deep-closed': deep('Closed root', { body: '<x-sealed></x-sealed>', script: define('x-sealed', SEALED_HTML, '', 'closed') }),
  '/deep-closed-fixed': deep('Closed root, corrected', { body: '<x-sealed></x-sealed>', script: define('x-sealed', SEALED_HTML) }),
  '/deep-undefined': deep('Undefined element', { body: '<x-ghost>Loading the ledger</x-ghost>' }),
  '/deep-undefined-fixed': deep('Undefined element, corrected', { body: '<x-ghost></x-ghost>', script: define('x-ghost', '<p>The ledger is loaded.</p>') }),

  // ---- the helper's own page: nested roots, a slot, a closed root ----
  '/helper': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Helper</title></head>
<body>
<h1>Helper</h1>
<div id="plain"><span id="s1">plain</span></div>
<x-outer id="outer"><p id="slotted" slot="main">slotted into the outer root</p></x-outer>
<x-closed id="closed"></x-closed>
<input id="light-input" aria-label="Light input">
<script>
customElements.define('x-inner', class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = '<div id="i-div"><button id="i-btn">Inner</button><span id="i-span" class="dup">inner</span></div>'; } });
customElements.define('x-outer', class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = '<section id="o-section"><slot name="main"></slot><x-inner id="inner"></x-inner></section><button id="o-btn" class="dup">Outer</button>'; } });
customElements.define('x-closed', class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'closed' }).innerHTML = '<b id="hidden-inside">sealed</b>'; } });
</script>
</body></html>`,
};

/** Any other route: light DOM only, one heading, no control, so every suite passes it. */
export const CLEAN = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Clean page</title>
<style>${BASE_CSS}</style></head>
<body><main><h1>Clean page</h1><p>Nothing on this page is wrong.</p></main></body></html>`;

// ---- navigation pages for scripts/navigate.ts, on the readiness fixtures' skeleton ----

/** The rail routes, in rail order. */
export const NAV: [string, string][] = [['/nav-home', 'Home'], ['/nav-root-target', 'Root target'], ['/nav-missing-target', 'Missing target'], ['/nav-multi', 'Several matches']];
const links = NAV.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('');
const TABLE = '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Rows</td></tr></tbody></table>';

/** The readiness skeleton: a rail from 1024px up and a drawer under it, with controls sized for a phone. */
const nav = (title: string, main: string, script = ''): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  html, body { background: #ffffff; color: #1a1a1a; }
  body { margin: 0; font: 16px system-ui; display: flex; min-height: 100vh; }
  aside { width: 240px; padding: 16px; border-right: 1px solid #888888; }
  main { flex: 1; padding: 16px; }
  [role="dialog"] { position: fixed; inset: 0 auto 0 0; width: 240px; padding: 16px; background: #ffffff; }
  [role="dialog"][hidden] { display: none; }
  button { min-width: 44px; min-height: 44px; }
  nav a { display: inline-block; min-height: 44px; line-height: 44px; }
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
const ROOT_TOGGLE = define('x-toggle', '<button type="button" class="root-toggle" aria-pressed="false">Toggle</button>', 'button { min-width: 44px; min-height: 44px; }', 'open',
  `const b = root.querySelector('button'); b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));`);
const PICK = `Array.from(document.querySelectorAll('button.pick')).forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));`;

export const NAV_PAGES: Record<string, string> = {
  '/nav-home': nav('Home', `${TOGGLE}${TABLE}`, WIRE),
  // The control is inside an open root: a document-level query cannot find it.
  '/nav-root-target': nav('Root target', `<x-toggle></x-toggle>${TABLE}`, ROOT_TOGGLE),
  // The mapping names a control the page does not have.
  '/nav-missing-target': nav('Missing target', `${TOGGLE}${TABLE}`, WIRE),
  // Two elements match the mapping's control: the first is hidden, the second works.
  '/nav-multi': nav('Several matches', `<button class="pick" aria-pressed="false" hidden>Hidden</button><button class="pick" aria-pressed="false">Toggle</button>${TABLE}`, PICK),
};

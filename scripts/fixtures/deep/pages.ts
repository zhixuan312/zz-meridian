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
 *   deep-tap                                                             a phone tap on a control inside a root (vitals)
 *   svg-contrast, svg-label-on-bar-dark, svg-text-read                   an SVG's text, read by its fill on what is behind it
 *   truncated                                                            text cut with an ellipsis and kept nowhere
 *   overlap-text, overlap-line, overlap-none                             two things drawn in the same place, and five shapes that are not
 *   late-unnamed, late-dead-control                                      a control that arrives after a fixed wait has ended
 *   slow-load                                                            a page whose load event comes late (chrome.ts)
 *   nav-*                                                                pages for scripts/navigate.ts
 */

const BASE_CSS = `
  html, body { margin: 0; background: #ffffff; color: #1a1a1a; font: 16px/1.5 system-ui, sans-serif; }
  main { padding: 16px; }
  x-outer, x-inner, x-box, x-card, x-ring, x-sealed, x-ghost, x-mid, x-bar { display: block; }
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

// ---- what the audit could not see, or never asked ----
// In the light DOM on purpose: these are about what the audit measures, not about how far into a root it reaches.

/** A small chart: an SVG with a name, so the only thing wrong with it is what is planted inside. */
const chart = (inner: string) => `<svg width="300" height="60" viewBox="0 0 300 60" role="img" aria-label="Requests per day">${inner}</svg>`;
const BAR = '<rect x="0" y="8" width="220" height="32" fill="#1f2a44" style="pointer-events: none"/>';
const CUT = '.cut { width: 140px; margin: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }';
const ACCOUNT = 'acct_9f27c4d1e8b34a6d, Northwind Trading';
const RULE = (y: number) => `<polyline points="0,${y} 300,${y}" fill="none" stroke="#1a1a1a" stroke-width="1.5" style="pointer-events: none"/>`;
const CAPTION = '<text x="8" y="29" fill="#1a1a1a" font-size="14">Requests per day</text>';
/** The shell's late control: a slot in the page from the first byte, hidden until `ms` have passed, then holding `html`. */
const SLOT = '<span data-assistant-slot aria-hidden="true" style="display: inline-block; min-width: 44px; min-height: 44px"></span><p class="status" aria-live="polite"></p>';
const arrive = (ms: number, html: string, then = '') =>
  `setTimeout(() => { const slot = document.querySelector('[data-assistant-slot]'); slot.removeAttribute('aria-hidden'); slot.innerHTML = ${JSON.stringify(html)}; ${then} }, ${ms});`;

export const PAGES: Record<string, string> = {
  '/deep-clipped': deep('Clipped label', { body: '<x-outer></x-outer>', script: nested(LABEL, CLIP) }),
  // Corrected means cut on purpose and kept whole: an ellipsis, and the whole label in its title (the audit asks for both).
  '/deep-clipped-fixed': deep('Clipped label, corrected', { body: '<x-outer></x-outer>', script: nested(LABEL.replace('class="label"', 'class="label" title="Quarterly revenue by region and segment"'), `${CLIP} .label { text-overflow: ellipsis; }`) }),

  '/deep-unnamed': deep('Unnamed control', { body: '<x-outer></x-outer>', script: nested(`<button type="button" class="icon">${ICON}</button>`, UNNAMED) }),
  '/deep-unnamed-fixed': deep('Unnamed control, corrected', { body: '<x-outer></x-outer>', script: nested(`<button type="button" class="icon" aria-label="Close">${ICON}</button>`, UNNAMED) }),

  // A web component's button named by the text slotted into it, as most design-system buttons are: the name lives in
  // the light DOM, the button in the root, so a name read from the button's own text alone finds nothing.
  '/deep-slotted-name': deep('Slotted name', { body: '<x-act>Export</x-act>', script: define('x-act', '<button type="button"><slot></slot></button>', HOST_RING) }),
  '/deep-slotted-name-empty': deep('Slotted name, empty', { body: '<x-act></x-act>', script: define('x-act', `<button type="button" class="icon"><slot></slot>${ICON}</button>`, `${HOST_RING} ${UNNAMED}`) }),

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

  // ---- a tap the vitals measure: the Alerts button sits inside an open root, and pressing it opens a panel there ----
  '/deep-tap': deep('Tap inside a root', {
    body: '<x-bar></x-bar>',
    script: define('x-bar', '<button type="button" aria-label="Alerts">!</button><p class="panel" hidden>No new alerts</p>', HOST_RING, 'open', `this.shadowRoot.querySelector('button').addEventListener('click', () => { this.shadowRoot.querySelector('.panel').hidden = false; });`),
  }),

  // ---- a page whose load event waits for an image the server answers late (see server.ts) ----
  '/slow-load': deep('Slow load', { body: '<img src="/slow-asset" alt="" width="1" height="1">' }),

  // ---- an SVG's text: painted by `fill`, on whatever the SVG painted behind it ----
  '/svg-contrast': deep('Faint chart label', { body: chart('<text x="8" y="29" fill="#9a9a9a" font-size="14">Requests per day</text>') }),
  // Dark text on a dark bar. Measured against the page instead of the bar it would pass, and the white label of the
  // page below would fail: both answers are wrong, so the pair proves the bar is what is read. The bar ignores the
  // pointer, as chart marks often do, so only a geometric test finds it.
  '/svg-label-on-bar-dark': deep('Dark label on a bar', { body: chart(`${BAR}<text x="8" y="29" fill="#1a1a1a" font-size="14">1,204 requests</text>`) }),
  // Both corrected, on one page: a label dark enough on the page, and a white label on the dark bar.
  '/svg-text-read': deep('Chart labels that read', { body: `${chart('<text x="8" y="29" fill="#595959" font-size="14">Requests per day</text>')}${chart(`${BAR}<text x="8" y="29" fill="#ffffff" font-size="14">1,204 requests</text>`)}` }),

  // ---- text cut with an ellipsis, with the whole of it kept nowhere ----
  '/truncated': deep('Cut value', { css: CUT, body: `<p class="cut">${ACCOUNT}</p>` }),
  '/truncated-fixed': deep('Cut value, corrected', { css: CUT, body: `<p class="cut" title="${ACCOUNT}">${ACCOUNT}</p>` }),

  // ---- two things in the same place ----
  '/overlap-text': deep('Text over text', { css: '.figure { margin-top: -32px; }', body: '<p>Requests per day</p><p class="figure">1,204 in the last hour</p>' }),
  '/overlap-line': deep('A line through a caption', { body: chart(`${RULE(24)}${CAPTION}`) }),
  // What is not a collision, on one page. The two corrected twins: paragraphs with their own place, and a rule under
  // its caption. And the three shapes the first sweep of real pages misreported, kept so the rules cannot widen again:
  // a clamp, whose hidden lines still have boxes over whatever follows (ten reports on one page); a line below the fold
  // of a clipped list, which by its geometry lies on the text under the list (an icon scrolled out of a palette
  // "crossed" the heading beneath it); and the text of a closed disclosure, which has boxes and is not drawn.
  '/overlap-none': deep('Nothing in the same place', {
    css: '.clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; width: 220px; margin: 0; } .more { margin: 4px 0 16px; } .list { height: 40px; overflow: hidden; } .list svg { display: block; } p.under { margin: 0 0 16px; } summary { min-height: 44px; } pre { margin: 0; } p.after { margin: 0; }',
    body: `<p>Requests per day</p><p>1,204 in the last hour</p>
${chart(`${RULE(50)}${CAPTION}`)}
<p class="clamp">A dashboard built on Meridian starts from one page and one table, and grows a card at a time until every question has its place.</p><p class="more">Read</p>
<div class="list"><svg width="300" height="120" viewBox="0 0 300 120" role="img" aria-label="Rows"><polyline points="0,52 300,52" fill="none" stroke="#1a1a1a" stroke-width="1.5"/></svg></div><p class="under">Rows per page</p>
<details><summary>Structured</summary><pre>{\n  "view": "proposal",\n  "title": "Raise the rate limit",\n  "state": "pending"\n}</pre></details><p class="after">What the view tells the model, every time.</p>`,
  }),

  // ---- a control that arrives after a fixed wait has ended (the shell's assistant slot) ----
  '/late-unnamed': deep('Late control', { css: UNNAMED, body: SLOT, script: arrive(2600, `<button type="button" class="icon">${ICON}</button>`) }),
  '/late-unnamed-fixed': deep('Late control, corrected', { css: UNNAMED, body: SLOT, script: arrive(2600, `<button type="button" class="icon" aria-label="Ask">${ICON}</button>`) }),
  '/late-dead-control': deep('Late dead control', { body: SLOT, script: arrive(3600, '<button type="button">Ask</button>') }),
  '/late-dead-control-fixed': deep('Late dead control, corrected', { body: SLOT, script: arrive(3600, '<button type="button">Ask</button>', `slot.querySelector('button').addEventListener('click', () => { document.querySelector('.status').textContent = 'Asked'; });`) }),

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
export const NAV: [string, string][] = [['/nav-home', 'Home'], ['/nav-root-target', 'Root target'], ['/nav-missing-target', 'Missing target'], ['/nav-multi', 'Several matches'], ['/nav-root-hydrated', 'Hydrated root']];
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
  // As a Next page: React marks the elements it rendered once it hydrates (light DOM only), and the control lives in an
  // open root React never renders into, so readiness is its host's.
  '/nav-root-hydrated': nav('Hydrated root', `<x-toggle></x-toggle>${TABLE}`, `${ROOT_TOGGLE}\n  self.__next_f = [];\n  for (const el of document.querySelectorAll('*')) el.__reactProps$fixture = {};`),
  '/nav-multi': nav('Several matches', `<button class="pick" aria-pressed="false" hidden>Hidden</button><button class="pick" aria-pressed="false">Toggle</button>${TABLE}`, PICK),
};

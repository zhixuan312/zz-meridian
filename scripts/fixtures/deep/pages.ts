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
 *   deep-tap, deep-shifts                                                a phone tap on a control inside a root (vitals), and a page that moves after load (vitals)
 *   svg-contrast, svg-label-on-bar-dark, svg-text-read                   an SVG's text, read by its fill on what is behind it
 *   truncated                                                            text cut with an ellipsis and kept nowhere
 *   overlap-text, overlap-line, overlap-none                             two things drawn in the same place, and five shapes that are not
 *   overlap-cv-auto, overlap-cv-hidden                                   what a content-visibility subtree draws, and what it does not
 *   presses-relative-link                                                a relative link that answers 404
 *   late-unnamed, late-dead-control                                      a control that arrives after a fixed wait has ended
 *   late-answer                                                          a control whose answer comes 1.5 s after its press
 *   presses-late-replace                                                 a document replaced after the presses' look has closed
 *   presses-controls-move                                                controls that are drawn in another order on a later load
 *   presses-live-name                                                    a control whose name gains a count on a later load
 *   sideways-*, strip, spill, double-scroller, heading-skip, empty-region, moved-page, drops-query, page-error   the rules of the standard that no page made fire
 *   disclosure                                                          a control in a closed disclosure, which both browser suites open
 *   slow-load                                                            a page whose load event comes late (chrome.ts)
 *   drawn-missing                                                        the not-found screen drawn on a page that answered 200
 *   sideways-document, presses-*, keyboard-*, vitals-*, hangs            every rule no page had made fire (tests/cli-check-rule-pairs.test.ts)
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

const LINK = 'a { display: inline-block; min-width: 44px; min-height: 44px; }';

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
  // A name given as `aria-labelledby` is the text of what it names. An id that names nothing names no control, and the
  // attribute's own text is not a name — the same lookup `label[for]` gets.
  '/deep-unnamed-labelledby': deep('Control named by an id that is not there', { body: '<x-outer></x-outer>', script: nested(`<button type="button" class="icon" aria-labelledby="no-such-heading">${ICON}</button>`, UNNAMED) }),
  '/deep-unnamed-labelledby-fixed': deep('Control named by an id that is there', { body: '<x-outer></x-outer>', script: nested(`<span id="close-heading" hidden>Close</span><button type="button" class="icon" aria-labelledby="close-heading">${ICON}</button>`, UNNAMED) }),

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
  // A banner inserted above the content 1.2 s after load, by no input: the card of 360px shifts down 300px on a 390px phone, a CLS well over 0.1.
  // The Alerts button is a tap vitals finds, so the run still prints a nonzero `taps:` beside `moved most:`.
  '/deep-shifts': deep('Content that moves after load', {
    css: '.card { height: 360px; background: #e8e8e8; padding: 8px; box-sizing: border-box; } .banner { height: 300px; background: #cfd8ff; }',
    body: '<div class="slot"></div><div class="card"><p>Requests per day</p><x-bar></x-bar></div>',
    script: `${define('x-bar', '<button type="button" aria-label="Alerts">!</button>', HOST_RING)}\nsetTimeout(() => { const b = document.createElement('div'); b.className = 'banner'; document.querySelector('.slot').append(b); }, 1200);`,
  }),

  // ---- a page whose load event waits for an image the server answers late (see server.ts) ----
  '/slow-load': deep('Slow load', { body: '<img src="/slow-asset" alt="" width="1" height="1">' }),

  // A page that stops answering. The script blocks the main thread longer than `scripts/lib/chrome.ts` gives a protocol
  // command, so every measurement of this page times out — and the audit has to say so for this page and go on to the
  // next, rather than ending the run and leaving the other 183 routes unmeasured. Only under 350 px, so the pair of
  // 320 px runs pays the thirty seconds and the other widths, 390 among them, prove the page is otherwise clean: at
  // 500 px both phone widths hung, four runs of forty seconds, and the case ran past its 180 s on the release runner.
  '/deep-hangs': deep('A page that stops answering', {
    body: '<p>Quarterly revenue held steady across every region and segment.</p>',
    script: `if (matchMedia('(max-width: 350px)').matches) { const until = Date.now() + 40000; while (Date.now() < until) {} }`,
  }),

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
  // A title that does not hold the cut text keeps none of it: the pointer reaches "Orders" where "acct_9f27…, Northwind
  // Trading" was, which is the same as no title at all.
  '/truncated-titled-wrong': deep('Cut value, titled with something else', { css: CUT, body: `<p class="cut" title="Orders">${ACCOUNT}</p>` }),

  // ---- two things in the same place ----
  '/overlap-text': deep('Text over text', { css: '.figure { margin-top: -32px; }', body: '<p>Requests per day</p><p class="figure">1,204 in the last hour</p>' }),
  '/overlap-line': deep('A line through a caption', { body: chart(`${RULE(24)}${CAPTION}`) }),
  // What is not a collision, on one page. The two corrected twins: paragraphs with their own place, and a rule under
  // its caption. And the three shapes the first sweep of real pages misreported, kept so the rules cannot widen again:
  // a clamp, whose hidden lines still have boxes over whatever follows (ten reports on one page); a line below the fold
  // of a clipped list, which by its geometry lies on the text under the list (an icon scrolled out of a palette
  // "crossed" the heading beneath it); and the text of a closed disclosure, which has boxes and is not drawn.
  '/overlap-none': deep('Nothing in the same place', {
    // The block of structured text wraps: at 320px, the narrowest width the audit measures, a line of it ran 40px past its box.
    css: 'pre { white-space: pre-wrap; } .clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; width: 220px; margin: 0; } .more { margin: 4px 0 16px; } .list { height: 40px; overflow: hidden; } .list svg { display: block; } p.under { margin: 0 0 16px; } summary { min-height: 44px; } pre { margin: 0; } p.after { margin: 0; }',
    body: `<p>Requests per day</p><p>1,204 in the last hour</p>
${chart(`${RULE(50)}${CAPTION}`)}
<p class="clamp">A dashboard built on Meridian starts from one page and one table, and grows a card at a time until every question has its place.</p><p class="more">Read</p>
<div class="list"><svg width="300" height="120" viewBox="0 0 300 120" role="img" aria-label="Rows"><polyline points="0,52 300,52" fill="none" stroke="#1a1a1a" stroke-width="1.5"/></svg></div><p class="under">Rows per page</p>
<details><summary>Structured</summary><pre>{\n  "view": "proposal",\n  "title": "Raise the rate limit",\n  "state": "pending"\n}</pre></details><p class="after">What the view tells the model, every time.</p>`,
  }),

  // ---- content-visibility: the audit measures what a page draws ----
  // Below the fold at every width, a section the browser has not laid out stands in at its placeholder's height (40px);
  // measured as it is, its two lines lie on the paragraph that follows it. Drawn, the section is as tall as its content and
  // nothing overlaps: the page is right, and an audit that reads the skipped layout reports a collision that is not there.
  '/overlap-cv-auto': deep('Drawn, not skipped', {
    css: '.gap { height: 2400px; } .cv { content-visibility: auto; contain-intrinsic-size: auto 40px; } .cv p, p.after { margin: 0 0 16px; }',
    body: '<div class="gap"></div><section class="cv"><p>Requests per day</p><p>1,204 in the last hour</p><p>Errors per day</p></section><p class="after">What the view tells the model, every time.</p>',
  }),
  // Text that does overlap, inside a subtree that is not drawn: content-visibility: hidden. Nothing to report.
  '/overlap-cv-hidden': deep('Not drawn', {
    css: '.cv { content-visibility: hidden; } .figure { margin-top: -32px; }',
    body: '<section class="cv"><p>Requests per day</p><p class="figure">1,204 in the last hour</p></section>',
  }),

  // ---- a link the presses follow as a browser does ----
  // Resolved against its page, `gone/testing.md` is `/gone/testing.md`, which the server answers 404.
  '/presses-relative-link': deep('Relative link to nowhere', { css: LINK, body: '<a href="gone/testing.md">Testing</a>' }),
  '/presses-relative-link-fixed': deep('Relative link, corrected', { css: LINK, body: '<a href="clean">Testing</a>' }),

  // ---- a control that arrives after a fixed wait has ended (the shell's assistant slot) ----
  '/late-unnamed': deep('Late control', { css: UNNAMED, body: SLOT, script: arrive(2600, `<button type="button" class="icon">${ICON}</button>`) }),
  '/late-unnamed-fixed': deep('Late control, corrected', { css: UNNAMED, body: SLOT, script: arrive(2600, `<button type="button" class="icon" aria-label="Ask">${ICON}</button>`) }),
  '/late-dead-control': deep('Late dead control', { body: SLOT, script: arrive(3600, '<button type="button">Ask</button>') }),
  '/late-dead-control-fixed': deep('Late dead control, corrected', { body: SLOT, script: arrive(3600, '<button type="button">Ask</button>', `slot.querySelector('button').addEventListener('click', () => { document.querySelector('.status').textContent = 'Asked'; });`) }),
  // A control whose answer comes about 1.5 s after the press, past the presses' first look at 600 ms: it is slow, not dead.
  // A press that answers at once, and a document that is replaced after the presses' look has closed: a team switch
  // that reloads once its request is accepted. Escape replaces it here, so the replacement lands, every run, between the
  // look and the suite's next read of the page. The second control is pressed on the new document.
  '/presses-late-replace': deep('Late replace', { body: '<button type="button" id="switch">Switch team</button><button type="button" id="other">Other</button><p class="status" aria-live="polite"></p>', script: `for (const id of ['switch', 'other']) document.getElementById(id).addEventListener('click', () => { document.querySelector('.status').textContent = id === 'switch' ? 'Switching' : 'Pressed'; }); document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.status').textContent === 'Switching') location.replace(location.href); });` }),
  // A page whose controls move between loads: the first load draws all four at once; every later one draws Reload and
  // Page 3 at once and the two row actions 3.2 s later (past the open's wait and the settle), as a table still loading on a busy machine does. A control found
  // again by its place in the walk is missing; found by what it is, it is there, once it has arrived.
  '/presses-controls-move': deep('Controls that move', { body: '<div class="list"></div><p class="status" aria-live="polite"></p>', script: `const first = !sessionStorage.getItem('moved'); sessionStorage.setItem('moved', '1'); const list = document.querySelector('.list'); const add = (label, act) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', act); list.append(b); }; const say = (t) => () => { document.querySelector('.status').textContent = t; }; const rows = () => { add('Edit Ada', say('Editing Ada')); add('Edit Grace', say('Editing Grace')); }; add('Reload', () => location.reload()); if (first) rows(); else setTimeout(rows, 3200); add('Page 3', say('Page 3'));` }),
  // A control whose name carries a count that a read fills in: "Alerts" on the first load, "Alerts, 3 new" on every later
  // one, as ShellTools reads when its alerts answer after the settle on one load and before it on the next (#66).
  '/presses-live-name': deep('Control whose name carries a count', { body: '<div class="tools"></div><p class="status" aria-live="polite"></p>', script: `const first = !sessionStorage.getItem('counted'); sessionStorage.setItem('counted', '1'); const tools = document.querySelector('.tools'); const add = (label, act) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', act); tools.append(b); }; add('Reload', () => location.reload()); add(first ? 'Alerts' : 'Alerts, 3 new', () => { document.querySelector('.status').textContent = 'Alerts open'; });` }),
  '/late-answer': deep('Late answer', { body: '<button type="button" id="ask">Ask</button><p class="status" aria-live="polite"></p>', script: `document.getElementById('ask').addEventListener('click', () => { setTimeout(() => { document.querySelector('.status').textContent = 'Answered'; }, 1500); });` }),

  // ---- the rules of the standard that no page had ever made fire ----
  // Light DOM, and about the page rather than about a root: a rule whose only evidence is that it has never reported
  // anything has been green in the one direction that matters, the direction where it passes. Each page is otherwise
  // clean — an h1, a landmark, an opaque ground, no control — so the planted defect is the only thing wrong with it.

  // A page that goes sideways. The card contract answers it with `hideBelow` on a column, a data page by filling its
  // canvas, and the region by fitting what it holds; the audit reports the three apart, so each has its own page.
  '/sideways-region': deep('Region that scrolls sideways', {
    css: '.rail { width: 300px; overflow: hidden; } .wide { width: 600px; }',
    body: '<div class="rail" data-scroll-region><div class="wide">Quarterly revenue by region and segment, with last year beside it</div></div>',
  }),
  '/sideways-region-fixed': deep('Region that scrolls sideways, corrected', {
    css: '.rail { width: 300px; overflow: hidden; } .wide { width: 300px; }',
    body: '<div class="rail" data-scroll-region><div class="wide">Quarterly revenue by region and segment, with last year beside it</div></div>',
  }),
  '/sideways-data-page': deep('Data page that does not fill its canvas', {
    css: '.canvas { width: 300px; overflow: hidden; } .page { width: 150px; }',
    body: '<div class="canvas" data-scroll-region><div class="page" data-page-width="data">Rows per page, and the requests behind them</div></div>',
  }),
  '/sideways-data-page-fixed': deep('Data page that fills its canvas', {
    css: '.canvas { width: 300px; overflow: hidden; } .page { width: 300px; }',
    body: '<div class="canvas" data-scroll-region><div class="page" data-page-width="data">Rows per page, and the requests behind them</div></div>',
  }),
  // The frame clips rather than scrolls, so the table is wider than what holds it and no scrollbar offers the rest.
  '/sideways-table': deep('Table wider than its frame', {
    css: '.frame { width: 240px; overflow: hidden; } table { width: 600px; border-collapse: collapse; } td, caption { text-align: left; }',
    body: '<div class="frame"><table><caption>Requests</caption><tbody><tr><td>Requests per day</td></tr></tbody></table></div>',
  }),
  '/sideways-table-fixed': deep('Table that fits its frame', {
    css: '.frame { width: 240px; overflow: hidden; } table { width: 240px; border-collapse: collapse; } td, caption { text-align: left; }',
    body: '<div class="frame"><table><caption>Requests</caption><tbody><tr><td>Requests per day</td></tr></tbody></table></div>',
  }),
  // A strip that scrolls sideways at a phone width hides its last items off the edge, where neither the page's scroll
  // nor a fade at the cut edge says they are: the reader has no way to reach them. The corrected twin wraps.
  '/strip': deep('Strip that scrolls sideways', {
    css: '.chips { display: flex; gap: 8px; max-width: 300px; overflow-x: auto; white-space: nowrap; } .chips span { flex: none; }',
    body: '<div class="chips"><span>Requests</span><span>Errors</span><span>Latency</span><span>Regions</span><span>Retries</span><span>Timeouts</span><span>Throughput</span></div>',
  }),
  '/strip-fixed': deep('Strip that wraps', {
    css: '.chips { display: flex; flex-wrap: wrap; gap: 8px; max-width: 300px; }',
    body: '<div class="chips"><span>Requests</span><span>Errors</span><span>Latency</span><span>Regions</span><span>Retries</span><span>Timeouts</span><span>Throughput</span></div>',
  }),
  // A figure too long for its grid column, in a box that does not clip: it is drawn over the cells beside it and past
  // its container's edge, while the cell's own scrollWidth is clean because the cell is as wide as the number. The
  // corrected twin lets the number break anywhere, so the track takes a share of the container.
  '/spill': deep('A figure past its box', {
    css: '.grid { display: grid; grid-template-columns: repeat(4, 1fr); width: 120px; } .grid p { margin: 0; }',
    body: '<div class="grid"><p class="figure">12345678901234567890</p><div></div><div></div><div></div></div>',
  }),
  '/spill-fixed': deep('A figure that breaks', {
    css: '.grid { display: grid; grid-template-columns: repeat(4, 1fr); width: 120px; } .grid p { margin: 0; overflow-wrap: anywhere; }',
    body: '<div class="grid"><p class="figure">12345678901234567890</p><div></div><div></div><div></div></div>',
  }),

  // A control inside a closed disclosure has a box and is not drawn: the keyboard suite tagged it and Tab never reached
  // it, and the presses suite found nothing at its centre. Both open the disclosure first, as a reader does. The
  // control answers, so a suite that reaches it passes (#82).
  '/disclosure': deep('A control in a closed disclosure', {
    css: 'summary { min-height: 44px; line-height: 44px; }',
    body: '<details><summary>More</summary><button type="button" id="act">Act</button><p class="status" aria-live="polite"></p></details>',
    script: `document.getElementById('act').addEventListener('click', () => { document.querySelector('.status').textContent = 'Acted'; });`,
  }),

  // A page with a second scroller: the content region may scroll, and anything else is a scrollbar to go looking for.
  // Each is 200px of box over 400px of content, which is over the 120px the rule asks a scroller to be.
  '/double-scroller': deep('Two scrollers', {
    css: '.log { height: 200px; overflow-y: auto; } .lines { height: 400px; }',
    body: '<div class="log" id="errors"><div class="lines">Requests per day, and the errors beside them</div></div><div class="log" id="slow"><div class="lines">The slowest paths of the day</div></div>',
  }),
  '/double-scroller-fixed': deep('One scroller', {
    css: '.log { height: 200px; overflow-y: auto; } .lines { height: 400px; }',
    body: '<div class="log" id="errors"><div class="lines">Requests per day, and the errors beside them</div></div>',
  }),

  // A heading two levels below the one before it, so the outline a screen reader reads has a hole in it.
  '/heading-skip': deep('Heading that skips a level', { body: '<h2>Requests</h2><h4>Errors</h4><p>What the day answered.</p>' }),
  '/heading-skip-fixed': deep('Headings that descend one at a time', { body: '<h2>Requests</h2><h3>Errors</h3><p>What the day answered.</p>' }),

  // The page's content region rendered nothing: a skeleton, a read that never arrived. Every rule above passes a page
  // with no content, so this is the case that has to say so rather than end the run with the standard's line over it.
  '/empty-region': deep('A region that rendered nothing', { body: '<div data-scroll-region></div>' }),
  '/empty-region-fixed': deep('A region that rendered its content', { body: '<div data-scroll-region><p>Every request of the day, by route.</p></div>' }),
  // The not-found screen drawn on a page that answered 200, as a record page inside a streamed shell draws it: a route
  // not declared missing that draws it was measured as something it is not, and one declared missing that does is right.
  '/drawn-missing': deep('This page isn’t here', { body: '<section data-missing-page><p>Nothing is at this address. Go back to the requests.</p></section>' }),

  // ---- every rule a suite judged that no page had made fire (tests/cli-check-rule-pairs.test.ts lists each with its pair) ----
  // A content row 600px wide in a page with no scroll region: the document itself scrolls sideways at a phone's width.
  '/sideways-document': deep('A row wider than the page', { css: '.row { width: 600px; height: 40px; background: #e8e8e8; }', body: '<div class="row"><p>Requests by route</p></div>' }),
  '/sideways-document-fixed': deep('A row wider than the page, corrected', { css: '.row { width: 600px; max-width: 100%; height: 40px; background: #e8e8e8; }', body: '<div class="row"><p>Requests by route</p></div>' }),
  // A link whose address is no URL at all (an unclosed IPv6 host): following it, a browser goes nowhere.
  '/presses-bad-url': deep('A link to no address', { body: '<p><a href="http://[docs">The guide</a></p>' }),
  '/presses-bad-url-fixed': deep('A link to no address, corrected', { body: '<p><a href="/docs">The guide</a></p>' }),
  // A control the first load draws and no later load does: after the Reload press opens the page again, Archive is
  // gone for good, unlike /presses-controls-move, whose controls come back late.
  '/presses-control-gone': deep('A control that leaves', { body: '<div class="list"></div><p class="status" aria-live="polite"></p>', script: `const first = !sessionStorage.getItem('gone'); sessionStorage.setItem('gone', '1'); const list = document.querySelector('.list'); const add = (label, act) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', act); list.append(b); }; add('Reload', () => location.reload()); if (first) add('Archive', () => { document.querySelector('.status').textContent = 'Archived'; });` }),
  // A control under a layer that takes the pointer: a press lands on the layer, never on the control.
  '/presses-covered': deep('A control under a layer', { css: '.wrap { position: relative; } .layer { position: absolute; inset: 0; background: rgb(255 255 255 / 0.6); }', body: '<div class="wrap"><button type="button" id="go">Refresh</button><div class="layer"></div></div><p class="status" aria-live="polite"></p>', script: `document.getElementById('go').addEventListener('click', () => { document.querySelector('.status').textContent = 'Refreshed'; });` }),
  '/presses-covered-fixed': deep('A control under a layer, corrected', { css: '.wrap { position: relative; } .layer { position: absolute; inset: 0; background: rgb(255 255 255 / 0.6); pointer-events: none; }', body: '<div class="wrap"><button type="button" id="go">Refresh</button><div class="layer"></div></div><p class="status" aria-live="polite"></p>', script: `document.getElementById('go').addEventListener('click', () => { document.querySelector('.status').textContent = 'Refreshed'; });` }),
  // A page that stops answering at every width, past the 30 s a protocol command is given: the walk names it and goes on.
  '/hangs': deep('A page that stops answering everywhere', { body: '<p>Quarterly revenue held steady across every region.</p><button type="button">Export</button>', script: `const until = Date.now() + 40000; while (Date.now() < until) {}` }),
  // A link under a bar fixed over the top of the page: focus lands on it where the bar is drawn.
  '/keyboard-hidden': deep('A link under the bar', { css: '.bar { position: fixed; top: 0; left: 0; right: 0; height: 160px; background: #f0f0f0; z-index: 1; } main { padding-top: 40px; }', body: '<div class="bar"></div><p><a href="/requests">Every request</a></p>' }),
  '/keyboard-hidden-fixed': deep('A link under the bar, corrected', { css: '.bar { position: fixed; top: 0; left: 0; right: 0; height: 160px; background: #f0f0f0; z-index: 1; } main { padding-top: 180px; }', body: '<div class="bar"></div><p><a href="/requests">Every request</a></p>' }),
  // Shift+Tab from the last control jumps to the first, past the middle one: the way back is not the way forward.
  '/keyboard-reverse': deep('A way back that skips', { body: '<button type="button" id="a">First</button><button type="button" id="b">Middle</button><button type="button" id="c">Last</button>', script: `document.getElementById('c').addEventListener('keydown', (e) => { if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); document.getElementById('a').focus(); } });` }),
  '/keyboard-reverse-fixed': deep('A way back that skips, corrected', { body: '<button type="button" id="a">First</button><button type="button" id="b">Middle</button><button type="button" id="c">Last</button>' }),
  // A page with a skip link that is not its first stop: a control before it, so the blocks it bypasses come first.
  '/keyboard-skip-link': deep('A skip link that comes second', { body: '<button type="button">Menu</button><p><a href="#content">Skip to content</a></p><section id="content"><p>The page itself.</p></section>' }),
  '/keyboard-skip-link-fixed': deep('A skip link that comes second, corrected', { body: '<p><a href="#content">Skip to content</a></p><button type="button">Menu</button><section id="content"><p>The page itself.</p></section>' }),
  // A control that leaves the page when it takes focus: tagged at the start of the walk, gone by its end.
  '/keyboard-control-gone': deep('A control that leaves on focus', { body: '<button type="button" id="first">Open</button><button type="button" id="gone">Dismiss</button><button type="button">Close</button>', script: `document.getElementById('gone').addEventListener('focus', (e) => e.target.remove());` }),
  '/keyboard-control-gone-fixed': deep('A control that leaves on focus, corrected', { body: '<button type="button" id="first">Open</button><button type="button" id="gone">Dismiss</button><button type="button">Close</button>', script: `document.getElementById('gone').addEventListener('focus', (e) => { e.target.textContent = 'Dismiss now'; });` }),
  // The vitals' floors, each on its own: the largest text painted 3.4 s after load, a tap that blocks the thread for
  // 400 ms, a tap that blocks it for 90 ms (a long frame, inside the INP floor), and the banner of /deep-shifts with its
  // space held from the start. The Alerts button is the tap vitals presses.
  '/vitals-late-paint': deep('The largest text arrives late', { css: '.hero { min-height: 160px; font-size: 40px; line-height: 1.2; }', body: '<div class="hero"></div><button type="button" aria-label="Alerts">!</button>', script: `setTimeout(() => { document.querySelector('.hero').textContent = 'Revenue held steady in every region this quarter'; }, 3400);` }),
  '/vitals-late-paint-fixed': deep('The largest text arrives late, corrected', { css: '.hero { min-height: 160px; font-size: 40px; line-height: 1.2; }', body: '<div class="hero">Revenue held steady in every region this quarter</div><button type="button" aria-label="Alerts">!</button>' }),
  '/vitals-slow-tap': deep('A slow tap', { body: '<button type="button" aria-label="Alerts" id="t">!</button><p class="status"></p>', script: `document.getElementById('t').addEventListener('click', () => { const until = performance.now() + 400; while (performance.now() < until) {} document.querySelector('.status').textContent = 'No new alerts'; });` }),
  '/vitals-slow-tap-fixed': deep('A slow tap, corrected', { body: '<button type="button" aria-label="Alerts" id="t">!</button><p class="status"></p>', script: `document.getElementById('t').addEventListener('click', () => { document.querySelector('.status').textContent = 'No new alerts'; });` }),
  '/vitals-dropped-frame': deep('A tap that holds a frame', { body: '<button type="button" aria-label="Alerts" id="t">!</button><p class="status"></p>', script: `document.getElementById('t').addEventListener('click', () => { const until = performance.now() + 90; while (performance.now() < until) {} document.querySelector('.status').textContent = 'No new alerts'; });` }),
  '/vitals-dropped-frame-fixed': deep('A tap that holds a frame, corrected', { body: '<button type="button" aria-label="Alerts" id="t">!</button><p class="status"></p>', script: `document.getElementById('t').addEventListener('click', () => { document.querySelector('.status').textContent = 'No new alerts'; });` }),
  '/vitals-shifts-fixed': deep('Content that moves after load, corrected', {
    css: '.card { height: 360px; background: #e8e8e8; padding: 8px; box-sizing: border-box; } .slot { height: 300px; } .banner { height: 300px; background: #cfd8ff; }',
    body: '<div class="slot"></div><div class="card"><p>Requests per day</p><button type="button" aria-label="Alerts">!</button></div>',
    script: `setTimeout(() => { const b = document.createElement('div'); b.className = 'banner'; document.querySelector('.slot').append(b); }, 1200);`,
  }),

  // The two address rules. The audit asks for a route and measures what came back, and both halves of that are worth a
  // case: a route that redirected somewhere else, and one whose address came back without the parameters it was asked
  // for — which would otherwise be measured as the view it fell back to, and reported as if it were the one asked for.
  // The redirect itself is the server's (server.ts): a browser that follows it is on the second address before the
  // page's own scripts run, which is where a redirect leaves a real visitor.
  '/moved-page': deep('A route that moved', { body: '<p>This route answers at another address.</p>' }),
  '/moved-page-now': deep('Where the moved route answers', { body: '<p>The dashboard moved here.</p>' }),
  '/drops-query': deep('A route that drops its query', { body: '<p>Every request of the day, whichever view was asked for.</p>' }),

  // A page that failed while it rendered. Both arms of the rule: an exception nothing caught, and a failure the page
  // reported itself. Either one is a page a person is looking at, whatever the pixels say.
  '/page-error': deep('A page that threw', { body: '<p>The figures are below.</p>', script: "throw new Error('the fixture throws on purpose');" }),
  '/console-error': deep('A page that logged a failure', { body: '<p>The figures are below.</p>', script: "console.error('the fixture logs a failure on purpose');" }),

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

// ---- navigation pages for scripts/navigate.ts ----

/** The rail routes of the Main workspace, in rail order. */
export const NAV: [string, string][] = [['/nav-home', 'Home'], ['/nav-root-target', 'Root target'], ['/nav-missing-target', 'Missing target'], ['/nav-multi', 'Several matches'], ['/nav-root-hydrated', 'Hydrated root'], ['/nav-dead-control', 'Dead control'], ['/nav-link-late', 'Late data'], ['/nav-redirect', 'Redirects'], ['/nav-empty', 'Empty list'], ['/nav-empty-error', 'Failed list'], ['/nav-retake', 'Retaken']];
const linksOf = (rail: [string, string][]) => rail.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('');
const TABLE = '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Rows</td></tr></tbody></table>';

/**
 * The workspace menu every navigation page carries, as the console's Rail draws it while there is more than one workspace:
 * a trigger named "<product>, <workspace>: workspace menu" and one `menuitemradio` a workspace, which opens its home with
 * no link, so nothing prefetches it. It offers Main, whose home is /nav-home, and Solo, a workspace of one destination
 * (/nav-solo) that no other page's rail links to, and Gamma, whose home is /nav-d-menu-gone. /nav-solo-unoffered is a
 * home the menu never offers.
 */
const WORKSPACES: [string, string][] = [['Main', '/nav-home'], ['Solo', '/nav-solo'], ['Gamma', '/nav-d-menu-gone']];
const menu = (current: string) => `<button type="button" data-menu aria-haspopup="menu" aria-expanded="false" aria-label="Fixture, ${current}: workspace menu">${current}</button>
<div role="menu" hidden>${WORKSPACES.map(([name, home]) => `<div role="menuitemradio" tabindex="-1" aria-checked="${name === current}" data-home="${home}">${name}</div>`).join('')}</div>`;
const MENU_WIRE = `
  for (const b of document.querySelectorAll('button[data-menu]')) b.addEventListener('click', () => { const m = b.nextElementSibling; m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); });
  for (const item of document.querySelectorAll('[role="menuitemradio"]')) item.addEventListener('click', () => { location.assign(item.dataset.home); });`;

/**
 * The navigation skeleton: a rail from 1024px up and a drawer under it, each with the workspace menu above the rail's links,
 * and controls sized for a phone. A page is in Main, with Main's rail, unless it names its own workspace and rail.
 */
const nav = (title: string, main: string, script = '', { workspace = 'Main', rail = NAV }: { workspace?: string; rail?: [string, string][] } = {}): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  html, body { background: #ffffff; color: #1a1a1a; }
  body { margin: 0; font: 16px system-ui; display: flex; min-height: 100vh; }
  aside { width: 240px; padding: 16px; border-right: 1px solid #888888; }
  main { flex: 1; padding: 16px; }
  [role="dialog"] { position: fixed; inset: 0 auto 0 0; width: 240px; padding: 16px; background: #ffffff; }
  [role="dialog"][hidden] { display: none; }
  [role="menu"][hidden] { display: none; }
  [role="menuitemradio"] { min-height: 44px; line-height: 44px; cursor: default; }
  button { min-width: 44px; min-height: 44px; }
  nav a { display: inline-block; min-height: 44px; line-height: 44px; }
  @media (max-width: 1023px) { aside { display: none; } }
  @media (min-width: 1024px) { #open { display: none; } }
</style></head>
<body>
<aside aria-label="Primary">${menu(workspace)}<nav aria-label="Main"><ul>${linksOf(rail)}</ul></nav></aside>
<div role="dialog" aria-label="Navigation" hidden>${menu(workspace)}<nav aria-label="Main"><ul>${linksOf(rail)}</ul></nav></div>
<main>
  <button id="open" aria-label="Open navigation">Menu</button>
  <h1>${title}</h1>
  ${main}
</main>
<script>
  document.getElementById('open').addEventListener('click', () => { document.querySelector('[role="dialog"]').hidden = false; });${MENU_WIRE}
  ${script}
</script>
</body></html>`;

const TOGGLE = '<button id="toggle" aria-pressed="false">Toggle</button>';
const WIRE = `document.getElementById('toggle').addEventListener('click', (e) => e.currentTarget.setAttribute('aria-pressed', String(e.currentTarget.getAttribute('aria-pressed') !== 'true')));`;
const ROOT_TOGGLE = define('x-toggle', '<button type="button" class="root-toggle" aria-pressed="false">Toggle</button>', 'button { min-width: 44px; min-height: 44px; }', 'open',
  `const b = root.querySelector('button'); b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));`);
const PICK = `Array.from(document.querySelectorAll('button.pick')).forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));`;

/**
 * Two live pages for perf's after-live journey (scripts/perf.ts). Each listens for `online` only 1.5 s after it loads, as a
 * console page does once it has hydrated, and then resyncs as the provider does: a Server Action that answers
 * `{ ok: true }`, then the router's read of the page. An event sent at once is lost, and the page reads as not live.
 */
export const LIVE_RAIL: [string, string][] = [['/live-late-a', 'Live A'], ['/live-late-b', 'Live B']];
const LIVE_LATE = `setTimeout(() => addEventListener('online', () => {
    fetch('/live-act', { method: 'POST', headers: { 'next-action': 'fixture' } }).then((r) => r.text()).then(() => fetch(location.pathname, { headers: { rsc: '1' } }));
  }), 1500);`;

/**
 * The routes a navigate case needs after the shared rail, in rail order, and the workspace homes beside them. Each journey
 * starts from the nearest rail route before its destination whose rail draws a link to it, so a page whose start is the
 * defect is a pair: `/nav-s-<case>`, a start with a rail of its own that draws only the link to `/nav-d-<case>` and
 * misbehaves there, directly before the destination, which no other rail draws. The starts are never destinations, so they
 * carry no mapping and no manifest row. tests/deep-checks.test.ts runs every navigate case with these.
 */
export const NAV_RAIL = [
  '/nav-home', '/nav-solo', '/nav-solo-unoffered', '/nav-root-target', '/nav-missing-target', '/nav-multi', '/nav-root-hydrated', '/nav-dead-control', '/nav-link-late', '/nav-redirect', '/nav-empty', '/nav-empty-error', '/nav-retake',
  '/nav-d-nostart',
  '/nav-s-unloaded', '/nav-d-unloaded', '/nav-s-nobutton', '/nav-d-nobutton', '/nav-s-nolink', '/nav-d-nolink', '/nav-s-gone', '/nav-d-gone',
  '/nav-s-stuck', '/nav-d-stuck', '/nav-s-led', '/nav-d-led', '/nav-s-menu-gone', '/nav-d-menu-gone',
].join(',');
export const NAV_HOMES = '/nav-home=Main,/nav-solo=Solo,/nav-solo-unoffered=Unoffered,/nav-d-menu-gone=Gamma';

/** A page alone in its rail: it draws one link, to `to`, and is drawn by no Main page. */
const apart = (title: string, to: string, script = '', workspace = 'Main'): string => nav(title, `${TOGGLE}${TABLE}`, script, { workspace, rail: [[to, 'Destination']] });
/** The visit count of the page in this browser profile, which the journeys reload many times: 1 on the first load of a run. */
const VISITS = (key: string) => `const visits = (() => { const k = ${JSON.stringify(`fixture-visits-${key}`)}; const n = Number(localStorage.getItem(k) ?? 0) + 1; localStorage.setItem(k, String(n)); return n; })();`;
const LINKS = "document.querySelectorAll('nav a')";

export const NAV_PAGES: Record<string, string> = {
  '/live-late-a': nav('Live A', `${TOGGLE}${TABLE}`, `${WIRE}\n  ${LIVE_LATE}`, { rail: LIVE_RAIL }),
  '/live-late-b': nav('Live B', `${TOGGLE}${TABLE}`, `${WIRE}\n  ${LIVE_LATE}`, { rail: LIVE_RAIL }),
  '/nav-home': nav('Home', `${TOGGLE}${TABLE}`, WIRE),
  // The control is inside an open root: a document-level query cannot find it.
  '/nav-root-target': nav('Root target', `<x-toggle></x-toggle>${TABLE}`, ROOT_TOGGLE),
  // The mapping names a control the page does not have.
  '/nav-missing-target': nav('Missing target', `${TOGGLE}${TABLE}`, WIRE),
  // Two elements match the mapping's control: the first is hidden, the second works.
  // As a Next page: React marks the elements it rendered once it hydrates (light DOM only), and the control lives in an
  // open root React never renders into, so readiness is its host's.
  '/nav-root-hydrated': nav('Hydrated root', `<x-toggle></x-toggle>${TABLE}`, `${ROOT_TOGGLE}\n  self.__next_f = [];\n  for (const el of document.querySelectorAll('*')) el.__reactProps$fixture = {};`),
  // The mapping's control is there and pressable, and pressing it changes nothing.
  '/nav-dead-control': nav('Dead control', `${TOGGLE}${TABLE}`),
  // A link probe: the heading and a link to another page are there at once, the ready text 800 ms later. Pressed beside the
  // data, the link leaves the page before the text appears; pressed after it, the data counts first. The link changes the
  // address in the page, as a router does, so the journey's clock and its record of the press survive it.
  '/nav-link-late': nav('Late data', '<a href="/nav-home">Go home</a>', `document.querySelector('main a').addEventListener('click', (e) => { e.preventDefault(); history.pushState({}, '', '/nav-home'); });
  setTimeout(() => { const p = document.createElement('p'); p.textContent = 'Loaded'; document.querySelector('main').append(p); }, 800);`),
  // A rail route that redirects to a page under it for the person signed in (#97): the server answers /nav-redirect with a
  // redirect to /nav-redirect/thing-a, whose heading is the thing's.
  '/nav-redirect/thing-a': nav('Thing A', `${TOGGLE}${TABLE}`, WIRE),
  // A list whose data arrived empty (#97): its first-run state where the rows would be, so no row link to press.
  '/nav-empty': nav('Empty list', '<div data-empty="first-run"><p>No things yet</p></div>'),
  // The same list, failed: its error state, which stays a failure.
  '/nav-empty-error': nav('Empty list', '<div data-empty="error" role="alert"><p>The things could not be read</p></div>'),
  '/nav-multi': nav('Several matches', `<button class="pick" aria-pressed="false" hidden>Hidden</button><button class="pick" aria-pressed="false">Toggle</button>${TABLE}`, PICK),
  // The only destination of its workspace: no other page's rail links to it, and the workspace menu's Solo item opens it.
  '/nav-solo': nav('Solo', `${TOGGLE}${TABLE}`, WIRE, { workspace: 'Solo', rail: [['/nav-solo', 'Solo']] }),
  // The same, in a workspace the menu does not offer: no item opens it.
  '/nav-solo-unoffered': nav('Unoffered', `${TOGGLE}${TABLE}`, WIRE, { workspace: 'Unoffered', rail: [['/nav-solo-unoffered', 'Unoffered']] }),
  // The data arrives on the first desktop visit and not on a second: a timing over its budget is retaken, and the retake finds
  // the table gone. The phone is never counted (the drawer pass and the phone journeys), so a page that is not retaken passes.
  '/nav-retake': nav('Retaken', `${TOGGLE}${TABLE}`, `${WIRE}\n  if (innerWidth >= 1024) { ${VISITS('retake')} if (visits >= 2) document.querySelector('table').remove(); }`),
  // No rail draws a link to it, and it is no workspace's home: a journey has nowhere to start from.
  '/nav-d-nostart': nav('Unlinked', `${TOGGLE}${TABLE}`, WIRE, { rail: [['/nav-d-nostart', 'Unlinked']] }),
  // The start has its heading on the first visit, which reads its rail, and none on the visits that follow.
  '/nav-s-unloaded': apart('Start unloaded', '/nav-d-unloaded', `${VISITS('unloaded')} if (visits > 1) document.querySelector('h1').remove();`),
  '/nav-d-unloaded': apart('Destination unloaded', '/nav-d-unloaded', WIRE),
  // The Open navigation button is there on the first visit, which counts the page as a start, and hidden after it.
  '/nav-s-nobutton': apart('Start without a button', '/nav-d-nobutton', `${VISITS('nobutton')} if (visits > 1) document.getElementById('open').style.display = 'none';`),
  '/nav-d-nobutton': apart('Destination without a button', '/nav-d-nobutton', WIRE),
  // The rail draws the link on the first visit and hides it after it: the drawer and the rail show none to press.
  '/nav-s-nolink': apart('Start without a link', '/nav-d-nolink', `${VISITS('nolink')} if (visits > 1) ${LINKS}.forEach((a) => { a.style.display = 'none'; });`),
  '/nav-d-nolink': apart('Destination without a link', '/nav-d-nolink', WIRE),
  // The link is shown, pressable, and removed 1.5 s after it is first on screen, while a prefetch the page started (an asset
  // that answers after 6 s) keeps the journey waiting: when it looks for the link again, it is gone.
  '/nav-s-gone': apart('Start losing its link', '/nav-d-gone', `fetch('/slow-asset', { headers: { 'next-router-prefetch': '1' } }).catch(() => {});
  const seen = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { seen.disconnect(); setTimeout(() => ${LINKS}.forEach((a) => a.remove()), 1500); } });
  ${LINKS}.forEach((a) => seen.observe(a));`),
  '/nav-d-gone': apart('Destination losing its link', '/nav-d-gone', WIRE),
  // The link is pressable and its press goes nowhere.
  '/nav-s-stuck': apart('Start with a dead link', '/nav-d-stuck', `${LINKS}.forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));`),
  '/nav-d-stuck': apart('Destination of a dead link', '/nav-d-stuck', WIRE),
  // The link is pressable and its press leaves for a page that is neither the destination nor under it.
  '/nav-s-led': apart('Start with a stray link', '/nav-d-led', `${LINKS}.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); location.assign('/elsewhere'); }));`),
  '/nav-d-led': apart('Destination of a stray link', '/nav-d-led', WIRE),
  // The workspace menu offers Gamma when it opens and takes the item back 1 s later, before the journey presses it.
  '/nav-s-menu-gone': apart('Start with a vanishing item', '/nav-s-menu-gone', `for (const b of document.querySelectorAll('button[data-menu]')) b.addEventListener('click', () => setTimeout(() => document.querySelectorAll('[role="menuitemradio"]').forEach((i) => i.remove()), 1000));`),
  '/nav-d-menu-gone': apart('Gamma', '/nav-d-menu-gone', WIRE, 'Gamma'),
};

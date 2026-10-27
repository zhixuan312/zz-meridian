# Deep-DOM fixtures

Pages whose one defect a browser suite has to catch — most of them inside an open shadow root, the rest in the light DOM, where the question is what the suite asks of a page rather than how far into a root it reaches — a server for them, and the manifest of what each browser suite must say about each page. They exist so that a suite which cannot see into a custom element fails a test, not a user. Nothing here ships to a project: the payload excludes `scripts/fixtures/` and `tests/deep-*.test.ts`.

## Supported boundary

The helper in `scripts/lib/deep.ts` (`deepAll`, `deepActive`, `deepQuery`, `deepQueryAll`, `deepParent`, `deepText`, and `DEEP_SOURCE` for injection into a page) enters open shadow roots, nested ones included, and follows slots. It does not enter closed roots, iframes or `<template>` content, and an undefined custom element has no root to enter. A suite that meets a defined custom element with no open root, or one that is never defined, reports it as unmeasured instead of passing over it. `deepAll` is a deterministic traversal (a host, then its root, then its light children), not tab order.

## Running

```
node scripts/fixtures/deep/server.ts [--port <n>]        prints: listening on http://127.0.0.1:<port>
```

Any route that is not a page below answers a clean page (light DOM, no control), which is what the audit's embed pass reaches. It passes every suite. Every path under `/gone/` answers 404, for the link case and for the answer case: a route that answers 404 is measured as its error page unless the run declares it missing (`--missing`), and a route declared missing that answers 200 (`/came-to-exist`, the clean page) fails too. Suites are run one page at a time:

| Suite in `expected.json` | Command |
|---|---|
| `audit` | `node scripts/audit.ts --base <url> --routes <page>` |
| `presses` | `node scripts/interactions.ts --base <url> --routes <page>` |
| `keyboard` | `node scripts/keyboard.ts --base <url> --routes <page>` |
| `vitals` | `node scripts/vitals.ts --base <url> --routes <page>` |
| `navigate` | `node scripts/navigate.ts --base <url> --config scripts/fixtures/deep/config.ts --rail <NAV_RAIL> --homes <NAV_HOMES> --routes <page>`, with `NAV_RAIL` and `NAV_HOMES` as `pages.ts` exports them (tests/deep-checks.test.ts reads them there). Manifest `args` follow `--routes`, and the first occurrence of a flag wins, so `args` can add `--timing`, `--mode` and `--samples` to this suite and cannot replace `--config`, `--rail` or `--homes` |
| `navigate-timing-off` | The `navigate` command with `--config scripts/fixtures/deep/config-tight.ts --timing off`. `config-tight.ts` is `config.ts`'s mappings with every navigation budget at 1 ms, so only function can fail a line, and with three pages mapped wrongly on purpose (`/nav-root-hydrated`'s title, `/nav-root-target`'s ready text, `/nav-multi`'s ready selector), which `config.ts` maps rightly and passes |
| `navigate-timing-on` | The same with `--timing on`: a page that works is over its 1 ms budget |

## Pages

Every page has an `h1`, `lang="en"`, a `main`, an opaque ground and controls of at least 44px, so the planted defect is the only one. Most cases have a broken page and a corrected twin, most often a `-fixed` page. Every `nav-*` page carries a workspace menu above its rail, in the desktop rail and in the phone drawer, drawn as the console's Rail draws it: a trigger named `<product>, <workspace>: workspace menu` and one `menuitemradio` for each of Main (home `/nav-home`) and Solo (home `/nav-solo`).

| Page | Planted case |
|---|---|
| `/deep-clipped` | A label clipped without an ellipsis, two open roots deep |
| `/deep-unnamed` | An icon-only button with no accessible name, two roots deep |
| `/deep-slotted-name` | A button in an open root named by the text slotted into its host (passes) |
| `/deep-slotted-name-empty` | The same button with nothing slotted and only an icon (fails) |
| `/deep-target` | A 24px button, two roots deep (measured on a coarse pointer) |
| `/deep-contrast` | `#9a9a9a` text on white, two roots deep |
| `/deep-alpha` | Text on a transparent layer over a host with a dark alpha ground; only a measurement that steps from the root to its host sees the ground |
| `/deep-ringless` | A control inside a root with no focus ring anywhere. `-fixed` rings the control itself |
| `/deep-ring-ancestor` | A control whose ring is drawn on its frame inside the root (`:focus-within`). Correct, so it has no broken twin |
| `/deep-decorative-border` | A control in the light DOM with a coloured box shadow that is always there and does not change on focus. `-fixed` adds an outline on `:focus-visible` |
| `/deep-dead-control` | A button inside a root that does nothing when pressed. `-fixed` writes a status line inside the root |
| `/deep-shift-tab` | A button inside a root that a forward Tab skips (the first button sends focus to the last) and only Shift+Tab reaches |
| `/deep-closed` | A defined custom element whose root is closed. `-fixed` opens it |
| `/deep-undefined` | A custom element that is never defined. `-fixed` defines it |
| `/nav-home` | Navigation: the working baseline (rail, drawer, table, toggle) |
| `/nav-root-target` | Navigation: the mapping's control and result are inside an open root |
| `/nav-root-hydrated` | The same on a page marked as a hydrated Next page: the control inside the root is ready once its host is |
| `/nav-missing-target` | Navigation: the mapping names a control the page does not have |
| `/nav-multi` | Navigation: the control selector matches two elements, the first hidden |
| `/nav-dead-control` | Navigation: the mapping's control is there and pressable, and pressing it changes nothing: `control-dead` (fails). Last in the rail, so every other page starts where it did |
| `/nav-link-late` | Navigation: a `link` probe whose link is pressable at once and whose ready text comes 800 ms later. The link is pressed once the data is measured, so the line passes; pressed beside the data it would leave first and report `is there but never shows`. Last in the rail |
| `/nav-solo` | Navigation: the only destination of its workspace (Solo). No other page's rail links to it, so the journey starts on `/nav-home` and presses the workspace menu's Solo item, which opens it with no link (passes, `through the workspace menu (Solo) · not prefetched`) |
| `/nav-solo-unoffered` | Navigation: the same, in a workspace the menu does not offer: the journey is `never-ready`, naming the workspace (fails) |
| `/nav-retake` | Navigation: its table is there on the first desktop visit and gone on every later one. Under `--timing on` and 1 ms budgets the first journey is over budget, is retaken, and the retake finds no data (`data never-ready on a retake`); under loose budgets it is never retaken and passes |
| `/nav-d-nostart` | Navigation: drawn by no rail and no workspace's home, so the journey has nowhere to start from (`the rail has no other route to start from`) |
| `/nav-s-unloaded`, `/nav-d-unloaded` | Navigation, a start that is the defect: every `nav-s-*` page is a start with a rail of its own that draws only the link to its `nav-d-*` destination, sits directly before it in the rail, and is never a destination itself. This one loses its heading after the first visit (`the starting page ... did not load`) |
| `/nav-s-nobutton`, `/nav-d-nobutton` | The start hides its Open navigation button after the first visit: the phone cannot open the drawer |
| `/nav-s-nolink`, `/nav-d-nolink` | The start hides its links after the first visit: the drawer on a phone and the rail on a desktop show none to press |
| `/nav-s-gone`, `/nav-d-gone` | The start takes its links back 1.5 s after they are first on screen, while a slow prefetch keeps the journey waiting: `the link ... is covered or gone` |
| `/nav-s-stuck`, `/nav-d-stuck` | The start's link is pressable and its press goes nowhere (`still on`) |
| `/nav-s-led`, `/nav-d-led` | The start's link leads to `/elsewhere`, neither the destination nor under it |
| `/nav-s-menu-gone`, `/nav-d-menu-gone` | The destination is the home of the Gamma workspace, reached through the menu, and the start takes the menu's items back 1 s after it opens: `the workspace menu's item for Gamma is covered or gone` |
| `/deep-tap` | Vitals: the Alerts button a phone taps is inside an open root (`taps: 1`) |
| `/deep-shifts` | Vitals: a banner arrives 1.2 s after load and pushes a card down 300px, so CLS is over 0.1 (`moved most:` beside a nonzero `taps:`; the run exits 1 on the floor, and the case does not mind) |
| `/svg-contrast` | An SVG's `<text>` filled `#9a9a9a` on white. Light DOM, like every page from here down: these are about what the audit measures, not how deep it reaches |
| `/svg-label-on-bar-dark` | Dark text on a dark bar inside the SVG (fails). Read against the page instead of the bar it would pass, and the white label of `/svg-text-read` would fail, so the pair proves the bar is what is read. The bar has `pointer-events: none`, so only a geometric test finds it |
| `/svg-text-read` | Both corrected on one page (passes): a label dark enough on the page, and a white label on the dark bar |
| `/truncated` | Text cut with an ellipsis and no `title`. `-fixed` carries the whole text in its `title` |
| `/overlap-text` | Two paragraphs drawn on each other by a negative margin |
| `/overlap-line` | A stroked line through an SVG caption |
| `/overlap-none` | What is not a collision, on one page (passes): the two corrected twins, and the three shapes the first sweep of real pages misreported, a clamp's hidden lines, a line below the fold of a clipped list, and the text of a closed `<details>` |
| `/overlap-cv-auto` | A `content-visibility: auto` section below the fold whose placeholder is shorter than its content: skipped, its lines lie on the next paragraph; drawn, nothing overlaps (passes). The audit renders such a subtree before it measures |
| `/overlap-cv-hidden` | Text that overlaps inside a `content-visibility: hidden` section, which is not drawn (passes) |
| `/presses-relative-link` | A visible link `<a href="gone/testing.md">`, which resolves to `/gone/testing.md` and answers 404 (`answers 404`) |
| `/presses-relative-link-fixed` | A visible relative link to a page that answers 200 (passes) |
| `/late-unnamed` | An unnamed control that arrives in `[data-assistant-slot]` 2.6 s after the page, past the audit's fixed wait. Also a keyboard case (`-fixed`) |
| `/late-dead-control` | A control that does nothing, arriving 3.6 s after the page, past the presses' fixed wait: unlisted, it was never pressed and the run read `0 controls pressed … 0 issues` |
| `/presses-controls-move` | Controls drawn in another order on a later load: the first load draws all four, every later one draws two of them 3.2 s late, past the open and the settle, so a control re-found by its place in the walk is missing (passes) |
| `/presses-live-name` | A control whose name carries a count a read fills in: `Alerts` on the first load, `Alerts, 3 new` on every later one, reached through a Reload press, so a control found again only by its exact name is missing (passes) |
| `/presses-late-replace` | A press that answers, then a document replaced after the presses' look has closed (Escape replaces it, so it lands between the look and the next read every run): the suite opens the route again and presses the next control, never crashes (passes) |
| `/late-answer` | A control whose answer, a status line, comes 1.5 s after its press, past the presses' first look at 600 ms: slow, not dead (passes) |
| `/sideways-region` | A content region 600px wide in a 300px canvas: the first of the sideways rule's three arms. `-fixed` fits |
| `/sideways-data-page` | A `[data-page-width="data"]` page 150px wide in a 300px canvas: the page is what should stretch. `-fixed` fills it |
| `/sideways-table` | A 600px table in a 240px frame that clips rather than scrolls, so no scrollbar offers the rest. `-fixed` fits |
| `/strip` | A chip strip with `overflow-x: auto`, wider than 390px: its last items are off the edge with no fade saying so. `-fixed` wraps |
| `/spill` | A 20-digit figure in one of four `1fr` grid tracks 120px wide, drawn past the track and its container, in a box that does not clip. `-fixed` breaks the figure anywhere |
| `/disclosure` | A control inside a closed `<details>`: both the keyboard walk and the presses walk open it first, then reach it (passes) |
| `/double-scroller` | Two 200px scrollers over 400px of content: a page may have one, and the content region is it. `-fixed` has one |
| `/heading-skip` | An `h2` then an `h4`: the outline a screen reader reads has a hole in it. `-fixed` descends one at a time |
| `/empty-region` | A content region that rendered nothing — every other rule passes a page with no content. `-fixed` holds the day's rows |
| `/drawn-missing` | A page that answers 200 and draws the not-found screen (`[data-missing-page]`), as a record page inside a streamed shell does: it fails every suite unless the run declares it missing (`--missing /drawn-missing`), when it passes |
| `/sideways-document` | A row 600px wide in a page with no scroll region: the document itself scrolls sideways at a phone's width. `-fixed` holds the row to the page |
| `/presses-bad-url` | A link whose address is no URL (an unclosed IPv6 host). `-fixed` links to a page |
| `/presses-control-gone` | A control the first load draws and no later one does: after the Reload press opens the page again, Archive is gone for good (`/presses-controls-move` is its twin, whose controls come back late) |
| `/presses-covered` | A control under a layer that takes the pointer. `-fixed` lets the pointer through the layer |
| `/hangs` | Blocks its main thread for 40 s at every width, past the 30 s a protocol command is given: the presses and the keyboard walk name it and go on |
| `/keyboard-hidden` | A link under a bar fixed over the top of the page. `-fixed` starts the content below the bar |
| `/keyboard-reverse` | Shift+Tab from the last control jumps to the first, past the middle one. `-fixed` leaves the order alone |
| `/keyboard-skip-link` | A skip link (`a[href="#content"]`) that is the second stop, after a Menu button. `-fixed` puts it first |
| `/keyboard-control-gone` | A control that removes itself when it takes focus. `-fixed` changes its label and stays |
| `/vitals-late-paint` | The largest text painted 3.4 s after load. `-fixed` paints it with the page |
| `/vitals-slow-tap` | The Alerts tap blocks the thread for 400 ms. `-fixed` answers at once |
| `/vitals-dropped-frame` | The Alerts tap blocks the thread for 90 ms: one long frame, inside the INP floor. `-fixed` answers at once |
| `/vitals-shifts-fixed` | `/deep-shifts` with the banner's space held from the start |
| `/moved-page` | The server answers it with a 302 to `/moved-page-now`, so the audit measured a page it did not ask for |
| `/drops-query` | Asked for as `/drops-query?view=all`, answered with a 302 to the bare path: the address came back without its view |
| `/page-error` | The page throws while it renders, and nothing catches it |
| `/console-error` | The page reports a failure itself, through `console.error` |
| `/deep-hangs` | Under 500 px the page blocks its own main thread for 40 s, past the 30 s a protocol command is given: the audit must name this page as one it could not measure and go on to the next, instead of ending the run |
| `/slow-load` | Not a suite case: its image answers after 6 s, so `open()` must wait for the load event (`tests/deep-dom.test.ts`) |
| `/helper` | Not a case: nested roots, a slot and a closed root, for `tests/deep-dom.test.ts` |

The decorative border is a light-DOM control on purpose: the audit's existing ring test counts any coloured box shadow as a ring, so the case is only unambiguous where nothing else can fail it. Ring presence must be judged by a change on focus.

## The manifest and the blind record

`expected.json` lists `{ page, suite, outcome, line?, args? }`, `args` being added to the suite's command line (`--missing`): `outcome` is `fail` (exit non-zero), `pass` (exit zero), `note` (exit zero and the line printed) or `measured` (exit 0 or 1, decided by its line alone, with `taps: N` above 0 printed besides: `vitals` entries only, since its exit code carries the floors and a case is about what was tapped and moved); `line` is a substring the suite must print; `clear` means the suite ran and did not print `line`, whatever its exit code: the corrected twin of a timed rule holds only its own rule, since the cases run side by side and a floor they do not plant measures the machine. It states what each suite must say once it reads inside open roots. `blind-d37f8a8.txt` records what the suites at commit `d37f8a8`, before any change, said about the pages that existed then: where it differs from the manifest, the old suite was blind (it passed a broken page) or wrong (it failed a correct one). Neither file is edited after the fact — the record of what the old suite said stays as it was, and a suite that learns to see something new appends its pages and their cases to `expected.json`, as the rows from `/svg-contrast` down were. The one exception is the `vitals` entries, whose `outcome` was changed from `pass` to `measured` when the suite's cases stopped being decided by the floors.

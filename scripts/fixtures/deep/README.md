# Deep-DOM fixtures

Pages whose one defect sits inside an open shadow root, a server for them, and the manifest of what each browser suite must say about each page. They exist so that a suite which cannot see into a custom element fails a test, not a user. Nothing here ships to a project: the payload excludes `scripts/fixtures/` and `tests/deep-*.test.ts`.

## Supported boundary

The helper in `scripts/lib/deep.ts` (`deepAll`, `deepActive`, `deepQuery`, `deepParent`, `deepText`, and `DEEP_SOURCE` for injection into a page) enters open shadow roots, nested ones included, and follows slots. It does not enter closed roots, iframes or `<template>` content, and an undefined custom element has no root to enter. A suite that meets a defined custom element with no open root, or one that is never defined, reports it as unmeasured instead of passing over it. `deepAll` is a deterministic traversal (a host, then its root, then its light children), not tab order.

## Running

```
node scripts/fixtures/deep/server.ts [--port <n>]        prints: listening on http://127.0.0.1:<port>
```

Any route that is not a page below answers a clean page (light DOM, no control), which is what the audit's embed pass reaches. It passes every suite. Suites are run one page at a time:

| Suite in `expected.json` | Command |
|---|---|
| `audit` | `node scripts/audit.ts --base <url> --routes <page>` |
| `presses` | `node scripts/interactions.ts --base <url> --routes <page>` |
| `keyboard` | `node scripts/keyboard.ts --base <url> --routes <page>` |
| `navigate` | `node scripts/navigate.ts --base <url> --config scripts/fixtures/deep/config.ts --rail /nav-home,/nav-root-target,/nav-missing-target,/nav-multi,/nav-root-hydrated --routes <page>` |

## Pages

Every page has an `h1`, `lang="en"`, a `main`, an opaque ground and controls of at least 44px, so the planted defect is the only one. Each case has a broken page and a corrected `-fixed` page.

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
| `/helper` | Not a case: nested roots, a slot and a closed root, for `tests/deep-dom.test.ts` |

The decorative border is a light-DOM control on purpose: the audit's existing ring test counts any coloured box shadow as a ring, so the case is only unambiguous where nothing else can fail it. Ring presence must be judged by a change on focus.

## The manifest and the blind record

`expected.json` lists `{ page, suite, outcome, line? }`: `outcome` is `fail` (exit non-zero), `pass` (exit zero) or `note` (exit zero and the line printed); `line` is a substring the suite must print. It states what each suite must say once it reads inside open roots. `blind-d37f8a8.txt` records what the suites at commit `d37f8a8`, before any change, said about the same pages: where it differs from the manifest, the old suite was blind (it passed a broken page) or wrong (it failed a correct one). Both files are frozen once this fixture set lands; a suite change adds cases to `tests/deep-checks.test.ts` and never edits them.

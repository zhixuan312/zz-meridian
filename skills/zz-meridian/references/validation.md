# Validation: what `pnpm verify` checks, and how to fix what it finds

`pnpm verify` runs these in order. A failing gate, build, start or assistant-off pass stops it there; from the audit on, every
check runs and the report lists each failure:

1. **The gate** (`node scripts/gate.ts`): tokens regenerate to the same CSS; the card registry is fresh; every card and
   page specification follows the anatomy; the product's own rules in `optional:scripts/check.local.ts`, when the file exists;
   contrast holds for every pair in every theme and accent, and the chart palette passes the colour-vision checks;
   eslint-config-next; TypeScript; the tests.
2. **A production build** (`next build`), against the fake API when `scripts/verify.config.ts` names one.
3. **The assistant walk-through**, only when the project has `optional:app/api/assistant/route.ts`: off, then on against a fake
   model.
4. **The built app, served**, and the **browser audit** of every static route under `app/` and the `detailRoutes` in
   `scripts/verify.config.ts` (embeds under `/embed` on a simulated host ground) at 2560, 1440, 1024, 768 and 390px in
   both themes (`--quick`: 1440 and 390, dark only).
5. **Every control pressed, every link followed** (`scripts/interactions.ts`) on the built app: mouse at 1440px, taps at
   390px. A button that changes nothing, a control something else covers, and a link that answers 4xx all fail.
   **This presses Approve, Revoke and Delete too.** Pages that call a live API must be built against a fake one
   (`fakeApi` in `scripts/verify.config.ts`; see `existing-project.md`, step 5), or verify changes real data.
   The same hazard through another door: pages that read a database directly. verify reads `DATABASE_URL` — and any
   name in `dataUrls` — from the environment and from the `.env` files Next would load, and refuses to start when one
   resolves to a host that is not this machine. Point it at a local copy for the run, and restore the data afterwards:
   the walk-through flags rows and a press can delete.
6. **The whole keyboard path** (`scripts/keyboard.ts`), beside the audit and the presses: Tab through each page until
   focus comes back round. The first stop in the shell is "Skip to content", every stop shows a focus ring and is not
   hidden under something such as the sticky top bar, and every visible control is reached. With them run the
   product's own browser checks (`browserChecks` in `scripts/verify.config.ts`), each given `--base` and the served
   app's address.
7. **Web Vitals on a mid-range phone** (`scripts/vitals.ts`): Lighthouse's mobile profile (CPU slowed four times, Slow 4G,
   390px touch). Every product page must hold LCP under 2.5 s, INP under 200 ms and CLS under 0.1; INP is the slowest
   tap on a control that changes the screen. It runs alone, after the others, since throttling measures the machine
   too: on a busy machine, run it again before believing a near miss.

The report is in `out/verify.txt`. Fix the cause; never weaken a check to make it pass. pnpm may first print a lockfile
and supply-chain check before a script runs; that is pnpm, not an install, and not a failure.

## Gate failures

| Message | Cause | Fix |
|---|---|---|
| `tokens.css is out of date` | A token file changed | `pnpm tokens` |
| `registry.ts is out of date` / `no preview.tsx` | A card folder was added, renamed or has no preview | Add `preview.tsx`; `node scripts/registry.ts` |
| `missing ## Structure` (page) or `## Surfaces` (card) | A specification is incomplete | Write the section; see a template page's `README.md` |
| `literal colour #...` | A hex or rgb in a component | Use a role (`bg-surface`, `text-ink-2`, `border-line`, `text-accent-ink`) or add a token |
| `font-bold is outside Meridian's scale` | A Tailwind default utility | Use `font-semibold`, `rounded-xl`, `shadow-card`… |
| `names \`x\`, which is not a token` | A spec names a token that does not exist | Correct the name or add the token |
| `FAIL light brand ... on-accent on accent` | The brand accent is too light for white text | Re-run `node scripts/brand.ts --hue … --chroma <lower>` |
| `warning: hue … from the critical status hue` (brand) | The brand colour reads as a status | Tell the person; offer graphite or a hue 20° away (SKILL.md step 4) |

## Audit failures

| Message | Cause | Fix |
|---|---|---|
| `sideways: scroll region 1042 > 768` | Something wider than the window | A table with too many columns: `hideBelow` on low-value ones; a long id: `truncate` with a `title`; a fixed width: use `min-w-0` and fractions |
| `clipped: … "text"` | Text cut without an ellipsis | Give the element `truncate`, or let it wrap; never shrink the type |
| `unnamed: button…` | An icon-only control | `aria-label` on it (Icon button requires one) |
| `scrollers: …` | A card scrolls on its own | Page the list (`DataTable` pages at 20) or cap it ("top 5"); only the page scrolls |
| `contrast: 3.1:1 … "text"` | Text below 4.5:1 | Use `ink`, `ink-2` or `ink-3` on surfaces; status text uses `*-ink`, never the fill colour |
| `no focus ring: …` | A control with `outline-none` and no ring | Remove `outline-none`, or add `focus-visible:outline-2 focus-visible:outline-accent` |
| `"Export" does nothing when pressed` | A control with no action, or one that only works on hover | Wire it, or remove it; an info button uses `Tooltip toggle` so a tap opens it |
| `table … > its frame` | A table wider than its card, its last columns clipped | `hideBelow` one more column, or `truncate` the lead column. When the lead (`grow`) column holds a long name and another column is wide too, hiding columns may not help: move `grow` to the shorter text column |
| `exception:` / `console.error:` | A runtime error or a hydration mismatch | Hydration: no `Date.now()`, `Math.random()` or locale-dependent formatting in render; use the demo clock and `src/lib/format*` |

## After it passes

Look at the pages (SKILL.md step 6). The audit measures what can be measured; the eye checks what cannot: one
protagonist per page, balanced columns, even rhythm between cards, colour used only where it means something.

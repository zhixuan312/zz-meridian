# Validation: what `pnpm verify` checks, and how to fix what it finds

`pnpm verify` runs, in order, and stops at the first failing step:

1. **The gate** (`node scripts/gate.ts`): tokens regenerate to the same CSS; the card registry is fresh; every card and
   page specification follows the anatomy; contrast holds for every pair in every theme and accent, and the chart palette
   passes the colour-vision checks; TypeScript; the tests.
2. **A production build** (`next build`).
3. **The built app, served**, and the **browser audit** of every static route under `app/` (embeds under `/embed` on a
   simulated host ground) at 2560, 1440, 1024, 768 and 390px in both themes (`--quick`: 1440 and 390, dark only).
4. **Every control pressed, every link followed** (`scripts/interactions.ts`) on the built app: mouse at 1440px, taps at
   390px. A button that changes nothing, a control something else covers, and a link that answers 4xx all fail.

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
| `table … > its frame` | A table wider than its card, its last columns clipped | `hideBelow` one more column, or `truncate` the lead column |
| `exception:` / `console.error:` | A runtime error or a hydration mismatch | Hydration: no `Date.now()`, `Math.random()` or locale-dependent formatting in render; use the demo clock and `src/lib/format*` |

## After it passes

Look at the pages (SKILL.md step 6). The audit measures what can be measured; the eye checks what cannot: one
protagonist per page, balanced columns, even rhythm between cards, colour used only where it means something.

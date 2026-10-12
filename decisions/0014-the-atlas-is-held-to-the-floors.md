# 0014 · The Atlas is held to the floors, and a check proves what it reached

Date: 2026-10-12 · Status: accepted

## Context

The vitals check opened by saying the Atlas "is not a product page", and left every `/system` route out. That was
written down, and its reason was a fair one: the floors are about the product a person opens every day. Nobody had
measured what the exclusion cost, because a page that is never measured produces no number.

Measured once, on the phone profile: every Atlas card page shifted between 0.30 and 0.61 against the 0.1 floor
(`/system/patterns/data-table` 0.500, `/system/patterns/trend-chart` 0.611). The cause was not in the Atlas. It was in
`Providers`, which every page of every product built on Meridian renders: its read of the stored choices was an urgent
update above any part whose code arrives after the page, and the Atlas happened to be the one place with such a part
under it. An adopter's own `dynamic()` component had the same fault waiting.

The same week showed the other half. `audit.ts --atlas` had been widened to "every entry the Atlas serves", and for
the whole of one release it visited 142 of 172 routes and printed the line it would have printed for all of them: the
import that listed the other thirty failed, the failure was caught, and the run went on with less. The exclusion in
one check and the silent shortfall in the other are the same thing, a statement about coverage that no run could
contradict.

## Decision

- **The Atlas is held to the same floors as the product.** `scripts/vitals.ts` measures its front page and one card
  page with every other page, inside `pnpm verify --full`. *Why:* the Atlas is built from the same shell, providers
  and components, so a defect that shows there is usually a defect of the system; and it is read on a phone like
  anything else.
- **The whole Atlas is one command, outside `pnpm verify`.** `vitals.ts --atlas` measures every entry (about fifteen
  minutes), as `audit.ts --atlas` audits every entry. *Why:* the default stays fast, and the sample inside it is the
  one every other suite already takes (`discover()`'s `/system` and `/system/components/button`).
- **A run says what it reached, and fails when it reached less.** An Atlas run prints its coverage by kind on its
  first line, `--list` prints the routes without a browser, and a content module that cannot be read fails the run
  instead of shortening it. *Why:* "0 issues across N routes" is only a result when N is what the reader thinks it is.
- **A new check is tried on what it was not built for before it may fail anything.** The three measurements added to
  the audit this week were first run over the product's 22 routes and the Atlas's 172. They found one real defect class
  (a value cut with nothing holding the whole of it, in five components) and three rules of their own that were too
  wide; each of the three is now a passing case in `scripts/fixtures/deep/`. *Why:* the two defects found in checks
  that week were both found by somebody else's route.

**Rejected.** Measuring every Atlas entry inside `pnpm verify --full`: fifteen more minutes on a run that already takes
about as long, for pages that share one stage. Keeping the exclusion and fixing the one defect: the exclusion is what
hid it.

## Consequences

- `pnpm verify --full` measures four more pages (`/system`, `/system/components/button` and the two held-still state
  pages), about forty seconds.
- A change to what every card page shares (the stage, the providers, the Atlas's shell) is followed by
  `node scripts/vitals.ts --atlas`, as a change to a component is followed by `node scripts/audit.ts --atlas`.
- The floors now cover documentation, so a guide or a specimen that shifts or paints late fails a run. That is
  intended.

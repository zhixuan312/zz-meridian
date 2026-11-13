# Contributing to Meridian

This repository is the single source of truth for how a Meridian dashboard looks, reads, moves and behaves, on every surface and for both kinds of operator. Every change starts here: specify it, build it, check it, release it.

## Before you propose something

A new card passes two questions before anyone specifies it:

- **Useful.** Name the job in one sentence, the page that needs it now, and the principle it serves. A card for an imagined future need is not proposed. An example built for a named scenario in the product is the page that needs it: say which scenario and which page draws it. A wrapper made only to fill a layer is not, and is not proposed.
- **Unique.** Nothing in the system already does the job. Look one layer down first: a page need is met by arranging patterns, a pattern need by composing components, a component need by combining tokens and base roles. Go down a layer only when the layer below truly cannot express it.

## Making something new

1. **Name the job** in one sentence, and the principle it serves.
2. **Look one layer down.** Build up, never sideways.
3. **Derive, do not invent.** Size from the control heights and the 4px scale, colour from the role it plays, motion from the three curves and the duration tokens. If a value is missing, add a token named by its role in `tokens/` (both themes when it is a colour) with a description, and regenerate.
4. **Build the card**: a folder in its layer holding `index.tsx` (the component), `preview.tsx` (every state) and `README.md` (the specification).
5. **Check it** against "Done means" and run `pnpm test:t1`.

A new page is also added to `PAGES` in `src/system/content.ts`, which the Atlas reads: its `id`, `title`, `route` (an address that opens, so a detail page names a real record), `spec` (the page's `README.md`), and `embed` or `template` when it has one.

## Where things live

| Layer | Folder | Holds |
|---|---|---|
| 0 Tokens | `tokens/` | DTCG 2025.10 files; `scripts/tokens.ts` generates `src/styles/tokens.css` and the Tailwind bridge `src/styles/theme.css` |
| 1 Base | `src/styles/base.css`, `src/styles/motion.css`, `src/components/base/` | Element defaults, text roles, motion, the shell, surfaces, the app mark |
| 2 Components | `src/components/ui/` | Single-purpose parts |
| 3 Patterns | `src/components/patterns/`, `src/components/charts/` | Components composed for one dashboard job |
| 4 Pages | `app/(dashboard)/`, `app/embed/`, `src/views/`, `src/components/templates/` | Routes (console and embed); a view shared by both lives in `src/views/`; a page template is a card folder in `src/components/templates/` (listed in Pages as `template-<folder>`) |
| 5 Product workspaces | `src/app.config.ts`, the product's adapter in `src/views/` (`workspaces.ts`, `workspace-chrome.tsx`), `docs/product-workspaces.md` | How a product is assembled from its pages, declared in the configuration and written down in the product's guide: the one layer that is not a folder of components |

A product's data comes from `src/data/` (`collections.ts`, where actions and the assistant change records; `read.ts`, the pages' authorized cached read; `access.ts`, who may do what) and the modules beside it, and nowhere else; the sample (ZZ Meridian's own dashboard) that the Atlas, the previews and the template's sample pages read lives in `src/system/fixtures/`. Formatting comes from `src/lib/format.ts` and `src/lib/format-date.ts`. A page template arranges patterns for a kind of page and keeps no state; outside its `preview.tsx` it imports nothing from `@/data`, `@/views`, `@/system` or `@/app.config`. Managed code may ask the configuration only for `app`, `nav`, `slug` and the types `NavGroup` and `NavItem`, which every project's `src/app.config.ts` exports (`tests/template-consumers.test.tsx` holds this). Before a template is `beta`, each of the seven states (Normal, Loading, Empty, Filtered-empty, Error, Partial, Read-only) has a disposition in the `## States` table of its README, either `Covered:` naming the preview specimen that draws it, or `Inapplicable:` with the reason; `tests/atlas-template-contracts.test.tsx` holds the two to each other, and a new template's preview is added to it. A component never imports data: it defines the types it renders (`ActivityEvent`, `Incident`, `Service`) and data conforms to them.

## Card anatomy

Every card's README follows the same order, so a reader always knows where to look. Leave a section out only when it cannot apply.

1. `# Name`, then one sentence: what it is and the job it does.
2. **Anatomy**: the numbered parts.
3. **Variants** and **Sizes**: every dimension, colour, type, spacing and radius, by token and in pixels.
4. **States**: rest, hover, pressed, focus, selected, disabled, loading, empty, error, each with its transition (property, duration token, curve).
5. **Behaviour**: interaction, keyboard, timing.
6. **Surfaces**: console, mobile (under 1024px) and embed (an MCP App): what changes on each, or "same", and why.
7. **Agents**: what an agent may read here, what it may do (and through which proposal), and how its work is marked. Write "Not applicable" for purely presentational parts. A page or a view that shares a context (`useShareView`, decision 0011) adds **What the agent reads** under it: what its context says, with a real line of it, and what each consumer receives (the MCP App through `ui/update-model-context`, the console's assistant in its prompt). A page with a view tool also adds **What the agent does here**: a line `Protagonist: <name>.` naming the card worth asking about, then at least three items `- "<question>" — <what the prepared query is asked>`, each a question a person on the page asks that its context does not answer alone. The page marks that card `data-protagonist="<name>"`, on a wrapper whose display is `contents` (in a `2/3` or `1/3` row, where the row gives its first or last card the wider span, the wrapper is itself that grid item, `flex min-w-0 flex-col` with its card stretched to fill it: a `contents` wrapper draws no box, so the span would land on nothing), and gives it an Ask. Settings, the Atlas, Docs and the embed views have no view tool of their own and carry none.
8. **Accessibility**: roles, names, keyboard, and contrast quoted from `node scripts/contrast.ts --all` (the dark theme and the indigo accent, the defaults; add light where it differs in kind).
9. **Content**: copy rules with real strings.
10. **Do and do not.**
11. **Implementation**: the import, the props that matter, and an example.

Patterns add **Composition** (which components, nesting, spacing) and **Data** (what the figures are and how they are computed or labelled). Pages add **Structure** (rows in order, the pattern each uses, the split at each width), **States** (loading, empty, error, partial) and the **Embed view** that summarises them.

## The preview contract

- `preview.tsx` is a client component with a default export and no props. It imports the card's own `index.tsx` and only the helpers in `src/system/specimen.tsx` (`Specimen`, `State`, `Plane`).
- Show every variant and state statically, each labelled. Simulate hover, focus and pressed with a `data-preview-state` prop or a class that reproduces the real values; never ask the reader to hover to find a state.
- Use real content from the sample (ZZ Meridian itself), never lorem ipsum.
- Take every colour from a token. No hex, no `rgb()`, no Tailwind arbitrary colour. The Atlas renders each preview in both themes, every accent and both densities, so a literal colour shows up wrong at once.
- No network, no timers that never stop, no portals for the states you show (render the open state inline).

## Lifecycle

| Status | Means | To enter it |
|---|---|---|
| `draft` | Being specified; may change without notice. Do not build from it. | A folder with a README and a preview |
| `beta` | Fully specified, not yet proven in a product. Build from it; expect small changes. | Every state, both themes, every surface; the checks pass |
| `stable` | Built in a product and through at least one review. Changes are recorded in the changelog. | Used by a page here and reviewed; no open defects |
| `retired` | Replaced. Deleted in the change that replaces it, with a changelog line saying what to use instead. | |

Write the status on the line under the title: `Status: beta`.

## Done means

- Every state is specified and previewed: rest, hover, pressed, focus, selected, disabled, loading, empty, error.
- It holds in both themes, all four accents and both densities, with contrast computed in each by `pnpm contrast`: text 4.5:1, focus rings, control outlines and chart marks 3:1. A new pair goes into `scripts/lib/contrast-pairs.ts`, which the checks and the Atlas colour page both read.
- It holds at the widths `node scripts/audit.ts` measures, 2560, 1440, 1024, 768, 390 and 320px, and in an embed at 720 and 420px, inline and in fullscreen.
- Nothing scrolls sideways, nothing clips, and no label shrinks to fit (cut words instead).
- Under reduced motion it shows its final state with nothing moving.
- Keyboard: every control reachable, operable and visibly focused; focus order follows reading order.
- An agent's work in it is marked (Agent mark, "via" attribution, or a Proposal); no agent write happens without one.
- A page shares a context both agents read: its scope and freshness, every figure with its unit, change and definition, what code derived from them, and what the data cannot say, within 2,600 characters. A figure an agent would otherwise recompute is computed in the context.

## Tools

`docs/testing.md` is the testing standard: the kinds of test, the tiers that combine them, when each runs, the rules a red, a limit and a release follow, and each check's size, type, tier and cost. The When column below uses its moments.

| Command | What it does | When |
|---|---|---|
| `pnpm test:t1` | The static checks, then the Tier 1 tests the import graph reaches from the changes since the last green run | After each change |
| `pnpm test:t2` | The same for the affected Tier 2 tests (`*.perf.test.ts(x)`), with the affected Tier 1 tests and the browser function sweeps, which are Tier 1 and need a build and Chrome | After a change to shared components, the shell or data; after a Tier 2 or Tier 3 phase |
| `pnpm test:release` | Every Tier 1 and Tier 2 test, once, with the browser sweeps, the timed browser suites, lint, the type check and a production build | Weekly in CI, and by hand when a question calls for it; a release does not run it locally |
| `pnpm tokens` | Generates the token CSS and the Tailwind bridge from `tokens/` (`--check` only compares) | After any token change |
| `node scripts/contrast.ts [--all]` | Every specified foreground on its background, in every theme and accent, and the chart palette's colour-vision checks | Every test command |
| `node scripts/registry.ts` | Regenerates the Atlas registry from the card folders (`--check` only compares) | After adding or renaming a card |
| `rm -rf .next` before the next build, after editing a card's `README.md` | A production build in a working `.next` can serve the prerendered copy of the old text while the client hydrates the new one, which React reports as error #418 on that Atlas page | After changing what a card's page says |
| `node scripts/check.ts` | Every card has its README and preview, every README follows the anatomy, no literal colour in components, every token a spec names exists, every embed view is a route, an element that claims a control's role has a key handler, and every page with a view tool has its **What the agent does here** | Every test command |
| `pnpm typecheck`, `pnpm lint` | TypeScript and ESLint | Inside `pnpm test:release` |
| `node scripts/audit.ts [--atlas]` | Diagnostic, with the app running: every page and embed view at six widths in both themes, for layout and accessibility defects | Directly, when a question is about the component surface |
| `node scripts/vitals.ts [--atlas]` | Diagnostic, with a production build running: LCP, INP, CLS and dropped frames on a mid-range phone | Directly, on a quiet machine |
| `node scripts/interactions.ts` | Diagnostic, with the app running: presses every control and follows every link | Directly, after a change that could break a control |
| `node scripts/keyboard.ts` | Diagnostic, with the app running: Tab through each page and back | Directly, after a change to focus or order |
| `pnpm exec vitest run tests/deep- --no-file-parallelism` | The browser-fixture tests of the check scripts: each planted defect is found and each corrected twin passes | Inside `pnpm test:t2` when a script changed, and inside `pnpm test:release`; Meridian's repository only |
| `node scripts/brand.ts --name … [--hue … --chroma …]` | Renames and rebrands a copy in place; a brand hue becomes an accent preset that holds contrast in every theme | Starting a project |
| `node scripts/shot.ts <routes> --width 1440,390 --theme light,dark [--whole-page]` | Screenshots into `out/shots/` | While editing |

A check is code, and it is wrong in the ways code is. Before a new check, or a change to one, is trusted:

- **It fails on purpose first.** Plant the defect in a fixture page (`scripts/fixtures/deep/`), add its case and its corrected twin to `expected.json`, and watch the old check pass the broken page and the new one fail it. A check that has only ever been seen green is a hypothesis.
- **It is tried on a shape it was not built for.** Run it over every route it will ever meet (`audit.ts --atlas`, the product's own routes, an adopter's if one is at hand) before it becomes a failure, and read what it reports: each line is a defect to fix or a rule that was too wide. Two defects in one night were in the checks themselves, and both were found by somebody else's route.
- **It measures in one set of conditions.** Every check opens a page at 1x unless `DPR` says otherwise; only `scripts/shot.ts` draws at 2x. Anything with a duration in it is measured throttled (`scripts/vitals.ts`), never by an unthrottled page opened by hand.
- **It says what it reached.** A run that visits fewer pages than its name promises prints that, or fails; it never goes on quietly with less.

## Releasing

1. Add an entry to `CHANGELOG.md` under a new version. Semver: a removed or renamed token, prop or card is major; a new card, token or variant is minor; a corrected value is a patch. Say in one line what breaks and what to do instead.
2. `node cli/scripts/set-version.ts <v>`, then `node scripts/check.ts`. A release that changes the checks themselves (a check script, a tier, a budget) first meets the `Releases` rule in `docs/testing.md`.
3. Commit and push to `master`, then dispatch once: `gh workflow run release.yml -f version=<v>`. The workflow's jobs are the proof: the static stage, four browser sweeps, the deep tests a change reaches and the consumer smoke from the tarball. Tier 2 runs beside them and never blocks. It then publishes with provenance, checks the registry's tarball is the tested one, and tags last. `pnpm test:release` with the Postgres references runs weekly (`.github/workflows/weekly.yml`).

The `/release` command (`.claude/commands/release.md`) is this procedure as a runbook.

## Decisions

A choice someone would otherwise argue again gets a record in `decisions/`: the context, the decision and what it costs. Supersede a record with a new one; never rewrite an old one.

## Writing

Everything in this repository is in English. Write plainly: short sentences, the reader's words, no hype. Interface copy is sentence case, names the thing a person controls rather than how it is built, and says exactly what a control does ("Rotate key", not "Submit").

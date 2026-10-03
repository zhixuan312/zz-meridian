# Contributing to Meridian

This repository is the single source of truth for how a Meridian dashboard looks, reads, moves and behaves, on every surface and for both kinds of operator. Every change starts here: specify it, build it, check it, release it.

## Before you propose something

A new card passes two questions before anyone specifies it:

- **Useful.** Name the job in one sentence, the page that needs it now, and the principle it serves. A card for an imagined future need is not proposed.
- **Unique.** Nothing in the system already does the job. Look one layer down first: a page need is met by arranging patterns, a pattern need by composing components, a component need by combining tokens and base roles. Go down a layer only when the layer below truly cannot express it.

## Making something new

1. **Name the job** in one sentence, and the principle it serves.
2. **Look one layer down.** Build up, never sideways.
3. **Derive, do not invent.** Size from the control heights and the 4px scale, colour from the role it plays, motion from the three curves and the duration tokens. If a value is missing, add a token named by its role in `tokens/` (both themes when it is a colour) with a description, and regenerate.
4. **Build the card**: a folder in its layer holding `index.tsx` (the component), `preview.tsx` (every state) and `README.md` (the specification).
5. **Check it** against "Done means" and run `pnpm gate`.

## Where things live

| Layer | Folder | Holds |
|---|---|---|
| 0 Tokens | `tokens/` | DTCG 2025.10 files; `scripts/tokens.ts` generates `src/styles/tokens.css` and the Tailwind bridge `src/styles/theme.css` |
| 1 Base | `src/styles/base.css`, `src/styles/motion.css`, `src/components/base/` | Element defaults, text roles, motion, the shell, surfaces, the app mark |
| 2 Components | `src/components/ui/` | Single-purpose parts |
| 3 Patterns | `src/components/patterns/`, `src/components/charts/` | Components composed for one dashboard job |
| 4 Pages | `app/(dashboard)/`, `app/embed/`, `src/views/` | Routes (console and embed); a view shared by both lives in `src/views/` |

A product's data comes from `src/data/` and nowhere else; the sample (ZZ Meridian's own dashboard) that the Atlas, the previews and the template's sample pages read lives in `src/system/fixtures/`. Formatting comes from `src/lib/format.ts` and `src/lib/format-date.ts`. A component never imports data: it defines the types it renders (`ActivityEvent`, `Incident`, `Service`) and data conforms to them.

## Card anatomy

Every card's README follows the same order, so a reader always knows where to look. Leave a section out only when it cannot apply.

1. `# Name`, then one sentence: what it is and the job it does.
2. **Anatomy**: the numbered parts.
3. **Variants** and **Sizes**: every dimension, colour, type, spacing and radius, by token and in pixels.
4. **States**: rest, hover, pressed, focus, selected, disabled, loading, empty, error, each with its transition (property, duration token, curve).
5. **Behaviour**: interaction, keyboard, timing.
6. **Surfaces**: console, mobile (under 1024px) and embed (an MCP App): what changes on each, or "same", and why.
7. **Agents**: what an agent may read here, what it may do (and through which proposal), and how its work is marked. Write "Not applicable" for purely presentational parts.
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
| `beta` | Fully specified, not yet proven in a product. Build from it; expect small changes. | Every state, both themes, every surface; the gates pass |
| `stable` | Built in a product and through at least one review. Changes are recorded in the changelog. | Used by a page here and reviewed; no open defects |
| `retired` | Replaced. Deleted in the change that replaces it, with a changelog line saying what to use instead. | |

Write the status on the line under the title: `Status: beta`.

## Done means

- Every state is specified and previewed: rest, hover, pressed, focus, selected, disabled, loading, empty, error.
- It holds in both themes, all four accents and both densities, with contrast computed in each by `pnpm contrast`: text 4.5:1, focus rings, control outlines and chart marks 3:1. A new pair goes into `scripts/contrast.ts`.
- It holds at 390, 768, 1024, 1280 and 1440px, and in an embed at 360 and 720px inline and in fullscreen.
- Nothing scrolls sideways, nothing clips, and no label shrinks to fit (cut words instead).
- Under reduced motion it shows its final state with nothing moving.
- Keyboard: every control reachable, operable and visibly focused; focus order follows reading order.
- An agent's work in it is marked (Agent mark, "via" attribution, or a Proposal); no agent write happens without one.

## Tools

| Command | What it does | When |
|---|---|---|
| `pnpm gate` | Every check below, in order | Before every commit |
| `pnpm tokens` | Generates the token CSS and the Tailwind bridge from `tokens/` (`--check` only compares) | After any token change |
| `node scripts/contrast.ts [--all]` | Every specified foreground on its background, in every theme and accent, and the chart palette's colour-vision checks | Gate |
| `node scripts/registry.ts` | Regenerates the Atlas registry from the card folders (`--check` only compares) | After adding or renaming a card |
| `node scripts/check.ts` | Every card has its README and preview, every README follows the anatomy, no literal colour in components, every token a spec names exists | Gate |
| `pnpm typecheck`, `pnpm test` | TypeScript and the behaviour tests | Gate |
| `node scripts/audit.ts` | With the app running: every page and embed view at 1440, 1024, 768 and 390px in both themes (embeds at 720 and 420 on a simulated host ground). Fails on sideways scroll, text clipped without an ellipsis, a control with no accessible name, more than one page scroller, rendered text under its WCAG minimum, a Tab stop with no visible focus ring (it presses Tab through the page), and any uncaught exception or console error. Prints the design metrics: type sizes, weights, radii and the hierarchy ratio | Before release |
| `pnpm verify [--quick] [--extra /orders/1]` | The gate, a production build, the built app served on a free port, and the full browser audit against it; the report in `out/verify.txt` | Before release, and after every change in a project built from Meridian |
| `node scripts/brand.ts --name … [--hue … --chroma …]` | Renames and rebrands a copy in place; a brand hue becomes an accent preset that holds contrast in every theme | Starting a project |
| `node scripts/shot.ts <routes> --width 1440,390 --theme light,dark [--full]` | Screenshots into `out/shots/` | While designing |

## Releasing

1. `pnpm gate` until it passes, then `node scripts/audit.ts` against a running build.
2. Add an entry to `CHANGELOG.md` under a new version. Semver: a removed or renamed token, prop or card is major; a new card, token or variant is minor; a corrected value is a patch. Say in one line what breaks and what to do instead.
3. Commit.

## Decisions

A choice someone would otherwise argue again gets a record in `decisions/`: the context, the decision and what it costs. Supersede a record with a new one; never rewrite an old one.

## Writing

Everything in this repository is in English. Write plainly: short sentences, the reader's words, no hype. Interface copy is sentence case, names the thing a person controls rather than how it is built, and says exactly what a control does ("Rotate key", not "Submit").

# ZZ Meridian

ZZ Meridian (Meridian, for short) is the ZZ family's design system for dashboards, and a working template built on it: one set of tokens, five layers of React components and a set of pages that hold at a desk, on a phone, and inside a conversation where an agent reads the dashboard with you.

It is written so a new dashboard starts from a running product, not a blank page: clone it, rename it in one command, add one data module, and the rails, charts, tables, states, themes and the agent surface are already there and already consistent. The Design Atlas at `/system` is the specification, read from this repository; the template at `/` is the proof.

## Principles

These govern every layer. When two choices both fit the specs, pick the one that serves these better.

**One protagonist per view.** Every page leads with the one thing it exists to show: a featured figure, a table, a form. It gets the size, the accent and the light; everything else is the supporting cast in ink and hairlines.

**Colour carries meaning.** The accent marks the primary action, where you are, and the one figure or mark that carries the finding. Positive, warning and critical mean good, attention and bad, and nothing else. Chart hues are identities in a fixed order. A colour keeps its job in both themes; only its value moves.

**Numbers are exact and honest.** A missing value reads as a dash, never as zero. Every figure says its period and its unit; every chart has a table behind it; a stale feed says it is stale. Large figures are set tight, with the unit and the fraction stepped down so the number reads first.

**Calm, then precise.** The ground is quiet and lit; motion explains a change and stops. Data arrives once, in reading order; nothing loops but a live dot and a skeleton; reduced motion shows the final state.

**Every surface, every operator.** A view holds on the console, on a phone and as an MCP App in a host. It is addressable, legible to a model, and safe to share with an agent: the agent reads anything, changes nothing without a person, and leaves its name on what it did.

**Build up, never sideways.** Everything is assembled from the layer beneath it. A new page is an arrangement of patterns; a new pattern is an arrangement of components; a new value is a last resort, named by its role.

## The five layers

| Layer | What it holds | Rule | Where |
|---|---|---|---|
| 0 Tokens | Values only: colour, type, space, radius, elevation, motion | Named by role, never by value | `tokens/` (DTCG 2025.10), generated into `src/styles/tokens.css` and the Tailwind bridge |
| 1 Base | The ground and its light, element defaults, text roles, motion, the shell, the surfaces | Uses only tokens | `src/styles/`, `src/components/base/` |
| 2 Components | Single-purpose parts: button, field, table, dialog, badge, tabs… | Never knows which page it is on | `src/components/ui/` |
| 3 Patterns | Components composed for one dashboard job: rail, featured metric, Meridian charts, data table, proposal | Uses only the layers below | `src/components/patterns/`, `src/components/charts/` |
| 4 Pages | Routes on the console and views in an MCP host | Adds no styling of its own | `app/(dashboard)/`, `app/embed/`, `src/views/` |

A change at the bottom moves everything above it, and nothing above may invent a value of its own.

## Three surfaces, two operators

| Surface | Where | Navigation |
|---|---|---|
| Console | A window 1024px and wider | The rail, the command palette (⌘K) |
| Mobile | Under 1024px | A drawer, the command palette |
| Embed | An MCP App in a host such as a chat client: inline beside a tool result, or fullscreen | None; one view per tool, Expand and Open in the console |

People point, tap and type; agents call tools. Both use the same views, under five rules: addressable, legible, consent, provenance and handoff. `docs/surfaces.md` and `docs/agents.md` say how.

## The signature

**The Meridian** is one time cursor shared by every chart and tile on a page. Point at a day in any chart, or move through it with the arrow keys, and every chart draws the same line and every figure reads that day. In an MCP host the same day is told to the model, so "why did this happen?" has a referent.

## Themes, accents and density

Dark is the default, written on `:root`; the light theme follows the operating system or an explicit choice. Four accent presets (indigo, cobalt, jade, graphite) each set only a hue and a chroma; the theme owns lightness, so contrast holds by construction. Two densities (comfortable, compact) change the control heights and the rhythm, never the type. All three are attributes (`data-theme`, `data-accent`, `data-density`) on the root or on any subtree.

## This repository

| Path | What it holds |
|---|---|
| `README.md` | This page |
| `tokens/` | Layer 0: palette, core, the two themes, four accents, the compact density, and the resolver |
| `src/styles/` | `tokens.css` and `theme.css` (generated), `base.css`, `motion.css` |
| `src/components/{base,ui,patterns,charts}/` | Layers 1 to 3: one folder per card, holding the component, its `README.md` specification and its `preview.tsx` |
| `app/(dashboard)/`, `app/embed/`, `app/sign-in/` | Layer 4: the template's routes, each with its page specification |
| `app/system/` | The Design Atlas |
| `src/data/` | Your product's data seam: the only place pages read data from |
| `src/system/fixtures/` | Relay, the sample product the Atlas, the previews and the template's sample pages read |
| `src/lib/` | Formatters, dates, periods, colour maths, the host bridge |
| `docs/` | Guides: surfaces, agents, starting a dashboard, data display, voice, the benchmark |
| `decisions/` | One record per lasting decision |
| `scripts/` | Generators, gates, `brand.ts` and `verify.ts` (see `CONTRIBUTING.md`) |
| `skills/zz-meridian/` | The Claude Code skill that builds new dashboards on this template |

## Build a dashboard with Claude

The `zz-meridian` skill lets anyone build on Meridian without learning it. Install it once, for all your projects:

```sh
npx degit zhixuan312/zz-meridian/skills/zz-meridian ~/.claude/skills/zz-meridian
```

(or copy the `skills/zz-meridian/` folder into `~/.claude/skills/`, or into a project's `.claude/skills/`). Then tell Claude Code what you need, in your own words: "build an ops dashboard for our shipments", "make this admin panel look professional", "turn this schema into a dashboard". The skill reads what you already have, asks only what it cannot find out, creates the project from this template (or brings Meridian into yours), brands it, builds the pages, and runs `pnpm verify` until the project meets the standard.

## Commands

```sh
pnpm install
pnpm dev                 # the template at /, the Design Atlas at /system
pnpm gate                # tokens fresh, registry fresh, specs consistent, contrast in every theme and accent, types, tests
pnpm verify              # the gate, a production build, and the browser audit of every page against the built app
pnpm brand --name "Acme" --hue 25 --chroma 0.16   # rename and rebrand in place
```

To start a dashboard from Meridian, read `docs/start-a-dashboard.md`; to change the system, read `CONTRIBUTING.md`; for what changed, read `CHANGELOG.md`.

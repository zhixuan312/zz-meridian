# ZZ Meridian

[![npm: zz-meridian](https://img.shields.io/npm/v/zz-meridian?label=zz-meridian)](https://www.npmjs.com/package/zz-meridian)

ZZ Meridian (Meridian, for short) is the ZZ family's design system for dashboards, and a working template built on it: six layers, from one set of tokens, through four layers of React components, to a product assembled from its pages, all of which hold at a desk, on a phone, and inside a conversation where an agent reads the dashboard with you.

It is written so a new dashboard starts from a running product, not a blank page: clone it, rename it in one command, add one data module, and the rails, charts, tables, states, themes and the agent surface are already there and already consistent. The Design Atlas at `/system` is the specification, read from this repository; the template at `/` is the proof.

## Principles

These govern every layer. When two choices both fit the specs, pick the one that serves these better.

**One protagonist per view.** Every page leads with the one thing it exists to show: a featured figure, a table, a form. It gets the size, the accent and the light; everything else is the supporting cast in ink and hairlines.

**Colour carries meaning.** The accent marks the primary action, where you are, and the one figure or mark that carries the finding. Positive, warning and critical mean good, attention and bad, and nothing else. Chart hues are identities in a fixed order. A colour keeps its job in both themes; only its value moves.

**Numbers are exact and honest.** A missing value reads as a dash, never as zero. Every figure says its period and its unit; every chart has a table behind it; a stale feed says it is stale. Large figures are set tight, with the unit and the fraction stepped down so the number reads first.

**Calm, then precise.** The ground is quiet and lit; motion explains a change and stops. Data arrives once, in reading order; nothing loops but a spinner, a skeleton and a live dot; reduced motion shows the final state.

**Every surface, every operator.** A view holds on the console, on a phone and as an MCP App in a host. It is addressable, legible to a model, and safe to share with an agent: the agent reads anything, changes nothing without a person, and leaves its name on what it did.

**Build up, never sideways.** Everything is assembled from the layer beneath it. A new page is an arrangement of patterns; a new pattern is an arrangement of components; a new value is a last resort, named by its role.

## The six layers

| Layer | What it holds | Rule | Where |
|---|---|---|---|
| 0 Tokens | Values only: colour, type, space, radius, elevation, motion | Named by role, never by value | `tokens/` (DTCG 2025.10), generated into `src/styles/tokens.css` and the Tailwind bridge |
| 1 Base | The ground and its light, element defaults, text roles, motion, the shell, the surfaces | Uses only tokens | `src/styles/`, `src/components/base/` |
| 2 Components | Single-purpose parts: button, field, table, dialog, badge, tabs… | Never knows which page it is on | `src/components/ui/` |
| 3 Patterns | Components composed for one dashboard job: rail, featured metric, Meridian charts, data table, proposal | Uses only the layers below | `src/components/patterns/`, `src/components/charts/` |
| 4 Pages | Routes on the console and views in an MCP host, and the templates pages share | Adds no styling of its own | `app/(dashboard)/`, `app/embed/`, `src/views/`, `src/components/templates/` |
| 5 Product workspaces | How a product is assembled from its pages, declared in the configuration and written down in the product's guide: the one layer that is not a folder of components | A workspace is where a person looks, never what they may do | `src/app.config.ts`, `src/views/workspaces.ts`, `src/views/workspace-chrome.tsx`, `docs/product-workspaces.md` |

A change at the bottom moves everything above it, and nothing above may invent a value of its own.

The **four data layers** answer a different question: where an answer comes from. The database, `src/data/` (the one place a product's backend is touched), `src/logic/` (the business logic) and what draws it. They describe the path between records and the screen, so a data layer is not a content layer and adds nothing to the count above. `docs/data-layers.md` is the standard, and the skill ships the same text.

## Three surfaces, two operators

| Surface | Where | Navigation |
|---|---|---|
| Console | A window 1024px and wider | The rail, the command palette (⌘K) |
| Mobile | Under 1024px | A drawer, the command palette |
| Embed | An MCP App in a host such as a chat client: inline beside a tool result, or fullscreen | None; one view per tool, Expand and Open in the console |

People point, tap and type; agents call tools. Both use the same views, under five rules: addressable, legible, consent, provenance and handoff. `docs/surfaces.md` and `docs/agents.md` say how.

## The assistant

The console has its own assistant: one panel in the dashboard shell that reads whichever page is open, answers questions about what is on screen and proposes changes for the person to approve. It is off until you give it a model with the `ASSISTANT_*` environment variables, and it works on the same collections as your pages (`src/data/collections.ts`). `docs/assistant.md` covers switching it on, pointing it at your data, what keeps it safe, and what it costs.

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
| `src/components/templates/` | Layer 4: the arrangements pages share (the Records template), one folder per template with its `README.md` and `preview.tsx` |
| `app/(dashboard)/`, `app/embed/`, `app/sign-in/` | Layer 4: the template's routes, each with its page specification |
| `src/app.config.ts`, `src/views/workspaces.ts`, `src/views/workspace-chrome.tsx`, `docs/product-workspaces.md` | Layer 5: how a product is assembled from its pages, declared in the configuration and written down in the product's guide |
| `app/system/` | The Design Atlas |
| `src/data/` | Your product's data seam: `collections.ts` is where pages, actions and the assistant read and change records |
| `src/system/fixtures/` | The sample: ZZ Meridian's own dashboard, which the Atlas, the previews and the sample pages read |
| `src/lib/` | Formatters, dates, periods, colour maths, the host bridge |
| `docs/` | Guides: surfaces, agents, the assistant, starting a dashboard, data display, voice, the benchmark |
| `decisions/` | One record per lasting decision |
| `scripts/` | Generators, gates, `brand.ts` and `verify.ts` (see `CONTRIBUTING.md`) |
| `skills/zz-meridian/` | The agent skill (Claude Code, Codex) that builds dashboards on this template or brings it into yours, to the standard in `references/standard.md`; how it is evaluated is `docs/skill-evals.md` |
| `cli/` | The `zz-meridian` npm package: `create`, `adopt`, `update`, `brand` and `skill`, its build, its smoke test and the fixture apps (`docs/distribution.md`) |
| `.github/workflows/release.yml` | The release, each check once: the default verify within its time limit and the consumer path from the tarball (the release before updated; the last three weekly), then npm with provenance, the registry's bytes and provenance checked, then the tag (`.claude/commands/release.md`) |
| `.github/workflows/weekly.yml` | Weekly, seven jobs: `verify --full`, `verify --timed`, `verify --perf` in 5 shards (perf a report), the consumer smoke's recovery and failure cases, the browser-fixture tests of the checks (which a release runs too), the Postgres references against real services and the Design Atlas audit; nothing waits on it |
| `Dockerfile`, `captain-definition` | The demo deployment: the template and the Atlas behind `DEMO_PASSWORD` (`proxy.ts`, `app/sign-in/README.md`), deployed to CapRover from this repository; never in the package |

## Get a dashboard on Meridian, in one sentence

Give your coding agent (Codex, Claude Code, or any agent that can run a shell) this, with what you want in your own
words at the end:

> Run `npx zz-meridian@latest skill --global`, then follow the zz-meridian skill it installs to: [what you want, in your own words]. Done when its hand-over says the Meridian standard is met, or names what only I can decide or provide.

In Claude Code or Codex, send it as a goal (`/goal Run npx zz-meridian@latest skill --global, then …`): the agent keeps
working until the condition holds, and a separate model checks it after every turn against the hand-over, which quotes
its evidence. The sentence says what you want; the skill carries how good it has to be. It builds, renders every view at
phone and desktop width in both themes, scores each one on a scoreboard of floors (measured by
`pnpm verify --full --timed`) and craft (judged on the renders), and improves it round by round until nothing is weak,
deciding what it can find out and recording each decision it made for you. You get the finished product, the renders,
and the few questions only you can answer.

You do not choose between the package's commands; the skill does, from what you said and what is in the folder, and
names the route before it runs anything:

| You say | The skill |
|---|---|
| "Make this admin panel look professional", "change this product into our new dashboard" | `adopt` here, keeping your data layer and routes, when it is Next.js with the App Router; otherwise `create` next to it and port your pages |
| "Build an ops dashboard for our shipments", "turn this schema into a dashboard" | `create` in a new folder |
| "Based on this folder, make a new dashboard in another folder" | `create` in that folder, reading this one and leaving it untouched |
| "Update Meridian", "change our brand colour" | `update` or `brand`, in a project that already has Meridian |

`adopt` copies the components, tokens and gates in, merges the dependencies, brands it, adds Meridian's managed block to
your `AGENTS.md` (your own text there is kept byte for byte) and an empty `docs/brief.md` for your product's own
context, and installs the skill into the project. `create` writes a new, branded project with the same skill. The agent
then does the judgement: building each page on Meridian, and running `pnpm verify` until the project meets the standard
(`pnpm verify --full` after a change to shared components, the shell or data, and `pnpm verify --full --timed`, the
whole standard, before it hands over). It needs Node 22.18+, and Google Chrome for the browser checks. If your pages
call a live API, say so in the sentence: `verify --full` presses every control, Delete included, so the agent builds a
fake API first. The package (`cli/`, decision 0009) copies files and nothing depends on it afterwards; its commands are
in `cli/README.md`.

## Model your data before a page is built

A Meridian page is only as good as the model under it: a figure needs a definition, a unit and a window; a table needs a
key and a grant; an agent needs to know what it may count and what it may only propose. One prompt settles that before
anything is drawn, and its answer outlives the build — it is the file the next person reads.

Paste this into the same agent, before the build sentence:

> Model my data for Meridian, before any page is built. Read this folder first — a schema, a migration, an OpenAPI file
> or an existing data layer answers most of this — and ask me only what the folder does not say, in one batch of at most
> twelve questions. Then write the model into `docs/brief.md` (the file `adopt` and `create` leave for it), answering:
>
> 1. **Collections.** Each one's name, its key, the tenant it belongs to, every field with its type, and which of them a
>    reader may not see, which only a page may write, and which are derived rather than stored. The contract is the one
>    `src/lib/collection.ts` declares.
> 2. **The day.** Which field says when a record happened, and what a day means for it — the time zone the product
>    counts in, so "today" and "the last 7 complete days" mean one thing on every figure.
> 3. **Money.** Which fields are amounts, in which currency, and whether one row can be in a different currency from the
>    next.
> 4. **Figures.** For every figure the dashboard will show: its name, its unit, what it changes against (the window
>    before, a target, a baseline), and its definition in one sentence a stranger could apply to a row.
> 5. **Grants.** What each role may read and write, in the `resource:operation` form `src/data/access.ts` asks, and which
>    collection each grant names. Say what a person with the smallest role still has to see for the product to make
>    sense — that is what decides which views they get.
> 6. **Questions.** For each page: the three questions someone on that page would ask that the page's own text does not
>    answer — what must be countable, groupable or comparable, and over which collections.
> 7. **Writes.** What an agent may propose on each page, and what stays the page's own — the fields a change must never
>    set.
>
> Where the answer is a choice, give me the two or three options with the figure each produces, and recommend one. End
> with one table: figure · definition · source · unit · window. The build reads that table, not the prose above it.

Then give the build sentence above. The agent reads the brief first, and every figure on the page it builds is one the
brief defines — which is also how you tell a wrong rendering from a wrong model.

## Privacy and feedback

Meridian takes nothing from you. The package, the template and the skill have no telemetry, no analytics and no
account, and the template turns off Next.js's own anonymous telemetry (`next.config.ts`; Meridian's scripts turn it off
for every `next` they run). What reaches the network is what you would expect: npm, when you run `npx` and when `update`
reads releases from it, and whatever you configure yourself, such as the assistant's model provider. The typefaces ship
with the template (`src/styles/fonts/`), so a build fetches nothing.

The one way to tell us anything is a [GitHub issue](https://github.com/zhixuan312/zz-meridian/issues/new/choose): a
**Bug** (something in Meridian did the wrong thing) or a **Feature request** (something it should do, or do more
easily). Issues are public, so leave out anything that identifies you, your organisation or your product: names,
email addresses, URLs, your data and schemas, screenshots of your pages. Describe the problem with Meridian's own
template or sample data instead. At the end of a build the skill may offer to draft one with all of that removed; it
files nothing unless you say yes.

## Commands

```sh
pnpm install
pnpm dev                 # the template at /, the Design Atlas at /system
pnpm gate                # tokens fresh, registry fresh, specs consistent, contrast in every theme and accent, types, tests
pnpm verify              # the gate once, one production build, the size checks and a smoke of up to three routes
pnpm verify --full       # every route, every control and link, the keyboard walk, the assistant and the product's own checks; no time is judged
pnpm verify --timed      # the navigation budgets, the live data and Web Vitals; needs a quiet machine, runs alone and last
                         # (the browser suites look inside open shadow roots; validation.md says what each line means)
pnpm brand --name "Acme" --hue 25 --chroma 0.16   # rename and rebrand in place
```

To start a dashboard from Meridian, read `docs/start-a-dashboard.md`; to change the system, read `CONTRIBUTING.md`; for what changed, read `CHANGELOG.md`.

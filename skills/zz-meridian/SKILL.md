---
name: zz-meridian
description: >
  Build a production-quality dashboard frontend on Meridian, a dashboard design system and Next.js template (dark-first,
  DTCG tokens, React components, charts, tables, MCP App views for AI hosts), then validate it against Meridian's
  standard. Use this whenever someone wants to build, scaffold, start, redesign or restyle a dashboard, admin console,
  analytics page, internal tool, ops or monitoring UI, back office, or an MCP App view, whether they give a one-line
  idea, a spec, a data schema, screenshots, or an existing frontend to improve. Use it even when they don't say
  "Meridian" or "design system": "I need an admin panel for our orders", "make our dashboard look professional",
  "turn this CSV into a dashboard", "add a console to this repo".
---

# Build a dashboard on ZZ Meridian

Meridian turns a description of a product into a running, branded, validated dashboard. The person you are helping
should not need to learn Meridian: they describe what they need, you do the homework, ask only what you cannot find out,
build it, and prove it meets the standard with one command.

The template lives at `https://github.com/zhixuan312/zz-meridian`. Its own `README.md`, `CONTRIBUTING.md`
and `optional:docs/` are the full specification; this skill is the route through them. If you are reading this file inside a
clone of the template (for example `/tmp/meridian/skills/zz-meridian/SKILL.md`), that clone is the template: use it
wherever a step fetches the template, and read the references next to this file.

## The rules that always hold

These hold in every project, however it started, and nothing below overrides them.

- **Build up, never sideways.** A page arranges patterns, a pattern composes components, a component is built from
  tokens. A value you need is a token, never a literal.
- **Never a literal colour, and never a Tailwind utility outside Meridian's scales.** `node scripts/check.ts` fails on
  both; the utilities render nothing (see "Things that render nothing" in `references/customize.md`).
- **Tokens are generated.** After a change in `tokens/`, run `pnpm tokens`. Never edit `src/styles/tokens.css` or
  `src/styles/theme.css`.
- **Agents read freely and write only through a Proposal.** Mark agent work with the Agent mark and "via"
  (`references/agents.md`).
- **Before finishing, run `pnpm verify`; after a change to shared components, the shell or data, run `pnpm verify --full`.
  Never against a live backend.** `--full` presses every control, Delete included, so a project whose pages call a live
  API or read a database names a `fakeApi` (or says `noLiveApi`) in `scripts/verify.config.ts` first
  (`references/existing-project.md`, step 5).

## Choose the route before anything else

Whatever the words, the person wants one thing: a dashboard on Meridian. What you decide is **where its code lives**
and **which folder you may write to**, and that picks one of four commands. People rarely name the command, so read
the intent, not the verb: "change this product into our new dashboard", "redo this with Meridian", "make a new one
based on this folder in another folder" and "build me an orders console" are all requests for a dashboard; they
differ only in which folder ends up holding it.

| What is true | The route | The command |
|---|---|---|
| `optional:.meridian/manifest.json` exists in the folder they point at | Already on Meridian: update, rebrand or keep building | `update` or `brand` (the next section), or straight to step 5 |
| They want **this** project changed in place ("restyle this", "change this product into our dashboard", "make our admin look professional"), and it is Next.js with the App Router | Adopt, here | `npx zz-meridian@latest adopt` (`references/existing-project.md`, Route A) |
| They want this project changed, and it is another stack (Vite, CRA, Remix, Vue, a static page) | A new project next to it, ported from it | `create <sibling folder>` (`references/existing-project.md`, Routes A2, B, C) |
| They want a **new** dashboard: in another folder, "based on" or "from" this folder, a schema, a CSV, a spec or nothing | Create, elsewhere; what they pointed at is input you read, never a folder you write | `npx zz-meridian@latest create <new folder>` |

Rules that settle the hard cases:

- **The folder they name to read from is not the folder you write to unless they said "this", "here" or "in place".**
  "Based on this folder", "use this as the source", "copy what this does" mean: read it, create next to it, leave it
  untouched.
- **`create` writes only into a folder that does not exist or is empty**, and **`adopt` changes the project it runs in**.
  Never run `adopt` in a folder they asked you to leave alone, and never `create` inside an existing project.
- **Two routes fit and nothing decides between them** (an existing Next.js app here and "build me a dashboard for
  this"): ask once, with in place (`adopt`) as the recommended option when they said "this" or "our", and a new folder
  (`create`) when they said "new" or "another". With no way to ask, take that recommendation and say so in the
  hand-over.
- **Say the route in one sentence before the first command**: "This is a Next.js App Router project you want changed
  in place, so I am running `adopt` here." A wrong route is cheap to stop before the command and costly after it.

## Updating or rebranding a project that already has Meridian

When `optional:.meridian/manifest.json` exists and the person asks to update Meridian, or to change the brand, do not
follow steps 1 to 8: the project is already built.

- **Update.** Read `references/update.md` and follow it: `npx zz-meridian@latest update --dry-run` first, then the real
  update, the resolutions it asks for, and the pinned `--finalize` command it prints (with `--resume` and `--abort` for
  an interruption or a change of mind). Read `references/ownership.md` for which files are Meridian's and which are the
  team's; an update changes only the first, and a team keeps one of its own on purpose through `optional:.meridian/keep.json`.
  Moving to 0.5.0 reports up to ten migrations for the interfaces that release changed (the removed verify flags, the
  assistant promise, the required clock, Cache Components, authorized reads, scoped invalidation, the live stream, the
  authorized endpoints); `references/update.md` says how to resolve them, and `references/cache.md` and
  `references/live.md` hold the starters and the shapes they move to.
- **Rebrand.** `npx zz-meridian@<the manifest's version> brand [brand flags]`, from a clean git tree. Never hand-edit the
  brand outputs; an edited one makes it refuse.

## 1. Do the homework first

Before asking anything, look at what you already have:

- **The working directory.** Is there a frontend? Read `package.json` (framework, React version, Tailwind), the routes,
  and how data is fetched. Note what exists so you can offer "restyle this" as a real option.
- **What the person gave you.** A spec, a schema, a CSV, an API description, screenshots, a brand guide. Extract the
  entities, the metrics that matter, the lists people browse, the actions they take, and any brand colour.
- **What you can infer.** A product that tracks orders needs an orders list and an order page; a monitoring tool needs
  health; anything with money needs period selection and deltas. Draft the page list yourself.

## 2. Ask once, briefly

Ask in a single round (AskUserQuestion when available), only the questions your homework could not answer, and offer
your draft as the recommended option so the person can accept it in one click. Usually that is:

1. **New project or this one?** Only when "Choose the route" above left two routes open: create a new Meridian project
   in another folder, or bring Meridian into the existing one (`references/existing-project.md`).
2. **What it is and for whom.** The product name, who uses it, and the one question the home page must answer.
3. **Pages.** Your drafted list, mapped to Meridian presets (Overview, list, detail, analytics, health, settings, sign-in).
4. **Brand and surfaces.** A brand colour (a hex, or "no preference" for indigo), light or dark first (dark is the
   default), and whether it should also appear inside AI assistants as an MCP App.

Skip what the request already answers ("this project, keep our data and routes" answers the first). When the request
hands you the whole job in one sentence, or you have no way to ask, do not stop to ask: take your drafts (the product
name from their app, the brand colour from their existing styles or logo, dark first, no MCP views), write them into
the brief (step 3), and list them in the hand-over so the person can change any of them in one line.

## 3. Get the template, branded

For an existing frontend, follow `references/existing-project.md` instead: its first step is
`npx zz-meridian@latest adopt`.

For a new project (the folder must not exist yet), with the step-2 answers as flags:

```sh
npx zz-meridian@latest create <target> --name "<Product>" --workspace "<Workspace>" --timezone "<IANA zone>" \
  [--currency <ISO 4217>] [--user "<Name>" --role "<Role>"] \
  [--accent indigo|cobalt|jade|graphite | --hex '#RRGGBB' | --hue <0-360> --chroma <0.10-0.18>]
cd <target>
```

It copies the template, brands it, installs the dependencies, initialises git, installs this skill into the project
(`optional:.agents/skills/`, `optional:.claude/skills/`) and records every file in `optional:.meridian/manifest.json`. The person gets their
dashboard, not a copy of the design system: the Design Atlas, the card and page specifications, `optional:docs/`, `decisions/`
and the changelog are left out, and the README and AGENTS.md are written for their product. To look a component up
while building, read it in the template on GitHub (`src/components/<layer>/<card>/README.md`).

Every product name, sample address and MCP tool name follows `--name`, so nothing of the template's own name is left
behind. A brand colour goes straight in as `--hex`: the OKLCH hue and chroma are derived (chroma capped at 0.18; the
theme sets lightness so contrast holds), registered everywhere, and checked by the contrast gate in every theme. To
change the brand later, run `npx zz-meridian@<the manifest's version> brand` with the new flags; never `node scripts/brand.ts`, which the manifest does not record.

Requirements: Node 22.18 or newer; pnpm is used when installed, npm otherwise. The browser checks use Google Chrome
(`CHROME=/path/to/chrome` if it is not where the platform keeps it). If any is missing, say so plainly and stop before
step 6 rather than skipping validation. In a sandbox without network or a browser, ask for the access these steps need
(the package install, starting Chrome and a local server for verify) instead of working around it.

Now fill the brief, so the decisions survive the conversation.

`adopt` and `create` have already written `optional:docs/brief.md` as a template with five sections: Product, Users,
Data, Decisions and Glossary, each holding one guidance line. If the file is missing (an older project), write it
from this template:

```md
# Product name

## Product
What this dashboard is for, in two or three sentences: who opens it, what decision it helps them make.

## Users
Who uses it and how often; what they know already; what they must never be shown.

## Data
Where the numbers come from (systems, tables, APIs), how fresh they are, and what now means for this product.

## Decisions
Brand, layout and behaviour choices already made, one line each with its reason, so no session re-decides them.

## Glossary
The team's own words for things, one per line: term and what it means here.
```

Replace each guidance line with the person's own answers from step 2, in English. Never invent a product fact: a
section they have not answered keeps its guidance line, and `node scripts/check.ts` warns about it until it is written.
No secrets go into the brief (no keys, tokens, passwords or connection strings): the assistant and every later session
read it. The template's assistant reads Product, Users and Glossary, so those three say what a stranger needs to
answer a question about this product.

## 4. Check the brand colour

Status colours own three hues: critical near 22°, warning near 68°, positive near 158°. A brand hue within 20° of one
(a red, amber or green brand) makes every button and selection read as an alert or as "healthy", and the script prints
a warning when it happens. Do not ship it silently: tell the person, and offer graphite or the nearest hue 20° or more
away, with the exact brand colour kept in the logo mark. If they keep it, keep the accent off figures and statuses: no
`emphasis` on Metric tiles, and accent only on actions and selection.

## 5. Build the product

Read `references/customize.md` and follow it. In short:

- **Reads, writes and live data go through the access seam.** Pages read with `read()` and writes invalidate their tenant
  (`references/cache.md`); the console keeps its tables fresh over one stream per tab (`references/live.md`, which also
  says plainly why the sample is a single process and holds the Postgres and Redis adapters).
- **Data first.** Write `src/data/<product>.ts` for the person's domain: real types from their schema or materials, and
  deterministic sample data until they wire their API. Pages import data from `optional:src/data/` and nowhere else. Delete the
  sample pages you replace. `optional:src/data/collections.ts` and `optional:src/data/sample.ts` import `optional:src/system/fixtures/` (and the dashboard layout imports
  `DEMO_NOW` and `ALERTS` through `optional:src/data/sample.ts`), so the fixtures and `optional:src/system/sample-cells.tsx` stay until nothing imports them:
  replace each collection's `rows` with the person's data first, then delete them. Prove the
  numbers before building pages: a `example:tests/data.test.ts` asserting the counts your pages need (vitest resolves `@/`;
  plain `node` does not).
- **Navigation** in `src/app.config.ts`; one line per page.
- **Pages from presets.** Start each page from the closest template page and change what it shows, not how it is laid
  out. Every page has one protagonist (a featured metric, a table, a form), a kicker, a title and one sentence.
- **Remove what they did not ask for**: sample pages, their nav lines, their embed views, their entries in
  `example:src/system/content.ts` (if the Atlas stays), and the links that point at them. Settings is a sample page too:
  delete it unless asked (theme, accent and density stay in the rail's appearance menu and the command palette), but the
  assistant's on/off switch ("Show the assistant") lives in Settings: keep the page, or tell the person the switch goes
  with it.
  `references/customize.md` has the checklist and the grep that finds what is left.
- **The assistant** is built in and off until `ASSISTANT_PROVIDER`, `ASSISTANT_API_KEY` and `ASSISTANT_MODEL` are set
  (`ASSISTANT_BASE_URL` is required for `openai-compatible`). Point `optional:src/data/collections.ts` at the person's data, and
  put their sign-in check in `optional:app/(dashboard)/layout.tsx`, in `optional:app/api/assistant/route.ts` and in every server action; see `references/customize.md`.
- **MCP App views** under `optional:app/embed/` only if they asked for the agent surface; see `references/agents.md`.

Build up, never sideways: use Meridian's components and tokens. A new colour, size or shadow is a token, never a literal;
a missing component is specified as a card per `CONTRIBUTING.md`. Interface copy follows `references/voice.md`: sentence case,
verbs on buttons, units and periods on every number.

## 6. Validate until it passes

```sh
pnpm verify            # the gate once, one build, the size checks and a smoke of up to three routes
pnpm verify --full     # every route, every control pressed, every link followed, the keyboard walk, the assistant, the live data
pnpm verify --perf     # the 20-sample navigation protocol
```

Stop the dev server first: verify builds and serves the app from the same folder. The default is bounded and takes about
two minutes; `--full` takes a quarter of an hour for a dozen routes (five widths and two themes for the audit, while every
control is pressed beside it); `--full --perf` runs both without repeating the gate or the build. Every run ends with a
coverage line:

```text
coverage: default; browser ran; 3 routes; data configured 3/3; interaction configured 3/3; not run: audit, presses, keyboard, assistant, live, vitals
```

It says the depth that ran, whether the browser ran (and why not), how many routes, how many have a readiness mapping
and a control mapping (`navigationChecks` in `scripts/verify.config.ts`), and which suites did not run. Nothing that did
not run is reported as passed: a project with no mappings gets a default that exits 0 for the checks it ran, with data and
interaction `configured 0/n`. `--full` and `--perf` fail on a missing mapping, a missing Chrome or an unsafe backend, and
list every gap. Finish with the default; run `--full` when the change touches shared components, the shell or data. The
audit discovers every static route; list each detail page worth seeing (a normal record, a failed one, a missing one) in
`detailRoutes` in `scripts/verify.config.ts`, with ids from your data. If the pages call a live API, give verify a fake
one first (`references/existing-project.md`, step 5): `--full` presses every control, Delete included. When something
fails, read `references/validation.md`, fix the cause (not the check), and run it again.

Then look, because a passing audit is not the same as a good page:

```sh
pnpm dev &   # restart it for the screenshots, then
node scripts/shot.ts / <the other main routes> --width 1440,390 --theme dark,light --full
```

Open the PNGs in `out/shots/`. Check that each page has a clear protagonist, that tables are balanced, that nothing
reads empty or cramped on a phone, and that the brand colour is used only where it means something. Fix and re-shoot.

## 7. Hand over

Report in this shape, in the person's language:

```
Built <Product> on Meridian at <path>.
Pages: <list, one line each, with what each answers>.
Brand: <accent and how it was derived>. Surfaces: console, mobile<, MCP views: …>.
Validation: pnpm verify passed; coverage line: <the line verify printed>.
Next steps: replace the sample data in src/data/ with <their API>; run pnpm verify after every change.
Feedback: <the issue URL from step 8, "nothing to report", or "declined">.
```

Attach or show the screenshots of the main pages in both themes. Say plainly what is sample data and what is not. If
the Atlas stays, say that `/system` is the live specification and that `node scripts/brand.ts --no-atlas` removes it
before the product goes public.

## 8. Offer feedback to Meridian

Meridian collects nothing from the people who use it: no telemetry, no analytics, no account. A GitHub issue the person
chooses to open is the only way anything reaches Meridian, so this step is an offer, never a requirement, and it
happens only when the run found something about Meridian itself.

Collect, from the whole session (not only the last step), and sort each finding into one of two kinds:

- **Bug**: a component, pattern, script, check or doc that did the wrong thing: a gate that failed on correct code, a
  check that passed broken code, a component that clipped, overflowed or did nothing, a doc that sent you the wrong way.
- **Feature request**: anything that worked but cost a workaround, a second try or a guess, and the change that would
  have saved it; and what the product needed that Meridian has no answer for (a component, pattern, state, page kind,
  surface rule, or a question this skill and the docs never answered).

Each finding gets what someone needs to act on it without asking: what happened, where in Meridian (its `file:line`,
the Meridian command, the Meridian route), how to see it again in Meridian's own template or sample data, and what you
did instead.

**Nothing in it may identify the person, their organisation or their product.** Before showing a draft, remove:

- the product's, company's, team's and people's names, email addresses and accounts;
- their URLs, hostnames, IP addresses, API routes and environment variable values;
- their data, records, schemas, field names and screenshots of their pages;
- file paths outside Meridian's own files, and anything from `optional:docs/brief.md`.

Describe the shape of the problem with Meridian's sample instead ("a Data table with 40 columns", not their table). If
a finding cannot be told without one of these, leave it out.

Draft one issue per kind, in the shape of Meridian's two issue forms, Bug and Feature request:

```
Title: <one line on the most important finding>

Meridian <version from .meridian/manifest.json> · Next <version> · Route <adopt | create>

## What happened
- <finding: what, where in Meridian, how to see it again, what you did instead>

## What would fix it
- <the change you would make to Meridian>
```

Show the draft to the person and ask whether to open it: it is published under their account, in public. Only on a
yes, file it with `gh issue create --repo zhixuan312/zz-meridian --label bug|enhancement --title "<title>" --body-file
<draft>`, or, without `gh`, give them `https://github.com/zhixuan312/zz-meridian/issues/new/choose` and the draft to
paste. Put the issue's URL in the hand-over. When the run found nothing about Meridian, or they decline, say so in one
line and file nothing.

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
and `docs/` are the full specification; this skill is the route through them.

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

1. **New project or this one?** Only when a frontend already exists here: create a new Meridian project next to it, or
   bring Meridian into the existing one (`references/existing-project.md`).
2. **What it is and for whom.** The product name, who uses it, and the one question the home page must answer.
3. **Pages.** Your drafted list, mapped to Meridian presets (Overview, list, detail, analytics, health, settings, sign-in).
4. **Brand and surfaces.** A brand colour (a hex, or "no preference" for indigo), light or dark first (dark is the
   default), and whether it should also appear inside AI assistants as an MCP App.

## 3. Get the template

For a new project (the target folder must not exist):

```sh
git clone --depth 1 https://github.com/zhixuan312/zz-meridian.git <target>
cd <target>
rm -rf .git skills
git init -q
pnpm install
```

Requirements: Node 22.18 or newer and pnpm 10 or newer (`corepack enable` if pnpm is missing). The browser audit uses Google Chrome
(`CHROME=/path/to/chrome` if it is not at the macOS default). If any is missing, say so plainly and stop before step 6
rather than skipping validation.

Now write the step-2 answers into `docs/brief.md` in the project (in English), so the decisions survive the
conversation.

## 4. Brand it

```sh
node scripts/brand.ts --name "<Product>" --workspace "<Workspace>" --timezone "<IANA zone>" \
  [--currency <ISO 4217>] [--user "<Name>" --role "<Role>"] \
  [--accent indigo|cobalt|jade|graphite | --hex '#RRGGBB' | --hue <0-360> --chroma <0.10-0.18>] --product
```

Every product name, sample address and MCP tool name in the template follows `--name`, so nothing of the template's
own name is left behind. A brand colour goes straight in as `--hex`: the script derives the OKLCH hue and chroma (chroma
capped at 0.18; the theme sets lightness so contrast holds) and prints them. It registers the accent everywhere, runs the contrast gate across
every theme, and lowers a theme's fill lightness by itself if white text would fail.

Pass `--product`: the person gets their dashboard, not a copy of the design system. It removes the Design Atlas, the card
specifications and previews, the page specifications, `docs/`, `decisions/`, the changelog and this skill, rewrites the
README and AGENTS.md for their product, and keeps everything the dashboard is built from (components, tokens, styles,
scripts and the gates). To look a component up while building, read it in the template on GitHub
(`src/components/<layer>/<card>/README.md`). Leave `--product` out only when the person is extending the design system
itself.

Status colours own three hues: critical near 22°, warning near 68°, positive near 158°. A brand hue within 20° of one
(a red, amber or green brand) makes every button and selection read as an alert or as "healthy", and the script prints
a warning when it happens. Do not ship it silently: tell the person, and offer graphite or the nearest hue 20° or more
away, with the exact brand colour kept in the logo mark. If they keep it, keep the accent off figures and statuses: no
`emphasis` on Metric tiles, and accent only on actions and selection.

## 5. Build the product

Read `references/customize.md` and follow it. In short:

- **Data first.** Write `src/data/<product>.ts` for the person's domain: real types from their schema or materials, and
  deterministic sample data until they wire their API. Pages import data from `src/data/` and nowhere else. Delete the
  sample pages you replace. `src/data/collections.ts` imports `src/system/fixtures/` (and the dashboard layout imports
  `DEMO_NOW` and `ALERTS` from it), so the fixtures and `src/system/sample-cells.tsx` stay until nothing imports them:
  replace each collection's `rows` with the person's data first, then delete them. Prove the
  numbers before building pages: a `tests/data.test.ts` asserting the counts your pages need (vitest resolves `@/`;
  plain `node` does not).
- **Navigation** in `src/app.config.ts`; one line per page.
- **Pages from presets.** Start each page from the closest template page and change what it shows, not how it is laid
  out. Every page has one protagonist (a featured metric, a table, a form), a kicker, a title and one sentence.
- **Remove what they did not ask for**: sample pages, their nav lines, their embed views, their entries in
  `src/system/content.ts` (if the Atlas stays), and the links that point at them. Settings is a sample page too:
  delete it unless asked (theme, accent and density stay in the rail's appearance menu and the command palette), but the
  assistant's on/off switch ("Show the assistant") lives in Settings: keep the page, or tell the person the switch goes
  with it.
  `references/customize.md` has the checklist and the grep that finds what is left.
- **The assistant** is built in and off until `ASSISTANT_PROVIDER`, `ASSISTANT_API_KEY` and `ASSISTANT_MODEL` are set
  (`ASSISTANT_BASE_URL` is required for `openai-compatible`). Point `src/data/collections.ts` at the person's data, and
  put their sign-in check in `app/(dashboard)/layout.tsx`, in `app/api/assistant/route.ts` and in every server action; see `references/customize.md`.
- **MCP App views** under `app/embed/` only if they asked for the agent surface; see `docs/agents.md` in the template.

Build up, never sideways: use Meridian's components and tokens. A new colour, size or shadow is a token, never a literal;
a missing component is specified as a card per `CONTRIBUTING.md`. Interface copy follows `docs/voice.md`: sentence case,
verbs on buttons, units and periods on every number.

## 6. Validate until it passes

```sh
pnpm verify            # the gate, a production build, the built app, and the browser audit of every page
```

Stop the dev server first: verify builds and serves the app from the same folder. A full run takes a few minutes for a
dozen routes (five widths and two themes for the audit, while every control is pressed beside it); `--quick` takes about
a minute. It must end with
`verify: the project meets the Meridian standard`. The audit discovers every static route; list each detail page worth
seeing (a normal record, a failed one, a missing one) in `detailRoutes` in `scripts/verify.config.ts`, with ids from
your data (`--extra` replaces them for one run). If the pages call a live API, give verify a fake one first
(`references/existing-project.md`, step 8): it presses every control, Delete included. When something fails, read `references/validation.md`, fix the cause (not the check), and run
it again. `pnpm verify --quick` is fine while iterating; finish with the full run.

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
Validation: pnpm verify passed (<n> routes, both themes, 1440 to 390px; contrast <n> pairs).
Next steps: replace the sample data in src/data/ with <their API>; run pnpm verify after every change.
Feedback: <the issue URL from step 8, or "nothing to report">.
```

Attach or show the screenshots of the main pages in both themes. Say plainly what is sample data and what is not. If
the Atlas stays, say that `/system` is the live specification and that `node scripts/brand.ts --no-atlas` removes it
before the product goes public.

## 8. Report back to Meridian

Every build teaches Meridian something. Before you finish, write down everything this run found about Meridian itself
and file it as **one** GitHub issue on `zhixuan312/zz-meridian`, so the next person does not hit the same thing.

Collect, from the whole session (not only the last step):

- **Bugs**: a component, pattern, script, check or doc that did the wrong thing: a gate that failed on correct code, a
  check that passed broken code, a component that clipped, overflowed or did nothing, a doc that sent you the wrong way.
- **Improvements**: anything that worked but cost you a workaround, a second try, or a guess, and how it could be easier.
- **Not covered**: what the product needed that Meridian has no answer for: a missing component, pattern, state, page
  kind, surface rule, or a question this skill and the docs never answered.

Each item gets what someone needs to act on it without asking you: what happened, where (`file:line`, the route, the
command), how to see it again, and what you did instead. Leave out what is the person's own (their product name, data,
URLs, credentials, screenshots of their pages); describe the shape of the problem with Meridian's sample instead.

Draft it in this shape:

```
Title: Field report: <one line on the most important finding>

Meridian <commit or version> · Next <version> · <what was built, in generic terms: "an orders console, 6 pages">

## Bugs
- <what, where, how to reproduce, what you did instead>

## Improvements
- <what cost time, and the change that would have saved it>

## Not covered
- <what was needed, and how you filled the gap>
```

Show the draft to the person and file it only when they agree: it is published under their account. File it with
`gh issue create --repo zhixuan312/zz-meridian --title "<title>" --body-file <draft>`. Without `gh`, give them a link
that opens the form filled in: `https://github.com/zhixuan312/zz-meridian/issues/new?title=<encoded title>&body=<encoded
body>`. Put the issue's URL in the hand-over. If the run truly found nothing, say "nothing to report" rather than filing
an empty issue.

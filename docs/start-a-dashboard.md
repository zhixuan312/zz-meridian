# Start a dashboard

A new dashboard starts from this repository running, not from a blank page. Seven steps take it from ZZ Meridian's own dashboard to yours; each is one file or one folder.

The fastest way is to let your coding agent do all seven: `npx zz-meridian@latest create my-dashboard --name "Acme Ops"` copies and brands the template and installs the `zz-meridian` skill into it; then describe the dashboard you need to Codex or Claude Code. The steps below are what they do, for doing it by hand.

## 1. Copy it

```sh
npx zz-meridian@latest create my-dashboard   # the template, branded, with the Atlas left out
cd my-dashboard
pnpm dev   # the template at http://localhost:3000
```

To keep the Atlas while you build, clone this repository instead (`git clone https://github.com/zhixuan312/zz-meridian.git my-dashboard`, then `pnpm install`): it serves the Atlas at `/system`, the specification of every part you are about to use. A project made with `create` has no Atlas and nothing to remove. In a clone, to ship without it, run `node scripts/brand.ts --no-atlas`: it deletes `app/system/` and the Atlas-only modules in `src/system/`, removes the two rail entries that point at `/system`, the footer link, the `/system` entries in `scripts/verify.config.ts` and the `/system/**` build tracing in `next.config.ts`. It keeps the rest of `src/system/`: every card's preview imports its specimen helpers, and the gate regenerates its registry.

## 2. Name it

`node scripts/brand.ts --name "Acme Ops" --workspace "Production" --timezone "Europe/London"` does this step (and step 3) in one command. By hand, `src/app.config.ts` holds everything that makes the product yours:

- `app.name`, `app.workspace`: the rail, the document title, the sign-in screen.
- `app.accent`: `indigo`, `cobalt`, `jade` or `graphite`. A person can still change it in Settings.
- `app.timezone`: every date and every daily bucket is cut on it.
- `nav`: the rail. Adding a page is a route file plus a line here, with the `needs` of its feature. ZZ Meridian's own dashboard also declares `workspaces` and gives each entry a `workspace`; a product with one navigation needs neither, but while `workspaces` is declared, as it is in a new project, an entry without a `workspace` is drawn by no rail and no palette (`skills/zz-meridian/references/customize.md`, "Navigation", has both ways forward).
- `facts`: what the rules behind a page's facts are handed: how many periods of history a record needs (`recordNeedsPeriods`), the thresholds whose first crossing is a fact (`firsts`), the band a steady day stays inside (`band`), and the share of the revenue of the last 30 complete days that makes a customer worth knowing across the company (`concentrationAt`). The values are the sample company's; set your own, and delete a key none of your pages passes to a rule (`docs/data-display.md`, "Facts").

Put your logo in `public/` as an SVG and set `logo: '/logo.svg'` in `app`: the mark shows it at 20, 24, 28 and 32 pixels, with an empty `alt` beside the product name. `theme: 'dark'` or `'light'` sets the default theme before anyone picks one.

## 3. Brand it, if you need more than an accent

An accent preset is two numbers. `node scripts/brand.ts --hex '#RRGGBB'` (or `--hue <0-360> --chroma <0.10-0.18>`) adds your brand's hue as a preset, makes it the default, holds contrast in every theme by itself, and warns when the hue sits within 20° of a status colour. By hand, copy `tokens/accent.indigo.tokens.json` to `tokens/accent.<name>.tokens.json`, set `accent-h` (OKLCH hue) and `accent-c` (chroma), add it to `tokens/zz-meridian.resolver.json` and set `accent` to its name in `src/app.config.ts` (the appearance menu lists it from there), then:

```sh
pnpm tokens          # regenerate the CSS
node scripts/contrast.ts   # every pair, every theme, your accent included
```

If a pair fails, lower the chroma, or give the preset a lightness override for that theme (see `accent.jade.tokens.json`).

## 4. Connect your data

Your pages, your server actions and the assistant read and change records through `src/data/`, and read nothing else: `collections.ts` holds the collections, `access.ts` says who the request is and what they may do, and `read.ts` is the pages' authorized, cached `read(name, query)`. Replace the collections with yours (rows from your API, or `arrayCollection` while you build; a collection you write by hand has an `aggregate` too, `aggregateRows` over the rows it holds or one grouped query for a database), replace the policy in `access.ts` with your session and permissions, add `src/data/<product>.ts` for any other types and queries, and point your pages at them. What the sample pages still draw as a constant (types and the regions list) comes from `src/data/sample.ts`, the daily series the sign-in page shows from `src/data/sign-in.ts`, and the bell's alerts are worked out by `readAlerts` in `src/data/alerts.ts`. The template's own sample, ZZ Meridian's own dashboard, lives in `src/system/fixtures/` because the Atlas and every card preview read it; leave it there. Shape your records to the types the patterns define (`ActivityEvent`, `Incident`, `Service`) and they render without adapters. Two rules carry over:

- Read freshness from when the data arrived (the newest ingest time), never from `now()`.
- Return `null` for "not measured"; the formatters render it as a dash, never as zero.

The console keeps its collection-backed pages (Now, Members, API keys, Tickets, Tests, Releases) fresh without a reload: one stream per tab carries a hint that names only a collection, and the page refreshes through the same authorized `read()`. The sample stream is a single process; across processes, `skills/zz-meridian/references/live.md` holds the Postgres and Redis adapters a product writes for itself.

## 5. Decide who may do what

The access layer is one folder, `src/data/`, and four edits take the sample's demo policy to yours:

1. **Sign in your own way.** `current()` in `src/data/access.ts` returns your `AccessScope` — the tenant, the person and an `authorizationKey` that changes whenever what they may see changes — or `null` when there is no session. Delete the demo's View as action and its cookie (`zz_meridian_view_as`, `src/data/view-as.ts`), which sign the request in as a sample person.
2. **Write your role table.** `src/data/roles.ts` holds `MAIN_ROLES`, `ADD_ONS` and `GRANTS`; `effective(role, addOns)` is what a member may do — their main role's grants plus every add-on's, a union with no deny — `whoCan(need)` is the roles that satisfy a need on their own, and `roleLabel(member)` is how a member reads ("Member + Key manager").
3. **Keep member writes behind the boundary, in your own transaction.** Store `role` and `addOns` on your people and let every create, update and remove pass `src/data/member-mutations.ts`: `membersFor(scope)` binds the members collection through the boundary, and `assignMemberRole({ id, role, addOns })` is the one role change. The demo serialises one write at a time per workspace with a promise queue; that is enough for a demo and not for a product — put the read, the check and the write in a database transaction your database provides, so two concurrent changes cannot both pass on a stale count.
4. **Name a feature, never a restated need.** Every nav item, page, view tool and action points at its feature's need by reference from `src/data/features.ts` (`needs: FEATURES.<id>.needs`); a page opens with `gate(feature)` from `src/data/access.ts` before it reads, and a view tool calls `requireNeed(...)` before it does.

```sh
pnpm gate   # the gate, which fails a nav item whose needs is not a need
pnpm test   # a test fails a surface that restates a need instead of naming the table
```

The rail and the command palette draw only the destinations the signed-in person satisfies, but that is presentation, not the gate: every page refuses on its own — a person who may not open it gets the product's `refusal` as a normal 200 (the NoAccess view under the sample's `explain`), and a request with no session goes to `/sign-in`. `skills/zz-meridian/references/customize.md` has the reference for the whole access layer.

## 6. Arrange your pages

Every page is a `PageFrame` holding a `Stack` of `Row`s. Start from the closest preset and change what it shows, not how it is laid out. A page that leads with figures is headed by a sentence that states them, worked out by a function with a test, and passes its `name` beside it; a list or a form keeps a name (`docs/data-display.md`, "A title that states the figures"). A dashboard page leaves its width alone — `data` fills the canvas; a page that is mostly a form takes `width="form"`, whose band centres once the canvas is wider than a form needs; a page that is one long document takes `width="reading"`:

| You need | Start from |
|---|---|
| A summary with one leading figure | Home (`/`) |
| A list of records with filters | Requests (`/requests`) |
| A list people create and move along | Tickets (`/operations-tickets`) |
| What ran and what is going out | Tests (`/tests`), Releases (`/releases`) |
| One record | Request (`/requests/[id]`) |
| Requests over a period, its facts, then breakdowns | Usage (`/usage`) |
| Services and incidents | Services (`/services`) |
| Settings and forms | Settings (`/settings`) |

A list of records is the records template, `Records` in `src/components/templates/records`: summary tiles over the table, with `RecordsSkeleton` as its loading state inside `LoadingPage` (`src/components/patterns/page-loading`). A form reports unsaved changes to the shell through `useUnsavedChanges`, so leaving asks first. A copied page holds its writes in memory and shows some figures that are fixed; `skills/zz-meridian/references/customize.md` says which.

If a page seems to need a new style, it needs a pattern or a component instead: specify it in its layer (see `CONTRIBUTING.md`).

## 7. Put it in front of an agent

Each route under `app/embed/` is an MCP App view. Register each as a `ui://` resource and a tool on your MCP server (`docs/agents.md`), and the dashboard appears in any MCP Apps host, inline beside the answer, with Expand, Ask and Proposals working.

The console's assistant is off until you set the `ASSISTANT_*` variables (`.env.example`); it uses the same collections, so nothing more is wired. See `docs/assistant.md`. Sign-in and permissions come from `src/data/access.ts`, which the assistant route and every server action (each `actions.ts`) already ask.

## Before you ship

```sh
pnpm verify          # the gate once, one production build, the size checks and a smoke of up to three routes
pnpm verify --full   # every route, every control pressed and link followed, the keyboard walk, the assistant and the product's own checks; no time is judged
pnpm verify --timed  # the navigation budgets, the live data and Web Vitals; needs a quiet machine, runs alone and last
```

`pnpm verify` is the check to run before you finish. Run `--full` after a change to shared components, the shell or data, and `--timed` on a quiet machine to judge the times; `pnpm verify --full --timed` is the whole standard. Every run ends with a coverage line, such as `coverage: default; browser ran; 3 routes; data configured 3/3; interaction configured 3/3; not run: audit, presses, keyboard, assistant, browserChecks, timing, live, vitals`, which says what ran and what did not. Nothing that did not run is reported as passed. `pnpm verify --perf` adds the 20-sample navigation protocol and reports it; a p95 over its budget is a `warn`, never a failure. The browser suites look inside open shadow roots, so a web component's content is measured, pressed and walked like any other; a custom element they cannot look inside is reported as `unmeasured:`, and a selector in `navigationChecks` that matches several elements prints a `note:`. `skills/zz-meridian/references/validation.md` says what each line means and what to do about it. The default is built to finish within two minutes; `--full`, `--timed` and `--perf` are what a team schedules, weekly for instance.

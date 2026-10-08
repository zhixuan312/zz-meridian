# Changelog

Every release of ZZ Meridian, newest first. Versions follow semver: a removed or renamed token, prop or card is major; a new card, token or variant is minor; a corrected value is a patch. Each entry says what breaks and what to do instead.

## [Unreleased]

### Added

- **The standard the sentence never states.** The skill's `references/standard.md` holds what one sentence leaves out: the register a product UI answers to, the defaults that read as generated, and a scoreboard kept in `out/standard/` for every view. The scoreboard has floors measured by `pnpm verify --full`, and craft judged on renders at 1440 and 390px in both themes (fit, hierarchy, typography, whitespace, colour, motion, responsive, navigation, copy, states, agents, originality). The agent runs the loop until `--full` ends with `the project meets the Meridian standard` and no view is Weak. Mechanical questions it settles itself; judgment calls it records with a recommendation, proceeding when cheap to reverse. Push, release, deploy, production data and the feedback issue wait for a yes.

- **How the skill is evaluated.** `docs/skill-evals.md`: four levels by cost (static checks every change; decision probes, an agent reading the skill in a scenario's folder and stopping before the first write, for a change to the route, the decisions or the standard; planted defects for a change to the loop; end to end weekly), seven scenarios with what a right answer does, and how a finding is counted. Two fixture apps for them in `cli/test/`: `fixture-crumb-ops` (Next.js App Router over its own orders API, with server actions that delete) and `fixture-vite-rota` (Vite and React Router, one browser read); neither ships.

- **One protagonist is a rule, not only a judgement.** `check.ts` fails a file that renders a second `FeaturedMetric`. A planted second one went unscored when an agent judged the renders by eye.
- **The console's rail takes the request's data from the layout.** `ConsoleRail` passes its props through (`user`, `signOut`, `workspace`, `scopes`) and both it and `ConsolePalette` take `only`, the hrefs a person may see. A product filtered `nav` or set its session's person by editing `src/views/console-chrome.tsx`, a file Meridian manages; a console with no sign-in showed the sample person and a Sign out to nowhere. Now the team's own layout passes them.
- **`shot.ts --press "<name>"`** opens a dialog, sheet, menu or popover before the shot, with the mouse, as a person does; repeated, it presses in order. A view that only a press shows can now be rendered and scored.

### Changed

- **An update already on the running version has nothing to do, and says so.** `update` and its dry run print `already at <version>; nothing to update` and exit 0, where they refused with exit 1 as if something were wrong.
- **The sentence ends with its condition, and is meant for `/goal`.** `… to: [what you want]. Done when its hand-over says the Meridian standard is met, or names what only I can decide or provide.` The model a goal uses to check the work reads the sentence and the transcript, never the skill, so the hand-over quotes verify's last line, the coverage line, the scoreboard count, the decisions made, what did not run, and the commits.
- **The skill decides from its drafts instead of asking.** Step 2 turns the homework into recorded decisions; the one question left is the route, when two fit. A brand hue too near a status hue moves to the nearest safe hue, with the brand kept in the logo mark. A missing tool no longer stops the build: what cannot run is reported as not run, and the standard as not yet proven.
- **`skill` prints the path to read.** After installing, it names the `SKILL.md` to read now, since a running agent may not list a skill installed mid-session.

### Fixed

- **The gate reads an adopted project's imports.** `check.ts` took `@/` to mean `src/`, so in an adopted project, where `@/` is the team's root and Meridian is `@meridian/`, every module imported the documented way read as dormant ("exports X, which nothing a product keeps imports"), and a project had to rewrite its imports as relative paths to pass. It now resolves imports through the project's tsconfig `paths` (`scripts/lib/aliases.ts`).
- **verify reports a bad configuration instead of crashing on it.** An early exit (a `navigationChecks` or `smokeRoutes` entry naming a route that is gone) threw `Cannot access 'suites' before initialization` and hid the reason; it now prints each configuration failure and the coverage line.
- **The coverage line says which suites failed.** A suite that ran and failed was listed under `not run`, as if skipped; it is now `failed: <suites>`, after `not run`.
- **A phone card's status and facts stay in their place.** The status badge took one of the card's six tracks, narrower than a badge at 390px, so it ran left over a long title and sat short of the card's edge; it takes two, as the layout meant. A long fact ends in an ellipsis instead of running over the fact beside it. The sample's customer column caps its width, so a long name no longer pushes the Requests table past its card at 1440px.
- **A product can reach "the project meets the Meridian standard".** The assistant walk-through and the live checks drove the template's own sample pages (Overview, Members, API keys, Settings), so a product that replaced them — every product the skill builds — failed the walk-through or ended `not run: live`, and `--full` could never print the outcome its stop condition asks for. The walk-through now checks what every product shares on its own rail: no agent control while off, on every rail route and embed view, 12 in the template where it was 8; the panel, a reply, the page the model was told, markdown, the thread across navigation, Clear, the layout, a refused key, the key never reaching the browser. It drives each sample page only while its files are there (`scripts/lib/sample.ts`), printing `n/a` with the reason otherwise; Meridian's own repository, which has every one, walks all of them. Without the sample Members page, verify prints `n/a live data` instead of running the live checks, and it no longer counts against the outcome; a product's own live pages prove themselves through `browserChecks`.
- **The skill names what its route needs, from what the probes met.** `create .` works in an empty folder; timezone, currency and the meaning of the request's own terms are recorded decisions; a view's verdict is its lowest criterion; the error state without a fake API is shown by making the read throw for one render. An update already on the running version stops there. The `optional:` and `example:` path prefixes are explained, a project's own copy of the skill is the one to follow, and Route A2 no longer names a `--product` flag `create` does not have. An existing product is learned first, its production addresses found before anything runs, its pages shot "before", and what must survive listed as a floor; Route B renders its "before" from a copy, and a read moved from the browser to the server carries neither cookies nor CORS. `create` and `adopt` end by pointing at the standard, not at `verify` passing. From the second round: the last round needs no round after it; originality comes from how asked-for content is shown, never from adding content; a view's states are scored under it and the shell is one row; the dev server is stopped by its own process id; the rail's signed-in person is never the sample's; an API address overrides `.env` through the environment and is not a `dataUrls` entry; a rebrand that lands near a status hue runs `brand` again with the nearest safe hue. From a built brownfield run and a planted-defect run: an adopted project turns on Cache Components and wraps its shell in `<Suspense>` when detail ids come at request time; a product formatter lives in a file of its own, and a Meridian file it must change goes in the keep register; the theme default is set through `brand --theme`; a navigation probe works at 390px; a request to evaluate only has a route of its own; a criterion not yet judged is not a pass.
- **The skill's screenshots reach the dev server.** Step 6 started `pnpm dev`, on port 3000, then ran `scripts/shot.ts`, which reads port 3100. It now starts `pnpm dev --port 3100`.

## [0.10.0] · 2026-10-07

### Added

- **`audit --atlas`.** The browser audit over the Design Atlas: every card's page and its bare preview, at 1440 and 390px in both themes, about ten minutes. Not part of `pnpm verify`, which stays fast (issue #9).
- **`ShareContext`.** `useShareView` as a component that renders nothing, for a server page with no client view (issue #17).
- **A database guide.** `references/existing-project.md` covers a pool that survives a dropped connection, a transaction pooler, schema changes on start, and a role that cannot create (issues #16, #17).
- **`assistant-view-tools` migration.** `update` reports an assistant whose route-side code predates view tools and its limits (issue #17).

### Changed

- **Export is offered on a phone.** The Overview's and Analytics' Export were hidden below 640px; a page's actions are offered on every width (issue #13).
- **`update` sees past import style.** A managed module whose only difference from its release copy is how its imports are written (`@/…` for `../../…`) is untouched, not a merge (issue #16).
- **A specimen is not the page.** The audit keeps a card preview's own headings and scroll regions out of the page's outline and its one scroller (issue #8).
- **A control's role needs its keys.** `scripts/check.ts` fails an element that claims a control's role (`button`, `tab`, `switch` and the rest) with no `onKeyDown` (issue #11).

### Fixed

- **A narrow table becomes cards on any screen.** `DataTable`'s card list follows the table's own width (under 640px), as `hideBelow` does, so a table in a half-width row or beside the assistant's column no longer runs past its frame. Found by the first `audit --atlas`, with the two below.
- **An active filter's label reads.** A filter that is on keeps its name in `ink-2` on the accent tint; `ink-3` fell to 4.04:1 in light.
- **A selected row's facts read on a phone.** On the accent wash, a card's facts step up to `ink-2`; `ink-3` fell to 4.43:1 in light.
- **The presses count a file chooser.** A file picker's button opens the system's chooser, which changes nothing in the DOM; the presses now intercept it and count it as an answer (issue #16).
- **verify's assistant-off run ignores `.env.local`.** It blanks every name the assistant reads, set in the shell or not (issue #16).

### Breaking

- **`Timeline` is removed.** No page used it, and a card exists because a page needs it (`CONTRIBUTING.md`). Import nothing from `src/components/charts/timeline`.

## [0.9.0] · 2026-10-07

### Added

- **Every page tells both agents the same thing (decision 0011).** A view builds one shared context (`src/lib/shared-context.ts`, one producer per page in `src/views/*-context.ts`): its scope and freshness, what the person points at, every figure with its unit, its change and its definition, what code computed from them (`src/lib/insight.ts`: a day against its median, a share, a ranking, a run of days, what nothing recorded explains), and what the data cannot say. An MCP host receives it through `ui/update-model-context`, inline and in fullscreen; the console's assistant receives it in its prompt, with the page's address and query. All nine console pages and the four embed views share one.
- **Every view has a tool.** `src/views/tools.ts` holds each view's contract: its name, its address as input, its `ui://` resource, and one read that returns what it renders and what the agents are told. The console's assistant offers each as a read-only `view_<name>`; `docs/agents.md` registers the same list on an MCP server, with the apply tool of a change registered view-only. The embed routes render from their tool's read.
- **The assistant is told its limits.** Its prompt lists what it cannot do or see, from each collection's `pageOnly`, `hidden` and missing operations, so it can say why.
- **Ask hands a card to the console's assistant.** With the assistant on, Ask appears on the featured card of Overview, Requests, Health and Analytics; a press opens the panel and sends the card's question with the page's context (`ConsoleSurface`). Ask renders only after hydration.
- **An MCP view says when the host refuses.** A refused context is sent once more, and Ask then carries the view's address; a refused Ask tells the person in a toast with the question's words.
- **The person sees the findings.** `MetricTile` takes `finding` (a line, with a day it points the Meridian there) and `baseline` ("2.7× usual" beside a day being read); `TrendChart` takes `baseline`, a dashed median line. The Overview uses all three.
- **An agent's change leaves an Activity line.** The assistant's guard takes an optional `record`; the template writes to a new `activity` collection, and the Overview's Activity is live.
- **The Overview, Analytics and Health read through `read()`.** Daily totals, endpoints, responses, services, incidents and activity are read-only collections (`src/data/metrics.ts`).
- **An address can name a day.** `?day=2026-09-22` opens the Overview pointed at it (`Meridian day`).

### Breaking

`update` reports the two that touch the team's own files as migrations, `share-view-context` and `agent-reads-section`, with what to change (`references/update.md`, "Resolving 0.9.0's migrations"); `src/lib/shared-context.ts`, `src/lib/agent-guidance.ts` and `src/lib/insight.ts` are Meridian's now and arrive with the update.

- `useShareView(text, structured)` is `useShareView(context)`. Build a context with the fields in `SharedContext`; `contextText` writes the text both agents read.
- `scripts/check.ts` requires `### What the agent reads` under `## Agents` in the README of every page under `app/(dashboard)/` and `app/embed/`. Add it to a product's own pages, saying what the page's context tells each agent.
- `src/data/sample.ts` no longer exports `ENDPOINTS`, `STATUS_MIX`, `ACTIVITY`, `INCIDENTS`, `PAST_INCIDENTS`, `SERVICES` or `demoTotals`: read them through `src/data/metrics.ts`. `RequestView` takes `routeP95`.
- `OverviewBody`, `HealthBody` and `AnalyticsBody` take the period key, `updatedAt` and, for the first and last, the incidents and activity beside the figures; `RequestsView` takes `updatedAt` and `now`.

## [0.8.0] · 2026-10-06

### Added

- **A demo password in front of the whole product.** With `DEMO_PASSWORD` set at run time, `proxy.ts` sends every route to the sign-in page (an API answers 401), whose panel becomes "Open the demo": one password field, a 30-day signed session (`src/lib/demo-gate.ts`, keyed by `DEMO_SECRET` when set), and opening the page again signs out. Without it nothing changes: the panel is the product's sign-in and nothing is gated. The sign-in panel now streams in behind a Suspense boundary, so the rest of the page still prerenders. Meridian's own demo deploys to CapRover from this repository (`Dockerfile`, `captain-definition`, neither in the package).

### Changed

- **`update` is tested from the last three releases.** The release updates a project of the release before, adopted and created, through finalize; the weekly run the last three. Every published origin used to run at each release, which took 11 of its 18 minutes and grew with every release. From an older project, update in steps (`references/update.md`).

### Fixed

- **A project leaves an update in progress and each person's agent settings out of git.** Its `.gitignore` (the template's, for a created project; three lines `adopt` adds, for an adopted one) ignores `.meridian/update/` and `.meridian/update.lock`, the staged copies, backups and lock of an unfinished update, which a commit mid-session used to take in; a created project also ignores `.claude/settings.local.json` and `.claude/*.lock`. The manifest, `keep.json`, `.meridian/history/` and both copies of the skill stay committed: the next update and the team's agents read them. In a project made before 0.8.0, add those lines to `.gitignore`.
- **The one sentence shows its blank.** It ended in `<what you want>`, which GitHub and npm read as an HTML tag and dropped, so it read "installs to: .". It ends in `[what you want, in your own words]`.

## [0.7.0] · 2026-10-06

### Changed

- **One sentence for every route, and the skill chooses the command.** The README's sentence is `Run npx zz-meridian@latest skill --global, then follow the zz-meridian skill it installs to: <what you want>`. The skill opens with "Choose the route": a table from what the person said and what is in the folder to `adopt` (this Next.js App Router project, in place), `create` (a new folder, reading any folder named as the source and never writing it) or `update` and `brand`, and it says the route before the first command. The old sentence named `adopt`, which is wrong for a new dashboard.
- **Next.js telemetry is off.** The template's `next.config.ts` sets `NEXT_TELEMETRY_DISABLED` for `next dev` and `next build`, and Meridian's scripts set it for every `next` they run, an adopted project's included. Delete the line in `next.config.ts` to send it.
- **Feedback is an offer, and it identifies no one.** The skill's last step drafts a Bug or a Feature request issue only when the run found something about Meridian, removes every name, address, URL, record, schema and path of the person's own, shows the draft, and files nothing without a yes. The repository has Bug and Feature request issue forms that say the same, and no blank issues. The README and the npm page say what reaches the network (npm, the font download at build, what the team configures) and that an issue is the only way anything reaches Meridian.

## [0.6.1] · 2026-10-06

### Fixed

- **A created project has its `.gitignore`.** npm renames a `.gitignore` inside an installed package to `.npmignore`, so every project made with `create` since 0.3.0 had a `.npmignore` and no `.gitignore`, and `git add` took in `node_modules`, `.next` and `.env.local`. The package now carries the template's as `payload/gitignore`, and `create` writes it as `.gitignore`. In a project created before 0.6.1, run `git mv .npmignore .gitignore`, then `git rm -r --cached node_modules .next` for whatever was committed; `update` leaves the file alone, since it is the team's.
- **`update` runs from the registry.** It compares the running package with the published one, and npm's rename made the two differ, so `npx zz-meridian@<version> update` refused itself with "the running package differs from zz-meridian@<version> on the registry" since 0.5.0. 0.6.0 is on npm with this defect and has no tag or GitHub Release: update with 0.6.1.
- **A gate step whose tool is not installed says so.** `scripts/gate.ts` printed a `TypeError` in place of the missing command.

## [0.6.0] · 2026-10-06

### Changed

- **An API key is shown in full once, when it is created.** The keys collection stores each key's `hint` (its prefix and last four characters, `zzm_live_…f601`) and `secretHash` (the secret's SHA-256), never the secret. `createKey` returns the new key with its `secret` for the creation banner, and the table lists every key by its hint, with no Reveal or Copy. Breaking: `ApiKey` has `hint` and `secretHash` in place of `secret`, and `KeysView`'s `createKey` returns `ApiKey & { secret: string }`. A created project's own keys page and fixtures keep the old shape until the team takes the release's versions.
- **Links are never underlined.** Hover is a colour change and focus is the focus ring every control has. `.link` (accent ink in a sentence) turns `ink` on hover; `.row-link` (a destination in a list) takes `accent-ink`; a Data table's linked row takes the `fill-hover` tint and its title keeps its colour. Before, both classes drew a 1px line across the link's box, which under a link holding a second line read as a rule across its whole width.
- **Replay sends a failed request again.** On a 5xx or 429 request's page, Replay calls `replayRequest` (`app/(dashboard)/requests/[id]/actions.ts`): it authorizes the write, creates a new request with the same method, route, customer, region and model and a `replayOf` naming the original, and refreshes the request reads. A toast names the new request with Open, and its page links back. It used to toast "Replay queued" and send nothing. The requests collection allows `create` as a page-only operation, so the assistant cannot replay. `arrayCollection` takes `derive`, which works out a row's `derived` fields on every create and change. The request page no longer shows a fixed "API key" it did not know. Breaking: `RequestView` takes `replay`.
- **A form in an open sheet says why it failed inside the sheet.** A refused invitation reopens the Members sheet with what was typed and a critical Banner, "Invitation not sent", with the reason. A refused key reads "Key not created" at the top of the Create a key sheet. Neither sends a toast over the sheet's own buttons. Refused changes made from a table row still toast.

### Fixed

- **`update` reads a dependency written as `^24` (or `~5.9`) as a version.** It used to call any range without a minor and patch "a specification Meridian cannot compare". Every created project carries `"@types/node": "^24"`, so each update asked the team to replace `^24` with "at least ^24" before it could complete. A missing minor or patch now counts as 0.

### Release

- **The release's timed default verify allows 180 s on the shared GitHub 4-CPU runner.** The same commit measured 111 s on one runner CPU and 152 s on another, so 120 s stopped a release on the draw of the machine. The default verify must still pass in full; 120 s remains the target on an adopter's own machine. The stakeholder's decision.

## [0.5.0] · 2026-10-06

### Added

- **`pnpm verify` has three modes, and the default is bounded.** The default runs:
  - the gate and one production build;
  - the route policy, and first-load JS against 820 KiB and the per-route baseline;
  - complete HTML against `budgets.htmlKb`;
  - the navigation smoke of at most three routes on desktop and the phone.

  The template's default takes about 70 to 100 seconds on an Apple M5. It ends with one coverage line, `coverage: <mode>; browser <ran|not run (<reason>)>; <n> routes; data configured <a>/<n>; interaction configured <b>/<n>; not run: <suites>`, and writes the detail, including how many times the gate and the build ran, to `out/verify.txt`.
  - `pnpm verify --full` adds every mapped rail route and the exhaustive suites: the audit, every control and link, the keyboard walk, the assistant, live data, Web Vitals and the configured `browserChecks`.
  - The default never refuses for a missing safe backend or Chrome. It runs the static checks and reports the browser as `not run`, while `--full` requires both.
  - `scripts/verify.baseline.json` is the team's first-load baseline. `node scripts/sizes.ts --write-baseline` records it, and `adopt` does not copy it, so an adopted project reports growth as not configured until it records its own.
  - Breaking: `--quick`, `--no-vitals` and `--extra` are gone from `verify` and its scripts. An update reports the `verify-modes` migration for a team `package.json`, workflow or shell script that still passes them.
  - `pnpm verify --perf` runs every mapped rail route on desktop and the phone, warm, cold (a fresh browser, with no destination prefetch) and right after a live refresh. It takes 20 samples each, reports the nearest-rank p95, median and max against the budgets, and marks a p95 over its budget as `warn`, never a failure. Warm samples start from the rail route before the destination, after its prefetch and the chunks it brings have landed. `--full --perf` runs the gate and the build once for both.
  - The live check's burst case reports the second tab's requests by kind: refresh actions, router refreshes and prefetches.
- **Every console route's loading state shows the page's own heading.** A navigation that commits the loading state first acknowledges the page at once instead of after React's 300 ms reveal throttle: `/members` on the phone went from a bimodal 60 or 330 ms to about 30 ms. The Atlas guides moved to routes of their own, so opening one no longer downloads the card and token stages; the URLs are unchanged.
- **The console shows a page's title at once on navigation.** `/`, `/analytics` and `/requests` render their masthead outside the boundary of their address-dependent data, so a warm navigation shows the heading in about 30 ms instead of 230 to 430 ms. `/requests`' HTML cap is 150 KiB for this; it is 143 KiB, and 22 KiB compressed.
- **`/requests` pages, sorts and filters on the server, and exports from an authorized route.**
  - The page sends 20 rows, the total and a server-computed summary for the address, and an invalid filter falls back to its default.
  - `GET /api/export/requests?<filters>` streams the whole authorized filtered set as CSV, in batches of at most 100 rows, and stops when the download is cancelled. It answers 401 without a session.
  - `src/lib/csv.ts` writes a text value that starts with `=`, `+`, `-`, `@`, a tab or a carriage return so a spreadsheet reads it as text, and gains `csvHeader` and `csvRow`.
  - `ExportButton` gains `href`, a download link to a server export.
  - Breaking: `filterRequests` is removed. `RequestsView` takes `{ rows, total, summary, state, pageSize }` and renders the tiles and the table only. The page renders the masthead, with freshness and export in boundaries of their own.
- **Each uptime strip is one SVG.** It draws a baseline and a mark per degraded, outage or no-data day. Its accessible summary names the period and only the days that were not fully up, instead of a table of every day. `DayState` gains `'none'`, which reads "No data". The per-day elements and the hidden table are gone.
- **`scripts/navigate.ts`: the navigation smoke.** For each selected route, on desktop and through the real 390 drawer at 4× CPU, 150 ms latency and 1.6 Mbps, it measures:
  - the shell;
  - the data, from the route's `readySelector`;
  - the interaction, from its harmless probe.

  It applies the median retake rule and checks prefetch bytes against the desktop and closed-drawer caps. A route without a mapping reports its data and interaction as `not-configured`. `scripts/verify.config.ts` gains `budgets`, `navigationChecks` and `smokeRoutes`, and the template maps every rail route.
- **The verification measurement library** (`scripts/lib/timing.ts`, `sizes.ts`, `coverage.ts` and `budgets.ts`) holds:
  - the median retake rule and nearest-rank p95;
  - the first-load, HTML and prefetch caps, and the default budgets;
  - smoke route selection and coverage resolution.
- **`pnpm verify` checks live data end to end.** After the browser checks, `scripts/live.ts` drives two tabs on `/members` against the built app:
  - an invitation in one tab shows in the other within 2 s;
  - with change hints dropped (a second server with `LIVE_DROP_HINTS=1`), after a server restart, a hidden tab shown again and a tab back online, the other tab still converges within the safety poll plus 2 s;
  - a burst of 20 invitations in 2 s arrives with at most one refresh in flight.

  It prints each measured time and removes the members it invited. A project without a live `/members` page sees each case as `not run`, with the reason.
- **An update to 0.5.0 reports this release's migrations.** It names the team-owned files that still have the old shape:
  - `shell-assistant-promise`, `assistant-available-promise`, `clock-now-required` and `cache-components-config`;
  - `connection-boundaries`, `authorized-read`, `scoped-invalidation`, `live-provider` and `authorized-endpoints`;
  - `verify-modes`, for a script, workflow or shell file that still passes a removed `verify` flag.

  Each says which section to follow, and is checked by the gate and a build (`verify-modes` by the gate). A product already on the new shape gets no line. The skill gains `references/cache.md` and `references/live.md`. They carry every team-owned starter verbatim: `access.ts`, `read.ts`, `live-stream.ts`, `live-actions.ts` and `/api/live`. They also hold working-shape Postgres LISTEN/NOTIFY and Redis pub/sub adapters, and say plainly that the sample is a single process, and that polling cannot reconcile stores that diverged.
- **Live data in the console: one stream per tab, and a refresh that reauthorizes.**
  - `src/lib/live.ts`, now managed, holds `createLiveClient` (the framework-free scheduler) and `LiveProvider` and `useLive`, which put it in a React tree. Every hook in a tab shares one `EventSource` for the union of the collections they show.
  - Hints wait at most 500 ms, one refresh runs at a time, and what arrives meanwhile runs next. A safety refresh runs every `pollMs` (30 s) even on a healthy stream, and a refresh slower than 10 s counts as failed.
  - A failed connection is retried after a second. After the third failure the tab polls, and tries the stream again on every fifth poll. An authorization failure pauses it, and any other failure leaves it `stale` without advancing the data's observation time. A hidden tab closes its stream, and showing it again resyncs.
  - The team-owned `src/data/live-actions.ts` exports `refreshCollections(names)`, a Server Action that invalidates only the collections the caller may read. `src/views/console-live.tsx` injects it into the provider, followed by a router refresh. The dashboard layout wraps every console page in it without waiting for the request, and Members and Keys call `useLive`.
- **`GET /api/live?collections=members,keys`: change hints over Server-Sent Events.** The team-owned starters `app/api/live/route.ts` and `src/data/live-stream.ts` open with `retry: 3000` and a `resync`, send a `change` naming only the collection, and beat every 15 seconds. Each hint is sent only after the caller's scope is checked again, and a scope that may no longer read ends the stream. A malformed, empty or oversized request (more than 50 names) gets 400, no session 401, and an unknown or forbidden name 403 without saying which. No record, tenant or cache tag reaches the browser.
- **`zz-meridian update`: a real, reviewable update.** For a project adopted or created with 0.3.0 or later.
  - `--dry-run` replays the recorded release in a scratch folder, after checking it against the registry's integrity record, and prints the plan. It writes nothing, and refuses if any recorded file disagrees with the replay.
  - A plain `update` replaces every Meridian file the team has not touched, adds the new ones and removes retired ones. Files the team edited, deleted or kept are staged as base/ours/new copies, never overwritten.
  - It adds the dependencies and scripts the release needs to `package.json`. An entry still exactly as the earlier release wrote it follows the new release; one the team chose becomes a migration. It updates Meridian's managed block in `AGENTS.md`.
  - Every run writes `.meridian/update/<version>/` with a journal, `MERGE.md` and `resolutions.json`, even when nothing is staged.
  - It refuses, writing nothing, on a dirty tree (unless `--allow-dirty`), an open session or a left-behind lock, a bad manifest or keep entry, or an unsafe path.
  - The default output lists only what needs a decision; `--verbose` lists every file.
  - `update --finalize` checks every resolution against the current files, confirms the installed framework versions, then runs the gate and one production build in place. Only then does it record the new version and archive the report to `.meridian/history/`. A check that changes a source file fails the session and leaves the bytes alone. The browser checks stay a separate `verify`.
  - `update --finalize --verify` runs the project's default `verify` once, in place of the gate and the build, so nothing runs twice. It prints and records verify's coverage line (`MERGE.md` gains a `Coverage:` line), and a failing verify fails the session as a failing gate does.
  - `update --resume` continues an interrupted or failed run without overwriting a later edit. `update --abort` restores only what the update changed, and refuses when a file it wrote was edited since.
  - An update with nothing to resolve finalizes in the same command.
- **`zz-meridian brand [brand flags]`: rebrand with no hand edits.** The brand outputs, `src/app.config.ts` and the manifest change together, or nothing changes. It refuses when a brand output was edited or an update is open.
  - The package version is now 0.5.0.
- **`.meridian/keep.json`, the update session and `app.logo` are checked by the gate.**
  - `keep.json` is a list of `{ path, reason }` entries: Meridian files the team deliberately keeps as they are. `node scripts/check.ts` fails on an entry for a file Meridian never managed, a duplicate, a blank reason, or a kept file that is missing.
  - While an update session is open under `.meridian/update/`, the gate fails until every staged file and migration has a current resolution. Once it does, the gate checks against the files the update will own.
  - `app.logo`, when set, must be a root-relative SVG under `public/`, such as `/logo.svg`.
  - The gate's lint step leaves `.meridian/` alone, since a session keeps copies of files there for reading.
- **`--theme dark|light` and `app.logo`.**
  - `brand.ts --theme` sets the default theme in `src/app.config.ts`, applied before the first paint until a person picks one.
  - `app.logo: '/logo.svg'` shows your SVG from `public/` in the mark at 20, 24, 28 and 32 pixels. Beside the product name its `alt` is empty, and on its own `AppMark` takes a `label`.

### Changed

- **`refreshCollections` reports a missing session as a value.** It resolves `{ ok: true }`, or `{ ok: false, status: 401 }` when there is no session, because a thrown error loses its status in a production build. `ConsoleLive` turns the refusal into the 401 the live client pauses on. Breaking: a caller reads the result instead of catching.
- **Lighter pages, rendered the same.**
  - Tables state their cell classes once, at the table, instead of on every cell.
  - The Health page sends each service's 90 days as one character a day.
  - The rail keys its link styles on `aria-current`.
  - `/requests` is 143 KiB and `/health` 99.6 KiB, from 155 and 119. Screenshots at 1440 and 390, in dark and light, are identical.
- **`brand.ts --no-atlas` and `--product` also remove the Atlas's routes from `scripts/verify.config.ts`.** A created project's `verify --full` no longer fails on navigation checks for pages it does not have.
- **The Atlas preview route loads only the card it shows.** Its first-load JS fell from 1441 KiB to 591 KiB. `scripts/registry.ts` also writes `src/system/preview-loaders.ts` and the preview route's key list, and `brand.ts --no-atlas` removes both.
- **The template builds under Cache Components, and every non-API route is static or partial.**
  - `next.config.ts` turns on `cacheComponents` and `partialPrefetching`. The console layout no longer waits for the request: it hands the shell a promise of whether the assistant is configured.
  - Breaking: `AppShell`'s `assistant` is a `Promise<boolean>`, and `useAssistantAvailable()` returns that promise. Read it with `use()` inside a `Suspense` boundary. The launcher keeps its place, inert and hidden from assistive technology, until the promise resolves `true`.
  - The not-found page prerenders its sentence and links. The address that was asked for streams in behind its own boundary, at the size of its placeholder.
  - Every console route has its own route-shaped `loading.tsx`. The Overview page moved to `app/(dashboard)/(overview)/` (same URL), and the shared `app/(dashboard)/loading.tsx` is gone.
  - `pnpm verify` runs `node scripts/route-policy.ts` after its production build. It fails any non-API route that is neither static nor partial, unless `scripts/verify.config.ts` declares it in `requestDependentRoutes` with a reason.
  - In the template, `node scripts/check.ts` fails on a `connection()` call outside the console layout and the not-found page. A product's own pages are its own, so the rule is silent once `.meridian/manifest.json` exists.
- **Pages read through an authorized, scoped and cached `read()`, and writes invalidate exactly their tenant's collection.**
  - `src/data/access.ts` (`resolveAccess`, `collectionFor`, `can`) says who the request is and what it may do. The sample binds one tenant and one owner; a product replaces the policy with its session and database predicates.
  - `src/data/read.ts` exports `read(name, query)`, which refuses a collection the caller may not read before any cached code runs. It caches per scope and query with the profile `{ stale: 30, revalidate: 60, expire: 3600 }`, tags the tenant's collection as `collection:<sha256>`, and returns the time the read ran as `observedAt`.
  - The members and keys pages read through `read()` and no longer call `connection()`. Their actions authorize the operation and every record they touch, write through the caller's own collection, and call `updateTag` only after the commit.
  - Breaking: `src/lib/collection.ts` is now Meridian's, and `adopt` adds `zod`. `Query` gains `offset`, and `normalizeQuery` defaults and caps it, rejects unknown fields and operators, and sorts by the key last. A `Collection` may `subscribe`; `arrayCollection` takes a `tenantId`, with a store and listeners of its own.
- **An approved assistant change is authorized again when it runs.**
  - The assistant route resolves access before the model is reached (401 without a session) and hands the assistant only the caller's own collections that they may read.
  - Each approved create, update or remove asks the route's guard with the records it touches, at the moment it runs. A permission revoked since the approval refuses it with "You no longer have permission to make this change." and changes, emits and invalidates nothing. A committed change drops its tenant's cached reads with `revalidateTag(tag, { expire: 0 })`.
  - Breaking: `assistantTools(collections, writer, guard)` and `respond({ …, guard })` take the guard.
- **Pages and views read only through `src/data`.** The requests pages read the `requests` collection with `read()` and format against its `observedAt`. Everything else the sample pages draw comes from `src/data/sample.ts`. In the template, `node scripts/check.ts` fails on a page or view that imports `src/system/fixtures` directly, by alias or relative path, and on `'max'` as the revalidation profile on a writer path (actions, API routes, the assistant, `src/data/live-actions.ts`). Both rules are silent once `.meridian/manifest.json` exists.
- **Members and keys update optimistically.** An invitation shows first in the table at once, marked "Saving…"; a status change, a removal or a revoke shows at once too. A refused change puts the table back and toasts "Change not made" with the reason, and a row with a change in flight takes no second one. The freshness the views show stays the read's observation time. Breaking: `KeysView` takes `now`, the read's `observedAt`.
- **Breaking: the clock is always the caller's.** `formatRelative`, `Freshness`, `ShellTools` and `AlertsPanel` take a required `now`, the data's clock; none of them reads the browser's clock any more.
- **One rule says which files are Meridian's.**
  - `cli/src/ownership.ts` decides it for `adopt`, `create` and `update`; `references/ownership.md` in the skill is the same rule, rendered.
  - Meridian's files are its tokens, styles, components, scripts (except `scripts/verify.config.ts`, `scripts/verify.baseline.json` and a `scripts/check.local.ts`), its library helpers, `src/views/console-chrome.tsx`, `tests/setup.ts`, the brand outputs and both skill copies. Everything else is the team's, including a file the team adds inside one of Meridian's folders.
  - Breaking: a new `.meridian/manifest.json` records only those files. `src/app.config.ts`, `scripts/verify.config.ts`, pages, views, data and docs are no longer in it, and a created project's manifest no longer lists every file. An update treats such entries in an older manifest as the team's and never deletes them.
  - The manifest records one accent choice: `--hex` wins over `--hue`/`--chroma`, which win over `--accent`.
- **The gate's dormant-export rule leaves Meridian's managed modules alone in every project built on Meridian.** Before, only adopted projects were exempt. A created project then failed its gate whenever a release added an export its own code did not use yet.
- **Branding no longer edits `src/lib/preferences.ts`.** Breaking: `ACCENTS` is the four presets plus `app.accent` when it names another, so a custom accent is set in `src/app.config.ts` alone; `brand.ts --hex` or `--hue` does that for you.
- **The gate checks the agent context.**
  - `node scripts/check.ts` fails when `docs/brief.md` lacks one of its five sections, and warns while a section still holds only its template line.
  - It scans the managed block in `AGENTS.md`, the installed skill and the brief. It fails on any path or package script they name that does not exist; `optional:` and `example:` references are allowed to be absent.
  - The skill's references are labelled to match: they hold in the template, in an adopted project and in a created one.
  - The skill carries its own `references/voice.md`, `references/agents.md` and `references/update.md`, so a created project, which has no `docs/`, no longer points at files it lacks.
- **The package no longer ships the CLI's own tests into a new dashboard.** They import `cli/src`, which a project never has, so the created project failed its own type check.
- **`AGENTS.md` gets a managed block, not an appended section.**
  - `adopt` and `create` write Meridian's rules between `<!-- BEGIN:zz-meridian-agent-rules -->` and `<!-- END:zz-meridian-agent-rules -->`. The rules name your package manager's commands, and every byte of your own text around them is kept.
  - Breaking: `scripts/brand.ts --existing` no longer appends `# Built on ZZ Meridian`, and `--product` no longer writes `# Working in this dashboard`. The CLI writes the block instead. Run `adopt` or `create`, or, once it is out, `update`, rather than `brand.ts`, to get it.
- **`docs/brief.md`: the team's own context.**
  - `adopt` and `create` write a five-section brief (Product, Users, Data, Decisions, Glossary) when there is none, and never overwrite one.
  - The template's assistant reads its Product, Users and Glossary sections, at most 2000 characters, as context and never as instructions.
- **`brand.ts --product` keeps the assistant's build tracing.** It removes only the Atlas's `/system/**` entry from `outputFileTracingIncludes`.
- **`adopt` refuses an incomplete package before it writes anything.** Its copy rule now lives in `cli/src/ownership.ts`, shared with `update`. A package whose template lacks a file adopt needs is refused first; before, that failure surfaced as a crash halfway through.

### Fixed

- **`pnpm verify --full` no longer counts a suite that ran nothing as run.** The live-data check exits 2 when a case did not run, for example in a product without the template's live `/members`. `verify` then reports `not run` for it, keeps `live` in the coverage line's not-run list, and ends with `every check that ran passed; not run: live`, not "the project meets the Meridian standard". Breaking: a script that matched the old closing line reads the coverage line instead.
- **The size and route checks work with any Next config file.** `scripts/route-policy.ts` and `scripts/sizes.ts` read the build folder from `next.config.js`, `.mjs`, `.ts` or `.mts`, as Next does. Before, an adopted project whose config was not `next.config.ts` failed both with a missing-module error.
- **Pages with no data show an empty state, not an error.** Overview, Analytics, Health and Customers render their empty card when their series are empty. `/customers` renders its title in the first HTML, and the page skeletons announce themselves as loading to assistive technology.
- **A failed invitation is told, even when the request never reached the server.** The members page rolls the row back and toasts "Change not made" for a dropped connection too.
- **Creating an API key requires at least one declared scope.** The server refuses an empty set or an unknown scope, and Create stays disabled until a scope is ticked.
- **Undo after Disconnect puts the host back where it was**, once.
- **The embed's "Set by Claude" can be cleared.** Breaking: a person's change writes `by=you` in the address, where it used to remove `by`.
- **`brand.ts` writes brand values literally**, so a name containing `$&` stays as typed. With `--existing`, `--package` renames the package and keeps its version and description.
- **Interrupted checks clean up after themselves.** `verify`, the live check and the consumer smoke stop the servers, suites and headless Chrome they started, and remove their scratch folders, when they are interrupted or fail.
- **The documented Postgres live adapter opens one listening connection**, however many collections subscribe at once.

## [0.4.0] · 2026-10-05

A quality pass over the whole repository, and a manual pass through the running product — every page, embed, Atlas
view, CLI command and API route, at both widths and both themes. Twenty-two defects fixed, six of them found only by
auditing the Atlas, which nothing had done before. Both field reports on #6 and #7 are in.

### Security

- **The markdown URL policy could be bypassed with a control character** (`src/lib/safe-markdown.ts`). The scheme was read from the raw string, but a browser removes tab, newline and the other controls from a URL before it reads one: `java\tscript:alert(1)` IS `javascript:` to the browser, so a link an agent, a document or a note wrote could reach a script — the one thing this module exists to stop. The scheme is now read from a copy with the controls and spaces taken out, and only the probe is stripped: a URL that passes is returned exactly as written. `tests/prose.test.tsx` covers the obfuscated forms.

### Fixed

- **`scripts/keyboard.ts` could fail a page that was right.** It judged a focused control two frames after the key event, and the skip link is drawn off the top edge until `:focus-visible` moves it in — so a measurement taken in between clamped to the page's corner, found the sticky bar there, and reported `hidden under div.flex.h-16: Skip to content`. That failed the `gates` job of the 0.4.0 release, on `/keys`, while the same page passed here and in the dry run: a race, not a covered control. It now takes a second look 150 ms later before calling a control covered, which a control genuinely under something cannot pass.
- **`scripts/keyboard.ts` failed a page that was right.** Its control selector asked for `button:not([disabled])`, `input:not([disabled])` and so on — the *attribute*, which only a control's own markup carries — so a control disabled by a `<fieldset disabled>` was counted as one the keyboard should reach, and Tab (which correctly skips it) never arrived. A `FormSection` in its read-only or saving state is exactly that, so its Atlas page and its preview both failed with "never reached: INPUT" — a check crying wolf on the component it ships. The selector asks for the state now (`:disabled`), which is what the audit's own target check already did. Both routes pass; reverting the selector fails them again.
- **The assistant's whole panel was in every page's first load** (issue #7). `AppShell` loaded `AssistantColumn` *and* `AssistantLauncher` through `dynamic(() => import('@/components/patterns/assistant'))` — the same barrel — so the chunk a page fetched to draw its launcher button carried `useChat`, the AI SDK's client and its zod schemas, `react-markdown`, `remark-gfm` and `micromark`: 448 KB in the reporting product's build, on every page, whether or not anybody opened the panel. The launcher is its own module now (`assistant/launcher.tsx`, which imports only the Agent Mark), and the column mounts the first time the panel is opened and stays mounted after, so the thread still survives closing and reopening. The measurement, from the report: 1,152-1,219 KB of JS per page before, 696-761 KB after, with 456 KB arriving on the first open.
- **`verify`'s "assistant off" start could be turned back on by `.env.local`** (issue #7). It deleted every `ASSISTANT_*` variable from the environment it passed on, but `next start` loads `.env.local` itself and Next does not overwrite a variable that is already set — so a person keeping their own model there got "/ has 1 assistant element(s)" while nothing was wrong. The variables are blanked instead, which is what `assistantConfig` reads as unset.
- **Nothing checked what a page actually downloads.** `vitals.ts` measures LCP, INP and CLS, and all three stayed green while the panel's chunk rode along on every page. `scripts/assistant.ts` measures the split directly: it lists the page's scripts with the panel closed, opens the panel, and fails when opening it fetched no script the closed page lacked — which is exactly what "the launcher carries the panel" looks like from the browser.
- **The guides said nothing about reading a table once per request** (issue #7). A console page asks for the same records from several places — the shell tools, a page strip, the page and its freshness stamp — which is free over the sample's fixtures and a round trip each over a network. `src/data/collections.ts`'s header, `references/customize.md` and `references/existing-project.md` now say to wrap the read in `cache()` from `react`, to keep the write path reading directly so validation never sees an earlier answer, and to raise `pg`'s ten-second idle timeout. The reporting product's three heaviest pages answered 44-46% sooner for the first.
- **A DataTable drew both of its layouts on every render** (issue #6). The component rendered the table *and* a `<ul>` of the same records, and let CSS hide one: every cell function ran twice on mount and again on every filter, sort or page change, both trees reached the DOM at every viewport, and each device downloaded a tree it could never show — on the reporting product's `/activity` that was 201 of 711 elements hidden and unusable. It draws one tree now: the real `<table>` at every width, its rows laid out as cards below 768px in CSS. Each cell carries `data-mobile` — `check`, `title`, `status`, `fact` or `hidden` — naming its part of the card, and the row becomes a six-column grid. Nothing is measured, so there is no hydration swap and no flash: a phone gets the card in the server's HTML exactly as before. A column the table dropped for width (`hideBelow`) comes back in the card, which is what the old list did. The only render left over is the phone wording for a column that declares `mobileCell` ("Used 1 min ago" beside "1 min ago") — a few words, never a second copy of the row. `tests/data-table.test.tsx` holds it.
- **Two tabs of the same dashboard disagreed about the theme, accent and density** (`Providers`). The stored choice was read once on mount and never again, so a person who switched to the light theme in one tab kept the dark one in the other until it reloaded. `Providers` now follows the `storage` event, which fires only in the tabs that did not write — exactly the ones that need it. `tests/preferences.test.tsx` holds it (and fails without the listener).
- **`Sparkline` drew a stray filled triangle for fewer than two values.** `Math.min()`/`Math.max()` over an empty array give ±Infinity, and the area path closed with them; the README promised "under two values, render nothing". It renders nothing now, and `tests/sparkline.test.tsx` holds it — with the guard removed it fails on exactly the degenerate path (`d="L120,36L0,36Z"`), which a real ResizeObserver would have drawn.
- **`formatCompact` rendered a negative in full** — `formatCompact(-1_500_000)` was "-1,500,000" in a tile while an axis rendered the same number as "-1.5M". Every branch turns on the magnitude now, as the axis formatter already did.
- **`FeaturedMetric` crashed on a figure its splitter did not recognise.** `text.match(...)` was dereferenced without a null test, so a formatter returning "—", a negative, or any currency symbol other than `$`/`€`/`£` threw. Both it and `MetricTile` now share one total parser, `splitFigure` in `src/lib/format.ts`, which never fails to match.
- **The MCP Apps host bridge never removed its `window` listener.** `HostBridge.dispose()` releases it, and `EmbedSurface` calls it on unmount — a bridge that is never disposed keeps its listener, and everything it closes over, alive for the life of the page. `tests/agents.test.tsx` holds it twice over: that a disposed bridge delivers nothing to its listeners, and that the handler it added to `window` is the one it takes off (the second is what catches the leak — the first passes on `listeners.clear()` alone).
- **`scripts/brand.ts` silently did nothing for part of a new accent.** It patched an `ACCENT_SWATCH` map that no longer exists in `src/lib/preferences.ts`; a `String.replace` with no match writes nothing. Removed.
- **`scripts/keyboard.ts` ignored `--extra`.** `pnpm verify --extra /orders/1` walked the configured detail pages here while the audit, the presses and vitals walked the ones that were asked for.
- **`scripts/verify.ts` looked for the assistant only in `app/`.** A project that keeps its routes under `src/app` — which `adopt` supports, and which `APP_DIR` already models — would have had its whole assistant walk-through skipped, silently.
- **`scripts/fake-llm.ts` used the older entry-point guard** while every other script uses `import.meta.main`.
- **`app/(dashboard)/keys/actions.ts` stamped every key's owner as "Maya Chen"** instead of the product's own person (`app.user.name`).
- **The Atlas did not list the Members page.** `/system/pages/members` did not exist, so the page's own specification was unreachable from the Atlas; `docs/surfaces.md`'s page inventory omitted Members and API keys.
- **`next.config.ts` did not trace `app/**/*.md` for `/system`.** The Atlas reads its page specifications from `app/`, and today those routes are static — a runtime render would have read them as empty.
- **`docs/surfaces.md`'s page inventory named two embed views that do not exist** (`request`, `customer`) and left out the one that does (`/embed/proposal`). Every page's own specification already said "not offered" for those two; the table agrees with them now and lists the proposal view. The same guide credited the token bridge to `EmbedFrame`; `EmbedSurface` is what applies it, on every embed route. `check.ts` has a rule now, so this cannot drift again: every `/embed/<name>` a document writes is a route, and every view the inventory's own column offers is one.
- **Twenty-four sizes written into the specifications were the tokens' old values.** The radius scale was retuned (4/6/8/12/16 to 5/8/10/16/24), the control heights with it (30/36/44 to 32/38/46) and the row height (36/48 to 38/52), and eighteen specifications kept the old numbers: Banner, Button, Card, Dialog, Icon button, Input, Menu, Pagination, Popover, Segmented, Select, Skeleton, Table, Textarea, Toast, Tooltip, Export button and `docs/surfaces.md`. A product sizing a corner, a control or a row from the specs — the card contract is what CONTRIBUTING points a reader to — was a few pixels out, and nothing said so. `check.ts` has a rule now: a token annotated with a px value must be that value, comfortable or compact, and a token whose own value is not a plain px (a clamp, a var) is left alone.
- **Four controls were under 44px on a phone**, which the standard requires of every control on a coarse pointer (`.hit` gives a control a 44px target; its siblings already carried it). The Appearance menu's trigger (`size-8`), the alerts panel's "Mark all read" and the filter bar's phone-only "Clear" — text buttons, which the box-link rule never covered — and `AskAbout`'s button (`h-7`). Nothing caught them because the audit only measures a control when it is on screen, and on a product page these live in a closed drawer, popover or sheet: the components' own previews, which nothing audited, are where they showed.
- **The App Mark preview drew its light specimen as light text on a light ground** (1.05:1 — the audit fails that contrast). `data-theme` redefines the variables in its own scope, but `color` had already been resolved on `body` from the page's theme; the Planes preview carries `text-ink` for exactly this reason and the App Mark preview did not.
- **The Motion preview demonstrated `.link` as a box control.** `.link` is a link inside a sentence — that is why it is exempt from the 44px rule — and shown bare in a flex row it blockifies, losing both the exemption and the box-link hit area, so the specimen stood for a control the class is not. A box link is `.link inline-flex`, as the Atlas's own links are.

### Changed

- **One parser splits both figures.** `FeaturedMetric` had its own regex with a hard-coded `$€£`; it and `MetricTile` share `splitFigure` now, which is total and takes any leading symbol.
- **The card's interactive hover is the shadow its own spec, preview and token catalogue name** (`shadow-raise`, "an interactive card under the pointer") — the code had used `shadow-halo`, which belongs to the featured card.
- **The button's hover documentation matches the button**: a 5% brightness step over `dur-hover`, because the fill is a gradient image that a colour change cannot show through. The README and the preview said `accent-hover`.
- **The Sheet's close fade and the token catalogue's growing bar use the duration tokens they had written as literals.** The sheet's leave faded over a hard-coded `160ms` — the *hover* duration — while its own scrim and every other overlay going away use `--dur-exit`; it does now too, so a sheet and the scrim under it finish together. `token-view.tsx`'s bar grew over `900ms`; it uses `--dur-grow`. `docs/surfaces.md`'s token bridge lists `surface-raised` and `radius-md`, which the bridge has always mapped.

### Removed

- **`.sheet-right-in`, `.sheet-up-in` and the `m-sheet-right` keyframe** from `motion.css`: nothing referenced them, and the Sheet animates inline (its README claimed motion.css had no right-edge keyframe; it did).
- **`PopoverAnchor`**, exported and named nowhere (the preview uses `PopoverClose`, which stays; the README now names it).
- **Dormant exports**: `ROOT`/`Token`/`BRIDGE`/`buildCss`/`buildTheme` in `scripts/tokens.ts`, `PAIRS`/`context`/`resolve`/`colorOf` in `scripts/contrast.ts`, `LAYERS`/`CardEntry` in `scripts/registry.ts`, `VerifyConfig` in `scripts/verify.config.ts`, `adoptSet` in `cli/src/adopt.ts`, and the Atlas's internal types (`TOKEN_VIEWS`, `DOCS`, `parseSpec`, `SectionId`, `Entry`, `slug`, `HostSimulator`, `Card`, `TokenMeta`).
- **The `rail-collapsed` token**: declared since the first commit, referenced by no component, spec, bridge or script.
- **`DEMO_STALE_AFTER_MS`** (and the unused `Customer`/`StatusClass` type exports): nothing imported them.

### Breaking

- **The `rail-collapsed` token is gone** (`tokens/core.tokens.json`, and `src/styles/tokens.css` with it). Nothing a
  product keeps referenced it — no component, specification, bridge or script — so a stylesheet of your own that reads
  `var(--rail-collapsed)` was already falling back to nothing. The rail's width is `rail-width`; below 1024px it is a
  drawer, which is not a collapsed rail.
- **Dormant exports removed from Meridian's own scripts**: `ROOT`, `Token`, `BRIDGE`, `buildCss` and `buildTheme` in
  `scripts/tokens.ts`; `PAIRS`, `context`, `resolve` and `colorOf` in `scripts/contrast.ts`; `LAYERS` and `CardEntry` in
  `scripts/registry.ts`; `VerifyConfig` in `scripts/verify.config.ts`; `adoptSet` in `cli/src/adopt.ts`; and the Atlas's
  internal types. A product that imported one of these was reaching into a generator; nothing that ships depends on
  them.
- **`PopoverAnchor` is gone**, and `.sheet-right-in`/`.sheet-up-in` with the `m-sheet-right` keyframe. The first was
  exported and named nowhere; the others were referenced by nothing, and the Sheet animates inline.
- **`DEMO_STALE_AFTER_MS`** and the unused `Customer`/`StatusClass` type exports are gone from the sample fixtures.

Nothing a product renders changes shape because of any of this: `pnpm gate` proves that every export of `src/lib` and
`src/data` is imported by a file a product keeps, and it passes.

## [0.3.0] · 2026-10-04

Three field reports from products built on Meridian (issues #3, #4 and #5), taken as proposed where the proposal held and differently where it did not. Everything here is a fix to what the template ships, or a hole an adopting product could not fill itself.

### Added

- **The assistant renders a reply as markdown.** A real model answers in markdown, and the panel was showing it literally — `**High risk:**`, `- ` bullets and `|---|` table rules on screen. Each text part goes through `Prose` at `sm` (`src/components/patterns/assistant/text.tsx`), the same reader the rest of the product uses, so raw HTML stays text and every URL passes `safeMarkdownUrl`. The reply block carries `data-assistant-text`, a stable handle for a check; the person's own message is still plain text, as typed. `scripts/fake-llm.ts` gained one scripted markdown reply and `scripts/assistant.ts` asserts the list, the bold and the table are elements with the markup characters gone.
- **`CardHeader` `wrap`**, for a title that is the point of the card — an objective, a record's name — rather than a label in a list where one line and an ellipsis is right.
- **`FormSection as="div"` and `flush`.** A settings page that holds a table had nowhere to put it: `FormSection` always wrapped its card in a `<form>` with a save bar, and its body was a padded `fieldset`, so it could hold neither a table that runs edge to edge nor a form of its own (forms cannot nest). `as="div"` is the same head and card with no `<form>`, and `flush` drops the body's padding for the table. `SettingRow` sits outside `FormSection` unchanged, for a switch that applies at once.
- **Collections: `derived`, and the write shapes a real data layer can honour.** `create` and `update` took `Omit<T, K>`, which demands every field of the record — including ones a write never takes (a worked-out score, a band, joined data) — so a database-backed product had to cast around the type. They now take a plain record validated by `fields`, which is what the store always did at runtime. `derived` names the read-only fields: a page reads them, the assistant may filter on them, and `patchOf` keeps them out of every change.
- **`verify` refuses to run against a data URL that is not on this machine.** It presses every control, Delete included, and an adopted app's `DATABASE_URL` comes from `.env` — so on a first outage, or any day, those presses landed on whatever that URL names. Name extra variables in `dataUrls`, and set `allowRemoteData: true` only when you know what the presses reach. verify also prints an estimate and each phase as it goes, and names `--quick` and `--no-vitals` up front.
- **`PERIOD_SHORT`** in `src/lib/period.ts`, beside `PERIOD_LABEL`: a product that adds its own period (a 24-hour one) edits that one file, and `PeriodSelect` follows — it no longer carries a `Record<Period, string>` of its own that fails to type check the moment the vocabulary moves.
- **A timeline bar that continues past a fixed window is squared off** on the side that continues. Work that started before `from` or runs past `to` used to read as work that began at the window's edge.

### Changed

- **`FilterBar` reads its own width, not the window's** (a container query, `@max-[52rem]`). With the assistant's column open at 1440px the bar sat in about 900px and still laid out for a wide window: the search shrank to a few characters while every filter stayed. This is the rule the table already followed.
- **`Segmented` scrolls sideways with the edge fade** when its labels are wider than the track, rather than running off the card. Six options with counts in their labels ("All 37 · Idea 3 · Scored 25") no longer clip at 390px.
- **`CardBody flush` clips a `Table` as its first child and drops the header row's top border.** Directly under a card's own edge there was a second line, and the header's sunk fill squared off the card's rounded top corners — most visible in dark. A second table in the same body keeps its border.
- **The not-found screen and the error view read the home page's name from `nav`**, never "Overview". A product whose front page is a ranked list names it once in `src/app.config.ts`, and the buttons follow. The error view's second way out is `Check Health` where the product has that page and the home page where it does not.
- **`check.ts` treats `src/lib/format.ts` and `src/lib/color.ts` as the toolkit they are.** A product that re-syncs `src/lib` and removes the samples was failing Meridian's own gate on Meridian's own files (`formatCost`, `oklchToRgb`: "nothing a product keeps imports"), and had to strip the export keywords to get through. Every file under `src/lib` that Meridian ships now passes in a product, unchanged.

### Fixed

- The assistant labelled a question with the masthead `h1`, which on a detail page is the record's name with its status badge run into it ("REC-1042high risk · 0.64"). The label now comes from the route's own `document.title` ("Record REC-1042"), with the masthead as the fallback.
- A keyboard focus that scrolled into view could land under the 56px sticky top bar. The scroll region now carries `scroll-pt-16`, so a focused control comes to rest clear of it (WCAG 2.4.11).
- `docs/assistant.md` and `.env.example` say that a gateway names models `<provider>.<model>` and to copy the id from its `GET /models` — the prefix is part of the name.

### Breaking

- `Collection.create` and `Collection.update` (`src/lib/collection.ts`) take `Record<string, unknown>` instead of `Omit<T, K>` and `Partial<Omit<T, K>>`. A caller that passed a fully typed record still compiles; a data layer that had to cast now does not. `derived` is new and optional.
- `FormSection` gained `as` and `flush`; both default to today's behaviour, so nothing that does not pass them changes.

## [0.2.0] · 2026-10-04

The first release on npm. A team brings Meridian into its own dashboard with one sentence to its coding agent:
`npx zz-meridian@latest adopt`, then the skill it installs. Also: two field reports of bringing Meridian into existing
projects (issues #1 and #2), and the console's own assistant.

### Added

- **The `zz-meridian` package** (`cli/`, decision 0009, `docs/distribution.md`). `adopt` brings Meridian into a Next.js App Router project in place: it copies the tokens, styles, components, gates and scripts, merges the dependencies, replaces the global stylesheet (keeping the old one beside it), brands it, appends Meridian's rules to the project's `AGENTS.md`, installs the skill for Codex (`.agents/skills`) and Claude Code (`.claude/skills`), records every copied file in `.meridian/manifest.json`, installs and type checks. It refuses a dirty tree, a project that is not the App Router and a file it would overwrite. Meridian's files import each other by relative path, so a team's own `components/ui/button` never stands in for Meridian's; the team imports Meridian as `@meridian/…`. `create` starts a new dashboard, branded, without the Atlas. `skill --global` installs only the skill. No dependencies, no install scripts.
- **The release pipeline** (`.github/workflows/release.yml`, `.claude/commands/release-meridian.md`): the gate, the template build, the package from the committed tree, assertions on the tarball, then the consumer path from that tarball (adopt into a create-next-app fixture with its own button and data layer, which must type check, pass the gate and build with the team's files unchanged; create, gate and verify), then npm with provenance through trusted publishing, then the tag. The job that publishes installs nothing.
- `verify --no-vitals`, for a CI runner, where throttling measures a shared machine.
- The skill, run from one sentence: it skips the questions the request answers, takes its own drafts when nobody can be asked (and lists them in the hand-over), and asks for sandbox access instead of skipping validation.

- **The assistant** (`docs/assistant.md`, decision 0008): one panel in the dashboard shell that reads the page the person is on, answers about it, and finds, adds, changes and removes records through Proposals the person approves. Off until `ASSISTANT_PROVIDER`, `ASSISTANT_API_KEY` and `ASSISTANT_MODEL` are set (and `ASSISTANT_BASE_URL` for `openai-compatible`), read on every request; Anthropic or any OpenAI-compatible provider through the AI SDK. Approvals are signed and each runs once, a removal is proposed with the critical tone, the route refuses a malformed or oversized thread, the thread is kept in the browser (the last 100 messages), and Settings has "Show the assistant". `.env.example` lists the variables.
- **Collections** (`src/lib/collection.ts`, `src/data/collections.ts`): one description of each set of records, read by the pages, changed by their server actions and offered to the assistant as tools; `pageOnly` and `hidden` keep what only a page may do or see out of every tool. A **Members** page (invite, suspend, reactivate, remove) shows it; API keys and Requests read and change through it.
- `check.ts` rules: a fixture a collection serves is read only through `src/data/collections.ts`, and every export of `src/lib` and `src/data` is imported by a file a product keeps.
- `scripts/fake-llm.ts` and `scripts/assistant.ts`: `pnpm verify` runs the assistant off, then on against a fake OpenAI-compatible model, and checks that the key reaches no page, payload, script or response.
- `brand.ts --product` writes an Assistant section (the variables, `src/data/collections.ts`, the sign-in check in the dashboard layout, in `app/api/assistant/route.ts` and in every server action) into the product README and AGENTS.md. The skill covers the assistant.
- **`brand.ts --product`**: the person gets their dashboard, not the design system. It removes the Atlas, card and page specifications, previews, `docs/`, `decisions/`, the changelog and the skill, and rewrites the README and AGENTS.md. The skill uses it by default.
- **Timeline** (`charts/timeline`): bars from a start to an end day, grouped by workstream, on month hairlines with a today line, an optional monthly heat row and a screen-reader table.
- `Freshness run` for batch results ("Run 12 Mar 2026", never stale); the `compact` / `cost-compact` format names.
- `MetricTile` takes a format name (so a server page can render it) and a word value for a categorical state.
- `Rail` takes `user` and `signOut`, and shows Workspace settings only when the navigation has `/settings`.

### Fixed

- `brand.ts --product` left the Atlas's nav icons imported, so a new dashboard failed the lint gate.
- A disabled Switch kept a bright thumb and an ink-2 label; it reads disabled, as a Checkbox does.
- A record's wrapped facts no longer end a line on a dangling dot.
- The audit no longer crashes on a labelled control; it measures a labelled checkbox with its label.
- `Field` no longer passes `required` to the control, so the browser does not silently block a submit.
- `--no-atlas` matches `/system` exactly, drops empty nav groups, and removes the footer link, the Atlas modules, their packages, their build tracing and stale route types.
- `Input` is a client component; Tabs pass the audit (the count pill's contrast, and TabPanel's focus ring).
- Formatters pin `en-US` and show a currency's narrow symbol (SGD as $).
- `DetailHead` breaks only mono names anywhere; the rail marks only the longest matching item; the tests follow `app.currency`.
- The preferences key derives from the product's name; the tab icon's tokens are traced for deployment.
- `check.ts` walks every source file under `app/` (or `src/app/`) and `src/`, and no longer needs CONTRIBUTING.md; route discovery skips `api/`.

### Changed

- Node 22.18 or newer; the `packageManager` pin is gone. The gates run the tools from `node_modules/.bin`, so a project on pnpm, npm, yarn or bun passes them alike. `pnpm verify` runs the audit and the presses side by side.
- Every console page uses the data width, Settings, the error and the missing page included, so every title sits on one left edge; a Form section's card stops at 64rem. The reading width is for a page that is one long document.
- Meridian's scripts carry their own lint exception where they need one, so they pass a project's own eslint config.
- An avatar group tucks each disc under the next by 2, 4 or 6px, so the ring never cuts an initial.
- A scrolling strip (the rail's navigation, a narrow tab strip) fades at the edge with more behind it.
- The pager and Health's service grid read their own width, not the screen's.

### Breaking

- The root package is `zz-meridian-template` (private); `zz-meridian` is the published package.
- Agents may now propose a removal: `docs/agents.md`, `docs/surfaces.md` and the Proposal, Settings and Keys specifications no longer say a destructive change is never proposed. Keep an operation away from every agent with `pageOnly`.
- `formatTime`, `formatIsoDate` and `periodCutoff` are removed (use `formatDateTime`, `Intl.DateTimeFormat` or `PERIOD_DAYS`); `readPage`, `AssistantConfig`, `PAGE_TEXT_LIMIT`, `luminance`, `DISPLAY_TIMEZONE`, `formatCostCompact`, `formatCount`, `PROTOCOL`, `DEFAULT_PERIOD`, `THEMES`, `DENSITIES` and `ThemePref` are no longer exported, and `Density` is `Preferences['density']`.
- The Keys view no longer keeps its own rows: it takes them and its actions from the page.
- `NumberFormat` gains `compact` and `cost-compact`; `CompositionBar`'s `neutral-soft` is now `neutral-ink`.
- `Table` `hideBelow` reads the table's own width (from 0.1.0's later commits).
- Product pages that relied on Field's native `required` validation should validate in the page, which already shows `error`.

## [0.1.0] · 2026-10-03

The first release: a dashboard design system and a working template, built on the layered-card pattern and the dark, lit register of 0002.

### Added

- **Tokens**: DTCG 2025.10 files for the palette, core, two themes, four accent presets (indigo, cobalt, jade, graphite) and a compact density, with a resolver. `scripts/tokens.ts` generates the CSS and a Tailwind v4 bridge that resets Tailwind's own scales.
- **Base**: the lit ground (the accent's light, painted once), text roles from display to mono kicker, motion (arrive, answer, float), the shell with its condensing masthead, the embed surface and host bridge.
- **Components**: actions, inputs, display, navigation, feedback and data parts, each with a specification and a preview of every state.
- **Patterns**: the rail, command palette, featured metric, metric tile, the Meridian charts (trend, sparkline, bar list, composition, columns, heatmap, uptime), data table, filter bar, status list, form section, activity feed, and the agentic patterns: embed frame, Ask about, Proposal.
- **Pages**: Overview, Requests, Request, Analytics, Health, Customers, API keys, Settings, Sign in, not found, error and loading; MCP App views for the overview, requests, health and an agent proposal.
- **Design Atlas** at `/system`: the front door, every card live in any theme, accent and density, pages on the console, a phone and a simulated MCP host.
- **Quiet light** (decision 0006): translucent surfaces that let the ground's light through; the glow in the frame (a lit edge and a faint halo on the featured card, a lit edge that fades in under the pointer on interactive cards), a whisper of light under chart lines; the primary action turning toward violet; one solid accent phrase per screen; no grain.
- **Tables**: columns spaced 32px apart with the card's padding on the outer edges; a text column after a right-aligned number gets 16px more; the lead column takes about a third and the rest of the slack is spread by content; a fixed-width method chip lines routes up.
- **The `zz-meridian` skill** (`skills/zz-meridian/`): a standalone Claude Code skill that builds a new dashboard from this template, or brings Meridian into an existing frontend, from a plain description, and validates it.
- **`pnpm brand`** renames and rebrands a copy in place; a brand hue becomes an accent preset that holds contrast in every theme. **`pnpm verify`** runs the gate, a production build and the browser audit of every discovered route against the built app.
- **Gates**: contrast in every theme and accent with the chart palette's colour-vision checks, the registry, specification consistency, types and tests; a browser audit of every page.

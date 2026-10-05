# Changelog

Every release of ZZ Meridian, newest first. Versions follow semver: a removed or renamed token, prop or card is major; a new card, token or variant is minor; a corrected value is a patch. Each entry says what breaks and what to do instead.

## [Unreleased]

### Added

- **`zz-meridian update`: a real, reviewable update.** For a project adopted or created with 0.3.0 or later.
  - `--dry-run` replays the recorded release in a scratch folder, after checking it against the registry's integrity record, and prints the plan. It writes nothing, and refuses if any recorded file disagrees with the replay.
  - A plain `update` replaces every Meridian file the team has not touched, adds the new ones and removes retired ones. Files the team edited, deleted or kept are staged as base/ours/new copies, never overwritten.
  - It adds the dependencies and scripts the release needs to `package.json`. An entry still exactly as the earlier release wrote it follows the new release; one the team chose becomes a migration. It updates Meridian's managed block in `AGENTS.md`.
  - Every run writes `.meridian/update/<version>/` with a journal, `MERGE.md` and `resolutions.json`, even when nothing is staged.
  - It refuses, writing nothing, on a dirty tree (unless `--allow-dirty`), an open session or a left-behind lock, a bad manifest or keep entry, or an unsafe path.
  - The default output lists only what needs a decision; `--verbose` lists every file.
  - `update --finalize` checks every resolution against the current files, confirms the installed framework versions, then runs the gate and one production build in place. Only then does it record the new version and archive the report to `.meridian/history/`. A check that changes a source file fails the session and leaves the bytes alone. The browser checks stay a separate `verify`.
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

- **One rule says which files are Meridian's.**
  - `cli/src/ownership.ts` decides it for `adopt`, `create` and `update`; `references/ownership.md` in the skill is the same rule, rendered.
  - Meridian's files are its tokens, styles, components, scripts (except `scripts/verify.config.ts` and a `scripts/check.local.ts`), its library helpers, `src/views/console-chrome.tsx`, `tests/setup.ts`, the brand outputs and both skill copies. Everything else is the team's, including a file the team adds inside one of Meridian's folders.
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

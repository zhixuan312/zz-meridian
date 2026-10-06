# 0010 · The adopter contract

Date: 2026-10-06 · Status: accepted (ships in 0.5.0)

## Context

Decision 0009 made Meridian a package that copies, and gave it a manifest so an `update` could one day tell an untouched
file from an edited one. Four things were still open when 0.4.0 shipped. A team could not update at all: a file the team
had changed was either overwritten or left behind with no record. The template could not be trusted as a base for a
product: its pages read the request on every render, its data layer had no notion of who was asking, and a tab never
learned that another tab had written. And `pnpm verify` was one long run with flags that skipped parts of it, so a team could not tell
from its output what a pass had covered.

This decision records what 0.5.0 promises an adopter, in one place. Each part below is also in the code and in the skill;
this is the reason they agree.

## Decision

### Ownership and the keep register

- One rule says which files are Meridian's: `cli/src/ownership.ts`. `adopt`, `create` and `update` all use it, and
  `references/ownership.md` in the skill is the same rule, rendered. Meridian's files are its tokens, styles, components,
  scripts (except `scripts/verify.config.ts`, `scripts/verify.baseline.json` and a `scripts/check.local.ts`), library helpers, `src/views/console-chrome.tsx`,
  `tests/setup.ts`, the brand outputs and both skill copies. Everything else is the team's, including a file the team adds
  inside one of Meridian's folders.
- The manifest records only Meridian's files. A 0.3.0 or 0.4.0 manifest also lists pages, views, data, docs and
  `src/app.config.ts`; an update treats those entries as the team's and never deletes them, and the next manifest leaves
  them out.
- An update replaces only Meridian's files. It edits three team files and no others: `package.json` (missing
  dependencies and scripts, older ones of the same major, and entries still exactly as the earlier release wrote them),
  the managed block in `AGENTS.md`, and the lockfile the install rewrites. A choice the team made becomes a migration.
- `.meridian/keep.json` is the register of Meridian files the team keeps on purpose: an array of exactly
  `{ path, reason }`. An update leaves a kept file as it is. The gate refuses an entry for a path Meridian never managed,
  a duplicate, a blank reason, and a kept file that is missing. An update never recreates a kept file.

### Update, resume, finalize and abort

- `update --dry-run` replays the recorded release and the running one in a scratch folder, after checking the recorded
  one against the registry's integrity record, and prints only what needs a decision. It writes nothing.
- A real `update` runs on a clean git tree. It writes the session (`.meridian/update/<version>/`: the journal, `MERGE.md`,
  `resolutions.json`, and the `base/`, `ours/` and `new/` copies of every staged file, with a `backup/` preimage of every
  path it changes) before it applies anything, then applies the safe changes and installs.
- The outcome is **pending** or **complete**, and the manifest tells which. Pending means the update applied with work
  left: a file to merge or a migration to resolve. The manifest still records the old version, the gate fails and names
  the open session, and the exit code is `2`. Complete means the gate and one production build passed on the live
  project, every item has one current resolution, and only then does the manifest record the new version. An update with
  nothing to resolve completes in the same command, exit `0`.
- `--finalize` is the only command that completes an update. It checks every resolution against the current files,
  confirms the installed framework versions, runs the gate and one build in place (`--verify` runs the product's default
  verify once instead, and records its coverage line), and compares every protected input before and after: a check
  that rewrites source fails the session and leaves the bytes alone.
- `--resume` continues an interrupted or failed run. It applies only what is still the recorded original and never
  overwrites a later edit. `--abort` restores only the preimages in `backup/`, deletes only what the update created, and
  refuses, keeping every backup, when a path it wrote was edited since.
- `--resume`, `--finalize` and `--abort` belong to the package version that began the session. They read the session's
  own copies and never ask the registry.
- Updates start from 0.3.0. The four published origins, a project adopted and a project created with 0.3.0 and with
  0.4.0, are the supported starting points, and the release smoke runs every one of them through update and finalize.

### The access seam, scoped caching and live data

- A page, a Server Action and the assistant reach records through `src/data/` and nowhere else. `access.ts` says who the
  request is and what they may do (`resolveAccess`, `collectionFor`, `can`); the sample binds one tenant and one owner,
  and a product replaces the policy with its own session and database predicates.
- `read(name, query)` refuses a collection the caller may not read before any cached code runs, caches per scope and
  query with `{ stale: 30, revalidate: 60, expire: 3600 }`, tags the tenant's collection `collection:<sha256>`, and
  returns `observedAt`. A write authorizes the operation and every record it touches, writes through the caller's own
  collection, and calls `updateTag` after the commit, so exactly that tenant's reads are refreshed.
- The template builds under Cache Components with `partialPrefetching`. Every non-API route is static or partial, and
  `scripts/route-policy.ts` fails one that is not unless `requestDependentRoutes` declares it with a reason. The shell
  does not await the request: it takes a promise of whether the assistant is configured.
- The clock is the data's. `Freshness`, `ShellTools`, `AlertsPanel` and `formatRelative` take `now`, and none of them
  reads the browser's clock.
- The console shows live data over one `EventSource` per tab. A hint names only a collection, never a record, a tenant
  or a cache tag; it is sent after the caller's scope is checked again. A hidden tab closes its stream, a failed stream
  falls back to polling, and a safety refresh runs every 30 s on a healthy one. The sample stream is one process:
  across processes, an adapter (`references/live.md`) is the product's to write, and polling cannot reconcile stores
  that diverged.
- An approved assistant change is authorized again when it runs, through a guard the route passes in. A permission
  revoked since the approval refuses it.

### The three verify modes

- `pnpm verify` is bounded: the gate once, one production build, the route policy, first-load JS against the cap and the
  per-route baseline, complete HTML against `budgets.htmlKb`, and a navigation smoke of up to three routes on desktop and
  through the 390 px phone drawer. It never refuses for a missing safe backend or Chrome; it reports the browser as
  `not run`.
- `pnpm verify --full` adds every mapped rail route and every exhaustive suite: the audit, every control and link, the
  keyboard walk, the assistant, live data and Web Vitals. It requires Chrome, a safe backend and a mapping for every route.
- `pnpm verify --perf` takes 20 samples per route, device and condition (warm, cold, after a live refresh) and reports the
  median, p95 and max. A p95 over its budget is `warn`; a sample that is never ready, or a control that does nothing, still fails.
- Every run ends with one coverage line, and writes the gate and build counts to `out/verify.txt`. Nothing that did not
  run is reported as passed.
- HTML caps are `/requests` 150 KiB and `/health` 100 KiB. The stakeholder set them after measurement showed no variant
  kept the page title instant within 130 KiB.
- Weekly is weekly, release is release, and nothing runs twice. The release gates, each once, on the default verify
  from a clean `.next` on the GitHub-hosted ubuntu-24.04 4-CPU runner (at most 120 s, raised to 180 s in 0.6.0 because the runner's CPU varies, with its browser smoke; the gate
  and its unit tests run inside it) and on the consumer smoke from the tarball: adopt, create with its default verify,
  and all four published origins updated through finalize. After publishing it checks the registry serves the tested
  tarball (equal sha256) with provenance, and tags last. A weekly workflow runs `verify --full --perf` (the perf part a
  report) and the consumer smoke's adopted default-verify cases and recovery and failure cases; a failure notifies and
  nothing waits on it.

### Every breaking interface, with its migration

An update to 0.5.0 reports each of these as `migration:<id>` where a team-owned file still has the old shape. Each is
resolved in the project, recorded in `resolutions.json`, and checked by the gate and a build (`verify-modes` by the
gate alone). The completion step is the section its instructions name.

| Id | What broke | Completion step |
|----|------------|-----------------|
| `verify-modes` | `--quick`, `--no-vitals` and `--extra` are gone from `verify` | `validation.md`: replace each with `pnpm verify`, `--full` or `--perf` in the script, workflow or shell file |
| `shell-assistant-promise` | `AppShell`'s `assistant` is a `Promise<boolean>` | `cache.md`, "The shell's assistant promise": pass a promise and do not await it |
| `assistant-available-promise` | `useAssistantAvailable()` returns a `Promise<boolean>` | same section: `use(useAssistantAvailable())` inside `Suspense` |
| `clock-now-required` | `Freshness`, `ShellTools`, `AlertsPanel` and `formatRelative` require `now` | `cache.md`, "The clock is the data's": pass the data's clock |
| `cache-components-config` | the Next config sets `cacheComponents` and `partialPrefetching` | `cache.md`, "Turn Cache Components on": add both, then make every route static or partial |
| `connection-boundaries` | a page or layout no longer awaits `connection()` | same section: remove it and read behind a boundary |
| `authorized-read` | a page reads through `read()`, not `.query(` | `cache.md`, "Authorized, scoped reads": add `access.ts` and `read.ts` |
| `scoped-invalidation` | a writing Server Action invalidates its tenant | `cache.md`, "Writes authorize, then invalidate": `updateTag` after the commit |
| `live-provider` | the console has a live route, a refresh action and a provider | `live.md`, "The live starters" and "Refreshing": add the five files and the provider |
| `authorized-endpoints` | the assistant route and every actions file resolve the caller; `assistantTools` and `respond` take the guard | `cache.md`, "The assistant route": call `resolveAccess()` first and bring `tools.ts` and `respond.ts` over |

Other breaking changes have no migration, because Meridian's own files arrive with the update, a dependency is reported
as `dependency:<name>`, or the file is a sample page that only a created project has:

| What broke | What the team does |
|------------|--------------------|
| `src/lib/collection.ts` is Meridian's and `zod` is a dependency; `Query` gains `offset` | arrives with the update; a staged conflict is merged, and a pinned `zod` is a `dependency:zod` migration |
| `src/lib/preferences.ts` no longer takes branding edits; `ACCENTS` is the presets plus `app.accent` | set a custom accent in `src/app.config.ts` alone |
| `filterRequests` is removed; `RequestsView` takes `{ rows, total, summary, state, pageSize }`; `KeysView` takes `now` | a created project takes the release's version of the page and view; an adopted one never had them |
| `brand.ts --existing` and `--product` no longer write to `AGENTS.md` | the CLI writes the managed block; run `adopt`, `create` or `update` |
| the manifest records only Meridian's files | nothing: old entries stay on disk and leave the manifest |

## Consequences

- A team can update, and can see before it does what the update would do. The cost is that an update is a session with
  a lifecycle: a project can sit pending, and its gate fails until someone resolves or aborts it.
- An update never decides for the team. Everything beyond copying a Meridian file is a migration with instructions, and
  the agent resolves it in the team's own file.
- Adopters get a template that is partial by default and authorized by construction. The cost is the access seam: a
  product must bind `access.ts` to its own sign-in before its reads mean anything, and the sample is a demo that says so.
- The default verify is cheap enough to run before every change. What it does not run, it says, and `--full` and
  `--perf` are the places that find the rest; they run weekly, not on the release path.
- Breaking: every row above. A project updating to 0.5.0 resolves the migrations it is reported, then finalizes; a
  project that is not on 0.3.0 or later adopts or creates again first.

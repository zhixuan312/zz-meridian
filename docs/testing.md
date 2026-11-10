# Testing

This page is the testing standard: the kinds of test, the three tiers, when each runs, and the rules a red, a limit and a release follow. An adopted or created project follows it, Meridian follows it, and a spec cites it rather than restating it.

## The kinds

A check has one size and one type. The two are independent: a size never says what a check checks, and a type never says what it costs.

**Size** is what a check needs to run, not what it intends.

- `static`: reads files, with no test runner and no process of its own beyond the tool (the token and registry checks, the specification checks, contrast, route types, types, lint).
- `small`: one process, in the test runner, with no child process, no server, no browser and no build.
- `medium`: starts processes or servers on this machine, with no browser.
- `large`: needs a real browser or a production build.

Size sets the cost, so it sets when a check can run: the smaller it is, the earlier and the more often.

**Type** is what a check checks.

- `functional`: does it do what it should (a control works, a page reaches its data, a function returns the right value).
- `non-functional`: a quality other than speed (accessibility, contrast, layout and overflow, sizes and bytes, route policy, the safety of the data a run can reach).
- `performance`: time behaviour against a budget (navigation budgets, live-data bounds, the Web Vitals floors).

Type sets whether a run needs a quiet machine: a performance check measures the machine as well as the page, so only a performance check needs one. Regression is not a type: it is why a change is checked.

## The tiers

A tier is what a piece of work is for, and it decides which command proves it. There are three, in the order a piece of work is planned.

- **Tier 1: works.** The agreed result works, completely: functionality, data integrity, migrations, auth and access boundaries, contracts, compatibility, and any agreed operating requirement. Its tests prove the result; a Tier 1 phase uses `pnpm test:t1`.
- **Tier 2: works well.** It already meets the requirement and becomes better to use: speed, latency, smoothness, responsiveness beyond what the requirement needs, and the broad sweeps across views, states and widths. Tier 2 is measured and reported, never a red: a value past its line is a warning with its numbers, the run continues and exits 0, and every run records its values for the next release to compare against. A Tier 2 phase uses `pnpm test:t2`.
- **Tier 3: built to last.** The code is easy to maintain and change: standards, clear implementation, confirmed-dead code removed, reuse where a concrete need exists. It has no test suite of its own; a Tier 3 phase uses `pnpm test:t2`, so whatever it preserves is still proven.

There are exactly three test commands, and none takes an argument. The tool picks the tests.

| Command | Runs |
|---|---|
| `pnpm test:t1` | The Tier 1 tests affected by the changes since the last green run, eslint over the source files the change touches, and the type check. |
| `pnpm test:t2` | The affected Tier 2 checks, and the affected Tier 1 tests with them. |
| `pnpm test:release` | Every Tier 1 and Tier 2 test, once, plus the timed browser suites, lint and the type check. |

**Selection.** Vitest's `related` reads the import graph and runs the tests that reach a changed file; a changed test file is run itself. A document has no import edge, so the tests that name it are its group (`git grep` over `tests/`): `docs/testing.md`, for example, selects the guards that read it. A change that reaches no test at all runs the whole tier, and so does a deleted source file, whose importers can no longer be computed: an import graph that knows nothing about a file is not evidence that nothing needs checking. The static checks (the tokens, the registry, the specifications, contrast) read the whole tree and run on every tier.

**Tier 2 is a convention, never a list kept by hand.** `*.perf.test.ts(x)` is Tier 2 in any repository. This repository's broad browser sweeps are Tier 2 as well: every page at every width in both themes, every control pressed, every keyboard stop, the assistant walk-through and the product's own checks run as `scripts/browser.ts --depth fn`, selected for a change that can alter what a page draws or a control does. The timed checks (navigation budgets, live data, Web Vitals) are the same file's `--depth timed`, and the 20-sample protocol is `--depth perf`, which runs only where `CI` is true. Their values — the navigation budgets, the size caps and growth, LCP, INP, CLS and dropped frames, the p95s — are reported with their numbers and never fail a run: a red is Tier 1 alone. `test:t2` reports the timed suites not run: `test:release` runs them alone on a quiet machine. Every other test under `tests/` is Tier 1. `test:t1` never runs a Tier 2 check. A repository with no `*.perf` test still has `test:t2`, and it runs the affected Tier 1 tests.

`tests/deep-*.test.ts(x)`, the large browser-fixture suites of the checks, are Tier 1: they verify a check script's function, not a quality beyond the requirement. Their size, not their tier, keeps them out of the main Vitest run; they run as their own stage when a script, a journey or one of their own files changed, and `test:release` always runs them.

**A change is linted as it is checked.** `test:t1` runs the same eslint `test:release` runs (linting the whole repository) over the source files a change touches — a lint error once reached master through a run that checked types but never linted (the drawer's `react-hooks/refs`, `b54c5d7b`). Documents and generated output are left out (`lintTargets` in `scripts/lib/lint.ts`).

**Last green.** After a passing run the command writes the commit it proved to `out/last-green`, which is gitignored, and reads it before the next run. That keeps a per-change run to the diff since the last green, not the branch's whole history. A missing marker falls back to the diff against master. A checkout with neither a marker nor a diff (master itself, a fresh CI clone) runs the whole tier, because no green run is evidence for it. A Tier 1 run leaves the marker alone when the change also needs a Tier 2 check, so `test:t2` is not skipped by the run before it. A Tier 2 value over its line does not hold it: the run is a pass that reported.

A run that needs Chrome reports `not run` with the reason where it is absent, and never `ok`: this repository's `tests/deep-*`, the browser sweeps, the timed suites and the Postgres suite with no service URLs. Nothing that did not run is reported as passed, and a run with something not run does not advance the marker.

**A not-run is either evidence missing or a project's own configuration.** Absent Chrome, absent service URLs and a browser that did not start are missing evidence: the check is reported not run with the reason and the run does not advance the marker, because a later run on a machine that has them can. A case a project leaves unrun by its own configuration — a rail route with no navigation check, a prefetch cap that is not its promise because its rail is not in a drawer on a phone (`scripts/navigate.ts`), a size baseline the project inherited from the release instead of recording its own (`sizeBaselineOwned` in `scripts/lib/sizes.ts`), or a build that writes no `renderingMode` because the project's Next config sets neither `cacheComponents` nor `partialPrefetching`, which the route policy presupposes (`scripts/route-policy.ts`, as an update's finalize already reports it) — is reported not run with the reason on every run, never as a pass, and does not hold the marker: a rerun can never change it, and holding it would rerun the whole tier, browser sweeps included, on every run of every project that has not configured navigation. `declaredNotRun` in `scripts/lib/coverage.ts` draws the line; `scripts/browser.ts` reports such cases under `declared`, and `scripts/test-run.ts` prints them as `not run (declared by the project's configuration)`.

## When each runs

A moment is when a person or an agent runs a command. CI runs the same commands at the same moments.

- **While editing**: `pnpm test:t1`, or a narrowed run of the file changed, `pnpm exec vitest run <file>`, and a look at the page with `node scripts/shot.ts <route> --width 1440,390 --theme dark,light`.
- **After a change** (one complete logical change that can be verified on its own, in any tier): `pnpm test:t1` and the tests the change affects. For visible behaviour, exercise the flow or state that changed, and run `pnpm test:t2` when the change can alter what a page draws or a control does.
- **After a Tier 2 or Tier 3 phase**: `pnpm test:t2`. A change under `cli/` or the update flow also runs the consumer smoke's update half (`--adopt --update --verify`), and any other `scripts/` change its verify half (`--adopt --verify`), both with CI's flags — `CI=true` — so the path an adopter walks is proved before the push, not by the scheduled run hours later.
- **Before a release**: `pnpm test:release`, once, after any Tier 3 work, on a quiet machine: its timed suites judge times. A later relevant change makes part of that evidence stale; re-run only the tests it affects.
- **On a schedule**: `pnpm test:t2` on master's current commit, in `.github/workflows/weekly.yml` (Meridian's repository only). A marker is absent in a fresh CI clone, so the run covers the whole tier and, where `CI` is true, the 20-sample protocol.
- **Meridian's release** (`.github/workflows/release.yml`, dispatched from master; Meridian's repository only): `pnpm test:release`, then the consumer smoke on the tarball the release publishes. It publishes and tags last.
- **An update's finalize** (`update --finalize`): `pnpm test:t1` — the Tier 1 tests affected by the change, the static checks and the type check — then a production build and the build's own checks in the project. Two of those judge the project, not the release, and are reported `not run` with the reason — never counted as passed and never failed — when the project cannot supply what they read. `node scripts/route-policy.ts` is not run when the project's Next config does not set both `cacheComponents` and `partialPrefetching` (a project with no config has neither): the route policy reads the prerender modes only those flags make a build write, and an adopted project keeps its own config, so an update never switches its rendering on to get a green finalize. `node scripts/sizes.ts` is not run unless `scripts/verify.baseline.json` is the project's own — the team recorded it (`node scripts/sizes.ts --write-baseline` stamps `recordedBy: "sizes.ts"`) and it differs from the release's — because a created project inherits the release's baseline, and a product with pages of its own would otherwise be judged against figures that are not its. It does not run `test:release`: the browser sweeps and the timed suites belong to the team's own release before it ships, and a finalize that ran them cost over an hour on a 4-CPU runner (run 42600180906) for every adopter's update.
- **An update's finalize time** is a Tier 1 operating requirement, guarded by the consumer smoke (`cli/scripts/smoke.ts`): each case's finalize wall time is recorded, and a case over its limit fails the run. An adopted origin has no shipped tests, so its finalize is the static checks, the type check and the build: 0.38.0's own finalize ran that scope in 37.0 s on the 4-CPU release runner (its build 13.8 s of it, run 42600180906), and the case keeps the 90 s limit it was already held to — kept, not loosened. A created origin's finalize runs its whole shipped Tier 1 set — 340 files and 2338 tests, 33 s on this Mac plus the type check and the build, about 1.3 min in all, and about 3 min on the 4-CPU runner, where the template's own 496-file set took 188 s — and it is held to `FINALIZE_CREATED_LIMIT_MS`, 240 s. Measured locally on Node 26 with the two build checks reported not run for the adopted origin: the adopted 0.38.0 origin finalized in 15.1 s (`tests 6.9s · build 6.5s`), and the created one, whose config sets the flags so the route policy ran, in 46.0 s (`tests 30.4s · build 13.0s · route-policy 0.2s`). A finalize that grows past its limit is red in `gates` before it reaches an adopter, and raising a limit takes the owner's decision like any other limit.

## Local runtimes

The browser suites need a Chrome executable, which `CHROME` may name, including official `chrome-headless-shell` for unattended runners. Downloads are explicitly directed into each temporary profile's own `Downloads`, never the user's default folder.

The Postgres suite the skill's references hand a team lives in `scripts/fixtures/postgres/` and needs `MERIDIAN_POSTGRES_URL`, `MERIDIAN_POOLER_URL` and `MERIDIAN_PG`. `pnpm test:release` runs it where those are set and reports it **not run** with the missing names where they are not; it is never reported as passed.

## Rules

- **Behavior, not pins**: assert user-visible meaning, transitions, boundaries and errors, not source snippets, prose, utility classes, incidental defaults, wiring or byte copies. Remove incidental pins rather than repinning them; retain meaningful behavior, accessibility, security, architecture and planted-validator cases.
- **Observer readiness**: the interaction check waits for its mutation observer to attach before sending input. Elapsed timer delays are not proof that a busy renderer has armed it.
- **Asynchronous state**: wait for the state under assertion. A neighboring live-region message is not proof that the state under test has settled.
- **Standalone gates**: preserve the Node-built-in-only dependency boundary.
- **Isolated effects**: reset observed state between tests and settle the callback created by that test, not a stale callback left by an earlier case.
- **Owned resources**: temporary fixture folders are removed after each case. A child-process readiness wait reads complete output across chunks, rejects on spawn failure or early exit, and the owning case waits for shutdown in its cleanup.
- **Quiet machine**: A run needs a quiet machine exactly when it runs a check whose type is performance: no other build, browser or test run.
- **Fixed means**: every red is fixed in the product or in the check, never by skipping, narrowing or deleting the check. A limit moved under `## Budgets` changes a value, never what is measured.
  - A red is fixed when its cause is named and a test that failed on the old code passes, at the lowest layer that can show it.
  - A measurement no test can reproduce (a time, a dropped frame) is fixed after three consecutive passes on a quiet machine. One pass of a measurement is not evidence.
  - A red whose cause is not named after a run narrowed to its route or page, with the render instrumented, goes to the owner as a decision, with what was measured, before any limit is touched.
- **Limits, and the flag line**: every Tier 2 value is judged against the release before, and reported; every run records each value (per tap, per sample) in `out/perf-record.json`, and ends with one table sorted by change: check, page, baseline → now, change. A timing is flagged at +25% and at least +10 ms, an LCP-scale value at +25% and at least 0.1 s, CLS at +0.05, a size at +5%; improvements are listed too. Once three releases are recorded the line comes from their measured spread instead — outside mean ± 2 sd with `max(sd, 5% of the mean)` as the spread's floor, and the same minimum move — and the flag is a report, never a failure. `scripts/perf-history.json` holds the last five releases; a fresh checkout without it, or a project, uses the seed (today's budgets as values) and says so. A baseline older than the previous release warns. Nothing in this section blocks a run; isolating a flagged value to one commit is a manual before-and-after step, never a bisect tool. The budgets in `## Budgets` are the seed and the yardstick, not limits a run enforces.
- **Once per commit**: evidence recorded on a commit stands for it and for any later commit whose difference touches none of the command's inputs. A command is run again only when its record is missing, its inputs changed, its record disagrees with what was reported, or it is in concrete doubt.
- **Flaky is red**: a Tier 1 check that fails sometimes is a red under `Fixed means`; a retry that passes does not clear it. A Tier 2 value that jumps without a code change is reported like any other, and investigated from the table.
- **Releases**: a release runs `pnpm test:release` on the commit being released. A red left at a release is the owner's decision, named in the release's changelog as a known issue with where it is fixed. A command's inputs are the scripts it runs, the product code and its configuration, the package manifest and lockfile, every document a page renders, and, for a test command, the files its tests read.

## Basis

- **Sizes** by what a test needs, not what it intends: Google's small, medium and large (*Software Engineering at Google*, ch. 11, and the Google Testing Blog's "[Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html)", 2010). Meridian adds `static` for a check that runs no test at all, and counts a browser or a production build as `large`.
- **Tiers** as stages: fast checks per change and slower stages before a release, in one pipeline (Humble and Farley, *Continuous Delivery*, 2010).
- **Proportions**: many fast tests and few slow end-to-end ones ("[The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)", Ham Vocke, 2018).
- **Types** after the ISTQB glossary and ISO/IEC 25010. Meridian lifts performance out of the non-functional qualities into a type of its own, because it alone needs a quiet machine, and does not count regression as a type.
- **Measurement**: performance judged by percentiles of repeated samples on a quiet machine, the phone after Lighthouse's mobile throttling.
- **Flakiness** as a defect: a test that passes and fails on the same code erodes trust in every result (*Software Engineering at Google*, ch. 11 and 14).

## Budgets

A limit that moved, with what it was set from.

| Limit | Old | New | Run | Machine | Commit | Samples | p95 | Margin |
|---|---|---|---|---|---|---|---|---|
| `/system/start/start-a-dashboard` phone warm shell, its own `budget` in `scripts/verify.config.ts` | 300 ms | 250 ms, the shared phone warm shell: the route's own figure is withdrawn | weekly `perf` shard 5/5, run 39145209850 | GitHub's `ubuntu-24.04` runner, the phone at 3.2x | `dfdad67` (withdrawn in `55b7ece`) | 20 | 58 ms (median 43, max 59) | none: a withdrawal returns to the shared figure, which holds the p95 with room |
| First-load JS cap, every route (`FIRST_LOAD_CAP_KB` in `scripts/lib/budgets.ts`) | 820 KiB | 830 KiB, the owner's decision for 0.33.0 | `node scripts/sizes.ts` after `pnpm build` of Phase 1 wave 1 of issue #99 | local, macOS | `bf0fda4` plus wave 1 | 1 (a byte count does not vary between builds of one tree) | n/a | `/engineering` 823 KiB, 7 KiB under |

## The classification

Every test belongs to exactly one tier, by the convention alone: a file matching `*.perf.test.ts(x)` or this repository's `tests/deep-*.test.ts(x)` is Tier 2, and every other test under `tests/` is Tier 1. `tests/cli-*` is Meridian's repository only (the package's own tests; a project made from Meridian has no `cli/`). The static checks run on every tier because they read the whole tree.

| Key | Size | Type | Tier | Quiet machine | Command | What it checks |
|---|---|---|---|---|---|---|
| `static/tokens` | static | non-functional | 1 | no | `node scripts/tokens.ts --check` | The generated token CSS matches `tokens/`. |
| `static/registry` | static | non-functional | 1 | no | `node scripts/registry.ts --check` | The Atlas registry matches the card folders. |
| `static/specifications` | static | non-functional | 1 | no | `node scripts/check.ts` | Cards, READMEs, tokens and page specifications follow the contract. |
| `static/product rules` | static | non-functional | 1 | no | `node scripts/check.local.ts` | A product's own rules, beside Meridian's, where it wrote one. |
| `static/contrast` | static | non-functional | 1 | no | `node scripts/contrast.ts` | Every specified foreground on its background, in every theme and accent. |
| `static/types` | static | functional | 1 | no | `next typegen`, `tsc --noEmit` | The routes are generated and the TypeScript compiles. |
| `static/lint` | static | non-functional | 1 | no | `eslint . --ignore-pattern .meridian/` | The code passes the Next ESLint config. |
| `build/sizes` | large | non-functional | 1 | no | the browser run of `pnpm test:t2` and `pnpm test:release` | `scripts/sizes.ts --base`: every route's first-load JS and every page's gzipped HTML, against their caps and baselines. The HTML baseline records the Node major its pages were built with (`html.node`); growth is judged only under that major, and a run under another reports `warn` and lists the check as not run, because gzip frames the page's inline stream differently per major. |
| `tests/tier1` | small, medium | functional | 1 | no | `pnpm test:t1` | Every test under `tests/` outside the Tier 2 convention, selected by the import graph. |
| `tests/tier1/cli` | small, medium | functional | 1 | no | `pnpm test:t1` | Meridian's repository only. The package's own tests: the CLI, its update and release paths. |
| `tests/tier1/deep` | large | functional | 1 | no | its own stage of `pnpm test:t1`, `pnpm test:t2` and `pnpm test:release` | Meridian's repository only. `tests/deep-*`: the check scripts against browser fixtures, each planted defect found and each corrected twin passing. |
| `tests/tier1/postgres` | medium | functional | 1 | no | `pnpm test:release` | The Postgres code against a Postgres and a PgBouncer, where their URLs are set; reported not run otherwise. |
| `tests/tier2/perf` | small, medium | performance | 2 | yes | `pnpm test:t2` | `*.perf.test.ts(x)`: performance beyond the requirement. |
| `browser/sweep` | large | functional, non-functional | 2 | no | `pnpm test:t2` | `scripts/browser.ts --depth fn`: every page at six widths in both themes, every control pressed, every keyboard stop, the assistant walk-through and the product's own checks. |
| `browser/timed` | large | performance | 2 | yes | `pnpm test:release` | `scripts/browser.ts --depth timed`: every rail route's navigation budgets, live data, the product's timed checks and the Web Vitals floors. |
| `browser/perf` | large | performance | 2 | yes | `pnpm test:t2` where `CI` is true | `scripts/browser.ts --depth perf`: the 20-sample navigation protocol, p95 against the budgets. |

Each script also runs alone when a question calls for it, against a served build, with the flags at the top of the file: `node scripts/audit.ts`, `node scripts/interactions.ts`, `node scripts/keyboard.ts`, `node scripts/vitals.ts`, `node scripts/shot.ts` and the rest.

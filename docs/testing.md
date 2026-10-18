# Testing

This page is the testing standard: the kinds of test, the tiers that combine them, when each runs, and the rules a red, a limit and a release follow. An adopted or created project is advised to follow it, Meridian follows it, and a spec cites it rather than restating it. The last section classifies every check Meridian runs by those terms. A row or a command that only Meridian's own repository has says so: a project made from Meridian ships without `cli/`, `.github/`, `tests/cli-*` and `tests/deep-*`.

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
- `performance`: time behaviour against a budget (navigation budgets, live-data bounds, the Web Vitals floors, the 20-sample p95).

Type sets whether a run needs a quiet machine: a performance check measures the machine as well as the page, so only a performance check needs one. Regression is not a type: it is why a change is checked, by the complete and the timed tier together.

## The tiers

A tier is when a check runs, ordered by speed and scope. The first four are one command each. The change tier adds to the quick one and the complete tier to the change one; the timed tier stands beside the complete one, and the two together are the whole standard. In any combination of them, the gate and the build run once.

- **quick**: `pnpm gate`. The static checks and the tests, with no browser and no build; `tests/deep-*` is left out. In Meridian's repository it runs `tests/cli-*` too, which `node scripts/gate.ts --without-cli-tests` leaves out.
- **change**: `pnpm verify`. Adds to the gate (run without `tests/cli-*`) one production build, the route policy, the first-load and HTML size checks, and the navigation of up to three routes on desktop and through the phone drawer, judged on function. It ends with a coverage line that says what ran and what did not, and never refuses for a missing Chrome or safe backend: it says the browser did not run, and why.
- **complete**: `pnpm verify --full`. Adds the navigation of every rail route, the audit of every page, every control pressed and every link followed, the keyboard walk, the assistant and the product's own browser checks. Nothing in it judges a time, so it is not the whole standard: `pnpm verify --full --timed` is.
- **timed**: `pnpm verify --timed`. The navigation of every rail route with its budgets judged, then the live data, the product's own timed checks (`timedChecks` in `scripts/verify.config.ts`) and Web Vitals, alone and last, so it needs a quiet machine. It does not imply the complete tier ran. `pnpm verify --full --timed` is the whole standard, on one gate and one build with the complete suites first, and the only run that can end "the project meets the Meridian standard". The timed suites measure the server the run left: with the assistant off under `--timed` alone, and with it on, pointed at the fake model, under `--full --timed`, so a page there carries the assistant's launcher.
- **on request**: a command no tier runs, run at the moment `## When each runs` gives it. The combinations that exist:
  - `pnpm verify --perf` is the 20-sample navigation protocol, and the whole of it runs only in CI, split by route with `--shard <i>/<n>`, each shard on its own runner. It refuses to run elsewhere, and a shard runs alone or beside the other tiers. Locally, perf runs only narrowed, `node scripts/perf.ts --routes <route>`, to diagnose one route or to sample a recalibration.
  - `pnpm verify --as <persona>` signs the browser in as each persona it names (a comma-separated list), alone or beside `--full`. It is refused beside `--timed` or `--perf`, before anything runs.
  - `node scripts/audit.ts --atlas` and `node scripts/vitals.ts --atlas` run against a served app, outside `pnpm verify`, over every Design Atlas entry.
  - The browser-fixture tests of the checks, `pnpm exec vitest run tests/deep- --no-file-parallelism`, run beside `pnpm verify --full` after a change to a check script. Meridian's repository only.
  - `node cli/scripts/smoke.ts --tarball <tarball>` is the consumer smoke, a packed tarball adopted, created and updated end to end. Meridian's repository only.

## When each runs

A moment is when a person or an agent runs a command. A project's own CI may run the same commands at the same moments.

- **While editing**: the test of the file changed, `pnpm exec vitest run <file>`, and a look at the page with `node scripts/shot.ts <route> --width 1440,390 --theme dark,light`.
- **Before every commit**: `pnpm gate`.
- **Before finishing a change**: `pnpm verify`.
- **After a change to shared components, the shell or data, and before a change is handed over**: `pnpm verify --full`.
- **Before a release of the product**, at the release commit and on a quiet machine: `pnpm verify --full --timed`.
- **Triggered by what changed**:
  - who may see or do what: `pnpm verify --as <persona>`, for each persona the change touches;
  - a card, a pattern or the Atlas: `node scripts/audit.ts --atlas` and, on a quiet machine, `node scripts/vitals.ts --atlas`;
  - a navigation budget in question: `node scripts/perf.ts --routes <route>`, narrowed to the route, on a quiet machine;
  - a check script: the browser-fixture tests beside `pnpm verify --full` (Meridian's repository only).
- **On a schedule**: the slow and statistical checks, each tier as its own job on its own runner: `pnpm verify --full`, `pnpm verify --timed` and `pnpm verify --perf --shard <i>/<n>`. The perf part is a report: a p95 over its budget is a warning and only a broken sample fails. The whole perf protocol runs only in CI: a project runs it in its own CI, split into shards on separate runners.
- **Meridian's release** (`.github/workflows/release.yml`, dispatched from master; Meridian's repository only), each command once:
  - `pnpm exec vitest run tests/cli-` and `pnpm exec vitest run tests/deep- --no-file-parallelism`;
  - `node cli/scripts/release-check.ts --limit 180`: the default verify from a clean build, within 180 s on the shared 4-CPU runner;
  - `node cli/scripts/smoke.ts --tarball <tarball> --adopt --create --update`, on the tarball the release publishes;
  - after the publish, a project created from the registry and one updated to it from the release before.
  - It never runs the complete, timed or perf suites: the weekly run does.
- **Meridian's weekly run** (`.github/workflows/weekly.yml`, Mondays at 03:17 UTC and on demand, on master's current commit; Meridian's repository only):
  - the jobs `full` (`pnpm verify --full`), `timed` (`pnpm verify --timed`) and `perf` (`pnpm verify --perf --shard <i>/5`, five shards), in parallel on separate runners, as on a schedule above; a red is rerun by its job, and a dispatch names its jobs with `-f jobs=timed`;
  - `node cli/scripts/smoke.ts --tarball <tarball> --adopt --update --origins 3 --update-all --verify`, on a tarball packed from that commit: the adopted project's default verify cases, the update from each of the last three releases, and every recovery and failure case of the update.
  - Nothing waits on it: a failure notifies.

## Rules

- **Quiet machine**: A run needs a quiet machine exactly when it runs a check whose type is performance. A quiet machine runs nothing else heavy: no other build, browser or test run. Repeated runs of one check (the three of `Fixed means`) are separate runs, each alone on the machine, so other work can run between them.
- **Fixed means**: every red is fixed in the product or in the check, never by skipping, narrowing or deleting the check. A limit moved under `Limits` changes a value, never what is measured.
  - A red is fixed when its cause is named and a test that failed on the old code passes, at the lowest layer that can show it.
  - A measurement no test can reproduce (a time, a dropped frame) is fixed after three consecutive passes on a quiet machine. One pass of a measurement is not evidence.
  - A red whose cause is not named after a run narrowed to its route or page, with the render instrumented, goes to the owner as a decision, with what was measured, before any limit is touched.
- **Limits**: a navigation budget, a live-data bound, or the LCP or INP floor may move, and only this way.
  - It moves only after a trace of the narrowed run names where the time goes, and none of it is the page's own long task or request that a change in the page would remove.
  - The new value is the nearest-rank p95 of at least 20 samples on a quiet machine, taken with the phone the timed suites emulate, the larger of the CI protocol's p95 and a narrowed local run's where both exist, times 1.25, rounded up to the next 10 ms.
  - It is never more than twice the old value without the owner's word.
  - CLS and dropped frames are never moved: a page that misses them is fixed.
  - A moved limit is written where the limit lives (`scripts/lib/budgets.ts`, or the check), and recorded in a `## Budgets` section of this page, placed before `## The classification`: one row per limit with its old and new value, the run, machine and commit it was set from, the samples, the p95 and the margin.
  - The release's time limit on the default verify is not such a limit, and the phone a timed suite emulates is a device, not a limit.
- **Once per commit**: evidence recorded on a commit stands for it and for any later commit whose difference touches none of the command's inputs (defined under `Releases`). A check is run again only when its record is missing, its inputs changed, its record disagrees with what was reported, or it is in concrete doubt. A tier that runs the gate and a build inside it is one command, not a second run of them.
- **Flaky is red**: a check that fails sometimes is a red under `Fixed means`. A retry that passes does not clear it.
- **Releases**: a release runs its own checks; Meridian's are the steps of `.github/workflows/release.yml`.
  - The scheduled run's reds are fixed or decided like any red, and do not of themselves hold a release.
  - A change to the checks themselves (a check script, a tier, a budget) is released from a commit at which every command in the classification has passed, on that commit or on one whose difference touches none of the command's inputs.
  - A red left at a release is the owner's decision, named in the release's changelog as a known issue with where it is fixed.
  - A command's inputs are: the scripts it runs; the product code and its configuration; the package manifest and lockfile; every document a page the command reaches renders; and, for a test command, the files its tests read.
  - After a change that is not the fix of a red, a measurement is repeated on the pages the change touched, with the suite's own `--routes` (`scripts/audit.ts`, `scripts/vitals.ts`, `scripts/navigate.ts`, `scripts/perf.ts`), rather than on every page.

## Basis

- **Sizes** by what a test needs, not what it intends: Google's small, medium and large (*Software Engineering at Google*, ch. 11, and the Google Testing Blog's "[Test Sizes](https://testing.googleblog.com/2010/12/test-sizes.html)", 2010). Meridian adds `static` for a check that runs no test at all, and counts a browser or a production build as `large` even on one machine, where Google's large is a test that needs more than one.
- **Tiers** as stages: fast checks before every commit and slower stages after, in one pipeline (Humble and Farley, *Continuous Delivery*, 2010, the deployment pipeline's commit and acceptance stages). In a project, a person or an agent runs the later stages at their moments; only Meridian's release and weekly run are automated.
- **Proportions**: many fast tests and few slow end-to-end ones ("[The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)", Ham Vocke, on Martin Fowler's site, 2018).
- **Types** after the ISTQB glossary and ISO/IEC 25010. Meridian lifts performance out of the non-functional qualities into a type of its own, because it alone needs a quiet machine, and does not count regression as a type, since the ISTQB defines regression testing by why it runs.
- **Measurement**: performance judged by percentiles of repeated samples on a quiet machine, the phone after Lighthouse's mobile throttling, the device of benchmark index 800 with the CPU slowed by the host's own index over 800, on Slow 4G ([Lighthouse's throttling guide](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)). The benchmark times JavaScript, not style and layout, so two hosts of one index can differ in the second: on 2026-10-19 the scheduled runner spent about twice this machine's time in style and layout at the same rate. A dropped frame stays red wherever it is measured, and its cause in the vitals output says which part of the frame the time went to. The 390 px touch width, the 20 samples, the 1.25 margin and the rounding of `Limits` are Meridian's own.
- **Flakiness** as a defect: a test that passes and fails on the same code erodes trust in every result (*Software Engineering at Google*, ch. 11 and 14). Where a large test's flakiness is tolerated or retried, Meridian does not clear a red by a retry.

## The classification

Every check Meridian runs has one row, named by a key: a gate step, a group of test files, a phase or suite of `pnpm verify`, or a standalone suite. In Meridian's repository the table is guarded by `tests/cli-test-tiers.test.ts`, which fails naming the key when a step, suite or group has no row or a row names something that does not exist. A run needs a quiet machine exactly when it runs a check whose type is performance.

| Key | Size | Type | Tier | Quiet machine | Command | Measured | What it checks |
|---|---|---|---|---|---|---|---|
| `gate/tokens are fresh` | static | non-functional | quick | no | `node scripts/tokens.ts --check` | 0.1 s at 0bee6d7 | The generated token CSS matches `tokens/`. |
| `gate/the registry is fresh` | static | non-functional | quick | no | `node scripts/registry.ts --check` | 0.1 s at 0bee6d7 | The Atlas registry matches the card folders. |
| `gate/specifications are consistent` | static | non-functional | quick | no | `node scripts/check.ts` | 0.3 s at 0bee6d7 | Cards, READMEs, tokens and page specifications follow the contract. |
| `gate/the product's own rules hold` | static | non-functional | quick | no | `node scripts/check.local.ts` | 0 s at 0bee6d7 (not present in this repository: it runs only where a product wrote scripts/check.local.ts) | A product's own rules, beside Meridian's. |
| `gate/contrast holds in every theme and accent` | static | non-functional | quick | no | `node scripts/contrast.ts` | 0.1 s at 0bee6d7 | Every specified foreground on its background, in every theme and accent. |
| `gate/route types are generated` | static | non-functional | quick | no | `next typegen` | 0.2 s at 0bee6d7 | Route types are generated before the type check. |
| `gate/types check` | static | functional | quick | no | `tsc --noEmit` | 3.7 s at 40d29c7 | The TypeScript compiles. |
| `gate/lint passes` | static | non-functional | quick | no | `eslint .` | 22.5 s at 40d29c7 | The code passes the Next ESLint config. |
| `gate/tests pass` | small, medium | functional | quick | no | `pnpm exec vitest run --exclude 'tests/deep-*'` | 48.8 s at 40d29c7 | The tests outside `tests/deep-*` pass (run with the lint and the type check). |
| `tests/shipped` | small, medium | functional | quick | no | `pnpm exec vitest run --exclude 'tests/deep-*' --exclude 'tests/cli-*'` | 42 s at 7e6de42 | The behaviour tests of the components, pages and data (summed file time). |
| `tests/cli-*` | small, medium | functional | quick | no | `pnpm exec vitest run tests/cli-` | 124 s at 7e6de42 | Meridian's repository only. The package's own tests: the CLI, its update and release paths (summed file time). |
| `tests/deep-*` | large | functional | complete | no | `pnpm exec vitest run tests/deep- --no-file-parallelism` | 782 s at fa5bbff | Meridian's repository only. The check scripts against browser fixtures: each planted defect is found and each corrected twin passes. |
| `verify/build` | large | functional | change | no | `pnpm verify` | 9.6 s at 40d29c7 | One production build. |
| `verify/route policy` | large | non-functional | change | no | `pnpm verify` | 0.1 s at 40d29c7 | Every route is declared static or dynamic as its policy says. |
| `verify/first-load` | large | non-functional | change | no | `pnpm verify` | 0.3 s at 40d29c7 | The first-load size of each route is within its budget. |
| `verify/html` | large | non-functional | change | no | `pnpm verify` | 0.3 s at 40d29c7 | The served HTML of each route is within its size check. |
| `verify/navigation` | large | functional | change | no | `pnpm verify` | 92.5 s at 269d307 | From a press in the rail, each route's shell, data and first interaction arrive, on desktop and through the phone drawer, judged on function only, never on time; up to three routes, every rail route under `--full` or `--timed`. |
| `verify/timing` | large | performance | timed | yes | `pnpm verify --timed` | 88.2 s at fa5bbff | The same navigation of every rail route, with each shell, data and interaction time judged against its budget. |
| `verify/personas` | large | functional | on request | no | `pnpm verify --as viewer` | 937.8 s at fa5bbff (the five personas) | Signed in as each named persona, the rail shows the routes that persona may open and a denied route draws its refusal. |
| `verify/audit` | large | non-functional | complete | no | `pnpm verify --full` | 652.0 s at 269d307 | Every page and embed view at five widths in both themes, for layout and accessibility defects. |
| `verify/presses` | large | functional | complete | no | `pnpm verify --full` | 1006.9 s at 269d307 | Every control pressed and every link followed, on desktop and phone. |
| `verify/keyboard` | large | functional | complete | no | `pnpm verify --full` | 205.6 s at bc1e10b | Tab through each page and back: focus rings, reach and order. |
| `verify/assistant` | large | functional | complete | no | `pnpm verify --full` | 101.2 s at bc1e10b | The assistant absent and in a walk-through (54.7 s and 46.5 s). |
| `verify/live` | large | performance | timed | yes | `pnpm verify --timed` | 41.1 s at fa5bbff | Two tabs, a silent stream, a restart, a hidden and an offline tab and a burst: each converges within its bound. |
| `verify/timedChecks` | large | performance | timed | yes | `pnpm verify --timed` | 0 s at fa5bbff | The product's own browser checks that judge a time, one at a time; the sample declares none. |
| `verify/vitals` | large | performance | timed | yes | `pnpm verify --timed` | 315.0 s at fa5bbff | LCP, INP, CLS and dropped frames on a mid-range phone for every static page. |
| `verify/browserChecks` | large | functional | complete | no | `pnpm verify --full` | 27.8 s at bc1e10b | The product's own browser journeys (`journeys/workspaces.ts`) that judge no time. |
| `verify/perf` | large | performance | on request | yes | `pnpm verify --perf --shard <i>/<n>` | 24.1 min at dfdad67, the slowest of five shards on the runner | The 20-sample navigation protocol. |
| `suite/audit --atlas` | large | non-functional | on request | no | `node scripts/audit.ts --atlas` | 22.0 min at fa5bbff | The audit over the Design Atlas: 183 routes at 1440 and 390px in both themes. |
| `suite/vitals --atlas` | large | performance | on request | yes | `node scripts/vitals.ts --atlas` | 16.2 min at fa5bbff | Web Vitals for every Atlas entry: 110 pages. |
| `suite/consumer smoke` | large | functional | on request | no | `node cli/scripts/smoke.ts --tarball <tarball> --adopt --create --update` | 3.0 min at 40d29c7 | Meridian's repository only. The release case: a packed tarball adopted, created and updated end to end. Release runs this command. Weekly runs `--adopt --update --origins 3 --update-all --verify`, whose `--verify` runs the adopted project's default verify cases. The created project's case, `--create --verify`, runs its `verify --full --timed`, runs on request only and wants a quiet machine the release case does not. |

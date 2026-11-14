<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working in Meridian

Meridian is a dashboard design system and template: read `README.md` (what it is), `CONTRIBUTING.md` (the card contract) and `docs/surfaces.md` (three surfaces, two operators) before changing anything.

- **Build up, never sideways.** A page arranges patterns; a pattern composes components; a value is a token. Never write a colour, size or shadow that is not a token; `node scripts/check.ts` fails on literal colours and on Tailwind utilities outside Meridian's reset scales (they render nothing).
- **Tokens** live in `tokens/*.tokens.json` (DTCG 2025.10). `src/styles/tokens.css` and `src/styles/theme.css` are generated: run `pnpm tokens`, never edit them.
- **A card** is a folder with `index.tsx`, `preview.tsx` (every state, static, labelled) and `README.md` (the anatomy in CONTRIBUTING). After adding one, run `pnpm registry`.
- **Before finishing**: `pnpm test:t1`; after a change to shared components, the shell or data, `pnpm test:t2`. Then look at `node scripts/shot.ts <route> --width 1440,390 --theme dark,light`. `docs/testing.md` is the testing standard: its `## When each runs` says which command runs at which moment, and its `## Rules` say when a red is fixed and when a limit may move.

## Test runs

Each repository has exactly three test commands, and every one takes no arguments: the tool picks the tests.

| Command | Runs |
|---|---|
| `pnpm test:t1` | the Tier 1 tests affected by the changes since the last green run (the import graph's `related` selection), eslint on the changed source files, and the type check — lint and the type check report, and never fail the run |
| `pnpm test:t2` | the affected Tier 2 checks too, and the affected Tier 1 tests with them, including the browser function sweeps, which need a build and Chrome; a change under `cli/` or the update flow also runs the consumer smoke (`--adopt --update --verify`), any other `scripts/` change `--adopt --verify`, both with CI's flags |
| `pnpm test:release` | every Tier 1 and Tier 2 test, once, with the browser function sweeps, the timed browser suites, lint and the type check; Tier 2 values are recorded in `out/perf-record.json` and reported in a table against the release before, never as failures |

- **Only Tier 1 fails a run.** Lint and the type check are Tier 3 and contrast is Tier 2: what they find is printed as `reported, not failed` and turns nothing red (`record` in `scripts/lib/summary.ts` decides, once). The audit's own findings are sorted by the same rule — a target under 44px, low contrast, text cut but still visible, a page that scrolls sideways — and `scripts/lib/audit-findings.ts` is that sort. Compilation is still Tier 1: `next build` fails on anything that cannot compile.
- **Tier 2 is a convention.** `*.perf.test.ts(x)` is Tier 2 in any repository; here the timed browser suites (`scripts/browser.ts --depth timed`: navigation judged, live data, Web Vitals, the product's timed checks) are Tier 2, and so is the 20-sample protocol (depth `perf`), which is measured by its own stage, `node scripts/test-run.ts stage perf`, in its own non-blocking job and never inside a gate: reported, never failing, and a FAIL line in one is counted in the closing line as over budget. The browser function sweeps (`--depth fn`: every page audited, every control pressed, the keyboard, the rail, the personas, the journeys, the assistant walk-through, the product's `browserChecks` and the sizes) are Tier 1 and block — a page that answered an error, content nobody can see or reach at all, a control that does nothing, an element a person cannot use — and what the audit finds that is only awkward is reported. They need a build and Chrome, so they run in `test:t2`, `test:release` and the release sweep jobs, never in `test:t1`. Every other test under `tests/` is Tier 1. `tests/deep-*`, the browser-fixture tests of the checks, are Tier 1; their size keeps them out of the main run, and they run as their own stage. `test:t1` never runs a Tier 2 check.
- **"Last green" is a marker.** After a passing run the command writes the commit to `out/last-green` (gitignored) and reads it before the next, so a branch's later runs stay small. A missing marker falls back to the diff against master; a checkout with neither marker nor a diff runs the whole tier.
- **A red run hands the next one its failures.** A run that ends red leaves `out/last-run.json` — the tree it proved and the test files that failed — and the next run starts from that tree, so a fix runs its failures and the tests its change reaches instead of everything since the last green run. A tree that has not changed may be retried once, and that run never advances the marker: a pass with no cause named is flaky, and a flaky Tier 1 check is a red.
- **Every plan phase is labelled Tier 1, 2 or 3.** A Tier 1 phase uses `pnpm test:t1`; a Tier 2 phase and a Tier 3 phase use `pnpm test:t2`. Every phase ends with its command passing.
- **A release in this repository is dispatching `.github/workflows/release.yml` from master**: its jobs are the proof (the static stage, four sweep jobs, the deep tests a change reaches, the consumer path from the tarball), and it publishes the package and tags last. Tier 2 runs beside them, is reported on the Release and never blocks. No `pnpm test:release` is run locally or in a consumer before the dispatch. `node scripts/test-run.ts stage <static|sweep <name>|deep --since <ref> [--part i/n]|tier2>` runs one part of the release for a CI job; it is not a fourth test command. Pushing to master neither publishes nor deploys.
- **Agents in the product** read freely and write only through a Proposal; mark agent work with the Agent mark and "via". See `docs/agents.md`.
- Everything written to the repository is in English.

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
| `pnpm test:t1` | the Tier 1 tests affected by the changes since the last green run (the import graph's `related` selection), eslint on the changed source files, and the type check |
| `pnpm test:t2` | the affected Tier 2 checks too, and the affected Tier 1 tests with them; a change under `cli/` or the update flow also runs the consumer smoke (`--adopt --update --verify`), any other `scripts/` change `--adopt --verify`, both with CI's flags |
| `pnpm test:release` | every Tier 1 and Tier 2 test, once, with the timed browser suites, lint and the type check; Tier 2 values are recorded in `out/perf-record.json` and reported in a table against the release before, never as failures |

- **Tier 2 is a convention.** `*.perf.test.ts(x)` is Tier 2 in any repository; here the broad browser sweeps (`scripts/browser.ts --depth fn`, in `test:t2`) and the timed runs (depth `timed`, in `test:release`) are Tier 2 too. Every other test under `tests/` is Tier 1. `tests/deep-*`, the browser-fixture tests of the checks, are Tier 1; their size keeps them out of the main run, and they run as their own stage. `test:t1` never runs a Tier 2 check.
- **"Last green" is a marker.** After a passing run the command writes the commit to `out/last-green` (gitignored) and reads it before the next, so a branch's later runs stay small. A missing marker falls back to the diff against master; a checkout with neither marker nor a diff runs the whole tier.
- **Every plan phase is labelled Tier 1, 2 or 3.** A Tier 1 phase uses `pnpm test:t1`; a Tier 2 phase and a Tier 3 phase use `pnpm test:t2`. Every phase ends with its command passing.
- **A release in this repository is dispatching `.github/workflows/release.yml` from master**: it publishes the package and tags last. Pushing to master neither publishes nor deploys. `pnpm test:release` passes on the commit being released before the workflow is dispatched.
- **Agents in the product** read freely and write only through a Proposal; mark agent work with the Agent mark and "via". See `docs/agents.md`.
- Everything written to the repository is in English.

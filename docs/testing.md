# Testing

This page classifies every check Meridian runs by size, type and tier, and says what each costs. A check is named by a key: a gate step, a group of test files, a phase or suite of `pnpm verify`, or a standalone suite. The table is guarded by `tests/cli-test-tiers.test.ts`, which fails naming the key when a step, suite or group has no row or a row names something that does not exist.

## The tiers

- **quick**: `pnpm gate`. The static checks and the tests outside `tests/deep-*`; no browser. Run it before every commit.
- **change**: `pnpm verify`. The gate once, one production build, the route policy, the size checks and a smoke of up to three routes. Run it before finishing any change.
- **complete**: `pnpm verify --full`. Every route, every control pressed and every link followed, the keyboard walk and the assistant; nothing in it judges a time. After a change to a check script, also run `pnpm exec vitest run tests/deep- --no-file-parallelism`, the browser-fixture tests of the checks. Run it after a change to shared components, the shell or data, and before release.
- **timed**: `pnpm verify --timed`. The navigation of every rail route with its budgets judged, then the live data and Web Vitals, alone and last, so it needs a quiet machine. `pnpm verify --full --timed` is the whole standard.

## The classification

A run needs a quiet machine exactly when it runs a check whose type is performance.

| Key | Size | Type | Tier | Quiet machine | Command | Measured | What it checks |
|---|---|---|---|---|---|---|---|
| `gate/tokens are fresh` | static | non-functional | quick | no | `node scripts/tokens.ts --check` | 0.1 s at 0bee6d7 | The generated token CSS matches `tokens/`. |
| `gate/the registry is fresh` | static | non-functional | quick | no | `node scripts/registry.ts --check` | 0.1 s at 0bee6d7 | The Atlas registry matches the card folders. |
| `gate/specifications are consistent` | static | non-functional | quick | no | `node scripts/check.ts` | 0.3 s at 0bee6d7 | Cards, READMEs, tokens and page specifications follow the contract. |
| `gate/the product's own rules hold` | static | non-functional | quick | no | `node scripts/check.local.ts` | 0 s at 0bee6d7 (not present in this repository: it runs only where a product wrote scripts/check.local.ts) | A product's own rules, beside Meridian's. |
| `gate/contrast holds in every theme and accent` | static | non-functional | quick | no | `node scripts/contrast.ts` | 0.1 s at 0bee6d7 | Every specified foreground on its background, in every theme and accent. |
| `gate/route types are generated` | static | non-functional | quick | no | `next typegen` | 0.2 s at 0bee6d7 | Route types are generated before the type check. |
| `gate/types check` | static | functional | quick | no | `tsc --noEmit` | 2.7 s at 0bee6d7 | The TypeScript compiles. |
| `gate/lint passes` | static | non-functional | quick | no | `eslint .` | 17.1 s at 0bee6d7 | The code passes the Next ESLint config. |
| `gate/tests pass` | small, medium | functional | quick | no | `pnpm exec vitest run --exclude 'tests/deep-*'` | 42.3 s at 0bee6d7 | The tests outside `tests/deep-*` pass (run with the lint and the type check). |
| `tests/shipped` | small, medium | functional | quick | no | `pnpm exec vitest run --exclude 'tests/deep-*' --exclude 'tests/cli-*'` | 42 s at 7e6de42 | The behaviour tests of the components, pages and data (summed file time). |
| `tests/cli-*` | small, medium | functional | quick | no | `pnpm exec vitest run tests/cli-` | 124 s at 7e6de42 | The package's own tests: the CLI, its update and release paths (summed file time). |
| `tests/deep-*` | large | functional | complete | no | `pnpm exec vitest run tests/deep- --no-file-parallelism` | 620 s at 7e6de42 | The check scripts against browser fixtures: each planted defect is found and each corrected twin passes. |
| `verify/build` | large | functional | change | no | `pnpm verify` | 6.9 s at bc1e10b | One production build. |
| `verify/route policy` | large | non-functional | change | no | `pnpm verify` | 0.1 s at bc1e10b | Every route is declared static or dynamic as its policy says. |
| `verify/first-load` | large | non-functional | change | no | `pnpm verify` | 0.3 s at bc1e10b | The first-load size of each route is within its budget. |
| `verify/html` | large | non-functional | change | no | `pnpm verify` | 0.3 s at bc1e10b | The served HTML of each route is within its size check. |
| `verify/navigation` | large | functional | change | no | `pnpm verify` | 93.6 s at 2f21607 | From a press in the rail, each route's shell, data and first interaction arrive, on desktop and through the phone drawer, judged on function only, never on time; up to three routes, every rail route under `--full` or `--timed`. |
| `verify/timing` | large | performance | timed | yes | `pnpm verify --timed` | 84.2 s at 1629c24 | The same navigation of every rail route, with each shell, data and interaction time judged against its budget. |
| `verify/personas` | large | functional | on request | no | `pnpm verify --as viewer` | 104 s at 0bee6d7 | Signed in as each named persona, the rail shows the routes that persona may open and a denied route draws its refusal. |
| `verify/audit` | large | non-functional | complete | no | `pnpm verify --full` | 626.6 s at bc1e10b | Every page and embed view at five widths in both themes, for layout and accessibility defects. |
| `verify/presses` | large | functional | complete | no | `pnpm verify --full` | 998.8 s at bc1e10b | Every control pressed and every link followed, on desktop and phone. |
| `verify/keyboard` | large | functional | complete | no | `pnpm verify --full` | 205.6 s at bc1e10b | Tab through each page and back: focus rings, reach and order. |
| `verify/assistant` | large | functional | complete | no | `pnpm verify --full` | 101.2 s at bc1e10b | The assistant absent and in a walk-through (54.7 s and 46.5 s). |
| `verify/live` | large | performance | timed | yes | `pnpm verify --timed` | 40.6 s at bc1e10b | Two tabs, a silent stream, a restart, a hidden and an offline tab and a burst: each converges within its bound. |
| `verify/vitals` | large | performance | timed | yes | `pnpm verify --timed` | 311.1 s at bc1e10b | LCP, INP, CLS and dropped frames on a mid-range phone for every static page. |
| `verify/browserChecks` | large | functional | complete | no | `pnpm verify --full` | 27.8 s at bc1e10b | The product's own browser journeys (`journeys/workspaces.ts`). |
| `verify/perf` | large | performance | on request | yes | `pnpm verify --perf` | 76.6 min at 0bee6d7 | The 20-sample navigation protocol. |
| `suite/audit --atlas` | large | non-functional | on request | no | `node scripts/audit.ts --atlas` | 21.8 min at 0bee6d7 | The audit over the Design Atlas: 183 routes at 1440 and 390px in both themes. |
| `suite/vitals --atlas` | large | performance | on request | yes | `node scripts/vitals.ts --atlas` | 18.2 min at 0bee6d7 | Web Vitals for every Atlas entry: 110 pages. |
| `suite/consumer smoke` | large | functional | on request | no | `node cli/scripts/smoke.ts --tarball <tarball> --adopt --create --update` | 3.8 min at 2324910 | The release case: a packed tarball adopted, created and updated end to end. Release runs this command; weekly runs `--adopt --update --origins 3 --update-all --verify`, and the `--verify` case, which runs a created project's `verify --full --timed`, wants a quiet machine the release case does not. |

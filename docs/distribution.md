# Distribution: the `zz-meridian` package

Status: v1 (`create`, `adopt`, `skill`) shipped in 0.2.0 (decision 0009). v2 (`update`, `brand`, the keep register) is complete for projects from 0.3.0 on; its zones are in `skills/zz-meridian/references/ownership.md` and its agent workflow in `references/update.md`. Releasing: the `/release` command (`.claude/commands/release.md`).

## The one sentence

A team gives its coding agent this, with what it wants in its own words at the end:

> Run `npx zz-meridian@latest skill --global`, then follow the zz-meridian skill it installs to: [what you want, in your own words]. Done when its hand-over says the Meridian standard is met, or names what only I can decide or provide.

The sentence names no command, because people do not: "change this product into our dashboard", "a new one based on
this folder, in another folder" and "build an orders console" all ask for a dashboard on Meridian and differ only in
which folder holds it. The skill's "Choose the route" table maps what was said, and what is in the folder, to `adopt`
(this Next.js App Router project, in place), `create` (a new folder; a folder named as the source is read, never
written) or `update` and `brand` (a project that already has Meridian), and says the route before the first command.
An earlier sentence named `adopt`, the wrong command for every request for a new dashboard.

The sentence is written to be sent as a goal (`/goal` in Claude Code and Codex), which keeps the agent working until a
separate model, reading the conversation after every turn, finds the condition met. That model sees the sentence, not
the skill, so the sentence ends with a condition the transcript can show: the hand-over (SKILL.md, step 7) quotes
the release command's last line and the scoreboard's count, or names what only the person can decide or
provide. The degree lives in the skill, never in the sentence: `skills/zz-meridian/references/standard.md` holds the
register, the scoreboard of floors and craft kept for every view, the loop run until nothing is weak, and which
decisions the agent makes and records and which wait for the person. People do not say how good it has to be, so the skill does not ask.

The split follows what each part is good at. The package does the settled work, the same way every time, and proves it
built: what to copy, which dependencies to merge, the alias, the stylesheet, the brand. The agent does the judgement:
rebuilding each page on Meridian's components, the fake API, and reading what the tests and diagnostics find.

## The package

- **Name** `zz-meridian`, unscoped (free on npm, and the shortest sentence). The command is `zz-meridian`
  (`bin: { "zz-meridian": "dist/cli.js" }`); a different bin name breaks `npx zz-meridian`.
- **Where it lives**: `cli/` in this repository, its own `package.json`, built with `tsc` to `cli/dist/`; not a
  workspace member, and outside the root's type check (the root lint does cover `cli/**`). The repository root stays the template app, `private`,
  renamed `zz-meridian-template`.
- **Payload**: a snapshot of the template, built by `cli/scripts/build-payload.ts` into `cli/payload/` with `git archive
  HEAD`, never from a walk of the folder, so a build output, a local `.env` or an uncommitted edit cannot ship
  (`--worktree` exists for trying a change before committing). The package itself, CI, agent settings and `.env` files
  are left out, and so is every test but `tests/setup.ts` and `tests/examples/`: the other tests check the CLI's own
  source or hold the sample's own figures, which a product replaces. The package carries `dist/`, `payload/`, its README and nothing else: no dependencies, no install
  scripts.
- **No runtime dependency**: nothing in a dashboard imports `zz-meridian`. It needs Node 22.18 or newer.
- **Shared session source**: `scripts/lib/update-session.ts` is the one authored standalone, erasable-TypeScript implementation used by an adopted project's plain-Node checks. The payload producer also generates `cli/src/update-session.ts` from the same `HEAD` snapshot, or tracked working-tree source under `--worktree`. Run the producer before CLI compilation and packing; never edit the generated companion.

## Commands

### `create <dir>`

Copies the template (without `.git`, the Atlas, card specifications and previews, `docs/`, `decisions/`, the
changelog, and Meridian's own tests: of `tests/`, only `setup.ts`, which is Meridian's, and `examples/`, the team's starting
point, ship), installs the skill into the new project (see below), writes the manifest, and prints the next step. Brand
arguments (`--name`, `--hex`, …) pass through to `scripts/brand.ts --product`. Replaces SKILL.md step 3's
clone-then-delete.

### `adopt`

Brings Meridian into the project in the current folder. It refuses, and copies nothing, when:

- the project is already on Meridian (it has `.meridian/manifest.json`): it names the release the manifest holds and
  `update`, the command that moves it;
- the git tree is dirty (`--allow-dirty` overrides): every change it makes must be reviewable as one diff, and revertable;
- the project is not Next.js with the App Router: it exits with the Route B or C guidance from
  `references/existing-project.md` instead.

Then, in this order:

1. Copies the Route A set: `tokens/`, `src/styles/`, `src/components/` (without `README.md` and `preview.tsx`),
   `src/app.config.ts` (written with the project's own pages as its navigation), `src/views/console-chrome.tsx`, the `src/lib` modules the components import, the three `src/logic/` helpers they import
   (`after-start.ts`, `derivations.ts`, `summarise.ts`), `src/lib/assistant/prompt.ts`,
   `app/icon.ts`, `scripts/`, `tests/setup.ts` and the config files. The list is in `cli/src/ownership.ts` (`adoptSetOf`); the
   fixture test (below) is what keeps it complete. A file of the same name that differs is never overwritten: `adopt`
   lists the conflicts and stops before writing anything.
2. Merges dependencies and scripts into their `package.json`, keeping their versions where newer and compatible; adds
   the `@meridian/* → ./src/*` alias to `tsconfig.json` when theirs differs (their own `@/*` is left as it is), keeping
   theirs as `tsconfig.before.json` when it carries comments or trailing commas, which JSON cannot hold.
3. Replaces their global stylesheet with the template's `app/globals.css`, keeping theirs as `app/globals.before.css`
   for the agent to port from.
4. Runs `scripts/brand.ts --existing` with the brand arguments given (or the name from their `package.json`): the name,
   the accent and the contrast check. Then it writes Meridian's managed block into their `AGENTS.md`, and `docs/brief.md`
   when they have none.
5. Installs the skill and writes the manifest.
6. Runs their package manager's install (pnpm with `--no-frozen-lockfile`, since adopt has just changed `package.json`), `next typegen` and `tsc --noEmit`, and prints the result and the next step:
   the skill's Route A from step 2, with the template to read from at the same version.

Three things make the copy safe in someone else's project. Meridian's own files import each other by relative path,
pinned to the exact module (`…/button/index`), so a team's `components/ui/button.tsx` can never be resolved in place
of Meridian's whatever their `@/` alias says; the team imports Meridian as `@meridian/…`, which `adopt` adds to
`tsconfig.json`. Meridian's scripts carry their own lint exceptions, so they pass the team's eslint config — and a
project that has none is given Meridian's `eslint.config.ts`, since `test:release` runs the lint and the project would
otherwise be handed a check it cannot pass; a project whose configuration is a legacy `.eslintrc`, which ESLint 9 no
longer loads, keeps it and is told. And
`scripts/package.json` declares the scripts ES modules when the project's own `package.json` does not, without
changing how the rest of the project is read.

### `skill [--global]`

Installs only the skill: into the project, or with `--global` into `~/.agents/skills/zz-meridian` (Codex) and
`~/.claude/skills/zz-meridian` (Claude Code). `create` and `adopt` install it into the project at
`.agents/skills/zz-meridian/` and `.claude/skills/zz-meridian/`, the folders each agent reads in a repository, so the
team's later sessions have it too. Codex may need a restart to see a new skill; the printed next step names the file to
read, so the current session does not depend on discovery.

### `update`

Moves a project from the release in its manifest to the running one. The rule for what it may touch is one list,
`cli/src/ownership.ts`: Meridian's managed files change; the team's files and the kept files never do, except the
three edits named below. It needs a project that adopted or created Meridian 0.3.0 or later.

1. **Dry-run.** `npx zz-meridian@latest update --dry-run [--verbose]` rebuilds the recorded release and the running one
   in a scratch folder (with the project's recorded brand and shape, so no file differs for a reason of the replay),
   compares every managed file in three places (what was recorded, what the running release has, what is on disk), and
   prints only what needs a decision, then `summary:`, `time:`, `outcome:` and `Next:` lines. It writes nothing, and the
   command proves it by comparing the project before and after.
2. **Update.** `npx zz-meridian@latest update` from a clean git tree (or with `--allow-dirty`). It writes the plan first
   (`.meridian/update/<version>/state.json`, the journal, `MERGE.md`, an empty `resolutions.json`, the `base/`, `ours/`
   and `new/` copies of every staged file, and a `backup/` preimage of every path it changes), then applies the safe
   changes, then runs the install (pnpm with `--no-frozen-lockfile`, which CI would otherwise refuse after the edit to
   `package.json`). Applied: untouched replacements, additions and untouched removals. Staged: every
   managed file the team changed or deleted, or collided with. The only team files it edits are `package.json` (missing
   dependencies and scripts, older ones of the same major, and entries still exactly as the earlier release wrote them;
   the framework `next`, `react` and `react-dom` is always among them), the managed block in `AGENTS.md`, and the
   lockfile the install rewrites. Everything else in `MERGE.md` is advice.
3. **The report.** `MERGE.md` lists every staged item as `file:<path>` and every change beyond copying files as
   `migration:<id>` (a dependency the team pinned itself, a script, a release's own migration), with the paths of the
   copies and a resolution stub. Exit codes: `0` finalized in the same command (nothing was pending), `2` applied with
   work pending, `1` a refusal, failure or interruption.
4. **Resolutions.** The team (or its agent) makes each decision in the project's own file, then records it in
   `resolutions.json`: one object per item, with the item id, `resolved` (or `not-applicable` for a migration), a
   reason, and the SHA-256 each named file has now. While the session is open, `node scripts/check.ts` (and so every test command)
   fails and names it.
5. **Finalize.** `npx zz-meridian@<version> update --finalize` (the version named in `MERGE.md`) checks that every
   item has one current resolution, automatically written or removed managed files still match what the update applied,
   and the installed dependencies match the plan, then runs `test:t1` (the Tier 1 tests affected by the change, the
   static checks and the type check) and one `next build`, followed by `node scripts/route-policy.ts` and
   `node scripts/sizes.ts` when the project supplies what they read — the two cache flags in its Next config, and a size
   baseline the team recorded itself — each reported `not run` with the reason otherwise. A later
   edit to an automatic managed write must be restored from the session's `new/` copy; a removed file must remain absent.
   To have a deliberate edit reviewed in a new plan, save it separately, restore the planned bytes, abort, then reapply
   it and restart. Shared team-owned files and kept files remain the team's. It compares every protected input before
   and after each check, so a check that rewrites source fails it. Only when both pass and nothing changed does it
   write the target manifest, atomically, and archive the
   session under `.meridian/history/<version>/<id>/`. It prints the stage times. Finalize runs the bounded scope above — not `test:release`, whose browser sweeps and timed suites belong to the team's own release — and the consumer smoke holds each case to plain finalize and to a time limit.
6. **Resume.** `update --resume` continues an update that was interrupted, failed to apply or install, or was started
   with `--no-install`. It applies only what is still the recorded original, never overwrites a later edit, and ends as
   a plain update does.
7. **Abort.** `update --abort` restores only the preimages in `backup/`, deletes only what the update created, leaves
   the manifest as it was and archives the session as `aborted`. It refuses, and keeps every backup, when any path the
   update wrote has been edited since.

`.meridian/update.lock` exists while a run is in progress; a stale one is taken over only by `--resume`, after it has read
the journal. `--resume`, `--finalize` and `--abort` belong to the version and package that began the session and refuse
anything else; they read the session's own copies and never ask the registry. A published version is compared with the
registry's tarball before an update starts, so a modified copy of a release is refused.

Two environment variables exist for the updater's own tests and are used only when set, each printing a `note:` line:
`ZZ_MERIDIAN_LOCAL_RELEASES=<dir>` reads `zz-meridian-<version>.tgz` from a folder instead of the registry, and
`ZZ_MERIDIAN_TEST_INTERRUPT_AFTER=<n>` stops an update after `n` applied operations. Neither weakens a check.

### The migrations

`cli/src/migrations.ts` holds `RELEASE_MIGRATIONS`: the changes a release makes in the team's own files, which `update`
reports as `migration:<id>` because it cannot make them. Normally an entry applies when the project's recorded version
is older than its `since` and the target is not. `verify-modes` is recurring: a stale call to a command the release removed is reported on every forward upgrade
until the team rewrites it, wherever it sits.
`applies(root, source)` receives the project's recorded source version and returns the paths needing review, or null.
Route, page, layout and page-spec migrations recognize both `app/` and `src/app/`, and report the actual project paths.
The direct-query migration and layer-rule guard cover both app roots too: use the authorized reader, or state a required direct-query escape on the call's own line.
A migration only reads team-owned files (the ownership rule's managed paths are skipped); a file it cannot read is absent.
A project already on the new shape gets no line. Every entry names the command that proves it — `test:release` where the change reaches the build, `test:t1` where a test run is enough — and its
instructions name the section of a reference (`cache.md`, `live.md`, `validation.md`, `agents.md`, `customize.md`), of the Start guide or of `docs/assistant.md` to follow.

Twenty-nine arrived after 0.5.0 and are resolved as the skill's `references/update.md` says: `share-view-context` and `agent-reads-section` (0.9.0), `assistant-view-tools` (0.10.0), `nav-needs` (0.13.0), `agent-reads-own-group` (0.15.0), `refusal-declared`, `managed-exports-removed`, `view-tool-page-explore`, `agent-does-here-section` and `sample-pages-renamed` (0.16.0), `marker-measured-on-observe` (0.16.2), `view-page-matched-as-next`, `journey-moved` and `today-in-timezone` (0.16.3), `no-data-mark` (0.19.0), `table-grid` (0.26.0), `four-layers` (0.28.0), which moves thirty-eight modules into `src/logic/`, `env-reset-before-each` (0.29.0), `direct-query-escape` and `app-description` (0.30.0), `live-stream-shutdown` (0.31.1), `missing-routes` and `computed-series-slot` (0.32.0), `use-size-callback-ref` (0.33.0), `self-hosted-fonts` (0.34.0), and `nav-item-fields` and `workspace-homes-moved` (0.36.0), and `proposal-approve-required` and `open-command-moved` (0.37.0). The ten of 0.5.0 are:

| Id | Reported when a team-owned file still has | Completion step |
|----|-------------------------------------------|-----------------|
| `verify-modes` | a `package.json` script, workflow, shell file, document or code comment that still runs `gate`, `verify` or one of the auxiliary scripts (`audit`, `interactions`, `live`, `keyboard`, `vitals`), or names a retired `scripts/` file | `validation.md`: replace each with the current test commands, `pnpm test:t1`, `pnpm test:t2` or `pnpm test:release`; none takes an argument |
| `shell-assistant-promise` | `<AppShell` with an `assistant=` prop and no promise (`.then(`, `Promise`, `use(`) | `cache.md`, "The shell's assistant promise": pass a promise and do not await it |
| `assistant-available-promise` | `useAssistantAvailable()` used as a boolean | same section: `use(useAssistantAvailable())` inside `Suspense` |
| `clock-now-required` | `<Freshness`, `<ShellTools` or `<AlertsPanel` without `now=`, or `formatRelative(` with one argument | `cache.md`, "The clock is the data's": pass the data's clock |
| `cache-components-config` | a `next.config.*` without `cacheComponents: true` and `partialPrefetching: true` | `cache.md`, "Turn Cache Components on": add both, then make every route static or partial |
| `connection-boundaries` | `await connection()` in a `page.tsx` or `layout.tsx` under `app/` | same section: remove it and read behind a boundary |
| `authorized-read` | a `page.tsx` calling `.query(` | `cache.md`, "Authorized, scoped reads": add `access.ts` and `read.ts` |
| `scoped-invalidation` | a `'use server'` file that writes a collection and calls neither `updateTag` nor `revalidateTag` | `cache.md`, "Writes authorize, then invalidate": `updateTag` after the commit |
| `live-provider` | `src/data/collections.ts` without `src/data/live-actions.ts`, or a dashboard layout with neither `LiveProvider` nor `ConsoleLive` | `live.md`, "The live starters" and "Refreshing": add the five files and the provider |
| `authorized-endpoints` | `app/api/assistant/route.ts`, or an `actions.ts` Server Action file, without a `resolveAccess` call | `cache.md`, "The assistant route": call `resolveAccess()` first and bring `tools.ts` and `respond.ts` over |

The consumer smoke (`--update`) updates a project adopted and a project created with each of the newest releases before this one (`--origins`: one at release, three weekly). It resolves the migrations the update reports, as `references/update.md` tells an agent: a created origin, whose files are the template's,
takes the release's versions of the affected team-owned files (never a test) and the files that arrived with them; an adopted origin,
whose pages are the team's own, makes the minimal edit the instruction names. It then records the resolutions and
finalizes, so `test:t1`, the build and its route and size checks run on the result, and checks the team's own files kept their bytes.

### The keep register

`.meridian/keep.json` is a JSON array of exactly `{ "path", "reason" }` entries, for a managed file the team keeps
its own version of on purpose. An update leaves a kept file as it is; when the new release removes it, it stays and is
recorded as retired. The checks refuse an entry for a path Meridian never managed (or retired and left in place). A
managed file the team deleted is not a conflict: the update records it as kept deleted and leaves it out on every later
update, and removing its entry brings it back on the next one. A file `create` never delivered — it removes the Atlas
after copying, and ships no test of Meridian's but `tests/setup.ts` — is in neither the manifest nor the project, and no update adds it. An aborted update takes back
the kept-deletion entries it wrote, leaving the register as it found it.

### `brand`

`npx zz-meridian@<installed version> brand [brand flags] [--allow-dirty]` changes the brand of a project with no hand
edits. It rebuilds the old and the new brand from the running release (never from the working copy), refuses when any
brand output differs from what the release generated (so it cannot overwrite the team's work), and then writes the brand
outputs, `src/app.config.ts` and the manifest together or changes nothing. It refuses during an update session, and when
the project's manifest version is not the running one (run `update` first). It is distinct from `update`, which replays
the recorded brand; the product's own `pnpm brand` stays a local edit that the next update would stage.

## The manifest

`.meridian/manifest.json`, committed in the project, written by `create` and `adopt` so that every project can `update`
later. It records the release the project was copied from, its brand, and a hash of every file Meridian manages, and of
no other: not `src/app.config.ts`, `scripts/verify.config.ts`, `app/`, `docs/` or `src/views/` (apart from
`src/views/console-chrome.tsx`). Projects from 0.3.0 also recorded those; their first update removes them from the
manifest and leaves the files on disk. The manifest moves only when an update is finalized or a rebrand completes:

```json
{
  "version": "0.2.0",
  "route": "adopt",
  "brand": { "name": "Acme Ops", "hex": "#2E6BE4" },
  "files": { "src/components/ui/button/index.tsx": "sha256-…" }
}
```

## Package managers

The gates run `node_modules/.bin/<tool>` directly (`scripts/lib/bin.ts`), which works under any package manager, and
`adopt` installs with whichever lockfile the project has. The requirement is Node 22.18, and Chrome for the browser
checks.

## Release pipeline

Modelled on the release pipeline of the owner's earlier packages, one package instead of two:

1. **Dispatch**: `gh workflow run release.yml -f version=<v> [-f dry_run=true]`, from `master`. The version must equal
   `cli/package.json`'s and the tag must be unused.
2. **Gates** (ubuntu-24.04, 4 CPUs, the reference profile), each run once: `pnpm test:release` (every Tier 1 and Tier 2
   test, lint, the type check and a production build with its size and route checks; the package's own tests
   `tests/cli-*` and the browser-fixture tests `tests/deep-*` are inside it), then the consumer smoke from the built
   tarball (step 4). The Postgres suite is reported not run here, because the job holds no service. Recovery and failure
   cases run weekly (below). When each command runs, in a project and in this repository, is `docs/testing.md`'s
   `## When each runs`.
3. **Pack and assert, before anything is irreversible**: `npm pack` in `cli/`, then on the tarball: the bin has its
   `#!/usr/bin/env node` line; `payload/skills/zz-meridian/SKILL.md` and its references are there; at least 60 component
   folders are there; no `node_modules/`, `tests/` of the CLI, `out/` or `.next/`.
4. **Consumer smoke, from the tarball** (`smoke.ts --adopt --create --update`):
   - `adopt` into `cli/test/fixture-next-app` (a minimal App Router app with two pages, its own stylesheet, a button and a data module), then
     install, `tsc --noEmit` and `next build`, all green. This is the test that keeps the Route A list complete.
   - `create` into a clean folder, then its `test:t1` and `next build`; the weekly run adds the created project's own `pnpm test:release` (`--created-release`).
   - `update` from the release before (adopted and created, read from the registry): a dry-run that writes nothing, the
     update, what it reports resolved, finalize with the Tier 1 checks, the build and its route and size checks, and the team's bytes unchanged. One origin
     at release and the last three weekly, so the time stays the same however many releases there are; the updater's
     own stages and each migration have their tests (`--update-all`, `tests/cli-*`).
5. **Publish** the tarball with `npm` 11.5.1 or newer through trusted publishing (OIDC), with `--provenance`. `pnpm
   publish` does not perform the OIDC exchange.
6. **The registry's package**: `npx zz-meridian@<version> --version` answers the version, the registry's tarball has the
   tested tarball's sha256, and it carries a provenance attestation. The bytes passed step 4 already; two paths still
   change once the version is published, and run here, in about 10 seconds: `create` from the registry (npm renames a
   packed `.gitignore` on install, so the project must have one), and `update` to the version in a project created
   with the release before (it compares the running package with the registry's only once that one exists). A failure here is an unsuccessful release, not a rollback: the version stays published and untagged
   until a fix is released.
7. **Tag `v<version>` last**, then the GitHub Release with the version's `CHANGELOG.md` section as its body.

`dry_run` stops after step 4.

**Weekly** (`.github/workflows/weekly.yml`, Mondays and on demand, master's current commit): `pnpm test:t2` on the
whole tree (a fresh clone has no green marker), the Postgres references against a Postgres and a PgBouncer (`postgres`),
and the consumer smoke's `--adopt --update --origins 3 --update-all` from a tarball packed from that commit, labelled as
the next patch so `update` treats it as unpublished:
the update from each of the last three releases, the updater's stages on the 0.3.0 fixture, and every recovery and
failure case of the update. Both run the
consumer smoke's `--adopt` and `--update`; weekly reaches three releases back and every recovery case, a release only the
one before it. Each job keeps its log as an artifact. A failure notifies;
nothing waits on it. `docs/testing.md` says when each check runs, and that a red here does not of itself hold
a release.

A `/release` runbook (`.claude/commands/release.md`) holds the judgement before dispatch: the version, the changelog
section and the docs sweep. A `cli/scripts/set-version.ts`
writes the version into `cli/package.json` and the root `package.json`, and refuses a version with no section in
`CHANGELOG.md`.

## One-time setup (the maintainer, once)

npm configures a trusted publisher only on a package that exists. The maintainer created `zz-meridian` with a
`0.0.0-stage` placeholder, then on npmjs.com → `zz-meridian` → Settings set the trusted publisher (GitHub Actions,
`zhixuan312` / `zz-meridian` / `release.yml`, environment `npm`, "Allow npm publish" on) and Publishing access to
require 2FA and disallow tokens. 0.2.0 itself was published from the maintainer's laptop, with 2FA, before the
publisher was set: the exact tarball the dry run had tested (its sha512 matches), so it carries no provenance. The
release run then found it on the registry, skipped the publish, and finished the consumer check, the tag and the
Release. From 0.2.1 on, only the workflow, from `master` through the `npm` environment, can publish, and every
version carries provenance. The placeholder can be deprecated.

## Versioning

The design system and the package share one version, under the rules at the top of `CHANGELOG.md`: a removed or renamed
token, prop or card is major; a new card, token or variant is minor; a corrected value is a patch. The current
`[Unreleased]` section becomes the next release.

## Phases

- **v1**: `create`, `adopt`, `skill`, the manifest, package-manager-agnostic scripts, the pipeline, the
  fixture test.
- **v2**: `update` (dry-run, update, report, resolutions, finalize, resume, abort), the keep register, `brand`, the session
  checks in `test:release`.

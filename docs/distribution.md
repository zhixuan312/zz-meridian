# Distribution: the `zz-meridian` package

Status: v1 (`create`, `adopt`, `skill`) shipped in 0.2.0 (decision 0009). v2 (`update`, `brand`, the keep register) is complete for projects from 0.3.0 on; its zones are in `skills/zz-meridian/references/ownership.md` and its agent workflow in `references/update.md`. Releasing: the `/release` command (`.claude/commands/release.md`).

## The one sentence

A team gives its coding agent this, from its frontend's folder:

> Run `npx zz-meridian@latest adopt` here, then follow the zz-meridian skill it installs: keep our data layer and
> routes, restyle every page with Meridian's components and tokens, and run pnpm verify until it passes.

For a new dashboard: `npx zz-meridian@latest create <dir>`, then the same skill.

The split follows what each part is good at. The package does the settled work, the same way every time, and proves it
built: what to copy, which dependencies to merge, the alias, the stylesheet, the brand. The agent does the judgement:
rebuilding each page on Meridian's components, the fake API, and reading what `pnpm verify` finds.

## The package

- **Name** `zz-meridian`, unscoped (free on npm, and the shortest sentence). The command is `zz-meridian`
  (`bin: { "zz-meridian": "dist/cli.js" }`); a different bin name breaks `npx zz-meridian`.
- **Where it lives**: `cli/` in this repository, its own `package.json`, built with `tsc` to `cli/dist/`; not a
  workspace member, and outside the root's type check (the root lint does cover `cli/**`). The repository root stays the template app, `private`,
  renamed `zz-meridian-template`.
- **Payload**: a snapshot of the template, built by `cli/scripts/build-payload.ts` into `cli/payload/` with `git archive
  HEAD`, never from a walk of the folder, so a build output, a local `.env` or an uncommitted edit cannot ship
  (`--worktree` exists for trying a change before committing). The package itself, CI, agent settings and `.env` files
  are left out. The package carries `dist/`, `payload/`, its README and nothing else: no dependencies, no install
  scripts.
- **No runtime dependency**: nothing in a dashboard imports `zz-meridian`. It needs Node 22.18 or newer.

## Commands

### `create <dir>`

Copies the template (without `.git`, the Atlas, card specifications and previews, `docs/`, `decisions/`, the
changelog), installs the skill into the new project (see below), writes the manifest, and prints the next step. Brand
arguments (`--name`, `--hex`, …) pass through to `scripts/brand.ts --product`. Replaces SKILL.md step 3's
clone-then-delete.

### `adopt`

Brings Meridian into the project in the current folder. It refuses, and copies nothing, when:

- the git tree is dirty (`--allow-dirty` overrides): every change it makes must be reviewable as one diff, and revertable;
- the project is not Next.js with the App Router: it exits with the Route B or C guidance from
  `references/existing-project.md` instead.

Then, in this order:

1. Copies the Route A set: `tokens/`, `src/styles/`, `src/components/` (without `README.md` and `preview.tsx`),
   `src/app.config.ts`, `src/views/console-chrome.tsx`, the `src/lib` modules the components import, `src/lib/assistant/prompt.ts`,
   `app/icon.ts`, `scripts/`, `tests/setup.ts` and the config files. The list is an array in `cli/src/adopt.ts`; the
   fixture test (below) is what keeps it complete. A file of the same name that differs is never overwritten: `adopt`
   lists the conflicts and stops before writing anything.
2. Merges dependencies and scripts into their `package.json`, keeping their versions where newer and compatible; adds
   the `@meridian/* → ./src/*` alias to `tsconfig.json` when theirs differs (their own `@/*` is left as it is).
3. Replaces their global stylesheet with the template's `app/globals.css`, keeping theirs as `app/globals.before.css`
   for the agent to port from.
4. Runs `scripts/brand.ts --existing` with the brand arguments given (or the name from their `package.json`): the name,
   the accent, the contrast gate, and the Meridian rules appended to their `AGENTS.md`.
5. Installs the skill and writes the manifest.
6. Runs their package manager's install, `next typegen` and `tsc --noEmit`, and prints the result and the next step:
   the skill's Route A from step 2, with the template to read from at the same version.

Three things make the copy safe in someone else's project. Meridian's own files import each other by relative path,
pinned to the exact module (`…/button/index`), so a team's `components/ui/button.tsx` can never be resolved in place
of Meridian's whatever their `@/` alias says; the team imports Meridian as `@meridian/…`, which `adopt` adds to
`tsconfig.json`. Meridian's scripts carry their own lint exceptions, so they pass the team's eslint config. And
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
   changes, then runs the install. Applied: untouched replacements, additions and untouched removals. Staged: every
   managed file the team changed or deleted, or collided with. The only team files it edits are `package.json` (missing
   dependencies and scripts, older ones of the same major, and entries still exactly as the earlier release wrote them;
   the framework `next`, `react` and `react-dom` always follows the target), the managed block in `AGENTS.md`, and the
   lockfile the install rewrites. Everything else in `MERGE.md` is advice.
3. **The report.** `MERGE.md` lists every staged item as `file:<path>` and every change beyond copying files as
   `migration:<id>` (a dependency the team pinned itself, a script, a release's own migration), with the paths of the
   copies and a resolution stub. Exit codes: `0` finalized in the same command (nothing was pending), `2` applied with
   work pending, `1` a refusal, failure or interruption.
4. **Resolutions.** The team (or its agent) makes each decision in the project's own file, then records it in
   `resolutions.json`: one object per item, with the item id, `resolved` (or `not-applicable` for a migration), a
   reason, and the SHA-256 each named file has now. While the session is open, `node scripts/check.ts` (and so the gate)
   fails and names it.
5. **Finalize.** `npx zz-meridian@<version> update --finalize` (the version named in `MERGE.md`) checks that every
   item has one current resolution and that the installed dependencies match the plan, then runs the project's gate and
   one `next build` in place. It compares every protected input before and after each, so a check that rewrites source
   fails it. Only when both pass and nothing changed does it write the target manifest, atomically, and archive the
   session under `.meridian/history/<version>/<id>/`. It prints the stage times and says the browser checks did not run.
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

### The keep register

`.meridian/keep.json` is a JSON array of exactly `{ "path", "reason" }` entries, for a managed file the team keeps
its own version of on purpose. An update leaves a kept file as it is; when the new release removes it, it stays and is
recorded as retired. The gate refuses an entry for a path Meridian never managed (or retired and left in place), and a
kept file that is missing; an update never recreates one.

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
2. **Gates** (ubuntu): `pnpm gate`, `next build`, and the consumer smoke from the built tarball (step 4).
3. **Pack and assert, before anything is irreversible**: `pnpm pack` in `cli/`, then on the tarball: the bin has its
   `#!/usr/bin/env node` line; `payload/skills/zz-meridian/SKILL.md` and its references are there; the component count
   matches the repository; no `node_modules/`, `tests/` of the CLI, `out/` or `.next/`.
4. **Consumer smoke, from the tarball**:
   - `adopt` into `cli/test/fixture-next-app` (a minimal App Router app with one page and its own stylesheet), then
     install, `tsc --noEmit` and `next build`, all green. This is the test that keeps the Route A list complete.
   - `create` into a clean folder, then `pnpm verify --quick --no-vitals`. Chrome is on ubuntu runners; Web Vitals
     measure the machine, so CI leaves them to the local run (`--no-vitals` is new in v1).
5. **Publish** the tarball with `npm` 11.5.1 or newer through trusted publishing (OIDC), with `--provenance`. `pnpm
   publish` does not perform the OIDC exchange.
6. **Tag `v<version>` last**, then the GitHub Release with the version's `CHANGELOG.md` section as its body.

`dry_run` stops after step 4. A `/release` runbook (`.claude/commands/release.md`) holds the judgement before dispatch:
the version, the changelog section, the docs sweep, and the local `pnpm verify` with Web Vitals. A `cli/scripts/set-version.ts`
writes the version into `cli/package.json` and checks the root agrees.

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

- **v1**: `create`, `adopt`, `skill`, the manifest, package-manager-agnostic scripts, `--no-vitals`, the pipeline, the
  fixture test.
- **v2**: `update` (dry-run, update, report, resolutions, finalize, resume, abort), the keep register, `brand`, the session
  checks in the gate.

# Distribution: the `zz-meridian` package

Status: v1 shipped in 0.2.0 (decision 0009). `update` is v2. Releasing: the `/release` command (`.claude/commands/release.md`).

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

## Commands (v1)

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

### `update` (v2)

Reads `.meridian/manifest.json`, then for every file in the new payload:

| The file in the project | What `update` does |
|---|---|
| Unchanged since it was copied (hash matches the manifest) | Overwrites it |
| Changed by the team | Writes the new version to `.meridian/incoming/<path>` and lists it for the agent to merge |
| In the manifest but deleted by the team | Leaves it deleted |
| New in this version | Adds it |

Then re-applies the brand from the manifest's stored arguments, runs install and `tsc`, and prints the changelog
sections between the two versions, each of which says what breaks and what to do instead.

## The manifest

`.meridian/manifest.json`, committed in the project, written by `create` and `adopt` from v1 so that every early
adopter can `update` later:

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

Modelled on multi-model-agent's (`.github/workflows/release.yml` there), one package instead of two:

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
   publish` does not perform the OIDC exchange; multi-model-agent learned this at 5.16.1.
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
- **v2**: `update`.

---
description: Release the zz-meridian npm package — version, changelog, local proof, then dispatch the GitHub Actions release, which gates, packs, runs the consumer path from the tarball, publishes with provenance through trusted publishing, and tags last.
argument-hint: [version, e.g. 0.3.0]
---

# /release — release the `zz-meridian` package

Repository: `~/Documents/code/zz-meridian` (GitHub `zhixuan312/zz-meridian`), released from `master`. The package is
`cli/`; what it ships is the template at the release commit (decision 0009, `docs/distribution.md`). Your part is the
judgement: the version, the changelog, the docs, the local proof. `.github/workflows/release.yml` does the rest on
GitHub's runners: nothing is published from a laptop, and the tag is created last.

**$ARGUMENTS** is the version. Without it, read `npm view zz-meridian version` and choose by the rules at the top of
`CHANGELOG.md` (a removed or renamed token, prop or card is major; a new card, token or variant is minor; a corrected
value is a patch).

## 1. Where things stand

```bash
git status --short && git log --oneline -3
node -p "require('./cli/package.json').version + ' / ' + require('./package.json').version"
npm view zz-meridian version          # what consumers get today
git tag -l 'v*' | tail -3
gh run list --workflow=release.yml -L 3
```

- Versions equal npm's, no tag for the next one: a new release (steps 2 to 5).
- `cli/package.json` ahead of npm, no tag: merged, not released (steps 4 and 5).
- A run for this version failed: read the failed step. If the registry already has the version
  (`npm view zz-meridian@<v> version`), the release is fine but unfinished: fix the step and dispatch the same version
  again; the publish step skips a version already there. Otherwise fix forward and dispatch again.
- Tag and Release exist: released.

## 2. The changelog and the docs

- `CHANGELOG.md`: turn `[Unreleased]` into `## [<v>] · <date>`, written for the people who adopt Meridian: what is new,
  what changed, and under **Breaking**, what breaks and what to do instead. CI lifts this section into the GitHub
  Release.
- If the release changes what `adopt` copies, how a project is branded, or the route an agent follows, check
  `skills/zz-meridian/` (SKILL.md and `references/existing-project.md`), `cli/README.md` (the npm page) and
  `docs/distribution.md` say the same.
- `node cli/scripts/set-version.ts <v>`: writes `cli/package.json` and `package.json`, and refuses without the
  changelog section.

## 3. Prove it locally

```bash
pnpm gate
pnpm verify                     # with Web Vitals: CI runs verify without them
node cli/scripts/build-payload.ts --worktree && pnpm exec tsc -p cli/tsconfig.json
(cd cli && rm -f *.tgz && npm pack)
node cli/scripts/smoke.ts --create --verify
```

Everything green, or stop and fix the cause. Commit (`release: <v>`, after the change commits), push to `master`.

## 4. Dispatch

```bash
gh workflow run release.yml -f version=<v> -f dry_run=true     # gates, pack, consumer path; publishes nothing
gh run watch "$(gh run list --workflow=release.yml -L1 --json databaseId -q '.[0].databaseId')"
gh workflow run release.yml -f version=<v>
gh run watch "$(gh run list --workflow=release.yml -L1 --json databaseId -q '.[0].databaseId')"
```

`gates` installs and runs the template's code and never holds a credential; it uploads the one tarball it tested.
`publish` installs nothing, checks that tarball's hash, publishes it with `npm` (pnpm does not do the OIDC exchange)
and `--provenance`, waits for the registry, runs `npx zz-meridian@<v> --version` as a consumer, then creates the tag
and the Release.

## 5. Report

```bash
npm view zz-meridian@<v> version dist.attestations.provenance
gh release view v<v>
```

Say: the version, the run URL, the local proof (gate, verify with vitals, smoke), and whether provenance is attached
(https://www.npmjs.com/package/zz-meridian/v/<v>).

## Rules

- Stop on any failure. Never `--force`, never re-run around a red job, never publish from a laptop: npm accepts
  only the workflow, and that is the point.
- npm versions are immutable: never reuse one. A tag is never moved or deleted; supersede it with the next version.
- Do not rename `.github/workflows/release.yml`: npm's trusted-publisher setting names that file.
- Every action in the workflow is pinned to a commit. To update one, resolve the new release tag to its commit with
  `gh api repos/<owner>/<action>/git/ref/tags/<tag>` (dereferencing an annotated tag) and pin that.

## One-time setup (done for 0.2.0)

The package was created with a `0.0.0-stage` placeholder, since npm sets a trusted publisher only on a package that
exists. npmjs.com → `zz-meridian` → Settings → Trusted publisher → GitHub Actions: owner `zhixuan312`, repository
`zz-meridian`, workflow `release.yml`, environment `npm`, "Allow npm publish" on. Publishing access: require 2FA and
disallow bypass tokens. In this repository, Settings → Environments → `npm` allows only `master`.

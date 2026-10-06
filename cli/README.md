# zz-meridian

Bring [ZZ Meridian](https://github.com/zhixuan312/zz-meridian), a dashboard design system for Next.js, into your
project, or start a new dashboard on it. The package copies the files in and installs the agent skill; nothing in your
dashboard depends on it afterwards.

## The one sentence

Give your coding agent (Codex, Claude Code, or any agent that can run a shell) this, from your frontend's folder:

> Run `npx zz-meridian@latest adopt` here, then follow the zz-meridian skill it installs: keep our data layer and
> routes, restyle every page with Meridian's components and tokens, and run pnpm verify until it passes.

## Commands

```sh
npx zz-meridian@latest adopt [brand flags]        # bring Meridian into this Next.js App Router project
npx zz-meridian@latest create <dir> [brand flags] # start a new dashboard
npx zz-meridian@latest update [--dry-run] [--verbose] # update this project (the dry-run writes nothing)
npx zz-meridian@<version> brand [brand flags]     # rebrand this project, with the version in .meridian/manifest.json
npx zz-meridian@latest skill [--global]           # install only the agent skill
```

Brand flags: `--name "Acme Ops"`, `--hex '#2E6BE4'` (or `--accent indigo|cobalt|jade|graphite`), `--theme dark|light`,
`--workspace`, `--timezone`, `--currency`, `--user`, `--role`.

**adopt** copies Meridian's tokens, styles, components, gates and scripts into `src/`, `tokens/` and `scripts/`;
merges the dependencies and scripts it needs into your `package.json`; replaces your global stylesheet (yours is kept
beside it as `*.before.css`); brands it; adds Meridian's managed block to your `AGENTS.md` between two markers, keeping your own text there byte
for byte; writes an empty `docs/brief.md` (your product, users, data, decisions and glossary) if you have none; installs the skill into
`.agents/skills/` (Codex) and `.claude/skills/` (Claude Code); records every copied file in `.meridian/manifest.json`;
installs and type checks. Your routes, your data layer and your own components are not touched. Meridian's files
import each other by relative path, so a `components/ui/button` of your own is never confused with Meridian's; your
code imports Meridian as `@meridian/…`.

It refuses, and writes nothing, when the git tree has uncommitted changes (so its change is one reviewable diff), when
the project is not Next.js with the App Router, or when a file it would copy already exists with other content.

**create** copies the template into a new folder, branded as your product, with the Design Atlas and the design
system's own documents left out.

**update** moves a project adopted or created with 0.3.0 or later to this release. `update --dry-run` shows the plan and
writes nothing; run it first.
- It fetches the release the project was copied from, checks it against the registry's integrity record, and replays
  that release and this one in a scratch folder. If a file the manifest recorded does not match the replay, it stops.
- It replaces every Meridian file you have not touched, adds the new ones and removes the retired ones. A file you edited,
  deleted or kept (`.meridian/keep.json`) is never overwritten: an edited or deleted one is staged as base/ours/new copies
  for you to merge.
- It adds the dependencies and scripts this release needs to `package.json` and updates Meridian's managed block in
  `AGENTS.md`; a version or script you chose yourself becomes a migration to resolve, never a silent change.
- It reports a migration for each interface the release changed where one of your own files still has the old shape;
  moving to 0.5.0 can report ten, such as `cache-components-config`. Resolve them as the skill's
  `references/update.md` says; `docs/distribution.md` lists them.
- Everything it did and everything left to do is in `.meridian/update/<version>/MERGE.md`. Resolve the items, then run
  the pinned `npx zz-meridian@<version> update --finalize`; `--resume` continues an interrupted run and `--abort` restores
  what it changed. Only finalize records the new version. `--finalize --verify` validates with the project's default
  `verify` instead of the gate and the build, and reports its coverage line.
- It refuses, writing nothing, on a dirty git tree (unless `--allow-dirty`) or while another update is open. `--verbose`
  lists every file.

**brand** changes the brand of a project built on Meridian with no hand edits: it rebuilds the brand outputs (tokens and
styles) and `src/app.config.ts` for the new flags and records them in the manifest together, or changes nothing. It
refuses when one of those outputs was edited, while an update is open, or on a dirty tree (unless `--allow-dirty`). Run
it with the version the manifest records. The project's own `pnpm brand` still works, but its changes count as your edits.

Requires Node 22.18 or newer. The default `pnpm verify` runs without Google Chrome and reports the browser checks as not run; `--full` and `--perf` need it.

## What this package does not do

It has no dependencies and no install scripts: running it executes only its own code, and only when you call it. It
sends nothing anywhere; the only network access is your package manager's install, which you can skip with
`--no-install`. Every release is built and published by GitHub Actions with npm provenance, so the registry shows the
commit and workflow each version came from.

## License

MIT

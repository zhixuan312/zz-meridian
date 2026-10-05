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
npx zz-meridian@latest update --dry-run [--verbose] # show what updating this project would change
npx zz-meridian@latest skill [--global]           # install only the agent skill
```

Brand flags: `--name "Acme Ops"`, `--hex '#2E6BE4'` (or `--accent indigo|cobalt|jade|graphite`), `--workspace`,
`--timezone`, `--currency`, `--user`, `--role`.

**adopt** copies Meridian's tokens, styles, components, gates and scripts into `src/`, `tokens/` and `scripts/`;
merges the dependencies and scripts it needs into your `package.json`; replaces your global stylesheet (yours is kept
beside it as `*.before.css`); brands it; appends Meridian's rules to your `AGENTS.md`; installs the skill into
`.agents/skills/` (Codex) and `.claude/skills/` (Claude Code); records every copied file in `.meridian/manifest.json`;
installs and type checks. Your routes, your data layer and your own components are not touched. Meridian's files
import each other by relative path, so a `components/ui/button` of your own is never confused with Meridian's; your
code imports Meridian as `@meridian/…`.

It refuses, and writes nothing, when the git tree has uncommitted changes (so its change is one reviewable diff), when
the project is not Next.js with the App Router, or when a file it would copy already exists with other content.

**create** copies the template into a new folder, branded as your product, with the Design Atlas and the design
system's own documents left out.

**update --dry-run** works out what updating a project adopted or created with 0.3.0 or later would change, and
writes nothing.
- It fetches the release the project was copied from, checks it against the registry's integrity record, and replays
  that release in a scratch folder. If a file the manifest recorded does not match the replay, it stops.
- It compares every file Meridian manages with the version this package ships, then lists only the files that need
  your decision: one you edited that Meridian also changed, or one you deleted.
- It counts everything else: untouched, added and removed files, and your own files, which it never touches.
- `--verbose` lists every file. Applying an update arrives in a later release; without `--dry-run` the command refuses.

Requires Node 22.18 or newer. The checks (`pnpm verify`) also need Google Chrome.

## What this package does not do

It has no dependencies and no install scripts: running it executes only its own code, and only when you call it. It
sends nothing anywhere; the only network access is your package manager's install, which you can skip with
`--no-install`. Every release is built and published by GitHub Actions with npm provenance, so the registry shows the
commit and workflow each version came from.

## License

MIT

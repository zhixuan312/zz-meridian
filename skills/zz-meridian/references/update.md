# Updating a project built on Meridian

`npx zz-meridian@latest update --dry-run` shows what moving this project to the running version of Meridian would
change, and which of those changes need the team's decision. In this release it only reports. Applying the update
follows in a later release of this cycle, so a plain `update` refuses and says so. Do not copy files by hand to make up
for it.

## What it does

It works from `optional:.meridian/manifest.json`, which records the release the project was copied from and a hash of
every file Meridian put in. It rebuilds that release and the running one in a scratch folder, compares every managed
file in three places (what was recorded, what the running release has, what is on disk now), prints the result, and
proves that it wrote nothing: the project's files, its git `HEAD` and its git status are compared before and after.

It refuses, writing nothing, when there is no manifest, when the project is older than 0.3.0, when it is already on the
running version, or when the recorded files do not match a rebuild of their own release (then nothing can be trusted:
the message lists them). When the git tree has uncommitted changes it prints a note first, because a real update will
refuse until they are committed.

Files the team owns (product pages, data, `src/app.config.ts`, `scripts/verify.config.ts`) are never managed, so they
never appear as a conflict.

## Reading the output

Only the paths that need a decision are listed, one per line: the kind of change, the path, then what to do.

```
collision        src/components/ui/card/index.tsx  merge required
local-deletion   scripts/audit.ts  decide: delete or restore
summary: 2 conflicts · aggregated: untouched 310, added 4, removed 1, team-preserved 12
outcome: dry-run (nothing was written)
```

- **`merge required`**: the team changed a managed file and Meridian changed it too (or the team has a file where
  Meridian now wants one). Read both versions and decide how they combine. The running release's version of the file is
  in a scratch project: `npx zz-meridian@<version> create /tmp/meridian-ref --no-install`.
- **`decide: delete or restore`**: the team deleted a managed file that the running release still ships. Either the
  deletion is deliberate, and the file stays out, or it is not, and the file should come back. Ask the person when you
  cannot tell from the project.
- **`summary`**: the number of conflicts, then the counts of the files that need nothing (untouched, added, removed,
  team-preserved). Zero conflicts means a later update can apply cleanly.
- **`migrations`**: changes a release declares that go beyond copying files. `none declared` means there are none.
- **`--verbose`** lists every managed path with its kind and the action an update would take, not only the conflicts.

## What to do with it

1. Run it from a clean git tree, so the report describes the project and not unfinished work.
2. Report the conflicts to the person in their own words: which files, what the team changed, what Meridian changed.
3. Do not edit `optional:.meridian/manifest.json` to make a line go away: the manifest is how the next update knows
   what was copied.
4. Stop there until a release that applies updates is available. Then update from the person's decision on each line.

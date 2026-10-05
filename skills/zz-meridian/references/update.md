# Updating a project built on Meridian

Run `npx zz-meridian@latest update --dry-run` first: it shows what moving this project to the running version of
Meridian would change, and which of those changes need the team's decision. It writes nothing. A plain
`npx zz-meridian@latest update` then applies the safe changes and stages the rest. Do not copy files by hand to make up
for either.

## What it does

It works from `optional:.meridian/manifest.json`, which records the release the project was copied from and a hash of
every file Meridian put in. It rebuilds that release and the running one in a scratch folder (with the project's recorded
brand and shape, so no file differs for a reason of the replay), compares every managed file in three places (what was
recorded, what the running release has, what is on disk now), and acts on the result:

- **Applied**: untouched replacements, additions and untouched removals. Generated files come from the replayed target,
  so no generator runs in the project.
- **Staged**: every file the team changed, deleted or collided with, as exact copies for a three-way merge.
- **Never touched**: files in the keep register, and team-owned files. The only team files an update edits are
  `package.json` (missing dependencies and scripts, older ones of the same major, and entries still exactly as the earlier release wrote them; a version or script the team chose stays theirs and becomes a migration), the managed block in `AGENTS.md`, and the lockfile
  that the install rewrites. Everything else in `MERGE.md` is advice.

A real update refuses, writing nothing, when the git tree is dirty (unless `--allow-dirty`), when another session or lock
exists, when the manifest is missing or malformed, when the project is older than 0.3.0 or already on the running
version, when a keep entry is invalid, when a path is unsafe, or when the recorded files do not match a rebuild of their
own release (the message lists them). A dry-run prints a note instead of refusing for a dirty tree.

## The session

Every real update creates `optional:.meridian/update/<version>/`, even when nothing is staged:

| Path | Holds |
|------|-------|
| `state.json` | the journal: both manifests, every operation with its hashes, the phase, the migrations, retirements and validation results |
| `resolutions.json` | the team's resolutions; starts as `[]` |
| `MERGE.md` | the report to read |
| `base/<path>`, `ours/<path>`, `new/<path>` | the three sides of each staged file; a side that does not exist has no file, and `MERGE.md` says `absent` |
| `backup/<path>` | the preimage of every path the update changed, and only those |
| `evidence/` | the output of the install and, when finalizing, the gate and the build |

`optional:.meridian/update.lock` exists while a run is in progress. A lock that is left behind refuses every new update
and names itself and the session phase; an update never deletes it for you.

## Reading the output

Only the paths that need a decision are listed, one per line: the kind of change, the path, then what to do.

```
collision        src/components/ui/card/index.tsx  merge required
local-deletion   scripts/audit.ts  decide: delete or restore
migration  dependency:zod  pending
summary: 2 conflicts · aggregated: untouched 310, added 4, removed 1, team-preserved 12, kept 1
time: plan 3.1s · apply 0.2s · install 8.4s
outcome: migration-required
Next: resolve the items in .meridian/update/0.5.0/MERGE.md, then npx zz-meridian@0.5.0 update --finalize (or --abort)
```

- **`merge required`**: the team changed a managed file and Meridian changed it too (or the team has a file where
  Meridian now wants one). Combine `ours/` and `new/` with `base/` as the common ancestor.
- **`decide: delete or restore`**: the team deleted a managed file that the running release still ships. Either the
  deletion is deliberate, and the file stays out, or it is not, and the file should come back. Ask the person when you
  cannot tell from the project.
- **`migration`**: a change beyond copying files that the team must make (a dependency, a script, a release's own
  migration). `MERGE.md` holds the instructions and the checks.
- **`kept` and `retired-kept`**: a kept file that is missing, or one the new release removed and the update left in place.
- **`summary`**: the conflicts, then the counts of the files that need nothing. `kept` counts files left as the team has them.
- **`outcome`**: `dry-run`, `migration-required` (items to resolve), `install-pending` (the install was skipped with
  `--no-install`), `ready-to-finalize`, or `failed`.
- **`--verbose`** lists every operation with its kind and action, not only the conflicts.

Exit codes: `0` for a dry-run (or an update that finalized itself because nothing was pending), `2` when the update is
applied with work pending, `1` for a refusal, a failure or an interruption.

## Resolving: `MERGE.md` and `resolutions.json`

`MERGE.md` lists every staged item as `file:<path>` and every migration as `migration:<id>`, with the paths of its copies
and a resolution stub:

```json
{ "id": "file:src/components/ui/card/index.tsx", "status": "resolved", "reason": "", "files": { "src/components/ui/card/index.tsx": "sha256-..." } }
```

Make the decision in the project's own file, then add one such object per item to the array in `resolutions.json`, with
a reason in a sentence and the file's hash as it is after your decision (`sha256-` plus the SHA-256 of the file, or `null`
when it is absent). A migration may be `not-applicable`, with a reason. A file edited after its resolution needs a new
hash. Exactly one resolution per item; unknown or duplicate ones fail the gate.

Proposed team changes in `MERGE.md` are advice. Make them yourself, in the project, and verify them.

## The pinned commands

`MERGE.md` and the `Next:` line name the release that started the session, for example
`npx zz-meridian@0.5.0 update --finalize`. Run exactly that command: `--resume` (continue an interrupted apply or run a
skipped install), `--finalize` (validate and complete) and `--abort` (restore what the update changed) belong to the
version and package that created the session.

## What to do with it

1. Run it from a clean git tree, so the report describes the project and not unfinished work.
2. Report the conflicts to the person in their own words: which files, what the team changed, what Meridian changed.
3. Do not edit `optional:.meridian/manifest.json` to make a line go away: the manifest is how the next update knows
   what was copied.
4. Resolve each item as above, then run the pinned finalization command.

## Keeping a file on purpose: the keep register

A team that wants to keep its own version of a managed file lists it in `optional:.meridian/keep.json`. The file is a
JSON array of exactly `{ "path", "reason" }` entries. Paths are unique, project-relative and posix (no leading `/`, no
`..`), and every reason says why in a sentence.

```json
[{ "path": "src/components/ui/card/index.tsx", "reason": "Our card has a different header by design." }]
```

- A kept path must be a file Meridian manages, or one a completed update retired and left in place. Any other path
  fails the gate.
- A kept file that is missing fails the gate. An update never recreates it: restore the file or remove the entry.
- Do not add an entry to make a conflict disappear without reading it. The reason is the record of the decision.

## An unresolved session fails the gate

While an update session exists under `optional:.meridian/update/`, `node scripts/check.ts` (and so `pnpm gate`) refuses
it until every open item is resolved: an interrupted apply (run `update --resume`), an edited plan, a write that was
never applied, a staged file or a migration without exactly one current resolution, and any unknown or duplicate
resolution. More than one session fails too. When the session is ready, the gate reads its candidate manifest in place
of the recorded one for the keep register, retirements and the dormant-export sweep. Resolve as `MERGE.md` says, then
run `npx zz-meridian@<version> update --finalize`.

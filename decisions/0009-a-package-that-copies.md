# 0009 · Distributed by a package that copies, never one that is depended on

Date: 2026-10-04 · Status: accepted (shipped in 0.2.0)

## Context

Decision 0001 made the repository the source of truth and ruled out packages: a dashboard is a copy of Meridian, and
changes reach it "by copying, deliberately, not by a version bump".

Two things have since changed. Meridian is now brought into teams' existing dashboards by their coding agents (Codex,
Claude Code), from one sentence. The copy that 0001 assumed a person would make is made by an agent following prose,
and the prose was wrong: the audit of 2026-10-04 found that Route A's file list left out what the copied components
import, so a project that followed it without the assistant did not build. Second, copying deliberately has no tool,
so a team that adopted Meridian never receives a fix.

## Decision

- Meridian is published to npm as one package, `zz-meridian`, with one command, `zz-meridian`. It is a distribution
  tool, never a runtime dependency: nothing in a dashboard imports it, and removing it changes nothing that runs.
- `npx zz-meridian@latest create <dir>` starts a new dashboard; `npx zz-meridian@latest adopt` brings Meridian into an
  existing Next.js App Router project. Both copy files into the project, which owns them from then on, as 0001 intends.
- What `adopt` copies, merges and configures is code with a test, not prose: the test adopts into a fixture Next.js app
  and builds it. The skill keeps the judgement (rebuilding pages, the fake API, reading what verify finds).
- Every copy is recorded in `.meridian/manifest.json` in the project (the version, each file's hash, the brand
  arguments), so a later `npx zz-meridian@latest update` can tell an untouched file from one the team changed.
- The design system and the package share one version, under the semver rules in `CHANGELOG.md`.
- The package is published by CI (npm trusted publishing with provenance), following the release pipeline of
  multi-model-agent, with the tag created last.

## Consequences

- This refines 0001 rather than reversing it: a dashboard is still a copy, and changes still arrive by copying; the
  copying now has a tool, a record and a test.
- The one sentence a team gives its agent no longer clones a repository: it runs the package and follows the skill the
  package installs.
- The repository's root package becomes private under another name, since the published package takes `zz-meridian`.
- A first release, and each later one, is a deliberate act with a version, a changelog section and a pipeline, where
  until now `master` was the release.

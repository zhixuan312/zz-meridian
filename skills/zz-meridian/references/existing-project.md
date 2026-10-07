# Bringing Meridian into an existing frontend

When the person already has a frontend and wants it to look and behave like Meridian, choose the route by what is there.
Tell them which route you chose and why, in one sentence, before starting.

## Route A: Next.js (App Router) with React 18+ (the common case)

Migrate in place, page by page, keeping their data layer.

1. **Run `npx zz-meridian@latest adopt`** in their project, with the brand flags from step 2 of SKILL.md (`--name`,
   `--hex` or `--accent`, `--workspace`, `--timezone`, `--currency`). It copies Meridian's tokens, styles, components,
   gates and scripts in; merges the dependencies and scripts it needs into their `package.json`; adds `@meridian/*`
   (`src/*`) to `tsconfig.json`; replaces their global stylesheet, keeping theirs beside it as `*.before.css` to port
   from as tokens; writes a first `nav` from their routes into `src/app.config.ts`; brands it; writes a managed block
   into their `AGENTS.md`, between two marker comments, and keeps every byte outside it (a later run replaces only that
   block; a duplicate or unterminated marker is refused, with the files already copied); writes the five-section brief
   `optional:docs/brief.md` when they have none (SKILL.md, step 3: fill it from their answers); installs this skill into
   `optional:.agents/skills/` and `optional:.claude/skills/`; records every copied file in `optional:.meridian/manifest.json`; installs and type
   checks. It refuses, writing nothing, when the git tree has uncommitted
   changes (commit first, so its change is one diff to review), when the project is not Next.js with the App Router,
   or when a file it would copy already exists with other content (it lists them: move theirs, then run it again).
   Meridian's own files import each other by relative path, so their `components/ui/button` is never confused with
   Meridian's.
2. **The template to read from** is the version in `optional:.meridian/manifest.json`, at
   `https://github.com/zhixuan312/zz-meridian/tree/v<version>`: the layouts, the presets in `src/views/` and the pages
   in `optional:app/(dashboard)/`. Without network access to GitHub, `npx zz-meridian@<version> create /tmp/meridian-ref
   --no-install` writes the same files to a scratch folder.
3. Wrap their root layout like the template's `app/layout.tsx` (fonts, the pre-paint script, `Providers`) and their
   console routes in `AppShell` with the rail, `ShellTools` and the command palette (see `optional:app/(dashboard)/layout.tsx`).
   The template's layout passes `ShellTools` the sample `ALERTS` and `DEMO_NOW` from `optional:src/data/sample.ts`, which
   is not copied: pass their own alerts (an empty list until they have some) and their own clock. Give each `nav`
   entry in `src/app.config.ts` its icon and group. The Rail and the palette take `nav` as a prop, rendered from a
   client module (`src/views/console-chrome.tsx`), since each destination carries its icon component; if what a person
   may see depends on their role or scope, filter `nav` there from their session, and pass `workspace` and `scopes`
   to the Rail for a scope switcher.
   **Catch the shell's own data in the layout.** A page's error boundary only catches what the page throws: if the
   layout awaits something the shell needs — the alert list, the signed-in person — one failed query takes the whole
   layout down, and the framework's bare error page shows instead of the designed one inside the shell. Read those
   defensively (`const alerts = await recentAlerts().catch(() => [])`), so the shell stands and the page's own
   `error.tsx` shows "This view did not load" with Retry.
4. Rebuild each page on `PageFrame`, `Stack` and `Row` with Meridian components (imported as
   `@meridian/components/…`), keeping their data fetching and business logic untouched. Their old Tailwind utilities
   render nothing under Meridian's scales, and the gate names each one. Do the busiest page first; when the person is
   there to look, show it to them before the rest.
5. **Before `pnpm verify --full`, give it a fake API.** The default `pnpm verify` reads and never presses: the gate,
   one build, the size checks and a navigation smoke of at most three routes, with only the harmless probes your
   `navigationChecks` declare. In an adopted project it reports the browser as `not run` until `verify.config.ts` names
   a `fakeApi`, or says `noLiveApi: true` because the pages read and write nothing outside the repository.
   `pnpm verify --full` presses every control it finds on the built app, Approve, Revoke, Archive and Delete included,
   and refuses without one of the two. If their pages call a live backend, those presses change it. Write
   `example:scripts/fake-api.ts`: a server on `--port 0` that answers every route the pages call with typed fixtures (writes
   answer success and are forgotten) and prints `listening on <url>`. Name it and the environment variable their app
   reads its API address from in `scripts/verify.config.ts` (`fakeApi: { script, env }`): verify starts it first and
   builds and serves the app against it. Point the build at it, not only the server: an address read in
   `next.config` rewrites is baked in at build time.
   **A direct database connection is the same hazard through another door.** If their pages read `DATABASE_URL` from
   `.env` (or any other data URL: name it in `dataUrls`), a `next build` and `next start` in their folder carry it, so
   Approve and Delete land on whatever it names. verify reports the browser as `not run` in the default, and `--full`
   refuses, when a data URL resolves to a host that is not this machine; point it at a local copy for the run, and set
   `allowRemoteData: true` only when you know what the presses reach. Restore the data afterwards — the walk-through
   flags rows and a press can delete, even on a run where every check passes.
6. List their detail pages worth seeing (a normal record, a failed one, a missing one) in `detailRoutes` in
   `scripts/verify.config.ts`, with ids from the fake API's fixtures. Map their main routes in `navigationChecks` (a
   ready selector and one harmless probe each) so the default smoke covers data and interaction, not only the shell.
   Run `pnpm verify` until it passes, and `pnpm verify --full` before a release; the last line of each says what it
   covered (`coverage: …`).

Without the assistant, `verify --full` skips its walk-through on its own (it runs only when `optional:app/api/assistant/route.ts`
exists).

## Adding the assistant

The panel (`src/components/patterns/assistant/`) already came with `src/components/`, and `AppShell` mounts it when
`optional:app/(dashboard)/layout.tsx` passes `assistant`, a promise it does not await: `assistant={connection().then(() => assistantConfig(process.env) !== null)}`. A product that adopts the assistant also brings
`optional:app/api/assistant/route.ts`, the rest of `src/lib/assistant/`, `optional:src/lib/collection.ts` and `optional:src/data/collections.ts`;
add `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible` and `zod` to the dependencies. Point `optional:src/data/collections.ts` at their data, bring `optional:src/data/access.ts` with their own session and permissions in its policy (the route and every server action ask it), and set `ASSISTANT_PROVIDER`, `ASSISTANT_API_KEY` and `ASSISTANT_MODEL`
(plus `ASSISTANT_BASE_URL` for `openai-compatible`): it stays off until they are set. The "Show the assistant" switch is
in `optional:src/views/settings.tsx`.

When their `rows` becomes a real database, two things matter. Pages read through `read()` (`optional:src/data/read.ts`),
which caches per caller's scope and refreshes exactly the tenant a write touched, so do not wrap the read in a second
cache; writes call `updateTag` after the commit (`cache.md`, "Authorized, scoped reads" and "Writes authorize, then
invalidate"). And raise the connection pool's idle timeout past `pg`'s 10-second default, since a cache miss is a round
trip each. Issue #7 has the numbers.

## The database behind the collections

Meridian's sample serves fixtures; a product's collections read a database. What adopters met, and what held (issues #16 and #17):

- **The pool survives a dropped connection.** Keep idle connections for minutes (`idleTimeoutMillis`, `customize.md`), and
  listen for their loss: `pool.on('error', (e) => console.error('db: an idle connection closed', e))`. Without the
  listener, the database or its pooler closing an idle connection is an uncaught error and the server exits. Set
  `connectionTimeoutMillis` so a database that does not answer fails a read rather than hanging it.
- **Behind a transaction pooler** (PgBouncer, Neon's pooled endpoint, Supabase's): pass no session setting to the pool. A
  `statement_timeout` or any startup option is refused at connect ("unsupported startup parameter") and every connection
  fails; set limits with `SET LOCAL` inside each transaction instead. A session advisory lock does not hold across
  transaction pooling: take a start-up lock with `pg_try_advisory_lock`, try it once, and carry on without it. Connect
  migrations, and anything that needs a session, to the direct endpoint.
- **Schema changes run on start, never in the build.** Apply the product's own migrations from `instrumentation.ts`
  (`register`, on the Node.js runtime) under that non-blocking lock, so one instance migrates and the rest serve; keep the
  migrator's bookkeeping in a schema the role may write (`public`); never stop the server on a failure, and report the
  outcome at a health route so a deploy can read it. A build has no database to migrate and must not need one.
- **A role that may read and write but not create.** Deployed roles often lack `CREATE`, and a migrator that starts with
  `CREATE SCHEMA` is refused even where tables may be created. Ship the schema as a one-off SQL file a person with the
  owner's role runs once, and let the application role only migrate within what it may do.

## Route A2: a static HTML page (data fetched as JSON)

The simplest case. Create a new Meridian project (SKILL.md steps 3 and 4, with `--product`) and point a module in
`optional:src/data/` at the same JSON the page fetched today (read the file at build time, or fetch it in a server component).
Rebuild each section of the page as a Meridian page or card; the old page can stay where it is until they switch.

## Route B: another React stack (Vite, Create React App, Remix, Astro islands)

Create a new Meridian project next to theirs (SKILL.md steps 3 and 4), then port into it: their routes become pages,
their data hooks or fetch calls move into `optional:src/data/` (as server functions or client hooks), their domain types come
along unchanged. Keep their old app running until the new one passes `pnpm verify` and they have looked at it.

## Route C: not React (Vue, Svelte, Angular, server templates)

Meridian's components are React, so the honest options are:

- **A new Meridian project** for the dashboard, talking to their existing backend (usually the best result), or
- **Tokens only**: copy `src/styles/tokens.css` (plain CSS custom properties, framework-agnostic) and rebuild their
  components against those roles by hand, following the card specifications in `src/components/*/*/README.md`. Tell
  them `pnpm verify` cannot validate a non-React app; run the contrast gate on the tokens and audit their pages with
  `node scripts/audit.ts --base <their dev server URL> --routes <their routes>` from a Meridian checkout.

Ask which they prefer when it is not obvious; recommend the new project.

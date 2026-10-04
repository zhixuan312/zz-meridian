# Bringing Meridian into an existing frontend

When the person already has a frontend and wants it to look and behave like Meridian, choose the route by what is there.
Tell them which route you chose and why, in one sentence, before starting.

## Route A: Next.js (App Router) with React 18+ (the common case)

Migrate in place, page by page, keeping their data layer.

1. Fetch the template into a temporary folder, unless you are already reading this from a clone of it:
   `git clone --depth 1 https://github.com/zhixuan312/zz-meridian.git /tmp/meridian`
2. Copy the parts a dashboard is built from into their project (merge, never overwrite their own files of the same
   name without reading them): `tokens/`, `src/styles/`, `src/components/` without the `README.md` and `preview.tsx`
   files, `src/app.config.ts`, `src/views/console-chrome.tsx`,
   `src/lib/{cn,format,format-date,period,color,host,preferences,csv,safe-markdown}.ts`, `src/lib/assistant/prompt.ts`,
   `app/icon.ts`, `scripts/`, `tests/setup.ts`, `vitest.config.ts`, `postcss.config.mjs`, `eslint.config.ts`. The
   components read the product's name and nav from `src/app.config.ts`, and `AppShell` loads the assistant panel on
   demand, so the panel's prompt types come along even when the assistant stays off. Not the design system: no `app/system/`, `src/system/`,
   `docs/`, `decisions/` or card specifications. They get a dashboard, not a copy of Meridian. Routes may live in
   `app/` or `src/app/`; the scripts find either.
   If their alias is not `@/* → src/*`, add it to `tsconfig.json`.
3. Merge dependencies from the template's `package.json` (`next`, `react`, `radix-ui`, `lucide-react`, `clsx`,
   `tailwind-merge`, `react-markdown`, `remark-gfm`, and `ai` and `@ai-sdk/react` for the panel `AppShell` loads; dev: `tailwindcss`, `@tailwindcss/postcss`, `typescript`,
   `vitest`, testing libraries, `eslint`, `eslint-config-next`) and the scripts (`tokens`, `check`, `contrast`, `lint`,
   `gate`, `audit`, `verify`, `brand`, `shot`; not `registry`, which belongs to the Atlas). Keep their versions where
   theirs are newer and compatible.
4. Replace their global stylesheet with the template's `app/globals.css` (it imports Tailwind, the tokens, base and
   motion). Their own utility classes that used Tailwind's default palette will stop rendering; that is expected, and
   step 6 replaces them.
5. Wrap their root layout like the template's `app/layout.tsx` (fonts, the pre-paint script, `Providers`) and their
   console routes in `AppShell` with the rail, `ShellTools` and the command palette (see `app/(dashboard)/layout.tsx`).
   The template's layout passes `ShellTools` the sample `ALERTS` and `DEMO_NOW` from `src/system/fixtures/`, which
   is not copied: pass their own alerts (an empty list until they have some) and their own clock.
   Write their routes into `nav` in `src/app.config.ts`. The Rail and the palette take `nav` as a prop, rendered from a
   client module (`src/views/console-chrome.tsx`), since each destination carries its icon component; if what a person
   may see depends on their role or scope, filter `nav` there from their session, and pass `workspace` and `scopes`
   to the Rail for a scope switcher.
6. Rebuild each page on `PageFrame`, `Stack` and `Row` with Meridian components, keeping their data fetching and
   business logic untouched. Do the busiest page first; when the person is there to look, show it to them before the rest.
7. Run `node scripts/brand.ts --existing` for their name and colour (`--existing` keeps their package name and has no
   Atlas to remove; never `--product`, which deletes their docs, README and decisions). It also appends Meridian's
   rules to their `AGENTS.md` once, so the team's next agent session keeps the dashboard on Meridian.
8. **Before the first `pnpm verify`, give it a fake API.** verify presses every control it finds on the built app,
   Approve, Revoke, Archive and Delete included. If their pages call a live backend, those presses change it. Write
   `scripts/fake-api.ts`: a server on `--port 0` that answers every route the pages call with typed fixtures (writes
   answer success and are forgotten) and prints `listening on <url>`. Name it and the environment variable their app
   reads its API address from in `scripts/verify.config.ts` (`fakeApi: { script, env }`): verify starts it first and
   builds and serves the app against it. Point the build at it, not only the server: an address read in
   `next.config` rewrites is baked in at build time. If they cannot fake the API yet, do not run `pnpm verify`; run the
   audit alone (`node scripts/audit.ts --base <url>`), which reads and never presses.
9. List their detail pages worth seeing (a normal record, a failed one, a missing one) in `detailRoutes` in
   `scripts/verify.config.ts`, with ids from the fake API's fixtures, then run `pnpm verify` until it passes.

Without the assistant, verify skips its walk-through on its own (it runs only when `app/api/assistant/route.ts`
exists).

## Adding the assistant

The panel (`src/components/patterns/assistant/`) already came with `src/components/`, and `AppShell` mounts it when
`app/(dashboard)/layout.tsx` passes `assistant`. A product that adopts the assistant also brings
`app/api/assistant/route.ts`, the rest of `src/lib/assistant/`, `src/lib/collection.ts` and `src/data/collections.ts`;
add `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible` and `zod` to the dependencies. Point `src/data/collections.ts` at their data, put their
sign-in check in the layout, in the route and in every server action, and set `ASSISTANT_PROVIDER`, `ASSISTANT_API_KEY` and `ASSISTANT_MODEL`
(plus `ASSISTANT_BASE_URL` for `openai-compatible`): it stays off until they are set. The "Show the assistant" switch is
in `src/views/settings.tsx`.

## Route A2: a static HTML page (data fetched as JSON)

The simplest case. Create a new Meridian project (SKILL.md steps 3 and 4, with `--product`) and point a module in
`src/data/` at the same JSON the page fetched today (read the file at build time, or fetch it in a server component).
Rebuild each section of the page as a Meridian page or card; the old page can stay where it is until they switch.

## Route B: another React stack (Vite, Create React App, Remix, Astro islands)

Create a new Meridian project next to theirs (SKILL.md steps 3 and 4), then port into it: their routes become pages,
their data hooks or fetch calls move into `src/data/` (as server functions or client hooks), their domain types come
along unchanged. Keep their old app running until the new one passes `pnpm verify` and they have looked at it.

## Route C: not React (Vue, Svelte, Angular, server templates)

Meridian's components are React, so the honest options are:

- **A new Meridian project** for the dashboard, talking to their existing backend (usually the best result), or
- **Tokens only**: copy `src/styles/tokens.css` (plain CSS custom properties, framework-agnostic) and rebuild their
  components against those roles by hand, following the card specifications in `src/components/*/*/README.md`. Tell
  them `pnpm verify` cannot validate a non-React app; run the contrast gate on the tokens and audit their pages with
  `node scripts/audit.ts --base <their dev server URL> --routes <their routes>` from a Meridian checkout.

Ask which they prefer when it is not obvious; recommend the new project.

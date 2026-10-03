# Bringing Meridian into an existing frontend

When the person already has a frontend and wants it to look and behave like Meridian, choose the route by what is there.
Tell them which route you chose and why, in one sentence, before starting.

## Route A: Next.js (App Router) with React 18+ (the common case)

Migrate in place, page by page, keeping their data layer.

1. Fetch the template into a temporary folder:
   `git clone --depth 1 https://github.com/zhixuan312/zz-meridian.git /tmp/meridian`
2. Copy the parts a dashboard is built from into their project (merge, never overwrite their own files of the same
   name without reading them): `tokens/`, `src/styles/`, `src/components/` without the `README.md` and `preview.tsx`
   files, `src/lib/{cn,format,format-date,period,color,host,preferences,csv}.ts`, `app/icon.ts`, `scripts/`,
   `tests/setup.ts`, `vitest.config.ts`, `postcss.config.mjs`. Not the design system: no `app/system/`, `src/system/`,
   `docs/`, `decisions/` or card specifications. They get a dashboard, not a copy of Meridian. Routes may live in
   `app/` or `src/app/`; the scripts find either.
   If their alias is not `@/* → src/*`, add it to `tsconfig.json`.
3. Merge dependencies from the template's `package.json` (`next`, `react`, `radix-ui`, `lucide-react`, `clsx`,
   `tailwind-merge`, `react-markdown`, `remark-gfm`; dev: `tailwindcss`, `@tailwindcss/postcss`, `typescript`,
   `vitest`, testing libraries) and the scripts (`tokens`, `registry`, `check`, `contrast`, `gate`, `audit`, `verify`,
   `brand`, `shot`). Keep their versions where theirs are newer and compatible.
4. Replace their global stylesheet with the template's `app/globals.css` (it imports Tailwind, the tokens, base and
   motion). Their own utility classes that used Tailwind's default palette will stop rendering; that is expected, and
   step 6 replaces them.
5. Wrap their root layout like the template's `app/layout.tsx` (fonts, the pre-paint script, `Providers`) and their
   console routes in `AppShell` with `Rail`, `ShellTools` and `CommandPalette` (see `app/(dashboard)/layout.tsx`).
   Write their routes into `nav` in `src/app.config.ts`.
6. Rebuild each page on `PageFrame`, `Stack` and `Row` with Meridian components, keeping their data fetching and
   business logic untouched. Do the busiest page first, show it to the person, then the rest.
7. Run `node scripts/brand.ts` for their name and colour, then `pnpm verify` until it passes.

## Adding the assistant

A product that adopts the assistant also brings: `app/api/assistant/route.ts`, `src/lib/assistant/`,
`src/lib/collection.ts`, `src/data/collections.ts`, and the panel (`src/components/patterns/assistant/`, mounted by
`AppShell`, with `assistant` passed from `app/(dashboard)/layout.tsx`); add `ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`,
`@ai-sdk/openai-compatible` and `zod` to the dependencies. Point `src/data/collections.ts` at their data, put their
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

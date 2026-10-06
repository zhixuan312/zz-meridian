<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working in Meridian

Meridian is a dashboard design system and template: read `README.md` (what it is), `CONTRIBUTING.md` (the card contract) and `docs/surfaces.md` (three surfaces, two operators) before changing anything.

- **Build up, never sideways.** A page arranges patterns; a pattern composes components; a value is a token. Never write a colour, size or shadow that is not a token; `node scripts/check.ts` fails on literal colours and on Tailwind utilities outside Meridian's reset scales (they render nothing).
- **Tokens** live in `tokens/*.tokens.json` (DTCG 2025.10). `src/styles/tokens.css` and `src/styles/theme.css` are generated: run `pnpm tokens`, never edit them.
- **A card** is a folder with `index.tsx`, `preview.tsx` (every state, static, labelled) and `README.md` (the anatomy in CONTRIBUTING). After adding one, run `pnpm registry`.
- **Before finishing**: `pnpm verify` (the gate once, one build, the size checks and a smoke of up to three routes; it ends with a coverage line that says what ran and what did not). For a change to shared components, the shell or data, run `pnpm verify --full`: every route, every control pressed and every link followed, the keyboard walk, the assistant and the live data. Then look at `node scripts/shot.ts <route> --width 1440,390 --theme dark,light`. `pnpm gate` alone is the fast loop while editing.
- **Agents in the product** read freely and write only through a Proposal; mark agent work with the Agent mark and "via". See `docs/agents.md`.
- Everything written to the repository is in English.

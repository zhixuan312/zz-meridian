# Changelog

Every release of ZZ Meridian, newest first. Versions follow semver: a removed or renamed token, prop or card is major; a new card, token or variant is minor; a corrected value is a patch. Each entry says what breaks and what to do instead.

## [Unreleased]

From two field reports of bringing Meridian into existing projects (issues #1 and #2), and the console's own assistant.

### Added

- **The assistant** (`docs/assistant.md`, decision 0008): a panel on every console page that answers about the page and finds, adds, changes and removes records through Proposals the person approves. Off until `ASSISTANT_PROVIDER`, `ASSISTANT_API_KEY` and `ASSISTANT_MODEL` are set (and `ASSISTANT_BASE_URL` for `openai-compatible`), read on every request; Anthropic or any OpenAI-compatible provider through the AI SDK. Approvals are signed and each runs once, a removal is proposed with the critical tone, the route refuses a malformed or oversized thread, the thread is kept in the browser (the last 100 messages), and Settings has "Show the assistant". `.env.example` lists the variables.
- **Collections** (`src/lib/collection.ts`, `src/data/collections.ts`): one description of each set of records, read by the pages, changed by their server actions and offered to the assistant as tools; `pageOnly` and `hidden` keep what only a page may do or see out of every tool. A **Members** page (invite, suspend, reactivate, remove) shows it; API keys and Requests read and change through it.
- `check.ts` rules: a fixture a collection serves is read only through `src/data/collections.ts`, and every export of `src/lib` and `src/data` is imported by a file a product keeps.
- `scripts/fake-llm.ts` and `scripts/assistant.ts`: `pnpm verify` runs the assistant off, then on against a fake OpenAI-compatible model, and checks that the key reaches no page, payload, script or response.
- `brand.ts --product` writes an Assistant section (the variables, `src/data/collections.ts`, the sign-in check in the dashboard layout, in `app/api/assistant/route.ts` and in every server action) into the product README and AGENTS.md. The skill covers the assistant.
- **`brand.ts --product`**: the person gets their dashboard, not the design system. It removes the Atlas, card and page specifications, previews, `docs/`, `decisions/`, the changelog and the skill, and rewrites the README and AGENTS.md. The skill uses it by default.
- **Timeline** (`charts/timeline`): bars from a start to an end day, grouped by workstream, on month hairlines with a today line, an optional monthly heat row and a screen-reader table.
- `Freshness run` for batch results ("Run 12 Mar 2026", never stale); the `compact` / `cost-compact` format names.
- `MetricTile` takes a format name (so a server page can render it) and a word value for a categorical state.
- `Rail` takes `user` and `signOut`, and shows Workspace settings only when the navigation has `/settings`.

### Fixed

- The audit no longer crashes on a labelled control; it measures a labelled checkbox with its label.
- `Field` no longer passes `required` to the control, so the browser does not silently block a submit.
- `--no-atlas` matches `/system` exactly, drops empty nav groups, and removes the footer link, the Atlas modules, their packages, their build tracing and stale route types.
- `Input` is a client component; Tabs pass the audit (the count pill's contrast, and TabPanel's focus ring).
- Formatters pin `en-US` and show a currency's narrow symbol (SGD as $).
- `DetailHead` breaks only mono names anywhere; the rail marks only the longest matching item; the tests follow `app.currency`.
- The preferences key derives from the product's name; the tab icon's tokens are traced for deployment.
- `check.ts` walks every source file under `app/` (or `src/app/`) and `src/`, and no longer needs CONTRIBUTING.md; route discovery skips `api/`.

### Changed

- Node 22.18 or newer and pnpm 10 or newer; the `packageManager` pin is gone. `pnpm verify` runs the audit and the presses side by side.

### Breaking

- Agents may now propose a removal: `docs/agents.md`, `docs/surfaces.md` and the Proposal, Settings and Keys specifications no longer say a destructive change is never proposed. Keep an operation away from every agent with `pageOnly`.
- `formatTime`, `formatIsoDate` and `periodCutoff` are removed (use `formatDateTime`, `Intl.DateTimeFormat` or `PERIOD_DAYS`); `readPage`, `AssistantConfig`, `PAGE_TEXT_LIMIT`, `luminance`, `DISPLAY_TIMEZONE`, `formatCostCompact`, `formatCount`, `PROTOCOL`, `DEFAULT_PERIOD`, `THEMES`, `DENSITIES` and `ThemePref` are no longer exported, and `Density` is `Preferences['density']`.
- The Keys view no longer keeps its own rows: it takes them and its actions from the page.
- `NumberFormat` gains `compact` and `cost-compact`; `CompositionBar`'s `neutral-soft` is now `neutral-ink`.
- `Table` `hideBelow` reads the table's own width (from 0.1.0's later commits).
- Product pages that relied on Field's native `required` validation should validate in the page, which already shows `error`.

## [0.1.0] · 2026-10-03

The first release: a dashboard design system and a working template, built on the Zandro pattern and register.

### Added

- **Tokens**: DTCG 2025.10 files for the palette, core, two themes, four accent presets (indigo, cobalt, jade, graphite) and a compact density, with a resolver. `scripts/tokens.ts` generates the CSS and a Tailwind v4 bridge that resets Tailwind's own scales.
- **Base**: the lit ground (the accent's light, painted once), text roles from display to mono kicker, motion (arrive, answer, float), the shell with its condensing masthead, the embed surface and host bridge.
- **Components**: actions, inputs, display, navigation, feedback and data parts, each with a specification and a preview of every state.
- **Patterns**: the rail, command palette, featured metric, metric tile, the Meridian charts (trend, sparkline, bar list, composition, columns, heatmap, uptime), data table, filter bar, status list, form section, activity feed, and the agentic patterns: embed frame, Ask about, Proposal.
- **Pages**: Overview, Requests, Request, Analytics, Health, Customers, API keys, Settings, Sign in, not found, error and loading; MCP App views for the overview, requests, health and an agent proposal.
- **Design Atlas** at `/system`: the front door, every card live in any theme, accent and density, pages on the console, a phone and a simulated MCP host.
- **Quiet light** (decision 0006): translucent surfaces that let the ground's light through; the glow in the frame (a lit edge and a faint halo on the featured card, a lit edge that fades in under the pointer on interactive cards), a whisper of light under chart lines; the primary action turning toward violet; one solid accent phrase per screen; no grain.
- **Tables**: columns spaced 32px apart with the card's padding on the outer edges; a text column after a right-aligned number gets 16px more; the lead column takes about a third and the rest of the slack is spread by content; a fixed-width method chip lines routes up.
- **The `zz-meridian` skill** (`skills/zz-meridian/`): a standalone Claude Code skill that builds a new dashboard from this template, or brings Meridian into an existing frontend, from a plain description, and validates it.
- **`pnpm brand`** renames and rebrands a copy in place; a brand hue becomes an accent preset that holds contrast in every theme. **`pnpm verify`** runs the gate, a production build and the browser audit of every discovered route against the built app.
- **Gates**: contrast in every theme and accent with the chart palette's colour-vision checks, the registry, specification consistency, types and tests; a browser audit of every page.

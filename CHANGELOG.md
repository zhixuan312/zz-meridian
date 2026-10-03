# Changelog

Every release of ZZ Meridian, newest first. Versions follow semver: a removed or renamed token, prop or card is major; a new card, token or variant is minor; a corrected value is a patch. Each entry says what breaks and what to do instead.

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

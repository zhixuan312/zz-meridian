# 0001 · A React system, with the repository as the source of truth

Date: 2026-10-03 · Status: accepted

## Context

Meridian follows the pattern of the design system that came before it: layered cards, each specified before it is built, tokens in DTCG, gates that compute what can be computed. That system ships framework-agnostic CSS with HTML previews, because it is built for several platforms. Every dashboard Meridian serves is built with Next.js, React and Tailwind, so a CSS-only system would be ported by hand into every new dashboard.

## Decision

- The system is a Next.js 16, React 19, Tailwind v4 and TypeScript project. Layers 1 to 3 are React components; each card's folder holds the component, its `README.md` specification and its `preview.tsx`.
- DTCG token files are the source of every value; `scripts/tokens.ts` generates the CSS custom properties and the Tailwind bridge, which resets Tailwind's own scales.
- The Design Atlas is a route of the same app (`/system`): it renders the real components, so a preview cannot drift from the implementation.
- One repository, no packages: a new dashboard is a copy of this one, not a dependency on it.

## Consequences

- A new dashboard starts running, with every part already in the same language.
- A product on another framework reads the specifications and the tokens, and ports the components; the CSS custom properties work anywhere.
- Changes reach existing dashboards by copying, deliberately, not by a version bump.

# 0004 · Three surfaces, two operators

Date: 2026-10-03 · Status: accepted

## Context

Dashboards are no longer only read in a browser window. They are read on phones, and, through MCP Apps (ratified 2026-01-26), inside AI chat clients, beside an agent that can call the product's tools.

## Decision

- Every page is designed for three surfaces: the console, mobile (under 1024px) and the embed (an MCP App, inline or fullscreen). `docs/surfaces.md` lists, card by card, what changes on each.
- The embed is a guest: transparent planes, the host's neutrals through a generated token bridge, Meridian's accent and data colours kept.
- Two operators share each view: people, and agents acting through tools. Five rules govern the second: addressable, legible, consent, provenance, handoff (`docs/agents.md`).
- The host bridge is a small dependency-free module (`src/lib/host.ts`); a product may swap in the official SDK without touching a component.

## Consequences

- Every card states its Surfaces and its Agents behaviour in its specification.
- Agent affordances render only where an agent is listening, so the console never shows a dead control.

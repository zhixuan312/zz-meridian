# 0002 · The register: dark first, lit, one protagonist

Date: 2026-10-03 · Status: accepted

## Context

The first rendering of Meridian used a neutral light canvas, a 28px page title and four equal tiles: tidy, correct, and indistinguishable from any dashboard of the last decade. The owner rejected it as dated and asked for the register of the earlier design system (0001), which reads at a glance as a current, premium product.

## Decision

- Dark is the default theme, written on `:root`; light follows the operating system or an explicit choice.
- The ground is lit: a radial light in the accent from the top right, a trace of teal from the top left. Cards are hairlines with a lit top edge. (Amended by 0006: no grain, translucent surfaces, the glow in the frame.)
- Geist and Geist Mono. A 52px page title, a 76px hero figure, 40px metric figures, mono uppercase kickers.
- One protagonist per view: the featured card carries the accent's light; every other card is the supporting cast.
- An electric indigo accent by default.

## Consequences

- The system shares that family resemblance; its own identity is the Meridian cursor, the three surfaces and the agentic layer.
- Every component is checked in both themes, as before; the dark theme is the one quoted in specifications.

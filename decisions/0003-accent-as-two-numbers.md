# 0003 · An accent is two numbers

Date: 2026-10-03 · Status: accepted

## Context

A template is rebranded more often than it is redesigned. Rebranding by swapping hex values breaks contrast silently: a lighter brand blue turns every white button label below 4.5:1.

## Decision

- An accent preset sets only `accent-h` (OKLCH hue) and `accent-c` (chroma). The theme owns lightness and opacity (`accent-l`, `accent-l-ink`, `accent-a-tint`…), so every preset sits at the lightness that holds contrast in that theme.
- The roles (`accent`, `accent-ink`, `accent-tint`, the glows) are `oklch()` expressions of those variables, declared again on every `[data-theme]` and `[data-accent]` scope, because a custom property resolves its `var()` where it is declared.
- A preset may override a lightness where its hue is unusually luminous (jade's dark fill) or has no hue (graphite).
- `scripts/contrast.ts` checks every pair in every theme with every preset.

## Consequences

- Four presets ship (indigo, cobalt, jade, graphite); a fifth is a small JSON file and a gate run.
- Any subtree can carry its own accent (a customer's workspace, a preview).

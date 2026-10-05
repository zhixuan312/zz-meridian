# 0006 · Quiet light: the glow lives in the frame, not in the data

Date: 2026-10-03 · Status: accepted · Amends 0002

## Context

After 0002, the owner asked for the overall feeling to be more refined and less loud: premium, modern and elegant without showing off. They pointed to the calm of the earlier system — soft, diffuse light everywhere and nothing loud anywhere: low-alpha orbs on the ground, translucent glass cards that let the light through, a faint halo around a card and a gradient border that appears only under the pointer, plain 2px chart lines, a gentle two-stop gradient on the one primary action, and gradient text only on the hero phrase. The first Meridian line glow read as a smudge on white.

## Decision

- **The glow moves to the frame.** Chart lines carry only a whisper of light (`chart-glow-a` 0.24 dark, 0.14 light, blur 4 and 3px, set 2px below the line). The featured card carries a lit edge (`edge-lit`: a masked gradient hairline, brightest top right, where the light comes from) and a faint halo (`shadow-halo`). An interactive card's lit edge fades in under the pointer and never loops.
- **Surfaces are a wash of light**: `surface` is 4% white on dark and 74% white on light, so the ground's light shows through every card. No backdrop blur on cards; the ground is smooth.
- **A third, quieter light** below the page, a few degrees toward violet.
- **The primary action** is the accent turning 16 degrees toward violet, top to bottom (`accent-fill`); its hover darkens, so white text keeps its contrast.
- **One accent phrase** per screen, in solid `accent-ink`. (Amended 2026-10-03: gradient text was dropped. An independent review read it as dated, it spent the accent on decoration, and its contrast could not be measured as rendered.)
- **No grain.** A repeated texture under translucent cards stalled rasterisation on high-density screens (measured: a 2x capture timed out past 30s; without the grain it took under 1s), and a blend mode on a full-screen layer left charts painted stale. The light alone carries the depth.

## Consequences

- Every card picks up the ground's light; contrast is still computed by compositing the surface over the ground (`node scripts/contrast.ts`).
- Nothing in the interface loops except a live dot and a skeleton.

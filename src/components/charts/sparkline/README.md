# Sparkline

A sparkline shows the shape of a trend beside the figure it qualifies, with no axes and no values of its own.

Status: beta

## Anatomy

1. **Line**: 1.5px, round joins, drawn in real pixels across the container's full width.
2. **Area**: the line's colour fading from 18% to 0.
3. **Day mark** (on a Meridian): a 1px `ink-3` hairline at 45% and a 3px dot ringed in `surface`.

## Variants

| Colour | Use |
|---|---|
| `accent` | The tile that carries the finding (an `emphasis` Metric tile) |
| `neutral` | Every other tile and every table cell (`chart-neutral-strong`) |
| Slot 1 to 6 | When the sparkline stands for a categorical series shown elsewhere in that colour |

## Sizes

Height 24px in a table cell, 32 to 44px in a tile; the width is the container's. The scale fits the data's own range (minimum to maximum), because a sparkline shows shape, not magnitude.

## States

| State | Spec |
|---|---|
| Arriving | Draws and reveals over `dur-grow` with `ease-out`. |
| Day pointed at | The hairline and dot at that day. |
| Too few points | Under two values, render nothing and let the figure stand alone. |

## Behaviour

None: a sparkline is not interactive. It follows the page's Meridian but never sets it.

## Surfaces

Same on every surface: it scales with its container.

## Agents

Not applicable: it repeats a series the view already shares.

## Accessibility

Decorative (`aria-hidden`): the figure beside it and the page's charts carry the numbers. The neutral line holds 3.98:1 dark and 3.64:1 light on `surface`.

## Content

None. A sparkline never carries a label, a value or an axis.

## Do and do not

- Do place it beside or under its figure, never instead of it.
- Do not compare two sparklines' heights: each has its own scale.

## Implementation

```tsx
import { Sparkline } from '@/components/charts/sparkline';

<Sparkline values={series.map((d) => d.p95)} color="neutral" height={40} />
```

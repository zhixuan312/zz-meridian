# Sparkline

A sparkline shows the shape of a trend beside the figure it qualifies, with no axes and no values of its own.

Status: beta

## Anatomy

1. **Line**: 1.5px, round joins, drawn in real pixels across the container's full width.
2. **Area**: the line's colour fading from 21% (10% on light) to 0.
3. **Day mark** (on a Meridian, when the values are the page's): a 1px `ink-3` hairline at 45% and a 3px dot ringed in `surface`.

## Variants

| Colour | Use |
|---|---|
| `accent` | The tile that carries the finding (an `emphasis` Metric tile) |
| `neutral` | Every other tile and every table cell (`chart-neutral-strong`) |
| Slot 1 to 6 | When the sparkline stands for a categorical series shown elsewhere in that colour |

## Sizes

Height 24px in a table cell, 28px in a compact Metric tile, 32 to 44px in a tile; the width is the container's. The scale fits the data's own range (minimum to maximum), because a sparkline shows shape, not magnitude.

## States

| State | Spec |
|---|---|
| Arriving | Draws and reveals over `dur-grow` with `ease-out`. |
| Day pointed at | The hairline and dot at that day, when the line has one value for each of the Meridian's dates. |
| Values that are not the page's | With any other number of values, no hairline and no dot: the line alone, whatever the page points at. |
| Too few points | Under two values, render nothing and let the figure stand alone. |

## Behaviour

None: a sparkline is not interactive. It follows the page's Meridian but never sets it.

It follows only when its values are the page's: one for each of the Meridian's dates, which is the rule a chart joins the Meridian by. The cursor is a position in the page's list of dates, so on a line of any other length it would mark a different day: a customer's 14 days on a page of 30 draw no cursor. Outside a Meridian there is no cursor to draw.

## Surfaces

Same on every surface: it scales with its container.

## Agents

Not applicable: it repeats a series the view already shares.

## Accessibility

Decorative (`aria-hidden`): the figure beside it and the page's charts carry the numbers. The neutral line holds 3.96:1 dark and 3.52:1 light on `surface`.

## Content

None. A sparkline never carries a label, a value or an axis.

## Do and do not

- Do place it beside or under its figure, never instead of it.
- Do not compare two sparklines' heights: each has its own scale.
- Do not pad or cut a series to the page's length to make the mark appear: a line that marks a day must hold that day at that position.

## Implementation

```tsx
import { Sparkline } from '@/components/charts/sparkline';

<Sparkline values={series.map((d) => d.p95)} color="neutral" height={40} />
```

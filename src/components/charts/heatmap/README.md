# Heatmap

A heatmap shows when load comes, as a grid of weekday by hour where a darker cell means more.

Status: beta

## Anatomy

1. **Hour labels**: `text-2xs` `ink-3` across the top, every six hours.
2. **Day labels**: Monday first, `text-2xs` `ink-3`, in a 40px column.
3. **Cells**: 24 (or 8 grouped) per row, 24px tall (28px from 640px), `radius-xs`, 2px apart.
4. **Legend**: "Less", the six steps, "More", right-aligned under the grid.
5. **Tooltip**: on hover, the cell's value, unit, day and hour range in UTC, on `surface-inverse`.
6. **Screen-reader table**: every day and hour.

## Variants

| Variant | When |
|---|---|
| By hour | 24 columns, when the heatmap is at least 560px wide |
| Grouped | Hours in threes, 8 columns, under 560px, so a cell stays large enough to point at |

## Sizes

The grid takes its container's width. The colour ramp has six steps: an empty `fill-track`, then the accent mixed into `surface` at 18, 34, 52, 74 and 100%. A cell's step is its share of the busiest cell.

## States

| State | Spec |
|---|---|
| Hover | The cell gains a 2px `ink` ring with a 1px `surface` offset; the tooltip shows. |
| Empty | All zeros: every cell is the empty track; say so in the card. |

## Behaviour

Pointer hover only; the table carries the same numbers for keyboard and screen readers.

## Surfaces

- **Console**: by hour.
- **Mobile**: grouped.
- **Embed**: fullscreen only; inline views link to it with Expand.

## Agents

The view shares its busiest windows as structured context (`useShareView`), for example `{ busiest: 'Thu 14:00–15:00 UTC' }`.

## Accessibility

A labelled `figure` whose `sr-only` table holds every value. The ramp is one hue in monotone steps (sequential encoding), never a rainbow, and the legend explains direction in words.

## Content

Hours are UTC (the product's reporting zone) and the tooltip says so.

## Do and do not

- Do use it for a recurring rhythm (weekday by hour, day by week).
- Do not use a diverging or categorical palette here.

## Implementation

```tsx
import { Heatmap } from '@/components/charts/heatmap';

<Heatmap label="Requests by weekday and hour" values={demoHeatmap()} format={formatCompact} />
```

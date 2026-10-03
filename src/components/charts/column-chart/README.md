# Column chart

A column chart compares counts side by side, one column per category or per day, with one column highlighted.

Status: beta

## Anatomy

1. **Gridlines and y labels**: three "nice" ticks from zero, `chart-grid` lines, `text-2xs` `ink-3` labels in a gutter sized to the longest.
2. **Columns**: equal width, 2px apart, rounded 4px at the top, growing from the baseline; the population in `chart-neutral`, the highlighted column in `accent`.
3. **Value label**: on hover, the value above the column on `surface-inverse`.
4. **X labels**: `text-2xs` `ink-3`, as many as fit without colliding, counted back from the last column; the hovered column's label always shows.
5. **Screen-reader table**: every column's label and value.

## Variants

| Variant | Use |
|---|---|
| Categories | One column per category, sorted by value |
| Days | One column per day; today or the day in question highlighted |
| On the Meridian | Given `dates`, the columns share the page's cursor: hovering a column points every chart at that day, and the pointed day is highlighted |

## Sizes

Default 200px tall; 120 to 160px as a secondary chart. Columns share the width.

## States

| State | Spec |
|---|---|
| Arriving | Columns grow from the baseline over `dur-grow`, 12ms apart. |
| Hover | Neutral columns step up to `chart-neutral-strong`; the hovered one takes the accent and its value label. |
| Empty | Render the card's Empty state. |

## Behaviour

Pointer hover or a tap selects a column; leaving clears it. With `dates`, the selection is the page's Meridian index.

## Surfaces

Same on every surface; labels thin out as the width shrinks.

## Agents

The view shares the highlighted column and the day pointed at through `useShareView`; an agent reads values from the table.

## Accessibility

A labelled `figure` with an `sr-only` table. The accent column holds 3.73:1 dark and 5.91:1 light on `surface`; neutral columns are the population and are not meant to be told apart by colour.

## Content

Category labels are short (drop shared prefixes like `/v1/`); day labels are "27 Sept".

## Do and do not

- Do highlight at most one column.
- Do not colour columns by value; their height already shows it.

## Implementation

```tsx
import { ColumnChart } from '@/components/charts/column-chart';

<ColumnChart label="Errors per day" dates={dates} format={formatCompact}
  columns={series.map((d) => ({ key: d.date, label: formatDate(d.date), value: d.errors }))} />
```

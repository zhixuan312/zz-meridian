# Trend chart

A trend chart shows how one or more measures changed over time, on one shared axis, and joins the page's Meridian.

Status: beta

## Anatomy

1. **Plot**: horizontal gridlines in `chart-grid`, the baseline in `chart-axis`, 1px, crisp.
2. **Y axis**: 3 or 4 "nice" ticks from zero, labels `text-2xs` `ink-3`, tabular, right-aligned in a gutter sized to the longest label. Axis labels drop cents and exact digits (`$12`, `1.2M`); the tooltip and table carry them.
3. **X axis**: dates, `text-2xs` `ink-3`, one label per 92px, counted back from today so the last day is always labelled.
4. **Series**: monotone curves that never overshoot their data.
5. **Legend**: above the plot when there are two or more series: a 12px line swatch (dashed for `dashed`) and the label in `ink-2`.
6. **Cursor, dots and tooltip**: from the Meridian.
7. **Screen-reader table**: every day and series, formatted.

## Variants

| Kind | Use | Mark |
|---|---|---|
| `area` | The series the chart is about. At most one per chart. | 2px line, an area fading from 30% to 0 of its colour, and a 6px blurred glow at 40% under the line |
| `line` | A peer series of equal standing | 2px line |
| `dashed` | A reference: the previous period, a target, a budget | 1.5px dashed line in `chart-neutral-strong` |
| `stacked` (chart prop) | The series are the parts of one whole, such as requests by region, or calls split into attributed, unattributed and refused: the top edge is the total. Parts of similar size; a part under a few percent is invisible as a band, so give it a chart or a tile of its own | Bands one on another, the first at the bottom, in one hue: the accent, deepest at the bottom (72%) and paler upward (to 36%), a 1px `surface` hairline between them, the whole stack fading toward zero; the total is the 2px accent line with its glow, as on an `area`. A series given its own `color` keeps it. The readout lists the bands top to bottom and the total; the y-axis is scaled to the total |

Colour: `accent` for the series the page is about; categorical slots 1 to 6 in order for peers; never a status colour unless the series means a status.

## Sizes

| Height | Gridlines | Use |
|---|---|---|
| `fill` (at least 220px) | 4 | Inside the Featured metric and any card whose row is taller than the chart |
| 248px (default) | 4 | A chart card |
| 160 to 200px | 3 | A secondary chart; phones; an inline embed |

## States

| State | Spec |
|---|---|
| Arriving | The line draws left to right and the area reveals over `dur-grow` 820ms `ease-out`; the glow and dashed lines fade in. |
| Rest, pointing, keyboard | See Meridian. |
| Gap | A `null` value breaks the line: each run of measured days is its own segment. A gap is never drawn as zero. |
| Empty | No series: render the card's Empty state instead of an empty plot. |
| Loading | A Skeleton the chart's height. |

## Behaviour

Points are days by default: the axis reads "03 Oct" and the readout the full date. For points that are not days, pass `tick` (`(date) => string`), used by both: hours for a 24-hour period ("14:00"), weeks for a long one ("Week of 3 Mar").

Pointer, touch and keys as in Meridian. The chart redraws in real pixels when its container resizes, so strokes are never stretched.

## Surfaces

- **Console**: 248px or `fill`; date labels every 92px (six to eight across).
- **Mobile**: 160 to 200px; three or four date labels; the tooltip flips sides past 62% of the plot.
- **Embed**: 160 to 168px inline; the console height in fullscreen.

## Agents

The view shares what the chart shows through `useShareView` (the period and the day pointed at). An agent reads exact values from the screen-reader table or the shared structured context, never from the drawing.

## Accessibility

- Focusable `role="img"` labelled with what it shows and how to read a day; the `sr-only` table holds every value.
- Marks hold 3:1 on `surface`: slots 1 to 6 from 5.1:1 to 6.2:1 dark, 3.2:1 to 5.2:1 light (slot 5 is labelled everywhere because it falls under 3:1 on light). Axis labels `ink-3` 6.43:1 dark, 5.31:1 light.
- The categorical order passes colour-vision checks: worst adjacent CVD separation 8.7 dark, 10.2 light (`node scripts/contrast.ts`).
- Identity is never colour alone: a legend names every series and the tooltip repeats the label beside each value.

## Content

- `label` says what is measured and per what: "Requests per day", "Latency p95 per day".
- Series labels are short nouns: "This period", "Previous period", "p95".

## Do and do not

- Do show two measures of different size as two charts on one Meridian.
- Do not add a second y-axis, ever.
- Do not stack more than one area; use lines for peers.
- Do not put a number on every point.

## Implementation

```tsx
import { TrendChart } from '@/components/charts/trend-chart';

<TrendChart
  label="Requests per day"
  dates={series.map((d) => d.date)}
  height="fill"
  series={[
    { key: 'now', label: 'This period', values: series.map((d) => d.requests), kind: 'area' },
    { key: 'prev', label: 'Previous period', values: previous.map((d) => d.requests), kind: 'dashed' },
  ]}
/>
```

Props: `dates`, `series` (`key`, `label`, `values`, `color`, `kind`), `format` (`count` | `cost` | `duration` | `percent`), `height` (number or `fill`), `label`, `legend` (defaults to two or more series).

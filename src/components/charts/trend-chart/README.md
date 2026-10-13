# Trend chart

A trend chart shows how one or more measures changed over time, on one shared axis, and joins the page's Meridian.

Status: beta

## Anatomy

1. **Plot**: horizontal gridlines in `chart-grid`, the baseline in `chart-axis`, 1px, crisp.
2. **Y axis**: 3 or 4 "nice" ticks from zero, labels `text-2xs` `ink-3`, tabular, right-aligned in a gutter sized to the longest label. Axis labels drop cents and exact digits (`$12`, `1.2M`), and money from $10,000 reads at a glance (`$25K`, `$5.0B`) so a large scale does not widen the gutter; the tooltip and table carry the exact amounts.
3. **X axis**: dates, `text-2xs` `ink-3`, one label per 92px, counted back from today so the last day is always labelled.
4. **Series**: monotone curves that never overshoot their data.
5. **Running stretch** (with `running`): the last stretch of the same curve, into a point that is not over yet, 1.5px and dashed.
6. **Legend**: above the plot when there are two or more series: a 12px line swatch (dashed for `dashed`) and the label in `ink-2`.
7. **Cursor, dots and tooltip**: from the Meridian. The readout measures its own width and stays inside the chart; long labels wrap and values remain readable.
8. **Screen-reader table**: every day and series, formatted; the row of a running point says "so far".

## Variants

| Kind | Use | Mark |
|---|---|---|
| `area` | The series the chart is about. At most one per chart. | 2px line, an area fading from 30% to 0 of its colour, and a 6px blurred glow at 40% under the line |
| `line` | A peer series of equal standing | 2px line |
| `dashed` | A reference: the previous period, a target, a budget | 1.5px dashed line in `chart-neutral-strong` |
| `stacked` (chart prop) | The series are the parts of one whole, such as requests by region, or calls split into attributed, unattributed and refused: the top edge is the total. Parts of similar size; a part under a few percent is invisible as a band, so give it a chart or a tile of its own | Bands one on another, the first at the bottom, in one hue: the accent, deepest at the bottom and paler upward, between the theme's `chart-stack-hi` and `chart-stack-lo` (dark 92% to 20%, light 78% to 36%), a 1px `surface` hairline between them; on light the stack fades toward zero (`chart-stack-fade`); the total is the 2px accent line with its glow, as on an `area`. A series given its own `color` keeps it. The readout lists the bands top to bottom and the total; the y-axis is scaled to the total |

**Baseline** (`baseline: { value, label }`): what is usual, such as the period's median, drawn as a dashed hairline (`ink-3` at 60%, dash 3 4) under the data, with its label (`text-2xs` `ink-3`) at the right end on a 4px halo of `surface`, so it reads over the line. It fades in with the data and is named in the screen-reader table's caption ("Latency p95 per day. Median 296ms"). One per chart; the y-axis always reaches it.

**Running** (`running`): the last point is a period still in progress, such as today or the month not over yet. It is not a fact like the points before it, so nothing solid reaches it. Every `area` and `line` is drawn as far as the last complete point, and the stretch from there into the running point is a stroke of its own on the same curve: the series' colour, 1.5px, dash 3 4, round caps. No area is filled under that stretch and no glow lies under it, so the lit part of the chart is the part that is settled. A `dashed` series is a reference, a whole period already, and is drawn as ever. Stacked, the bands end at the last complete point and the total's line alone carries the dashed stretch, in the accent; pointing at the running point shows one dot, the total's. The readout says "so far" beside the date and the table's last row says it too; no other point does. The axis is still scaled to every value, the running one included.

Colour: `accent` for the series the page is about; categorical slots 1 to 6 in order for peers; never a status colour unless the series means a status.

**A mark takes the strong quiet; a swatch needs a floor, not just a neighbour.** `chart-neutral` (#D5D7E0 in light) is a *fill* — a track, a band behind a mark — and `chart-neutral-strong` is what a *mark* takes when it is the quiet one, because a mark's job is to be seen against the ground: measured in light, the strong variant is 3.19:1 while the fill is under 3:1 on any light ground, which is how seven bars in a share column came to render blank. A stacked part is the accent faded toward `--surface`, and *that* is a rule about areas that touch each other, where each step only has to differ from its neighbour — a legend swatch has to differ from the ground behind it, and nothing in the ramp's parameters knows that. So every stacked swatch is drawn on a 6px `ink-3` hairline (measured 4.66:1 light, 6.86:1 dark), which keeps the ramp's ordering readable instead of flattening it.

## Sizes

| Height | Gridlines | Use |
|---|---|---|
| `fill` (at least 220px) | 4 | Inside the Featured metric and any card whose row is taller than the chart |
| 248px (default) | 4 | A chart card |
| 160 to 200px | 3 | A secondary chart; phones; an inline embed |

## States

| State | Spec |
|---|---|
| Arriving | The line draws left to right and the area reveals over `dur-grow` 820ms `ease-out`; the glow and dashed lines fade in, the running stretch with them. |
| Rest, pointing, keyboard | See Meridian. The readout is bounded by the chart at every selected day, including the first and last. |
| Long text, extreme values | Labels wrap inside the readout. It is no wider than its chart, with `space-3` 12px side padding; the static specimen shows a long inference label and spend in billions. |
| Gap | A `null` value breaks the line: each run of measured days is its own segment. A gap is never drawn as zero. |
| Running | The last point is still in progress: a dashed stretch into it, nothing filled under it, "so far" in its readout and its row. With one point, with no value at the running point, or with a gap just before it, there is no stretch to dash and none is drawn; the row still says "so far". |
| Empty | No series: render the card's Empty state instead of an empty plot. |
| Loading | A Skeleton the chart's height. |

## Behaviour

Points are days by default: the axis reads "03 Oct" and the readout the full date. For points that are not days, pass `tick` (`(date) => string`), used by both: hours for a 24-hour period ("14:00"), weeks for a long one ("Week of 3 Mar").

Pointer, touch and keys as in Meridian. The chart redraws in real pixels when its container resizes, so strokes are never stretched.

## Surfaces

- **Console**: 248px or `fill`; date labels every 92px (six to eight across).
- **Mobile**: 160 to 200px; three or four date labels; the readout pins to the leading edge at the top of the plot, so it stays still while the finger moves between days.
- **Embed**: 160 to 168px inline; the console height in fullscreen.

## Agents

The view shares what the chart shows through `useShareView` (the period and the day pointed at). An agent reads exact values from the screen-reader table or the shared structured context, never from the drawing.

## Accessibility

- Focusable `role="img"` labelled with what it shows and how to read a day; the `sr-only` table holds every value. A running point is never told by its dashes alone: its row reads "2026-10-03, so far" and its readout says the same.
- Marks hold 3:1 on `surface`: slots 1 to 6 from 5.1:1 to 6.2:1 dark, 3.2:1 to 5.2:1 light (slot 5 is labelled everywhere because it falls under 3:1 on light). Axis labels `ink-3` 6.43:1 dark, 5.31:1 light.
- The deepest part of a stack, the one it stands on, holds 3:1 on `surface`: 3.30:1 dark, 3.61:1 light with the indigo accent, and never under 3.23:1 (jade, dark) in any theme and accent (`node scripts/contrast.ts --all`, "the deepest part of a stack"). The parts above it are told from their neighbours by the 1px `surface` hairline, and each is named in the legend and the readout.
- The categorical order passes colour-vision checks: worst adjacent CVD separation 8.7 dark, 10.2 light (`node scripts/contrast.ts`).
- Identity is never colour alone: a legend names every series and the tooltip repeats the label beside each value.

## Content

- `label` says what is measured and per what: "Requests per day", "Latency p95 per day".
- Series labels are short nouns: "This period", "Previous period", "p95".
- A running point is "so far", after the date: "03 Oct 2026 · so far".

## Do and do not

- Do show two measures of different size as two charts on one Meridian.
- Do not add a second y-axis, ever.
- Do not stack more than one area; use lines for peers.
- Do not put a number on every point.
- Do set `running` when the last point is a period not over yet. Do not leave a part-day drawn solid: it reads as a fall.

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

Props: `dates`, `series` (`key`, `label`, `values`, `color`, `kind`), `format` (`count` | `cost` | `duration` | `percent`), `height` (number or `fill`), `label`, `legend` (defaults to two or more series), `tick`, `stacked`, `baseline`, `running` (the last point is still in progress).

The colour of a stacked part is `stackPart(place, parts)` from `@/components/charts/scale`, the one mix every one-hue stack takes: the accent into the surface, by the part's place from the bottom.

The Atlas uses `data-preview-index` to show a selected day's readout statically. Product charts use the Meridian's cursor instead.

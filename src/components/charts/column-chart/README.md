# Column chart

A column chart compares counts side by side, one column per category or per period, with one column highlighted; given parts, each column is a whole split into them.

Status: beta

## Anatomy

1. **Legend** (stacked, two or more parts drawn): above the plot, in stack order from the bottom. A 10px square swatch (3px radius, as the Heatmap's) at the part's own strength, ringed by a 1px `ink-3` hairline, and the part's label in `ink-2` at `text-xs`.
2. **Gridlines and y labels**: three or four "nice" ticks from zero, `chart-grid` lines (the one at zero `chart-axis`), `text-2xs` `ink-3` labels in a gutter sized to the longest. Each label is the value its tick stands at, written by an axis formatter. Stacked, the axis is the total's.
3. **Columns**: equal width, 2px apart while the plot has room for it (see More columns than room), rounded 4px at the top, growing from the baseline. Plain, the population is `chart-neutral` and the highlighted column `accent`.
4. **Parts** (stacked): the first at the bottom, a 1px hairline of the card where two touch. Only the topmost part drawn is rounded. A part that is not zero is at least 3px tall; a part at zero is absent, with no line and no gap.
5. **Value at rest**: the column's value, or its total, above it in `text-2xs` `ink-3`, while a column is at least 36px wide.
6. **Dashed outline** (with a period still running): a 1px dashed `ink` line around the last column, open at the baseline, with 1px of the card between it and the fill, which is drawn at half strength. The outline has space of its own: it covers no part.
7. **Pointed column**: plain, it takes the accent and its value stands above it on `surface-inverse`. Stacked, it takes a 2px `ink` ring and the readout.
8. **Readout** (stacked): a panel on `surface-raised` beside the pointed column: the period, every part from the top down with its value, then the total.
9. **X labels**: `text-2xs` `ink-3`. Dates show as many as fit without colliding, counted back from the last column, and are never cut. Categories each keep their label, cut with an ellipsis to their column, while a column is at least 36px wide (an unlabelled category cannot be told apart); narrower, they thin like dates. The pointed column's label always shows whole. A label is centred under its column, but the first starts no earlier than its column and the last ends no later than its own, so neither runs past the plot; the plain pointed value is placed the same way.
10. **Announcement**: a visually hidden line that reads the pointed column to screen readers.
11. **Screen-reader table**: every column's label and value; stacked, every part and the total.

## Variants

| Variant | Use |
|---|---|
| Categories | One column per category, sorted by value |
| Days | One column per day, or per week or month, given its `dates`; today or the period in question highlighted |
| On the Meridian | Given `dates`, one a column, the columns share the page's cursor: pointing at a column points every chart at that day, and the pointed day is highlighted |
| Stacked, one hue | `parts` with no tone: parts of one kind, such as requests by region or revenue by plan. Each column is a whole and the top of a column is its total |
| Stacked, outcomes | `parts` with a tone each: how something ended, such as passed, skipped and failed |
| Running | The last column is a period still in progress, in either form |

**The colour of a part.** Parts with no tone are one whole, so they share the accent, mixed into the surface: deepest at the bottom and paler with each part above, between the theme's `chart-stack-hi` and `chart-stack-lo` (dark 92% to 20%, light 78% to 36%). It is the mix a stacked Trend chart takes, from the same function, so the two read as one family. Once any part names a tone the parts are outcomes: the usual outcome is `neutral` and takes `chart-neutral-strong`, and one that needs somebody takes `warning` or `critical`. A part with no tone among parts that have one is neutral too, so the accent never stands beside a status colour, and the positive colour is never used for the usual case.

**At most four parts.** Past four, nobody tells the steps of one hue apart. Given more, the fourth drawn is "Other": the sum of the fourth and every later part, in the columns, the legend, the readout and the table alike. Among outcomes it has no tone of its own and is neutral.

**The value at rest.** While `(plot width - 2 × (n - 1)) / n` is 36 or more for n columns, the plot width being the chart's width less the axis gutter, every column carries its value above it, or its total when stacked, as the chart formats it. Narrower, the figures would collide, so only the pointed column carries one. Pass a compact format: a figure wider than its column is cut with an ellipsis at rest, keeps the whole of itself in its column's title, and reads whole when the column is pointed at. A column that wide always has its whole gap, so the 2 in the rule is the gap as drawn.

**More columns than room.** A chart is never wider than its box, whatever it is given. The 2px between columns are kept while every column has a pixel of its own, which for n columns is a plot wider than `3n - 2` pixels. Under that the gap is 1px, and under `2n - 1` pixels there is none: the columns stand side by side and share the whole plot, each under a pixel once the plot is narrower than n pixels. The gap closes a whole pixel at a time, because a fraction of a pixel is drawn as a gap between some columns and none between others. Thirty days keep their 2px in a plot wider than 88px and ninety in one wider than 268px; a year of 360 needs 1,078px, and in a card half a desk wide has no gap at all. The rule is written in the rows' own style as an expression of their width, so it holds in the server's HTML, before the chart has measured itself, and the labels under the columns take the same gap and stay under them. Columns that narrow are a shape, and none of them is read on its own: for that many periods the form is a Trend chart.

**Periods take dates.** A chart whose columns are periods (days, weeks, months) passes `dates`, one ISO date a column, the period's first day. Its labels then thin as dates do and are never cut; passed as categories, "27 Sept" is cut to its column on a phone and reads "27 S…". Outside a Meridian the dates change nothing else.

**Running.** The last column is a period not over yet, such as today or the month so far. It is not a fact like the columns before it, so its fill is drawn at half strength, and a dashed outline, open at the baseline, stands around it. The fill alone would not do: a neutral column at half strength is nearly lost on the card (1.20:1 dark, 1.17:1 light, where a complete one is 1.50:1 and 1.39:1), so the outline, in `ink`, is what keeps the unfinished column a column, while its faded, hollowed body stays plainly weaker than a complete one. Wherever it is read it says "so far": the plain column's value when pointed at, the readout, the announcement and its row of the table. No other column does.

## Sizes

| Height | Use |
|---|---|
| 200px (default) | A chart card: columns grow in 164px |
| 160 to 180px | A secondary chart: columns grow in 124 to 144px. Under 160px the 36px the box keeps for values and the zero label is a third of the chart, so a chart that short is better a Sparkline or a taller card |
| `fill` (at least 220px) | A card whose row is taller than the chart: the plot takes what the legend and the labels leave |

The height is the plot's box, and the box holds everything the plot draws. The scale stands inside it: 28px under the box's top, which is room over the top tick for a column's value, at rest (16px, 4px off the column) or pointed at (24px, 4px off), and 8px over its bottom, which is the half line the zero tick's label hangs under its gridline. So columns grow in the height less 36px, and nothing moves when the chart's width arrives. Under the box the labels take 24px, 8px off it, and above it a legend takes one line and 8px, more when it wraps. Columns share the width, less the gaps between them: 2px each, or the 1px or nothing that More columns than room leaves.

The readout is at least 144px wide and never wider than the chart, with `space-3` 12px side padding, on `shadow-overlay`.

## States

| State | Spec |
|---|---|
| Arriving | Columns grow from the baseline over `dur-grow`, 12ms apart; values at rest fade in over `dur-enter`. |
| Rest | Columns, and their values where a column is 36px or wider. No readout. |
| Hover | Plain, neutral columns step up to `chart-neutral-strong` over `dur-hover`. |
| Pointed | By the pointer or the keys. Plain: the column takes the accent, and its value stands above it in `ink-inverse` on `surface-inverse`. Stacked: the column takes a 2px `ink` ring over `dur-hover`, its total steps up to `ink`, and the readout shows. |
| Highlighted | With no column pointed at, the highlighted column is the accent one (plain) or wears the ring (stacked). |
| Focus | The plot wears a 2px `accent` outline, 4px off its box, on `radius-sm`. The ring encloses the plot's box and so all the plot draws: the gridlines, every tick's label whole, the columns, their values at rest and the pointed value. It stands 4px under the line of the zero tick's label and 2px over the line of the x labels, and encloses neither the legend nor the x labels. |
| Running | The last column's fill at half strength, inside a 1px dashed `ink` outline, open at the baseline, 1px off the fill; "so far" where it is read. |
| More columns than room | The gap closes from 2px to 1px to none as the plot runs out of room for it, in the columns and in the labels under them alike, and the chart keeps its box. A running column narrower than the 4px its outline needs keeps the outline: it ends with the column and stands over the columns before it, never past the plot. |
| Zero | A column at zero draws nothing and reads zero; stacked, a column whose parts are all zero draws no part and reads a total of zero. Stacked, a part that is missing or below zero counts as zero; a plain column below zero draws no column and reads its value. |
| Empty | Render the card's Empty state. |

## Behaviour

- **Pointer**: entering or tapping a column points at it; leaving the chart lets go.
- **Keyboard**: the plot is one Tab stop, and its ring is the plot's own outline. Left and Right move the cursor a column, Home and End go to the first and the last. With no column pointed at, the cursor starts from the last column: a first Left lands on the last but one, a first Right on the last. Escape and blur let go.
- **One cursor**: the keys move the cursor the pointer moves. With `dates`, one a column, that cursor is the page's Meridian index, so every chart and tile on the page reads the same day.
- **Readout**: stacked only, and only on the chart being pointed at: a chart that follows another chart's cursor on the page's Meridian rings the day and keeps its panel hidden, as the Trend chart does. It stands after a column in the first half of the plot and before one in the second, measures its own width and stays inside the chart; long labels wrap. Under 640px it pins to the plot's leading edge.
- **Width**: the chart reads its own width, and every rule about width follows it, not the window, except the readout's pin to the leading edge, which follows a window under 640px.

## Surfaces

- **Console**: 200px or `fill`. A week or a quarter of periods usually keeps its values at rest; thirty days in half a row does not.
- **Mobile**: date labels thin out as the width shrinks and category labels cut shorter; under 36px a column, values show on pointing. A long run of days closes its gaps on a narrow card first: ninety days are a pixel apart once the plot is under 268px wide. A tap points at a column; the readout pins to the leading edge.
- **Embed**: same as mobile inline; the console's in fullscreen.

## Agents

The view shares the highlighted column and the day pointed at through `useShareView`; an agent reads values from the table, never from the drawing. A period still running is marked in the table's row ("03 Oct, so far"), so an agent does not report a part-day as a fall.

## Accessibility

- A labelled `figure` whose `sr-only` table holds every value: a row a column, its label in the row's header cell. Stacked, the head is the period, each part drawn and "Total". The running column's header cell says "so far".
- The plot is a `role="group"` named with the chart's label and how to use the keys: "Errors per day. Use the arrow keys to read one column." The column pointed at is read in an `aria-live="polite"` line: "Tue: 20", or "21 Sept: Large $40, Swift $0, Embed $20, Total $60", with ", so far" for the running column. It is empty when no column is pointed at.
- Contrast on `surface`, dark then light, with the indigo accent (`node scripts/contrast.ts --all`): the accent column 3.71:1 and 5.71:1; `chart-neutral-strong` 3.96:1 and 3.52:1; `warning` 9.06:1 and 3.36:1; `critical` 5.90:1 and 4.58:1; the ring and the dashed outline, `ink`, 16.89:1 and 17.93:1; values at rest, labels and the swatch's hairline, `ink-3`, 6.39:1 and 5.13:1. The plain value, `ink-inverse` on `surface-inverse`: 16.31:1 and 17.00:1. The readout's text, `ink` on `surface-raised`: 15.45:1 and 18.54:1.
- The deepest part of a stack, the one it stands on, holds 3:1 on `surface`: 3.30:1 dark, 3.61:1 light with the indigo accent, and never under 3.23:1 (jade, dark) in any theme and accent. The paler parts are not held to 3:1, as the neutral columns are not: the hairline, the legend, the total at rest, the readout and the table carry what their colour alone does not (WCAG 1.4.11).
- A running column's fill is at half strength on purpose. Measured on `surface` with the repository's colour helpers, dark then light: a neutral column 1.50:1 and 1.39:1 complete, 1.20:1 and 1.17:1 at half strength; the accent column, with the indigo accent, 3.71:1 and 5.71:1 complete, 1.81:1 and 2.18:1 at half strength. No fill at half strength holds 3:1, so the column is not told by its fill: the dashed outline is `ink` (16.89:1 and 17.93:1) and stands on the card, with 1px of the card inside it, so it holds that contrast whatever it surrounds; and the words "so far" are in every place the column is read.
- An outcome is never colour alone: the legend names each part in words, and the readout repeats the name beside each value.
- Neutral columns are the population and are not meant to be told apart by colour.

## Content

- Category labels are short (drop shared prefixes like `/v1/`); day labels are "27 Sept".
- The axis takes an axis formatter, `AXIS_FORMATTERS.count` or `AXIS_FORMATTERS.cost` from `@/lib/format`: one that is true at every tick ("1.5K", never "2K" for 1,500). A value formatter that rounds, such as `formatCompact`, is not one. With no `axisFormat` the axis reads as `format` does, which is right only while `format` is exact.
- `format` must tell neighbouring columns apart, because it writes the value above each: an exact count where the values are in the hundreds and low thousands ("902", "1,124", "1,016"), a compact one from the tens of thousands up ("62K", "108K"). Three columns of different heights that all read "1K" say the chart is wrong.
- Part labels are short nouns: "Enterprise", "us-east-1", "Failed". The fold is "Other".
- A running period is "so far", after its label: "03 Oct · so far" in the readout, "03 Oct, so far" in the table.
- `label` says what is counted and per what: "Errors per day", "Revenue per month, by plan".

## Do and do not

- Do highlight at most one column.
- Do pass `axisFormat`, an axis formatter, whenever `format` rounds. Do not hand the axis a value formatter: `formatCompact` labels the tick at 1,500 "2K".
- Do choose a `format` under which two columns of plainly different heights never read the same.
- Do pass `dates` when the columns are periods. Do not pass periods as categories: their labels are cut mid-word on a phone.
- Do use parts when each period is a whole worth reading by its total. Parts at one moment are a Composition bar; parts over a long run of days, where the shape is the story, are a stacked Trend chart.
- Do use a Trend chart for a long run of days. A Column chart keeps its box with any number of columns, but once its gaps have closed nobody reads one column from the next.
- Do set a period still in progress as running. Do not leave a part-day drawn solid: it reads as a fall.
- Do not colour columns by value; their height already shows it.
- Do not give a tone to parts of one kind, and do not put the accent beside a tone.
- Do not pass more than four outcomes: a fifth folds into a neutral Other, and a failure inside it is drawn as the usual case.

## Implementation

```tsx
import { ColumnChart } from '@/components/charts/column-chart';

import { AXIS_FORMATTERS, formatCompact, formatCost } from '@/lib/format';

<ColumnChart label="Errors per day" dates={dates} axisFormat={AXIS_FORMATTERS.count}
  columns={series.map((d) => ({ key: d.date, label: formatDate(d.date), value: d.errors }))} />

<ColumnChart label="Requests by endpoint" format={formatCompact} axisFormat={AXIS_FORMATTERS.count}
  columns={endpoints.map((e) => ({ key: e.route, label: e.route, value: e.requests }))} />

<ColumnChart label="Revenue per month, by plan" height="fill" running format={formatCost} axisFormat={AXIS_FORMATTERS.cost} dates={months.map((m) => m.month)}
  parts={[{ key: 'enterprise', label: 'Enterprise' }, { key: 'scale', label: 'Scale' }, { key: 'starter', label: 'Starter' }]}
  columns={months.map((m) => ({ key: m.month, label: m.label, values: [m.enterprise, m.scale, m.starter] }))} />

<ColumnChart label="Verification runs per day, by how they ended" dates={dates}
  parts={[{ key: 'passed', label: 'Passed', tone: 'neutral' }, { key: 'skipped', label: 'Skipped', tone: 'warning' }, { key: 'failed', label: 'Failed', tone: 'critical' }]}
  columns={days.map((d) => ({ key: d.date, label: formatDate(d.date), values: [d.passed, d.skipped, d.failed] }))} />
```

```ts
export type Column = { key: string; label: string; value: number };
export type StackedColumn = { key: string; label: string; values: number[] };
export type ColumnPart = { key: string; label: string; tone?: 'neutral' | 'warning' | 'critical' };

export type ColumnChartProps = {
  highlight?: string;              // the key of the one column the card is about
  dates?: string[];                // one ISO date a column, for periods: labels thin as dates, and the chart joins the page's Meridian
  running?: boolean;               // the last column is a period still in progress
  format?: (n: number) => string;       // a column's value; it must tell neighbouring columns apart
  axisFormat?: (n: number) => string;   // a tick's label: an axis formatter, true at every tick
  height?: number | 'fill';        // 'fill': the card's height, never under 220px
  label: string;
  labelEvery?: number;             // label every nth column from the first: 6 puts hours at 00, 06, 12, 18
  className?: string;
} & ({ columns: Column[] } | { columns: StackedColumn[]; parts: ColumnPart[] });
```

With `parts`, a column's `values` holds one value a part, in the parts' order, the first at the bottom. On `fill` the chart's parent is a flex column, as a card's body is when its row is taller than the chart.

The colour of a part with no tone is `stackPart(place, parts)` from `@/components/charts/scale`, the one mix every one-hue stack takes: the accent into the surface, by the part's place from the bottom of the parts drawn.

The gap is each row's own `column-gap`, set in its style from the number of columns: a sum of steps, each from nothing to 1px as the row's width passes the next threshold.

Every column carries `data-column` with its key, `data-active` while it is pointed at and `data-running` when it is the running one. The plot carries `data-plot`, a tick's label `data-tick`, a value `data-value`, the legend `data-legend` and the readout `data-readout`. A part carries `data-part` with its key (`other` for the fold), `data-tone` (`accent`, `neutral`, `warning` or `critical`) and, when it is the topmost drawn, `data-top`.

The Atlas uses `data-preview-index` to show a pointed column and its readout statically, as the Trend chart does, and draws the focused plot with a class that gives the plot its outline. Product charts use the pointer, the keys and the Meridian instead.

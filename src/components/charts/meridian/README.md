# Meridian

The Meridian is one time cursor shared by every chart and tile on a page: point at a day in any time chart and every chart draws the same line, and every figure reads that day.

Status: beta

## Anatomy

1. **Provider**: `<Meridian dates>` around a page's rows. It holds one list of dates and one index (the day pointed at, or none).
2. **Cursor line**: a 1px vertical hairline in `ink-3` at 55%, from the top of the plot to its baseline, in every time chart on the page.
3. **Marks**: a 4px dot on each series at that day, filled with the series colour, ringed 2px in `surface`.
4. **Tooltip**: only on the chart under the pointer: the date as a mono eyebrow, then one row per series (swatch, label, value). Other charts show the line and the dots, never a second tooltip.
5. **Readouts**: Metric tiles and the Featured metric swap their figure for that day's value and their delta for the date; a Sparkline marks the day with a hairline and a dot.

## Variants

| Variant | Use |
|---|---|
| Shared | Charts inside one `<Meridian>` whose `dates` have the same length follow one cursor. The default for a dashboard page. |
| Alone | A chart outside a provider (or with a different number of dates) keeps a private cursor; nothing else moves. |

## Sizes

The Meridian has no size of its own. The line is 1px; the dots 8px across (4px radius) with a 2px ring; the tooltip is at least 144px wide, padded 12 by 8px, `radius-md`, `surface-raised` with `shadow-overlay`.

## States

| State | What shows |
|---|---|
| Rest | No line. Tiles show the period's figure and delta. |
| Pointing | The line and dots on every chart; the tooltip on the chart under the pointer; tiles show the day. The tooltip fades in over `dur-hover`. |
| Keyboard | A focused chart draws a 2px `accent` ring around its plot until a day is chosen; then the line moves with the keys. |
| Left | Leaving the chart (pointer out, Escape, blur) clears the index everywhere. |

## Behaviour

- **Pointer**: the nearest day to the pointer's x. **Touch**: press and drag along the chart; vertical drags still scroll the page (`touch-action: pan-y`).
- **Keyboard** on a focused chart: Left and Right move one day, Home and End jump to the first and last, Escape clears.
- One index per page: the latest pointer wins. A chart, a column chart with `dates`, a tile and a sparkline all read it through `useMeridian` or `useMeridianIndex`.

## Surfaces

- **Console**: pointer and keyboard as above.
- **Mobile**: the finger drags the cursor; the tooltip flips to the left of the line past 62% of the plot so it never leaves the screen.
- **Embed**: the same. The view shares the day the person is looking at with the model (below), so "why did it dip here?" has a referent.

## Agents

- An embed view calls `useShareView` with a sentence and `{ day }` whenever the index changes, so the model knows which day is pointed at.
- An agent never moves the cursor. It reads the same numbers from the shared context and from every chart's screen-reader table.

## Accessibility

- Each chart is a focusable `role="img"` with a label that says how to use the keys, and carries an `sr-only` table of every day and series: the tooltip is visual only, the table is the accessible source of the numbers.
- The cursor line is decorative; the marks hold 3:1 (`accent` on `surface` 3.73:1 dark, 5.91:1 light).
- Reduced motion: nothing animates; the line jumps with the pointer as it always does.

## Content

- The tooltip's date is the long form ("22 Sept 2026"); values use the chart's formatter, never raw numbers.

## Do and do not

- Do wrap a whole page body in one Meridian when its charts share a period.
- Do not put charts of different periods in one Meridian: give each its own, or none.
- Do not add a second cursor behaviour (a crosshair, a vertical band); the Meridian is the only one.

## Implementation

```tsx
import { Meridian, useMeridianIndex } from '@/components/charts/meridian';

<Meridian dates={series.map((d) => d.date)}>
  <TrendChart label="Requests per day" dates={dates} series={[...]} />
  <MetricTile label="Error rate" daily={series.map((d) => d.errors / d.requests)} ... />
</Meridian>
```

`useMeridian(dates)` returns `{ index, setIndex, dates, shared }` for a chart; `useMeridianIndex()` returns `{ index, dates }` for a readout that never sets it.

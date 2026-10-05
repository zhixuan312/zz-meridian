# Featured metric

The featured metric is a page's protagonist: the one number a dashboard leads with, at hero size, in the one card that carries the accent's light, with its chart inside it.

Status: beta

## Anatomy

1. **Kicker**: `t-kicker` in `accent-ink`: the measure and the period ("Requests · last 30 days").
2. **Actions** (optional): a menu or a small filter. Not a "Live" badge: Freshness in the masthead already says how fresh the data is.
3. **Hero figure**: `t-hero` (52–80px, 600, −0.035em), its unit stepped down — and the cents of a money figure, the same rule the Metric tile's figure follows (`splitFigure` in `src/lib/format.ts`).
4. **Change pill**: a 28px glass pill holding the Delta and "vs previous period"; while the Meridian reads a day, an inverse pill naming the day.
5. **Caption** (optional): one sentence that makes the number concrete.
6. **Chart**: a Trend chart at `fill` height.

## Composition

A section on `surface` with `radius-xl` 24px and a `line` hairline, the `glow-feature` wash (an accent pool at the top right fading down), a lit edge (`edge-lit`: the hairline brightest at the top right, where the light comes from) and a faint `shadow-halo`. It is the one card on the page that carries the light; it never loops or pulses. It takes the wide cell of a `2/3` row; Metric tiles stack in the narrow cell.

## Data

As Metric tile: `value`, `daily`, `delta`, `intent`, `format`. The caption is computed from the same data ("About 98K a day. The busiest day was 1 Oct, with 128K."), never typed in.

## States

| State | What changes |
|---|---|
| Rest | as above |
| Meridian reading | The figure reads the day; the pill turns inverse and names it |
| Without a chart | Kicker, figure, pill and caption only |
| Loading | A Skeleton of the figure and the chart area inside the same card |

## Surfaces

- **Console**: the wide cell of the first row.
- **Mobile**: full width; the chart keeps at least 220px.
- **Embed**: fullscreen views use it as on the console; an inline view leads with Metric tiles instead, because the host's height is short.

## Agents

The featured number is the first fact an embed view shares with the model.

## Accessibility

- The kicker names the number; the figure is text; the chart carries its own table for screen readers.
- Contrast (dark, indigo): figure `ink` on the washed surface above 14:1; kicker `accent-ink` above 8:1.

## Content

- One number only. The caption is a sentence a person would say out loud.

## Do and do not

- Do use one per page, for the number the page is about.
- Do not put two featured cards in a row, or a featured card on a list page; there the table is the protagonist.

## Implementation

```tsx
import { FeaturedMetric } from '@/components/patterns/featured-metric';

<FeaturedMetric kicker="Requests · last 30 days" value={total} daily={daily} format={formatCompact} delta={0.057}>
  <TrendChart height="fill" label="Requests per day" dates={dates} series={[{ key: 'r', label: 'Requests', values: daily, kind: 'area' }]} />
</FeaturedMetric>
```

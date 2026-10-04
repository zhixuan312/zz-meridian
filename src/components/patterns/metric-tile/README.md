# Metric tile

A metric tile shows one number a page exists to show, with its change against the previous period and its shape over the period.

Status: beta

## Anatomy

1. **Head**: a 14px icon, the label (`text-sm` 500, `ink-2`) and an optional info button whose tooltip says what the number counts.
2. **Figure**: `t-figure` (32–42px, 600, −0.03em); the unit and the cents step down to half size in `ink-3`.
3. **Change**: a Delta and "vs previous period", or the day the Meridian points at.
4. **Sparkline**: the period's shape, edge to edge at the foot, 40px tall.

## Composition

Card, Delta, Tooltip, Sparkline. Tiles sit in a `Row split="tiles"`, or stacked in the narrow cell of a `2/3` row beside a Featured metric.

## Data

- `value` is the period's figure; `daily` one value per day of the same period; `delta` the change as a fraction (0.057 is +5.7%), or `null` when there is no earlier period. `compare` names what the change is measured against (default "vs previous period"; "vs the half hour before" when the window is not the period). `note` is a short line in that place when no comparison fits, such as who is past due.
- `intent` says which way is good: `up` (requests), `down` (errors, latency), `neutral` (spend).
- `value` may be a word for a categorical state ("Likely new", "On track"); it is set at `text-2xl` instead of the figure size and wraps to a second line rather than losing its end ("03 Oct 2026" in a narrow tile), and `format` is not used.
- `format` turns the number into its text: a name (`count`, `compact`, `cost`, `cost-compact`, `duration`, `percent`), which a server page can pass, or a function from a client component; the default split recognises "$298.43" (any currency symbol from `app.currency`), "2.9M", "0.90%" and "294ms".

## Variants

| Variant | Use |
|---|---|
| Default | Every tile |
| Emphasis | The one tile that carries the finding when there is no Featured metric: its figure in `accent-ink`, its sparkline in `accent` |
| No sparkline | A count with no useful shape (active keys) |

## States

| State | What changes |
|---|---|
| Rest | as above |
| Meridian reading | The figure reads the day; the change line names it ("22 Sept 2026"); a hairline marks the day on the sparkline |
| No earlier period | "No earlier period to compare" in place of the change |
| Loading | A Skeleton of the same shape (figure bar, two lines) |

## Surfaces

- **Console**: four across, or stacked three high beside a Featured metric.
- **Mobile**: two across from 34rem of row width, one below.
- **Embed**: one to three across in an inline view; the same tile.

## Agents

An embed view shares the tiles' values (and the day, when the Meridian points at one) with the model.

## Accessibility

- The label is the tile's heading (`h2`, one level under the page title). The figure is text; the sparkline is decorative, so the table behind the page's chart carries the series.
- Contrast (dark): label `ink-2` 8.0:1; figure `ink` 17:1; unit `ink-3` 6.4:1.

## Content

- Labels name the measure in two words: "Error rate", "Latency p95". The hint says what it counts, in one sentence.

## Do and do not

- Do keep at most one emphasis tile per row, and none when the page has a Featured metric.
- Do not colour a figure by a threshold; the delta carries direction, the figure stays ink.

## Implementation

```tsx
import { MetricTile } from '@/components/patterns/metric-tile';

<MetricTile label="Error rate" value={0.009} delta={0.13} intent="down" daily={errors} format={(n) => formatPercent(n, 2)} />
```

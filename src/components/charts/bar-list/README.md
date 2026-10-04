# Bar list

A bar list ranks a set of items by one measure, each with a bar under its label: "by endpoint", "by customer", "by region".

Status: beta

## Anatomy

1. **Row**: label on the left (`text-sm`, `ink-2`; the highlighted row `ink` at `weight-medium`), an optional meta line, the value on the right (`ink`, tabular, `weight-medium`).
2. **Track**: 6px tall, `fill-track`, `radius-full`.
3. **Bar**: the value's share of the largest, `chart-neutral`; the one highlighted row in `accent`.
4. **Others**: past `limit`, the remaining rows fold into "N others", summed, in `ink-3`; a single extra row shows as itself, since "1 others" would hide a name to save no space.

## Variants

| Variant | Use |
|---|---|
| One highlighted | The card is about one row (the busiest endpoint, the customer in question) |
| All neutral | A ranking with no finding to point at |
| With meta | A short fact per row (a plan, an error rate), between label and value |

## Sizes

Rows are 14px apart; label to bar 6px. The list takes its container's width.

## States

| State | Spec |
|---|---|
| Arriving | Bars grow from the left over `dur-grow`, 45ms apart in rank order. |
| Hover | The row's neutral bar steps up to `chart-neutral-strong` over `dur-hover`. |
| Empty | Render the card's Empty state. |

## Behaviour

Rows are not interactive by default; a row that leads somewhere wraps its label in a link styled with `row-link`.

Bars are drawn against the largest row. Pass `total` when the rows are a share of a stated whole (the top 8 tools out of every call, or rows hidden by `limit`): each bar is then its value over `total`, and hovering a row shows its share ("12.4% of 3.1M").

## Surfaces

- **Console**: up to `limit` rows (default 6).
- **Mobile**: the meta line hides; everything else holds.
- **Embed**: the top five, then Expand.

## Agents

The ranking is shared as structured context by the view (`useShareView`), so an agent can name the top rows without reading bars.

## Accessibility

A labelled list (`aria-label`); each row's label and value are text, so the bar is reinforcement, never the only signal. The accent bar holds 3.73:1 dark, 5.91:1 light on `surface`.

## Content

Labels are the items' own names (routes in mono); values use one formatter for the whole list.

## Do and do not

- Do sort by value, largest first.
- Do not colour more than one row; do not colour rows by their value.

## Implementation

```tsx
import { BarList } from '@/components/charts/bar-list';

<BarList label="Requests by endpoint" items={items} highlight="/v1/messages" limit={5} format={formatCompact} />
```

# Bar list

A bar list ranks a set of items by one measure, each with a bar under its label: "by endpoint", "by customer", "by region".

Status: beta

## Anatomy

1. **Row**: label on the left (`text-sm`, `ink-2`; the highlighted row `ink` at `weight-medium`), an optional meta line, the value on the right (`ink`, tabular, `weight-medium`).
2. **Track**: 6px tall, `fill-track`, `radius-full`.
3. **Bar**: the value's share of the largest, `chart-neutral`; the one highlighted row in `accent`.
4. **Others**: past `limit`, the remaining rows fold into "N others", summed, in `ink-3`; a single extra row shows as itself, since "1 others" would hide a name to save no space. It is never a link, whatever the rows it holds.
5. **Linked row**: a row with an `href` names a record that has a page, and its label is the one link to it, named by the label. The bar, the meta line and the figure stay text: they say what the label already opens, so they are never a second way there. At rest the row looks as an unlinked one does.

## Variants

| Variant | Use |
|---|---|
| One highlighted | The card is about one row (the busiest endpoint, the customer in question) |
| All neutral | A ranking with no finding to point at |
| With meta | A short fact per row (a plan, an error rate), between label and value |
| Linked | Each row names a record that has a page (a customer): its label opens it |

## Sizes

Rows are 14px apart; label to bar 6px. The list takes its container's width.

## States

| State | Spec |
|---|---|
| Arriving | Bars grow from the left over `dur-grow`, 45ms apart in rank order. |
| Hover | The row's neutral bar steps up to `chart-neutral-strong` over `dur-hover`. |
| Hover (a linked row's label) | The label takes `accent-ink` over `dur-hover`, and the bar steps up as on any row. |
| Focus (a linked row) | The label's link shows the 2px `accent` ring. |
| Empty | Render the card's Empty state. |

## Behaviour

Rows are not interactive by default. Give a row an `href` when it names a record that has a page, and its label becomes the link to it (`row-link`, with the `hit` target: 24px under a mouse, 44px under a finger). Give every row of a list one or none: a list where some names open and others do not reads as broken.

Bars are drawn against the largest row. Pass `total` when the rows are a share of a stated whole (the top 8 tools out of every call, or rows hidden by `limit`): each bar is then its value over `total`, and hovering a row shows its share ("12.4% of 3.1M").

## Surfaces

- **Console**: up to `limit` rows (default 6).
- **Mobile**: the meta line hides; everything else holds. A linked label answers a 44px target.
- **Embed**: the top five, then Expand.

## Agents

The ranking is shared as structured context by the view (`useShareView`), so an agent can name the top rows without reading bars.

## Accessibility

A labelled list (`aria-label`); each row's label and value are text, so the bar is reinforcement, never the only signal. A linked row is one link a row, named by its label, so a keyboard has one Tab stop a row and a screen reader hears each name once. The accent bar holds 3.71:1 dark, 5.71:1 light on `surface`.

## Content

Labels are the items' own names (routes in mono); values use one formatter for the whole list.

## Do and do not

- Do sort by value, largest first.
- Do not colour more than one row; do not colour rows by their value.

## Implementation

```tsx
import { BarList } from '@/components/charts/bar-list';

<BarList label="Requests by endpoint" items={items} highlight="/v1/messages" limit={5} format={formatCompact} />

// Rows that open a record: the label is the link.
<BarList label="Revenue by customer" items={customers.map((c) => ({ key: c.id, label: c.name, value: c.revenue, href: `/customers/${c.id}` }))} format={formatCost} />
```

# Card

A card is the one container for a group of related content: it sits one step above the canvas on `surface`, outlined by a hairline, and is the unit every row of a page is built from.

Status: beta

## Anatomy

1. **Container**: `surface`, 1px `line` border, `radius-lg` 12px, `shadow-card`.
2. **Top edge**: a 1px `highlight-top` line inset 12px from each side. Transparent on light, where the shadow lifts the card; a faint lit edge on dark, where shadows do not read.
3. **Header** (`CardHeader`, optional): title, an optional description under it, actions on the right.
4. **Body** (`CardBody`): the content; `flush` removes the padding for a list or table that runs edge to edge.
5. **Footer** (`CardFooter`, optional): a quiet band with a hairline above: a link to the full view, a caption.

## Variants

| Variant | Use | Difference |
|---|---|---|
| Default | Any group of content | As above |
| Divided header | The body is a table or a list that runs edge to edge | A `line` hairline under the header; header bottom padding 14px |
| Interactive | The whole card is one link (a customer, a service) | Hover: border `line-strong`, `shadow-raise` |

## Sizes

| Part | Spec |
|---|---|
| Padding | `card-pad` 24px (16px compact), on all sides of the body |
| Header | top `card-pad` minus 4px; title `t-card` 14px/600; description `t-caption` 12px `ink-3`, 4px under the title |
| Body | 12px under the header |
| Footer | 12px vertical, `card-pad` horizontal, `text-sm` 13px `ink-2` |
| Radius | `radius-lg` 12px; anything nested inside steps down to `radius-md` 8px |

A card never sets its own outer margin: the row's gap places it. Cards in one row are the same height (the grid stretches them); a card is its content's height otherwise.

## States

| State | Spec |
|---|---|
| Rest | as above |
| Hover (interactive only) | border `line-strong`, shadow `shadow-raise`, over `dur-hover` |
| Focus (interactive only) | the link's 2px `accent` focus ring around the card |
| Loading | the same card holding Skeletons in the shape of its content |
| Empty | the card keeps its header; the body holds an Empty state |
| Error | the card keeps its header; the body holds a Banner (critical) with Retry |

## Behaviour

A card is not interactive unless it is one link; then the whole card is the target and nothing inside it is a second control.

## Surfaces

- **Console**: as specified.
- **Mobile**: same; rows stack, so cards run full width.
- **Embed**: the card takes the host's `--color-background-primary` and `--color-border-primary` through the bridge, so it sits in the host as one of its own; `radius-lg` follows `--border-radius-lg`.

## Agents

A card is the unit an agent is asked about: on the embed surface a card's header may carry an Ask action (AskAbout), which posts a question about exactly what the card shows.

## Accessibility

- A card with a title is a region of its page: the title is an `h2` (`t-card`) so headings outline the page.
- Contrast (light, cobalt): title `ink` on `surface` 18.1:1; description `ink-3` on `surface` 5.3:1.
- The border and the highlight are decorative; the title and spacing carry the grouping.

## Content

- Title: a noun phrase, sentence case, no full stop: "Busiest endpoints", "Monthly quota".
- Description: what the numbers count or over what time: "Requests in the period", "p95, last 24 hours".

## Do and do not

- Do group by space first; reach for a card only for a real object with an edge.
- Do not nest a card inside a card; use a Divided header or a sunken well (`surface-sunk`) instead.
- Do not give a card a coloured background to make it stand out; use the one emphasis a row allows (a Metric tile's `emphasis`).

## Implementation

```tsx
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';

<Card>
  <CardHeader title="Busiest endpoints" description="Requests in the period" divided />
  <CardBody flush>{list}</CardBody>
  <CardFooter><Link href="/analytics">All endpoints</Link></CardFooter>
</Card>
```

`Card`: `interactive` and div attributes. `CardHeader`: `title`, `description`, `actions`, `divided`. `CardBody`: `flush`. `CardFooter`: div attributes.

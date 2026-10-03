# Key value

Key value lists the facts about one thing, a label and a value per row, divided by hairlines, so a reader can scan a record: a request's endpoint and status, a key's scope and last use.

Status: beta

## Anatomy

1. **Row**: at least 44px tall, 10px vertical padding, a `line` hairline under every row but the last.
2. **Label**: 128px wide, `text-sm`, `ink-3`.
3. **Value**: `text-sm`, `ink`, tabular figures; `mono` sets it in `font-mono` `text-xs` for identifiers. Long values truncate with the full value in the title.
4. **Action** (optional): a small ghost Button or a Copy button at the end of the row.

## Variants

| Variant | Use |
|---|---|
| One column (default) | A record's facts in reading order, in a card or a side panel |
| Two columns | Many short facts in a wide card, from 640px; one column below |

## Sizes

One size. In compact density only the card's padding changes; the rows stay 44px so a value never crowds its neighbour.

## States

Not interactive itself; an action inside follows its own card. An unknown value shows an em dash in `ink-3`, never "0" or a blank.

## Behaviour

Static.

## Surfaces

- **Console**: one or two columns.
- **Mobile**: one column; the label narrows to fit and the value truncates.
- **Embed**: one column, at most six rows inline; the rest behind Expand.

## Agents

A record's key values are what an embed shares with the model when the person looks at it (`useShareView`), in the same order, so "this request" has a referent.

## Accessibility

- A `dl` of `dt` and `dd` pairs.
- Contrast (light): label `ink-3` on `surface` 5.3:1; value `ink` 18.1:1.

## Content

Labels are nouns in sentence case without colons: "Request ID", "Latency". Values are formatted by the shared formatters, with units: "1,842ms", "12,480 tokens".

## Do and do not

- Do put the identity first and the details after.
- Do not use Key value for a comparison across many items; use a Table.

## Implementation

```tsx
import { KeyValue } from '@/components/ui/key-value';

<KeyValue items={[{ label: 'Request ID', value: 'req_8f2k1x9a3m4c', mono: true }, { label: 'Latency', value: '1,842ms' }]} />
```

Props: `items` (`label`, `value`, `action`, `mono`), `columns` (1 | 2), `className`.

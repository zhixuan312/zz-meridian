# Composition bar

A composition bar splits one whole into its parts in a single bar, with a legend that carries the numbers.

Status: beta

## Anatomy

1. **Bar**: 10px tall, `radius-full` at its ends, a 2px gap between parts; every part at least 3px wide so a sliver stays visible.
2. **Legend**: two columns on phones, four from 640px: a swatch and the part's name in `ink-2`, then its share (`text-sm`, `weight-medium`) and its count (`ink-3`).

## Variants

| Variant | Colours |
|---|---|
| Status | Parts that carry a judgement take status colours (`warning`, `critical`) beside a neutral and the accent; the legend names each in words |
| Categories | Parts with no judgement take slots 1, 2, 3 in order |

## Sizes

The bar takes its container's width; the legend wraps.

## States

| State | Spec |
|---|---|
| Arriving | The bar reveals left to right over `dur-grow`. |
| Hover | A part's native title gives its name and count. |
| Empty | A whole of zero renders the card's Empty state. |

## Behaviour

Not interactive.

## Surfaces

- **Console**: legend four across.
- **Mobile** and **Embed** inline: legend two across.

## Agents

The parts and shares are shared as structured context by the view; the legend text carries them for any reader.

## Accessibility

A labelled `figure`; the legend is the accessible content. Shares under 10% carry one decimal so small parts are not rounded to zero.

## Content

Part names are short: "2xx", "4xx", "us-east-1", "Enterprise".

## Do and do not

- Do use it for two to six parts of one whole.
- Do not use it to compare wholes; use a Column chart.

## Implementation

```tsx
import { CompositionBar } from '@/components/charts/composition-bar';

<CompositionBar label="Responses by status class" format={formatCompact}
  parts={[{ label: '2xx', value: 2_942_310, color: 'neutral' }, { label: '5xx', value: 13_350, color: 'critical' }]} />
```

# App mark

The app mark is the product's sign: the template ships a neutral one, an accent tile holding a trend crossed by the line that reads it, which a product replaces with its own logo.

Status: beta

## Anatomy

1. **Tile**: a 24-unit square with a 6.5-unit radius, filled with `accent` and a soft sheen from the top.
2. **Trend**: a 1.7-unit `on-accent` polyline.
3. **Meridian**: a vertical line at 55% and a dot where it meets the trend.

## Sizes

| Size | Use |
|---|---|
| 20px | The Embed frame's head |
| 24px | Small headers, toasts |
| 28px | The rail's brand row |
| 32px | Sign-in, the Atlas |

## Behaviour

- The tile is the accent, so the mark follows a preset (graphite gives an ink tile with a dark trend on dark).

## Surfaces

- **Console**, **Mobile**: in the rail.
- **Embed**: at 20px in the Embed frame's head, so a reader knows whose card this is.

## Agents

Not applicable.

## Accessibility

- Decorative (`aria-hidden`): the product name beside it is the accessible name. Never announce the mark and the name twice.

## Do and do not

- Do replace the SVG with your logo and keep the four size steps.
- Do not stretch it, outline it, or set it on a fill that is the accent.

## Implementation

```tsx
import { AppMark } from '@/components/base/app-mark';

<AppMark size={28} />
```

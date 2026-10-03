# Uptime bars

Uptime bars show a service's recent days, one thin bar per day, so an incident stands out from a run of healthy days.

Status: beta

## Anatomy

1. **Bars**: one per day, oldest on the left, equal width, 32px tall, `radius-full`, 2px apart.
2. **Caption**: "90 days ago" (the span shown), a hairline, the uptime percentage in `ink-2`, a hairline, "Today".
3. **Tooltip**: on hover, the day's state and date, on `surface-inverse`.
4. **Screen-reader text and table**: a one-line summary and every day's state.

## Variants

| State of a day | Fill |
|---|---|
| Operational | `positive` at 40%: it recedes |
| Degraded | `warning` |
| Outage | `critical` |

`size="lg"` draws 56px bars for a strip that leads its card (the Health page's featured card); the default is 32px. `measure` is the word after the percentage: "uptime" by default, "on time" or "in stock" for other domains.

## Sizes

The bars share the container's width, every day always shown, so the percentage and the label describe exactly the bars drawn. Under 420px the gap between bars tightens from 2px to 1px.

## States

| State | Spec |
|---|---|
| Hover | The other bars fade to 55%; the hovered bar grows 10% taller; the tooltip shows. |
| Short history | Fewer days than the window: the bars widen to fill it; the caption's count says how many days there are. |

## Behaviour

Pointer hover only; the table carries every day for keyboard and screen readers.

## Surfaces

- **Console**: 90 days.
- **Mobile** and **Embed**: every day, with 1px gaps.

## Agents

The Health view shares each service's state and uptime as structured context; an agent names incidents by date from it.

## Accessibility

Every state has a word in the tooltip and the table; colour is never the only signal. Status fills hold 3:1 on `surface` (positive 8.63:1 dark at full strength; warning 3.48:1 light).

## Content

Uptime is shown to three decimals at 99.99% and above, two below ("99.994%", "99.81%").

## Do and do not

- Do pair it with the service's name and current status word.
- Do not use it for anything but day states.

## Implementation

```tsx
import { UptimeBars } from '@/components/charts/uptime-bars';

<UptimeBars label="Inference API over 90 days" days={service.days} uptime={service.uptime} end={DEMO_NOW} />
```

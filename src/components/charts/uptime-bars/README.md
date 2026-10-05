# Uptime bars

Uptime bars show a service's recent days as one SVG, so an incident stands out from a run of healthy days.

Status: beta

## Anatomy

1. **SVG**: one `<svg role="img">` per strip, labelled by the summary. One baseline `<rect>` spans the whole period in the operational fill; one `<rect data-day data-state>` is drawn per non-operational day. A focus rect appears only while a day is focused.
2. **Caption**: "90 days ago" (the span shown), a hairline, the uptime percentage in `ink-2`, a hairline, "Today".
3. **Tooltip**: on hover or keyboard focus, the day's state and date, on `surface-inverse`.
4. **Screen-reader text**: one paragraph with the period and its uptime, then one sentence per degraded, outage or no-data day ("12 Sep 2026: Outage."), or "No incidents." There is no table of every day.

## Variants

| State of a day | Drawn as |
|---|---|
| Operational | The baseline: `positive` at 22%, so it recedes |
| Degraded | A `warning` mark |
| Outage | A `critical` mark |
| None | A `line-strong` mark, opaque so the baseline never shows through; read as "No data" and never counted as up |

`size="lg"` draws a 56px strip for one that leads its card (the Health page's featured card); the default is 32px. `measure` is the word after the percentage: "uptime" by default, "on time" or "in stock" for other domains.

## Sizes

The viewBox is one unit per day, so the strip fills the container's width and every day is always drawn; a narrow container scales the drawing rather than dropping days or tightening gaps.

## States

| State | Spec |
|---|---|
| Hover or focus | A focus rect marks the day; the tooltip shows. |
| Short history | Fewer days than the window: the days widen to fill it; the caption's count says how many days there are. |

## Behaviour

The strip is a focusable group: Arrow Left and Right, Home and End move the focused day, Escape clears it, and a polite live region announces its date and state.

## Surfaces

- **Console**: 90 days.
- **Mobile** and **Embed**: every day, scaled to the width.

## Agents

The Health view shares each service's state and uptime as structured context; an agent names incidents by date from it.

## Accessibility

Every state has a word in the tooltip, the live region and the summary; colour is never the only signal. Status fills hold 3:1 on `surface` (positive 8.63:1 dark at full strength; warning 3.48:1 light).

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

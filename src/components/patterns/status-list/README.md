# Status list

A status list shows every service and how it is right now, with ninety days of history, so a reader learns in one line whether anything is wrong and in one glance where.

Status: beta

## Anatomy

1. **Summary line** (optional): a status dot and the worst state among the services, in words: "All systems operational", "1 service degraded", "1 service is down". The count of services on the right from 28rem of card width.
2. **Service row**, one per service:
   1. **Dot and name**: a 8px status dot and the service name, `text-sm` medium.
   2. **Description** (optional): one line in `t-caption`, truncated with an ellipsis.
   3. **Uptime bars**: the service's days, oldest on the left (the Uptime bars card).
   4. **State and latency**: the state word in its tone's ink, and `p95` latency in `t-caption`, right-aligned.

## Variants

| Variant | Prop | Use |
|---|---|---|
| With summary (default) | `summary` | A list that stands alone: an embed, a card without its own title |
| Without summary | `summary={false}` | Under a Card header that already names the list (Health page) |
| Without descriptions | `descriptions={false}` | Inline embeds and narrow cards, where one line per service is enough |

## Sizes

| Part | Spec |
|---|---|
| Row padding | `card-pad` horizontally, `space-4` 16px vertically; divided by `line` hairlines |
| Wide row (card at least 42rem) | Three columns: name 12 to 15rem, bars fill, state 5.5rem |
| Narrow row (under 42rem) | Name and state on one line; the bars on a second line across the full width |
| Summary | `text-md` 16px semibold, `tracking-title`; a 10px dot |

## States

| State | Summary | Row |
|---|---|---|
| All operational | Dot `positive`, still; text `ink` | Dot `positive`; word "Operational" in `positive-ink` |
| Degraded | Dot `warning`, pulsing; text `warning-ink` | Dot `warning`, pulsing; word "Degraded" in `warning-ink` |
| Outage | Dot `critical`, pulsing; text `critical-ink` | Dot `critical`, pulsing; word "Outage" in `critical-ink` |
| Hover on a bar | | The Uptime bars tooltip names the day and its state |

The worst state wins the summary. A pulsing dot is the system's one allowed loop besides a skeleton; it stops under reduced motion.

## Behaviour

- Rows are not interactive; the page around them links to the incident. Pointing at a bar reads its day.
- The list never scrolls on its own and never sorts: services keep the order the product defines, so a reader finds a service where it was yesterday.

## Composition

A Card (`overflow-hidden`) holding: the summary line, then one row per service. Each row composes Status dot (Layer 2), the service text, Uptime bars (Layer 3) and the state text. On the Health page a Card header ("Services") replaces the summary.

## Data

| Field | Meaning |
|---|---|
| `status` | The state now: `operational`, `degraded` or `outage` |
| `uptime` | Share of the period the service answered within its objective, as a fraction; shown to two decimals, or three at 99.99% and above |
| `latency` | p95 over the last hour, in milliseconds |
| `days` | One state per day, oldest first, ending today: the worst state of that day |

## Surfaces

- **Console**: wide rows on the Health page, without the summary.
- **Mobile**: narrow rows; the bars show the last 30 days.
- **Embed**: the inline Health view shows the list with its summary and without descriptions, under a Banner for any live incident.

## Agents

An embed that shows this list shares the summary, the affected services and the open incident with the model (`useShareView`), so "is anything wrong?" has an answer without a tool call. An agent reads the list; it cannot change a service's state.

## Accessibility

- The summary has `role="status"`, so a change of state is announced.
- State is said in words beside every dot; colour repeats it, never carries it alone.
- Contrast (dark, indigo): `ink` on `surface` 17.0:1; state words: `positive-ink` 11.9:1, `warning-ink` 12.0:1, `critical-ink` 9.6:1; dots against `surface`: positive 8.6:1, warning 9.1:1, critical 5.9:1.
- Each Uptime bars figure carries a screen-reader sentence and a by-day table.

## Content

- Service names are what customers call them ("Inference API"), not internal names ("infer-gw-2").
- One description line says what the service does, not how: "Messages, completions and tools".
- The summary counts, then names the state: "1 service degraded", never "Partial degradation".

## Do and do not

- Do keep the services in a fixed order.
- Do pair every degraded or down row with an incident somewhere on the page.
- Do not colour the whole row; the dot and the word are enough.
- Do not show percentages to more than three decimals.

## Implementation

```tsx
import { StatusList } from '@/components/patterns/status-list';

<Card className="overflow-hidden">
  <StatusList services={SERVICES} end={DEMO_NOW} />
</Card>
```

Props: `services`, `end` (today), `summary`, `descriptions`, `className`. `summarise(services)` (also from `status-list/summarise`, safe on the server) returns the worst state and its sentence for a page's own summary.

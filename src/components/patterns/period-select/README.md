# Period select

The period select chooses the reporting period for a whole page (7 days, 30 days, 90 days, all) and keeps it in the address, so a view is a link.

Status: beta

## Anatomy

1. **Segmented control**: four options: 7D, 30D, 90D, All; the full name ("Last 30 days") is each option's title.

## Composition

Segmented, writing `?period=` with `router.replace` (no history entry, no scroll). The page reads it on the server with `parsePeriod`, which never passes an untrusted value through.

## Data

The vocabulary lives in `src/lib/period.ts`: `PERIODS`, `PERIOD_LABEL`, `PERIOD_DAYS` and `parsePeriod`, shared by the picker, the queries and the copy, so they cannot disagree. `all` is 180 days in the demo data.

## States

As Segmented: rest `ink-2`, hover `ink`, chosen on the lifted thumb, focus ring. Changing the period re-renders the page; its rows arrive again in reading order.

## Surfaces

- **Console**: in the masthead's actions.
- **Mobile**: on the masthead's actions row; four short options fit at 360px.
- **Embed**: the period is a tool argument. An inline view states it in its title ("Overview · Last 7 days") instead of offering the control; fullscreen may show it.

## Agents

The period is part of the view's address: an agent opens "the last 7 days" by calling the tool with `period: '7d'`, and the shared context names the period.

## Accessibility

- A radiogroup named "Reporting period"; arrow keys move between options.

## Content

- Short labels in the control ("30D"), the full phrase everywhere else ("Last 30 days").

## Do and do not

- Do keep one period per page; every chart and tile on it answers the same period.
- Do not add a custom date range here; that is a Popover with two date fields, when a page needs it.

## Implementation

```tsx
import { PeriodSelect } from '@/components/patterns/period-select';

<Suspense><PeriodSelect value={period} /></Suspense>
```

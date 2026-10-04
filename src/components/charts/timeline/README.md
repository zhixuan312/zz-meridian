# Timeline

The timeline shows work over months: one bar per item from its start day to its end day, grouped by workstream, on month hairlines with a line for today.

Status: beta

## Anatomy

1. **Month scale**: a 44px row: month names in `text-2xs` `ink-3` along its foot (the year, short, on January and on the first month shown: "Jul ’26"), the Today chip above them.
2. **Today**: a 1px `accent` line through every row, labelled "Today" on the scale in a small accent chip.
3. **Heat row** (optional): one cell per month, the accent at 12% to 100% by the month's value, with its label on the left.
4. **Group head**: the workstream in `t-eyebrow`, 16px above its first row.
5. **Rows**: a label column (7rem, 11rem from 512px) and a 36px plot row with a 1px `line` hairline under it.
6. **Bar**: 10px tall, `radius-full`, at least 6px wide, from the start day to the end of the end day.
7. **Screen-reader table**: every item with its group, start and end dates.

## Variants

| Tone | Fill | Use |
|---|---|---|
| `neutral` (default) | `chart-neutral-strong` | Work in the plan |
| `accent` | `accent` | The item in focus, at most one or two |
| `positive`, `warning`, `critical` | status fills | Done, at risk, late, with the word in the label or the record |

## Sizes

The plot is in percent of the span from `from` to `to`, so it fits its container at any width and never scrolls sideways. The label column is 7rem under 512px of its own width and 11rem from there.

Leave `from` and `to` out and the span is the items' own extent. A roadmap usually wants the other thing: a fixed planning window — this half-year and the next — so the same rows sit in the same place from week to week, and an item that starts before the window or runs past it is clipped and squared off (see Outside the span, below).

## States

| State | Spec |
|---|---|
| Rest | as above |
| Linked | an item with `href` makes its label a link (`row-link`: an underline draws in on hover) |
| Outside the span | a bar is clipped to the span and the side that continues is squared off (`rounded-l-none` when it started before `from`, `rounded-r-none` when it ends after `to`), so work that runs past the window does not read as work that began at its edge; Today is drawn only when it falls inside |

## Behaviour

Static: no cursor, no zoom. The label is the item's link; the bar is drawn for the eye and carries its dates in a title.

## Surfaces

- **Console**: a full-width card, or a 2/3 cell on a wide screen.
- **Mobile**: the label column narrows and month names stay short; a phone reads a quarter or two well.
- **Embed**: same, inline at the host's width; keep the span to a quarter so bars stay wide enough to read.

## Agents

An agent may read the items and the span; a change of dates is a Proposal ("Move Gateway v5 to start 16 Nov"), never a drag.

## Accessibility

- The plot is decorative (`aria-hidden`); the screen-reader table lists every item with its group and dates, and each linked label is a real link in the tab order.
- Contrast: bars are `chart-neutral-strong`, the accent or a status fill, each at least 3:1 on `surface` in both themes; month labels are `ink-3` text.

## Content

- Labels name the work, not the ticket: "Regional failover", not "PLAT-1432". Months are "Oct", "Jan 2027".

## Do and do not

- Do keep one or two accent bars: the accent is the focus, not a category.
- Do not encode a status by colour alone: say it in the label or the linked record.
- Do not show a span longer than a year in one card; split it, or zoom to quarters.

## Implementation

```tsx
import { Timeline } from '@/components/charts/timeline';

<Timeline items={roadmap} from="2026-07-01" to="2027-01-31" today={today} label="Roadmap, July to January" />
```

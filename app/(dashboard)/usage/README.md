# Usage

The Usage page answers how usage and revenue moved over the period chosen, against the period before, and then when traffic comes, where it comes from, and which endpoints are slow.

Status: beta

## Structure

| Row | Split | Content | Pattern |
|---|---|---|---|
| Masthead | | Title, one sentence; Freshness, Period select, Export | Page frame |
| 1 | Tiles | Requests, Error rate, Latency p95 and Revenue for the period, each with its change against the period before and its daily shape; the labels and definitions are the Home's (`HOME_METRICS`) | Metric tile |
| 2 | Full | Requests by weekday and hour (UTC), over the last 30 complete days, with the busiest hour as a badge | Heatmap |
| 3 | 1/2 + 1/2 | Requests by hour of day, the busiest hour highlighted; requests by region with p50 (the bars are the share; a second share bar would say it twice) | Column chart; Bar list |
| 4 | 1/2 + 1/2 | Requests per day and errors per day, on the page's one Meridian: pointing at a day in either reads it in both, and in the four tiles | Trend chart, Column chart, Meridian |
| 5 | Full | Endpoints: requests, error rate, p95 and a latency bar; sortable; p95 first | Table |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the four tiles, the heatmap, two breakdowns, two trends and the endpoint table, as skeletons in their rows. The masthead (kicker, title, sentence, freshness) renders at once on a navigation; the period select, the export and the charts read `?period=` inside their own boundaries and stream in behind it, and their fallbacks hold their space |
| A short period (7 days) | The tiles and row 4 follow the period: seven days, against the seven before. The heatmap, the hours, the regions and the endpoints do not: they hold the last 30 complete days whatever the period |
| No earlier period | A tile says "No earlier period to compare" where its change would be |
| No traffic | The body is one empty state ("No requests in this period") and the period select stays usable |
| Error | The dashboard error screen with Retry |

## Data

- Tiles: `readDays(period)`, which returns the period's totals and those of the same number of days before it; the Home reads the same totals.
- Heatmap: the rows of the `hours` collection, requests for each UTC weekday and hour over the last 30 complete days (`usageFigures()`, which asks `hours:read`). A weekday's row sums to the requests of that weekday's days, so a weekday that falls five times in the 30 days is fuller than one that falls four.
- By hour: the heatmap's columns summed; there is no third collection.
- Regions: the rows of the `regions` collection, requests and median latency, in the order the page draws them (`regions:read`).
- Daily series and totals: `readDays(period)`, the rows of the `days` collection; endpoints: `readEndpoints()`, the rows of `endpoints`.
- The heatmap, the regions and the endpoints are snapshots of the last 30 complete days: they are the same whatever the period, each adds up to the requests of those days, and the context says they do not follow the period chosen.
- Error rate above 1% is critical ink; p95 above one second is warning ink. The longest p95 is the one accent bar.

## Surfaces

- **Console**: as above.
- **Mobile**: rows stack; the heatmap groups hours in threes; the endpoints table drops error rate under 640px and the latency bar under 768px.
- **Embed**: fullscreen only; Usage is exploratory and has no inline summary.

## Agents

An agent drives nothing here; it reads the page through its shared context (decision 0011), built by `usageContext` in `src/views/usage-context.ts`.

### What the agent reads

The period, freshness, the four figures with their change against the period before, the busiest hour of the week and of the day, each region's share with its p50, every endpoint in the table's current order, the day the Meridian points at, and what code found: the same error spike as the Home (by the same code), the slowest and the most failing endpoint against the median, the slowest region, and the weekend's share of a weekday. It says that the weekday-and-hour pattern, the regions and the endpoints are one fixed set of figures that do not follow the period, and that none of them shows a single day.

```text
- POST /v1/files fails most: 1.89% of its requests, 4.3× the 0.44% across endpoints. Evidence: /requests?q=%2Fv1%2Ffiles
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).
- **Handoff:** Ask on Errors per day hands the pointed day, or the period, to the assistant: "Why did errors change on 22 Sept 2026?"

## Accessibility

- Every chart carries a screen-reader table of its numbers; the heatmap's cells name their weekday and hour.
- Sorting uses `aria-sort` on the column heads.

## Content

- The four tiles carry the Home's labels, so a figure has one name on both pages.
- Card titles are questions answered plainly: "When requests come", "By region".
- Times are UTC and say so once, in the heatmap's description.

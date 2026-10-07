# Analytics

The Analytics page answers when traffic comes, where it comes from, and which endpoints are slow, for the period chosen.

Status: beta

## Structure

| Row | Split | Content | Pattern |
|---|---|---|---|
| Masthead | | Title, one sentence; Freshness, Period select, Export | Page frame |
| 1 | Full | Requests by weekday and hour (UTC), with the busiest hour as a badge | Heatmap |
| 2 | 1/2 + 1/2 | Requests by hour of day, the busiest hour highlighted; requests by region with p50 (the bars are the share; a second share bar would say it twice) | Column chart; Bar list |
| 3 | 1/2 + 1/2 | Requests per day and errors per day, on one Meridian: pointing at a day in either reads it in both | Trend chart, Column chart, Meridian |
| 4 | Full | Endpoints: requests, error rate, p95 and a latency bar; sortable; p95 first | Table |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the heatmap, two breakdowns, two trends and the endpoint table, as skeletons in their rows. The masthead (kicker, title, sentence, freshness) renders at once on a navigation; the period select, the export and the charts read `?period=` inside their own boundaries and stream in behind it, and their fallbacks hold their space |
| A short period (7 days) | Row 3 shows seven columns; the heatmap still sums every weekday over the period |
| No traffic | The body is one empty state ("No requests in this period") and the period select stays usable |
| Error | The dashboard error screen with Retry |

## Data

- Heatmap: `demoHeatmap()`, requests summed by UTC weekday and hour.
- By hour: the heatmap's columns summed (`requestsByHour()`).
- Regions: `REGION_LATENCY`, requests and median latency.
- Daily series and endpoints: `demoSeries(period)` and `ENDPOINTS`.
- Error rate above 1% is critical ink; p95 above one second is warning ink. The longest p95 is the one accent bar.

## Surfaces

- **Console**: as above.
- **Mobile**: rows stack; the heatmap groups hours in threes; the endpoints table drops error rate under 640px and the latency bar under 768px.
- **Embed**: fullscreen only; Analytics is exploratory and has no inline summary.

## Agents

An agent drives nothing here; it reads the page through its shared context (decision 0011), built by `analyticsContext` in `src/views/analytics-context.ts`.

### What the agent reads

The period, freshness, the busiest hour of the week and of the day, each region's share with its p50, every endpoint in the table's current order, the day the Meridian points at, and what code found: the same error spike as the Overview (by the same code), the slowest and the most failing endpoint against the median, the slowest region, and the weekend's share of a weekday. It says that the weekday-and-hour pattern, the regions and the endpoints are sums over the period, not a day.

```text
- POST /v1/files fails most: 1.88% of its requests, 5.0× the 0.37% across endpoints. Evidence: /requests?q=%2Fv1%2Ffiles
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).
- **Handoff:** Ask on Errors per day hands the pointed day, or the period, to the assistant: "Why did errors change on 22 Sept 2026?"

## Accessibility

- Every chart carries a screen-reader table of its numbers; the heatmap's cells name their weekday and hour.
- Sorting uses `aria-sort` on the column heads.

## Content

- Card titles are questions answered plainly: "When requests come", "By region".
- Times are UTC and say so once, in the heatmap's description.

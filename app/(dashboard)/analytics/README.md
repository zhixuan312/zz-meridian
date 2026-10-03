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
| Loading | The shared skeleton |
| A short period (7 days) | Row 3 shows seven columns; the heatmap still sums every weekday over the period |
| No traffic | Each card shows an empty state ("No requests in this period") and the period select stays usable |
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

Not applicable: an agent answers analytical questions from the Overview and Requests views' shared context and the API, not by driving this page.

## Accessibility

- Every chart carries a screen-reader table of its numbers; the heatmap's cells name their weekday and hour.
- Sorting uses `aria-sort` on the column heads.

## Content

- Card titles are questions answered plainly: "When requests come", "By region".
- Times are UTC and say so once, in the heatmap's description.

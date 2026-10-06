# Overview

The Overview answers "how is the API doing?" for a period: one featured figure with its trend, the three figures that qualify it, where the traffic goes, how it was answered, and what changed.

Status: beta

## Structure

| Row | Split | Pattern | Holds |
|---|---|---|---|
| Masthead | | Page frame | Kicker `ZZ Meridian · Production`, title, one sentence; freshness, period select (7D, 30D, 90D, All), Export |
| 1 | 2/3 | Featured metric with a Trend chart (`fill` height) | Requests in the period at hero size, the change against the previous period, a caption with the daily average and the busiest day, requests per day as an area (errors have their own tile: one chart, one measure) |
| 1 | 1/3 | Three Metric tiles, stacked | Error rate, Latency p95 (both: down is good), Spend (neutral) |
| 2 | 1/2 | Card with a Bar list | The busiest endpoints, the top one in the accent; a footer link to Analytics |
| 2 | 1/2 | Card with a Composition bar and a Trend chart | Responses by status class; latency p95 per day |
| 3 | full | Card with an Activity feed | The five latest changes, people, the system and agents |

Everything in rows 1 and 2 shares one Meridian: point at a day in either chart and the featured figure, the tiles and both charts read that day.

Below 1024px every row stacks: the featured card first, then the tiles (two across from 34rem, one below), then the cards. At 390px the masthead's actions wrap under the title and the period select stays visible; Export is not offered on a phone (`max-sm:hidden`), and the command palette carries destinations and appearance, not the page's actions.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx` beside the page, in the route group `app/(dashboard)/(overview)/` so that it is the Overview's own and not every console route's: skeletons in the shape of these rows, so nothing jumps on arrival. The masthead (kicker, title, sentence, freshness) renders at once on a navigation; the page reads `?period=` inside its own boundaries, so the period select, the export and the figures stream in behind it, and their fallbacks hold their space |
| Empty (no traffic yet) | The body is one card that says "No requests yet" with a link to API keys; no tile or chart is drawn |
| Partial (a series missing) | That tile shows a dash and "Not measured"; the chart breaks its line over missing days |
| Stale | Freshness turns to warning: "Stale · updated 47 min ago" |
| Error | `error.tsx`, inside the shell at the data width, like every page: the title says the view did not load and nothing was changed; one card says retrying usually works, with Retry (primary), a second way out read from `nav` (Check Health where the product has one, the home page where it does not), and the reference |

## Data

From `src/system/fixtures/sample.ts`: `demoSeries(period)` (one point per day, and the previous period for the deltas), `demoTotals(period)`, `ENDPOINTS`, `STATUS_MIX`, `ACTIVITY`. Error rate counts 5xx and 429 over all requests; latency is the median of daily p95s; spend is metered usage before credits.

## Surfaces

- **Console**: as above.
- **Mobile**: one column; the featured chart is 220px tall; tiles two across or one.
- **Embed**: `/embed/overview` (tool `zz_meridian_overview { period }`). Inline: the three main tiles and the requests trend, with Ask on the chart. Fullscreen: these rows under the embed head.

## Agents

The embed view shares the period and its totals, or the day the Meridian points at, with the model. Ask on the trend posts "Why did requests change on <day>?". The Activity feed marks the agent's own changes ("Claude … · for Jonas Weber").

## Embed view

See `app/embed/overview/README.md`.

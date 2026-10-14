# Home

The Home is Main's home: it answers "how is the API doing?" for a period, with one featured figure and its trend, the three figures that qualify it, where the traffic goes and how it was answered, and then summarises the whole product in three quieter regions, Business, Operation and Delivery, each with a way into its detail, before what changed.

Status: beta

## Structure

| Row | Split | Pattern | Holds |
|---|---|---|---|
| Masthead | | Page frame | Kicker `ZZ Meridian · Production`; the title, a sentence about the period's revenue (below), with the page's name kept in the heading; the line under it (below), then who Main is for (`workspaces.main.audience`, read from the declaration); freshness, period select (7D, 30D, 90D, All), Export |
| 1 | 2/3 | Featured metric with a Trend chart (`fill` height) | Requests in the period at hero size, the change against the previous period (no pill when no previous period is kept), a caption with the daily average and the busiest day, requests per day as an area (errors have their own tile: one chart, one measure) |
| 1 | 1/3 | Three Metric tiles, stacked | Error rate, Latency p95 (both: down is good), Revenue (neutral) |
| 2 | 1/2 | Card with a Bar list | The busiest endpoints, the top one in the accent; a footer link to Usage |
| 2 | 1/2 | Card with a Composition bar and a Trend chart | Responses by status class; latency p95 per day |
| 3 | tiles (3) | Three Cards, each a labelled region: a Key value list and a footer of links | Business: customers, how many of each status and plan, and revenue over 30 days; links to Customers and Usage. Operation: the services out of service or degraded and each unresolved incident, or "Every service is operational and nothing is open."; a link to Services. Delivery: open and waiting tickets, failing verifications, and live, ready and in-testing releases; links to Tickets, Tests and Releases |
| 4 | full | Card with an Activity feed | The five latest changes, people, the system and agents |

### The title

The page is headed by what its revenue says for the period chosen, worked out by `homeTitle` in `src/views/home-context.ts`. The heading reads "Home: " before it, out of sight, and the top bar shows "Home".

| When | The title |
|---|---|
| The period is a record: its revenue is higher than that of every earlier whole period of its length, and at least six such periods are kept (`facts.recordNeedsPeriods` in `src/app.config.ts`) | "The highest 30 days yet: $3,300,438.74", then ", the 3rd record in a row" when the periods before it were each a record too. A record's title has no clause about the services |
| Otherwise, with a period before it | "Revenue is up 25.8% on the 90 days before" ("down"; "Revenue is level with the 90 days before" when the change rounds to 0.0%), then the services' clause |
| No period comes before it (All) | "$27,710,624.39 of revenue in 360 days", then the services' clause |
| The services' clause | ", and every service is operational"; ", and Inference API is degraded" (or "is down") for the one service in the worst state any is in; ", and 2 services are degraded" for several. Left out when the services could not be read |
| The history could not be read, or no day is kept | The page is headed by its name |

In the sample the four periods read "The highest 7 days yet: $810,137.13", "The highest 30 days yet: $3,300,438.74, the 3rd record in a row", "Revenue is up 25.8% on the 90 days before, and Inference API is degraded" and "$27,710,624.39 of revenue in 360 days, and Inference API is degraded". 90 days and All state no record: 360 days hold four whole periods of 90 and one of 360, fewer than a record needs.

### The line under the title

One line, worked out by `homeLine` in `src/views/home-context.ts`: the customers that have not left, the period's requests and their change, gross margin for a person who may read what compute cost, and the services, each one that is not operational named with its state, those down first. Counts are written at a glance (`formatCompact`). In the sample at 30 days an Owner reads "320 customers, 1.1B requests in 30 days (up 4.7%), a gross margin of 62.4%, and Inference API is degraded." and a Member or a Viewer the same line without the margin clause. A clause whose figures could not be read is left out. What is wrong today is said here whatever the title says: a record's title has no clause about the services.

The figures in the regions are of the whole collection and are worked out by the functions their own pages use (`customerFigures`, `ticketCounts`, `latestRuns`, `releaseFigures`); a figure that has a filter on its page links to the list it counts (open tickets to the open filter), and one that has none is plain text. Everything in rows 1 and 2 shares one Meridian: point at a day in either chart and the featured figure, the tiles and both charts read that day.

Below 1024px every row stacks (the three regions are three across from 48rem of the row's own width, and one below it): the featured card first, then the tiles (two across from 34rem, one below), then the cards. The title has a row to itself at every width, and the freshness and the actions stand beside the sentence under it. At 390px the actions wrap under that sentence: the period select, then Export. A page's actions are offered on every width, as the request log's export is: a person on a phone may want the CSV too (issue #13).

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx` beside the page, in the route group `app/(dashboard)/(home)/` so that it is the Home's own and not every console route's: skeletons in the shape of these rows under a heading that holds "Home", read out and not drawn, and the sentence's block (`LoadingPage` with `sentence`), so nothing jumps on arrival. The masthead (kicker, heading, sentence, freshness) renders at once on a navigation; the page reads `?period=` inside its own boundaries, so the title, the period select, the export and the figures stream in behind it, and their fallbacks hold their space |
| Title on its way | The heading is in the first HTML: it holds "Home", read out and not drawn, and two bars in the block the sentence will take, so nothing under it moves when the sentence arrives. Until the line under it arrives, the block holds who Main is for |
| History not read | The days a record is worked out from could not be read: the page is headed "Home", at the page-title size, the rest of the page stands, and the context says the history could not be read |
| Empty (no traffic yet) | The traffic rows are one card that says "No requests yet" with a link to API keys; no tile or chart is drawn. The three regions still draw beneath it |
| Region unavailable | A region whose read failed says "The business summary is unavailable" (or operation, or delivery) and draws neither a figure nor a link; the other regions and the rest of the page are unaffected |
| All time (no previous period) | The period is every complete day kept, and nothing comes before it: the featured figure draws no change pill, and each tile says "No earlier period to compare" where its change would be. Nothing is compared with zero |
| Partial (a series missing) | That tile shows a dash and "Not measured"; the chart breaks its line over missing days |
| Stale | Freshness turns to warning: "Stale · updated 47 min ago" |
| Error | `error.tsx`, inside the shell at the data width, like every page: the title says the view did not load and nothing was changed; one card says retrying usually works, with Retry (primary), a second way out read from `nav` (Check Services where the product has one, the home page where it does not), and the reference |

## Data

Every figure is read on the server by the Home tool's read (`homeTool` in `src/views/tools.ts`), which needs every grant it reads (`FEATURES.home.needs`: the days, the usage by model, the models, compute, customers, services, incidents, tickets, verifications and releases, and, while the body below draws them, the endpoints, the responses and the activity; neither members nor keys nor what compute cost); a person lacking one is refused before anything is read. Each collection is read apart from the others through `read()` or `readAll()`, so one that cannot be read leaves its part saying so (`unread` on the page's data names it) and the rest standing. `homeData` in `src/views/home-parts.ts` turns the rows into what the parts draw: figures, lines and the points of their charts, never a row of the customers, the usage, the compute or its cost.

- **The period's figures** come from `readDays(period)`: the complete days counted back from yesterday, their totals and those of the same number of days before, and the day in progress on its own, counted in nothing. Revenue (a day's average and the best day), tokens served, requests and the days inside the band (`steady` with `facts.band`) are of those days. Compute in use is the GPU-hours used over those provisioned (`gpus × 24`) of the `compute` rows of the same days, with the fullest region; what we sell is the `usage` rows' revenue by model over the same days, the largest first.
- **What compute cost** is read only when the person may read it: the read asks `can(scope, 'costs', 'read')` once, the question `read()` and the assistant's query ask, and reads `costs` only on a yes. Then Compute cost is the period's `compute` summed, and Gross margin is revenue less compute cost, over revenue, over the same complete days, each with its change. For anyone else the page's data has no key that names a cost or a margin, the line under the title has no margin clause, and the context says neither: nothing stands in their place.
- **The year** comes from every complete day kept (`readDays('all')`): whole windows of the period's length counted back from yesterday (51 of 7 days, 12 of 30, 4 of 90, one of All), each with its requests, the median day's p95 and its revenue, and the year card's title from the first window to the latest. The title of the page, its record and the facts of a year are worked out from the same days, on the server, and the page's client is handed the sentences and never the history.
- **The customers** are every customer that has not left: how many, how many active, on a trial and past due, and the `all` fact (`allSentMore` in `src/views/customers-context.ts`, the one Revenue is headed by) as the tile's finding when it holds.
- **Business and Engineering** each hand four lines of a label and a figure (a figure that could not be read is a dash) and one counted fact: Revenue, Customers, On a trial and Past due with the `all` fact or how many customers sent more this week than last; Services operational, Incidents open, Releases in testing and Tickets open with the days inside the band over every complete day kept.
- **Worth knowing across the company** is at most four lines, in this order, each with the address where it is handled: the newest incident nobody has resolved (`/engineering`); the largest customer paying `facts.concentrationAt` or more of the revenue of the last 30 complete days, whatever the period, with how many others do (`/customers/<id>`; no other line states a customer's share); a release that has passed every required check and has not gone out, as the Releases page stages it (`/releases?state=ready`); and the customers past due, with what they were billed. With none, one line says so.

Until the page draws these parts, the body draws the rows above from the same data: the endpoints, the responses, the activity and Main's three summaries (`readMainSummary()` in `src/data/main.ts`), which the context no longer states. Error rate counts 5xx and 429 over all requests; latency is the median of daily p95s; revenue is what customers were billed for metered usage, before credits, and over 30 days it is the customers' revenue on Customers and Revenue to the cent.

## Surfaces

- **Console**: as above.
- **Mobile**: one column; the featured chart is 220px tall; tiles two across or one.
- **Embed**: `/embed/home` (tool `zz_meridian_home { period }`). Inline: the three main tiles and the requests trend, with Ask on the chart. Fullscreen: these rows, the three regions among them, under the embed head.

## Agents

The page shares one context with both agents (decision 0011), built by `homeContext` in `src/views/home-context.ts` from the figures the page draws. The Activity feed marks the agent's own changes ("Claude … · for Jonas Weber").

### What the agent reads

The period with the dates of the complete days it covers and freshness, then the figures, each with its unit, its change against the previous period and its definition (the tiles' `hint`s come from the same `HOME_METRICS` and `COMPANY_METRICS`): first the head's (the customers by status, requests, gross margin for an Owner and an Admin, the services), then revenue and a day's average and best, tokens served, the days inside the band, compute in use with the fullest region, compute cost for an Owner and an Admin, what we sell by model, and Engineering's releases in testing and tickets open. Its insights lead with the title the page is headed by, word for word; then the year card's title with the latest window's p95, the facts of a year, each under its rule's kind (`factInsight`), the `all` fact, and the lines worth knowing with their addresses. In the sample, as an Owner at 30 days:

```text
- The highest 30 days yet: $3,300,438.74, the 3rd record in a row
- Requests grew 105.7% in a year, and p95 stayed between 277 and 294 ms (the latest window at 289ms).
- Total: 9,600,136,928 requests answered in 360 days, from 08 Oct 2025 to 02 Oct 2026, 99.62% of them without an error.
- Total: $27,710,624.39 billed to customers in 360 days, from 08 Oct 2025 to 02 Oct 2026.
- Record: The highest day of requests yet: 44,940,181, on 01 Oct 2026.
- First: Requests first passed 25.0M in a day on 02 Jan 2026; 192 days have passed it since.
- Record: The highest weekday average yet: 42,815,463 requests a day, in the week to 02 Oct 2026.
- All: 24 of 24 Enterprise customers sent more requests in the last 7 days than in the 7 before.
- Elevated latency on Inference API in eu-west-1: monitoring, open for 3.2h, with Jonas Weber. Evidence: /engineering
- Northwind Labs pays 12.4% of the revenue of the last 30 days. Evidence: /customers/northwind-labs
- Inference API v2.9.0 passed every required check and has not gone out. Evidence: /releases?state=ready
- 10 customers are past due, billed $41,916.95 in the last 30 days. Evidence: /customers?status=past+due
Unknown:
- 03 Oct is in progress and counted in no total.
```

With a day pointed at, the line about that day (against the same weekday and the period's median) takes the place of the facts of a year, so the text keeps to its budget of 2,600 characters at every period. It does not carry what the context already states another way: the team cards' lines that restate a figure, each window of the year's and the revenue's charts (the year's title and the latest window stand for them), the endpoints, the responses, the error spikes and the activity. A part that could not be read is said once, "The usage by model could not be read, so what it states is missing, not zero."; when the history could not be read it says "The history could not be read, so this page is headed by its name and states no record, first or total.", and with All "No previous period is kept, so no figure has a change.". The context's own title stays "Home", the page's name.

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **Handoff:** Ask on the featured card hands the period, or the day the Meridian points at, to the assistant: "What stands out in requests, errors and latency over the last 30 days, and why?"

## Embed view

See `app/embed/home/README.md`.

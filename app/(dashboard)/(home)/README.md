# Home

The Home is Main's home: it answers "how is the API doing?" for a period, with one featured figure and its trend, the three figures that qualify it, where the traffic goes and how it was answered, and then summarises the whole product in three quieter regions, Business, Operation and Delivery, each with a way into its detail, before what changed.

Status: beta

## Structure

| Row | Split | Pattern | Holds |
|---|---|---|---|
| Masthead | | Page frame | Kicker `ZZ Meridian · Production`; the title, a sentence about the period's revenue (below), with the page's name kept in the heading; one sentence, which says which services are not operational when any is and otherwise what the page answers, and ends with who Main is for (`workspaces.main.audience`, read from the declaration); freshness, period select (7D, 30D, 90D, All), Export |
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

What is wrong today is said at the head whatever the title says. When a service is not operational the sentence under the title begins with it, "Inference API is degraded.", in place of "Traffic, reliability and revenue across every endpoint, for the period you choose."; services that are down are named before those that are degraded, and more than three in a state are counted.

The figures in the regions are of the whole collection and are worked out by the functions their own pages use (`customerFigures`, `ticketCounts`, `latestRuns`, `releaseFigures`); a figure that has a filter on its page links to the list it counts (open tickets to the open filter), and one that has none is plain text. Everything in rows 1 and 2 shares one Meridian: point at a day in either chart and the featured figure, the tiles and both charts read that day.

Below 1024px every row stacks (the three regions are three across from 48rem of the row's own width, and one below it): the featured card first, then the tiles (two across from 34rem, one below), then the cards. The title has a row to itself at every width, and the freshness and the actions stand beside the sentence under it. At 390px the actions wrap under that sentence: the period select, then Export. A page's actions are offered on every width, as the request log's export is: a person on a phone may want the CSV too (issue #13).

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx` beside the page, in the route group `app/(dashboard)/(home)/` so that it is the Home's own and not every console route's: skeletons in the shape of these rows under a heading that holds "Home", read out and not drawn, and the sentence's block (`LoadingPage` with `sentence`), so nothing jumps on arrival. The masthead (kicker, heading, sentence, freshness) renders at once on a navigation; the page reads `?period=` inside its own boundaries, so the title, the period select, the export and the figures stream in behind it, and their fallbacks hold their space |
| Title on its way | The heading is in the first HTML: it holds "Home", read out and not drawn, and two bars in the block the sentence will take, so nothing under it moves when the sentence arrives. The sentence under it reads what the page answers until the services are known |
| History not read | The days a record is worked out from could not be read: the page is headed "Home", at the page-title size, the rest of the page stands, and the context says the history could not be read |
| Empty (no traffic yet) | The traffic rows are one card that says "No requests yet" with a link to API keys; no tile or chart is drawn. The three regions still draw beneath it |
| Region unavailable | A region whose read failed says "The business summary is unavailable" (or operation, or delivery) and draws neither a figure nor a link; the other regions and the rest of the page are unaffected |
| All time (no previous period) | The period is every complete day kept, and nothing comes before it: the featured figure draws no change pill, and each tile says "No earlier period to compare" where its change would be. Nothing is compared with zero |
| Partial (a series missing) | That tile shows a dash and "Not measured"; the chart breaks its line over missing days |
| Stale | Freshness turns to warning: "Stale · updated 47 min ago" |
| Error | `error.tsx`, inside the shell at the data width, like every page: the title says the view did not load and nothing was changed; one card says retrying usually works, with Retry (primary), a second way out read from `nav` (Check Services where the product has one, the home page where it does not), and the reference |

## Data

The regions come from `readMainSummary()` in `src/data/main.ts`, which reads every customer, service, incident, ticket, verification run and release through `read()`, and the pure functions in `src/views/main-summary.ts` that build each region from the rows. The page needs every grant it reads (`FEATURES.home.needs`) and neither members nor keys: a person lacking one is refused before anything is read. The title and the total the context states are worked out in the same read, on the server, from every complete day kept (`readDays('all')`) and the services as they are now, and the page's client is handed the sentences and never the history (`head` and `unwell` on the page's data). The traffic rows come from the Home tool's read (`homeTool` in `src/views/tools.ts`): `readDays(period)` over the `days` collection, `readEndpoints()` and `readResponses()` (the `endpoints` and `responses` collections, each a snapshot of the last 30 complete days whatever the period) and `readActivity()`. A period is complete days counted back from yesterday: `readDays` returns the period's days (the latest 7, 30 or 90, or every complete day kept for All), the totals of those days and of the same number before them for the changes (null when no day comes before, as with All), and the day in progress on its own. Every figure, change, median, busiest day and finding on the page comes from the complete days; the day in progress is counted in none of them, and the charts draw the complete days. Error rate counts 5xx and 429 over all requests; latency is the median of daily p95s; revenue is what customers were billed for metered usage, before credits, and over 30 days it is the customers' revenue on Customers and Revenue to the cent. The business summary counts the customers that have not left.

## Surfaces

- **Console**: as above.
- **Mobile**: one column; the featured chart is 220px tall; tiles two across or one.
- **Embed**: `/embed/home` (tool `zz_meridian_home { period }`). Inline: the three main tiles and the requests trend, with Ask on the chart. Fullscreen: these rows, the three regions among them, under the embed head.

## Agents

The page shares one context with both agents (decision 0011), built by `homeContext` in `src/views/home-context.ts` from the figures the page draws. The Activity feed marks the agent's own changes ("Claude … · for Jonas Weber").

### What the agent reads

The period with the dates of the complete days it covers, freshness, the four figures, each with its change against the previous period and its definition (the tiles' `hint`s come from the same `HOME_METRICS`), the day the Meridian points at against the same weekday and the period's median, and its insights. The first is the title the page is headed by, word for word; the second is the total of requests answered over every complete day kept, the `total` rule's own line (`src/lib/facts.ts`) under its kind's name, with the address that shows it; then what code computed in the period:

```text
- The highest 30 days yet: $3,300,438.74, the 3rd record in a row
- Total: 9,600,136,928 requests answered in 360 days, from 08 Oct 2025 to 02 Oct 2026. Evidence: /?period=all
- Error rate was 3.2× to 3.4× the period's median of 0.37% on 21 and 22 Sept (1.19%, 1.27%); no other day passed 1.1×.
- Latency p95 rose on the same days: 464ms and 498ms against a median of 290ms.
Unknown:
- Nothing is recorded between 20 Sept and 23 Sept: no incident and no activity event, so the rise is unexplained.
```

The context's own title stays "Home", the page's name. When the history could not be read it carries neither the sentence nor the total, and says "The history could not be read, so this page is headed by its name and states no record, first or total.".

It also carries Main's figures under the labels their pages use, as plain numbers: `Customers`, with `By status`, `By plan` and `Revenue, last 30 days` as the Business region draws them, `Open tickets`, `Waiting tickets`, `Failing now`, `Live versions`, `Ready to release` and `In testing`, and which services are out of service or degraded and which incidents are unresolved (or that every service is operational and none is open). A region that could not be read is told as unknown, missing and not zero.

It also says which endpoint contributes most errors, what a weekend day runs at against a weekday, the share of 4xx and 5xx responses and that most 4xx are not in the error rate, which incident sits beside a spike when one does (in 90 days: "Upload failures for files over 50 MB"), and, from the day `readDays` hands over on its own, that today is in progress and counted in no total ("03 Oct is in progress and counted in no total."). With All it gives no figure a change and says "No previous period is kept, so no figure has a change."

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **Handoff:** Ask on the featured card hands the period, or the day the Meridian points at, to the assistant: "What stands out in requests, errors and latency over the last 30 days, and why?"

## Embed view

See `app/embed/home/README.md`.

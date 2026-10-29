# Home

The Home is Main's home: the company's page. For a period it states what the company sells and earns, who buys it, how much it served and how steadily, and what it costs to run, then a year counted in whole periods, what is sold, the two teams at a glance and what is worth knowing across the company, each with the way to where it is handled.

Status: beta

## Structure

Nine parts, in this order. Every chart is the card named, and the page has one Featured metric.

| Part | Split | Pattern | Holds |
|---|---|---|---|
| 1. Head | | Page frame | Kicker `ZZ Meridian · Production`; the title, a sentence about the period's revenue (below), with the page's name kept in the heading; the line under it (below), then who Main is for (`workspaces.main.audience`, read from the declaration); freshness, period select (7D, 30D, 90D, All), Export (the period's days as a CSV) |
| 2. Revenue | 2/3 | Featured metric with a Trend chart (`fill` height) | Revenue in the period, its change on the period before (`intent="up"`: for a company that sells, revenue rising is good; no pill when no period comes before), a caption with a day's average and the best day, the record as its finding when one holds, and revenue a day as an area with the day in progress `running`; Ask as its action |
| 3. Three tiles | 1/3, stacked | Three Metric tiles | `Customers` (the count; active, on a trial and past due as its line; the `all` fact as its finding when it holds), `Tokens served` (the count, in trillions when it is one, and in how many requests), `Requests` (with its change and a point a day) |
| 4. A row of tiles | tiles | Two or four Metric tiles | `Days inside the band` (N, of M complete days), `Compute in use` (GPU-hours used of those provisioned, its change in points, the fullest region as its finding), then, for an Owner and an Admin, `Compute cost` (with its change) and `Gross margin` (its change in points). For anyone else the row holds two tiles and nothing in the place of the others |
| 5. The year | full | Card with a Column chart and a Trend chart, on one Meridian of their own | Titled by the year's sentence (below); requests a window, the latest highlighted, and the median day's p95 a window with the windows' median as the dashed baseline. Both from zero, both on the windows' cursor |
| 6. A year, counted | full | Card with a list | At most five facts over every complete day kept, whatever the period: each a line of the list, its kind (Total, Record, First) and its rule's own line, which carries its figure and its date |
| 7. Revenue a period, What we sell | 1/2 | Card with a Column chart; card with a Composition bar | Revenue a window over the year's windows, the latest highlighted, on the year's cursor; the period's revenue by model in the categorical slots 1 to 4, the largest first; with more than four models the rest are one part after them, "Other", neutral, so every share in the legend is of all the period's revenue |
| 8. Business, Engineering | 1/2 | Two Cards, each a Key value list, one counted fact and a footer link | Business: Revenue, Customers, On a trial, Past due, and the `all` fact or how many customers sent more this week than last; a link to `/business`. Engineering: Services operational (N of M), Incidents open, Releases in testing, Tickets open, and the days inside the band over every complete day kept; a link to `/engineering` |
| 9. Worth knowing across the company | full | Card with a list | At most four lines, in their order, each a link to the page where it is handled (below); with none, one line saying so |

No other chart card is on Home: the busiest endpoints, the responses by status class, the Error rate and Latency p95 tiles and the activity feed are not. The Bar list and the Status list are drawn on Usage, Now and Services. No part before the two team cards links to `/business` or `/engineering`. The nine parts are one Suspense boundary, the page's body: a part with a boundary of its own would be written after the others.

### The year's card

Its title states the year: "Requests grew 105.7% in a year, and p95 stayed between 277 and 294 ms" in the sample at 30 days, from the first window to the latest and over the windows' p95 in whole milliseconds; with fewer than two windows, as with All, "Requests and latency, a period at a time". The sentence starts at the first window that begins on or after the first day with a request (`yearLine` in `src/logic/home-parts.ts`); a quiet day after that keeps its window. A window that holds the first request after days with none is not whole: its requests are short and its median day may have no p95, so measured from it flat traffic would read as growth and p95 as 0. When the days kept begin before the first request, the sentence grows from the first whole window and names it ("Requests grew … from the 30 days to 14 Sept 2026, and p95 stayed between …", a form the sample, whose first day has requests, never takes), its p95 range is over the windows from there, and with fewer than two windows from that one to the latest it is the sentence for fewer than two windows. A change that rounds to 0.0% reads "Requests held level". Now states the same sentence, at 30 days, among the facts of the band. A window is a whole period of the period's length counted back from yesterday over every complete day kept: 51 of 7 days, 12 of 30, 4 of 90, one of All. Its line says how long a column is. Revenue a period takes the same windows and the same cursor: point at a window in either chart and the three read it.

### The title

The page is headed by what its revenue says for the period chosen, worked out by `homeTitle` in `src/logic/home-context.ts`. The heading reads "Home: " before it, out of sight, and the top bar shows "Home".

| When | The title |
|---|---|
| The period is a record: its revenue is higher than that of every earlier whole period of its length, and at least six such periods are kept (`facts.recordNeedsPeriods` in `src/app.config.ts`) | "The highest 30 days yet: $3,300,438.74", then ", the 3rd record in a row" when the periods before it were each a record too. A record's title has no clause about the services |
| Otherwise, with a period before it | "Revenue is up 25.8% on the 90 days before" ("down"; "Revenue is level with the 90 days before" when the change rounds to 0.0%), then the services' clause |
| No period comes before it (All) | "$27,710,624.39 of revenue in 360 days", then the services' clause |
| The services' clause | As the last clause, ", and every service is operational". As its own sentence after the figures when something is wrong, ". Inference API is degraded" (or "is down") for the one service in the worst state any is in, ". 2 services are degraded" for several, and ". No service is monitored yet" for a read that returned none: the one thing a person may have to act on is not the fourth item of a list. Left out when the services could not be read |
| The history could not be read, or no day is kept | The page is headed by its name |

In the sample the four periods read "The highest 7 days yet: $810,137.13", "The highest 30 days yet: $3,300,438.74, the 3rd record in a row", "Revenue is up 25.8% on the 90 days before, and Inference API is degraded" and "$27,710,624.39 of revenue in 360 days, and Inference API is degraded". 90 days and All state no record: 360 days hold four whole periods of 90 and one of 360, fewer than a record needs.

### The line under the title

One line, worked out by `homeLine` in `src/logic/home-context.ts`: the customers that have not left, the period's requests and their change, and gross margin for a person who may read what compute cost, with the services last. Counts are written at a glance (`formatCompact`). A service that is not operational, or a product monitoring none, is the line's own second sentence, after the figures: on a day whose title states a record it is the only place on the page that says what is wrong today. In the sample at 30 days an Owner reads "320 customers, 1.1B requests in 30 days (up 4.7%), and a gross margin of 62.4%. Inference API is degraded." and a Member or a Viewer the same line without the margin clause. A clause whose figures could not be read is left out.

The revenue card and the tiles share the page's Meridian: its dates are the period's complete days, then the day in progress. Point at a day in the revenue chart and the featured figure reads it; at the day in progress its pill says "so far". A tile reads the pointed day only when its points are the Meridian's dates (the Metric tile's rule). While a day is in progress, the Requests, Compute cost and Gross margin tiles have a point for each complete day and none for the day in progress, one short of the Meridian's dates, so they keep the period's figure and a part-day is never read as a whole one. When the latest day kept is complete, no day is in progress, their points are the Meridian's dates, and pointing at a day reads it in those three tiles too.

Below 1024px every row stacks: the revenue card first, then its three tiles (three across from 768px, one below), then each row. Every row of tiles is one column at 390px, the row of two or four counted from its own width (two across from 34rem, four from 62rem), and nothing scrolls sideways. The title has a row to itself at every width, and the freshness and the actions stand beside the sentence under it. At 390px the actions wrap under that sentence: the period select, then Export. A page's actions are offered on every width, as the request log's export is: a person on a phone may want the CSV too (issue #13).

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx` beside the page, in the route group `app/(dashboard)/(home)/` so that it is the Home's own and not every console route's: the nine parts' shapes under a masthead that takes the room the page's takes, so the body does not move when the page arrives. `LoadingPage` draws the kicker, the heading that holds "Home", read out and not drawn, with the sentence's block (`sentence`), the room of the line under the title (`lead`, a `LeadRoom`: three lines of the lead at its widest, up to six on a phone, enough for an Owner's line and who Main is for), the freshness, and the period control and Export where they will stand, as wide as they are and out of sight (`PeriodActionsRoom` in `src/views/period-actions.tsx`). Under `refusal: 'absent'` the masthead names nothing (`gatedLoading`), since it is drawn before the gate answers. |
| Title on its way | The heading is in the first HTML: it holds "Home", read out and not drawn, and two bars in the block the sentence will take, so nothing under it moves when the sentence arrives. The line under it waits in the same `LeadRoom` it arrives in, and the actions in the same room as the loading state's, so the masthead keeps one height from the first frame to the last |
| History not read | The days a record is worked out from could not be read: the page is headed "Home", at the page-title size, the year's card, A year, counted and Revenue a period each say the history could not be read, the rest of the page stands, and the context says so |
| Empty (no complete day kept) | The body is one card that says "No requests have arrived yet" with a link to API keys; no tile, chart or figure is drawn, and the page is headed by its name |
| Partial (a read failed) | That part's card, with its title, says what could not be read ("The usage by model could not be read"; What we sell needs the usage by model and the models, and names whichever could not be read, or both) in its own place, and every other part stands; a tile whose figure could not be read shows a dash and "Could not be read". Worth knowing leaves out the lines whose reads failed; when nothing could be said and something was not read, it says so. The context says what could not be read |
| All time (no previous period) | The period is every complete day kept, and nothing comes before it: the featured figure draws no change pill, and each tile with a change (Requests, Compute cost, Compute in use and Gross margin) says "No earlier period to compare" where its change would be. Nothing is compared with zero |
| Stale | Freshness turns to warning: "Stale · 47 min ago" |
| Error | `error.tsx`, inside the shell at the data width, like every page: the title says the view did not load, and the line under it that nothing was changed; one card says retrying usually works, with Retry (primary), a second way out read from `nav` (Check Services where the product has one, the home page where it does not), and the reference |

## Data

Every figure is read on the server by the Home tool's read (`homeTool` in `src/logic/tools.ts`), which needs every grant it reads (`FEATURES.home.needs`: the days, the usage by model, the models, compute, customers, services, incidents, tickets, verifications and releases; neither members nor keys nor what compute cost); a person lacking one is refused before anything is read. Each collection is read apart from the others through `read()` or `readAll()`, so one that cannot be read leaves its part saying so (`unread` on the page's data names it) and the rest standing. `homeData` in `src/logic/home-parts.ts` turns the rows into what the parts draw: figures, lines and the points of their charts, never a row of the customers, the usage, the compute or its cost.

- **The period's figures** come from `readDays(period)`: the complete days counted back from yesterday, their totals and those of the same number of days before, and the day in progress on its own, counted in nothing. Revenue (a day's average and the best day), tokens served, requests and the days inside the band (`steady` with `facts.band`) are of those days. Compute in use is the GPU-hours used over those provisioned (`gpus × 24`) of the `compute` rows of the same days, with the fullest region; what we sell is the `usage` rows' revenue by model over the same days, the largest first, each with its share of the whole; past the four slots (`SOLD_SLOTS` in `src/logic/home-context.ts`) the rest are summed into one part, "Other", which the page draws and the context states with the same shares.
- **What compute cost** is read only when the person may read it: the read asks `can(scope, 'costs', 'read')` once, the question `read()` and the assistant's query ask, and reads `costs` only on a yes. Then Compute cost is the period's `compute` summed, and Gross margin is revenue less compute cost, over revenue, over the same complete days, each with its change. For anyone else the page's data has no key that names a cost or a margin, the line under the title has no margin clause, and the context says neither: nothing stands in their place.
- **The year** comes from every complete day kept (`readDays('all')`): whole windows of the period's length counted back from yesterday (51 of 7 days, 12 of 30, 4 of 90, one of All), each with its requests, the median day's p95 and its revenue, the windows' median p95 for the latency chart's baseline, and the year card's title from the first window to the latest. The title of the page, its record and the facts of a year are worked out from the same days, on the server, and the page's client is handed the sentences and never the history.
- **The customers** are every customer that has not left: how many, how many active, on a trial and past due, and the `all` fact (`allSentMore` in `src/logic/customers-context.ts`, the one Revenue is headed by) as the tile's finding when it holds.
- **Business and Engineering** each hand four lines of a label and a figure (a figure that could not be read is a dash) and one counted fact: Revenue, Customers, On a trial and Past due with the `all` fact or how many customers sent more this week than last; Services operational, Incidents open, Releases in testing and Tickets open with the days inside the band over every complete day kept.
- **Worth knowing across the company** is at most four lines, in this order, each with the address where it is handled: the newest incident nobody has resolved (`/engineering`); the largest customer paying `facts.concentrationAt` or more of the revenue of the last 30 complete days, whatever the period, with how many others do (`/customers/<id>`; no other line states a customer's share); a release that has passed every required check and has not gone out, as the Releases page stages it (`/releases?state=ready`); and the customers past due, with what they were billed. With none, one line says so.

The page's client is handed these figures and lines and works nothing out beyond a change against the period before. Revenue is what customers were billed for metered usage, before credits, and over 30 days it is the customers' revenue on Customers and Revenue to the cent; latency is the median day's p95.

The body registers the ten collections its feature needs (`days`, `usage`, `models`, `compute`, `incidents`, `customers`, `services`, `tickets`, `tests` and `releases`) with `useLive` (`src/lib/live.ts`), before the empty state returns, so the page is drawn fresh in every state without a reload. It registers those and no others, because `GET /api/live` answers 403 for any name the caller may not read, and a person who reaches the page may read exactly what its feature needs: `costs`, which the page reads only for a person who may, is not registered. Nothing here writes, so no change hints; the page resyncs on open, on reconnect and on the safety poll.

## Surfaces

- **Console**: as above.
- **Mobile**: one column, the revenue card first; the featured chart is 220px tall; every row of tiles one column at 390px.
- **Embed**: `/embed/home` (tool `zz_meridian_home { period }`). Inline: the revenue card and its three tiles, with Ask on the card. Fullscreen: parts 2 to 9 under the embed head. Compute cost and gross margin follow the page's rule on both.

## Agents

The page shares one context with both agents (decision 0011), built by `homeContext` in `src/logic/home-context.ts` from the figures the page draws. The page states each fact of a year in the line the context carries, under the same kind, so a person and an agent read one sentence. The activity feed, which marks an agent's own changes, is not on Home: it is one team's detail, and it moves to Now.

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

With a day pointed at, the line about that day (against the same weekday and the period's median) takes the place of the facts of a year, so the text keeps to its budget of 2,600 characters at every period. It does not carry what the context already states another way: the team cards' lines that restate a figure, each window of the year's and the revenue's charts (the year's title and the latest window stand for them), the endpoints, the responses and the activity. A part that could not be read is said once, "The usage by model could not be read, so what it states is missing, not zero."; when the history could not be read it says "The history could not be read, so this page is headed by its name and states no record, first or total.", and with All "No previous period is kept, so no figure has a change.". The context's own title stays "Home", the page's name.

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **Handoff:** Ask on the revenue card hands the period, or the day the Meridian points at, to the assistant: "What stands out in revenue over the last 30 days, and why?"

### What the agent does here

Protagonist: Revenue.

The page marks the revenue card `data-protagonist="Revenue"` on a wrapper that is itself the row's wide grid item, its card stretched to fill it; its Ask is the one the Handoff line names.

- "Which model brought the most revenue in the last 90 days, and how did that move?" — the usage's revenue over 90 complete days, by model, against the 90 days before
- "How did gross margin move in each of the latest eight weeks of the last 90 days?" — the days' gross margin over 90 complete days, a week at a time, the latest eight, worked out against what compute cost in the same weeks
- "How many customers are on each plan, and what did each plan pay?" — the customers that have not left and their revenue over the last 30 complete days, by plan
- "How full were the GPUs in each region over the last 90 days?" — compute in use over 90 complete days, by region, against the 90 days before

Home's prepared query (`homeExplore` in `src/logic/home-explore.ts`) reads five sources. `days` is windowed by complete days and bucketed by day, week, month or weekday, with revenue, requests, tokens served and gross margin, a margin of the days' revenue and what compute cost over the same window. `usage` is the same days by model, `compute` by region, with the share of GPU-hours used, and `costs` is what compute cost a day. `customers` has no date: each customer's figures cover the last 30 complete days, narrowed and grouped by plan, status, region and owner. What compute cost, and so gross margin, is offered only to an Owner and an Admin: for anyone else the `costs` source and the gross margin are absent from the tool. A drilled day opens Home pointed at it, and a drilled customer its own page.

## Embed view

See `app/embed/home/README.md`.

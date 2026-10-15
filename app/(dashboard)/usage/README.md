# Usage

The Usage page answers how many requests the period chosen had against the period before, what is true of the period by rule, how every day kept compares, and, over the last 30 complete days, when requests come, where from, what is asked for and how it was answered.

Status: beta

## Structure

Seven parts, in this order. Every chart is the card named; the page leads with its one Featured metric, first after the head, and has no tile.

| Part | Split | Pattern | Holds |
|---|---|---|---|
| 1. Head | | Page frame | Kicker `ZZ Meridian · Production`; the title, a sentence for the period chosen (below), with the page's name kept in the heading; the line under it (below), then who Business is for (`workspaces.business.audience`, read from the declaration); freshness, period select (7D, 30D, 90D, All), Export (the period's days, as a CSV) |
| 2. Requests | full | Featured metric with a Trend chart, area, with `height="fill"` | The page's protagonist, marked `data-protagonist="Requests"` on a wrapper whose display is `contents`: the period's requests (`formatCompact`, "1.1B"), their change on the period before, the period's record as its finding when it is one ("The highest 30 days of requests yet: 1.1B, the 3rd record in a row"), and requests a day over the period's complete days with the day in progress `running`: the stretch into it is dashed and its pill and readout say so far. The caption states the exact count over the days it names. Its Ask asks about requests over the period, or about the day the Meridian points at |
| 3. A year of requests, a day a cell | full | Card with a Heatmap, calendar form, `scale="max"`, `meridian` | Every complete day kept and the day in progress, a cell a date and a column a week; the busiest complete day as the card's badge ("Busiest: 01 Oct, 44.9M"). Pointing at a day of the period points the Featured metric's chart at it |
| 4. The period, counted | 1/3 | Card with a list | At most three facts, each from a rule of `src/lib/facts.ts` with its date (below). With none, one line says so |
| 5. When they come | 2/3 | Card with a Segmented control, then a Column chart or a Heatmap | `By hour` first: requests by hour of day, UTC, every weekday summed, the busiest hour highlighted; `By weekday and hour`: the Heatmap's hours form on `scale="quantile"`. The choice is the view's own, not the address. Both over the last 30 complete days, named |
| 6. Where from, What is asked for | 1/2 | Two cards with a Bar list | Requests by region, each with its median latency; requests by endpoint, the five most requested and the rest folded into "2 others", summed. Both over the last 30 complete days, named |
| 7. How it was answered | full | Card with a Composition bar | Responses by status class over the last 30 complete days, in status colours: 2xx `neutral`, 3xx `neutral-ink`, 4xx `warning`, 5xx `critical` |

The parts are one Suspense boundary, the page's body: a part with a boundary of its own would be written after the others. One Meridian holds the period's days and the day in progress.

### The period

The period control moves the title, the line under it, the Featured metric and the period's facts. A period is N complete days counted back from yesterday (7, 30 or 90), or every complete day kept; the day in progress is counted in nothing and drawn as running. The calendar is every day kept whatever the period. When they come, where from, what is asked for and how it was answered are snapshots of the last 30 complete days: they do not follow the period, and each card says so.

### The title

The page is headed by what its requests say for the period chosen, worked out by `usageTitle` in `src/views/usage-context.ts`. The heading reads "Usage: " before it, out of sight, and the top bar shows "Usage".

| When | The title |
|---|---|
| The period is a record for requests: more than every earlier whole period of its length, with at least six such periods kept (`facts.recordNeedsPeriods` in `src/app.config.ts`) | "1.1B requests in 30 days, the busiest 30 days yet" |
| Otherwise, with a period before it | "3.1B requests in 90 days, 23.6% more than the 90 days before" ("less"; "level with the 90 days before" when the change rounds to 0.0%) |
| No period comes before it (All) | "9.6B requests in 360 days" |
| The history or the days could not be read, or no day is kept | The page is headed by its name |

In the sample 7 days reads "267.6M requests in 7 days, the busiest 7 days yet". 90 days and All state no record: 360 days hold four whole periods of 90 and one of 360, fewer than a record needs.

### The line under the title

One line, worked out by `usageLine`: requests a day over the period's complete days, the share answered with an error (a 5xx or a 429) and the median day's p95. In the sample at 30 days: "36.7M requests a day, 0.44% of them errors, and a median day's p95 of 289ms."

### The period, counted

Each fact is worked out on the server by `usageHead` in `src/views/usage-parts.ts`, from every complete day kept, in this order:

1. The busiest day yet, when it falls in the period: the `record` rule over the days up to it, about it.
2. The first day requests passed the largest of `facts.firsts.requestsADay` they have passed, and how many of the period's days passed it: the `first` rule, given every day kept and the period's length (`period`), so a day inside the period is never called the first ever. With All the period is every day kept, and the line has no period clause.
3. The weekday average of the period's latest whole week, when it is the highest yet: the `record` rule over every week whose five weekdays are kept, the week inside the period.

In the sample at 30 days:

```text
The highest day of requests yet: 44,940,181, on 01 Oct 2026
Requests first passed 25.0M in a day on 02 Jan 2026; 192 days have passed it since, and 26 of the last 30 days passed it
The highest weekday average yet: 42,815,463 requests a day, in the week to 02 Oct 2026
```

Below 1024px (`lg`) every row stacks, the Featured metric first; the calendar shows the latest weeks that fit at 12px a cell and says how many of how many; the hours group in threes under 560px. At 390px a Bar list hides its rows' lines, and the actions wrap under the line: the period select, then Export.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the parts' shapes under a masthead that takes the room the page's takes, so the body does not move when the page arrives. `LoadingPage` draws the kicker, the heading that holds "Usage", read out and not drawn, with the sentence's block (`sentence`), the room of the line under the title (`lead`), the freshness, and the period control and Export where they will stand (`PeriodActionsRoom` in `src/views/period-actions.tsx`). The page's own fallbacks take the same room Under `refusal: 'absent'` the masthead names nothing (`gatedLoading`), since it is drawn before the gate answers. |
| Empty (no complete day kept) | The body is one card that says "No requests have arrived yet", with a link to API keys; no Featured metric, chart or figure is drawn, and the page is headed by its name |
| Partial (a read failed) | That part's card, with its title, says what could not be read ("The responses could not be read") in its own place, and every other part stands. The days feed the Featured metric (in its place, "The days could not be read" under "Requests") and the period's facts; with days read and none complete in the period, it draws no chart; the history feeds the calendar, the facts and the title; the hours and the regions feed when they come and where from; the endpoints feed what is asked for; the responses feed how it was answered. The context says what could not be read |
| All time (no previous period) | The title states the figure alone, the Featured metric draws no change, and the context says no previous period is kept |
| No access | The product's refusal page, before any read (`FEATURES.usage.needs`: the days, the hours, the regions, the endpoints and the responses, which every role holds) |
| Error | The dashboard error screen with Retry |

## Data

Every figure is read on the server by the Usage tool's read (`usageTool` in `src/views/tools.ts`, which takes `period`, 30d when not given). Each read is made apart from the others, so one that cannot be read leaves its part saying so (`unread` on the page's data) and the rest standing. `usageData` in `src/views/usage-parts.ts` turns the rows into what the parts draw.

- **The Featured metric and the period's facts**: `readDays(period)`, the period's complete days, their totals and those of as many days before, and the day in progress on its own.
- **The calendar, the busiest day, the title's record and the facts**: every complete day kept (`readDays('all')`); the page is handed each day's requests and the facts' sentences.
- **When they come and where from**: `usageFigures()` in `src/data/usage.ts`, the `hours` and `regions` collections under `hours:read` and `regions:read`. A weekday's row sums to the requests of that weekday's days, and the hours of the day are the grid's columns summed.
- **What is asked for**: `readEndpoints()`, the `endpoints` collection. **How it was answered**: `readResponses()`, the `responses` collection. Both in `src/data/metrics.ts`, through `read()`.

The hours, the regions, the endpoints and the responses each add up to the requests of the last 30 complete days. Nothing writes.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: one column, the Featured metric first; the calendar its latest weeks, the hours grouped in threes.
- **Embed**: none.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `usageContext` in `src/views/usage-context.ts` from the figures the page draws, with the day the Meridian points at.

### What the agent reads

The period with the dates of its complete days, and freshness; then requests, the error rate and the median day's p95 with their change against the period before (with All no figure has one, and it says "No previous period is kept, so no figure has a change."), the busiest day kept, and each 30-day part under its card's name with its window: the busiest hour of the day and of the week, each region's share with its p50, the five endpoints and "2 others", and the share of each status class. Its insights lead with the title, word for word, then the first, then the period's other facts. It says that the day in progress is counted in no total, and that the hours, the regions, the endpoints and the responses cover the last 30 complete days and do not follow the period. Pointed at a day, as the Meridian points and as the tool takes `day`, it says that day's requests and errors, and its address names the day (`/usage?period=30d&day=2026-09-21`), and the page opens pointed at the day its address names, as Home does. Within its budget of 2,600 characters at every period (1,890 at 7 days, 1,899 at 30, 1,909 at 90, 1,755 at All) and pointed at any of their days (2,013 at most):

```text
- 1.1B requests in 30 days, the busiest 30 days yet
- First: Requests first passed 25.0M in a day on 02 Jan 2026; 192 days have passed it since, and 26 of the last 30 days passed it. Evidence: /?period=all&day=2026-01-02
- Record: The highest day of requests yet: 44,940,181, on 01 Oct 2026.
- Record: The highest weekday average yet: 42,815,463 requests a day, in the week to 02 Oct 2026.
```

- **MCP App:** no embed view; an MCP server returns this context as the `usage` tool's text (`docs/agents.md`).
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.
- **Handoff:** Ask on the Featured metric hands the period, or the day the Meridian points at, to the assistant: "What stands out in requests over the last 30 days, and why?"

### What the agent does here

Protagonist: Requests.

- "How many requests came at 22:00 UTC on each weekday?" — the hours' requests where the hour is 22, by weekday, which names Sunday's cell and says requests are not kept by customer and hour, so who sent them cannot be said
- "Which hours of a Sunday are the busiest?" — the hours' requests where the weekday is Sunday, by hour, the largest first
- "How did requests and errors move in each of the latest eight weeks of the last 90 days?" — the days' requests and errors over 90 complete days, a week at a time, the latest eight
- "Which model answered the most requests in the last 30 days, and with what error rate?" — the usage's requests and error rate over 30 complete days, by model, against the 30 days before

Usage's prepared query (`usageExplore` in `src/views/usage-explore.ts`, set as `explore` on the Usage tool) reads three sources. `hours`, the requests of each weekday and UTC hour over the last 30 complete days, has no date: it is narrowed by weekday and hour, grouped by either, and names a weekday by its English name. `days` is windowed by complete days and bucketed by day, week, month or weekday, with requests, errors, their rate and the highest p95. `usage` is the same days by model. A drilled day or model-day opens the page pointed at that day.

## Accessibility

- The heading is the only `h1`: "Usage", read out and not drawn, then the title's sentence.
- The Trend chart, the Column chart and both Heatmaps carry a screen-reader table of their numbers: the calendar a row a date, the hours a weekday by hour. The Bar lists and the Composition bar give their figures as text.
- When they come is a radio group named "Count when they come", apart from the period's "Reporting period".
- The status classes are named in words beside their colours.

## Content

- Card titles are the part's own words: "When they come", "Where from"; the Featured metric's kicker names its measure and its period, "Requests · last 30 days".
- Times are UTC and the cards say so.
- Each part that does not follow the period names its window: "over the last 30 complete days".

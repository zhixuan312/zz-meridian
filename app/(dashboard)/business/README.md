# Revenue

The Revenue page is the Business workspace's home: for a period it states what customers paid, against the period before and a year ago, the best day yet and who is past due; then who pays by plan, every customer's week, the customers from a trial up to Enterprise, what is worth a look, what they buy and where they are, each customer it names opening its page.

Status: beta

## Structure

Eight parts, in this order. Every chart is the card named, and the page leads with its one Featured metric, first after the head.

| Part | Split | Pattern | Holds |
|---|---|---|---|
| 1. Head | | Page frame | Kicker `ZZ Meridian · Production`; the title, a sentence for the period chosen (below), with the page's name kept in the heading; the line under it (below), then who Business is for (`workspaces.business.audience`, read from the declaration); freshness, period select (7D, 30D, 90D, All), Export (the period's days, a day's revenue and its revenue by plan, as a CSV) |
| 2. Revenue, beside three tiles | 2/3 | Featured metric with a Trend chart, area, with `height="fill"`; three Metric tiles stacked beside it | The page's protagonist, marked `data-protagonist="Revenue"` on a wrapper that is itself the row's wide grid item, its card stretched to fill it: the period's revenue (`formatCost`), its change on the period before, the record as its finding when one holds ("The highest 30 days of revenue yet: $3,300,438.74, the 3rd record in a row"), and revenue a day with the day in progress `running`, on the page's Meridian, its pill saying "so far" on that day. The hero rounds a figure past nine characters ("$3.3M"), so the caption states it in full over the days it names: "$3,300,438.74 over the 30 complete days to 02 Oct 2026." Its Ask asks about revenue over the period, or about the day the Meridian points at. Beside it, `Against a year ago` (the change, signed, with the window it is against named in its line: "08 Oct–06 Nov 2025, first kept"); `Best day yet` (the best complete day kept, its day and how many of the ten best days kept fall in the period: "1 Oct · 7 of the 10 best days"); `Past due` (how many, and their share of the revenue of the last 30 days, naming no customer: "1.3% of 30 days' revenue"). A tile's line is at most 32 characters; the context says each in full |
| 3. Revenue a day by plan, Who pays | 2/3 | Card with a stacked Trend chart; card with a Composition bar | The period's complete days by the plan of who paid, Enterprise at the bottom, the day in progress `running`; each plan's share of the period's revenue, `stacked` so each plan is the colour the stacked charts draw it, each plan named with how many customers it has, trials included ("Scale · 82"; the ladder counts its trials apart) |
| 4. Revenue a period, by plan | full | Card with a stacked Column chart, on a Meridian of its own | One column a whole window of the period's length kept, counted back from yesterday (Home's year's windows: 51 of 7 days, 12 of 30, 4 of 90, one of All), Enterprise at the bottom, each column's total at rest while it is 36px wide |
| 5. Every customer, the last 14 days | full | Card with a Segmented control and eight compact Metric tiles | The order, `Largest`, `Fell this week` or `Growing fastest`, Largest first; "N of M sent more this week than last" over every customer that has not left; the eight the order picks, each tile its name, its change this week against last, what it paid in 30 days and its plan, and its 14 days, the whole tile one link to `/customers/<id>`; a footer link to `/customers` |
| 6. From a trial to Enterprise | full | Card with four Bar lists | One Bar list a stage, labelled `On a trial`, `Starter`, `Scale` and `Enterprise` (a customer on a trial is on the first, whatever its plan): the two that paid the most (all three when it holds three), each opening its page, and "N others", summed. A named customer's line says "pays N% of what the smallest Scale customer pays" once that share is `facts.nextPlanAt` or more, and "already pays more than the smallest Scale customer" once it pays more (the next stage of a trial is Starter; Enterprise has none). The card's line counts who joined, who moved up a plan and who left in the last 30 complete days, each stated even when it is none |
| 7. Worth a look | full | Card with a list | At most four lines, in this order: the customers past due (how many, the largest named), the trials that end within 14 days (the soonest named), the largest rise of the week and the largest fall. A customer a line names is the link to its page, and the rest of the line is text. With none, one line says so |
| 8. What they buy, Where they are | 1/2 | Two cards with a Bar list | The period's revenue by model; requests by region over the last 30 complete days, whatever the period |

The eight parts are one Suspense boundary, the page's body: a part with a boundary of its own would be written after the others. No part has a button to Customers; the wall's footer link is the way there.

### The period

The period control moves what is read from the daily records: the title's revenue and its record, the Featured metric, the tiles Against a year ago and Best day yet, revenue a day by plan, who pays, revenue a period by plan and what they buy. Every part about customers reads the window a customer's figures cover and names it: 30 complete days for what a customer paid and sent, 14 for its trend, the last 7 against the 7 before for this week; the ladder's count is of the last 30 complete days; where they are is the regions' 30 days. A period is N complete days counted back from yesterday, or every complete day kept; the day in progress is counted in nothing and drawn as running.

**Against a year ago** compares the period with the same days 52 weeks (364 days) before when every one of them is kept. The sample keeps 360 complete days, so that window is kept at no period, and the tile compares the period with the earliest whole window of its length kept, naming it: its line reads "08 Oct–06 Nov 2025, first kept", and the context "against 08 Oct to 06 Nov 2025, the first 30 days kept" (7 days compares with a week 353 days earlier, 30 days with a window 330 days earlier, 90 days with one 270 days earlier). With All no earlier whole window exists: the tile shows a dash and says so. A figure is never compared with a window it does not name.

**Best day yet** is the `record` rule over the days up to the best day, about that day, as Home's busiest day is: a best day with fewer than `facts.recordNeedsPeriods` days kept up to and including it is no record, and the tile shows a dash.

### The title

The page is headed by what its customers and its revenue say for the period chosen, worked out by `revenueTitle` in `src/views/revenue-context.ts`. The heading reads "Revenue: " before it, out of sight, and the top bar shows "Revenue".

| When | The title |
|---|---|
| Every customer of a set sent more requests in the last 7 days of its trend than in the 7 before. The sets are tried in order: every customer that has not left, then each plan, the plan that brings the most revenue first | "All 24 Enterprise customers sent more this week than last" ("All 320 customers…" for the whole set), then ", in the highest 30 days yet" when the period is a record for revenue |
| No set holds, with a period before | "320 customers paid $3,300,438.74 in 30 days, 5.3% more than the 30 days before" ("less"; "level with the 30 days before" when the change rounds to 0.0%) |
| No set holds, and no period before (All) | "320 customers paid $27,710,624.39 in 360 days" |
| The history could not be read, or there is no customer or no whole period | The page is headed by its name |

One customer short and a set is not stated: the rule tries the next. In the sample it holds for the 24 on Enterprise at every period: "…, in the highest 7 days yet", "…, in the highest 30 days yet", and with no record clause at 90 days and All.

### The line under the title

One line, worked out by `revenueLine`: the customers that have not left, how many are on a trial and how many past due, and the plan that brings the most of the period's revenue with its share. In the sample at 30 days: "320 customers, 14 on a trial and 10 past due; Enterprise brings 62.1% of the revenue of the last 30 days." A clause whose figures could not be read is left out.

Below 64rem (896px) every row stacks, the Featured metric first. The three tiles beside it stand in a column from 64rem, three across from 48rem (672px) and one column below it; the wall is two compact tiles across, four from 48rem of its card; the ladder's stages are two across from 64rem. At 390px a Bar list hides its rows' lines, and the actions wrap under the line: the period select, then Export.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the eight parts' shapes under a masthead that takes the room the page's takes, so the body does not move when the page arrives. `LoadingPage` draws the kicker, the heading that holds "Revenue", read out and not drawn, with the sentence's block (`sentence`), the room of the line under the title (`lead`), the freshness, and the period control and Export where they will stand (`PeriodActionsRoom` in `src/views/period-actions.tsx`). The page's own fallbacks take the same room Under `refusal: 'absent'` the masthead names nothing (`gatedLoading`), since it is drawn before the gate answers. |
| Empty (no customer and no complete day kept) | The body is one card that says "Nothing has arrived yet", with a link to API keys; no Featured metric, tile, chart or figure is drawn, and the page is headed by its name |
| Partial (a read failed) | That part's card, with its title, says what could not be read ("The usage by model could not be read") in its own place, and every other part stands; a tile whose figure could not be read shows a dash and "Could not be read". The days feed the Featured metric (in its place, "The days could not be read" under its name), the tiles Against a year ago and Best day yet and parts 3 and 4; the customers feed Past due and parts 5 to 7; the usage by model and the models feed what they buy; the regions feed where they are. The context says what could not be read |
| No day kept yet | The Featured metric draws no chart, and a part about the days says "No complete day is kept yet" in its card |
| All time (no previous period) | The Featured metric draws no change, and Against a year ago shows a dash: nothing comes before the period |
| No access | The product's refusal page, before any read (`FEATURES.revenue.needs`: the customers, the days, the usage by model, the models and the regions, which every role that reads customers also holds) |
| Error | The dashboard error screen with Retry |

## Data

Every figure is read on the server by the Revenue tool's read (`revenueTool` in `src/views/tools.ts`, which takes `period`, 30d when not given). Each collection is read apart from the others, so one that cannot be read leaves its part saying so (`unread` on the page's data) and the rest standing. `revenueData` in `src/views/revenue-parts.ts` turns the rows into what the parts draw, never a customer's record: the wall gets the eight of each order, the ladder each stage's two named customers (three when it holds three) and what each other customer paid, which the Bar list folds into "N others".

- **The period's figures** come from `readDays(period)` and its `revenueByPlan`; the windows, the year ago and the best day from every complete day kept (`readDays('all')`), read on the server, and the page is handed the sentences and figures, never the history.
- **The customers' figures** are every customer that has not left (`kept`), from the `customers` collection: what each paid in the last 30 complete days, its 14-day trend and its week (`week` in `src/views/customers-context.ts`). Those that have left are counted in nothing but the ladder's "left".
- **The ladder's moves** are of the last 30 complete days: joined (`joined`), moved up (`planSince` with a `previousPlan` below the plan) and left (`left`).
- **What they buy** is the `usage` rows' revenue by model over the period's complete days, labelled from `models`; **where they are** is the `regions` collection.
- **`facts.nextPlanAt`** (`src/app.config.ts`, 0.75 in the sample) is read each time the read runs.

Revenue over 30 days equals Home's and the customers' revenue to the cent. Nothing writes.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: one column, the Featured metric first; the three tiles one column at 390px, the wall two compact tiles across.
- **Embed**: none.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `revenueContext` in `src/views/revenue-context.ts` from the figures the page draws; the wall's order is the person's, and the context states the wall in that order.

### What the agent reads

The period with the dates of its complete days, the windows a customer's figures cover, and freshness; then the four tiles' figures with their changes, windows and definitions, who pays by plan with its customers, the wall in the order chosen with "N of M sent more this week than last", each stage's count with its two named customers and the ladder's line, what they buy and where they are. Its insights lead with the title, word for word, then the record and the lines worth a look with the page each opens. It does not carry the windows of revenue a period by plan, the wall's orders not chosen, or the customers a stage folds. In the sample at 30 days, within its budget of 2,600 characters at every period (2,510 at 7 days, 2,547 at 30, 2,440 at 90, 2,455 at All):

```text
- All 24 Enterprise customers sent more this week than last, in the highest 30 days yet
- Record: The highest 30 days of revenue yet: $3,300,438.74, the 3rd record in a row.
- 10 customers are past due, the largest Juniperth Travel, billed $12,044.73 in 30 days. Evidence: /customers/juniperth-travel
- 9 trials end within 14 days, the soonest Westmoor Foods on 05 Oct 2026. Evidence: /customers/westmoor-foods
- Wolden Labs sent 16.5% more this week than last, the largest rise. Evidence: /customers/wolden-labs
- Saltwick Media sent 4.7% less this week than last, the largest fall. Evidence: /customers/saltwick-media
```

- **MCP App:** no embed view; an MCP server returns this context as the `revenue` tool's text (`docs/agents.md`).
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.
- **Handoff:** Ask on the Featured metric hands the period, or the day the Meridian points at, to the assistant: "What stands out in revenue over the last 30 days, and why?". Ask on "Revenue a day by plan" does the same for revenue by plan.

### What the agent does here

Protagonist: Revenue.

- "How did revenue move a week at a time over the last 90 days?" — the days' revenue over 90 complete days, a week at a time
- "What did Scale customers pay on each weekday over the last 30 days, against the 30 before?" — the days' Scale revenue over 30 complete days, by weekday, against the 30 days before
- "Which model brought the most revenue in the last 90 days, and how did that move?" — the usage's revenue over 90 complete days, by model, against the 90 days before
- "What do the customers past due pay, by plan?" — the customers whose status is past due, their revenue over the last 30 complete days, by plan

Revenue's prepared query (`revenueExplore` in `src/views/revenue-explore.ts`, set as `explore` on the Revenue tool) reads three sources. `days` is windowed by complete days and bucketed by day, week, month or weekday, with revenue and each plan's revenue. `customers` has no date: each customer's figures cover the last 30 complete days, narrowed and grouped by plan, status, region and owner. `usage` is the days by model, with revenue and requests. A drilled day or model-day opens the page at every day kept, and a drilled customer its own page.

## Accessibility

- The heading is the only `h1`: "Revenue", read out and not drawn, then the title's sentence. A tile's label is its name.
- A wall tile is one link whose name is the tile's text, the customer's name first; the order is a radio group named "Order of the customers", apart from the period's "Reporting period".
- A ladder's list is named by its stage; a named customer's row is one link, and "N others" opens nothing.
- In Worth a look, the customer's name is the link and the rest of the line is read around it.
- Past due is words as well as a number.

## Content

- Sentence case; money with its symbol and two decimals in a tile's figure, compact ("$409.2K") on a wall tile, a bar and an axis; a change with its sign on Against a year ago.
- Each part about customers names its window; no figure is compared with a window it does not name.

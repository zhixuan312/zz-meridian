# Customers page

Who is calling the API, on which plan, and the revenue each brought in the last 30 complete days, which adds up to the Home's 30-day revenue to the cent; each customer opens its own page. A customer that has left keeps its record and is counted in nothing.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Customers", one sentence. No action: nobody in the console creates or changes a customer | One band | Stacked |
| 1 | Row `tiles`: Customers, Revenue, last 30 days (emphasis), Past due with who (the two largest and how many more, when there are more than two). They count the customers that have not left. None carries a trend: no daily series of customers or of revenue by customer exists, and a tile draws only what a series stands behind | Three across | One column |
| 2 | Data table: search and Status (All, Active, Trial, Past due, Left) in the Filter bar, the plan as a Segmented view; columns Customer (avatar and name, grow), Plan, Status, Requests, Last 14 days (sparkline, from 896px), Error rate (from 1152px), Revenue, Customer since (from 1152px); a row opens that customer's page (`/customers/<id>`) | Columns | Cards: name and status, then plan, requests and revenue |

The body (rows 1 and 2) is the records template, `Records` from `src/components/templates/records`; its Atlas entry is [/system/pages/template-records](/system/pages/template-records). The page supplies the tiles and the table.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx` and the page's fallback: `RecordsSkeleton` from the records template, three tiles over the filter bar and eight skeleton table rows |
| Default | Sorted by revenue, descending |
| Past due | The status Badge in `critical`; the sparkline in neutral |
| Left | A customer that has left is not in the list as it opens, nor in a tile: Status "Left" lists those that have, each with a `neutral` Badge and zeros for its 30 days, and the result reads "9 of 9" |
| Error rate over 1% | Written in `warning-ink` |
| No customers | The first-run empty state: "No customers yet" |
| Filtered, nothing matches | The filtered-out empty state |

## Data

The `customers` collection, read through `readAll()` under `customers:read`, like every other collection; its rows are the sample's `CUSTOMERS` (made in `src/system/fixtures/company.ts`): 329 records, 320 that have not left and 9 that have. It is read-only: nobody in the console creates or changes a customer. Revenue is what a customer was billed for metered usage, before credits, over the last 30 complete days; over those days the customers' revenue and requests are the days' own, to the cent and to the request.

The page reads every customer and hands its client the fields a row draws (`customerRow` in `src/views/customers-context.ts`): the id, name, plan, status, requests, 14-day trend, error rate, revenue and the day it joined. What only a customer's own page shows, its requests by route among it, stays on the server. `kept()` and `customerFigures()` there decide what is counted: every customer that has not left.

The page renders the masthead (title, sentence) itself, outside the boundary that reads the address, so a cold load has them in the first HTML. The tiles and the table wait inside their own boundary.

## Embed view

None yet: a `zz_meridian_customer { id }` view would show one customer's card with their 14-day shape; the page is `/customers/<id>` (`app/(dashboard)/customers/[id]/README.md`).

## Surfaces

- **Console**: as above. **Mobile**: cards. **Embed**: not offered.

## Agents

An agent reads customers through this page's shared context (the `customers` view tool reads every customer, as the page does, and takes the same `q`, `plan` and `status`, `left` among them) and their requests view; it changes nothing here: no one in the console creates or changes a customer. The context is built by `customersContext` in `src/views/customers-context.ts`, and the tiles' `hint`s come from its `CUSTOMER_METRICS`.

### What the agent reads

The three tiles with their definitions, counted over the customers that have not left; how many the list shows of how many, with the first five in the table's filter and order (with the error rate, a column a narrow screen drops: it is still the person's to read); that customers have left and where the list shows them; and what code found: how concentrated revenue is, how combined requests moved over the last 7 days against the 7 before and who departs from that by 10 points or more, and which customers fail at twice the median rate. Lists stop at five and say how many more there are.

```text
- Combined requests are up 7% over the last 7 days against the 7 before. Apart from that: Saltwick Media down 5%; Bexwell Robotics down 4%; Umberly Studios down 4%; Norhaven Capital down 4%; Windrush Labs down 4%; and 11 more (the list has each customer's 14 days). Evidence: /requests?q=Saltwick%20Media
- 99 of 320 have an error rate at least twice the median customer's 0.28%: Dellmark Media (1.45%); Dunmoor Systems (1.45%); Larkfield Biotech (1.42%); Orbit Retail (1.42%); Everwick Security (1.40%); and 94 more (sort the list by error rate to see them). Evidence: /requests?q=Dellmark%20Media&status=5xx
Unknown:
- A customer's error rate counts their 5xx and 429 responses; nothing here says whether the errors were theirs or ours.
- 9 customers have left and are counted in no figure here; the list shows them under the status left (/customers?status=left).
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

### What the agent does here

Protagonist: Customers.

The page marks the list `data-protagonist="Customers"` on a wrapper whose display is `contents`; its Ask, in the Filter bar, hands the list in view to the assistant: "What stands out in our customers, and why?", or, filtered, "What do the customers on Enterprise, past due have in common, and why?".

- "What did the past due customers bring in the last 30 days, plan by plan?" — the customers whose status is past due and their revenue over the last 30 complete days, by plan
- "How much revenue does each owner on our side look after?" — the customers that have not left and their revenue, by owner, the largest first
- "Which region do our customers' requests come from?" — the customers' requests over the last 30 complete days, by region
- "Which Enterprise customers are on a trial or past due, and where do I open them?" — the customers on Enterprise whose status is trial or past due, with up to 20 of them, each with its page's address

Customers' prepared query (`customersExplore` in `src/views/customers-explore.ts`) reads one source, `customers`, which has no date: each customer's figures cover the last 30 complete days. It is narrowed and grouped by plan, status, region and owner, with the customers that have not left, their revenue, requests and tokens. A drilled customer opens its own page, and a call narrowed to one plan or one status opens the list filtered to it.

## Content

- Plans are proper names ("Enterprise"); statuses are words ("Past due"), never colour alone.

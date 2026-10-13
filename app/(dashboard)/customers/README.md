# Customers page

Who is calling the API, on which plan, and the revenue each brought in the last 30 days, which adds up to the Home's 30-day revenue; each customer opens its own page.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Customers", one sentence. No action: nobody in the console creates or changes a customer | One band | Stacked |
| 1 | Row `tiles`: Customers, Revenue, last 30 days (emphasis), Past due with who. None carries a trend: no daily series of customers or of revenue by customer exists, and a tile draws only what a series stands behind | Three across | One column |
| 2 | Data table: search and Status in the Filter bar, the plan as a Segmented view; columns Customer (avatar and name, grow), Plan, Status, Requests, Last 14 days (sparkline, from 896px), Error rate (from 1152px), Revenue, Customer since (from 1152px); a row opens that customer's page (`/customers/<id>`) | Columns | Cards: name and status, then plan, requests and revenue |

The body (rows 1 and 2) is the records template, `Records` from `src/components/templates/records`; its Atlas entry is [/system/pages/template-records](/system/pages/template-records). The page supplies the tiles and the table.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx` and the page's fallback: `RecordsSkeleton` from the records template, three tiles over the filter bar and eight skeleton table rows |
| Default | Sorted by revenue, descending |
| Past due | The status Badge in `critical`; the sparkline in neutral |
| Error rate over 1% | Written in `warning-ink` |
| No customers | The first-run empty state: "No customers yet" |
| Filtered, nothing matches | The filtered-out empty state |

## Data

The `customers` collection, read through `read()` under `customers:read`, like every other collection; its rows are the sample's `CUSTOMERS` (derived from `CUSTOMER_ROWS` in `src/system/fixtures/sample-records.ts`). It is read-only: nobody in the console creates or changes a customer. Revenue is what a customer was billed for metered usage, before credits.

The page renders the masthead (title, sentence) itself, outside the boundary that reads the address, so a cold load has them in the first HTML. The tiles and the table wait inside their own boundary.

## Embed view

None yet: a `zz_meridian_customer { id }` view would show one customer's card with their 14-day shape; the page is `/customers/<id>` (`app/(dashboard)/customers/[id]/README.md`).

## Surfaces

- **Console**: as above. **Mobile**: cards. **Embed**: not offered.

## Agents

An agent reads customers through this page's shared context and their requests view; it changes nothing here: no one in the console creates or changes a customer. The context is built by `customersContext` in `src/views/customers-context.ts`, and the tiles' `hint`s come from its `CUSTOMER_METRICS`.

### What the agent reads

The three tiles with their definitions, every customer in the table's filter and order (with the columns a narrow screen drops: the error rate and the trend are still the person's to read), and what code found: how concentrated revenue is, how combined requests moved over the last 7 days against the 7 before and who departs from that by 10 points or more, and which customers fail at twice the median rate. Lists stop at 25 and say how many more there are.

```text
- Combined requests are up 15% over the last 7 days against the 7 before. Apart from that: Fernway Bank up 36%.
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Content

- Plans are proper names ("Enterprise"); statuses are words ("Past due"), never colour alone.

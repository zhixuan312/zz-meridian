# Customers page

Who is calling the API, on which plan, and what they spent in the last 30 days, which adds up to the Overview's 30-day spend; each customer opens their requests.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Customers", one sentence, Invite customer (primary) | One band | Stacked |
| 1 | Row `tiles`: Customers (with combined requests over 14 days), Spend, last 30 days (emphasis, with its 14-day shape), Past due | Three across | One column |
| 2 | Data table: search and Status in the Filter bar, the plan as a Segmented view; columns Customer (avatar and name, grow), Plan, Status, Requests, Last 14 days (sparkline, from 1024px), Error rate (from 1280px), Spend, Customer since (from 1280px) | Columns | Cards: name and status, then plan, requests and spend |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: three tiles over the filter bar and skeleton table rows |
| Default | Sorted by spend, descending |
| Past due | The status Badge in `critical`; the sparkline in neutral |
| Error rate over 1% | Written in `warning-ink` |
| No customers | The first-run empty state: "No customers yet" |
| Filtered, nothing matches | The filtered-out empty state |

## Data

`CUSTOMERS`, imported from `src/data/sample.ts` (derived from `CUSTOMER_ROWS` in `src/system/fixtures/sample-records.ts`). Spend is metered usage before credits. This is a module constant, not a collection: it has no tenant and no access check, so a product serves customers through `read()` with a tenant-scoped collection before it has a second tenant.

The page renders the masthead (title, sentence, Invite customer) itself, outside the boundary that reads the address, so a cold load has them in the first HTML. The tiles and the table wait inside their own boundary.

## Embed view

None yet: a `zz_meridian_customer { name }` view would show one customer's card with their 14-day shape.

## Surfaces

- **Console**: as above. **Mobile**: cards. **Embed**: not offered.

## Agents

An agent reads customers through this page's shared context and their requests view; it never changes a plan or invites from here. The context is built by `customersContext` in `src/views/customers-context.ts`, and the tiles' `hint`s come from its `CUSTOMER_METRICS`.

### What the agent reads

The three tiles with their definitions, every customer in the table's filter and order (with the columns a narrow screen drops: the error rate and the trend are still the person's to read), and what code found: how concentrated spend is, how combined requests moved over the last 7 days against the 7 before and who departs from that by 10 points or more, and which customers fail at twice the median rate. Lists stop at 25 and say how many more there are.

```text
- Combined requests are up 15% over the last 7 days against the 7 before. Apart from that: Fernway Bank up 36%.
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Content

- Plans are proper names ("Enterprise"); statuses are words ("Past due"), never colour alone.

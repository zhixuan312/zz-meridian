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
| Filtered, nothing matches | The filtered-out empty state |

## Data

`CUSTOMERS` from `src/system/fixtures/sample-records.ts` (derived from `CUSTOMER_ROWS`). Spend is metered usage before credits.

## Embed view

None yet: a `zz_meridian_customer { name }` view would show one customer's card with their 14-day shape.

## Surfaces

- **Console**: as above. **Mobile**: cards. **Embed**: not offered.

## Agents

An agent reads customers through their requests view; it never changes a plan or invites from here.

## Content

- Plans are proper names ("Enterprise"); statuses are words ("Past due"), never colour alone.

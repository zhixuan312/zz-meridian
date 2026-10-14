# Customer page

One customer, headed by what its record says: its plan and status, what it asked of the API and was billed in the last 30 days, and how its last 14 days moved.

Status: draft

This body is the thin first form: the facts as label and value and the 14 days as a sparkline. A fuller page replaces it.

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | Detail head: "← Customers"; the title, a sentence from the customer's record (below), with its name kept in the heading; under it, at the row's start, its status as a Badge and a button to its requests | The heading on a row of its own, the status and the button under it | The same |
| 1 | Row `2/3`: Customer (Key value, two columns: plan, status, requests, revenue, region, customer since, seats, error rate) · Last 14 days (Sparkline, requests a day) | Side by side | Stacked |

### The title

The page is headed by what the customer's record says, worked out by `customerTitle` in `src/views/customer-context.ts`. The heading reads the customer's name and a colon before it, out of sight, and the top bar shows the name.

| When | The title |
|---|---|
| Past due | "Lumen Studio is past due, and sent 2.3% less this week than last" ("more"); "Lumen Studio is past due" when it has no week to compare |
| On a trial | "Brightline is on a trial that ends on 23 Oct 2026" |
| It has left | "Ambervale Motors left on 24 Nov 2025" |
| Otherwise | "Northwind Labs paid $409,206.80 in 30 days and sent 9.8% more this week than last" ("less"); "Northwind Labs paid $409,206.80 in 30 days" when it has no week to compare |

"This week" is the last 7 days of its 14-day trend against the 7 before. A customer whose first 7 days hold no request has no week to compare, and one that has left has none. The page has no period control: what a customer paid and sent covers the last 30 complete days.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: a heading that holds "Customer", read out and not drawn, since the customer's name is not known yet, and the sentence's block (`LoadingPage` with `sentence`); then the facts beside the 14 days, as skeletons |
| Default | The status Badge is `neutral` when active, `accent` on a trial, `critical` past due; an error rate over 1% in `warning-ink` |
| Left | A customer that has left still has its page: headed by the day it left, status "Left" in `neutral`, and zeros for its 30 days and its 14, since the days they cover hold nothing of it |
| Unknown id | The page renders the console's Not found screen itself (`MissingPage`), with `noindex`, rather than throwing `notFound()`, so the screen is in the first HTML |
| No access | The product's refusal page, before any read; its metadata names the feature, never the record. The need is `FEATURES.customers.needs` itself, so the page leads back into Business |
| Error | The dashboard error screen with Retry |

## Data

One row of the `customers` collection through `read()` under `customers:read`, whose key is the id (`readCustomer` in `src/views/tools.ts`, shared by the page and the Customer tool). Three ids are built ahead of time, the three largest customers; any other renders on its first request. Nothing writes. The record also holds the customer's tokens, its requests by route, its owner and the days it changed plan, left, ends its trial and has been past due since; this thin form draws none of them yet.

## Surfaces

- **Console**: as above. **Mobile**: one column. **Embed**: not offered.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `customerContext` in `src/views/customer-context.ts`.

### What the agent reads

Its insights lead with the title the page is headed by, word for word. Where the title states how the week moved (an active customer, one past due), the next line says what a week is and where its requests are; where it does not (a trial), the next line says how its requests moved over the last 7 days against the 7 before. Then the customer's plan and status, requests and revenue over 30 days with the revenue's definition, error rate with its definition, region and seats, and the day it joined. It says that how the customer compares with the others is on Customers. The context's own title stays the customer's name.

```text
- Northwind Labs paid $409,206.80 in 30 days and sent 9.8% more this week than last
- This week is its requests over the last 7 days, and last week the 7 before. Evidence: /requests?q=Northwind%20Labs
```

- **MCP App:** no embed view; an MCP server returns this context as the `customer` tool's text (`docs/agents.md`).
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.

## Accessibility

- The heading is the only `h1`: the customer's name, read out and not drawn, then the title's sentence. The status is a word beside its dot.

## Content

- Plans are proper names; statuses are words, never colour alone.

# Customer page

One customer: its plan and status, what it asked of the API and was billed in the last 30 days, and how its last 14 days moved.

Status: draft

This body is the thin first form: the facts as label and value and the 14 days as a sparkline. A fuller page replaces it.

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | Detail head: "← Customers", the name with its status Badge, and a button to its requests | One band | Actions on their own row |
| 1 | Row `2/3`: Customer (Key value, two columns: plan, status, requests, revenue, region, customer since, seats, error rate) · Last 14 days (Sparkline, requests a day) | Side by side | Stacked |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the facts beside the 14 days, as skeletons |
| Default | Status `neutral` when active, `accent` on a trial, `critical` past due; an error rate over 1% in `warning-ink` |
| Unknown id | The page renders the console's Not found screen itself (`MissingPage`), with `noindex`, rather than throwing `notFound()`, so the screen is in the first HTML |
| No access | The product's refusal page, before any read; its metadata names the feature, never the record. The need is `FEATURES.customers.needs` itself, so the page leads back into Business |
| Error | The dashboard error screen with Retry |

## Data

One row of the `customers` collection through `read()` under `customers:read`, whose key is the id (`readCustomer` in `src/views/tools.ts`, shared by the page and the Customer tool). Three ids are built ahead of time; any other renders on its first request. Nothing writes.

## Surfaces

- **Console**: as above. **Mobile**: one column. **Embed**: not offered.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `customerContext` in `src/views/customer-context.ts`.

### What the agent reads

The customer's plan and status, requests and revenue over 30 days with the revenue's definition, error rate with its definition, region and seats, since when, and how its requests moved over the last 7 days against the 7 before. It says that how the customer compares with the others is on Customers.

```text
- Its requests are up 17% over the last 7 days against the 7 before.
```

- **MCP App:** no embed view; an MCP server returns this context as the `customer` tool's text (`docs/agents.md`).
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.

## Accessibility

- The name is the page title and the only `h1`; the status is a word beside its dot.

## Content

- Plans are proper names; statuses are words, never colour alone.

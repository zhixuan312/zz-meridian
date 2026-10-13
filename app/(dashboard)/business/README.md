# Revenue

The Revenue page is the Business workspace's home: the revenue of the last 30 days, how many customers there are and who has not paid.

Status: draft

This body is the thin first form: three figures the Customers page already computes, drawn by the same tiles, and a way to Customers. A fuller page replaces it.

## Structure

| Row | Split | Content | Pattern |
|---|---|---|---|
| Masthead | | Kicker "ZZ Meridian · Production", title, one sentence that ends with who Business is for (`workspaces.business.audience`, read from the declaration); Freshness. No action | Page frame |
| 1 | Tiles | Customers, Revenue, last 30 days (emphasis), Past due with who | Metric tile |
| 2 | | A button to Customers | Button |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the title and three tile skeletons |
| Default | The three tiles; Past due names the customers, or "Every invoice is paid" |
| No customers | The tiles read 0 and $0; the context says there are no customers yet |
| No access | The product's refusal page, before any read (`FEATURES.revenue.needs` is `customers:read`) |
| Error | The dashboard error screen with Retry |

## Data

The Revenue tool's read (`revenueTool` in `src/views/tools.ts`): every row of the `customers` collection through `readAll()`, worked into customers, revenue and past due by `customerFigures` in `src/views/customers-context.ts`. The page and the context share that read. Nothing writes.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: the tiles stack in one column.
- **Embed**: none.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `revenueContext` in `src/views/revenue-context.ts`.

### What the agent reads

The three figures with their definitions, who is past due with the revenue each brought, and that the customers' plans and trends are on Customers.

```text
- Past due: 1: Lumen Studio ($11.13 revenue). (Customers whose latest invoice is overdue.)
```

- **MCP App:** no embed view; an MCP server returns this context as the `revenue` tool's text (`docs/agents.md`).
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.

## Accessibility

- The page title is the only `h1`; a tile's label is its name.
- Past due is words as well as a number.

## Content

- Sentence case; money with its symbol and two decimals; "Revenue, last 30 days" carries its period.

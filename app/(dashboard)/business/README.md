# Revenue

The Revenue page is the Business workspace's home: the revenue of the last 30 days, how many customers there are and who has not paid.

Status: draft

This body is the thin first form: three figures the Customers page already computes, drawn by the same tiles, and a way to Customers. A fuller page replaces it.

## Structure

| Row | Split | Content | Pattern |
|---|---|---|---|
| Masthead | | Kicker "ZZ Meridian · Production"; the title, a sentence about the last 30 complete days (below), with the page's name kept in the heading; one sentence that ends with who Business is for (`workspaces.business.audience`, read from the declaration); Freshness. No action | Page frame |
| 1 | Tiles | Customers, Revenue, last 30 days (emphasis), Past due with who: the two largest and how many more, when there are more than two. Each counts the customers that have not left | Metric tile |
| 2 | | A button to Customers | Button |

### The title

The page is headed by what its customers and its revenue say, worked out by `revenueTitle` in `src/views/revenue-context.ts` over the last 30 complete days. The heading reads "Revenue: " before it, out of sight, and the top bar shows "Revenue".

| When | The title |
|---|---|
| Every customer of a set sent more requests in the last 7 days of its trend than in the 7 before. The sets are tried in order: every customer that has not left, then each plan, the plan that brings the most revenue first | "All 24 Enterprise customers sent more this week than last" ("All 320 customers…" for the whole set), then ", in the highest 30 days yet" when the 30 days are a record for revenue |
| No set holds, with 30 days before | "320 customers paid $3,300,438.74 in 30 days, 5.3% more than the 30 days before" ("less"; "level with the 30 days before" when the change rounds to 0.0%) |
| No set holds, and no 30 days before | "320 customers paid $3,300,438.74 in 30 days" |
| The history could not be read, or there is no customer or no whole 30 days | The page is headed by its name |

One customer short and a set is not stated: the rule tries the next. In the sample no rule holds for all 320, and it holds for the 24 on Enterprise: "All 24 Enterprise customers sent more this week than last, in the highest 30 days yet". The page has no period control yet.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: a heading that holds "Revenue", read out and not drawn, and the sentence's block (`LoadingPage` with `sentence`), then three tile skeletons |
| Default | The three tiles; Past due names the customers ("Juniperth Travel, Lumen Studio and 8 more"), or "Every invoice is paid" |
| No customers | The tiles read 0 and $0; the context says there are no customers yet |
| History not read | The days the title's revenue and its record are worked out from could not be read: the page is headed "Revenue", at the page-title size, the tiles stand, and the context says the history could not be read |
| No access | The product's refusal page, before any read (`FEATURES.revenue.needs` is `customers:read` and `days:read`, which every role that reads customers also holds) |
| Error | The dashboard error screen with Retry |

## Data

The Revenue tool's read (`revenueTool` in `src/views/tools.ts`): every row of the `customers` collection through `readAll()`, worked into customers, revenue and past due by `customerFigures` in `src/views/customers-context.ts`, which leaves out a customer that has left. The revenue is that of the last 30 complete days, and equals the Home's for 30 days to the cent. The title is worked out in the same read, on the server: the customers' trends for the "all", and every complete day kept (`readDays('all')`) for the revenue of the last 30 days, the 30 before and the record. The page is handed the sentence (`head` on its data) and never the history. The page and the context share that read. Nothing writes.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: the tiles stack in one column.
- **Embed**: none.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `revenueContext` in `src/views/revenue-context.ts`.

### What the agent reads

Its one insight is the title the page is headed by, word for word, and its scope says what "this week" is: the last 7 days of a customer's requests against the 7 before. Then the three figures with their definitions, how many are past due and the five largest of them with the revenue each brought, and that the customers' plans and trends are on Customers. The context's own title stays "Revenue".

```text
- All 24 Enterprise customers sent more this week than last, in the highest 30 days yet
- Past due: 10: Juniperth Travel ($12,044.73 revenue); Lumen Studio ($9,781.71 revenue); Westmoor Systems ($6,846.67 revenue); Whitlow Energy ($4,789.64 revenue); Stonemere Media ($2,962.72 revenue); and 5 more (the Customers list under the status past due has them). (Customers whose latest invoice is overdue.)
```

- **MCP App:** no embed view; an MCP server returns this context as the `revenue` tool's text (`docs/agents.md`).
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.

## Accessibility

- The heading is the only `h1`: "Revenue", read out and not drawn, then the title's sentence. A tile's label is its name.
- Past due is words as well as a number.

## Content

- Sentence case; money with its symbol and two decimals; "Revenue, last 30 days" carries its period.

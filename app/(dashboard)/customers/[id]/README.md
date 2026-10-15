# Customer page

One customer, headed by what its record says: where it stands and since when, who has it on our side, how its week moved, what it paid in the last 30 days and its share of revenue, its error rate beside the product's, what it asks for and its latest requests.

Status: beta

## Structure

Five parts, in this order. The page has no period control: every part names the window it covers.

| Part | Split | Pattern | Holds |
|---|---|---|---|
| 1. Head | | Page frame | The kicker, a trail: "Business" (`/business`) / "Customers" (`/customers`), each a link; the title, a sentence from the customer's record (below), with its name kept in the heading; the line under it: its plan, what it paid in 30 days, its share of the revenue of the same days and its requests ("Enterprise · $409,206.80 in 30 days · 12.4% of revenue · 68.9M requests") |
| 2. Where it stands | full | Card with a Key value | Its title is where it stands and since when, beside its status dot: "Past due since 01 Sept 2026", "On a trial that ends on 23 Oct 2026", "Active since 06 Apr 2024", "Left on 24 Nov 2025". Its line says what the status alone does not: the invoice overdue, how many days the trial has left, the plan it moved from. Then its owner on our side, when it joined, its region and its seats |
| 3. Three tiles | tiles | Three Metric tiles | `Requests`: its last 7 complete days against the 7 before, its 14 days as the shape, and the busiest of them as its finding ("Busiest of its 14 days: 1 Oct, 2.9M"); `Paid`: what it was billed in the last 30 complete days, its share of the revenue of the same days as its line; `Error rate`: its 5xx and 429 over the 30 days, the product's own over the same days as its line (the tile draws its baseline only under a Meridian, which this page has not) |
| 4. What it asks for | 1/3 | Card with a Bar list | Its requests by endpoint over the 30 days, the largest first, the endpoints it never called left out |
| 5. Its latest requests | 2/3 | Data table | The newest five requests of the sampled log from it, newest first: the request, its status, its latency and when, each row opening its request; "All of them" beside the title opens the log filtered to its name (`/requests?q=` and the name, written by `encodeURIComponent`) |

### The title

The page is headed by what the customer's record says, worked out by `customerTitle` in `src/views/customer-context.ts`. The heading reads the customer's name and a colon before it, out of sight, and the top bar shows the name.

| When | The title |
|---|---|
| Past due | "Lumen Studio is past due, and sent 2.3% less this week than last" ("more"); "Lumen Studio is past due" when it has no week to compare |
| On a trial | "Brightline is on a trial that ends on 23 Oct 2026" |
| It has left | "Ambervale Motors left on 24 Nov 2025" |
| Otherwise | "Northwind Labs paid $409,206.80 in 30 days and sent 9.8% more this week than last" ("less"); "Northwind Labs paid $409,206.80 in 30 days" when it has no week to compare |

"This week" is the last 7 days of its 14-day trend against the 7 before. A customer whose first 7 days hold no request has no week to compare, and one that has left has none. What a customer paid and sent covers the last 30 complete days, and its 14 days end yesterday.

### Every customer named opens this page

A customer is named by its name across the product, and wherever it is, the name opens `/customers/<id>`: a cell of the request log, a request's head and its Customer value, Revenue's wall, ladder and lines worth a look, Home's line worth knowing (one link, the whole sentence) and the bell's alert when one customer is past due. The request log keeps a customer's name, not its id, so the log's read works out the id on the server from the customers, by name; a name the customers do not hold stays text. A link in a cell of the log is followed as itself and does not also open the row. The Requests embed keeps the name as text: its inline row is one control that opens the request, and a link in its table would navigate the host's frame.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the masthead as the page will have it, the trail, a heading that holds "Customer", read out and not drawn, since the customer's name is not known yet, the sentence's block (`LoadingPage` with `sentence`) and the room of the line under it (`FactsRoom`, passed as `description`); then the five parts' shapes Under `refusal: 'absent'` the masthead names nothing (`gatedLoading`), since it is drawn before the gate answers. |
| Default | The status dot is `neutral` when active or left, `accent` on a trial, `critical` past due |
| Left | A customer that has left still has its page: headed by the day it left, and zeros for its 30 days and its 14, since the days they cover hold nothing of it; "What it asks for" says no request came in the 30 days |
| Quiet in the log | "Its latest requests" says in one line that no sampled request is from it: the log is a sample of the last hour and a half |
| Partial | A read that fails leaves its part saying so and the rest standing: the sampled log ("The sampled log could not be read" in Its latest requests), the product's days (the share and the product's error rate are said to be unread, and the line under the title leaves the share out) |
| Absent | A part whose collection the person may not read is not drawn, with nothing in its place: without `requests:read` there is no Its latest requests, and without `days:read` no share and no product's error rate |
| Unknown id | The page renders the console's Not found screen itself (`MissingPage`), with `noindex`, rather than throwing `notFound()`, so the screen is in the first HTML |
| No access | The product's refusal page, before any read; its metadata names the feature, never the record. The need is `FEATURES.customers.needs` itself, so the page leads back into Business |
| Error | The dashboard error screen with Retry |

## Data

One row of the `customers` collection through `read()` under `customers:read`, whose key is the id; the product's revenue and error rate over the last 30 complete days (`readDays('30d')`); and the newest five requests of the `requests` collection whose customer is this one's name (`readLatestFrom` in `src/data/requests.ts`). `readCustomer` in `src/views/tools.ts` reads all three, each apart, and is shared by the page and the Customer tool; the page's metadata and its body share one read. Three ids are built ahead of time, the three largest customers; any other renders on its first request. Nothing writes.

Its share of revenue is what it paid over the revenue of the same 30 complete days. The busiest of its 14 days is the largest of its trend, dated from the day before the read.

## Surfaces

- **Console**: as above. **Mobile**: one column; the tiles stack, and the latest requests are the table's card list. **Embed**: not offered.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `customerContext` in `src/views/customer-context.ts`.

### What the agent reads

Its insights lead with the title the page is headed by, word for word. Where the title states how the week moved (an active customer, one past due), the next line says what a week is and where its requests are; where it does not (a trial), the next line says how its requests moved over the last 7 days against the 7 before. Then its plan and where it stands since when, its owner on our side, its requests and revenue over 30 days with its share of the product's and the revenue's definition, the busiest of its 14 days, its error rate against the product's with its definition, the three endpoints it calls most with their shares, its region and seats, the day it joined, and the ids of its latest requests in the sampled log. A part that could not be read is named among what the data cannot say; one the person may not read is not mentioned. It says that how the customer compares with the others is on Customers. The context's own title stays the customer's name.

```text
- Northwind Labs paid $409,206.80 in 30 days and sent 9.8% more this week than last
- This week is its requests over the last 7 days, and last week the 7 before. Evidence: /requests?q=Northwind%20Labs
```

- **MCP App:** no embed view; an MCP server returns this context as the `customer` tool's text (`docs/agents.md`).
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.
- **Handoff:** Ask on the customer's standing hands the customer to the assistant: "What stands out in Northwind Labs's revenue and requests, and why?"

### What the agent does here

Protagonist: Where it stands.

The page marks the card `data-protagonist="Where it stands"` on a wrapper whose display is `contents`; its Ask is the one the Handoff line names.

- "Which routes do its sampled requests hit most?" — its requests in the sampled log, by route, which says they are a sample of the latest requests
- "How did all of its sampled requests end, by status class?" — every one of its requests in the sampled log, by status class
- "Which of its sampled requests failed, and where do I open them?" — its requests in the sampled log whose status class is 4xx or 5xx, with up to 20 of them, each with its request's address
- "How many tokens did it use in the last 30 days?" — the tokens, requests and revenue of its own row of the customers

The protagonist is the card the structure calls Where it stands, which is titled by where the customer stands and since when. One customer's prepared query (`customerExplore` in `src/views/customer-explore.ts`, set as `explore` on the Customer tool) takes the page's `id` beside the call and reads two sources, neither with a date: its requests in the sampled log, grouped by route or status class, and its own row of the customers. Its `fixed` reads that row by the id under the person's rights and holds every call to the customer's name and id, so no other customer is read; an id that names no customer is answered that there is no such customer, and nothing else is read.

## Accessibility

- The heading is the only `h1`: the customer's name, read out and not drawn, then the title's sentence. The status is a sentence beside its dot, never the dot alone.
- The trail is two links; each tile's hint names the window it counts.

## Content

- Plans are proper names; statuses are words, never colour alone.
- Every part names its window: "30 days", "the last 7 complete days", "its 14 days".

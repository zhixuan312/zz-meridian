# Requests page

The request log: every call that reached the gateway, newest first, filtered and sorted in the address, so any view of it is a link a person can share and a tool can open.

Status: beta

## Structure

| Row | Pattern | Console (1024px and wider) | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker "ZZ Meridian · Production", title "Requests", one sentence, Freshness, Export CSV | One band | Title, sentence, then Freshness and Export on their own row |
| 1 | Row `tiles`: three Metric tiles for what the filters let through: requests, errors and limits, latency p95, each with its 5-minute shape over the last hour and the last half hour against the one before | Three across | One column |
| 2 | Data table with a Filter bar in its toolbar: search, Status, Method, Region, the result count | Columns: Request (grow), Status, Latency, Customer and Region (once the table is 896px wide), Size (1152px), Received; a table under 640px wide is the card list. A row opens its request; its Customer opens the customer's page | Card list: route and status, then latency, customer and when |

The body (rows 1 and 2) is the records template, `Records` from `src/components/templates/records`: the three tiles are its summary and the table its records.

## States

| State | What shows |
|---|---|
| Default | The newest 20 of 240, sorted by Received, descending |
| Filtered | The tiles describe the matching set ("Matching requests"); the active filters take the accent wash; Clear appears |
| Set by an agent | `?by=Claude` adds the provenance line under the filters until a person changes them |
| Nothing matches | The table's filtered-out empty state with Clear filters; the tiles read zero |
| Loading | `loading.tsx`: the masthead skeleton and the template's skeleton, three tiles over a few skeleton table rows. On a navigation the real masthead (title, sentence) shows at once, with empty room for the freshness stamp and the export, and a skeleton for the body |
| Error | The dashboard error screen with Retry: a read that fails is the page's failure, not the table's |

## Data

The `requests` collection is a sample of the requests received, as its description tells an agent: how many requests there were is on Home and Usage, from the `days` and `usage` collections. The server reads one page of it (20 rows and the total) for the filters in the address, through `readRequests()` in `src/data/requests.ts`, and works the three tiles out of the same filtered set (the newest 500 of it, which the tiles say when the set is larger). The page never sends the full set. A request keeps its customer's name, not its id: the read works out each row's customer id on the server from the `customers` collection, by name (`readRequests` with `customers`), so the Customer cell is a link to `/customers/<id>`, followed as itself and not also opening the row; a name the customers do not hold, or a log read by someone the customers refuse, stays text. Error share counts 5xx and 429 responses. Latency above one second is written in `warning-ink`; no other cell is coloured except the status.

## Streaming

The page renders `PageFrame` itself, so the static title and sentence commit with the navigation. The freshness stamp, the Export link and the body (tiles and table) each read the address inside their own Suspense boundary: the stamp and the body over one shared read, the Export from the address alone.

## Addressable state

`?q=&status=2xx|3xx|4xx|5xx&method=GET|POST|PUT|DELETE&region=&sort=&dir=asc|desc&page=&by=` — one `useQueryState`, so a filter change and the page reset are one write, and the server renders the next page. A value the table does not offer falls back to its default. Its four filters, `q`, `status`, `method` and `region`, are also the arguments of the `zz_meridian_requests` tool.

## Export

Export CSV is a link to `/api/export/requests` with the same filters and sort: the route checks the session (401) and the read permission (403), then streams the whole filtered set in batches of at most 100 rows, and a text value that starts like a formula is written as text.

## Embed view

`/embed/requests`: the tool `zz_meridian_requests { status?, method?, region?, q? }`. Inline: the five latest matching requests as a compact list (method, route, customer, when, latency, status), each row one control that opens the request, the count, and Ask; Expand when more match. Fullscreen: this page's table and filters, with the provenance line ("Set by Claude"). The tool's rows carry no customer id, so the customer is text in both: a link there would navigate the host's frame. The view shares the count, the filters and the visible IDs with the model.

## Surfaces

- **Console**: as above.
- **Mobile**: the Filters button and sheet replace the filter selects; the table becomes cards.
- **Embed**: see Embed view.

## Agents

An agent opens this page's views through `zz_meridian_requests`; it never exports or blocks from here. Its filters are marked until a person changes one. The page shares one context with both agents (decision 0011), built by `requestsContext` in `src/views/requests-context.ts` from the page's read: the rows on screen and the summary of the whole filtered set.

### What the agent reads

The filters in words and the span of time the log covers; freshness; the three figures with their change against the half hour before and their definitions (the tiles' `hint`s come from `REQUEST_METRICS`); the page, the sort and the rows on screen by id; and what the matching requests and their errors have in common:

```text
- 5 of the 9 errors and limits are in eu-west-1 (56%). Evidence: /requests?region=eu-west-1
```

When a half hour holds fewer than 30 requests it says the change is too few to read as a trend, and when the summary reads only the newest 500 it says so.

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **Handoff:** Ask in the filter bar hands the filtered set to the assistant: "What do these requests with status 5xx have in common, and why?"

### What the agent does here

Protagonist: The request log.

The page marks the log `data-protagonist="The request log"` on a wrapper whose display is `contents`; its Ask is the Filter bar's, which the Handoff line names.

- "Which routes fail most in the sample?" — the sampled log's errors and limits and their share of the requests, by route, which says the log is a sample of the latest requests
- "Which customer's requests are the slowest?" — the latency p95 of the sampled log, by customer
- "How were the requests that reached a model answered, model by model?" — the sampled log's requests and errors and limits, by model
- "Which requests to /v1/messages failed with a 5xx, and where do I open them?" — the sampled log where the route is /v1/messages and the status class is 5xx, with up to 20 of them, each with its request's address

The request log's prepared query (`requestsExplore` in `src/views/requests-explore.ts`) reads one source, `requests`, the sampled log: a sample of the latest requests, windowed by nothing, so it has no period and no window before, and every answer says it is of the sample. It is narrowed by status class, status, route, method, customer, region and model, grouped by status class, route, customer, region or model, with the requests, the errors and limits (a 5xx or a 429), their share and the latency p95. A drilled request opens its own page, and a call narrowed to one status class, method, region, customer or route opens the log filtered to it.

## Accessibility

- The table has a caption; sorting is announced by `aria-sort`; rows are links by their route.
- Status is a word and a code, never colour alone.

## Content

- The sentence under the title says what the log holds and what opening a row gives: "Open one to see where its time went."
- Search placeholder: "Search requests".

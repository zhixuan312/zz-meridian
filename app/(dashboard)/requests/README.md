# Requests page

The request log: every call that reached the gateway, newest first, filtered and sorted in the address, so any view of it is a link a person can share and a tool can open.

Status: beta

## Structure

| Row | Pattern | Console (1024px and wider) | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker "ZZ Meridian · Production", title "Requests", one sentence, Freshness, Export CSV | One band | Title, sentence, then Freshness and Export on their own row |
| 1 | Row `tiles`: three Metric tiles for what the filters let through: requests (emphasis), errors and limits, latency p95, each with its 5-minute shape over the last hour and the last half hour against the one before | Three across | One column |
| 2 | Data table with a Filter bar in its toolbar: search, Status, Method, Region, the result count | Columns: Request (grow), Status, Latency, Customer (from 768px), Region (from 1024px), Size (from 1280px), Received | Card list: route and status, then latency, customer and when |

## States

| State | What shows |
|---|---|
| Default | The newest 20 of 240, sorted by Received, descending |
| Filtered | The tiles describe the matching set ("Matching requests"); the active filters take the accent wash; Clear appears |
| Set by an agent | `?by=Claude` adds the provenance line under the filters until a person changes them |
| Nothing matches | The table's filtered-out empty state with Clear filters; the tiles read zero |
| Loading | `loading.tsx`: the masthead skeleton, three tiles over a few skeleton table rows. On a navigation the real masthead (title, sentence) shows at once, with skeletons for the freshness stamp, the export and the body |
| Error | The table's error state with Retry; the filters stay |

## Data

The server reads one page of the `requests` collection (20 rows and the total) for the filters in the address, through `readRequests()` in `src/data/requests.ts`, and works the three tiles out of the same filtered set (the newest 500 of it, which the tiles say when the set is larger). The page never sends the full set. Error share counts 5xx and 429 responses. Latency above one second is written in `warning-ink`; no other cell is coloured except the status.

## Streaming

The page renders `PageFrame` itself, so the static title and sentence commit with the navigation. The freshness stamp, the Export link and the body (tiles and table) each read the address inside their own Suspense boundary, over one shared read.

## Addressable state

`?q=&status=2xx|3xx|4xx|5xx&method=GET|POST|PUT|DELETE&region=&sort=&dir=asc|desc&page=&by=` — one `useQueryState`, so a filter change and the page reset are one write, and the server renders the next page. A value the table does not offer falls back to its default. These are also the arguments of the `zz_meridian_requests` tool.

## Export

Export CSV is a link to `/api/export/requests` with the same filters and sort: the route checks the session (401) and the read permission (403), then streams the whole filtered set in batches of at most 100 rows, and a text value that starts like a formula is written as text.

## Embed view

`/embed/requests`: the tool `zz_meridian_requests { status?, method?, region?, q? }`. Inline: the five latest matching requests as a compact list (method, route, customer, when, latency, status), the count, and Ask; Expand when more match. Fullscreen: this page's table and filters, with the provenance line ("Set by Claude"). The view shares the count, the filters and the visible IDs with the model.

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

## Accessibility

- The table has a caption; sorting is announced by `aria-sort`; rows are links by their route.
- Status is a word and a code, never colour alone.

## Content

- The sentence under the title says what the log holds and what opening a row gives: "Open one to see where its time went."
- Search placeholder: "Search requests".

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
| Loading | The table's skeleton rows; the tiles keep their last values |
| Error | The table's error state with Retry; the filters stay |

## Data

`REQUESTS` from `src/system/fixtures/sample.ts`, filtered by `filterRequests()` in `src/views/requests.tsx`. Error share counts 5xx and 429 responses. Latency above one second is written in `warning-ink`; no other cell is coloured except the status.

## Addressable state

`?q=&status=2xx|3xx|4xx|5xx&method=GET|POST|PUT|DELETE&region=&sort=&dir=asc|desc&page=&by=` — one `useQueryState`, so a filter change and the page reset are one write. These are also the arguments of the `zz_meridian_requests` tool.

## Embed view

`/embed/requests`: the tool `zz_meridian_requests { status?, method?, region?, q? }`. Inline: the five latest matching requests as a compact list (method, route, customer, when, latency, status), the count, and Ask; Expand when more match. Fullscreen: this page's table and filters, with the provenance line ("Set by Claude"). The view shares the count, the filters and the visible IDs with the model.

## Surfaces

- **Console**: as above.
- **Mobile**: the Filters button and sheet replace the filter selects; the table becomes cards.
- **Embed**: see Embed view.

## Agents

An agent opens this page's views through `zz_meridian_requests`; it reads them through the shared context; it never exports or blocks from here. Its filters are marked until a person changes one.

## Accessibility

- The table has a caption; sorting is announced by `aria-sort`; rows are links by their route.
- Status is a word and a code, never colour alone.

## Content

- The sentence under the title says what the log holds and what opening a row gives: "Open one to see where its time went."
- Search placeholder: "Search requests".

# Request page

One request: who sent it, what it returned, where its time went, and its bodies, with Replay when it failed.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | Detail head: "← Requests", the ID in mono with its status Badge, facts (method and route, latency, customer, when; the customer opens its page), More actions, Copy as cURL, and Replay as the primary when the request failed (5xx or 429) | One band | Facts wrap; actions on their own row |
| 1 | Row `2/3`: Request facts (Key value, two columns: received, endpoint, latency, response size, customer opening its page, region, the request it replays when it is a replay, cost, and model and tokens only on the routes that call a model; the ID and status are in the head, not repeated) · Trace (one bar per phase on a shared scale: gateway, auth, queue, the route's own work, the response) | Side by side | Stacked |
| 2 | Request body and Response body side by side, each a card with a code block (wrapping, never scrolling sideways) and Copy | 1/2 + 1/2 | Stacked |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the facts beside the trace, then two body cards, as skeletons. The id is read inside that boundary |
| Success | Status `neutral`; the route's own phase (Model, Search, Storage or Parse) in the accent; no primary action |
| Rate limited, rejected, not found | Status `warning`; the trace ends at the limit, the validation or the lookup phase, in `critical`; tokens and cost read "None, refused"; the response is a short error body |
| No request body (GET, DELETE) | The Request body card says "No body: a GET carries everything it needs in its address." in a dashed frame; Copy as cURL sends no `-d` |
| Failed | Status `critical`; the route's own phase and the error phase in `critical`; Replay is the primary for someone who may replay |
| Failed, for a Viewer | The same, with no Replay and nothing in its place: the page does not say who can replay |
| Replayed | A toast "Replayed: 200 OK" (or 201) naming the new request, with Open; the new request leads the list and its page shows "Replay of" linking back |
| Replay refused | A critical toast "Not replayed" with the reason; nothing is written |
| Unknown ID | The page renders the console's Not found screen itself (`MissingPage`, see `app/not-found/README.md`), with `noindex`, rather than throwing `notFound()`, so the screen is in the first HTML |

## Data

The request from the `requests` collection (`src/data/collections.ts`), queried by id. A request keeps its customer's name, so the page works out the customer's page on the server from the `customers` collection, by name: the head's fact and the Customer value link to `/customers/<id>`, and a name the customers do not hold, or cannot be read for, is text. The card's footer, "More from" the customer, opens the log filtered to it. Replay is the page's Server Action (`actions.ts`, `replayRequest`): it authorizes, reads the request, and creates a new one with the same method, route, customer, region and model, naming the one it replays, then refreshes the tenant's request reads. A product calls its gateway there with the stored request; the sample's gateway answers a replay of a 5xx or a 429, the only requests that offer Replay, with the route's success. Its trace and payloads come from `traceOf()` and `payloadsOf()` in `src/system/fixtures/sample-records.ts`. Phases add up to the request's latency; the axis shows 0, half and the total. Its tokens and its cost come from `usageOf()` beside them, which prices the request from the `models` collection's records and from no other list: its tokens at its model's prices a million, in and out, the price of a call when it reached no model, and nothing when it was refused. A cost too small for four decimals keeps its first two digits ("$0.0000018"), so one that is not zero never reads as zero.

## Embed view

None of its own. An agent shows a request through `zz_meridian_requests` (inline rows open this page in the console).

## Surfaces

- **Console**: as above.
- **Mobile**: one column; the trace keeps its full width, so short phases stay visible (each bar is at least 4px).
- **Embed**: not offered; the inline list links here.

## Agents

Replay is a person's action here: it is `pageOnly`, so no agent can run or propose it. The page shares its context through `requestContext` in `src/views/request-context.ts`.

### What the agent reads

The request, its status, latency (with its definition), customer and region, its tokens on a route that calls a model and what it cost (with how a cost is worked out), every phase with its start and duration, the payloads' sizes (their text is in the page text), and what code found: where most of the time went, the latency against the route's p95, and, for a failed request, that it counts in the error rate. It says that one request is one sample, and that replaying it is the person's.

```text
- Most of its time went to Rate limit (Over 1,200 requests a minute): 159ms, 93% of 171ms.
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

### What the agent does here

Protagonist: Request.

- "How did the other sampled requests to this route end?" — the sampled requests to its route, by status class, which says they are a sample of the latest requests
- "Is this route slower for some customers than others?" — the latency p95 of the sampled requests to its route, by customer
- "How often does this route fail in each region?" — the errors and limits of the sampled requests to its route and their share, by region
- "Which other requests to this route failed, and where do I open them?" — the sampled requests to its route whose status class is 5xx, with up to 20 of them, each with its request's address

The protagonist, Request, is the Request facts card the structure places beside the trace. One request's prepared query (`requestExplore` in `src/views/request-explore.ts`) takes the page's `id` beside the call and reads one source, the sampled log, with the measures of the request log's query. Its `fixed` reads the request by the id under the person's rights and holds every call to the request's route, so a call can neither narrow nor group by another route; an id that names no request is answered that there is no such request, and nothing else is read.

## Accessibility

- The trace carries a hidden table of phases and durations.
- The ID is the page title; "Copy request ID" in the menu copies it.

## Content

- Facts are values ("2.1s", "Parallax AI"), not labels.
- The Trace card says the count and the total: "5 phases, 2.1s end to end".

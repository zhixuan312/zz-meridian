# Request page

One request: who sent it, what it returned, where its time went, and its bodies, with Replay when it failed.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | Detail head: "← Requests", the ID in mono with its status Badge, facts (method and route, latency, customer, when), More actions, Copy as cURL, and Replay as the primary when the request failed (5xx or 429) | One band | Facts wrap; actions on their own row |
| 1 | Row `2/3`: Request facts (Key value, two columns: received, endpoint, latency, response size, customer linking to their requests, region, the request it replays when it is a replay, cost, and model and tokens only on the routes that call a model; the ID and status are in the head, not repeated) · Trace (one bar per phase on a shared scale: gateway, auth, queue, the route's own work, the response) | Side by side | Stacked |
| 2 | Request body and Response body side by side, each a card with a code block (wrapping, never scrolling sideways) and Copy | 1/2 + 1/2 | Stacked |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the facts beside the trace, then two body cards, as skeletons. The id is read inside that boundary |
| Success | Status `neutral`; the route's own phase (Model, Search, Storage or Parse) in the accent; no primary action |
| Rate limited, rejected, not found | Status `warning`; the trace ends at the limit, the validation or the lookup phase, in `critical`; tokens and cost read "None, refused"; the response is a short error body |
| No request body (GET, DELETE) | The Request body card says "No body: a GET carries everything it needs in its address." in a dashed frame; Copy as cURL sends no `-d` |
| Failed | Status `critical`; the route's own phase and the error phase in `critical`; Replay is the primary |
| Replayed | A toast "Replayed: 200 OK" (or 201) naming the new request, with Open; the new request leads the list and its page shows "Replay of" linking back |
| Replay refused | A critical toast "Not replayed" with the reason; nothing is written |
| Unknown ID | The page renders the console's Not found screen itself (`MissingPage`, see `app/not-found/README.md`), with `noindex`, rather than throwing `notFound()`, so the screen is in the first HTML |

## Data

The request from the `requests` collection (`src/data/collections.ts`), queried by id. Replay is the page's Server Action (`actions.ts`, `replayRequest`): it authorizes, reads the request, and creates a new one with the same method, route, customer, region and model, naming the one it replays, then refreshes the tenant's request reads. A product calls its gateway there with the stored request; the sample's gateway answers a replay of a 5xx or a 429, the only requests that offer Replay, with the route's success. Its its trace and payloads from `traceOf()` and `payloadsOf()` in `src/system/fixtures/sample-records.ts`. Phases add up to the request's latency; the axis shows 0, half and the total.

## Embed view

None of its own. An agent shows a request through `zz_meridian_requests` (inline rows open this page in the console).

## Surfaces

- **Console**: as above.
- **Mobile**: one column; the trace keeps its full width, so short phases stay visible (each bar is at least 4px).
- **Embed**: not offered; the inline list links here.

## Agents

Replay and blocking a key are a person's actions here. An agent that wants either sends a Proposal.

## Accessibility

- The trace carries a hidden table of phases and durations.
- The ID is the page title; "Copy request ID" in the menu copies it.

## Content

- Facts are values ("2.1s", "Parallax AI"), not labels.
- The Trace card says the count and the total: "5 phases, 2.1s end to end".

# Request page

One request: who sent it, what it returned, where its time went, and its bodies, with Replay when it failed.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | Detail head: "← Requests", the ID in mono with its status Badge, facts (method and route, latency, customer, when), More actions, Copy as cURL, and Replay as the primary when the request failed (5xx or 429) | One band | Facts wrap; actions on their own row |
| 1 | Row `2/3`: Request facts (Key value, two columns, with the ID as a Copy field and the customer linking to their requests) · Trace (one bar per phase on a shared scale) | Side by side | Stacked |
| 2 | One card with Tabs: Request body, Response body, each a code block with Copy | Full width | Full width |

## States

| State | What shows |
|---|---|
| Success | Status `positive`; the model phase in the accent; no primary action |
| Rate limited, rejected | Status `warning`; the trace ends at the limit or the validation phase, in `critical` |
| Failed | Status `critical`; the model and error phases in `critical`; Replay is the primary |
| Unknown ID | The console's Not found page |

## Data

`requestById()`, `traceOf()` and `payloadsOf()` in `src/system/fixtures/relay-records.ts`. Phases add up to the request's latency; the axis shows 0, half and the total.

## Embed view

None of its own. An agent shows a request through `relay_requests` (inline rows open this page in the console).

## Surfaces

- **Console**: as above.
- **Mobile**: one column; the trace keeps its full width, so short phases stay visible (each bar is at least 4px).
- **Embed**: not offered; the inline list links here.

## Agents

Replay and blocking a key are a person's actions here. An agent that wants either sends a Proposal.

## Accessibility

- The trace carries a hidden table of phases and durations.
- The ID's Copy field is named "Request ID".

## Content

- Facts are values ("2.1s", "Parallax AI"), not labels.
- The Trace card says the count and the total: "5 phases, 2.1s end to end".

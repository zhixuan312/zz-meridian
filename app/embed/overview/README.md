# Overview view

The Overview as an MCP App: the answer to "how is the API doing?" placed beside the assistant's reply, with the day the person points at told to the model.

Status: beta

## Structure

| Mode | Holds |
|---|---|
| Inline (fits 480px) | Embed frame head (mark, "Overview · Last 30 days", freshness, Expand, Open in Relay); three Metric tiles (Requests featured in the accent, Error rate, Latency p95); a card with the requests trend at 168px and Ask |
| Fullscreen | The console Overview's rows under the embed head |

## States

- **Not connected** (opened directly, or in the Atlas without a host): renders as a guest with Meridian's own neutrals; Ask is absent; Expand opens the console in a new tab.
- **Connected**: host theme and neutrals applied; height reported on every change; Ask posts into the conversation.
- **Host refuses fullscreen**: Expand opens the console page instead (`ui/open-link`).

## Tool

`relay_overview { period: "7d" | "30d" | "90d" | "all" }` returns the totals and the daily series and names `ui://relay/overview`.

## Agents

Shares "Relay overview for the last 30 days: 2.9M requests, 0.90% errors, p95 294ms." and, when a day is pointed at, "The person is looking at 22 Sept 2026: 128,402 requests, 2.31% errors, p95 486ms.", with `{ view, period, day }` as structured content.

# Overview view

The Overview as an MCP App: the answer to "how is the API doing?" placed beside the assistant's reply, with the day the person points at told to the model.

Status: beta

## Structure

| Mode | Holds |
|---|---|
| Inline (fits 480px) | Embed frame head (mark, "Overview · Last 30 days", freshness, Expand, Open in ZZ Meridian); three Metric tiles (Requests featured in the accent, Error rate, Latency p95); a card with the requests trend at 168px and Ask |
| Fullscreen | The console Overview's rows under the embed head |

## States

- **Not connected** (opened directly, or in the Atlas without a host): renders as a guest with Meridian's own neutrals; Ask is absent; Expand opens the console in a new tab.
- **Connected**: host theme and neutrals applied; height reported on every change; Ask posts into the conversation.
- **Host refuses fullscreen**: Expand opens the console page instead (`ui/open-link`).

## Tool

`zz_meridian_overview { period: "7d" | "30d" | "90d" | "all" }` returns the totals and the daily series and names `ui://zz-meridian/overview`.

## Agents

The Overview page's context, unchanged (`app/(dashboard)/(overview)/README.md` lists it): the view renders the console's figures and shares the console's context, so an MCP host and the console's assistant are told the same thing. Ask on the trend posts "Why did requests change on <day>?" or "What drove the trend in requests this period?".

### What the agent reads

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.

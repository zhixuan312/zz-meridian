# Health · MCP view

The Health view is what an assistant shows when asked whether ZZ Meridian is healthy: the live incident and every service's state, small enough to sit in a conversation.

Status: beta

## Structure

| Mode | Content |
|---|---|
| Inline | Embed frame head (mark, "Health", Freshness, Expand, Open in ZZ Meridian); a warning Banner for a live incident with Ask; the Status list with its summary and without descriptions |
| Fullscreen | The Health page's rows under the embed head |

## States

| State | Inline |
|---|---|
| All operational | No banner; the summary reads "All services operational" |
| Live incident | The banner names it, its state and when it started |
| Not connected (opened directly) | The same view; Ask is absent; Expand opens the console |

## Data

`SERVICES`, the first unresolved incident from `INCIDENTS`, and `PAST_INCIDENTS` for fullscreen.

## Surfaces

Embed only, at 360 to 760px inline and the host's full panel in fullscreen. The status list's bars show the last 30 days inline.

## Agents

The Health page's context (`app/(dashboard)/health/README.md` lists it), inline and in fullscreen. Ask on the banner posts "What is the impact of … on my traffic?".

### What the agent reads

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.

## Accessibility

As the Status list and Banner; the view reports its height, so it never scrolls inside the host.

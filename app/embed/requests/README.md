# Requests embed view

The request log as an MCP App view: the five latest requests that match a tool's arguments inline in the conversation, and the full table in fullscreen.

Status: beta

## Structure

| Mode | What shows |
|---|---|
| Inline | Embed frame head: "Requests · status 5xx" (the arguments in words, or "Latest requests"), Freshness, Expand (only when more match), Open in Relay. One card: the count and "showing the latest 5", Ask (when a host is connected), then five rows: method, route, customer and when, latency, status, and a chevron |
| Fullscreen | The console's Data table with its Filter bar, carrying "Set by Claude" for the tool's filters |

## States

| State | What shows |
|---|---|
| Matches | Up to five rows; Expand when there are more |
| No match | An inline filtered-out empty state naming what the tool asked for |
| Not connected | The same view without Ask (opened in a tab or in the Atlas) |

## Data

The tool `relay_requests { status?, method?, region?, q? }`; the arguments are the view's query parameters, the same names as the console's filters.

## Agents

The view shares the count, the filters and the latest IDs (`ui/update-model-context`), so a follow-up question about "these" has a referent. Ask posts "Why are these status 5xx requests failing, and what do they have in common?". Pressing a row opens that request in the console through the host (`ui/open-link`).

## Surfaces

- **Embed inline**: as above, at 360 to 760px; no scrollbar of its own, the height is reported to the host.
- **Embed fullscreen**: the table at the host's width.

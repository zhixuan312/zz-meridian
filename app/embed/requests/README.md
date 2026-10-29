# Requests embed view

The request log as an MCP App view: the five latest requests that match a tool's arguments inline in the conversation, and the full table in fullscreen.

Status: beta

## Structure

| Mode | What shows |
|---|---|
| Inline | Embed frame head: "Requests · status 5xx" (the arguments in words, or "Latest requests"), Freshness, Expand (only when more match), Open in ZZ Meridian. One card: the count and "showing the latest 5", Ask (when a host is connected), then five rows: method, route, customer and when, latency, status, and a chevron |
| Fullscreen | The console's Data table with its Filter bar, carrying "Set by Claude" for the tool's filters until a person changes one (the address then carries `by=you`) |

## States

| State | What shows |
|---|---|
| Matches | Up to five rows; Expand when there are more |
| No match | An inline filtered-out empty state naming what the tool asked for |
| Not connected | The same view without Ask (opened in a tab or in the Atlas) |

## Data

The tool `zz_meridian_requests { status?, method?, region?, q? }`; the arguments are the view's query parameters, the same names as the console's filters. The page reads what the console page reads, through `readRequests`: one page of the filtered set, its total and the summary of up to 500 of it; the inline card shows the first five, the fullscreen table pages on the server.

## Agents

The Requests page's context (`app/(dashboard)/requests/README.md` lists it), read through the same `readRequests`, with the rows the view draws: the five latest inline, the page in fullscreen. Ask posts what the console's Ask posts of the same rows: "What stands out in the latest requests, and why?", or with a filter "What do these requests with status 5xx have in common, and why?", and the context answers with figures. Pressing a row opens that request in the console through the host (`ui/open-link`).

### What the agent reads

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.

## Surfaces

- **Embed inline**: as above, at 360 to 760px; no scrollbar of its own, the height is reported to the host.
- **Embed fullscreen**: the table at the host's width.

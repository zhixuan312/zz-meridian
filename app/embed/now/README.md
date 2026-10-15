# Now · MCP view

The Now view is what an assistant shows when asked whether ZZ Meridian is healthy: the open incident and every service's state, small enough to sit in a conversation, and the whole Now page in fullscreen.

Status: beta

## Structure

| Mode | Content |
|---|---|
| Inline | Embed frame head (mark, "Now", Freshness, Expand, Open in ZZ Meridian); a warning Banner for the open incident, the most severe when several are open, with Ask; the Status list with its summary and without descriptions |
| Fullscreen | The Now page's body under the embed head: parts 2 to 13, from the Featured metric of the days inside the band to "Changes" (`app/(dashboard)/engineering/README.md`) |

## States

| State | Inline |
|---|---|
| All operational | No banner; the summary reads "All services operational" |
| Open incident | The banner names it, its state and when it started; with several, the most severe |
| Services not read | The list's place says the services could not be read, as "Services, now" on the page does; never "All services operational" |
| No service monitored yet | The list's place says no service is monitored yet |
| Nothing arrived yet | Every read answered and none holds a record (`nothingArrived`): the page's one card, "No services yet", as fullscreen draws it |
| Not connected (opened directly) | The same view; Ask is absent; Expand opens the console |

## Data

The Now tool's read (`nowTool` in `src/views/tools.ts`), the page's own: inline draws the services and the most severe open incident, fullscreen the page's body. The strips cross to the browser one character a day (`packNow` in `src/views/now-context.ts`), as the page's do.

## Surfaces

Embed only, at 360 to 760px inline and the host's full panel in fullscreen. The status list's bars show the last 90 days inline, as on the page; fullscreen lays the parts out as the page does at the panel's width.

## Agents

The Now page's context (`app/(dashboard)/engineering/README.md` lists it), inline and in fullscreen: it leads with the title the page is headed by and the days inside the band, so the view shares them though its head says "Now". Ask on the banner posts "What is the impact of … on my traffic?".

### What the agent reads

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.

## Accessibility

As the Status list and Banner; the view reports its height, so it never scrolls inside the host.

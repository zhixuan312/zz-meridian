# Home view

The Home as an MCP App: the company's page placed beside the assistant's reply, revenue first, with the day the person points at told to the model.

Status: beta

## Structure

| Mode | Holds |
|---|---|
| Inline (fits 480px) | Embed frame head (mark, "Home · Last 30 days", freshness, Expand, Open in ZZ Meridian); the revenue card, the page's Featured metric with revenue a day and the day in progress running, and Ask as its action; the three tiles beside it on the page (Customers, Tokens served, Requests), one column under 48rem |
| Fullscreen | The console Home's parts 2 to 9 under the embed head (`app/(dashboard)/(home)/README.md`, "Structure"): the revenue card and its three tiles, the row of tiles, the year, A year, counted, revenue a period and what we sell, the two team cards and what is worth knowing |

Compute cost and gross margin are drawn only for a person who may read what compute cost, in fullscreen, as on the page; inline draws neither for anyone. Nothing stands in their place.

## States

- **Not connected** (opened directly, or in the Atlas without a host): renders as a guest with Meridian's own neutrals; Ask is absent; Expand opens the console in a new tab.
- **Connected**: host theme and neutrals applied; height reported on every change; Ask posts into the conversation.
- **Host refuses fullscreen**: Expand opens the console page instead (`ui/open-link`).
- **Empty** (no complete day kept): one card says no requests have arrived yet, inline and in fullscreen alike.
- **Partial**: a part whose read failed says so in its own place, as on the page.

## Tool

`zz_meridian_home { period: "7d" | "30d" | "90d" | "all", day? }` returns Home's data, the read the console page renders from (`app/(dashboard)/(home)/README.md`, "Data"): the period's complete days and their totals, those of the same number of days before (null for `all`, which has none), the day in progress on its own, the title and the facts of a year, the line under the title, each part's figures and what could not be read; and names `ui://zz-meridian/home`. Compute cost and gross margin are in it only for a person who may read what compute cost, under the same rule as the page, so the embedded Home names neither to anyone else.

## Agents

The Home page's context (`app/(dashboard)/(home)/README.md` lists it): the view renders the console's figures and shares the console's context, so an MCP host and the console's assistant are told the same thing. It leads with the company's figures and the sentence the console page is headed by, then the facts of a year and the lines worth knowing, which the tool's read works out on the server; the embed head keeps the view's name and period ("Home · Last 30 days"). Ask on the revenue card posts "Why does revenue on <day> look the way it does?" or "What stands out in revenue over the last 30 days, and why?".

### What the agent reads

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.

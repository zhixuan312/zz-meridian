# Services

The Services page answers "is anything wrong, and since when": uptime across every service, the live incident, each service's state and history, and what happened before.

Status: beta

## Structure

| Row | Split | Content | Pattern |
|---|---|---|---|
| Masthead | | Kicker "ZZ Meridian · Production"; the title, a sentence about the uptime and the longest clean run (below), with the page's name kept in the heading; one sentence; Freshness. No action: the product sends no incident updates, so it offers no subscription | Page frame |
| 1 | 2/3 + 1/3 | Uptime over 90 days at hero size, the worst state in words, a "right now" grid of every service, and the worst-state-per-day bars; the live incident beside it | Featured metric, Uptime bars, Incident card |
| 2 | Full | Services: state, p95 and 90 days of bars per service | Status list in a Card |
| 3 | Full | Past incidents, newest first | Incident card, `row` |

### The title

The page is headed by the uptime it states for its 90 days and how long a service has run without a mark, worked out by `servicesTitle` in `src/views/services-context.ts`. The heading reads "Services: " before it, out of sight, and the top bar shows "Services".

| When | The title |
|---|---|
| The service whose current run is the longest (the team's order decides a tie) is on its own longest run, and that run does not reach back to the first day of its strip | "99.94% uptime in 90 days, and Dashboard has run 69 days without a mark" ("1 day") |
| Otherwise: no service is operational today, the longest current run is not that service's longest, or it reaches the first day and is only "at least" that long | "99.94% uptime in 90 days" |
| The days could not be read | The uptime alone, and the context says the days could not be read |
| No service yet | The page is headed by its name |

The uptime is the one row 1 states, to two decimals. A run is worked out by `run` in `src/lib/facts.ts` from the days each service's strip draws, the days the Status list counts its run from. In the sample Files is on its longest run too, at 47 days, and Dashboard's 69 days are the longest current run.

Without a live incident row 1 becomes one full-width featured card. With more than one, a full-width card, "Also open", follows row 1 and lists every other incident nobody has resolved, newest first, so each incident the bell and Main name is on this page.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: a heading that holds "Services", read out and not drawn, and the sentence's block (`LoadingPage` with `sentence`), then the uptime figure with its service grid, the service list and the past incidents, as skeletons in their rows |
| All operational | The featured caption says "All services operational."; row 1 is full width; no warning colour anywhere |
| Degraded | The affected service is named in the caption, its dot pulses in the grid and the list; the incident card sits beside |
| Outage | As degraded, in critical; a product that wants a count on the rail's Services entry sets `badge` in `src/app.config.ts` (the sample sets none) |
| No services | One card: "No services yet"; the page is headed "Services" |
| Days not read | The title is the uptime alone; the context states no days inside the band and says the days could not be read |
| No access | The product's refusal page, before any read (`FEATURES.services.needs` is `services:read`, `incidents:read` and `days:read`, which every role that reads the services also holds) |
| No past incidents | An empty state in the card: "No incidents in 90 days" |
| Error | The dashboard error screen with Retry |

## Data

- Uptime: the mean of each service's uptime over the 90 days shown. A service's own uptime is worked out from its days by one rule (`uptimeOf()` in `src/system/fixtures/sample.ts`): a degraded day costs half an hour and a day of outage two hours, so it reads 100% exactly when its strip carries no mark. The last day of a strip is the day in progress, and is the service's state now.
- The day bars of row 1: the worst state of any service that day.
- "Right now": each service's state and p95 over the last hour.
- Incidents: the `incidents` collection, read through the Services tool (`readIncidents()` in `src/data/metrics.ts`). The newest one nobody has resolved leads the page; any other unresolved one is listed under "Also open"; the resolved ones are the past incidents. The sample's rows are `INCIDENTS` in `src/system/fixtures/sample.ts` and `PAST_INCIDENTS` in `src/system/fixtures/sample-ops.ts`. A record names who has the incident and, by its id, the ticket its work is tracked in; the read hands the card the owner's name, which the card that leads the page draws, and not the id.
- Services: the `services` collection, in the order the team reads its stack.
- The title and the days inside the band are worked out in the Services tool's read, on the server: the title from the services' uptimes and strips, and the days inside the band from every complete day kept (`readDays('all')`), held to `facts.band` in `src/app.config.ts` by `steady`. The page is handed the sentences (`head` on its data) and never the days.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: rows stack; the grid shows two services across; the bars still draw every day.
- **Embed**: none; see Embed view.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `servicesContext` in `src/views/services-context.ts`.

### What the agent reads

Its first insight is the title the page is headed by, word for word; the second, the days inside the band over every complete day kept, with the page's address as its evidence ("Steady: 357 of 360 days inside the band of p95 under 350 ms and errors under 1%; outside it on 17 Aug 2026, 21 Sept 2026 and 22 Sept 2026."). The context's own title stays "Services". Then every service's state, latency now and uptime; the average uptime with its definition; which services carry the days below operational ("Inference API accounts for 3 of them"); the newest open incident with its latest update by time, not by position, and a line for every other incident nobody has resolved; the longest incident resolved in the last 90 days. Unknowns: that a monitoring incident is not yet confirmed fixed, and that latency is one reading with no history to call it unusual.

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike, on load and on every change.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **Handoff:** Ask on the uptime card hands the open incident to the assistant: "Which service is hurting uptime, and is … over?"

## Embed view

None of its own. The embed of what is happening now is Now's (`/embed/now`, `app/embed/now/README.md`); this page's 90-day record is not offered as an embed.

## Accessibility

- The heading is the only `h1`: "Services", read out and not drawn, then the title's sentence. Card titles are `h2`; the incident title `h3`.
- Every state is a word beside its dot; the status summaries are live regions.

## Content

- Name services as customers know them; write incident titles as symptom and scope.
- The caption counts days: "12 of the last 90 days had a service below operational".

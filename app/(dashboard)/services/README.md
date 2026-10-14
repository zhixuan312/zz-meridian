# Services

The Services page answers "is anything wrong, and since when": each service in the order the team reads its stack, with its last 90 days and how long it has run, then every incident, the open ones first.

Status: beta

## Structure

Three parts, in this order. No other part draws a Status list or an Incident card.

| Part | Split | Pattern | Holds |
|---|---|---|---|
| 1. Head | | Page frame | Kicker "ZZ Meridian · Production"; the title, a sentence about the uptime and the longest clean run (below), with the page's name kept in the heading; one sentence, "Every service, how it is right now, and what happened in the last 90 days."; Freshness. No action: the product sends no incident updates, so it offers no subscription |
| 2. Each service, 90 days | 2/3 | Card with a Status list, `run` | Every service in the team's order (the `order` of its record, the gateway first), with the summary of the worst state now, each service's state, its p95 now, its last 90 days as a strip and how long it has run ("Operational for 69 days · its longest in 90", "Degraded today") |
| 3. Incidents | 1/3 | Incident cards under the part's own heading, then a Card of Incident card rows | One list. The open ones first, newest first, each in the card form with its owner and its ticket, which opens the Tickets page on it, every update timed from its start, and a line above it of how long it has lasted so far ("Open for 3.2h so far"). Then the resolved ones, newest first, in the row form, each saying how long it lasted ("lasted 2.4h"). With none open, one card says so; with none resolved, one line says so |

The parts are one Suspense boundary, the page's body, behind a masthead that renders at once.

### The title

The page is headed by the uptime it states for its 90 days and how long a service has run without a mark, worked out by `servicesTitle` in `src/views/services-context.ts`. The heading reads "Services: " before it, out of sight, and the top bar shows "Services".

| When | The title |
|---|---|
| The service whose current run is the longest (the team's order decides a tie) is on its own longest run, and that run does not reach back to the first day of its strip | "99.94% uptime in 90 days, and Dashboard has run 69 days without a mark" ("1 day") |
| Otherwise: no service is operational today, the longest current run is not that service's longest, or it reaches the first day and is only "at least" that long | "99.94% uptime in 90 days" |
| Every service operational on every day | "100% uptime in 90 days" |
| The days could not be read | The uptime alone, and the context says the days could not be read |
| No service yet | The page is headed by its name |

The uptime is the mean of each service's own, to two decimals. Exactly one reads "100%"; an uptime under one never reads as a whole one, so one that would round to "100.00%" reads "99.99%". The title and the context write it the same way. A run is worked out by `run` in `src/lib/facts.ts` from the days each service's strip draws, the days the Status list counts its run from. In the sample Files is on its longest run too, at 47 days, and Dashboard's 69 days are the longest current run.

### At 390px

The two parts stack, "Each service, 90 days" first. Each Status list row drops its strip under the name and keeps its run on a line under the strip; the open incident's card and the resolved rows take the full width, a long title or ticket wrapping rather than being cut. Nothing scrolls sideways.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the masthead as the page will have it (`LoadingPage` with the kicker, the heading that holds "Services", read out and not drawn, with the sentence's block, the page's one sentence and the freshness), then the two parts' shapes. The page's own fallback for its body is the same shapes, so the body does not move when the page arrives |
| All operational | The summary says "All services operational"; no warning colour anywhere |
| Degraded | The summary names how many are degraded; the service's dot pulses and its row says "Degraded today" |
| Outage | As degraded, in critical, "Down today"; a product that wants a count on the rail's Services entry sets `badge` in `src/app.config.ts` (the sample sets none) |
| No services | One card, "No services yet", and no part is drawn; the page is headed "Services" |
| Partial: the incidents not read | "Incidents" is a card that says the incidents could not be read; every service stands, and the context says no incident is stated |
| Days not read | The title is the uptime alone; the context states no days inside the band and says the days could not be read |
| No open incident | A card under "Incidents" says no incident is open, and the resolved ones follow |
| Several open incidents | One card each, newest first, each with how long it has lasted so far, before every resolved one |
| No access | The product's refusal page, before any read (`FEATURES.services.needs` is `services:read`, `incidents:read` and `days:read`, which every role that reads the services also holds) |
| Error | The dashboard error screen with Retry: a services read that fails is the page's error |

## Data

Every figure is read on the server by the Services tool's read (`servicesTool` in `src/views/tools.ts`); the page, its title and its context share that read and the page works nothing out.

- **The services**: the `services` collection, `readServices()` in `src/data/metrics.ts`, in the order the team reads its stack. A service's uptime is worked out from its days by one rule (`uptimeOf()` in `src/system/fixtures/sample.ts`): a degraded day costs half an hour and a day of outage two hours, so it reads 100% exactly when its strip carries no mark. The last day of a strip is the day in progress, and is the service's state now.
- **The incidents**: the `incidents` collection, `readIncidents()` in `src/data/metrics.ts`, read apart from the services: a read that fails leaves `incidents` null and the part saying so. Newest first; those nobody has resolved are `open`, the others `resolved`. A record names who has the incident and, by its id, the ticket its work is tracked in; the read hands the card the owner's name and the ticket's title with the address the Tickets page finds it at. How long an incident lasted, or has lasted so far, is `lastedOf` in `src/views/services-context.ts`, in the product's durations. The sample's rows are `INCIDENTS` in `src/system/fixtures/sample.ts` and `PAST_INCIDENTS` in `src/system/fixtures/sample-ops.ts`.
- **The title and the days inside the band** are worked out in the read, on the server: the title from the services' uptimes and strips, and the days inside the band from every complete day kept (`readDays('all')`), held to `facts.band` in `src/app.config.ts` by `steady`. The page is handed the sentences (`head` on its data) and never the days.

The strips cross to the browser one character a day (`packServices`). Nothing writes.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: one column, as "At 390px" says.
- **Embed**: none; see Embed view.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `servicesContext` in `src/views/services-context.ts` from the figures the page draws.

### What the agent reads

Its first insight is the title the page is headed by, word for word; the second, the days inside the band over every complete day kept, with the page's address as its evidence ("Steady: 357 of 360 days inside the band of p95 under 350 ms and errors under 1%; outside it on 17 Aug 2026, 21 Sept 2026 and 22 Sept 2026."). The context's own title stays "Services". Its facts are the services now, the average uptime with its definition, and every service in the team's order with its state, its latency now, its uptime and its run in the Status list's words. Then which services carry the days below operational, the lowest uptime, each open incident with its owner, its ticket's title, how long it has lasted so far and its latest update, timed from its start; and every resolved incident, newest first, with how long it lasted. Unknowns: that the incidents could not be read, when they could not; that a monitoring incident is not yet confirmed fixed; and that latency is one reading with no history to call it unusual. Within its budget of 2,600 characters for every persona (2,243 in the sample):

```text
- 99.94% uptime in 90 days, and Dashboard has run 69 days without a mark
- Open incident "Elevated latency on Inference API in eu-west-1" on Inference API, minor, monitoring, with Jonas Weber, tracked in "Inference API p95 above target in eu-west-1": open for 3.2h so far, since 03 Oct 2026, 05:48 UTC; latest update after 2.6h: "p95 back under 650ms. Monitoring before we close this.". Evidence: /services
- 3 incidents resolved, newest first: "Upload failures for files over 50 MB" on 17 Aug 2026, lasted 2.4h; "Webhook deliveries delayed up to 9 minutes" on 01 Aug 2026, lasted 54m; "Embeddings returned 503 for 6 minutes in us-east-1" on 14 Jul 2026, lasted 6m.
```

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part.
- **Console assistant:** the same text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.

## Embed view

None of its own. The embed of what is happening now is Now's (`/embed/now`, `app/embed/now/README.md`); this page's 90-day record is not offered as an embed.

## Accessibility

- The heading is the only `h1`: "Services", read out and not drawn, then the title's sentence. Part titles are `h2`; "Incidents" heads its part, a region named by it, above the cards, and each open incident's card titles itself with the incident.
- Every state is a word beside its dot; the status summary is a live region; each strip is one Tab stop whose arrow keys read one day, with a screen-reader summary of its days.
- How long an incident lasted is text, never a colour or a length alone.

## Content

- Name services as customers know them; write incident titles as symptom and scope.
- A run is a count of whole days: "Operational for 69 days", never "No incidents for over two months".
- A duration is the product's: "3.2h", "54m", "6m".

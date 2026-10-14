# Now

The Now page is the Engineering workspace's home: which services are up this moment and what is open, how steady the product has been, what each model and region carries, what ships and who has the work, and what changed.

Status: beta

## Structure

Twelve parts, in this order. Every chart and list is the card named, and no other part draws a Status list, an Incident card, Uptime bars, a Bar list, a Metric tile, a Column chart or an Activity feed.

| Part | Split | Pattern | Holds |
|---|---|---|---|
| 1. Head | | Page frame | Kicker `ZZ Meridian · Production`; the title, a sentence about the services and the releases (below), with the page's name kept in the heading; the line under it (below), then who Engineering is for (`workspaces.engineering.audience`, read from the declaration); Freshness. No action |
| 2. Services, now | 2/3 | Card with a Status list, `run` | Every service in the team's order with its state, its last 90 days and how long it has run ("Operational for 69 days · its longest in 90"). Past eight services, the ones not operational, then the three with the longest current runs (below). Always a link to Services that names how many there are: "All 6 services" |
| 3. Open incident | 1/3 | Incident card, under the part's own heading | The incident nobody has resolved, each update timed from its start ("at the start", "after 1.1h"), its owner and its ticket, which opens the Tickets page on it. With several, "Open incidents": one card each, the most severe first and then the newest. With none, one card says so with when the last one was resolved and how long it lasted ("the last was resolved on 17 Aug 2026 and lasted 2.4h") |
| 4. N of M days inside the band | full | Card with Uptime bars, `lg`, and a list | Titled by its figure, "357 of 360 days inside the band". The last 360 complete days, ending on the latest complete day, a mark for each day outside the band (`facts.band` in `src/app.config.ts`); the share of the days shown inside it, read "99.17% inside the band"; then four facts: the days outside by date, the year of requests beside the range of the median day's p95, p95 on the busiest day yet, and the requests answered without an error |
| 5. Models, now | 2/3 | Data table | A row a model over the last 30 complete days, the most requested first: its name with the route it serves under it, its requests, "p95, median day", its first token on the median day (a dash where the model streams none; the column drops when the table is under 672px), and "Errors, 5xx and 429" with their share |
| 6. Compute in use | 1/3 | Card with a Bar list | GPU-hours used of those provisioned, a row a region, on the latest complete day, named; the fullest highlighted; each row's second line its GPUs provisioned |
| 7. Shipping | 1/2 | Card with three lists | The releases in testing, each with what holds it ("Held by smoke on POST /v1/embeddings: failed"); the ones ready; the live version of each service. Its line counts the required checks passed of all over the releases not yet out ("4 of 7"). A link to every release |
| 8. Work | 1/2 | Card with a list | At most six open or waiting tickets: high priority first, then those nobody owns, then the rest, the newest opened first inside each. Each opens the Tickets page on it, with its priority, its state and its owner or "Nobody owns it"; the reader's own is marked "Yours". How many more, and a link to every ticket |
| 9. Slowest endpoints | full | Data table | Every endpoint by p95, the slowest first, with its requests and its error rate, over the 30 days the endpoints cover |
| 10. The month | tiles | Four Metric tiles | Over the last 30 complete days: Releases out (the latest named), Tickets closed (how long each took), Runs passed (of how many, with the latest failed run as the one finding, a warning) and Incidents resolved (every duration, or the last one with its date and how long it lasted). A tile's line is at most 32 characters |
| 11. Verification runs a day, by how they ended | 2/3 | Card with a Column chart, stacked with tones | The last 30 complete days and today so far, running: passed `neutral`, skipped `warning`, failed `critical`. A day with no run is a column of nothing. The tiles and the chart share a Meridian of the runs' days, so the finding on Runs passed points the chart at its day |
| 12. Changes | 1/3 | Card with an Activity feed | The latest changes, newest first, live: an agent's change names the agent and the person it acted for |

The parts are one Suspense boundary, the page's body: a part with a boundary of its own would be written after the others.

### The title

The page is headed by what is wrong first and then what is waiting to ship, worked out by `nowTitle` in `src/views/now-context.ts`. The heading reads "Now: " before it, out of sight, and the top bar shows "Now".

| When | The title |
|---|---|
| A service is down | "Files is down", or "2 services are down" when several are |
| None is down and a service is degraded | "Inference API is degraded", or "2 services are degraded" |
| Every service is operational | "All 6 services are operational" |
| Then, the releases in testing | ", and 3 releases are in testing", ", and 1 release is in testing" or ", and no release is in testing" |
| The releases could not be read | The first clause alone |
| No service yet | The page is headed by its name |

A release is in testing as the Releases page counts it: it has not gone out and a required verification has no run, or its latest run failed or was skipped. In the sample: "Inference API is degraded, and 3 releases are in testing".

### The line under the title

One line, worked out by `nowData` in `src/views/now-parts.ts`: the most severe open incident's updates timed from its start, in the Incident card's words, then ", and another incident open" or ", and 2 more incidents open" when there are more; the services as the Status list's summary says them; and the days inside the band. The title names the service and the card the incident, so the line does not, and it keeps to the room of the lead (`LeadRoom`) beside Freshness. In the sample: "Updates at the start, after 1.1h and after 2.6h; 1 service degraded; 357 of 360 days inside the band." Then who Engineering is for.

### More than eight services

The Status list never folds. Up to eight services "Services, now" hands it every one; past eight, `servicesShown` in `src/views/now-context.ts` hands it the services not operational in the team's order, then the three with the longest current runs, longest first, and the card's line says so. The link names every service either way ("All 10 services").

### At 390px

Every row stacks in reading order, "Services, now" first; each Status list row drops its strip under the name. The four tiles are one column, each a row of its name, its line and its figure. Both Data tables become cards (the model or the endpoint, then its requests, its p95 and its errors), and no part scrolls sideways. The two long titles, the band's and the runs', wrap rather than being cut.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the parts' shapes under a masthead that takes the room the page's takes, so the body does not move when the page arrives. `LoadingPage` draws the kicker, the heading that holds "Now", read out and not drawn, with the sentence's block (`sentence`), the room of the line under the title (`lead`) and the freshness. The page's own fallbacks take the same room Under `refusal: 'absent'` the masthead names nothing (`gatedLoading`), since it is drawn before the gate answers. |
| Empty (nothing has arrived yet) | Every read answered and none holds a record of any part (`nothingArrived` in `src/views/now-context.ts`): the body is one card, "No services yet", no part is drawn, and the page is headed by its name |
| No service yet, other records | The parts that have records stand, and "Services, now" says no service is monitored yet |
| Partial (a read failed) | That part's card, with its title, says what could not be read ("The tickets could not be read") in its own place, and every other part stands; a tile whose figure could not be read shows a dash. The context names what could not be read |
| No open incident | "Open incident" stays and says when the last one was resolved and how long it lasted |
| Several open incidents | "Open incidents": one card each, the most severe first |
| No access | The product's refusal page, before any read (`FEATURES.now.needs`: `services:read`, `incidents:read`, `releases:read`, `tests:read`, `days:read`, `usage:read`, `models:read`, `compute:read`, `endpoints:read`, `tickets:read` and `activity:read`, each of which every role that reads the dashboards holds: `DASHBOARDS` in `src/data/roles.ts`) |
| Error | The dashboard error screen with Retry |

## Data

Every figure is read on the server by the Now tool's read (`nowTool` in `src/views/tools.ts`), each collection apart from the others, so one that cannot be read leaves its part saying so (`unread` on the page's data) and the rest standing. `nowData` in `src/views/now-parts.ts` turns the rows into what the parts draw; the page works nothing out.

- **The services and the incidents**: `readServices()` and `readIncidents()` in `src/data/metrics.ts`; an incident's ticket is joined to its title and the address the Tickets page finds it at.
- **The band, its facts and the title's days**: every complete day kept (`readDays('all')`), held to `facts.band` by `steady`; the year and the requests answered are written by the functions Home writes them with.
- **The models**: the `usage` rows of the last 30 complete days, a model's p95 and first token the lower median of its days', labelled from `models`.
- **Compute in use**: the `compute` rows of the latest complete day, a region's share its GPU-hours used over its GPUs times 24.
- **Shipping and Releases out**: `readReleases()` in `src/data/engineering.ts`, through `releaseFigures`, `stageOf` and `unresolvedText` in `src/views/releases-context.ts`.
- **Work and Tickets closed**: `readTickets()`; the reader's own is the ticket assigned to `resolveAccess().subjectId`, read on the server.
- **Slowest endpoints**: `readEndpoints()`. **The runs a day and Runs passed**: `readRuns()`. **Changes**: `readActivity()`, newest first.

The strips cross to the browser one character a day (`packNow` in `src/views/now-context.ts`). The page, the embed view and the context share that read. Nothing writes. The body registers `activity` with `useLive` (`src/lib/live.ts`), so a change the product records, an approved Proposal among them, is drawn without a reload.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: one column, as "At 390px" says.
- **Embed**: see Embed view.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `nowContext` in `src/views/now-context.ts` from the figures the page draws.

### What the agent reads

Its first insight is the title the page is headed by, word for word; the second, the days inside the band over every complete day kept, with the page's address as its evidence; then the first open incident, the most severe and then the newest, with its owner and its ticket's title, and how many more are open ("And 5 more incidents open, 6 in all."); and the band's other three facts. Its facts are each part's figures, each naming its window: the services, naming the first that is not operational and counting the rest; the first four models by requests with their p95; compute in use in the fullest region with the others counted; the releases not yet out by version, the first three in testing and the first three ready, each then counted ("and 12 more in testing"), with the required checks; the first four tickets high priority or nobody's, with the reader's own marked "yours", then counted; the three slowest endpoints, the four figures of the month and the changes counted with the newest. The page draws every one. It says the day in progress is counted in nothing but the runs a day. Within its budget of 2,600 characters for every persona: 2,402 for an Owner and 2,406 for a Viewer in the sample, and at most 2,482 with six times its incidents and four times its services, releases, tickets and changes:

```text
- Inference API is degraded, and 3 releases are in testing
- Steady: 357 of 360 days inside the band of p95 under 350 ms and errors under 1%; outside it on 17 Aug 2026, 21 Sept 2026 and 22 Sept 2026. Evidence: /engineering
- Open incident "Elevated latency on Inference API in eu-west-1" on Inference API, minor, monitoring, with Jonas Weber, tracked in "Inference API p95 above target in eu-west-1": started 3 h ago; latest update 36 min ago. Evidence: /services
- Requests grew 105.7% in a year, and p95 stayed between 277 and 294 ms.
```

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike.
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.

## Embed view

`/embed/now` (tool `zz_meridian_now {}`); see `app/embed/now/README.md`.

## Accessibility

- The heading is the only `h1`: "Now", read out and not drawn, then the title's sentence. Part titles are `h2`; "Open incident" heads its part above the card, which titles itself with the incident.
- Every state is a word beside its dot; the band's strip and the runs chart carry a screen-reader summary and table of their days.
- "Yours" is a word, not a colour alone.

## Content

- Name services as customers know them.
- Each figure names its window: "over the last 30 complete days", "02 Oct 2026".
- Column heads say what they count: "p95, median day", "Errors, 5xx and 429".

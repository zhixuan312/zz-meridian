# Now

The Now page is the Engineering workspace's home: which services are up this moment, and what is open.

Status: draft

This body is the thin first form: the services as the Status list draws them, the open incident as the Incident card, and a way to Services. A fuller page replaces it.

## Structure

| Row | Split | Content | Pattern |
|---|---|---|---|
| Masthead | | Kicker "ZZ Meridian · Production"; the title, a sentence about the services and the releases (below), with the page's name kept in the heading; one sentence that ends with who Engineering is for (`workspaces.engineering.audience`, read from the declaration); Freshness. No action | Page frame |
| 1 | Full | Services: state now and latency, with the days kept | Status list in a Card |
| 2 | Full | The newest incident nobody has resolved, with who has it when the record names an owner; without one, the line "No incident is open." | Incident card |
| 3 | | How many other incidents are open, when any are; a button to Services (`/services`) | Button |

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

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: a heading that holds "Now", read out and not drawn, and the sentence's block (`LoadingPage` with `sentence`), then two card skeletons |
| All operational, no incident | The list reads "All services operational"; row 2 says no incident is open |
| Degraded | The service is named in the list's summary and its dot pulses; the incident card follows |
| No services | One card: "No services yet"; the page is headed "Now" |
| Releases not read | The title is the services' clause alone, and the context says the releases could not be read |
| Days not read | The title stands; the context states no days inside the band and says the days could not be read |
| No access | The product's refusal page, before any read (`FEATURES.now.needs` is `services:read`, `incidents:read`, `releases:read`, `tests:read` and `days:read`, which every role that reads the services also holds) |
| Error | The dashboard error screen with Retry |

## Data

The Now tool's read (`nowTool` in `src/views/tools.ts`): the `services` collection in the order the team reads its stack and the `incidents` nobody has resolved, newest first (`readServices()` and `readIncidents()` in `src/data/metrics.ts`). The title and the days inside the band are worked out in the same read, on the server: the releases with their verifications (`readReleases()` in `src/data/engineering.ts`), counted in testing by `releaseFigures`, and every complete day kept (`readDays('all')`), held to `facts.band` in `src/app.config.ts` by `steady`. The page is handed the sentences (`head` on its data) and never the days. The page, the embed view and the context share that read. Nothing writes.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: rows stack.
- **Embed**: see Embed view.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `nowContext` in `src/views/now-context.ts`.

### What the agent reads

Its first insight is the title the page is headed by, word for word; the second, the days inside the band over every complete day kept, with the page's address as its evidence. Then every service's state and latency now, the newest open incident with its latest update by time, a line for every other open incident, and that the last 90 days and the resolved incidents are on Services. The context's own title stays "Now".

```text
- Services now: 1 service degraded (Inference API degraded).
- Inference API is degraded, and 3 releases are in testing
- Steady: 357 of 360 days inside the band of p95 under 350 ms and errors under 1%; outside it on 17 Aug 2026, 21 Sept 2026 and 22 Sept 2026. Evidence: /engineering
- Open incident "Elevated latency on Inference API in eu-west-1" on Inference API, minor, monitoring: started 3 h ago (03 Oct 2026, 05:48 UTC); latest update 36 min ago.
```

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike.
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.

## Embed view

`/embed/now` (tool `zz_meridian_now {}`); see `app/embed/now/README.md`.

## Accessibility

- The heading is the only `h1`: "Now", read out and not drawn, then the title's sentence. Card titles are `h2`.
- Every state is a word beside its dot.

## Content

- Name services as customers know them.

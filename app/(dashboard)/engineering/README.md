# Now

The Now page is the Engineering workspace's home: which services are up this moment, and what is open.

Status: draft

This body is the thin first form: the services as the Status list draws them, the open incident as the Incident card, and a way to Operations. A fuller page replaces it.

## Structure

| Row | Split | Content | Pattern |
|---|---|---|---|
| Masthead | | Kicker "ZZ Meridian · Production", title, one sentence that ends with who Engineering is for (`workspaces.engineering.audience`, read from the declaration); Freshness. No action | Page frame |
| 1 | Full | Services: state now and latency, with the days kept | Status list in a Card |
| 2 | Full | The newest incident nobody has resolved; without one, the line "No incident is open." | Incident card |
| 3 | | How many other incidents are open, when any are; a button to Operations (`/health`) | Button |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the title and two card skeletons |
| All operational, no incident | The list reads "All services operational"; row 2 says no incident is open |
| Degraded | The service is named in the list's summary and its dot pulses; the incident card follows |
| No services | One card: "No services yet" |
| No access | The product's refusal page, before any read (`FEATURES.now.needs` is `services:read` and `incidents:read`) |
| Error | The dashboard error screen with Retry |

## Data

The Now tool's read (`nowTool` in `src/views/tools.ts`): the `services` collection in the order the team reads its stack and the `incidents` nobody has resolved, newest first (`readServices()` and `readIncidents()` in `src/data/metrics.ts`). The page, the embed view and the context share that read. Nothing writes.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: rows stack.
- **Embed**: see Embed view.

## Agents

The page itself takes no agent action. It shares one context with both agents (decision 0011), built by `nowContext` in `src/views/now-context.ts`.

### What the agent reads

Every service's state and latency now, the newest open incident with its latest update by time, a line for every other open incident, and that the last 90 days and the resolved incidents are on Operations.

```text
- Services now: 1 service degraded (Inference API degraded).
- Open incident "Elevated latency on Inference API in eu-west-1" on Inference API, minor, monitoring: started 3 h ago (03 Oct 2026, 05:48 UTC); latest update 36 min ago.
```

- **MCP App:** the text above as `ui/update-model-context`, with the same context as its structured part, from the inline view and from fullscreen alike.
- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address, and the page text after it for anything the context does not cover.

## Embed view

`/embed/now` (tool `zz_meridian_now {}`); see `app/embed/now/README.md`.

## Accessibility

- The page title is the only `h1`; card titles are `h2`.
- Every state is a word beside its dot.

## Content

- Name services as customers know them.

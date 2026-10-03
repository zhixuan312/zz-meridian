# Health

The Health page answers "is anything wrong, and since when": uptime across every service, the live incident, each service's state and history, and what happened before.

Status: beta

## Structure

| Row | Split | Content | Pattern |
|---|---|---|---|
| Masthead | | Kicker "ZZ Meridian · Production", title, one sentence; Freshness and "Subscribe to updates" | Page frame |
| 1 | 2/3 + 1/3 | Uptime over 90 days at hero size, the worst state in words, a "right now" grid of every service, and the worst-state-per-day bars; the live incident beside it | Featured metric, Uptime bars, Incident card |
| 2 | Full | Services: state, p95 and 90 days of bars per service | Status list in a Card |
| 3 | Full | Past incidents, newest first | Incident card, `row` |

Without a live incident row 1 becomes one full-width featured card.

## States

| State | What shows |
|---|---|
| Loading | The shared skeleton, shaped like the Overview rows |
| All operational | The featured caption says "All systems operational."; row 1 is full width; no warning colour anywhere |
| Degraded | The affected service is named in the caption, its dot pulses in the grid and the list; the incident card sits beside |
| Outage | As degraded, in critical; the rail's Health badge counts open incidents |
| No past incidents | An empty state in the card: "No incidents in 90 days" |
| Error | The dashboard error screen with Retry |

## Data

- Uptime: the mean of each service's uptime over the 90 days shown.
- The day bars of row 1: the worst state of any service that day.
- "Right now": each service's state and p95 over the last hour.
- Incidents: `INCIDENTS` (the live one is the first not resolved) and `PAST_INCIDENTS` from `src/system/fixtures/sample-ops.ts`.

## Surfaces

- **Console**: as above at the data width.
- **Mobile**: rows stack; the grid shows two services across; the bars show the last 30 days.
- **Embed**: see Embed view.

## Agents

The page itself takes no agent action. Its embed shares the summary and the open incident with the model; an agent can be asked about the incident from the inline banner.

## Embed view

`/embed/health` (tool `zz_meridian_health {}`): inline, a warning banner for the live incident (with Ask) above the status list with its summary; fullscreen, the page's rows. It shares: "ZZ Meridian health: 1 service degraded (Inference API degraded). Open incident: … monitoring."

## Accessibility

- The page title is the only `h1`; card titles are `h2`; the incident title `h3`.
- Every state is a word beside its dot; the status summaries are live regions.

## Content

- Name services as customers know them; write incident titles as symptom and scope.
- The caption counts days: "12 of the last 90 days had a service below operational".

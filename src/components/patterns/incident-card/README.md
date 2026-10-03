# Incident card

An incident card tells an incident the way a reader needs it: what is affected, how bad it is, where it stands, and every update since it started, newest first.

Status: beta

## Anatomy

1. **Edge** (live only): a 2px line across the top in the state's colour.
2. **State badge**: "Investigating", "Monitoring" or "Resolved", with a dot.
3. **Severity badge**: "Minor" or "Major".
4. **Identifier**: the incident's id, `t-caption`, right-aligned.
5. **Title**: what is wrong, where: "Elevated latency on Inference API in eu-west-1", `t-card`.
6. **Meta line**: the service, when it started (relative, exact on hover), and how long it lasted once resolved.
7. **Timeline**: every update, newest first: a dot, the time as a kicker, the text. The newest dot of a live incident pulses.

## Variants

| Variant | Use |
|---|---|
| `card` (default) | The current incident beside the status on Health; an incident's own page |
| `row` | One line in a list of past incidents: title, severity, service, date, how long it lasted, state word |

## Sizes

| Part | Spec |
|---|---|
| Card | `radius-lg` 16px, `card-pad` padding, `line` border; a live incident's border takes its tone at 30% |
| Timeline | 20px between updates; a 14px dot column; a 1px `line` joins the dots |
| Row | `card-pad` horizontally, 14px vertically; two lines |

## States

| State | Edge and border | Badge | Newest dot |
|---|---|---|---|
| Investigating | `critical` | critical, "Investigating" | `critical`, pulsing |
| Monitoring | `warning` | warning, "Monitoring" | `warning`, pulsing |
| Resolved | none | positive, "Resolved" | `ink-3`, still |

## Behaviour

- Static: the card carries no actions of its own. A page adds "Subscribe to updates" or a link to the full incident.
- Times are relative ("36 min ago") with the exact time in the title attribute; past a fortnight they become dates.

## Composition

Card (Layer 2) with Badge, Status dot and text; the timeline is an ordered list. The `row` variant has no Card: it sits in a Card divided by hairlines.

## Data

| Field | Meaning |
|---|---|
| `state` | `investigating`, `monitoring` or `resolved` |
| `severity` | `minor` (degraded) or `major` (failing for some customers) |
| `started`, `resolved` | ISO times; the duration is `resolved - started` |
| `updates` | `{ at, text }`, written for customers, in any order: the card sorts them newest first |

## Surfaces

- **Console**: the `card` beside the Health figure; `row`s under "Past incidents".
- **Mobile**: the card stacks under the figure; nothing else changes.
- **Embed**: the inline Health view reduces a live incident to a warning Banner (title, state, started) with Ask; the card appears in fullscreen.

## Agents

An agent reads incidents through the Health view's shared context (title, state, id). Updates are written by people; an agent may draft one only as a Proposal.

## Accessibility

- The timeline is an ordered list labelled "Updates"; each time is a `<time>` element.
- State and severity are words, not colours alone.
- Contrast (dark, indigo): title `ink` 17.0:1; meta and kickers `ink-3` 6.4:1; update text `ink-2` 8.0:1; badges 8.2:1 and up.

## Content

- The title names the symptom and the scope, never the cause: "Upload failures for files over 50 MB".
- Updates say what changed and what happens next, in the past tense for what was done: "Traffic shifted to eu-central-1. Latency is recovering."

## Do and do not

- Do keep every update; never edit an old one.
- Do say how long a resolved incident lasted.
- Do not show internal ticket links or names of on-call engineers.

## Implementation

```tsx
import { IncidentCard } from '@/components/patterns/incident-card';

<IncidentCard incident={current} now={DEMO_NOW} />
<Card className="divide-y divide-line">{past.map((i) => <IncidentCard key={i.id} incident={i} now={DEMO_NOW} variant="row" />)}</Card>
```

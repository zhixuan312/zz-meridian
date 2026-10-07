# 0011 · One context, two agents

Date: 2026-10-07 · Status: accepted

## Context

Decision 0004 gave every view a second operator, an agent in an MCP host. Decision 0008 added a second agent, the console's own assistant. The two were told different things, and neither was told enough to help a person judge.

- **The MCP view** shared one hand-written sentence. On the Overview it carried the totals with no change against the previous period, no definitions and no freshness. When the person pointed at a day, the sentence replaced the totals instead of adding to them, and after Expand it was not sent at all.
- **The console's assistant** read the page's `innerText`, between 1,193 and 3,779 characters on the sample's pages. The text held the axis ticks, the search box and 30-row screen-reader tables. It had no definitions, and the path came without its query string. On `/requests?status=5xx`, the model saw "Filters 1" and could not tell which filter it was.
- **Neither agent** was told anything a person cannot see at a glance: what is normal, what moved, and what nobody has recorded an explanation for.

## Decision

Each choice below can be reversed on its own.

- **One contract, two consumers.** A view writes one shared context: what it is and its address; the period; freshness; what the person is pointing at; facts, each with its unit, its change and its definition; insights, each with the address of its evidence; and unknowns. In an MCP host, `useShareView` sends it with `ui/update-model-context`. On the console, it publishes the same context to the assistant, which reads it with the question. *Why:* two agents told two different things drift apart, and an adopter would have to design the agent half twice. The page text stays beside the context, as a fallback and for what a context does not cover, until evidence shows it can shrink.
- **Every share is the whole state.** The specification says each `ui/update-model-context` replaces the one before, and that a host may hold it until the person's next message. So a context never sends only what changed. *Why:* a partial update erases what the model needs to compare against.
- **The text carries everything.** The structured part mirrors the text, but the text must stand alone. *Why:* the specification gives `structuredContent` to the view, not to the model, for a tool result, and says nothing either way for a model-context update.
- **Read boundary: authorization, not the screen.** An agent may be told anything the person may read in the view's scope, including what code derives from it: a baseline, a deviation, a ranking, a share, a comparison. It is never told a `hidden` field, another tenant's data, what only a page may show, or a count that discloses them. A derived figure is computed from data in scope, never at a finer grain than the person may read, and names its method and window. *Why:* the old line "share what the person can see, nothing more" was meant to keep unauthorized data out, not to stop the agent from pointing at what is in front of the person but not obvious. A column the layout dropped is still the person's to read.
- **Code computes, the model interprets.** Baselines, deviations, rankings and shares are computed by deterministic, tested code and arrive in the context. The model explains what they might mean and what to look at next. *Why:* a figure a model recomputes changes from turn to turn and cannot be checked. A figure computed once is the same for the person, both agents and the tests.
- **One source for tools.** A view's tool contract (its name, its address as input, what it returns) sits beside the view in `src/views/`. The console's assistant gets it as a read-only tool through `assistantTools`, and an MCP server registers the same contract. *Why:* `docs/assistant.md` already promised one data layer for both. The template ships no MCP server and adds no dependency: the server is the adopter's, and the contract is what makes it short.
- **The adopter contract.** A card that shares a context says so in its README, under `## Agents`, in a `### What the agent reads` part that names what each consumer receives. `scripts/check.ts` holds every view that calls `useShareView` to it. *Why:* a new page built from Meridian's cards should arrive with its agent half, not as a second design task.
- **The person sees the findings too.** What code finds for the agents is drawn for the person, quietly: a tile's `finding` line ("2.7× usual on 21 and 22 Sept", which points the Meridian at its peak), "2.7× usual" beside a day being read, and a chart's `baseline` at the period's median. *Why:* an agent quoting a figure the screen cannot show is a figure the person cannot check, and the point of the agent is a better decision by the person.
- **An agent's change is recorded.** The assistant's guard takes an optional `record`, told once an approved change commits; the template writes an Activity line through the `activity` collection, which only the server writes (`pageOnly`): "Assistant changed status to Suspended for Alice Moreno and Ravi Patel · for Maya Chen". *Why:* consent without a record afterwards leaves the next person unable to tell who changed what. A product points `record` at its own audit table, or leaves it out.
- **Aggregates are read like records.** The figures behind the Overview, Analytics and Health are collections read through `read()`, as the request log is, so a page and a view tool see only what the caller may read. *Why:* an adopter copies the Overview, and a page with no access check would be copied with it.
- **Page text stays beside the context.** *Why:* the context covers what code worked out; the text still carries what it leaves out, such as each day's value in a chart's screen-reader table. Shrink it only on evidence that nothing is lost.
- **Without an agent, nothing changes for the person.** No assistant configured, or switched off, and no host: no launcher, no panel, no Ask; the findings, baselines and Activity are the person's own and stay.
- **The write boundary does not change.** Both agents read freely and write only through a Proposal. The signed approval, `pageOnly`, `hidden` and the run-time `can` check stay as decision 0008 made them.

## Consequences

- `useShareView` takes a context instead of a sentence and an object. A product view that called it with two arguments must build a context (`src/lib/shared-context.ts`). This is a breaking change.
- The console's assistant receives the context of the view on screen, and the path with its query string.
- Each page's figures now have one source for the person and for both agents. A definition changed in one place reaches all three.
- `docs/benchmark.md` scores the agent half, one column per consumer, beside the human Scorecard.

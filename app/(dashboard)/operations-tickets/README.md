# Tickets

The work the team tracks against a service: filter it by state and priority, see who has each ticket and how long it has waited, and, unless you are a Viewer, open a ticket and move it along.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Tickets", one sentence, New ticket (primary, only for someone who may create) | One band | Stacked |
| 1 | Three metric tiles: Open tickets, Waiting tickets, Closed tickets, each counting every ticket whatever the filters show | Three across | Stacked |
| 2 | Data table with its Filter bar (search, State, Priority): Ticket with its service, Priority, State, Assigned to and Opened (once the table is wider than 896px), Last changed, and a row menu named "Change state of" and the title | Columns | Cards: the title and its row menu, then the priority with the state ("Normal priority · Open"), the assignee and "Changed …"; for someone who may not change a ticket, the title and its state, then the priority |
| Dialog | New ticket: Title (required), Service, Priority, Assignee, Summary (optional); Cancel and Create ticket | Centred | Bottom sheet |

The body (rows 1 and 2, under the masthead) is the records template, `Records` from `src/components/templates/records`, with three tiles over the table. The masthead is drawn by the client view, because its button shares state with the dialog.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the template's skeleton, three tiles over a table with its filters |
| Default | Every ticket, the most recently changed first; the filters live in the address |
| Filtered | Only the tickets that match, and "n of m" in the Filter bar; the tiles keep counting every ticket |
| No matches | The table's filtered-empty state with Clear filters |
| No tickets | The first-run empty state with New ticket, for someone who may create |
| Not created | A critical Banner at the top of the open dialog with the server's sentence; the dialog keeps what was typed and can be submitted again |
| Creating | The Create ticket button is busy and cannot be pressed twice |
| Created | The dialog closes, a toast "Ticket created", and the new ticket and the three tiles show on the refreshed page |
| Moved | A toast "Moved to waiting" (or open, or closed); the row and the tiles update |
| Step refused | A critical toast with the server's sentence; nothing changed |
| Read-only | A Viewer sees every ticket; no New ticket and no row menu, and nothing on the page says who can create or change one |
| Failed read | The route's error screen; nothing is shown that was not read |

## Data

The tickets come from `readTickets` (`src/data/tickets.ts`), read on every request through the `tickets` collection, the same read the assistant's tool uses. Each ticket carries the name of the member it is assigned to, joined on the server from just the ids the tickets name: a Viewer reads tickets and not members, so they see the names and are never handed the roster. The people offered as assignee in the form are read only for someone who may read members; otherwise the form offers nobody.

Create and Move are server actions (`actions.ts`) that write through the caller's own `tickets` collection, which is the ticket boundary (`src/data/ticket-mutations.ts`). It re-checks who is asking, validates every field, applies the steps a ticket may take (open to waiting or closed, waiting to open or closed, closed to open), stamps the times and drops the cached reads of tickets only after the write commits. The times are three: when the ticket was opened, when it last changed and when it was closed, which a move into closed sets and a move back to open clears, ticket by ticket. That time and the incident a ticket tracks (`closedAt` and `incidentId`) are the system's: a change that names either is refused. A refusal comes back as `{ ok: false, error }`, never as a thrown error, and writes nothing. The view then refreshes the route. A write adds no Activity line.

## Surfaces

- **Console**: as above. **Mobile**: cards, and the dialog rises from the bottom. **Embed**: not offered.

## Agents

An agent reads the page through the tickets view tool and its prepared query, `explore_tickets`, and on this page may create and change tickets through the `tickets` write tools, which pass the same boundary as the page's actions, so the same step is refused in both places. The prepared query reads when a ticket was closed and the incident it tracks; neither is in a write tool's create or update schema. The page shares its context through `ticketsContext` in `src/views/tickets-context.ts`.

### What the agent reads

The three counts, labelled "Open tickets", "Waiting tickets" and "Closed tickets", of every ticket in the workspace; the list the person has filtered to, with each ticket's id, state, priority, service, assignee and age, capped at ten; and what code found: high-priority tickets with no owner and open tickets that have not changed for seven days, the first five of each. Past each cap it says how many more there are (`explore_tickets` finds them). Within its budget of 2,600 characters for every persona: 2,173 in the sample, and 2,535 with four times its tickets. It also says which steps a ticket may take.

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view; an MCP server can return this context as a tool's text (`docs/agents.md`).

### What the agent does here

Protagonist: Tickets.

The page marks the list `data-protagonist="Tickets"` on a wrapper whose display is `contents`; its Ask, in the Filter bar: "What stands out in the tickets, and why?", or, filtered, "What do the tickets open, high priority have in common, and why?".

- "How many tickets were closed in the last 30 days, against the 30 before?" — the tickets closed over 30 complete days, by when each was closed, against the 30 days before
- "Which service had the most tickets opened in the last 90 days?" — the tickets opened over 90 complete days, by service
- "How many tickets were opened in each of the latest eight weeks, and how many of them are still in play?" — the tickets opened and those still open or waiting over 90 complete days, a week at a time, the latest eight
- "Which high-priority tickets opened in the last 30 days are still in play, and where do I open them?" — the tickets opened over 30 complete days whose priority is high and whose state is not closed, with up to 20 of them, each with its address

Tickets' prepared query (`ticketsExplore` in `src/views/tickets-explore.ts`, set as `explore` on the Tickets tool) reads the `tickets` collection as two sources: `opened`, windowed by when a ticket was opened, and `closed`, windowed by when it was closed, which holds no ticket still in play. Both are narrowed by state, priority, service and assignee, grouped by any of them or a day, a week or a month at a time. A drilled ticket opens on this page searched for its title, and a call narrowed to one state or one priority answers with the page filtered the same way. A ticket opened today is in no window, as a window holds complete days.

## Content

- "New ticket" opens the form and "Create ticket" submits it: one verb through the flow.
- A step is named for where it goes: "Move to open", "Move to waiting", "Move to closed".
- A refusal is a sentence that says what to change, never a code.

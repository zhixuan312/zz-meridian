# Tickets

The work the team tracks against a service: filter it by state and priority, see who has each ticket and how long it has waited, and, unless you are a Viewer, open a ticket and move it along.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Tickets", one sentence, New ticket (primary, only for someone who may create) | One band | Stacked |
| 1 | Three metric tiles: Open tickets, Waiting tickets, Closed tickets, each counting every ticket whatever the filters show | Three across | Stacked |
| 2 | One caption line saying who can create and change tickets, only when the page withholds either | Full width | Full width |
| 3 | Data table with its Filter bar (search, State, Priority): Ticket with its service, Priority, State, Assigned to and Opened (once the table is wider than 896px), Last changed, and a row menu named "Change state of" and the title | Columns | Cards: title and state, priority, assignee and "Changed …" |
| Dialog | New ticket: Title (required), Service, Priority, Assignee, Summary (optional); Cancel and Create ticket | Centred | Bottom sheet |

The body (rows 1 to 3, under the masthead) is the records template, `Records` from `src/components/templates/records`, with three tiles over the table. The masthead is drawn by the client view, because its button shares state with the dialog.

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
| Read-only | A Viewer sees every ticket and a line saying who can create and change them; no New ticket and no row menu |
| Failed read | The route's error screen; nothing is shown that was not read |

## Data

The tickets come from `readTickets` (`src/data/tickets.ts`), read on every request through the `tickets` collection, the same read the assistant's tool uses. Each ticket carries the name of the member it is assigned to, joined on the server from just the ids the tickets name: a Viewer reads tickets and not members, so they see the names and are never handed the roster. The people offered as assignee in the form are read only for someone who may read members; otherwise the form offers nobody.

Create and Move are server actions (`actions.ts`) that write through the caller's own `tickets` collection, which is the ticket boundary (`src/data/ticket-mutations.ts`). It re-checks who is asking, validates every field, applies the steps a ticket may take (open to waiting or closed, waiting to open or closed, closed to open), stamps the times and drops the cached reads of tickets only after the write commits. A refusal comes back as `{ ok: false, error }`, never as a thrown error, and writes nothing. The view then refreshes the route. A write adds no Activity line.

## Surfaces

- **Console**: as above. **Mobile**: cards, and the dialog rises from the bottom. **Embed**: not offered.

## Agents

An agent reads the page through the tickets view tool and may create and change tickets through the `tickets` collection tools, which pass the same boundary as the page's actions, so the same step is refused in both places. The page shares its context through `ticketsContext` in `src/views/tickets-context.ts`.

### What the agent reads

The three counts, labelled "Open tickets", "Waiting tickets" and "Closed tickets", of every ticket in the workspace; the list the person has filtered to, with each ticket's id, state, priority, service, assignee and age, capped at ten; and what code found: high-priority tickets with no owner and open tickets that have not changed for seven days. It also says which steps a ticket may take.

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Content

- "New ticket" opens the form and "Create ticket" submits it: one verb through the flow.
- A step is named for where it goes: "Move to open", "Move to waiting", "Move to closed".
- A refusal is a sentence that says what to change, never a code.

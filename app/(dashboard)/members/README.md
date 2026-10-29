# Members page

Who is in the workspace, what role and team they hold, and when they last used it: invite someone, change their role and add-ons, suspend or reactivate them, or remove them.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Members", one sentence, Invite member (primary), shown only to a person who may invite (`invitableRoles()` is not empty) | One band | Stacked |
| 1 | Data table headed by its count, with an Ask beside it: Name (avatar and name, grow), Email (from 896px), Role as a person reads it, add-ons and all (as a column from 512px, and on the card at every width below), Team (from 1152px), Status, Joined (from 896px), Last active, and a row action menu | Columns | Cards: name and the menu, then the role with its add-ons, status and last active |
| 2 | Roles & access matrix: a card whose table ticks each role, main roles first and add-ons after, against every non-public feature and then every action; a legend under it says that an add-on adds to a main role and that the member rules still apply. Generated from `GRANTS`, `FEATURES` and `ACTIONS`, never written by hand; at a phone's width the table scrolls inside its own frame | Columns, scrolling inside the card | The same table, scrolling inside the card |
| Sheet | Invite a member: Name and Email (required), Role, Team; Cancel and Invite | From the right, 440px | From the bottom |
| Sheet | Change {name}'s role: Role and Add-ons, offering only the choices the row's boundary allowed; a refusal reopens it with the reason in a critical Banner; Cancel and Save role | From the right, 440px | From the bottom |
| Toast | Remove: the person leaves the table at once and a toast says "{name} removed · They lose access when this closes" with Undo. The removal is sent when the toast closes (8 s, `UNDO_MS`), or at once if the page goes away first; Undo brings them back and sends nothing, and once the removal was sent it says "{name}'s removal was already sent" instead; a refusal brings them back with its reason | Bottom right | Top, full width |

A row the caller may not change draws no menu at all. On the caller's own row it says why, with the first rule in the boundary's frozen order that hides the action ("You cannot change your own role."); on any other row it draws nothing: an Owner's row read by an Admin, and every row read by somebody without the member grants, offer no control and no line, and no row says who could; the matrix in row 2 is where roles are named. A change forced past the page is still refused by the boundary with its own sentence. The row menu holds Change role, Suspend (Reactivate on a suspended member) and Remove, each shown only where the boundary allowed it; an invited row offers none until the server gives it a capability.

The body (rows 1 and 2) is the records template, `Records` from `src/components/templates/records`, with no summary.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the template's skeleton, table rows without tiles; the members are read per request, so the prerendered shell holds none |
| Default | Newest members first, as the Joined column beside them shows |
| Invited | The status Badge in `accent`; Last active reads "Never" in `ink-3`; Change role and Remove for a person who may change members, and no Suspend |
| Suspended | The status Badge in `warning` |
| Name or email missing | The field's error under it; nothing is sent |
| Changed | The page refreshes from the collection and a toast confirms: "Role changed", "Member suspended", "Member reactivated", "Invited {email}", which says the member is listed as Invited (the sample delivers no message, and an invited member has no acceptance step); a removal's toast is its Undo, "{name} removed" |
| Rejected | The table goes back to what it was. A refused invitation reopens the sheet with what was typed and a critical Banner, "Not invited", with the reason (an address somebody in the workspace already has is one: "Somebody with that address is already in the workspace."); a refused role change reopens the Change role sheet with the draft it was sent from and a critical Banner, "Role not changed", with the reason; a refused status change or removal shows a critical toast with the reason |
| No members | The first-run empty state with Invite member |
| May not invite | No Invite member in the masthead and none in the empty state, because the boundary offers no invitable role |

## Data

The `members` collection in `src/data/collections.ts`, read through `readAll('members', { sort: { field: 'joined', dir: 'desc' } })` at request time, so the person's grant is asked on the path every page reads by. Server actions in `actions.ts` call `members.create` (status `Invited`, joined today by the data's clock, never active), `members.update` (status), `members.remove` and `assignRole`; the view refreshes the page after each and keeps no copy of the rows. Last active is relative to the data's clock.

Every one of those writes passes `src/data/member-mutations.ts`, which re-resolves the caller, checks the operation's grant and refuses a change or removal of an Owner without `workspace:update`, one's own role or add-ons, suspending or removing oneself, and any change that would leave no active Owner. The page reads that boundary per row, once, and is handed only what it allows: `memberAccess(id)` gives the row's booleans, its role choices, its add-on choices and its reason, and `invitableRoles()` gives the roles an invitation may carry. The page decides nothing from a role of its own. A role or add-on change is one `assignRole` write, with its Activity line in the same step; the matrix in row 2 asks `whoCan` over the same `GRANTS` the boundary uses.

## Embed view

Not offered. Inviting and removing people are decisions for the console, not a chat.

## Surfaces

- **Console**: as above. **Mobile**: cards, the sheets rise from the bottom. **Embed**: not offered.

## Agents

The assistant reads the page through the members view tool and its prepared query, `explore_members`, and, on this page alone, proposes changes through Proposals by the ids the query's drilled members give: it adds, changes and removes members only after a person approves, and what it changed shows on this page after a refresh. A change made here is what the assistant reads next. The page shares its context through `membersContext` in `src/logic/members-context.ts`.

### What the agent reads

Counts by status, role (with what each role may do) and team, everyone with their role, add-ons, team, status and when they were last seen (the first 24 in the page's order, then how many more; `explore_members` finds them), and what code found: active members unseen for 60 days or more and unanswered invitations, the first three of each, and who can change the workspace, the first five, each then counted. It says that "last active" is a console sign-in, not use of the API. Within its budget of 2,600 characters for every persona who may read it: 2,320 in the sample, and 2,511 with four times its members.

```text
- 3 active members have not been seen for 60 days or more: Alice Moreno (Viewer, Support, 94 days); Felix Andersson (Viewer, Engineering, 75 days); Ravi Patel (Viewer, Support, 71 days).
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

### What the agent does here

Protagonist: Members.

The page marks the list `data-protagonist="Members"` on a wrapper whose display is `contents`; the list is headed by its count ("24 members" in the sample), with its Ask beside it: "What stands out in the members, and why?".

- "How many members does each team have, and how many of them are active?" — the members and the active members, by team
- "Which active members have not signed in since 1 August?" — the members whose status is Active and whose last sign-in is before 2026-08-01, with up to 20 of them
- "Who is suspended, and what are their ids?" — the members whose status is Suspended, with up to 20 of them, each opening with its id and its name
- "How many Admins does each team have?" — the members whose role is Admin, by team

Members' prepared query (`membersExplore` in `src/logic/members-explore.ts`, set as `explore` on the Members tool) reads one source, `members`, with no date: narrowed by status, role, team, name and last sign-in, and grouped by status, role or team. A drilled member's line opens with its id and its name, and that id is the one the assistant's proposal to suspend or remove the member names. Last active is a sign-in to this console, never use of the API, and a member who has never signed in is left out of any narrowing by it.

## Content

- One verb through each flow: "Remove", then "{name} removed" with Undo. A removal is undone, not confirmed: it is the change a person makes on purpose and regrets by accident. Revoking an API key stays a confirmation, because requests using the key fail the moment it is sent.
- Statuses are words ("Invited", "Suspended"), never colour alone.
- A role reads the way a person holds it: "Member + Key manager", never "Member" with the add-on left to be inferred.
- The matrix names roles, not grants: the grant table stays in `src/data/roles.ts`, and a reader who wants it reads the page's own section instead of a list of permissions here.

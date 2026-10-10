# Members page

Who is in the workspace, what role and team they hold, and when they last used it: invite someone, change their role and add-ons, suspend or reactivate them, or remove them.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Members", one sentence, Invite member (primary), shown only to a person who may invite (`invitableRoles()` is not empty) | One band | Stacked |
| 1 | Data table: Name (avatar and name, grow), Email (from 896px), Role as a person reads it, add-ons and all (as a column from 512px, and on the card at every width below), Team (from 1440px), Status, Joined (from 768px), Last active, and a row action menu | Columns | Cards: name and the menu, then the role with its add-ons, status and last active |
| 2 | Roles & access matrix: a card whose table ticks each role, main roles first and add-ons after, against every non-public feature and then every action; a legend under it says that an add-on adds to a main role and that the member rules still apply. Generated from `GRANTS`, `FEATURES` and `ACTIONS`, never written by hand; at a phone's width the table scrolls inside its own frame | Columns, scrolling inside the card | The same table, scrolling inside the card |
| Sheet | Invite a member: Name and Email (required), Role, Team; Cancel and Send invitation | From the right, 440px | From the bottom |
| Sheet | Change {name}'s role: Role and Add-ons, offering only the choices the row's boundary allowed; a refusal reopens it with the reason in a critical Banner; Cancel and Save role | From the right, 440px | From the bottom |
| Toast | Remove: the person leaves the table at once and a toast says "{name} removed · They lose access when this closes" with Undo. The removal is sent when the toast closes (8 s, `UNDO_MS`), or at once if the page goes away first; Undo brings them back and sends nothing; a refusal brings them back with its reason | Bottom right | Top, full width |

A row the caller may not change draws no menu at all: its own reason where the restriction is the target's — the first rule in the boundary's frozen order that hides the action, such as "Only an Owner can change or remove an Owner." on an Owner's row read by an Admin — and nothing where the caller simply lacks the grant, which the page's one line above the table already says ("Owners and Admins manage members."). The row menu holds Change role, Suspend (Reactivate on a suspended member) and Remove, each shown only where the boundary allowed it; an invited row offers none until the server gives it a capability.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: skeleton table rows; the members are read per request, so the prerendered shell holds none |
| Default | Newest members first, as the Joined column beside them shows |
| Invited | The status Badge in `accent`; Last active reads "Never" in `ink-3`; no row actions |
| Suspended | The status Badge in `warning` |
| Name or email missing | The field's error under it; nothing is sent |
| Changed | The page refreshes from the collection and a toast confirms: "Role changed", "Member suspended", "Member reactivated", "Invitation sent to {email}"; a removal's toast is its Undo, "{name} removed" |
| Rejected | The table goes back to what it was. A refused invitation reopens the sheet with what was typed and a critical Banner, "Invitation not sent", with the reason; a refused role change reopens the Change role sheet with the draft it was sent from and a critical Banner, "Role not changed", with the reason; a refused status change or removal shows a critical toast with the reason |
| No members | The first-run empty state with Invite member |
| May not invite | No Invite member in the masthead and none in the empty state, because the boundary offers no invitable role |

## Data

The `members` collection in `src/data/collections.ts`, read with `members.query({})` at request time. Server actions in `actions.ts` call `members.create` (status `Invited`, joined today by the data's clock, never active), `members.update` (status), `members.remove` and `assignRole`; the view refreshes the page after each and keeps no copy of the rows. Last active is relative to the data's clock.

Every one of those writes passes `src/data/member-mutations.ts`, which re-resolves the caller, checks the operation's grant and refuses a change or removal of an Owner without `workspace:update`, one's own role or add-ons, suspending or removing oneself, and any change that would leave no active Owner. The page reads that boundary per row, once, and is handed only what it allows: `memberAccess(id)` gives the row's booleans, its role choices, its add-on choices and its reason, and `invitableRoles()` gives the roles an invitation may carry. The page decides nothing from a role of its own. A role or add-on change is one `assignRole` write, with its Activity line in the same step; the matrix in row 2 asks `whoCan` over the same `GRANTS` the boundary uses.

## Embed view

Not offered. Inviting and removing people are decisions for the console, not a chat.

## Surfaces

- **Console**: as above. **Mobile**: cards, the sheets rise from the bottom. **Embed**: not offered.

## Agents

The assistant reads and proposes changes here through Proposals: it adds, changes and removes members only after a person approves, and what it changed shows on this page after a refresh. A change made here is what the assistant reads next. The page shares its context through `membersContext` in `src/views/members-context.ts`.

### What the agent reads

Counts by status, role (with what each role may do) and team, everyone with their role, add-ons, team, status and when they were last seen (25 at most; `query_members` finds the rest), and what code found: active members unseen for 60 days or more, unanswered invitations, and who can change the workspace. It says that "last active" is a console sign-in, not use of the API.

```text
- 3 active members have not been seen for 60 days or more: Alice Moreno (Viewer, Support, 94 days), Felix Andersson (Viewer, Engineering, 75 days), Ravi Patel (Viewer, Support, 71 days).
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Content

- One verb through each flow: "Remove", then "{name} removed" with Undo. A removal is undone, not confirmed: it is the change a person makes on purpose and regrets by accident. Revoking an API key stays a confirmation, because requests using the key fail the moment it is sent.
- Statuses are words ("Invited", "Suspended"), never colour alone.
- A role reads the way a person holds it: "Member + Key manager", never "Member" with the add-on left to be inferred.
- The matrix names roles, not grants: the grant table stays in `src/data/roles.ts`, and a reader who wants it reads the page's own section instead of a list of permissions here.

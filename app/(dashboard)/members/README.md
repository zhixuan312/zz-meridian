# Members page

Who is in the workspace, what role and team they hold, and when they last used it: invite someone, suspend or reactivate them, or remove them.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "Members", one sentence, Invite member (primary) | One band | Stacked |
| 1 | Data table: Name (avatar and name, grow), Email (from 1024px), Role (from 1024px), Team (from 1440px), Status, Joined (from 768px, so the order the table opens in is on screen wherever it has columns), Last active, and a row action menu | Columns | Cards: name and the menu, then status, when they joined (the order the list follows) and last active; a card holds three facts, so team is left to the record |
| Sheet | Invite a member: Name and Email (required), Role, Team; Cancel and Send invitation | From the right, 440px | From the bottom |
| Toast | Remove: the person leaves the table at once and a toast says "{name} removed · They lose access when this closes" with Undo. The removal is sent when the toast closes (8 s, `UNDO_MS`), or at once if the page goes away first; Undo brings them back and sends nothing; a refusal brings them back with its reason | Bottom right | Top, full width |

The row menu holds Suspend (Reactivate on a suspended member) and Remove.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: skeleton table rows; the members are read per request, so the prerendered shell holds none |
| Default | Newest members first, as the Joined column beside them shows |
| Invited | The status Badge in `accent`; Last active reads "Never" in `ink-3` |
| Suspended | The status Badge in `warning` |
| Name or email missing | The field's error under it; nothing is sent |
| Changed | The page refreshes from the collection and a toast confirms: "Member suspended", "Member reactivated", "Invitation sent to {email}"; a removal's toast is its Undo, "{name} removed" |
| Rejected | The table goes back to what it was. A refused invitation reopens the sheet with what was typed and a critical Banner, "Invitation not sent", with the reason; a refused status change or removal shows a critical toast with the reason |
| No members | The first-run empty state with Invite member |

## Data

The `members` collection in `src/data/collections.ts`, read with `members.query({})` at request time. Server actions in `actions.ts` call `members.create` (status `Invited`, joined today by the data's clock, never active), `members.update` (status) and `members.remove`; the view refreshes the page after each and keeps no copy of the rows. Last active is relative to the data's clock.

## Embed view

Not offered. Inviting and removing people are decisions for the console, not a chat.

## Surfaces

- **Console**: as above. **Mobile**: cards, the sheet and the dialog rise from the bottom. **Embed**: not offered.

## Agents

The assistant reads and proposes changes here through Proposals: it adds, changes and removes members only after a person approves, and what it changed shows on this page after a refresh. A change made here is what the assistant reads next. The page shares its context through `membersContext` in `src/views/members-context.ts`.

### What the agent reads

Counts by status, role (with what each role may do) and team, everyone with their role, team, status and when they were last seen (25 at most; `query_members` finds the rest), and what code found: active members unseen for 60 days or more, unanswered invitations, and who can change the workspace. It says that "last active" is a console sign-in, not use of the API.

```text
- 3 active members have not been seen for 60 days or more: Alice Moreno (Viewer, Support, 94 days), Felix Andersson (Viewer, Engineering, 75 days), Ravi Patel (Viewer, Support, 71 days).
```

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Content

- One verb through each flow: "Remove", then "{name} removed" with Undo. A removal is undone, not confirmed: it is the change a person makes on purpose and regrets by accident. Revoking an API key stays a confirmation, because requests using the key fail the moment it is sent.
- Statuses are words ("Invited", "Suspended"), never colour alone.

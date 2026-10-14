# API keys page

The keys that let services call ZZ Meridian: create one with only the scopes it needs, see when each was last used, and revoke one with a confirmation.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "API keys", one sentence, Create key (primary) | One band | Stacked |
| 1 | Banner (accent), only right after a key is created: "Copy {name} now", the full key in a Copy field, dismissable | Full width | Full width |
| 2 | Data table: Name with its environment, Key (its hint, `zzm_live_…f601`, in mono, from 672px), Scopes (two and "+N", from 1152px), Created by (from 896px), Created, Last used, and Revoke | Columns | Cards: name and environment, "Created …" and "Used …", Revoke |
| Sheet | Create a key: Name (required), Environment (Live or Test), Scopes (checkboxes); Cancel and Create key | From the right, 440px | From the bottom |
| Dialog | Revoke: "Revoke {name}?", what fails and that it cannot be undone, when it was last used; Cancel and Revoke key (danger) | Centred | Bottom sheet |

The body (rows 1 to 3, under the masthead and beside the sheet and dialog) is the records template, `Records` from `src/components/templates/records`, with no summary.

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: the template's skeleton, table rows without tiles, and the line about rotating keys; the keys are read per request, so the prerendered shell holds none |
| Default | The collection's keys, in its order |
| Just created | The accent Banner with the only full view of the secret; a toast "Key created" |
| Name missing | The Name field's error: "Name the key after what uses it" |
| Not created | A critical Banner at the top of the open sheet, "Key not created", with the server's reason; the sheet keeps what was typed |
| Revoked | The row leaves; a toast "Key revoked" |
| No keys | The first-run empty state with Create key, for someone who may create |
| Read-only | A Member reads every key; Create key and Revoke are not drawn, and nothing on the page says who can use them |
| Never used | "Never" in `ink-3` |

## Data

The keys are the `keys` collection (`src/data/collections.ts`), read through `read('keys')` on every request. Create and Revoke are server actions (`actions.ts`) that write the caller's own collection (`collectionFor(scope, 'keys')`), then the view refreshes the route. A rejected create is said inside the sheet; a rejected revoke shows a critical toast and puts the row back. The secret is generated on the server and returned once, to the banner, which is the only place it is ever shown. The collection stores the key's hint (its prefix and last four characters) and the secret's SHA-256, never the secret, so the table shows the hint and nothing in the browser or the cache can reveal or copy a listed key. To replace a key, create a new one and revoke the old.

## Embed view

Not offered. Keys are secrets, and creating one is a page-only operation. In the console the assistant may propose revoking a key; the secret is hidden from it.

## Surfaces

- **Console**: as above. **Mobile**: cards, the sheet and the dialog rise from the bottom. **Embed**: not offered.

## Agents

An agent may propose revoking a key (a critical Proposal); it never creates one, because a key's secret is shown once, on this page (`pageOnly`). The proposal waits for approval, and its approval removes the key through the same collection. The page shares its context through `keysContext` in `src/views/keys-context.ts`.

### What the agent reads

Every key with its id, environment, hint (the first and last characters, never the secret), owner, scopes, when it was created and last used, the first eight in the page's order and then how many more (`query_keys` finds them); and what code found: live keys unused for 30 days and live keys with every scope, the first five of each and then how many more, and an owner holding several live keys. Within its budget of 2,600 characters for every persona who may read it: 1,085 in the sample, and 1,721 with eight times its keys. The secret and its hash are never in it (`secretHash` is `hidden`), and the context says so, with the rule that creating a key is the person's.

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Content

- "Create key", "Revoke key", "Key created", "Key revoked": one verb through the flow.
- The revoke dialog says the consequence in plain words: "Requests that use it fail at once with 401."

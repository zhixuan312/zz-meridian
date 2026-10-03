# API keys page

The keys that let services call ZZ Meridian: create one with only the scopes it needs, see when each was last used, and revoke one with a confirmation.

Status: beta

## Structure

| Row | Pattern | Console | Mobile |
|---|---|---|---|
| Masthead | PageFrame: kicker, "API keys", one sentence, Create key (primary) | One band | Stacked |
| 1 | Banner (accent), only right after a key is created: "Copy {name} now", the full key in a Copy field, dismissable | Full width | Full width |
| 2 | Data table: Name with its environment, Key (masked Copy field, from 768px), Scopes (two and "+N", from 1280px), Created by (from 1024px), Created, Last used, and Revoke | Columns | Cards: name and environment, "Created …" and "Used …", Revoke |
| Sheet | Create a key: Name (required), Environment (Live or Test), Scopes (checkboxes); Cancel and Create key | From the right, 440px | From the bottom |
| Dialog | Revoke: "Revoke {name}?", what fails and that it cannot be undone, when it was last used; Cancel and Revoke key (danger) | Centred | Bottom sheet |

## States

| State | What shows |
|---|---|
| Default | Keys newest first as listed |
| Just created | The accent Banner with the only full view of the secret; a toast "Key created" |
| Name missing | The Name field's error: "Name the key after what uses it" |
| Revoked | The row leaves; a toast "Key revoked" |
| No keys | The first-run empty state with Create key |
| Never used | "Never" in `ink-3` |

## Data

`API_KEYS` from `src/system/fixtures/sample-records.ts`. A secret is always masked in the table; Copy copies the real value without revealing it.

## Embed view

Not offered. Keys are secrets and revoking is destructive; neither belongs in a chat.

## Surfaces

- **Console**: as above. **Mobile**: cards, the sheet and the dialog rise from the bottom. **Embed**: not offered.

## Agents

An agent may say which keys are unused (from the shared context of other views); it never creates or revokes a key. A revocation it recommends is a Proposal that links here.

## Content

- "Create key", "Revoke key", "Key created", "Key revoked": one verb through the flow.
- The revoke dialog says the consequence in plain words: "Requests that use it fail at once with 401."

# Settings

The Settings page holds the workspace, how ZZ Meridian looks on their device, and what assistants may do, each in a section that saves on its own. It holds only what a record or the device stands behind: the sample sends no notifications, so there is no Notifications section, and a product that does adds the section with the record behind it.

Status: beta

## Structure

On a form page's own measure (`form-width`), which fills the canvas until it is wider than the form needs and then centres, sections 56px apart, each a Form section (its card stops at `field-width`):

| Section | Saves | Controls |
|---|---|---|
| Workspace | Save bar | Name (required; an invitation to join names the workspace by it), address (read-only for everyone) |
| Appearance | At once, on this device | Theme (System, Dark, Light), accent (four swatches), density (Comfortable, Compact) |
| Assistant | At once, on this device | Show the assistant (a switch), only where the product has an assistant |
| Agents and MCP | Nothing to save | The locked rule that every proposal waits for approval |

## States

| State | What shows |
|---|---|
| Loading | `loading.tsx`: a stack of skeleton sections, at the page's own width (`form`), so nothing moves when the page arrives |
| Assistant not resolved yet | The Assistant section keeps its place as a skeleton; once the request says the assistant is configured it becomes the section, and when it is not the place closes |
| Editing Workspace | The save bar; Save confirms with a toast "Workspace saved" and the bar leaves |
| Save refused | A critical banner "Not saved" with the reason above the fields; the edit and the save bar stay, and Discard puts the saved name back |
| Empty name | The field's error; Save does nothing until it is fixed |
| A switch flipped | It applies at once; a toast names the setting and its new state |
| Workspace read-only | For someone who may read the workspace and not change it, an Admin in the sample: the fields are disabled and the section reads "Read-only" beside a lock, with no save bar, and nothing names who can change it. Someone who may not read it, a Member or a Viewer, sees no Workspace section |

## Data

Appearance reads and writes `usePreferences()` (stored on the device). The workspace's name and address are the one row of the `workspace` collection, read under `workspace:read` and saved through the `save-workspace` action, which asks `workspace:update`; the row is seeded from `app.config.ts`. The record holds no time zone: every date is cut on `app.timezone` in the configuration, set once.

## Surfaces

- **Console**: two columns per section.
- **Mobile**: one column; the save bar spans the screen.
- **Embed**: not offered. An agent that wants a setting changed sends a Proposal.

## Agents

This is where people see the rule (locked on) that nothing an agent proposes runs without approval, a removal included. The assistant section, shown only where the product has an assistant, holds the person's switch for its panel.

### What the agent reads

Every section's current values, which neither an input's nor a switch's text carries: the workspace's name and address (and an unsaved edit, when there is one), this device's theme, accent and density, whether the assistant is shown, and that every proposed change waits for approval. Each section reports its own line; `SettingsBody` shares them as one context, built by `settingsContext`. None is offered to an agent as a change, and the context says so. It holds no list, so its size is its four sections': within its budget of 2,600 characters, 1,885 with every section's line at 400 characters.

- **Console assistant:** this text in its prompt's `<view-context>` block, with the page's address and query, and the page text after it for anything the context does not cover.
- **MCP App:** no embed view yet; an MCP server can return this context as a tool's text (`docs/agents.md`).

## Accessibility

- Each section is a form with its own submit; switches carry their label and description.

## Content

- Every switch says what is on, never "Enable…".

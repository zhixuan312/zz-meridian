# Settings

The Settings page holds the workspace, what a person hears about, how ZZ Meridian looks on their device, what assistants may do, and the danger zone, each in a section that saves on its own.

Status: beta

## Structure

At the data width like every console page, sections 56px apart, each a Form section (its card stops at 64rem):

| Section | Saves | Controls |
|---|---|---|
| Workspace | Save bar | Name (required), address (read-only, owner only), time zone (Select) |
| Notifications | At once | Four switches: incident alerts, weekly digest, spend over budget, agent proposals |
| Appearance | At once, on this device | Theme (System, Dark, Light), accent (four swatches), density (Comfortable, Compact) |
| Agents and MCP | At once | "Let assistants read dashboards" switch; the locked rule that every proposal waits for approval; connected hosts with Disconnect (and Undo) |
| Danger zone | Confirmed in a dialog | Delete workspace: typing the workspace's address enables the destructive button |

## States

| State | What shows |
|---|---|
| Editing Workspace | The save bar; Save confirms with a toast "Workspace saved" |
| Empty name | The field's error; Save does nothing until it is fixed |
| A switch flipped | It applies at once; a toast names the setting and its new state |
| No hosts connected | A dashed placeholder says how to connect one |
| Delete dialog | The destructive button stays disabled until the address is typed exactly |

## Data

Appearance reads and writes `usePreferences()` (stored on the device). Time zones and hosts come from `src/system/fixtures/sample-ops.ts`; the workspace name from `app.config.ts`.

## Surfaces

- **Console**: two columns per section.
- **Mobile**: one column; the save bar spans the screen.
- **Embed**: not offered. An agent that wants a setting changed sends a Proposal.

## Agents

This is where people govern agents: whether assistants may read, which are connected, and the rule (locked on) that nothing an agent proposes runs without approval, a removal included. The assistant section, shown only where the product has an assistant, holds the person's switch for its panel.

## Accessibility

- Each section is a form with its own submit; switches carry their label and description.
- The danger dialog's description says what is lost; focus starts in the confirmation field.

## Content

- Every switch says what is on, never "Enable…".
- The danger zone names consequences concretely: "API keys stop working at once".

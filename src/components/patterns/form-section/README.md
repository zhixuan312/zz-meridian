# Form section

A form section is a titled group of settings that saves on its own: its title and purpose on the left, its fields in a card on the right, and a save bar that appears the moment something changes.

Status: beta

## Anatomy

1. **Head**: the title (`t-card`) and one or two sentences (`t-small`, `ink-2`) saying what these settings change, for whom.
2. **Card**: the fields, 20px apart, in a `surface` card with a `line` border.
3. **Error banner** (when a save failed): a critical Banner above the fields.
4. **Read-only notice** (when the reader cannot change it): a lock and who can.
5. **Save bar** (with `onSave`, when dirty): "Unsaved changes", Discard (ghost) and Save changes (primary), pinned to the bottom of the view while the section is on screen.
6. **Footnote** (optional): a caption under the card: "Changes apply at once".
7. **Setting row** (`SettingRow`): for a control that is not a text field, its label and description on the left and the control on the right.

## Variants

| Variant | How | Use |
|---|---|---|
| Saves on its own | `onSave`, `onDiscard`, `dirty` | Text fields, selects: anything that should not apply on each keystroke |
| Applies at once | no `onSave` | Switches and segmented controls; add a footnote that says so |
| Danger zone | `tone="critical"` | Irreversible actions; the title and border take the critical tone |

## Sizes

| Part | Spec |
|---|---|
| Layout | Two columns from 48rem of section width: 15rem head, the card fills; one column below |
| Gap | 40px between the columns, 20px between head and card when stacked |
| Card | `radius-lg` 16px, `card-pad` padding, `shadow-card` |
| Save bar | `surface-raised` at 90% with a backdrop blur, `line` top border, small buttons |

## States

| State | What shows |
|---|---|
| Clean | Fields only |
| Dirty | The save bar opens (rows grow from 0 over `dur-enter`, `ease-out`) |
| Saving | Fields disabled; Save shows its busy spinner; Discard disabled |
| Saved | The bar closes; a toast confirms ("Workspace saved") |
| Error | The bar stays; a critical Banner above the fields says why and what to do |
| Read-only | Fields disabled; the notice says who can change them |

## Behaviour

- Enter in a field submits the section when it is dirty; nothing else on the page saves.
- Discard restores the saved values. Leaving with unsaved changes is the page's concern, not the section's.
- A field's own validation error (Field `error`) blocks Save without a banner; the banner is for a server refusal.

## Composition

A form element holding a fieldset; Field, Input, Select, Switch and Segmented from Layer 2; Banner for errors; Button for the save bar; Toast for confirmation. Settings pages stack sections 56px apart at the reading width.

## Data

The section holds no values: the page owns them, compares them with what is saved to set `dirty`, and performs the save in `onSave`.

## Surfaces

- **Console**: two columns at the reading width (832px).
- **Mobile**: one column; the save bar spans the width above the safe area.
- **Embed**: not offered. Settings belong to the console; an agent proposes a setting change as a Proposal instead.

## Agents

An agent never edits a form section. A change it wants (a rate limit, a notification) arrives as a Proposal that names the setting, its value before and after, and why. The "Agents and MCP" section on Settings shows that approval is always required, locked on.

## Accessibility

- A real `<form>` with a `fieldset`; disabling the fieldset disables every control at once and says so to assistive technology.
- The save bar's buttons leave the tab order when the bar is closed.
- The error banner has `role="alert"`.
- Contrast (dark, indigo): head text `ink-2` 8.0:1; critical title `critical-ink` 9.6:1; primary label 5.0:1.

## Content

- Titles are nouns for what is configured: "Workspace", "Notifications". The description says what changes for whom.
- The save button says what it saves when it is not obvious ("Save workspace"); "Save changes" otherwise.
- A danger action names the object: "Delete workspace", and its confirmation asks for the workspace's address typed out.

## Do and do not

- Do give each section its own save; one Save at the bottom of a long page loses edits.
- Do use switches only where the change applies at once.
- Do not mix instant switches and saved fields in one section.

## Implementation

```tsx
import { FormSection, SettingRow } from '@/components/patterns/form-section';

<FormSection title="Workspace" description="How this workspace is named." dirty={dirty} saving={saving} onSave={save} onDiscard={reset}>
  <Field label="Name">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
</FormSection>
```

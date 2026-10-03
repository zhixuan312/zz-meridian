# Assistant

The assistant is a panel beside the page where a person asks about what they are looking at, opened from the top bar.

Status: draft

## Anatomy

1. **Launcher**: a round 36px button in the top-bar tools with the Agent mark, named "Assistant".
2. **Panel**: an `aside` named "Assistant", on the `frame` wash with a `line` edge, same as the rail.
3. **Head**: 56px; the Agent mark, "Assistant" (`t-section`) and Close assistant (icon button).
4. **Thread**: the messages in order, scrolling inside the panel, kept at the newest. A change the assistant wants to make is a Proposal card in the message.
5. **Composer**: a Textarea (grows to six rows) and Send (primary, icon only), on a `line` top edge.

## Composition

Agent mark, Icon button, Textarea, Button, Proposal. The conversation and the open state live in the shell, so the thread survives navigation.

## Variants

One. Width `assistant-width` (400px). Messages: a person's in a `fill-hover` bubble, `ink`, right-aligned; the assistant's plain, `ink-2`, under an "Assistant" caption (`t-caption`). All type is `t-small`.

## Sizes

Head 56px, composer padding 12px, thread padding 16px, message gap 16px. Launcher 36px; the `hit` class gives 44px to a coarse pointer.

## States

| State | Look |
|---|---|
| Closed | Nothing renders; the launcher is `aria-expanded="false"` |
| Open, empty | One sentence of help, `ink-3`, centred |
| Open, thread | Messages; the thread follows the newest |
| Waiting | Send is disabled until the answer ends |
| Change waiting | A Proposal with Approve and Dismiss ("Approve and remove" for a removal) |
| Change applied, failed, dismissed or expired | The Proposal shows its state with no buttons; expired shows its reason |
| Send disabled | 45% opacity, while the text is empty |

The panel enters with no motion of its own yet; the launcher's states ease `color`, `background-color` and `border-color` with `--dur-hover`.

## Behaviour

- The launcher opens and closes the panel; Close assistant and Escape close it. The conversation is kept.
- Approve and Dismiss answer the waiting change; once the answer arrives the assistant continues on its own, and the page refreshes once after a change applies.
- Queries never draw a card; a mutation with no preview draws nothing.
- Enter sends; Shift+Enter adds a line.
- On send the browser reads the page: `path`, the masthead title (the `h1` in the scroll region) and the text of the scroll region, and sends them with the messages to `/api/assistant`.
- When the assistant is off for the request, the shell renders no launcher and no panel, not even hidden markup.

## Surfaces

- **Console**: from 1024px a third column of the shell at `--assistant-width`; the page narrows by that much.
- **Mobile** (under 1024px): the same panel as a sheet fixed to the right edge over the page, at most the viewport less 48px.
- **Embed**: not applicable; the host is the assistant.

Both are decided by CSS breakpoints, never by measuring the window.

## Agents

This is the agent's seat in the product. It reads the page the person is on and answers; it changes nothing without a person: every mutation arrives as a Proposal in the thread. Its replies carry the Agent mark in the head and the "Assistant" caption.

## Accessibility

- The launcher is a button named "Assistant" with `aria-expanded`; the panel is a complementary landmark named "Assistant".
- The composer's textbox is named "Message"; Send and Close assistant are named buttons.
- Escape closes. Contrast follows Textarea, Button and the frame wash.

## Content

- Empty: "Ask about this page: what a figure means, or why it moved."
- Placeholder: "Ask about this page".

## Do and do not

- Do keep the panel quiet: one column of text.
- Do not render it, hidden or not, when the assistant is off.
- Do not measure the window to choose column or sheet.

## Implementation

```tsx
<AppShell rail={<Rail />} assistant={assistantConfig(process.env) !== null}>…</AppShell>
```

The layout calls `await connection()` first so the choice is made per request, and passes only the boolean.

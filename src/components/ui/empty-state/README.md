# Empty state

An empty state is what a view shows when it has nothing to show, and why: never created, filtered to nothing, or failed to load. Each offers the one action that changes it.

Status: beta

## Anatomy

1. **Disc**: the icon (20px) on a soft circle (48px), with two faint rings around it in the centred layout.
2. **Title**: what is empty, said plainly (`t-card`).
3. **Sentence** (optional): what to do or what happens next (`t-small`, `ink-2`).
4. **Action** (optional): one button.

## Variants

| Kind | Disc | Use | Action |
|---|---|---|---|
| First run | `accent-tint`, `accent-ink` | Nothing has been created yet | Create the first one |
| Filtered | `fill-track`, `ink-3` | Records exist but the filters hide them | Clear filters |
| Error | `critical-tint`, `critical-ink` | Loading failed | Retry |

## Sizes

| Layout | Use | Spec |
|---|---|---|
| Centred | A whole card or page body | 56px vertical padding; the title 32px under the disc; text at most 384px wide |
| Inline | In a list, where rows would be | A 36px disc beside one or two lines, the action at the end |

## States

The empty state is itself a state of a list, a table or a chart. It replaces the content, not the card: the card keeps its head and its size in the row.

## Behaviour

- Filtered names the filters in the sentence and clears them all with one action.
- Error says what failed (the service, the timeout), keeps the reader's filters, and retries the same request.

## Surfaces

- **Console**: centred in cards, inline in lists.
- **Mobile**: the same; the text wraps to the narrower measure.
- **Embed**: inline only; an embed has no room for the centred layout.

## Agents

When an agent's query finds nothing, the view shows the filtered state with the agent's filters named, so the person can see what was asked.

## Accessibility

- The error kind is `role="alert"`.
- The disc is decorative; the title carries the meaning.
- Title `ink` on `surface` 18.5:1; sentence `ink-2` 7.1:1 (light, cobalt).

## Content

- First run: "No API keys yet". Filtered: "No requests match these filters". Error: "Requests did not load".
- Never "Oops", never an apology, never "Something went wrong".

## Do and do not

- Do distinguish the three kinds; "nothing yet" and "nothing matches" ask for different actions.
- Do not leave a card blank while its data is empty.

## Implementation

```tsx
import { EmptyState } from '@/components/ui/empty-state';

<EmptyState kind="filtered" title="No requests match these filters" action={<Button onClick={clear}>Clear filters</Button>}>
  Status 5xx and customer Northwind Labs found nothing in the last 7 days.
</EmptyState>
```

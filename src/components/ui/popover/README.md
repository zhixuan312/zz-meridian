# Popover

A popover is a small panel anchored to its trigger that holds content and controls: a filter's options, a date range, a definition with a link.

Status: beta

## Anatomy

1. **Trigger**: a button; it shows the open state.
2. **Surface**: `surface-raised`, `radius-lg` 16px, 16px padding, `shadow-overlay`, 288px wide by default.
3. **Content**: a small form or an explanation; a form ends with its actions on a hairline-topped row.

## Variants

| Variant | Use |
|---|---|
| Form | Filter options, a date range: controls and Apply |
| Explanation | A definition longer than a tooltip, with a link |

## Sizes

Width 288px by default (the viewport less 16px at most); 8px from the trigger.

## States

| State | Spec |
|---|---|
| Opening | `float-in`: 4px down to place and 97% to full scale over `dur-enter` 320ms |
| Closing | Fades over 120ms |

## Behaviour

- Opens on click; focus moves into it. Escape and a click outside close it and return focus to the trigger.
- A form popover applies on Apply, not on every change, so a person can set several options at once.

## Surfaces

- **Console**: anchored.
- **Mobile**: anchored, kept 8px inside the viewport; a filter set with more than one group moves to a Sheet instead.
- **Embed**: same, inside the frame.

## Agents

Not applicable. An agent sets filters through the view's address.

## Accessibility

- Radix Popover: `role="dialog"`, labelled by its trigger; the trigger carries `aria-expanded`.
- Text `ink` on `surface-raised` 18.5:1 (light, cobalt).

## Content

- A filter trigger says what is applied: "Status · 2".

## Do and do not

- Do use a Menu for a list of actions and a Tooltip for a few words with no controls.
- Do not put a popover inside a popover.

## Implementation

```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

<Popover>
  <PopoverTrigger asChild><Button icon={<ListFilter />}>Status</Button></PopoverTrigger>
  <PopoverContent>…</PopoverContent>
</Popover>
```

`PopoverClose` is also exported, for a panel that carries its own close control (the preview draws one, visually hidden). `POPOVER_CONTENT` is the surface's class list, for static mocks.

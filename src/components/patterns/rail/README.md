# Rail

The rail is the console's navigation: every destination in the product, grouped, with the current page marked by an accent-tinted pill that springs to the item you choose.

Status: beta

## Anatomy

1. **Brand**: the App mark at 28px, the product name (`text-md`, 600) and the workspace as an eyebrow; the whole row is the workspace switcher.
2. **Groups**: an optional mono eyebrow (`t-eyebrow`, `ink-3`) over a list of items; groups sit `space-6` 24px apart.
3. **Item**: a 16px icon at a 1.75 stroke, the label, and an optional count badge.
4. **Marker**: one pill behind the current item, `accent-tint` with an inset `accent-line` ring and a 2px `accent` edge on the left that carries a soft glow.
5. **Account**: the person's avatar, name and role, and the Appearance menu, in a hairline card at the foot.

## Composition

App mark, Avatar and Appearance menu, on `frame` (a translucent wash with `backdrop-blur-xl`) and a `line` hairline on its right edge. The navigation comes from `nav` in `src/app.config.ts`; the rail holds no route knowledge of its own.

## Sizes

| Part | Value |
|---|---|
| Width | `rail-width` 260px |
| Brand row | 64px tall, `space-4` 16px side padding |
| Item | 36px tall, `radius-md` 10px, 12px side padding, icon to label `space-3` 12px |
| List padding | `space-3` 12px sides, items 2px apart |
| Count badge | 20px, `radius-full`, `warning-tint` and `warning-ink`, `text-2xs` 600 |
| Account card | `radius-lg` 16px, `line` border, `surface` at 50%, 10px padding, `space-3` 12px margin |

## States

| State | Item | Icon |
|---|---|---|
| Rest | label `ink-2` | `ink-3` |
| Hover | `fill-hover` behind, label `ink` | `ink-2` |
| Current | the marker behind, label `ink` 500 | `accent-ink` |
| Focus (keyboard) | 2px `accent` outline | as rest |

Colours change over `dur-hover` 160ms. The marker moves (`transform`, `height`) over `dur-enter` 320ms on `ease-spring`, so it lands with a small settle. Under reduced motion it jumps.

## Behaviour

- An item is a link: Enter or a click navigates; the marker follows the new page.
- An item is current when the path equals its route or sits beneath it (`/requests/req_…` keeps Requests current); Overview (`/`) only matches itself.
- `current` overrides the pathname (previews and tests); products leave it unset.

## Surfaces

- **Console**: fixed at the left edge, its own scroll when the list outgrows the window.
- **Mobile**: under 1024px the same node opens as a drawer from the top bar's menu button: 260px (at most 86% of the screen), over a blurred scrim; it closes on Escape, on the scrim and on navigation, and returns focus to the trigger.
- **Embed**: absent. A view in a host has one job and no navigation; it links out with Open in Relay.

## Agents

Not applicable: navigation is how a person moves. An agent opens a view by its address, not by the rail.

## Accessibility

- `nav` with the name "Main"; the current item carries `aria-current="page"`.
- Contrast (dark, indigo): inactive label `ink-2` on the rail 8.7:1, group label `ink-3` 7.0:1, current label on the marker 9.2:1; light 6.6, 4.9 and 5.7:1.
- The count badge repeats a number the page states in words; it is never the only signal.

## Content

- Labels are nouns for places, one or two words, sentence case: "Overview", "API keys", "Design system".
- Group names are short nouns for what a person does there: "Operate", "Workspace".

## Do and do not

- Do keep the rail to about ten items; a product with more needs a second level on its pages (Tabs), not a longer rail.
- Do not put actions in the rail; it holds places only.
- Do not use the count badge for anything but something that needs attention now.

## Implementation

```tsx
import { Rail } from '@/components/patterns/rail';

<AppShell rail={<Rail />} tools={<ShellTools />}>{children}</AppShell>
```

Edit `nav` in `src/app.config.ts` to change the destinations: `{ label?, items: [{ href, label, icon, badge? }] }`.

# Page loading

Page loading is the frame and the shapes a route shows while its page streams in: a masthead skeleton, then a body in the shape of the page that is coming.

Status: beta

## Anatomy

1. **Frame** (`LoadingPage`): a page frame with a skeleton kicker, the page's own title when it is known (a skeleton when it depends on the record) and a skeleton description.
2. **Busy** (`Busy`): the body, announced once as busy under the page's name. A page whose masthead is already real uses it alone as its boundary's fallback.
3. **Shapes**: `TilesSkeleton` (a row of tiles, three unless told), `ChartSkeleton` (a card with a chart-sized block) and `TableSkeleton` (a card with an optional filter row and one line per row).

## Composition

Page frame, Card and Skeleton. It knows nothing of the product: each route composes the shapes in the order of its own page, so the routes still differ.

## Data

- `name` is the page's name, read aloud as "Loading customers".
- `title` is the page's heading, set the moment the state commits. Leave it out when the title depends on the record.
- `width` is the page's own width; a skeleton at another width moves the content when the page arrives.
- `count`, `height`, `rows` and `filters` size the shapes to the page they stand in for.

## States

| State | Where it is composed |
|---|---|
| Route loading | each route's `loading.tsx`, in `LoadingPage` |
| Streaming body | a page's Suspense fallback, in `Busy` |

The whole route inside the shell is held still at [/system/states/loading](/system/states/loading).

## Surfaces

- **Console**: every dashboard route's `loading.tsx` and the Suspense fallbacks of the Overview, Analytics, Customers and Requests pages.
- **Mobile**: the shapes stack as the page does.
- **Embed**: not used; an embed view draws its own small state.

## Agents

An agent reads nothing from a loading state; it is announced to assistive technology only. A page that is loading offers no controls to act on.

## Accessibility

- One `role="status"` with `aria-busy` and the label "Loading customers" per page; the skeleton lines are hidden from assistive technology.
- The frame's title is the page's level-1 heading, so the page has its heading before its data.

## Content

- The label is "Loading" and the page's name, lower case. No "please wait".

## Do and do not

- Do shape the skeleton like the page that replaces it.
- Do not draw a spinner for a whole page.
- Do not put a second busy status inside the first.

## Implementation

```tsx
import { LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';

export default function Loading() {
  return (
    <LoadingPage name="customers" title="Customers">
      <TilesSkeleton />
      <TableSkeleton />
    </LoadingPage>
  );
}
```

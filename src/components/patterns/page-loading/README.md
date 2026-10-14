# Page loading

Page loading is the frame and the shapes a route shows while its page streams in: a masthead skeleton, then a body in the shape of the page that is coming.

Status: beta

## Anatomy

1. **Frame** (`LoadingPage`): a page frame with a skeleton kicker, the page's own title when it is known (a skeleton when it depends on the record) and a skeleton description. For a page headed by a sentence (`sentence`), the heading holds the page's name, read out and not drawn, and the Shell's two bars in the block the sentence will take.
2. **Busy** (`Busy`): the body, announced once as busy under the page's name. A page whose masthead is already real uses it alone as its boundary's fallback.
3. **Shapes**: `TilesSkeleton` (a row of tiles, three unless told), `ChartSkeleton` (a card with a chart-sized block) and `TableSkeleton` (a card with an optional filter row and one line per row).

## Composition

Page frame, Card and Skeleton. It knows nothing of the product: each route composes the shapes in the order of its own page, so the routes still differ.

## Data

- `name` is the page's name, read aloud as "Loading customers".
- `title` is the page's heading, set the moment the state commits. Leave it out when the title depends on the record.
- `sentence` says the page is headed by a sentence that states its figures (the Shell, "The title"). `title` is then the page's name: it is kept in the heading for assistive technology and for whatever finds a page by its heading, it is what the top bar shows, and it is not drawn at the page-title size. The frame draws the sentence's placeholder in the block the sentence will take, so the heading is as tall here as on the page that replaces this state, and the body does not jump. It needs a `title`: with none there is no name to keep, and the frame is drawn as without it.
- `width` is the page's own width; a skeleton at another width moves the content when the page arrives.
- `count`, `height`, `rows` and `filters` size the shapes to the page they stand in for.

## States

| State | Where it is composed |
|---|---|
| Route loading | each route's `loading.tsx`, in `LoadingPage` |
| Streaming body | a page's Suspense fallback, in `Busy` |

The whole route inside the shell is held still at [/system/states/loading](/system/states/loading).

## Surfaces

- **Console**: every dashboard route's `loading.tsx` and the Suspense fallbacks of the Home, Usage, Customers, Requests, Tests and Releases pages.
- **Mobile**: the shapes stack as the page does.
- **Embed**: not used; an embed view draws its own small state.

## Agents

An agent reads nothing from a loading state; it is announced to assistive technology only. A page that is loading offers no controls to act on.

## Accessibility

- One `role="status"` with `aria-busy` and the label "Loading customers" per page; the skeleton lines are hidden from assistive technology.
- The frame's title is the page's level-1 heading, so the page has its heading before its data. With `sentence` the heading reads the page's name alone ("Home:"): the bars that stand for the sentence are hidden from assistive technology.

## Content

- The label is "Loading" and the page's name, lower case. No "please wait".

## Do and do not

- Do shape the skeleton like the page that replaces it.
- Do pass `sentence` when the page passes `PageFrame` a `name`: a name at the page-title size that a sentence then replaces moves everything under it.
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

A page headed by a sentence:

```tsx
<LoadingPage name="home" title="Home" sentence>
  <HomeSkeleton />
</LoadingPage>
```

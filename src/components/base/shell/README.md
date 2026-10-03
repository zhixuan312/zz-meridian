# Shell

The shell is the layout contract every console page shares: a fixed frame where only one region scrolls, a rail, a top bar, a masthead that scrolls away, and rows of cards in four splits and two widths.

Status: beta

## Anatomy

1. **AppShell**: fixed to the viewport, so the document itself never scrolls. It holds the rail and the main column, and places the global tools.
2. **Rail**: on the left from 1024px, its own scroll; below 1024px, a drawer.
3. **PageFrame**: the one scroll region of a page, holding:
   - **Top bar**: 56px, sticky. The drawer trigger (under 1024px), the compact title (once the masthead leaves), and the global tools. Clear at rest; glass (`ground` at 72%, `backdrop-blur-xl`, a `line` hairline) once scrolled.
   - **Masthead**: the kicker, the page title (`t-page`), one sentence (`t-lead`), and the meta and actions, aligned to the title's last line. It scrolls away with the content.
   - **Body**: a `Stack` of `Row`s.
4. **Stack**: rows one `stack-gap` apart (14–20px), arriving in reading order.
5. **Row**: one card, or cards split `1/2`, `2/3` or `1/3`, or a row of tiles.
6. **Assistant** (when `assistant` is true): its launcher joins the global tools; its panel is a third column at `assistant-width` from 1024px and a sheet over the page below it. Nothing of it renders while it is closed, or at all when `assistant` is false.

## The four rules

1. **One scroller.** PageFrame is the only element on a page that scrolls, and only vertically. No card, table or list scrolls on its own.
2. **Cards are their content's height.** A list that can pass ten rows pages; a "top N" list stays at N.
3. **Four splits.** Full, `1/2`, `2/3`, `1/3`; and `tiles`, whose columns follow how many tiles it holds and its own width (four are four or two, three are three or one, never a hole). Cards in a row are the same height; every card is a direct child.
4. **Two widths.** `data` (dashboards, lists, detail pages) fills the canvas at every size (`data-width` is 100%), so a wider screen shows more, not a centred strip; `reading` (forms, documents, settings) is `reading-width` 832px and centres. The top bar always takes the canvas width, so the tools never move; past the reading width the light fills the margins.

## Sizes

| Part | Value |
|---|---|
| Rail | `rail-width` 260px |
| Assistant | `assistant-width` 400px (from 1024px) |
| Gutter | `gutter`: 16px on phones to 40px on wide screens (fluid) |
| Top bar | 56px |
| Masthead | 16px under the top bar (24px from 1024px), 32px (40px) under the title block |
| Row gap | `stack-gap` 14–20px (12px compact) |

## Behaviour

- The compact title fades into the top bar (opacity and 4px rise over `dur-enter`) when the page title passes under it, measured with an IntersectionObserver.
- The drawer closes on navigation, Escape and the scrim, and returns focus.
- Never set `transform`, `filter` or `will-change` on `html`, `body` or anything above AppShell: it would turn the fixed frame into one that scrolls.

## Surfaces

- **Console**: as specified.
- **Mobile**: under 1024px every split stacks to one column; the rail is a drawer; the masthead's actions wrap under the title.
- **Embed**: not used. An MCP App view uses the Embed frame instead.

## Agents

Every console page keeps its state in its address (period, filters, the selected record), so an agent or a shared link opens exactly the same view.

## Accessibility

- `aside` named "Primary" for the rail; `main` for the content; one `h1` per page.
- The compact title is `aria-hidden`: the page title is the heading.

## Do and do not

- Do build every page from PageFrame, Stack and Row; a page has no layout of its own.
- Do not nest a scroller in a card; page the list instead.

## Implementation

```tsx
import { PageFrame, Row, Stack } from '@/components/base/shell';

<PageFrame kicker="ZZ Meridian · Production" title="Overview" description="…" meta={<Freshness … />} actions={<PeriodSelect … />}>
  <Stack>
    <Row split="2/3"><FeaturedMetric … /><div>…tiles…</div></Row>
    <Row split="1/2"><Card … /><Card … /></Row>
  </Stack>
</PageFrame>
```

`src/components/base/shell.tsx` exports `AppShell`, `NavTrigger`, `PageFrame`, `Stack`, `Row` and `WIDTH`.

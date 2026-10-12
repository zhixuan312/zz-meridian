# Shell

The shell is the layout contract every console page shares: a fixed frame where only one region scrolls, a rail, a top bar, a masthead that scrolls away, and rows of cards in four splits and a width per kind of page.

Status: beta

## Anatomy

1. **AppShell**: fixed to the viewport, so the document itself never scrolls. It holds the rail and the main column, and places the global tools.
2. **Rail**: on the left from 1024px, its own scroll; below 1024px, a drawer.
3. **PageFrame**: the one scroll region of a page, holding:
   - **Top bar**: 56px, sticky. The drawer trigger (under 1024px), the compact title (once the masthead leaves), and the global tools. Clear at rest; glass (`ground` at 72%, `backdrop-blur-xl`, a `line` hairline) once scrolled.
   - **Masthead**: the kicker, the page title (`t-page`), one sentence (`t-lead`), and the meta and actions, aligned to the title's last line. It scrolls away with the content. A record more than one level deep puts its trail in the kicker: `kicker={<Breadcrumb items={[{ label: 'Teams', href: '/teams' }, { label: 'Atlas', href: '/teams/atlas' }, { label: 'Q3 review' }]} />}`. Breadcrumb's links carry `hit`, as any link laid out as a box must, or they fail the 44px touch rule at 390px.
   - **Body**: a `Stack` of `Row`s.
4. **Stack**: rows one `stack-gap` apart (14–20px), arriving in reading order on the first load; on a client navigation the shell marks its main area still, so a page already there does not replay its arrival (Motion).
5. **Row**: one card, or cards split `1/2`, `2/3` or `1/3`, or a row of tiles.
6. **Assistant** (`assistant` is a `Promise<boolean>` the request resolves, so the layout never waits for it: pass `connection().then(() => assistantConfig(process.env) !== null)` without awaiting it, and read it back with `useAssistantAvailable()`, which returns the same promise). While it is pending the top bar already holds the launcher's place, a `data-assistant-slot` of the launcher's size, `aria-hidden` and with nothing in it that takes focus; it stays that way, empty and inert, when the promise resolves `false`, so the row of tools never shifts. When it resolves `true` the launcher joins the global tools in that place; its panel is a third column at `assistant-width` from 1024px and a sheet over the page below it. Nothing of it renders while it is closed, or at all when `assistant` is false — and the panel is a separate chunk from the launcher, mounted the first time somebody opens it, so a page that never opens it does not download `useChat`, the AI SDK or the markdown renderer at all (issue #7). Once opened it stays mounted, so closing and reopening keeps the thread. The person's switch (Settings, "Show the assistant", stored as `assistant` in their preferences, on by default) hides the launcher and the panel without touching the conversation, which stays on the device. `useAssistantAvailable()` tells Settings whether the product has an assistant to switch.

## The four rules

1. **One scroller.** PageFrame is the only element on a page that scrolls, and only vertically. No card, table or list scrolls on its own.
2. **Cards are their content's height.** A list that can pass ten rows pages; a "top N" list stays at N.
3. **Four splits.** Full, `1/2`, `2/3`, `1/3`; and `tiles`, whose columns follow how many tiles it holds and its own width (four are four or two, three are three or one, never a hole). Cards in a row are the same height; every card is a direct child.
4. **Three widths, one per kind of page.** `data` fills the canvas at every size (`data-width` is 100%), so a wider screen shows more, not a centred strip: every analytical page uses it, and their titles sit on the same left edge. `form` is a form page's own measure (`form-width`: a 15rem head column, the column gap, a `field-width` card and the page's gutter). It fills the canvas until the canvas is wider than a form needs, then centres — the remainder splits evenly instead of leaving a strip at one side. Settings is the page that uses it. `reading` (`reading-width` 832px, centred) is for a page that is one long document, such as an article rendered with Prose. The top bar always takes the canvas width, so the tools never move; past a page's own width the light fills the margins.

## Sizes

| Part | Value |
|---|---|
| Rail | `rail-width` 260px |
| Assistant | `assistant-width` 400px (from 1024px) |
| Data width | `data-width` 100%: the canvas, for every analytical page |
| Form width | `form-width` 1253px at the template's own root: a `field-width` card and its head column; a form page centres on it past that |
| Reading width | `reading-width` 832px: one long document |
| Stage width | `stage-width` 1560px: a standalone screen (sign in, not found) |
| Gutter | `gutter`: 16px on phones to 40px on wide screens (fluid) |
| Top bar | 56px |
| Masthead | 16px under the top bar (24px from 1024px), 32px (40px) under the title block |
| Row gap | `stack-gap` 14–20px (12px compact) |

## Behaviour

- The compact title fades into the top bar (opacity and 4px rise over `dur-enter`) when the page title passes under it, measured with an IntersectionObserver.
- The drawer closes on navigation, Escape and the scrim, and returns focus.
- The shell never reads the address itself. A route with a parameter the build did not know (a record's page) has no pathname until the request, and whatever asks for one waits for it; so each part that does ask — the drawer, the mark that holds a navigated page still, and the rail a product passes — waits behind its own boundary, and the frame and the page's own skeleton are prerendered for every route. `pnpm verify` fails a build in which a route's shell for an unknown parameter is an empty file.
- **Leaving with unsaved changes asks first.** A component that holds unsaved changes calls `useUnsavedChanges(dirty)`; `FormSection` does, with its `dirty`. While any does, the shell hears a plain click on a link anywhere on the page, in the rail a product passes and in the drawer (drawn in a portal, outside the shell's own element), before the link's own handler runs, because a router's link component navigates in its handler unless the click was already prevented. It stops the click and asks "Leave without saving?" with Stay and Leave. Stay closes the question and leaves the address, the form and what was typed as they were, and discards the held navigation. Leave goes through the router to the link's address as written, path, query and fragment. Saving or discarding stops the holding at once, and so does a form that leaves the page (a page the router keeps hidden holds nothing while hidden). One question is open at a time.
- **What is held, and what is not.** Held: a plain click in this tab on a link to another page of this origin, and a navigation started from code through `useLeave()`, whose `leave(go)` runs `go` at once when nothing is unsaved and otherwise asks first. The Rail's menu, the command palette, a table row that opens an address and the product's workspace switcher all go through it. A product that navigates from its own code goes through `useLeave` too; a navigation it makes when an action has completed (deleting the record the form belonged to) does not need to. Not held: a click with a modifier key or another button, a link that opens another tab or frame or downloads, a link to another origin or to the page already in view, all left to the browser. Closing or reloading the tab gets the browser's own warning while something is unsaved, and none otherwise.
- **Back and Forward are the browser's and are not held.** The router gives a page no way to hold a history step, and a guard that pretends to, by pushing the address back, breaks the Back button. Outside a shell (a card's preview, an embed) both hooks are harmless: nothing is registered and `leave(go)` runs `go`. `AppShell` asks the router for `useRouter`, so a test that stands in for `next/navigation` needs it. The question itself (`leave-question.tsx`) is a chunk of its own, fetched when something on the page first becomes unsaved, so a page that never asks does not download a dialog: a test waits for it (`findByRole`), as a person does. The guard never reads the address, so the shell stays prerendered.
- Never set `transform`, `filter` or `will-change` on `html`, `body` or anything above AppShell: it would turn the fixed frame into one that scrolls.

## Surfaces

- **Console**: as specified.
- **Mobile**: under 1024px every split stacks to one column; the rail is a drawer; the masthead's actions wrap under the title.
- **Embed**: not used. An MCP App view uses the Embed frame instead.

## Agents

Every console page keeps its state in its address (period, filters, the selected record), so an agent or a shared link opens exactly the same view.

## Accessibility

- `aside` named "Primary" for the rail; `main` for the content; one `h1` per page.
- The first Tab stop is "Skip to content", shown only while focused: it moves past the rail and the top bar to the masthead (`#content`), so the next Tab is the page's own first control.
- The compact title is `aria-hidden`: the page title is the heading.

## Do and do not

- Do build every page from PageFrame, Stack and Row; a page has no layout of its own.
- Do put `*:min-w-0` on any grid you write yourself, and start it from one column. A grid item's default is `min-width: auto`, so a child that truncates never gets a width to truncate at: the column grows to its longest word and the page scrolls sideways — on a 390px phone, while `Row` beside it looks right. `Row` carries `*:min-w-0` for exactly this.
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

`src/components/base/shell/index.tsx` exports `AppShell`, `NavTrigger`, `PageFrame`, `Stack`, `Row`, `WIDTH`, `useAssistantAvailable`, `useUnsavedChanges` and `useLeave`.

```tsx
const leave = useLeave();
<Button onClick={() => leave(() => router.push('/health'))}>Open Operations</Button>
```

# Embed frame

The embed frame is the head and body of an MCP App view: a guest in someone else's interface that shows the product's mark, the view's title, how fresh it is, and the way out, then one job.

Status: beta

## Anatomy

1. **Mark**: the App mark at 20px.
2. **Title**: inline `text-sm` 600; fullscreen `t-page` under a kicker with the product's name.
3. **Meta**: the Freshness stamp.
4. **Expand** (inline, when the view left something out): asks the host for fullscreen.
5. **Open in Relay**: leaves for the console page this view summarises.
6. **Body**: the view's rows.

## Composition

App mark, Freshness and the view's own patterns (Metric tiles, a Trend chart, a short list, a Proposal), under `EmbedSurface`, which applies the host's theme and style variables and reports the height.

## Sizes

| Mode | Width | Padding | Title |
|---|---|---|---|
| Inline | up to 760px | 4px | `text-sm` 600 |
| Fullscreen | the panel | `gutter` sides, 24px top | `t-page` |

The head responds to its own container, not the viewport: under 34rem the meta and tools take a second line under the title; under 24rem Expand shows only its icon.

## States

| State | What changes |
|---|---|
| Inline | One job; Expand offered when there is more |
| Fullscreen | The console page's rows, without the shell |
| Not connected (opened outside a host) | Expand and Open in Relay open new tabs |

## Behaviour

- Expand asks `ui/request-display-mode` for fullscreen; when the host refuses, it opens the console page instead (`ui/open-link`).
- Open in Relay always uses `ui/open-link` in a host; the frame never navigates itself.
- The body's height is reported on every change (`ui/notifications/size-changed`); an inline view never scrolls inside the host.

## Surfaces

- **Console** and **Mobile**: not used.
- **Embed**: always; inline in the conversation by default, fullscreen after Expand.

## Agents

The frame is where an agent's tool result appears. Its view shares what is on screen with the model (`useShareView`), offers Ask on its cards and shows any write as a Proposal.

## Accessibility

- One `h1` per view: the title. Expand keeps its name when only its icon shows.
- Contrast follows the host's colours through the token bridge; Meridian's own values are the fallback.

## Content

- The title names the view and its scope: "Overview · Last 7 days", "Parallax AI · Requests".
- The way out names the product: "Open in Relay".

## Do and do not

- Do give an inline view one job and fit it in about 480px.
- Do not put a rail, a masthead or a destructive action in an embed.

## Implementation

```tsx
import { EmbedFrame } from '@/components/patterns/embed-frame';

<EmbedFrame title="Overview · Last 7 days" meta={<Freshness updatedAt={updatedAt} />} consolePath="/?period=7d">
  <Row split="tiles">…</Row>
</EmbedFrame>
```

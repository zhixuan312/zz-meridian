# Proposal

A proposal is a change an agent wants to make, waiting for a person: what changes (before and after), why, and what else it touches, with Approve and Dismiss. A removal is proposed with the critical tone.

Status: beta

## Anatomy

1. **Lit edge**: a 2px `accent` line along the top while the proposal is open.
2. **Head**: the Agent mark at 32px, "<agent> proposes" (`t-caption`) and the title (`t-card`), what will happen as a sentence; the state tag on the right.
3. **Reason** (optional): one or two sentences with the evidence the agent used (`t-small`, `ink-2`).
4. **Changes**: a bordered list of rows: the setting (`ink-3`), the old value struck through, an arrow, the new value (500).
5. **Impact**: who or what else it touches (`t-caption`).
6. **Note**: why a closed proposal closed, such as its expiry reason (`t-small`, `ink-2`).
7. **Footer**: Dismiss (ghost) and Approve (primary; danger and "Approve and remove" in the critical tone), on `surface-sunk`.

## Composition

Agent mark, Button, on a card (`radius-lg`); while it waits for a person it carries the lit edge (`edge-lit`) and a faint `shadow-halo`, the system's one sign of "this needs you" besides the tag. The changes list is a Key value pattern drawn as before → after.

## Data

`title`, `tone` (`neutral` or `critical`), `reason` (optional), `changes: { label, from, to }[]`, `impact`, `note`, `onApprove` (may return a promise) and `onDismiss`. `state` can be controlled; otherwise the card keeps its own.

## States

| State | Tag | Border | Footer |
|---|---|---|---|
| Pending | "Needs you", `accent-ink` | `accent-line`; `critical` at 45% in the critical tone | Dismiss, Approve |
| Applying | "Applying…" | `accent-line` | uncontrolled: both disabled, Approve busy; controlled: none |
| Applied | ✓ "Applied", `positive-ink` | `line`; title `ink-2` | none |
| Dismissed | ✕ "Dismissed", `ink-3` | `line` | none |
| Expired | ✕ "Expired", `ink-3` | `line` | none; the note says why |
| Failed | ✕ "Not applied", `critical-ink` | `critical` at 45% | uncontrolled: the error on its own line, then Dismiss and Try again; controlled: none |

## Behaviour

- Approve runs the change once; while it runs, nothing can be pressed again.
- A failure changes nothing and says so; Try again runs it again.
- A removal is proposed with the critical tone: the button is danger and reads "Approve and remove".
- Controlled, only a pending proposal shows buttons; the caller answers the rest.

## Surfaces

- **Console** and **Mobile**: in an inbox (Activity) when an agent proposed while the person was away; on phones the change rows put the label above the values.
- **Embed**: the card a tool returns when an agent wants to write.

## Agents

This is the consent rule made visible: an agent may read anything, and changes nothing without a person. Applied proposals become Activity lines with the agent and the person named.

## Accessibility

- An `article` named "Proposal from <agent>: …"; the failure message is `role="alert"`.
- The struck-through old value is also read as text; the arrow is decorative.
- Contrast (dark): reason `ink-2` 8.0:1, old value `ink-3` 6.4:1.

## Content

- The title is the change, in the imperative: "Raise the rate limit for Parallax AI".
- The reason gives the evidence with numbers, not a feeling: "hit its limit 1,284 times in the last hour".

## Do and do not

- Do show every value that changes, before and after.
- Do not auto-approve, and do not hide Dismiss.

## Implementation

```tsx
import { Proposal } from '@/components/patterns/proposal';

<Proposal
  title="Raise the rate limit for Parallax AI"
  reason="Parallax AI hit its limit 1,284 times in the last hour…"
  changes={[{ label: 'Rate limit', from: '1,200 rpm', to: '2,000 rpm' }]}
  impact="Applies to all 14 API keys of Parallax AI."
  onApprove={() => callTool('set_rate_limit', { customer: 'parallax', rpm: 2000 })}
/>
```

# Agent proposal · MCP view

The proposal view is how an agent asks a person to change something: the tool that would make the change returns this card instead, and only the person's Approve applies it.

Status: beta

## The consent rule

An agent may read anything the person may read. It changes nothing on its own. Every write it wants becomes a Proposal: what changes (before and after), why, with the evidence it used, and what else it touches. Approve runs the change once; Dismiss closes it; neither can be undone by the agent. Destructive changes (deleting, revoking) are never proposed inline: the agent links to the console instead. Settings shows this rule, locked on.

## Structure

| Part | Content |
|---|---|
| Head | The embed frame: mark, "Proposal", Open in Relay (no Expand: the card is the whole view) |
| Card | "Claude proposes", the title "Raise Parallax AI's rate limit", the reason (429s rose 14% in 24 hours at the 1,000 rpm limit; contract allows 2,500), the changes (rate limit 1,000 → 2,000 rpm; burst 1,500 → 3,000 rpm), the impact (all 14 API keys, logged in Activity) |
| Actions | Dismiss (ghost), Approve (primary) |

## States

| State | What shows |
|---|---|
| Pending | Accent edge and border, "Needs you" |
| Applying | Approve is busy; Dismiss disabled |
| Applied | "Applied" in positive ink; the actions leave; the edge goes |
| Dismissed | "Dismissed"; the actions leave |
| Failed | "It did not apply. Nothing changed." with Try again |

## Data

The proposal's fields come from the tool's result: `{ customer, from, to, reason, impact }`. In this demo they are fixed.

## Surfaces

Embed only. On the console the same Proposal card appears in Activity as an inbox.

## Agents

Shares its state with the model on every change, so the assistant can say what happened: "The person approved the proposal: Parallax AI's rate limit is now 2,000 requests per minute." with `{ view, proposal, customer, from, to, state }`. In a product, Approve calls the apply tool through the host (`tools/call`) and the card shows the tool's result.

## Accessibility

The card is an `article` labelled "Proposal from Claude: Raise Parallax AI's rate limit"; a failure is announced with `role="alert"`.

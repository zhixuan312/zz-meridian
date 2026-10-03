# Not found

The not-found screen meets any address that leads nowhere: it says so plainly, says why that usually happens, and offers the two ways back.

Status: beta

## Structure

A standalone screen outside the shell, on the lit ground, from `src/views/standalone.tsx` (shared with Sign in):

| Part | Content |
|---|---|
| Corner | The app mark and the product name, linking home |
| Kicker | "404 · Not found" |
| Sentence | "This page isn't here." at `text-display` |
| Lead | "The address may be old, or the record may have been deleted. Everything that exists is one search away from the Overview." |
| Actions | Go to Overview (primary, `lg`), Check service health (secondary, `lg`) |

## States

| State | What shows |
|---|---|
| Unknown route | As above |
| A record that no longer exists (`/requests/<id>`) | The same screen, from the route's `notFound()` |

## Surfaces

- **Console** and **Mobile**: as above; actions stack under the sentence below 640px.
- **Embed**: not offered. An embed view that cannot find its record says so inside its own frame.

## Agents

Not applicable: an agent never navigates; it opens a view by address, and a bad address returns a tool error, not this screen.

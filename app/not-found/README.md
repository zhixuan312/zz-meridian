# Not found

The not-found screen meets any address that leads nowhere: it says so plainly, shows the address walked back to the deepest page that still exists, and offers that page as the way back.

Status: beta

## Structure

For an address outside the console, a standalone screen on the lit ground, from `src/views/standalone.tsx` (shared with Sign in). The sentence, the lead and the footer are prerendered. The address and the ways back depend on the path that was asked for, so they stream in behind a `<Suspense>` whose fallback holds their size, after `connection()`: a prerendered address would name `/_not-found` instead of the one asked for.

| Part | Content |
|---|---|
| Corner | The app mark and the product name, linking home |
| Kicker | "404 · Not found" |
| Sentence | "This page isn't here." at `text-display`: the protagonist |
| Lead | "The link may be mistyped or out of date, or what it pointed to has been removed." |
| Address | A sunk field, body-size mono: the part that exists as a link to that page, the part that does not under a dashed critical rule, and one line saying which is which |
| Actions | Back to the nearest page (primary, `lg`), then a link to the home page when that is somewhere else (`nav`'s label for `/`) |

Inside the console the screen is `MissingPage` (`src/views/missing-page.tsx`): a record page renders it itself when its ID is missing (`/requests/<id>`), and `app/(dashboard)/not-found.tsx` renders it for any other `notFound()`. A record page renders rather than throws because a `notFound()` thrown inside the dashboard's loading boundary shows only once the JavaScript arrives, which on a slow phone put the largest paint past 2.5s; the page keeps `noindex`. The rail stays; the sentence becomes the page title over the same lead at the data width, on the same left edge as every page, and one card holds the address at `text-xl` as the protagonist and the same actions (`md`). A miss at the root there offers Search pages (the command palette) as the second action.

The words come from `src/views/not-found.tsx`; the address and the actions from `src/views/not-found-address.tsx`, once. The home page's own name is read from `nav` (`homeLabel`), not written here: a product whose front page is a ranked list, not "Overview", names it once in `src/app.config.ts` and both buttons follow.

## States

| State | What shows |
|---|---|
| A missing record (`/requests/req_9x7k`) | `/requests` links to Requests; `/req_9x7k` is marked; "Requests is still here. Nothing in it answers to req_9x7k."; Back to Requests, Go to the home page (`nav`'s label: Overview here) |
| A deeper miss (`/settings/billing/invoices/2026`) | `/settings` links to Settings; the rest is marked; "Settings is still here; the rest of the address leads nowhere." |
| No part exists (`/this-page-does-not-exist`) | `/` links home; the rest is marked; "No page in ZZ Meridian lives at this address."; Go to the home page (and, in the console, Search pages) |
| A long ID (60 characters or more) | The address breaks anywhere rather than overflowing; the sentence says "the address above" instead of repeating an ID over 32 characters |
| Percent-escapes (`/requests/a%20b`) | Decoded for reading where they decode, shown as typed where they do not |
| A trailing slash | Ignored: `/requests/` is Requests itself, not a miss |

Matching is on segment boundaries and the longest navigation entry wins: `/requests` claims `/requests/req_1` but not `/requestsx`, and Docs (`/system/start/...`) wins over Design system (`/system`).

## Surfaces

- **Console** and **Mobile**: as above; actions stack full width below 640px.
- **Embed**: not offered. An embed view that cannot find its record says so inside its own frame.

## Agents

Not applicable: an agent never navigates; it opens a view by address, and a bad address returns a tool error, not this screen.

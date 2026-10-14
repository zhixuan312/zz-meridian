# Sign in

The sign-in screen is the one screen a visitor sees before they are anyone: one sentence at poster size that says what ZZ Meridian is for, and a panel that signs them in.

Status: beta

## Structure

A standalone screen outside the shell, on the lit ground:

| Part | Content |
|---|---|
| Corner | The app mark and the product name, linking home |
| Left | Kicker "ZZ Meridian · Console"; "Know your API before your customers do" at `text-display`, ending on an accent full stop; one sentence of lead; from 1024px, the requests of the last 30 complete days, their total and a Trend chart on its own Meridian |
| Right | One panel. Without a password, "Sign in as": one row per persona (Avatar, name, role, a forward arrow), each row signing in as that person. With `DEMO_PASSWORD`, "Sign in": the password and "Sign in as" (Field, a native select at `lg`, default Maya Chen, a non-Active persona disabled). There is no email link and no company sign-in: the product sends no message and asks no identity provider, so the page offers neither |
| Foot | Copyright, a link to the design system, and the live service status (derived, linking to Services) |

Two columns from 1024px; one below, the panel under the sentence.

## States

| State | What shows |
|---|---|
| Persona list | Without `DEMO_PASSWORD`: one row per persona, a non-Active persona disabled and marked "Not active". A click signs the request in as them and opens the console; a refusal reads its own message under the heading |
| Behind a password | With `DEMO_PASSWORD` set at run time, the panel is "Sign in": the password (Field, Input `lg`), "Sign in as" (Field, a native select at `lg`), and "Sign in" (primary, block, `lg`), busy while it is sent; a wrong password reads "That is not the password." in the field after 600 ms, and a persona outside the list sets nothing. A match sets a 30-day session and the View as cookie, then opens the console |
| Loading | While the panel streams in, its surface holds its place, empty |

## The demo gate

`proxy.ts` and `src/lib/demo-gate.ts` put a password in front of the whole product when `DEMO_PASSWORD` is set: every
route but this one redirects here (303), and an API answers 401. Opening this page signs the demo out, which is the
rail's Sign out. `DEMO_SECRET`, when set, keys the session instead of the password. Without `DEMO_PASSWORD` nothing is
gated and the column shows the persona list. The panel is the only part of the page that
reads the request; the rest prerenders (`gated-panel.tsx`, behind a Suspense boundary). Choosing a persona never
bypasses the password: the gated form checks the password before the person, and sets nothing when either is wrong.

## Data

The five personas, read through the members collection (name, role and whether the record is Active), so a role change
or a suspension reads at the next visit; the service status in the foot, from the Services summary; and the chart's 30 days, from `signInDays()` in `src/data/sign-in.ts`, read with no session.

## Surfaces

- **Console** and **Mobile**: as above.
- **Embed**: not offered; a host authenticates the person before any view is shown.

## Agents

Not applicable.

## Accessibility

- The panel is a section labelled by its heading; each field is labelled and its error announced.
- The persona list is a `ul` of forms, one button per person; a disabled persona is a disabled button, not a hidden one.
- The display sentence is the page's `h1`; the accent full stop is decoration in the sentence, not a separate element for assistive technology.

## Content

- One sentence of promise, one of proof. No feature lists on a sign-in screen.
- The panel promises only what signs somebody in: a product that emails a link or asks an identity provider adds that form with the action behind it.

# Sign in

The sign-in screen is the one screen a visitor sees before they are anyone: one sentence at poster size that says what ZZ Meridian is for, and a panel that signs them in.

Status: beta

## Structure

A standalone screen outside the shell, on the lit ground:

| Part | Content |
|---|---|
| Corner | The app mark and the product name, linking home |
| Left | Kicker "ZZ Meridian · Console"; "Know your API before your customers do" at `text-display`, ending on an accent full stop; one sentence of lead |
| Right, the demo | Without a password, the persona list above the sign-in panel: "Open the demo as", then one row per persona (Avatar, name, role, a forward arrow), each row opening the console as that person. With `DEMO_PASSWORD`, one panel instead: the demo password and "Open as" (Field, Select `lg`, default Maya Chen, a non-Active persona disabled) |
| Right, the product | The sign-in panel: work email (Field, Input `lg`), "Continue with email" (primary, block, `lg`), "or", "Continue with SSO" (secondary, block, `lg`), the legal caption |
| Foot | Copyright, a link to the design system, and the live service status (derived, linking to Health) |

Two columns from 1024px; one below, the panels under the sentence. The panel column stacks: the demo's own surface first, the product's sign-in under it.

## States

| State | What shows |
|---|---|
| Rest | The form |
| Invalid email | The field's error: "Enter your work email, like maya@zz-meridian.example." |
| Sending | The primary button is busy |
| Sent | The panel says "Check your inbox", names the address, and offers "Use another email" |
| Demo, gated | With `DEMO_PASSWORD` set at run time, the panel is "Open the demo": the password (Field, Input `lg`), "Open as" (Field, Select `lg`), and "Open the demo" (primary, block, `lg`); a wrong password reads "That is not the demo password." in the field after 600 ms, and a persona outside the list sets nothing. A match sets a 30-day session and the View as cookie, then opens the console |
| Persona list | Without `DEMO_PASSWORD`, the list above the sign-in panel: one row per persona, a non-Active persona disabled and marked "Not active". A click signs the request in as them and opens the console; a refusal reads its own message under the list |
| Loading | While the panels stream in, their surface holds its place, empty |

## The demo gate

`proxy.ts` and `src/lib/demo-gate.ts` put a password in front of the whole product when `DEMO_PASSWORD` is set: every
route but this one redirects here (303), and an API answers 401. Opening this page signs the demo out, which is the
rail's Sign out. `DEMO_SECRET`, when set, keys the session instead of the password. Without `DEMO_PASSWORD` nothing is
gated and the column shows the persona list above the product's sign-in. The panel is the only part of the page that
reads the request; the rest prerenders (`gated-panel.tsx`, behind a Suspense boundary). Choosing a persona never
bypasses the password: the gated form checks the password before the person, and sets nothing when either is wrong.

## Data

The five personas, read through the members collection (name, role and whether the record is Active), so a role change
or a suspension reads at the next visit; and the service status in the foot, from the Health summary.

## Surfaces

- **Console** and **Mobile**: as above.
- **Embed**: not offered; a host authenticates the person before any view is shown.

## Agents

Not applicable.

## Accessibility

- The panel is a section labelled by its heading, and each panel's heading id is its own, so a page with two panels names two sections; each field is labelled and its error announced.
- The persona list is a `ul` of forms, one button per person; a disabled persona is a disabled button, not a hidden one.
- The display sentence is the page's `h1`; the accent full stop is decoration in the sentence, not a separate element for assistive technology.

## Content

- One sentence of promise, one of proof. No feature lists on a sign-in screen.
- "We never post anything for you": say what the product will not do.

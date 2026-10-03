# Sign in

The sign-in screen is the one screen a visitor sees before they are anyone: one sentence at poster size that says what ZZ Meridian is for, and a panel that signs them in.

Status: beta

## Structure

A standalone screen outside the shell, on the lit ground:

| Part | Content |
|---|---|
| Corner | The app mark and the product name, linking home |
| Left | Kicker "ZZ Meridian · Console"; "Know your API before your customers do" at `text-display`, ending on an accent full stop; one sentence of lead |
| Right | The sign-in panel: work email (Field, Input `lg`), "Continue with email" (primary, block, `lg`), "or", "Continue with SSO" (secondary, block, `lg`), the legal caption |
| Foot | Copyright, a link to the design system, and the live service status (derived, linking to Health) |

Two columns from 1024px; one below, the panel under the sentence.

## States

| State | What shows |
|---|---|
| Rest | The form |
| Invalid email | The field's error: "Enter your work email, like maya@zz-meridian.example." |
| Sending | The primary button is busy |
| Sent | The panel says "Check your inbox", names the address, and offers "Use another email" |

## Data

No data but the service status in the foot, from the Health summary.

## Surfaces

- **Console** and **Mobile**: as above.
- **Embed**: not offered; a host authenticates the person before any view is shown.

## Agents

Not applicable.

## Accessibility

- The panel is a section labelled by its heading; the field is labelled and its error announced.
- The display sentence is the page's `h1`; the accent full stop is decoration in the sentence, not a separate element for assistive technology.

## Content

- One sentence of promise, one of proof. No feature lists on a sign-in screen.
- "We never post anything for you": say what the product will not do.

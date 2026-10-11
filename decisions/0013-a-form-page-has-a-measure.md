# 0013 · A form page has a measure of its own

Date: 2026-10-11 · Status: accepted

## Context

Every console page took the data width — 100% of the canvas — and one card, the Form section's, capped itself at
`64rem` so a field never stretched across a wide screen. On a 1440px window the two met and nothing showed. On a
wider one they did not: Settings ran its masthead and its sections out to the canvas's right edge while the cards
inside stopped at 64rem, so the page ended in a strip — 280px at 1920px, 1108px at 2560px. The owner asked why
Settings alone was not full width, and the honest answer was that nothing in the repository said what a form page
should do; the token layer's own `reading-width` described itself as "forms, documents and settings" while no page,
Settings included, used it.

## Decision

- **A form page's measure is a token, derived from its parts.** `form-width` is `calc(15rem + 2.5rem +
  var(--field-width) + 2 * var(--gutter))` — the head column, the column gap, a card at its cap, and the page's own
  gutter — and `field-width` (64rem, in rem so it grows with the reader's text size) is the card's cap. The card's
  measure is unchanged from before; only its name is new. *Why:* the number was a literal in a component and a
  paragraph in a token file, which is how the two came to disagree in the first place.
- **A page names one width, and a form page names this one.** `PageFrame` gains `width="form"`; `data` stays the
  default and the right answer for an analytical page, where a wider screen should show more. *Why:* the strip was
  not caused by a page being narrow; it was caused by nobody having decided.
- **It fills the canvas until the canvas is wider than a form needs, then centres.** Below about 1470px of window
  nothing changes at all; above it the remainder splits evenly instead of collecting at one side. *Why:* a form's
  parts have a maximum useful width, and centring is what makes the rest read as a margin rather than as a mistake.
- **`reading-width` says what it is.** One long document, 832px, centred. It never described forms, and nothing
  used it.
- **The Atlas names every width role in one place.** A seventh token view, **Layout**, draws them to scale
  (`rail-width`, `assistant-width`, `data-width`, `stage-width`, `reading-width`, `field-width`, `form-width`,
  `gutter`), so the question this record answers has one place to be looked up.

**Rejected.** Making the card fill the canvas: it would have made Settings "full width" and every field 1500px
wide, which is the outcome `64rem` exists to prevent. Filling the freed space with a sticky section index on the
page's left edge: it is a genuine option — the Atlas's own articles carry such an index — but it adds an element
nobody asked for and a scroll-spy to keep it honest, and it changes the page more than the defect warranted. It
stays available: the measure and the token do not depend on which of the two a product chooses.

## Consequences

- A form page's title sits on the canvas's centre axis rather than its left edge above ~1470px, so it no longer
  lines up with an analytical page's title on a very wide screen. That is the cost of the choice, and it is why
  it is written down.
- `LoadingPage` takes the same `width`, and a page's `loading.tsx` passes it: a skeleton at another width moves the
  content when the page arrives.
- `FormSection`'s card is capped at `var(--field-width)`; a form page's band is sized so the card reaches that cap
  exactly, at any root size and gutter.
- The field measure still holds: a field is never wider than 64rem, on any window.

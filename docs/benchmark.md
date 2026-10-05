# Benchmark

Meridian held to the bar of award-winning sites (Awwwards, Webby, FWA) and of the systems it learned from, criterion by criterion: what we did, the evidence, and what is still open. Measured on 2026-10-03 with `node scripts/audit.ts` (every page and embed view at 2560, 1440, 1024, 768 and 390px, both themes) and `node scripts/contrast.ts` (every pair in every theme and accent).

## Scorecard

| Criterion | Verdict | Evidence |
|---|---|---|
| Typography | Strong | One family (Geist) with a mono for kickers and identifiers; 52px page titles, 76px hero figures, 40px metric figures set at −0.035em with the unit and fraction stepped down to half size in `ink-3`. Eleven sizes in the scale; a page uses 5 to 8 of them; three weights everywhere on the product |
| Whitespace | Strong | A 4px scale; 20px between cards, 24–28px inside them; 32px between table columns with the card's padding on the outer edges; every console page on one left edge, forms included, with a reading width of 832px for long documents |
| Visual hierarchy | Strong | One protagonist per page. Hierarchy ratio (largest text over median) on analytical pages: Overview 6×, Health 6.5×, Requests 4.6×, Analytics 4.6×; standalone screens 7.2–7.8× |
| Colour | Strong | A night-sky neutral leaning indigo; one accent that is two numbers (hue, chroma), four presets; status trio reserved; six categorical chart slots validated for colour-vision deficiency (worst adjacent ΔE 10.2 light, 8.7 dark). 328 contrast pairs pass in every theme and accent |
| Motion | Good | Three jobs (arrive, answer, float), four durations, three curves; data arrives once (a line draws, an area reveals, bars grow); nothing loops but a live dot and a skeleton; reduced motion shows the final state at once |
| Micro-interaction | Good | The rail's pill springs between items; the Segmented thumb slides; a lit edge fades in under the pointer; an underline draws in on row links; the Meridian cursor answers pointer, touch and arrow keys with a readout on every chart and tile. Every control on every page is pressed by `scripts/interactions.ts`, with taps at 390px; none does nothing |
| Responsive | Strong | Zero sideways scroll, zero clipped text and no table wider than its card at 390–1440px on every page (the last was missed until 2026-10-03: see below); tables become card lists under 768px; phone tiles put the sparkline beside the figure; dialogs become bottom sheets |
| Originality | Strong | The Meridian (one time cursor shared by every chart, tile and the model); three surfaces including MCP Apps with a working host simulator; two operators with consent, provenance and handoff built into components |

## What changed because of the benchmark

- **The register** (decision 0002). The first render, a neutral light canvas with 28px titles and four equal tiles, was rejected as dated. Meridian adopted that register: dark first, a lit ground, a dramatic type scale, one featured card.
- **Quiet light** (decision 0006). Learning from that calm, the glow moved from the data to the frame: translucent surfaces, a lit edge and a faint halo on the featured card, a whisper of light under the line (14% on light, 24% on dark, set 2px below it), a primary action turning toward violet, one solid accent phrase per screen. The louder feature shadow, the solid accent borders and the grain were removed.
- **Tables.** The lead column no longer takes all the slack (about a third, the rest spread by content); columns sit 32px apart; a text column after a number gets 16px more; a fixed-width method chip lines up every route.
- **Performance found by the audit.** A repeated grain texture under translucent cards stalled rasterisation at device scale (a 2× capture timed out past 30 seconds; without it, under a second), and a blend mode on a full-screen layer left charts painted stale. Both are gone.
- **Motion, evaluated with motion on.** The light under the featured line now draws with the line instead of fading in ahead of it; line, light and area arrive together over 820ms (93% drawn by 250ms, settled by 550ms). The Atlas hero's cursor sweeps the month once and rests, instead of looping.
- **Transient screens held still.** The loading and error screens appear only while data is slow or failing, so they were never audited; `/system/states/loading` and `/system/states/error` render the real components in the real shell, and the audit checks them like any page.
- **Keyboard reading everywhere.** The heatmap and the uptime bars are one Tab stop each; the arrow keys move a cursor cell by cell or day by day with the same readout as the pointer, announced to screen readers.
- **Keyboard found by the audit.** The audit now presses Tab through every page. The trend chart's focus was a rectangle drawn inside the SVG, inconsistent with every other control; it now takes the system's 2px accent ring.
- **Accessibility found by the audit.** A heatmap's screen-reader table widened the page (a table ignores `width: 1px`); `table.sr-only` is now a block. The MCP host simulator answered too late for a fast frame; the bridge now retries its handshake.

- **A last look, by eye, at 1440 and 390px in both themes.** Three things the audit cannot see were fixed. A sparkline's troughs ran along the card's bottom edge and into its rounded corner; the lowest point now floats a quarter of the height above the floor while the area still fills to it. An incident title broke after the hyphen in "eu-west-1"; hyphenated identifiers in titles now hold together. The incident timeline set its times as spaced mono capitals ("3 6 M I N"); they are now captions with tabular figures. On phones, the uptime card's service grid cut "Inference API" short to make room for a latency figure; the grid now shows names only there, and latency stays in the service list just below.

- **Pressing everything, not only measuring it.** The owner found that the bell did nothing and the tab had no icon. A probe that pressed every control on every page (mouse at 1440px, taps at 390px) then found more that the audit could not see, because the audit measured pages and never used them: the workspace switcher, the alerts bell, every Export, Subscribe to updates, Invite customer and Continue with SSO did nothing; the tiles' info buttons opened only on hover, so a phone could never read them; two items in a request's menu only announced themselves in a toast. Each now does its job (a workspace menu, an alerts panel, a CSV download, a toggle, an invite sheet, an email-first SSO step, a tap-to-open explanation, a copied link). `scripts/interactions.ts` presses every control and follows every link on every page, and `pnpm verify` fails on any that does nothing.
- **Glass that was not glass.** Meridian resets Tailwind's blur scale and never defined its own, so every `backdrop-blur` rendered nothing: the stuck top bar, the rail and the shell tools were tinted, not frosted, and text showed through them. Blur is now a token (`blur-md` 12px, `blur-xl` 24px), and the gate fails a blur utility outside it.
- **Tables that clipped their last column.** Columns dropped by the window's width, which ignores the rail, so between 768 and 1440px the API keys table (and Customers and Requests at 1024 to 1280px) ran wider than its card and the card cut the actions off; on a phone the Analytics endpoints table cut off p95. Columns now drop by the table's own width (a container query), a lead column needs 160px on a narrow table, and the audit fails any table wider than its frame.
- **A tab icon.** `app/icon.ts` draws the App mark in the default accent, read from the tokens at build, so a new brand repaints it.

- **An independent critic, against the juries' criteria.** A reviewer that had not built Meridian rendered all 15 routes at 360, 768 and 1440px in both themes and scored them against the Awwwards, Webby, CSSDA and FWA criteria and the earlier system's eight craft criteria. Scores: typography 8, whitespace 6, hierarchy 8, colour 7, motion 7, micro-interaction 7, responsiveness 6, originality 7. It failed three criteria: colour keeps its job, one type scale, and motion and speed. Fixed from its list:
  - **Honesty:** uptime on a phone showed 30 bars beside the 90-day figure, so every day now shows. The trend's "Errors × 20" put a scaled number in a tooltip, so it is gone.
  - **Composition:**
    - the Atlas home's empty column and its raw changelog;
    - the Health hero's dead band;
    - the Request page's tabs around three lines of JSON (the payloads now sit side by side, and the ID and status are no longer repeated);
    - By region showing its data twice;
    - Overview tiles stacked at 768px;
    - a sign-in page with no proof (it now carries a live Meridian trend).
  - **Colour:** success rows are quiet and only 4xx, 5xx, past due and trial are coloured; the accent is off 35 "beta" marks and every customer sparkline; one freshness claim per view; one solid accent phrase instead of gradient text.
  - **Type:** headings descend one level at a time, and the audit fails a skip.
  - **Motion:** every press control animates its press. Motion literals are tokens, and the gate fails a literal duration in `base.css`/`motion.css` or a press transition without transform.
  - **Touch:** every control and box link answers 44px on a coarse pointer, phones are emulated as touch, and the audit fails a smaller target.
  - **Small things:** embed heads keep Freshness whole; hour ticks follow 00/06/12/18; an in-app link uses → and a link out uses ↗.

- **The critic's second round** scored typography 8.5, whitespace 7.5, hierarchy 8.5, colour 8.5, motion 7.5, micro-interaction 7.5, responsiveness 7.5 and originality 7.5. Seven of the eight craft criteria passed; motion and speed failed narrowly, on target sizes. Then fixed:
  - **Targets:** every small control and box link answers 24px under a mouse and 44px under a finger, and a press on a field's frame focuses the field.
  - **Request page:** the facts include tokens and cost (its description promised what it cost), and the two payload panels end level.
  - **Colour:** 3xx no longer wears the accent, and the latency line is neutral, not a one-off magenta.
  - **Shell tools** keep the canvas edge on narrow pages such as Settings.
  - **Sign-in:** the panel caps at 28rem on a tablet.
  - **Atlas home:** the headline's stray line at 360px is gone, and every in-app link uses the icon arrow.
  - **Motion:** a new period redraws the chart's lines from the left; the Meridian cursor glides from day to day on trends and sparklines.
  - **Segmented control:** its thumb re-measures when its options change size.
  - **API keys** ends on how to rotate a key.

- **The critic's final round** verified every item at 360, 768 and 1440px in both themes. It found one regression from the round before: 2xx in the Responses bar had taken the track colour, about 1.4:1. Now 2xx is `chart-neutral-strong` and 3xx is `ink-2`, both gated at 3:1 or more. Two nits were also fixed: the space before "Open ↗" in an embed, and the cursor line snapped to the pixel grid so it stays crisp while it glides. Final scores: typography 9, whitespace 8.5, hierarchy 9, colour 8 (before this fix), motion 8.5, micro-interaction 8.5, responsiveness 8.5, originality 8. All eight craft criteria pass once the 2xx contrast is fixed, and this commit fixes it.

- **Big screens.** The owner found that on a large monitor the dashboard was a 1560px strip with empty margins. No review had looked past 1440px. Dashboards now fill the canvas at every width (`data-width` is 100%; the gutter grows to 56px), standalone screens keep a `stage-width` of 1560px, and reading pages stay at 832px. The audit now runs at 2560px too, and fails a data page that does not fill its canvas.

## Open

Taste calls the critic raised that are not taken yet, kept in view on purpose:

- **True path morphing:** a new period redraws the line rather than morphing it. Periods have different numbers of points, so a shape tween would need resampling; a redraw is honest about the new data.
- **Sign-in proof on phones:** the live trend shows from 1024px. On a phone the form comes first, and a chart above it would push it below the fold.
- **"Know" alone on the first line at 360px:** balancing the display line wraps it as four lines that widen, like a poster. A greedy wrap would leave "your" alone instead.
- **768px splits:** Analytics keeps its half-width charts stacked at 768px, because a 350px chart reads worse than a full-width one. A container-based split from 700px is the alternative.

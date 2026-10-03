# Benchmark

Meridian held to the bar of award-winning sites (Awwwards, Webby, FWA) and of the systems it learned from (Zandro, crypto-zentry, the zz-stack console), criterion by criterion: what we did, the evidence, and what is still open. Measured on 2026-10-03 with `node scripts/audit.ts` (every page and embed view at 1440, 1024, 768 and 390px, both themes) and `node scripts/contrast.ts` (every pair in every theme and accent).

## Scorecard

| Criterion | Verdict | Evidence |
|---|---|---|
| Typography | Strong | One family (Geist) with a mono for kickers and identifiers; 52px page titles, 76px hero figures, 40px metric figures set at −0.035em with the unit and fraction stepped down to half size in `ink-3`. Eleven sizes in the scale; a page uses 5 to 8 of them; three weights everywhere on the product |
| Whitespace | Strong | A 4px scale; 20px between cards, 24–28px inside them; 32px between table columns with the card's padding on the outer edges; a reading width of 832px for forms |
| Visual hierarchy | Strong | One protagonist per page. Hierarchy ratio (largest text over median) on analytical pages: Overview 6×, Health 6.5×, Requests 4.6×, Analytics 4.6×; standalone screens 7.2–7.8× |
| Colour | Strong | A night-sky neutral leaning indigo; one accent that is two numbers (hue, chroma), four presets; status trio reserved; six categorical chart slots validated for colour-vision deficiency (worst adjacent ΔE 10.2 light, 8.7 dark). 328 contrast pairs pass in every theme and accent |
| Motion | Good | Three jobs (arrive, answer, float), four durations, three curves; data arrives once (a line draws, an area reveals, bars grow); nothing loops but a live dot and a skeleton; reduced motion shows the final state at once |
| Micro-interaction | Good | The rail's pill springs between items; the Segmented thumb slides; a lit edge fades in under the pointer; an underline draws in on row links; the Meridian cursor answers pointer, touch and arrow keys with a readout on every chart and tile |
| Responsive | Strong | Zero sideways scroll and zero clipped text at 390–1440px on every page; tables become card lists under 768px; phone tiles put the sparkline beside the figure; dialogs become bottom sheets |
| Originality | Strong | The Meridian (one time cursor shared by every chart, tile and the model); three surfaces including MCP Apps with a working host simulator; two operators with consent, provenance and handoff built into components |

## What changed because of the benchmark

- **The register** (decision 0002). The first render, a neutral light canvas with 28px titles and four equal tiles, was rejected as dated. Meridian adopted Zandro's register: dark first, a lit ground, a dramatic type scale, one featured card.
- **Quiet light** (decision 0006). Learning from crypto-zentry, the glow moved from the data to the frame: translucent surfaces, a lit edge and a faint halo on the featured card, a whisper of light under the line (14% on light, 24% on dark, set 2px below it), a primary action turning toward violet, gradient text on one phrase per screen. The louder feature shadow, the solid accent borders and the grain were removed.
- **Tables.** The lead column no longer takes all the slack (about a third, the rest spread by content); columns sit 32px apart; a text column after a number gets 16px more; a fixed-width method chip lines up every route.
- **Performance found by the audit.** A repeated grain texture under translucent cards stalled rasterisation at device scale (a 2× capture timed out past 30 seconds; without it, under a second), and a blend mode on a full-screen layer left charts painted stale. Both are gone.
- **Motion, evaluated with motion on.** The light under the featured line now draws with the line instead of fading in ahead of it; line, light and area arrive together over 820ms (93% drawn by 250ms, settled by 550ms). The Atlas hero's cursor sweeps the month once and rests, instead of looping.
- **Transient screens held still.** The loading and error screens appear only while data is slow or failing, so they were never audited; `/system/states/loading` and `/system/states/error` render the real components in the real shell, and the audit checks them like any page.
- **Keyboard reading everywhere.** The heatmap and the uptime bars are one Tab stop each; the arrow keys move a cursor cell by cell or day by day with the same readout as the pointer, announced to screen readers.
- **Keyboard found by the audit.** The audit now presses Tab through every page. The trend chart's focus was a rectangle drawn inside the SVG, inconsistent with every other control; it now takes the system's 2px accent ring.
- **Accessibility found by the audit.** A heatmap's screen-reader table widened the page (a table ignores `width: 1px`); `table.sr-only` is now a block. The MCP host simulator answered too late for a fast frame; the bridge now retries its handshake.

- **A last look, by eye, at 1440 and 390px in both themes.** Three things the audit cannot see were fixed. A sparkline's troughs ran along the card's bottom edge and into its rounded corner; the lowest point now floats a quarter of the height above the floor while the area still fills to it. An incident title broke after the hyphen in "eu-west-1"; hyphenated identifiers in titles now hold together. The incident timeline set its times as spaced mono capitals ("3 6 M I N"); they are now captions with tabular figures. On phones, the uptime card's service grid cut "Inference API" short to make room for a latency figure; the grid now shows names only there, and latency stays in the service list just below.

## Open

One limit of the measurement, kept in view on purpose:

- **Gradient text** is checked by the gate at its ends' lightness, not as rendered; the audit skips it by rule.

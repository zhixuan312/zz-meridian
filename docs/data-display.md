# Data display

How Meridian shows numbers: which form to use, how colour is assigned, how figures are set, and how a chart stays readable to everyone, including a screen reader and a model.

## Choose the form first

| The data's job | Form | Card |
|---|---|---|
| One number that matters most | A hero figure in the featured card | Featured metric |
| A number with its change and shape | A tile | Metric tile |
| Change over time | A line or an area on one axis | Trend chart |
| The shape of a trend beside a figure | A line without axes | Sparkline |
| A ranking | Horizontal bars, the longest first | Bar list |
| Parts of a whole | One stacked bar | Composition bar |
| Counts per category or per day | Columns | Column chart |
| Two dimensions of time (weekday by hour) | A grid of cells | Heatmap |
| A service's history | Day bars | Uptime bars |
| Many records | A table | Data table |

Sometimes the answer is not a chart: one number and a sentence beat a chart with one interesting point.

## Never two axes

Two measures of different size are two charts on one Meridian, not one chart with a second scale. A dashed comparison series is allowed only when it is the same unit, such as the previous period. Never scale one series to fit another ("Errors × 20"): the tooltip would print a number that is not true.

## Colour by job

- **Identity** (which series): the six categorical slots in their fixed order, `series-1` to `series-6`. Assign in order; never skip; a seventh series folds into Other. The order is validated for colour-vision deficiency in both themes (`node scripts/contrast.ts`).
- **The one that matters**: the accent, with every other mark in the neutral population (`chart-neutral`). One highlighted bar, one highlighted line.
- **Magnitude**: one hue, light to dark, built from the accent and the surface (the heatmap).
- **State**: positive, warning, critical, always with a word or an icon.

Text never wears a series colour; values and labels stay in ink.

## Marks

- Lines 2px with round joins; a dashed line 1.5px. The featured series carries a soft glow of its own colour on the dark ground.
- Bars and columns with 2px gaps and 4px rounded data ends, anchored to the baseline.
- Gridlines recessive (`chart-grid`), one baseline (`chart-axis`), axis labels at `text-2xs` in `ink-3`. Axis labels are a scale: `$12`, `1.2M`; the exact value is in the tooltip and the table.
- A legend is always present for two or more series; a single series is named by its title.

## Figures

- The figure is set tight (`tracking-display`); its unit steps down to half size in `ink-3`; money steps its cents down; compact counts keep their decimal (`2.9M`).
- Tabular figures where numbers stack or change in place (tables, axes, readouts); proportional for a standalone figure.
- A missing value is a dash, never zero. Every figure names its period and unit somewhere visible.
- A delta's arrow carries direction; its colour carries the judgement, which depends on the measure (latency down is good).

## Interaction

- Every time chart joins the page's Meridian: pointer, touch drag, arrow keys, Home, End, Escape. Every chart and tile reads the day.
- The tooltip shows the day and every series' value; it appears only on the chart being pointed at.
- Every chart renders a visually hidden table with the same numbers, so screen readers and models read the data, not the picture.

## Motion

Data arrives once: a line draws, an area reveals left to right, bars grow from the baseline in order. Nothing animates while someone is reading it. Under reduced motion, the final state is shown at once.

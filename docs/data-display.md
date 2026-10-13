# Data display

How Meridian shows numbers: which form to use, how colour is assigned, how figures are set, and how a chart stays readable to everyone, including a screen reader and a model.

## Choose the form first

| The data's job | Form | Card |
|---|---|---|
| One number that matters most | A hero figure in the featured card | Featured metric |
| Two numbers of equal standing that are never added together | Two hero figures, the halves of the one featured card, each with its own change and chart | Featured metric |
| A number with its change and shape | A tile | Metric tile |
| Change over time | A line or an area on one axis | Trend chart |
| The shape of a trend beside a figure | A line without axes | Sparkline |
| A ranking | Horizontal bars, the longest first | Bar list |
| Parts of a whole, at one moment | One stacked bar | Composition bar |
| Counts per category or per period | Columns | Column chart |
| Parts of a whole over periods, each period a total to read (weeks, months, a handful of days) | Stacked columns, each column a whole | Column chart |
| Parts of a whole over a long run of days, where the shape is the story | Stacked bands | Trend chart |
| Two dimensions of time (weekday by hour, or a year of days as week by weekday) | A grid of cells | Heatmap |
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
- **Parts of one whole**: one hue. The parts share the accent, mixed into the surface, deepest at the bottom and paler upward (the stacked Trend chart and the stacked Column chart take the same mix), with a 1px hairline of the card between neighbours and at most four parts, the fourth being Other. When the parts are outcomes they carry a tone instead: the usual outcome is neutral (`chart-neutral-strong`), one that needs somebody is warning or critical, the accent never stands beside a tone, and the positive colour is never the usual case.

Text never wears a series colour; values and labels stay in ink.

## Marks

- Lines 2px with round joins; a dashed line 1.5px. The featured series carries a soft glow of its own colour on the dark ground.
- Bars and columns with 2px gaps and 4px rounded data ends, anchored to the baseline.
- Gridlines recessive (`chart-grid`), one baseline (`chart-axis`), axis labels at `text-2xs` in `ink-3`. Axis labels are a scale: `$12`, `1.2M`; the exact value is in the tooltip and the table.
- A legend is always present for two or more series or parts; a single series is named by its title.
- A column's value stands above it at rest, in `ink-3`, while a column is at least 36px wide; narrower, it shows for the column pointed at. Stacked, the value is the column's total.

## A period still in progress

Today, or the month not over yet, is not a fact like the periods before it, and a part-day drawn solid reads as a fall. So it is drawn unfinished and it reads "so far":

- A Trend chart draws the stretch into its last point dashed, with nothing filled under it.
- A Column chart draws its last column at half strength under a dashed cap.
- A Heatmap's calendar draws the day's cell inside a dashed outline.

Each takes `running`, and each says "so far" wherever that period is read: the readout, the line a screen reader hears and the period's row of the hidden table.

## Figures

- The figure is set tight (`tracking-display`); its unit steps down to half size in `ink-3`; money steps its cents down; compact counts keep their decimal (`2.9M`).
- Tabular figures where numbers stack or change in place (tables, axes, readouts); proportional for a standalone figure.
- A missing value is a dash, never zero. Every figure names its period and unit somewhere visible.
- A delta's arrow carries direction; its colour carries the judgement, which depends on the measure (latency down is good).
- A change says what it is against, in words beside it: "vs previous period" unless the caller says otherwise ("vs the week before"). The Featured metric and the Metric tile take the words as `compare`.
- One fact the featured figure does not say goes on one line under its change, beside a neutral dot (`finding`). It is a fact counted by code, not a warning, so the dot is never a status colour there.
- A few figures that support the featured one go in its foot: a band inside the lit surface, a label over each figure, and one link. A figure that needs its own change or its own shape is a Metric tile, not a line of the foot.
- A page has one featured card. Two measures that are peers are its two halves (`peer`): one lit surface and a hairline between, side by side from 42rem of the card's own width (588px) and one above the other below that. Their sum is never drawn.

## Interaction

- Every time chart joins the page's Meridian: pointer, touch drag, arrow keys, Home, End, Escape. Every chart and tile reads the day.
- A point of the Meridian need not be a day. The Featured metric reads the pointed point only when its `points` holds one value for each of the Meridian's dates, the rule a chart joins by, and its pill names the point as the caller names points (`pointLabel`: "Week of 14 Sept"), or by its date.
- A chart read mark by mark is one Tab stop, and its keys move the cursor the pointer moves: a Trend chart's points, a Column chart's columns, a Heatmap's cells. Escape and blur let go.
- The tooltip shows the day and every series' value; it appears only on the chart being pointed at.
- Every chart renders a visually hidden table with the same numbers, so screen readers and models read the data, not the picture.

## Motion

Data arrives once: a line draws, an area reveals left to right, bars grow from the baseline in order. Nothing animates while someone is reading it. Under reduced motion, the final state is shown at once.

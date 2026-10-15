# Data display

How Meridian shows numbers: which form to use, how colour is assigned, how figures are set, and how a chart stays readable to everyone, including a screen reader and a model.

## Choose the form first

| The data's job | Form | Card |
|---|---|---|
| One number that matters most | A hero figure in the featured card | Featured metric |
| Two numbers of equal standing that are never added together | Two hero figures, the halves of the one featured card, each with its own change and chart | Featured metric |
| A number with its change and shape | A tile | Metric tile |
| The same number for many things at once (eight customers, six regions), each with its change and shape | A wall of compact tiles: the name, the change, one line and the shape | Metric tile |
| Change over time | A line or an area on one axis | Trend chart |
| The shape of a trend beside a figure | A line without axes | Sparkline |
| A ranking | Horizontal bars, the longest first | Bar list |
| Parts of a whole, at one moment | One stacked bar | Composition bar |
| Counts per category or per period | Columns | Column chart |
| Parts of a whole over periods, each period a total to read (weeks, months, a handful of days) | Stacked columns, each column a whole | Column chart |
| Parts of a whole over a long run of days, where the shape is the story | Stacked bands | Trend chart |
| Two dimensions of time (weekday by hour, or a year of days as week by weekday) | A grid of cells | Heatmap |
| A service's history | Day bars | Uptime bars |
| How long a service has been operational | One line under its day bars: its run | Status list |
| An incident, step by step | A timeline, newest first, each update timed from the incident's start | Incident card |
| Many records | A table | Data table |

Sometimes the answer is not a chart: one number and a sentence beat a chart with one interesting point.

## Never two axes

Two measures of different size are two charts on one Meridian, not one chart with a second scale. A dashed comparison series is allowed only when it is the same unit, such as the previous period. Never scale one series to fit another ("Errors × 20"): the tooltip would print a number that is not true.

## Colour by job

- **Identity** (which series): the six categorical slots in their fixed order, `series-1` to `series-6`. Assign in order; never skip; a seventh series folds into Other. The order is validated for colour-vision deficiency in both themes (`node scripts/contrast.ts`).
- **The one that matters**: the accent, with every other mark in the neutral population (`chart-neutral`). One highlighted bar, one highlighted line.
- **Magnitude**: one hue, light to dark, built from the accent and the surface (the heatmap).
- **Magnitude by rank**: a Heatmap's step is a cell's share of the largest cell (`max`) unless one outlier would leave every other cell at the lowest step. Then it is ranked (`scale="quantile"`): the cells above zero take five steps of equal count. A step no longer says how much, so the legend's upper end reads the value the top step starts at ("900 or more") in place of "More", and the readout and the hidden table give each cell's exact value.
- **State**: positive, warning, critical, always with a word or an icon.
- **Parts of one whole**: one hue. The parts share the accent, mixed into the surface, deepest at the bottom and paler upward (the stacked Trend chart and the stacked Column chart take the same mix), with a 1px hairline of the card between neighbours and at most four parts, the fourth being Other. When the parts are outcomes they carry a tone instead: the usual outcome is neutral (`chart-neutral-strong`), one that needs somebody is warning or critical, the accent never stands beside a tone, and the positive colour is never the usual case.

Text never wears a series colour; values and labels stay in ink.

## Marks

- Lines 2px with round joins (a Sparkline's 1.5px); a dashed line 1.5px. The featured series carries a soft glow of its own colour on the dark ground.
- Columns with 2px gaps and 4px rounded data ends, anchored to the baseline; a Bar list's bar is a rounded track. A chart is never wider than its card: a Column chart with more columns than room closes the gap, to 1px and then to none, before it would outgrow it.
- A label inside a plot stands where no series is drawn. A Trend chart sets its baseline's label beside the dashed line at whichever end is clear, and draws no label when neither is.
- Gridlines recessive (`chart-grid`), one baseline (`chart-axis`), axis labels at `text-2xs` in `ink-3`. Axis labels are a scale: `$12`, `1.2M`; the exact value is in the tooltip and the table.
- A legend is always present for two or more series or parts; a single series is named by its title.
- A column's value stands above it at rest, in `ink-3`, while a column is at least 36px wide; narrower, it shows for the column pointed at. Stacked, the value is the column's total.

## A period still in progress

Today, or the month not over yet, is not a fact like the periods before it, and a part-day drawn solid reads as a fall. So it is drawn unfinished and it reads "so far":

- A Trend chart draws the stretch into its last point dashed, with nothing filled under it.
- A Column chart draws its last column's fill at half strength inside a dashed outline, open at the baseline.
- A Heatmap's calendar draws the day's cell inside a dashed outline.

Each takes `running`, and each says "so far" wherever that period is read: the readout, the period's row of the hidden table and, on a Column chart and a Heatmap, the line a screen reader hears.

A page whose chart draws the day in progress gives its Meridian that day as the last of its dates, so the chart joins the page's cursor. The Featured metric holding that chart takes the day's value as its last point and names it "so far" in its pill (`pointLabel`). A tile whose points are the complete days has one fewer than the Meridian's dates, so it keeps its period's figure and never reads a part-day as a whole one (Home does this).

A period still in progress is counted in no total, change or finding. A figure for a period covers complete periods and names them, and the read hands the one in progress over on its own for a chart to draw: `readDays` in `src/data/metrics.ts` returns a period's complete days, counted back from yesterday, and the day in progress beside them.

## Figures

- The figure is set tight (the hero figure at `tracking-display`, a card's figure at -0.03em); its unit steps down to half size in `ink-3`; money steps its cents down; compact counts keep their decimal (`2.9M`).
- Tabular figures where numbers stack or change in place (tables, axes, readouts, and a tile's or the Featured metric's figure, which changes as the Meridian moves); proportional for a standalone figure that stays put.
- A missing value is a dash, never zero. Every figure names its period and unit somewhere visible.
- A delta's arrow carries direction; its colour carries the judgement, which depends on the measure (latency down is good).
- A change says what it is against, in words beside it: "vs previous period" unless the caller says otherwise ("vs the week before"). The Featured metric and the Metric tile take the words as `compare`. On a wall of compact tiles the card that holds the wall says it once, and a tile draws the change's figure alone.
- One fact the featured figure does not say goes on one line under its change, beside a neutral dot (`finding`). It is a fact counted by code, not a warning, so the dot is never a status colour there.
- A Metric tile's finding names its tone, and there is no default. A fact ("The busiest day was 1 Oct, with 128K") stands beside the neutral dot; a finding that needs a look ("2.7× usual on 21 and 22 Sept") stands beside the warning dot. The code that counts a finding knows which it is and says so. A fact is never made a warning to draw the eye, and the dot is never the only sign: the words say what was found.
- A few figures that support the featured one go in its foot: a band inside the lit surface, a label over each figure, and one link. A figure that needs its own change or its own shape is a Metric tile, not a line of the foot.
- A page has one featured card. Two measures that are peers are its two halves (`peer`): one lit surface and a hairline between, side by side from 42rem of the card's own width (588px) and one above the other below that. Their sum is never drawn.
- A page that leads with figures leads with its Featured metric, first after the head: Home and Revenue with the period's revenue, Usage with the period's requests, Now with the days inside the band and Services with the uptime of its 90 days. It is the page's protagonist: the page marks it `data-protagonist` with that name, on a wrapper whose display is contents so a row's grid is unchanged (as the wide card of a `2/3` row, Home's and Revenue's, on a wrapper that is itself that grid item, its card stretched to fill it), and it carries an Ask whose question names what it counts. Where its hero rounds a figure to fit ("$3.3M"), its caption states the figure in full. No text inside it repeats the title of another part of its page.

## Facts

A fact is one thing the product's own records show, found by a rule and written as one line: the highest period yet, the first day a threshold was passed, every customer of a plan doing the same thing, a total with its first day and its latest, how long a service has run without a mark, how many days were inside the band. A page states a fact in its title, beside a figure and in its shared context, and it is the same line wherever it is said.

- A rule is a pure function in `src/lib/facts.ts`. It takes numbers, dates and labels and returns its fact, with the one line it wrote, or nothing when the rule does not hold. Nothing weaker stands in for a fact that stopped holding: a record that ended leaves the page.
- Every rule has a guard, and what the guard asks for is the product's to set, in `facts` in `src/app.config.ts`. A rule holds no figure of its own: the page that calls it passes the configuration.

| Rule | States | Its guard |
|---|---|---|
| `record` | The latest period is higher than every one before it, and how many periods in a row were each a record: "The highest 30 days of revenue yet: $3,300,438.74, the 3rd record in a row". Given the `day` its latest value is about, it names it: "The highest day of requests yet: 44,940,181, on 01 Oct 2026" (Home's busiest day yet is this rule over the days up to the busiest) | The period and the periods before it number at least `recordNeedsPeriods`, each a whole period of the same length counted back from yesterday. A period that only equals the highest is no record |
| `first` | The first day a threshold was passed, and how many days have passed it since: "Requests first passed 25.0M in a day on 02 Jan 2026; 192 days have passed it since" | The largest threshold of `firsts` some day is above, and only when the earliest day kept is below it: a threshold already passed when the records begin has no first day the product can know |
| `all` | Every member of a set did the same thing, written N of N: "24 of 24 Enterprise customers sent more requests in the last 7 days than in the 7 before" | One member short and it is no fact. Tried on the whole set first, then on each named subset in the order given (the sample: each plan, the one that brings the most revenue first) |
| `total` | The sum of everything recorded, from its first day to its latest: "9,600,136,928 requests answered in 360 days, from 08 Oct 2025 to 02 Oct 2026". Given a `share`, a part of each day's figure, it adds the part's share of the sum: ", 99.62% of them without an error" | Every digit, wherever the page has room for them |
| `run` | How long a state has held, up to today: "Dashboard has run 69 days without a mark, its longest in 90" | "Its longest" only when no run among the days kept is longer; a run that reaches the earliest day kept reads "at least N days" and is never the longest; nothing when today is not the good state. Worked out by `runOf`, which the Status list draws from the same days (see "Time in an incident, and a run of days") |
| `steady` | How many complete days were inside the band, and the days outside it by date: "357 of 360 days inside the band of p95 under 350 ms and errors under 1%; outside it on 17 Aug 2026, 21 Sept 2026 and 22 Sept 2026" | The band is `band`: a day is inside when its p95 is under `p95Under` and its errors over its requests under `errorRateUnder`, and a day at an edge is outside. Complete days only. The first three days outside are named, then "and N more" |

- The figure is what is said. No line of a rule and no title holds a word of praise; the rules' test refuses twelve: `great`, `excellent`, `amazing`, `impressive`, `outstanding`, `congratulations`, `well done`, `good job`, `healthy`, `strong`, `solid` and `nice`.
- A fact is about a figure the product records, over complete days: the day in progress is in no fact, as it is in no total.
- What is wrong today is said beside a fact, at the same size. A title carries it as its second clause ("…, and Inference API is degraded"); where a title has no clause for it, as a record's has none, the one sentence under the title says it.

## A title that states the figures

A page that leads with figures is headed by what they say: "The highest 30 days yet: $3,300,438.74, the 3rd record in a row", not "Home". A list, a form and Settings keep a name.

- A title is one sentence, worked out by a function beside the page's view from plain figures, with a branch for each thing it may say and a test for every branch. It reads a rule's result, not its line: the fact says "The highest 30 days of revenue yet", the title of a page about revenue says "The highest 30 days yet".
- It names its period in words ("30 days") and writes money in full, a count at a glance (`1.1B`) and a change as a percentage with one decimal and no sign: "up 5.3%", "23.6% more". A change that rounds to 0.0% reads "level with". A period with no period before it, or one whose figure was zero, is compared with nothing: the title states the figure alone.
- It has no full stop, as a name has none, and it is balanced over its lines.
- The page's name stays in the heading, read out and not drawn, and is what the top bar shows. The Shell holds the sentence's block while the sentence arrives, so nothing under it moves (`src/components/base/shell/README.md`, "The title").
- A page that cannot work its title out, because the history a record needs could not be read, is headed by its name. A page whose title leaves out a clause it could not read states the rest: Now says what the services are doing when the releases cannot be read, and Services its uptime alone when the days cannot be. The context says what was not read.

## A wall of many

The same figure for many things, each with its own change and shape, is a wall of compact Metric tiles (`size="compact"`), not a page of full ones.

- A compact tile is four parts: the name, the change's figure, one line that is the figure and then a word or two that sort it ("$41.2K · Scale"), and the Sparkline. It has no figure at the figure size, no hint, no icon and no finding, whatever it is passed. A finding about the wall belongs to the card that holds it.
- Use it from about six of a kind, where each has a shape worth seeing. Under that, default tiles say more. When only the order matters, a Bar list is the form; when a reader will sort and search, a table.
- A wall is two tiles to a row on a phone and four on a desk, so eight are two rows. A compact tile is never mixed with default tiles in one row.
- The change stands where the eye compares it down the wall: at the right of the name's row from 14rem of the tile's own width (196px); in a row of its own under the name on a narrower tile.
- The card that holds the wall says what the figure is, over which days, and what the change is against. The tiles do not repeat a definition.

## Time in an incident, and a run of days

- An incident's updates are timed from the incident's start, not from now: "at the start", "after 42m", "after 1.1h", in the product's durations. A reader of a timeline asks how long each step took, and that reading does not move as the clock does. An update inside the first minute reads "at the start". Only the head says when the incident started against now, and each update keeps its exact time in its title.
- An incident names who has it and where the work is tracked, on one caption line under its head: the owner as text, the ticket as a link named by the ticket's title. Either stands alone, and with neither there is no line. Neither is passed to a card customers read.
- A service's run is the operational days in a row that end today, counted from the same days its strip draws: "Operational for 40 days". The Status list draws it with `run`, on a line of its own under the bars.
- A run is "its longest in 90" only when no run among the days kept is longer. One that reaches the earliest day kept is "at least 90 days" and is never called the longest, because what came before is not known.
- A service that is not operational today has no run: it reads "Degraded today" or "Down today".
- A run is a count of whole days, said as a figure and set in ink in every state. It is never a sentence of praise.

## Interaction

- A time chart joins the page's Meridian (the Trend chart; the Column chart given a date a column; the Heatmap's calendar given `meridian`): pointer, touch drag, arrow keys, Home, End, Escape. Uptime bars keep a cursor of their own. A chart that joins reads the day, and so does every tile whose points are the page's.
- A point of the Meridian need not be a day. The Featured metric reads the pointed point only when its `points` holds one value for each of the Meridian's dates, the rule a chart joins by, and its pill names the point as the caller names points (`pointLabel`: "Week of 14 Sept"), or by its date.
- A Metric tile and a Sparkline follow the same rule. A tile reads the pointed point and names its date, and a Sparkline marks it, only when it has one value for each of the Meridian's dates. The cursor is a position in the page's list of dates, so a series of any other length would read a different day: a tile of a customer's 14 days on a page of 30 keeps its period's figure and its change, and its Sparkline draws no cursor.
- A compact tile's line never reads the cursor, whatever its points: a wall keeps the figures a reader is comparing. Its Sparkline follows the Sparkline's rule.
- A chart read mark by mark is one Tab stop, and its keys move the cursor the pointer moves: a Trend chart's points, a Column chart's columns, a Heatmap's cells. Escape and blur let go.
- A ranked list's rows link when each names a record that has a page, as a customer does. The row's label is the one link, named by the label; the bar and the figure are not a second way to the same page, and the folded "N others" row opens nothing. A row whose name has no page, a region or an endpoint in the sample, is text, and so is every row of its list. At rest a linked row looks as any row does: the label takes the accent under the pointer and the focus ring on the keyboard, and answers a 44px target on a phone.
- The tooltip shows the day and every series' value; it appears only on the chart being pointed at.
- The Trend chart, the Column chart and the Heatmap render a visually hidden table with the same numbers, so screen readers and models read the data, not the picture; the other charts carry their numbers as text (a Sparkline beside its figure carries none).

## Motion

Data arrives once: a line draws, an area reveals left to right, bars grow from the baseline in order. Nothing animates while someone is reading it. Under reduced motion, the final state is shown at once.

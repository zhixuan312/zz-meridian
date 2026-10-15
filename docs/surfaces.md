# Surfaces and inventory

A dashboard built on Meridian is read in three places. This guide says what each place is, how every card in the system behaves in each, and which card owns the difference, so a page is designed once and holds in all three.

## The three surfaces

| Surface | Where | Width | What frames it | Navigation |
|---|---|---|---|---|
| **Console** | A browser window, 1024px and wider | 1024 to 2560px | The frame, the rail and the rounded canvas | The rail, always visible; the command palette |
| **Mobile** | A phone or a narrow window, under 1024px | 360 to 1023px | The canvas fills the screen, no frame | A drawer opened from the masthead; the command palette |
| **Embed** | An MCP App: a `ui://` resource a host (an AI chat client) renders in a sandboxed frame beside a tool result | Whatever the host gives: usually 360 to 760px inline, the whole panel in fullscreen | The host's own surface; Meridian draws no frame, rail or masthead | None. One view per tool; "Open in ZZ Meridian" leaves for the console |

The surface is a fact about the container, not the device: a console on a 900px window is the mobile surface, and an embed in fullscreen on a 1440px display is still an embed.

### Console

The default. The rail sits on the `frame`; each page is a `PageFrame` on the canvas: the masthead (title, one-sentence head-note, freshness, actions) above the one scroll region. The title is the page's name, or, on a page that leads with figures, a sentence that states them, with the name kept in the heading (`docs/data-display.md`, "A title that states the figures"). Rows of cards follow the four splits. A page names its own width: `data` fills the canvas (an analytical page), `form` is a form page's measure, which fills the canvas until the canvas is wider than a form needs and then centres, and `reading` is one long document. Settings is the page that takes `form`.

### Mobile

Below 1024px the rail becomes a drawer (the same node, so nothing is defined twice), the canvas loses its inset and rounding, and every split stacks to one column. Specific changes, owned by the cards named:

| What | Console | Mobile | Owner |
|---|---|---|---|
| Navigation | Rail | Drawer from the masthead's menu button; closes on Escape, on the scrim and on navigation | AppShell |
| Masthead | Title, head-note, actions on one band. A title that is a sentence has a row to itself, two lines on a desk, with the head-note and the actions on the band under it | Title row with the menu button; head-note under it; actions wrap to their own row, the primary last. A title that is a sentence holds three lines at 390px and four on a narrower phone | PageFrame |
| Metric tiles | As many across as the row holds: four, three or two | Counted from the row's own width, never leaving a hole: four are four, two or one (two from 34rem, four from 62rem), three are three or one (three from 48rem), two are two from 34rem | Row `tiles` |
| A wall of compact tiles | Four across, so eight are two rows; each tile has its change at the right of the name's row. The card that holds the wall says what the change is against | Two to a row; each tile is three rows: the name, the change, the line | Metric tile, which reads its own width (14rem); the page lays out the wall |
| Tables | Columns, sortable heads | A list of cards, one per row: the primary column as the title, two or three facts under it, the status at the end; low-value columns drop first (`hideBelow`). Both read the table's own width, so a table in a narrow frame on a wide screen becomes cards too | DataTable |
| Dialogs | Centred, 520px | A bottom sheet, full width, safe-area padding | Dialog |
| Menus and selects | Popover | Popover, at least 44px rows on touch | Menu, Select |
| Charts | Full height, 6 to 8 date labels | The height the page gives it, 3 to 4 date labels; the Meridian follows the finger and the tooltip pins to the top edge | TrendChart |
| Toolbar | Search, filters and view controls in one row | Search full width; filters behind one Filters button that opens a sheet | FilterBar |
| Touch targets | 38px default control | Every control at least 44px tall where it is the main interaction (`control-lg`) | Button, Field |

### Embed (MCP Apps)

An MCP App is a tool's own interface: the host calls a tool, the tool's result names a `ui://` resource, and the host renders that HTML in a sandboxed iframe in the conversation. The host tells the app its theme, its display mode (`inline`, `fullscreen` or `pip`), its container size (often a `maxHeight` in inline), its safe-area insets, its platform, and a set of standard style variables (`--color-background-primary`, `--color-text-primary`, `--font-sans`, `--border-radius-md` and so on). The app reports its own height (`ui/notifications/size-changed`), may ask to change display mode, call tools, and open links; the host has the last word on all of it. (Specification: modelcontextprotocol/ext-apps, 2026-01-26.)

Meridian's rules for the embed surface:

1. **Look like a guest.** The background is transparent; the host's ground shows through. Text and lines take the host's colours through the token bridge below; the accent stays the product's, because it is how a reader recognises whose card this is. Type follows the host's `--font-sans` when given.
2. **One view, one job.** An embed answers the question the tool was called for: one metric with its trend, one chart, one short list, one record. It never has a rail, a masthead or a page of rows.
3. **Fit inline.** Inline views fit the host's `maxHeight` (design for 480px): at most one figure row and one chart, or a list of five. Anything longer offers **Expand**, which asks for `fullscreen`; if the host refuses, it opens the console in a new tab (`ui/open-link`).
4. **Fullscreen is the console without the shell.** The same `Stack` and `Row`s as the page, under an `EmbedFrame` head (title, freshness, Open in ZZ Meridian), and no rail.
5. **Report height, never scroll inline.** The view measures its body and sends `size-changed`; an inline embed has no scrollbar of its own.
6. **Respect the safe area.** Padding adds `safeAreaInsets` on mobile hosts.
7. **Say when the host refuses.** A refused context is tried once more, and Ask then carries the view's address; a refused question is told to the person with its words, so nothing pressed is silently lost.
8. **Act through the host.** A button in an embed calls a tool or sends a message; it never navigates the frame. A destructive action is never a bare button: it is a Proposal marked critical, and it runs only when the person approves.

The token bridge, applied by `EmbedSurface` on every embed route (`app/embed/layout.tsx`, `data-surface="embed"`), maps the host's variables onto Meridian's roles and falls back to Meridian's own value when the host sends nothing:

| Meridian role | Host variable |
|---|---|
| `ground` | transparent |
| `surface` | `--color-background-primary` |
| `surface-raised` | `--color-background-primary` |
| `surface-sunk` | `--color-background-secondary` |
| `ink` | `--color-text-primary` |
| `ink-2` | `--color-text-secondary` |
| `ink-3` | `--color-text-tertiary` |
| `line` | `--color-border-primary` |
| `line-strong` | `--color-border-secondary` |
| `font-sans` | `--font-sans` |
| `radius-md` | `--border-radius-md` |
| `radius-lg` | `--border-radius-lg` |

What does not bridge: the accent, the status colours and the chart slots (they carry meaning, and the host has no equivalent), and figures (always Meridian's semi-condensed setting, so a number reads the same in the console and in a chat).

## Two operators: people and agents

A dashboard used to have one operator: a person pointing, tapping and typing. A Meridian dashboard has two. The second is an agent, an AI assistant that reads the dashboard and acts on it through tools. It works in two places: from a chat where the dashboard appears as an MCP App, and in the console's own assistant panel (`docs/assistant.md`). The agent does not get a different interface. It gets the same views, with five rules that make them safe and useful to share:

| Rule | What it means | Where it lives |
|---|---|---|
| **Addressable** | Every view's state is in its address: the period, filters, the selected record, the sort, the page. An agent opens exactly the view it means by calling a tool with those arguments; a person shares a link that opens the same view. | Query parameters on console routes; the same names as tool arguments on embed routes |
| **Legible** | Every embed view tells the model what is on screen, as labelled lines and as structured facts, and tells it again when that changes (a filter, the period, the day the Meridian points at). "Why did this spike?" then has a referent. | `useShareView` (`ui/update-model-context`) |
| **Consent** | An agent may read anything the person may read. It changes nothing without a person: every write it wants arrives as a Proposal (what changes, before and after, why, what else it touches) with Approve and Dismiss. A removal is proposed like any other change, marked critical, and runs only when approved. | Proposal |
| **Provenance** | Whatever an agent did stays marked: an activity line names the agent and the person it acted for ("Claude raised the rate limit · for Jonas Weber"); a filter or a view an agent set says so until a person changes it. | Agent mark, Activity feed, Filter bar |
| **Handoff** | A person can hand any card to the agent in one press: Ask posts a question about exactly what the card shows into the conversation. It appears only where an agent is listening, so the console never shows a dead control. | Ask about |

These rules cost the console almost nothing (addressable state is good practice anyway; provenance helps every team), so a page built once serves both operators on every surface.

### What an agent sees and does, per surface

| | Console | Mobile | Embed inline | Embed fullscreen |
|---|---|---|---|---|
| Reads | The assistant panel reads the view's shared context, the page and the product's data; Activity shows its audit | Same | The view's shared context | The view's shared context, the same one |
| Asks (person to agent) | The assistant panel (a third column from 1024px), and Ask on cards | The assistant panel as a sheet, and Ask on cards | Ask on cards | Ask on cards |
| Proposes (agent to person) | A Proposal in the assistant's thread | Same | One Proposal card per tool result | Same as inline |
| Marks | Agent mark and "via" | Same | Same | Same |

## Inventory

What exists, by layer, and how it changes per surface. "Same" means the card needs no surface rule of its own because the layer beneath it adapts.

### Layer 1 · Base

| Card | Job | Mobile | Embed |
|---|---|---|---|
| Planes | Frame, canvas and surface: three planes of depth instead of borders | Frame hidden; canvas full-bleed | Frame and canvas transparent |
| Text roles | Display, page, section and card titles; figure; lead, body, small, caption, eyebrow, mono | Page title steps down to 36px by clamp; display steps down by clamp | Same; host font when given |
| Shell | AppShell, PageFrame, Stack, Row, the three page widths | Drawer, stacked rows | Replaced by EmbedFrame |
| Icons | Lucide at 1.75 stroke: 14, 16 and 18px | Same | Same |
| Motion | Arrive, answer, float; reduced motion collapses all | Same | Arrive only on first render, so a re-render in the thread never replays |
| App mark | The product mark at 20, 24, 28 and 32px | Same | 20px in the embed head |
| Surface | Where a view is being read, the console or an MCP host, and what it may ask of that host: the bridge, the host's theme and style variables, and the one shared context both agents are told | The console, with no host: `expand` opens the console page | Started by EmbedFrame on every route under `app/embed/` |

### Layer 2 · Components

| Group | Cards |
|---|---|
| Actions | Button, Icon button, Menu |
| Input | Field, Input, Textarea, Select, Checkbox, Radio group, Switch, Segmented, Search input |
| Display | Card, Badge, Status dot, Delta, Avatar, Agent mark, Tooltip, Progress, Key value, Copy field, Kbd, Popover |
| Navigation | Tabs, Breadcrumb, Pagination |
| Feedback | Banner, Toast, Dialog, Sheet, Empty state, Skeleton, Spinner |
| Data | Table |

All components are surface-agnostic by construction: they size from control tokens and take their colours from roles, so the console, the phone and the host all restyle them through tokens alone. The three with a surface rule are Dialog (bottom sheet under 640px), Table (card list, through DataTable) and Tabs (scroll-snap strip on phones, never wrapping to a second line).

### Layer 3 · Patterns

| Pattern | Job | Console | Mobile | Embed |
|---|---|---|---|---|
| Rail | Navigation, workspace, account, appearance | Fixed on the frame | In the drawer | None |
| Shell tools | Search and commands (⌘K) and alerts, in the top bar of every console page | The top bar, one press away while the page scrolls | In the top bar, the same | None |
| Assistant | The panel beside the page where a person asks about what they are looking at | A third column at `assistant-width` 400px from 1024px, a sheet over the page under it | The panel as a sheet | None: the host has its own conversation, and Ask posts into it |
| Command palette | Every destination and global action behind ⌘K | Centred, 600px | Centred, the screen's width less 24px | None |
| Appearance menu | Theme, accent, density | In the rail's foot | In the drawer's foot | None: the host decides the theme |
| Period select | The reporting period, in the URL or held by the page | Masthead actions | Masthead actions row | None: the period is the tool's argument, named in the embed's title |
| Freshness | When the data last arrived; stale after a contract | Masthead meta | With the actions, under the head-note | Embed head |
| Featured metric | The page's one leading figure with its chart, first after the head on Home, Revenue, Usage, Now and Services; or two figures of equal standing as the halves of the one card | The wide cell of the first row beside its tiles (Home, Revenue), or the whole first row (Usage, Now, Services); two figures side by side, from 42rem of the card's own width | Full width; two figures in one column, the first figure first | Inline and fullscreen; the inline Home leads with it, its three tiles under it |
| Metric tile | One number, its change, its shape, and one finding beside a neutral dot (a fact) or the warning dot (it needs a look). Compact, one of a wall of many: the name, the change, one line and the shape | Four across; a wall of compact tiles four across | Two or one across; compact tiles two to a row | One to three across; the inline view's figure row |
| Meridian | One time cursor for every chart on a page, and for every tile and Sparkline with one value for each of its dates | Pointer and arrow keys | Finger: press and drag | Same, inside the view |
| Trend chart | A time series on one axis; or parts of one whole, stacked | 248px tall, or `fill`, its card's height (220px at least) | The height the page gives it | `fill`, inside the Featured metric, inline and fullscreen |
| Column chart | Counts side by side, one column a category or a period; or each column a whole split into its parts | 200px tall, or its card's height; a value above each column while a column is 36px or wider | Date labels thin and category labels cut shorter; under 36px a column, a value shows for the column pointed at, and a stacked chart's readout pins to the leading edge | Same as mobile inline; the console's in fullscreen |
| Sparkline | Shape beside a figure; it marks the pointed day only when its values are the page's | Same | Same | Same |
| Bar list | A ranked list with bars | Same | Same | Top five, then Expand |
| Composition bar | One whole split into parts | Legend four across from 36rem of the bar's own width, two under it | Legend two across | Same as mobile |
| Heatmap | Weekday by hour, or a year of days | 24 columns of hours; a calendar's column is a week | Hours grouped in threes (8 columns); a calendar shows the latest weeks that fit at 12px a cell | Fullscreen only |
| Uptime bars | A service's state, a bar a day | Every day it is given | Every day it is given, the gaps tighter | Same as mobile |
| Filter bar | Search, filters and view controls for one list | One row | Search, then a Filters sheet | Search only |
| Data table | A list of records: sort, select, page, empty and loading states | Columns | Card list | Five rows, Expand |
| Page loading | The masthead and body shapes a route shows while its page streams in | The page's own width | Same | None |
| Activity feed | What happened, who did it, when | Timeline | Same | Five events |
| Status list | Services and their state; with `run`, how long each has been operational and whether that is its longest | Rows with uptime bars; a run on a line under the bars | Rows, bars under, a run under them | Same as mobile |
| Incident card | An incident: what is affected, its state, its owner and its ticket, and every update timed from the incident's start | The card on Now and for each open incident on Services; a row for each resolved incident under them on Services | The card takes the full width under the services; the owner and the ticket wrap | Fullscreen only; an inline view reduces a live incident to a Banner |
| Detail head | A record's identity, state and actions | Masthead | Masthead, actions in a menu | Embed head |
| Form section | A titled group of settings with its own save | Two columns: description, fields | One column | Not offered |
| Embed frame | The head and token bridge of an MCP App view | Not used | Not used | Always |
| Ask about | Hands a card to the agent as a question | On each page's protagonist (its Featured metric, its list or its record's card), when the assistant is on: opens the panel | Same, the panel as a sheet | On cards, when a host is connected |
| Proposal | An agent's write, waiting for a person's Approve | In the assistant's thread | Same | The tool result's card |
| Prose | Markdown a person or a model wrote, rendered safely | Reading width, `base` | One column; tables wrap | `sm`, host font |
| Export button | The rows behind a view as a CSV, with the period and filters already applied, so the file matches the screen | A masthead action, after the period select; the browser reports the download when it has an `href` | Same | None: the console's export is the page's |

### Layer 4 · Pages

| Page | Preset | Console | Mobile | Embed view |
|---|---|---|---|---|
| Home | Dashboard: the company's nine parts | Revenue featured metric with trend 2/3 + three tiles 1/3 · two or four tiles · the year (columns and trend) · A year, counted · revenue a period 1/2 + what we sell 1/2 · Business 1/2 + Engineering 1/2 · worth knowing | One column, the revenue card first, every row of tiles one column | `home` inline: the revenue card and its three tiles; fullscreen: the page |
| Requests | List: three tiles, filter bar, data table, detail on select | Tiles over the table | Tiles in one column, card list | `requests` inline: the five latest that match the tool's query |
| Request | Detail: head, facts, timeline | Facts 2/3 + context 1/3 | One column | Not offered; the inline list links here |
| Revenue | The Business home: what customers paid, by plan and by customer | Revenue featured metric with trend 2/3 + three tiles 1/3 · revenue a day by plan 2/3 + who pays 1/3 · revenue a period by plan · every customer, the last 14 days · from a trial to Enterprise · worth a look · what they buy 1/2 + where they are 1/2 | One column, the revenue card first, the tiles one column, the wall two across | Not offered |
| Usage | Requests over a period, the period counted, then the last 30 days by when, where, what and how | Requests featured metric with trend full · a year of requests, a day a cell, full · The period, counted 1/3 + When they come 2/3 · Where from 1/2 + What is asked for 1/2 · How it was answered full | One column, the requests card first; the calendar's latest weeks; the hours grouped | Not offered |
| Now | The Engineering home: what is up and open, how steady it has been, what ships and what changed | Days inside the band featured metric with trend full · services, now 2/3 + open incident 1/3 · N of M days inside the band full · models, now 2/3 + compute in use 1/3 · shipping 1/2 + work 1/2 · slowest endpoints full · four tiles · runs a day 2/3 + changes 1/3 | One column, the days inside the band first, then the services, the tiles one column, each table a list | `now` inline: the incident banner and the status list; fullscreen: the page's body |
| Services | Uptime over 90 days, each service over 90 days and every incident | Uptime featured metric with trend full · each service, 90 days 2/3 + incidents 1/3 (the open ones first in their cards, then the resolved as rows) | One column, the uptime card first, then the services | Not offered; the embed of the present is Now's |
| Customers | List with sparklines | Three tiles · table | Tiles in one column, then a card list | Not offered |
| Customer | Detail: head, where it stands, three tiles, what it asks for, its latest requests | Where it stands · three tiles · what it asks for 1/3 + its latest requests 2/3 | One column | Not offered |
| API keys | List with destructive actions | Table | Card list | Not offered |
| Members | List with destructive actions | Table | Card list | Not offered |
| Tickets | List: summary tiles, filter bar, data table, a create dialog and a row menu to move a ticket | Tiles over the table; New ticket in the masthead | Tiles in one column, card list | Not offered |
| Tests | List: summary tiles, filter bar, data table; read-only | Tiles over the table; a run links to its release and its requests | Tiles in one column, card list | Not offered |
| Releases | List: summary tiles, filter bar, data table; read-only | Tiles over the table; a release links to its runs | Tiles in one column, card list | Not offered |
| Settings | Reader: form sections | `form` width, centred on a wide canvas | One column | Not offered |
| Sign in, Not found, Error | Standalone: one sentence at poster size | Centred | Same | Not offered |
| Agent proposal | Showcase: a Proposal end to end | The embed view itself | One column | `proposal`: one Proposal card with its states and Approve (no Expand — the card is the whole view) |
| Records | Template: optional summary tiles over a data table with its filter bar. Members, Customers, Requests, API keys, Tickets, Tests and Releases are arranged by it | Tiles in one row over the table | Tiles in one column, table as a card list | Not offered |

### Layer 5 · Product workspaces

Not a component: a product's own grouping of its pages. The sample declares three workspaces, Main, Business and Engineering, in `src/app.config.ts`, and each of its fifteen destinations belongs to one. The address decides which workspace a page is in, and a workspace decides only which destinations the rail and the command palette list; access stays with each page. `docs/product-workspaces.md` is its guide: the workspaces and their audiences, where each destination lives, how a page finds its workspace, who can do what, tasks to try, how a product makes its own, and what the sample does not do.

| Surface | What a workspace changes |
|---|---|
| Console | The rail and the command palette list the destinations of the workspace in view; the rail's menu switches between workspaces |
| Mobile | The drawer is the same rail, so it lists the same destinations |
| Embed | Nothing: an embed view has no rail |

## Adding to the inventory

A new card passes two questions first: **useful** (a page needs it now, named) and **unique** (nothing here does the job; look one layer down first). It then states its behaviour on all three surfaces, or says "same" and why.

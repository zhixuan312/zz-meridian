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

The default. The rail sits on the `frame`; each page is a `PageFrame` on the canvas: the masthead (title, one-sentence head-note, freshness, actions) above the one scroll region. Rows of cards follow the four splits.

### Mobile

Below 1024px the rail becomes a drawer (the same node, so nothing is defined twice), the canvas loses its inset and rounding, and every split stacks to one column. Specific changes, owned by the cards named:

| What | Console | Mobile | Owner |
|---|---|---|---|
| Navigation | Rail | Drawer from the masthead's menu button; closes on Escape, on the scrim and on navigation | AppShell |
| Masthead | Title, head-note, actions on one band | Title row with the menu button; head-note under it; actions wrap to their own row, the primary last | PageFrame |
| Metric tiles | Four across | Two across from 34rem of row width, one below | Row `tiles` |
| Tables | Columns, sortable heads | A list of cards, one per row: the primary column as the title, two or three facts under it, the status at the end; low-value columns drop first (`hideBelow`). Both read the table's own width, so a table in a narrow frame on a wide screen becomes cards too | DataTable |
| Dialogs | Centred, 520px | A bottom sheet, full width, safe-area padding | Dialog |
| Menus and selects | Popover | Popover, at least 44px rows on touch | Menu, Select |
| Charts | Full height, 6 to 8 date labels | Shorter (180px), 3 to 4 date labels; the Meridian follows the finger and the tooltip pins to the top edge | TrendChart |
| Toolbar | Search, filters and view controls in one row | Search full width; filters behind one Filters button that opens a sheet | FilterBar |
| Touch targets | 38px default control | Every control at least 44px tall where it is the main interaction (`control-lg`) | Button, Field |

### Embed (MCP Apps)

An MCP App is a tool's own interface: the host calls a tool, the tool's result names a `ui://` resource, and the host renders that HTML in a sandboxed iframe in the conversation. The host tells the app its theme, its display mode (`inline`, `fullscreen` or `pip`), its container size (often a `maxHeight` in inline), its safe-area insets, its platform, and a set of standard style variables (`--color-background-primary`, `--color-text-primary`, `--font-sans`, `--border-radius-md` and so on). The app reports its own height (`ui/notifications/size-changed`), may ask to change display mode, call tools, and open links; the host has the last word on all of it. (Specification: modelcontextprotocol/ext-apps, 2026-01-26.)

Meridian's rules for the embed surface:

1. **Look like a guest.** The background is transparent; the host's ground shows through. Text and lines take the host's colours through the token bridge below; the accent stays the product's, because it is how a reader recognises whose card this is. Type follows the host's `--font-sans` when given.
2. **One view, one job.** An embed answers the question the tool was called for: one metric with its trend, one chart, one short list, one record. It never has a rail, a masthead or a page of rows.
3. **Fit inline.** Inline views fit the host's `maxHeight` (design for 480px): at most one figure row and one chart, or a list of five. Anything longer offers **Expand**, which asks for `fullscreen`; if the host refuses, it opens the console in a new tab (`ui/open-link`).
4. **Fullscreen is the console without the shell.** The same `Stack` and `Row`s as the page, under an `EmbedFrame` head (title, freshness, Open in ZZ Meridian), with tabs instead of the rail.
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
| **Legible** | Every embed view tells the model what is on screen, as a sentence and as structured facts, and tells it again when that changes (a filter, the period, the day the Meridian points at). "Why did this spike?" then has a referent. | `useShareView` (`ui/update-model-context`) |
| **Consent** | An agent may read anything the person may read. It changes nothing without a person: every write it wants arrives as a Proposal (what changes, before and after, why, what else it touches) with Approve and Dismiss. A removal is proposed like any other change, marked critical, and runs only when approved. | Proposal |
| **Provenance** | Whatever an agent did stays marked: an activity line names the agent and the person it acted for ("Claude raised the rate limit · for Jonas Weber"); a filter or a view an agent set says so until a person changes it. | Agent mark, Activity feed, Filter bar |
| **Handoff** | A person can hand any card to the agent in one press: Ask posts a question about exactly what the card shows into the conversation. It appears only where an agent is listening, so the console never shows a dead control. | Ask about |

These rules cost the console almost nothing (addressable state is good practice anyway; provenance helps every team), so a page built once serves both operators on every surface.

### What an agent sees and does, per surface

| | Console | Mobile | Embed inline | Embed fullscreen |
|---|---|---|---|---|
| Reads | The assistant panel reads the view's shared context, the page and the product's data; Activity shows its audit | Same | The view's shared context | The view's shared context, the same one |
| Asks (person to agent) | The assistant panel (a third column from 1024px), and Ask on cards | The assistant panel as a sheet, and Ask on cards | Ask on cards | Ask on cards |
| Proposes (agent to person) | A Proposal in the assistant's thread; the inbox in Activity | Same | One Proposal card per tool result | Proposals in the page |
| Marks | Agent mark and "via" | Same | Same | Same |

## Inventory

What exists, by layer, and how it changes per surface. "Same" means the card needs no surface rule of its own because the layer beneath it adapts.

### Layer 1 · Base

| Card | Job | Mobile | Embed |
|---|---|---|---|
| Planes | Frame, canvas and surface: three planes of depth instead of borders | Frame hidden; canvas full-bleed | Frame and canvas transparent |
| Text roles | Display, page, section and card titles; figure; lead, body, small, caption, eyebrow, mono | Page title 28px holds; display steps down by clamp | Same; host font when given |
| Shell | AppShell, PageFrame, Stack, Row, the two widths | Drawer, stacked rows | Replaced by EmbedFrame |
| Icons | Lucide at 1.75 stroke: 14, 16 and 18px | Same | Same |
| Motion | Arrive, answer, float; reduced motion collapses all | Same | Arrive only on first render, so a re-render in the thread never replays |
| App mark | The product mark at 20, 24 and 32px | Same | 20px in the embed head |

### Layer 2 · Components

| Group | Cards |
|---|---|
| Actions | Button, Icon button, Menu |
| Input | Field, Input, Textarea, Select, Checkbox, Radio group, Switch, Segmented, Search input |
| Display | Card, Badge, Status dot, Delta, Avatar, Tooltip, Progress, Key value, Copy field, Kbd |
| Navigation | Tabs, Breadcrumb, Pagination |
| Feedback | Banner, Toast, Dialog, Sheet, Empty state, Skeleton, Spinner |
| Data | Table |

All components are surface-agnostic by construction: they size from control tokens and take their colours from roles, so the console, the phone and the host all restyle them through tokens alone. The three with a surface rule are Dialog (bottom sheet under 640px), Table (card list, through DataTable) and Tabs (scroll-snap strip on phones, never wrapping to a second line).

### Layer 3 · Patterns

| Pattern | Job | Console | Mobile | Embed |
|---|---|---|---|---|
| Rail | Navigation, workspace, account, appearance | Fixed on the frame | In the drawer | None |
| Command palette | Every destination and global action behind ⌘K | Centred, 600px | Full width, top | None |
| Appearance menu | Theme, accent, density | In the rail's foot | In the drawer's foot | None: the host decides the theme |
| Period select | The reporting period, in the URL or held by the page | Masthead actions | Masthead actions row | Embed head, compact |
| Freshness | When the data last arrived; stale after a contract | Masthead meta | Under the title | Embed head |
| Metric tile | One number, its change, its shape | Four across | Two or one across | One to three across; the inline view's figure row |
| Meridian | One time cursor for every chart and tile on a page | Pointer and arrow keys | Finger: press and drag | Same, inside the view |
| Trend chart | A time series on one axis; or parts of one whole, stacked | 248px tall | 180px | 160px inline, 248px fullscreen |
| Sparkline | Shape beside a figure | Same | Same | Same |
| Bar list | A ranked list with bars | Same | Same | Top five, then Expand |
| Composition bar | One whole split into parts | Legend four across | Legend two across | Same as mobile |
| Heatmap | Weekday by hour | 24 columns | Hours grouped in threes (8 columns) | Fullscreen only |
| Uptime bars | 90 days of a service's state | 90 bars | 30 bars, the last month | 30 bars |
| Filter bar | Search, filters and view controls for one list | One row | Search, then a Filters sheet | Search only |
| Data table | A list of records: sort, select, page, empty and loading states | Columns | Card list | Five rows, Expand |
| Activity feed | What happened, who did it, when | Timeline | Same | Five events |
| Status list | Services and their state | Rows with uptime bars | Rows, bars under | Same as mobile |
| Detail head | A record's identity, state and actions | Masthead | Masthead, actions in a menu | Embed head |
| Form section | A titled group of settings with its own save | Two columns: description, fields | One column | Not offered |
| Embed frame | The head and token bridge of an MCP App view | Not used | Not used | Always |
| Ask about | Hands a card to the agent as a question | On the featured card, when the assistant is on: opens the panel | Same, the panel as a sheet | On cards, when a host is connected |
| Proposal | An agent's write, waiting for a person's Approve | Inbox in Activity | Same | The tool result's card |
| Prose | Markdown a person or a model wrote, rendered safely | Reading width, `base` | One column; tables wrap | `sm`, host font |

### Layer 4 · Pages

| Page | Preset | Console | Mobile | Embed view |
|---|---|---|---|---|
| Overview | Dashboard: tiles, a trend, breakdowns | Tiles · trend 2/3 + ranked list 1/3 · composition 1/2 + activity 1/2 | One column | `overview` inline: three tiles and the trend; fullscreen: the page |
| Requests | List: filter bar, data table, detail on select | Table | Card list | `requests` inline: the five latest that match the tool's query |
| Request | Detail: head, facts, timeline | Facts 2/3 + context 1/3 | One column | Not offered; the inline list links here |
| Analytics | Two-chart: heatmap, breakdowns | Heatmap full width · 1/2 breakdowns | Grouped heatmap | Fullscreen only |
| Health | Operational: status list, incidents | Status 2/3 + incident 1/3 | One column | `health` inline: the status list |
| Customers | List with sparklines | Table | Card list | Not offered |
| API keys | List with destructive actions | Table | Card list | Not offered |
| Members | List with destructive actions | Table | Card list | Not offered |
| Settings | Reader: form sections | 832px column | One column | Not offered |
| Sign in, Not found, Error | Standalone: one sentence at poster size | Centred | Same | Not offered |
| Agent proposal | Showcase: a Proposal end to end | The embed view itself | One column | `proposal`: one Proposal card with its states and Approve (no Expand — the card is the whole view) |

## Adding to the inventory

A new card passes two questions first: **useful** (a page needs it now, named) and **unique** (nothing here does the job; look one layer down first). It then states its behaviour on all three surfaces, or says "same" and why.

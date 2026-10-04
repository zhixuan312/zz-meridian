# Data table

A list of records in one card: a toolbar, the table, and pagination, with its loading, empty and error states built in. On phones the same rows become a list of cards, so nothing ever scrolls sideways.

Status: beta

## Anatomy

1. **Card**: `surface`, `line` hairline, `radius-lg` 16px, `shadow-card`; the table runs edge to edge inside it.
2. **Title** (optional): `title`, `description` and `actions` as a Card header, when the table is one card among others on a page; a hairline under it when no toolbar follows.
3. **Toolbar** (optional): a band above the table, `card-pad` horizontal and 14px vertical padding, a `line` divider under it from 768px. It holds a Filter bar.
4. **Header row**: Table header cells, `surface-sunk`, 36px, `text-xs` 500 `ink-3`. A sortable head is a button with the sort arrow in `accent-ink`.
5. **Rows**: `row-height` 52px (38px compact), a `line` divider between rows. The title column (`mobile: 'title'`, or the first) is a `.row-link` when the row opens a record.
6. **Selection column** (optional): 40px with a Checkbox; the head's checkbox selects the page and shows indeterminate when part of it is chosen.
7. **Footer**: Pagination, under a `line` divider, shown only when the rows do not fit on one page.
8. **Phone list**: under 768px, one card per row: the title and the status on one line, two or three facts under it in `text-xs` `ink-3`, separated by dots.

## Variants

| Variant | Use |
|---|---|
| Plain | A short list with no record pages: API keys |
| Linked (`rowHref`) | Each row opens a record: Requests, Customers |
| Selectable | Rows can be acted on together (export, revoke many) |
| Addressable | Sort and page in the URL, through `useTableQuery` or the page's own `useQueryState` |
| Manual | The server has already sorted and paged the rows; pass `total` |

## Sizes

Row height and card padding come from the density: comfortable 52px and 24px, compact 38px and 16px. The table never sets its own width; the grow column (`grow`) takes what remains and its cells truncate with a `title`, every other column keeps its content width. A column whose content is short and fixed (an ID, a key, a date) can take `width` (`w-28`), so a two-column table does not hand the short column most of the row.

## States

| State | What shows |
|---|---|
| Rest | Rows; numeric columns right-aligned in tabular figures |
| Hover (a linked row) | Row fill `fill-hover` over `dur-hover`; the title's underline draws in |
| Selected | Row fill `accent-tint`; the checkbox in `accent` |
| Focus | The link or the checkbox shows the 2px `accent` ring |
| Loading | `aria-busy`; up to eight skeleton rows shaped like real ones (a wide bar in the grow column, short bars elsewhere, right-aligned bars in numeric columns); five skeleton cards on phones |
| Empty, first run | Empty state `first-run`: what is missing and the one action that fills it |
| Empty, filtered out | Empty state `filtered`: "No requests match these filters" with Clear filters |
| Error | Empty state `error`: "The requests did not load", the reason in one sentence, Retry |

Arrival: rows rise with the page (`arrive`); under reduced motion they are simply there.

## Behaviour

- Pressing a sortable head sorts by it: text ascending first, numbers descending first; pressing again reverses. Sorting returns to page 1.
- A click anywhere on a linked row opens it, except on a link, a button, a checkbox or a menu, and except when text is being selected.
- Rows per page: 20, 50 or 100; changing it returns to page 1.
- Addressable state: `useTableQuery({ sort, dir })` keeps `?sort=latency&dir=desc&page=2` in the address. When the page also keeps filters in the URL, hold everything in one `useQueryState`: two setters called in one handler would each write over the other.

## Surfaces

- **Console**: as specified; low-value columns drop with `hideBelow` as the window narrows.
- **Mobile**: under 768px the phone list replaces the table. Facts that need their header to make sense use `mobileCell` ("Used 1 min ago", not "1 min ago").
- **Embed**: inline views show at most five rows as a compact list and offer Expand; fullscreen shows the full table.

## Agents

An agent reads the rows through the view's shared context (`useShareView`: the count, the filters and the visible IDs), never by scraping the table. It changes the view only through the addressable state (sort, page, filters); it never selects rows or runs a bulk action. A bulk action it wants is a Proposal.

## Composition

Card, then the Filter bar in the toolbar, then Table (head, body, cells), Checkbox, Pagination and Empty state. The table's first and last cells pad to `card-pad`, so the columns align with the toolbar and the footer.

## Data

Rows arrive whole for client-side sorting and paging (a few hundred at most), or sorted and paged by the server with `manual` and `total`. Every value goes through the formatters in `src/lib/format.ts`; a missing value renders as an em dash, never as zero.

## Accessibility

- A real `<table>` with a caption; sortable heads carry `aria-sort`; the phone list is a labelled `<ul>`.
- Selection checkboxes are named ("Select req_jqwm3le188pi", "Select every request on this page").
- `aria-busy` while loading; the error state is announced (`role="alert"`).

## Content

- The noun is plural and plain: "requests", "keys". It names the range ("1–20 of 240 requests") and the empty states.
- Column heads are one or two words, sentence case: "Latency", "Last used".

## Do and do not

- Do give exactly one column `grow`: the record's name.
- Do drop columns with `hideBelow` rather than letting the table scroll sideways.
- Do not put more than one action per row; a row with several actions opens a record that has them.
- Do not show pagination for a list that fits on one page.

## Implementation

```tsx
import { DataTable, type Column } from '@/components/patterns/data-table';

const columns: Column<RequestRow>[] = [
  { key: 'request', header: 'Request', grow: true, truncate: true, mobile: 'title', cell: (r) => r.route, sortValue: (r) => r.route },
  { key: 'status', header: 'Status', mobile: 'status', cell: (r) => <StatusBadge status={r.status} /> },
  { key: 'latency', header: 'Latency', numeric: true, mobile: 'fact', cell: (r) => formatDuration(r.latency), sortValue: (r) => r.latency },
  { key: 'region', header: 'Region', hideBelow: 'lg', cell: (r) => r.region },
];

<DataTable caption="Requests" noun="requests" rows={rows} columns={columns} rowKey={(r) => r.id} rowHref={(r) => `/requests/${r.id}`} toolbar={<FilterBar … />} />
```

Exports: `DataTable`, `Column`, `TableState`, `useTableQuery`, `useQueryState`, `sortRows`.

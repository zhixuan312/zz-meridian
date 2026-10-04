# Table

A table compares rows of records across a few columns. It fills its card edge to edge and never scrolls sideways: when it is too wide, the least important columns drop.

Status: beta

## Anatomy

The names follow the HTML elements: `TableHead` is the `thead`, `TableHeader` is a `th`. Kits such as shadcn use the reverse (`TableHeader` for the `thead`, `TableHead` for a cell), so check them when porting a table.

1. **Head band**: `surface-sunk`, a `line` rule above and below, 36px tall; head text `text-xs` medium `ink-3`, sentence case.
2. **Sort control** (optional, per column): the head text as a button with a 12px arrow; the arrow shows on hover, and stays in `accent-ink` on the sorted column.
3. **Row**: height `row-height` (48px, 36 compact); a `line` rule under each but the last.
4. **Cell**: `text-sm`; 12px horizontal padding, the card padding on the first and last column, so text aligns with the card's head.
5. **Numeric cell**: right-aligned, tabular figures.

## Variants

| Variant | Use |
|---|---|
| Static | A short, fixed list inside a card |
| Interactive rows | Each row opens a record: pointer cursor, hover fill |
| Selectable | Rows carry a checkbox; selected rows take `accent-tint` |

## Sizes

Column widths follow content. One column, the record's name, is `grow` on its head: it takes the remaining width, and its cells `truncate` (the full text in their title or the opened record). Other text columns stay on one line. The `grow` column is at least 160px, 256px once the table is 672px wide. `hideBelow` drops a column when the table itself is narrower than `sm` 512, `md` 672, `lg` 896 or `xl` 1152px, on its head and its cells alike.

## States

| State | Row |
|---|---|
| Rest | transparent |
| Hover (interactive) | `fill-hover` over `dur-hover` |
| Selected | `accent-tint`, `aria-selected` |
| Focus | 2px `accent` outline on the focused control in the row |
| Archived | text `ink-3`: quieter than a live row and still read at 4.5:1, since an archived record is content, not an inactive control |
| Disabled (a row that cannot be chosen) | `aria-disabled="true"` on the row, text `ink-disabled`; only an inactive control may drop below 4.5:1 |
| Loading | Skeleton rows of the same height (DataTable) |
| Empty | An Empty state in place of the body (DataTable) |

## Behaviour

- Sorting toggles descending, then ascending; `aria-sort` says the current order. One sorted column at a time.
- The head can stick to the top of the page's scroll region (`sticky`); the table's own container clips without becoming a scroller, so sticking still works.

## Surfaces

- **Console**: columns.
- **Mobile**: drop columns with `hideBelow`; a DataTable becomes a list of cards under 640px.
- `hideBelow` reads the table's own width (a container query), not the window's, because the rail and split rows narrow a table without narrowing the window: `sm` drops a column under 512px, `md` under 672px, `lg` under 896px, `xl` under 1152px. A table never clips: if the columns still do not fit, hide one more; the audit fails a table wider than its frame.
- **Embed**: five rows, then Expand.

## Agents

An agent reads the same rows through the view's tool. A row an agent changed carries the Agent mark in its status cell until a person has seen it.

## Accessibility

- A real `table` with `caption` (visually hidden), `th scope="col"` and `aria-sort` on sortable heads.
- Head `ink-3` on `surface-sunk` 4.9:1; cells `ink` on `surface` 18.5:1 (light, cobalt).

## Content

- Head labels are nouns, sentence case, and name the unit when it is not in the cells: "Latency (ms)" or cells "612 ms".
- A missing value is an em dash, never 0.

## Do and do not

- Do right-align every numeric column, and its head.
- Do not make the table scroll sideways; drop columns.
- Do not colour whole rows by status; mark the status cell.

## Implementation

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

<Table caption="Recent requests">
  <TableHead><tr><TableHeader grow>Request</TableHeader><TableHeader hideBelow="md">Customer</TableHeader><TableHeader align="right" sort="desc" onSort={toggle}>Latency</TableHeader></tr></TableHead>
  <TableBody>
    <TableRow interactive><TableCell truncate>/v1/messages</TableCell><TableCell hideBelow="md" muted>Parallax AI</TableCell><TableCell numeric>612 ms</TableCell></TableRow>
  </TableBody>
</Table>
```

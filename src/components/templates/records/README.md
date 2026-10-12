# Records

The arrangement of a page that lists records: an optional row of summary tiles over a table with its toolbar.

Status: draft

## Anatomy

1. **Root**: one `Stack`, marked `data-template="records"`.
2. **Summary row** (optional, `summary`): a `Row split="tiles"` whose direct children are the items of `summary`; two to four tiles, columns chosen by their count.
3. **Records** (`children`): a Data table with its Filter bar as `toolbar`.

## Composition

Stack gap between the summary row and the records, from `--stack-gap`. The template draws no card of its own: the tiles and the table are the cards. It imports no data, view, system or config module and keeps no state; the page owns the rows, the filters and the address.

## States

Each state is covered by a named specimen in the preview, inapplicable with the reason, or not covered yet with the reason. The ones not covered yet are what keeps the template at `draft`.

| State | Disposition |
|---|---|
| Normal | Covered: "With a summary" and "Without a summary". |
| Loading | Not covered yet: the table has a loading state, but no specimen shows it inside this arrangement. |
| Empty | Covered: the "Empty" specimen. |
| Filtered-empty | Covered: the "Filtered-empty" specimen. |
| Error | Not covered yet: the table has an error state with Retry; no specimen shows it here. |
| Partial | Not covered yet: no specimen shows tiles that failed while the table loaded. |
| Read-only | Not covered yet: no specimen shows the arrangement without its create action for a reader who may not write. |

## Surfaces

- **Console**: tiles in one row from the width their count needs, over the table.
- **Mobile**: tiles stack in one column; the table keeps its own phone layout.
- **Embed**: not applicable until a page uses it in an embed.

## Agents

Not applicable: the template presents what its children show. Agent marks and proposals belong to the tiles and the table inside it.

## Accessibility

- The template adds no landmark or role; the table is named by its caption and each tile by its label.
- Reading order is the visual order: summary, then records.

## Implementation

```tsx
<Records summary={[<MetricTile key="a" label="Customers" value={42} />, <MetricTile key="b" label="Spend" value={1200} format="cost" />]}>
  <DataTable caption="Customers" noun="customers" rows={rows} columns={columns} rowKey={(r) => r.id} toolbar={<FilterBar … />} />
</Records>
```

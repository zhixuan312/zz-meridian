'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type Breakpoint, type SortDirection } from '@/components/ui/table';
import { useQueryState } from './use-query-state';

export { useQueryState } from './use-query-state';

export type Column<R> = {
  key: string;
  header: ReactNode;
  cell: (row: R) => ReactNode;
  /** Makes the column sortable: the value rows are ordered by. */
  sortValue?: (row: R) => number | string;
  align?: 'left' | 'right' | 'center';
  numeric?: boolean;
  muted?: boolean;
  truncate?: boolean;
  /** Drop the column below this width (the least important columns go first). */
  hideBelow?: Breakpoint;
  /** The one column that takes the remaining width: the record's name. */
  grow?: boolean;
  /** A width class for a column whose content is short and fixed (an ID, a key, a date), so the spare width goes to the others: `w-28`. */
  width?: string;
  /**
   * Its place in the card a row becomes on phones: the `title` (one column, the record's name), a `status` at the end
   * of the title line, a `fact` in the line under it (two or three at most), or `hidden`. Unset means hidden.
   */
  mobile?: 'title' | 'status' | 'fact' | 'hidden';
  /** The cell as a phone card shows it, when the column's header is not there to explain it: "Used 1 min ago". */
  mobileCell?: (row: R) => ReactNode;
};

/** Sort and page, as strings so they can live in the address. `dir` is `asc` or `desc`; `page` is one-based. */
export type TableState = { sort: string; dir: string; page: string };

/**
 * The phone presentation of a row, per column role.
 *
 * Below 768px the table's rows lay out as cards — the SAME cells, placed here, rather than a second copy of every
 * record. The component used to render the table and a `<ul>` of the same rows and let CSS hide one: both trees were
 * built on every render and both reached the DOM at every viewport, so every cell ran twice and each device downloaded
 * a tree it could never show.
 *
 * `check` is the select-all column; `title`, `status` and `fact` are the roles a column declares (`Column.mobile`) and
 * anything else is hidden on a phone. Six columns hold the card: the title and its status on the first line, the facts
 * on the second, two columns each so three of them fit exactly.
 */
type Mobile = 'check' | 'title' | 'status' | 'fact' | 'hidden';

/** What a row becomes below 768px: a six-column grid, a card's padding, a hairline between cards. */
const PHONE_ROW = 'max-md:grid max-md:grid-cols-6 max-md:items-center max-md:gap-x-3 max-md:gap-y-1 max-md:px-(--card-pad) max-md:py-3.5 max-md:[&>td]:border-0 max-md:border-b max-md:border-line max-md:last:border-b-0';

/** The resets a cell needs once the row is a grid: not a row height, not a padding box, free to shrink and to clip. */
const PHONE_CELL = 'max-md:!h-auto max-md:!max-w-none max-md:!p-0 max-md:min-w-0';

/** Where a role sits in the card, and how it reads there.
 *
 * `!block` is load-bearing: `hideBelow` drops a column when the TABLE is narrow, and on a phone the table is always
 * narrow — but a card has room for three small facts, so a column the table dropped for width comes back here. The
 * card's own rule is the role, not the width. */
const PHONE_ROLE: Record<Mobile, string> = {
  check: 'max-md:!block max-md:col-span-1 max-md:row-start-1',
  title: 'max-md:!block max-md:row-start-1 max-md:font-medium',
  status: 'max-md:!block max-md:row-start-1 max-md:justify-self-end',
  fact: 'max-md:!block max-md:row-start-2 max-md:col-span-2 max-md:text-xs max-md:text-ink-3',
  hidden: 'max-md:hidden',
};

/** The table's sort and page, kept in the URL: `?sort=latency&dir=desc&page=2`. Wrap the page in <Suspense>. */
export function useTableQuery(defaults: Partial<TableState> = {}) {
  return useQueryState<TableState>({ sort: '', dir: 'desc', page: '1', ...defaults });
}

/** Sort rows by a column's value. Stable; nulls last. */
export function sortRows<R>(rows: R[], columns: Column<R>[], sort: string, dir: string) {
  const col = columns.find((c) => c.key === sort);
  if (!col?.sortValue) return rows;
  const v = col.sortValue;
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((r, i) => ({ r, i, k: v(r) }))
    .sort((a, b) => (a.k === b.k ? a.i - b.i : a.k > b.k ? sign : -sign))
    .map((x) => x.r);
}

export function DataTable<R>({
  rows,
  columns,
  rowKey,
  rowHref,
  caption,
  noun = 'rows',
  title,
  description,
  actions,
  toolbar,
  state: controlled,
  onStateChange,
  pageSize: initialSize = 20,
  pageSizes = [20, 50, 100],
  manual,
  total: manualTotal,
  loading,
  error,
  onRetry,
  filtered,
  onClearFilters,
  empty,
  selectable,
  selected,
  onSelectedChange,
  className,
}: {
  rows: R[];
  columns: Column<R>[];
  rowKey: (row: R) => string;
  /** Each row opens a record: the title column becomes a link and the whole row takes the pointer. */
  rowHref?: (row: R) => string;
  /** For screen readers: what the table lists. */
  caption: string;
  /** What a row is, for the range line and the empty states: "requests". */
  noun?: string;
  /** The card's heading, when the table is one card among others on a page: "Claims", "Members". */
  title?: ReactNode;
  /** One line under the title: what the rows are, or how they are ordered. */
  description?: ReactNode;
  /** Beside the title: a link to the full view, an export. */
  actions?: ReactNode;
  /** A band above the table, inside the card: a Filter bar. */
  toolbar?: ReactNode;
  /** Sort and page from outside (the URL, with useTableQuery); otherwise the table keeps its own. */
  state?: TableState;
  onStateChange?: (patch: Partial<TableState>) => void;
  pageSize?: number;
  pageSizes?: number[];
  /** Rows arrive already sorted and paged by the server; pass `total`. */
  manual?: boolean;
  total?: number;
  loading?: boolean;
  /** What went wrong, in one sentence. Shows the error state with Retry. */
  error?: ReactNode;
  onRetry?: () => void;
  /** The rows are empty because of filters: the empty state offers Clear filters, not Create. */
  filtered?: boolean;
  onClearFilters?: () => void;
  /** The first-run empty state: what is missing and the one action that fills it. */
  empty?: { title: ReactNode; body?: ReactNode; action?: ReactNode };
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  className?: string;
}) {
  const router = useRouter();
  const [own, setOwn] = useState<TableState>({ sort: '', dir: 'desc', page: '1' });
  const [size, setSize] = useState(initialSize);
  const st = controlled ?? own;
  const set = (p: Partial<TableState>) => (onStateChange ? onStateChange(p) : setOwn((s) => ({ ...s, ...p })));

  const sorted = useMemo(() => (manual ? rows : sortRows(rows, columns, st.sort, st.dir)), [rows, columns, st.sort, st.dir, manual]);
  const total = manual ? (manualTotal ?? rows.length) : sorted.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pages, Math.max(1, Number(st.page) || 1));
  const shown = manual ? sorted : sorted.slice((page - 1) * size, page * size);

  const toggleSort = (c: Column<R>) => {
    if (st.sort !== c.key) return set({ sort: c.key, dir: c.numeric ? 'desc' : 'asc', page: '1' });
    set({ dir: st.dir === 'asc' ? 'desc' : 'asc', page: '1' });
  };
  const dirOf = (c: Column<R>): SortDirection => (st.sort === c.key ? (st.dir === 'asc' ? 'asc' : 'desc') : false);

  const sel = selected ?? new Set<string>();
  const pageKeys = shown.map(rowKey);
  const allOn = pageKeys.length > 0 && pageKeys.every((k) => sel.has(k));
  const someOn = pageKeys.some((k) => sel.has(k));
  const toggleAll = () => {
    const n = new Set(sel);
    pageKeys.forEach((k) => (allOn ? n.delete(k) : n.add(k)));
    onSelectedChange?.(n);
  };
  const toggle = (k: string) => {
    const n = new Set(sel);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    onSelectedChange?.(n);
  };

  const open = (e: MouseEvent, href?: string) => {
    if (!href) return;
    if ((e.target as HTMLElement).closest('a,button,input,[role="checkbox"],[role="menuitem"]')) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  };

  const titleColumn = columns.find((c) => c.mobile === 'title') ?? columns[0];
  const status = columns.find((c) => c.mobile === 'status');
  const facts = columns.filter((c) => c.mobile === 'fact').slice(0, 3);

  let body: ReactNode;
  if (error) {
    body = (
      <EmptyState kind="error" title={`The ${noun} did not load`} action={onRetry ? <Button size="sm" icon={<RotateCw />} onClick={onRetry}>Retry</Button> : undefined} className="py-16">
        {error}
      </EmptyState>
    );
  } else if (!loading && total === 0) {
    body = filtered ? (
      <EmptyState kind="filtered" title={`No ${noun} match these filters`} action={onClearFilters ? <Button size="sm" onClick={onClearFilters}>Clear filters</Button> : undefined} className="py-16">
        Widen the search or clear a filter to see more.
      </EmptyState>
    ) : (
      <EmptyState kind="first-run" title={empty?.title ?? `No ${noun} yet`} action={empty?.action} className="py-16">
        {empty?.body}
      </EmptyState>
    );
  } else {
    const roleOf = (c: Column<R>): Mobile => (c === titleColumn ? 'title' : c === status ? 'status' : facts.includes(c) ? 'fact' : 'hidden');
    // The title takes one column fewer when a checkbox leads the row: six columns, and the status keeps the last two.
    const phoneCell = (role: Mobile) => (role === 'hidden' ? PHONE_ROLE.hidden : cn(PHONE_CELL, PHONE_ROLE[role], role === 'title' && (selectable ? 'max-md:col-span-3' : 'max-md:col-span-4')));
    body = (
      <Table caption={caption} aria-busy={loading || undefined} className="max-md:block max-md:[&>thead]:hidden max-md:[&>tbody]:block">
        <TableHead>
          <tr>
            {selectable ? (
              <TableHeader className="w-10 !pr-0">
                <Checkbox aria-label={`Select every ${noun.replace(/s$/, '')} on this page`} checked={allOn ? true : someOn ? 'indeterminate' : false} onCheckedChange={toggleAll} />
              </TableHeader>
            ) : null}
            {columns.map((c) => (
              <TableHeader key={c.key} align={c.align ?? (c.numeric ? 'right' : 'left')} hideBelow={c.hideBelow} grow={c.grow} className={c.width} sort={c.sortValue ? dirOf(c) : undefined} onSort={c.sortValue ? () => toggleSort(c) : undefined}>
                {c.header}
              </TableHeader>
            ))}
          </tr>
        </TableHead>
        <TableBody>
          {loading
            ? Array.from({ length: Math.min(size, 8) }, (_, i) => (
                <TableRow key={i} className={PHONE_ROW}>
                  {selectable ? <TableCell data-mobile="check" className={phoneCell('check')}><Skeleton className="size-4" /></TableCell> : null}
                  {columns.map((c, j) => (
                    <TableCell key={c.key} data-mobile={roleOf(c)} hideBelow={c.hideBelow} numeric={c.numeric} className={phoneCell(roleOf(c))}>
                      <Skeleton className={cn('h-3', c.numeric ? 'ml-auto w-12' : c.grow ? ['w-48', 'w-40', 'w-56'][i % 3] : ['w-20', 'w-16', 'w-24'][(i + j) % 3])} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : shown.map((r) => {
                const k = rowKey(r);
                const href = rowHref?.(r);
                return (
                  <TableRow key={k} interactive={Boolean(href)} selected={sel.has(k)} onClick={(e) => open(e, href)} className={PHONE_ROW}>
                    {selectable ? (
                      <TableCell data-mobile="check" className={cn('!pr-0', phoneCell('check'))}>
                        <Checkbox aria-label={`Select ${k}`} checked={sel.has(k)} onCheckedChange={() => toggle(k)} />
                      </TableCell>
                    ) : null}
                    {columns.map((c) => {
                      const role = roleOf(c);
                      // The title is the row's link wherever it is shown, phone included: the whole card takes the
                      // pointer too (the row's own click), but the link is what a keyboard and a screen reader follow.
                      const content = c === titleColumn && href ? <Link href={href} className="row-link">{c.cell(r)}</Link> : c.cell(r);
                      return (
                        <TableCell key={c.key} data-mobile={role} align={c.align} numeric={c.numeric} muted={c.muted} truncate={c.truncate} hideBelow={c.hideBelow} className={phoneCell(role)}>
                          {/* A phone may want other words for the same cell — "Used 1 min ago", not "1 min ago" — so
                              both are rendered and one is hidden: a few words each, never a second copy of the row. */}
                          {c.mobileCell ? (
                            <>
                              <span className="max-md:hidden">{content}</span>
                              <span className="hidden max-md:contents">{c.mobileCell(r)}</span>
                            </>
                          ) : content}
                          {/* The dot that separates two facts, on a phone only — the table has a column for each of
                              them, where a dot would be noise. It trails the fact it follows, so the line reads
                              "391ms · Orbit Retail · 6 min ago" rather than starting every fact with a bullet. */}
                          {role === 'fact' && facts.indexOf(c) < facts.length - 1 ? <span aria-hidden className="hidden max-md:inline"> ·</span> : null}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    );
  }

  return (
    <section aria-label={caption} className={cn('relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card', className)}>
      {title ? <CardHeader title={title} description={description} actions={actions} divided={!toolbar} /> : null}
      {toolbar ? <div className="px-(--card-pad) py-3.5 md:border-b md:border-line">{toolbar}</div> : null}
      {body}
      {!error && total > Math.min(size, ...pageSizes) ? (
        <div className="border-t border-line px-(--card-pad) py-2.5">
          <Pagination
            page={page}
            pageSize={size}
            total={total}
            noun={noun}
            onPageChange={(p) => set({ page: String(p) })}
            pageSizes={pageSizes}
            onPageSizeChange={(s) => { setSize(s); set({ page: '1' }); }}
          />
        </div>
      ) : null}
    </section>
  );
}

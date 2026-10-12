'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Tooltip } from 'radix-ui';
import { MoreHorizontal, Plus } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { useShareView } from '@/components/base/use-share-view';
import { Records } from '@/components/templates/records';
import { Badge, type Tone } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { MetricTile } from '@/components/patterns/metric-tile';
import { DataTable, useQueryState, type Column } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import { formatRelative } from '@/lib/format-date';
import { useLive } from '@/lib/live';
import type { Ticket } from '@/data/sample';
import type { TicketRow } from '@/data/tickets';
import { matchingTickets, TICKET_METRICS, ticketCounts, ticketsContext } from './tickets-context';

/** What a write answers: done, or the sentence that says why not. */
export type TicketResult = { ok: true } | { ok: false; error: string };
type Draft = { title: string; service: string; priority: Ticket['priority']; assigneeId: string | null; summary: string };
type Change = Partial<Pick<Ticket, 'state'>>;

/** The steps a ticket may take from each state, in the order a row offers them: the boundary enforces the same five. */
const STEPS: Record<Ticket['state'], Ticket['state'][]> = { open: ['waiting', 'closed'], waiting: ['open', 'closed'], closed: ['open'] };
/** Colour only where a row needs a look: a high priority and a waiting ticket. Normal work stays quiet. */
const PRIORITY_TONE: Record<Ticket['priority'], Tone> = { high: 'critical', normal: 'neutral', low: 'neutral' };
const STATE_TONE: Record<Ticket['state'], Tone> = { open: 'accent', waiting: 'warning', closed: 'neutral' };
const LABEL = (word: string) => word[0].toUpperCase() + word.slice(1);
const PRIORITY_RANK: Record<Ticket['priority'], number> = { low: 0, normal: 1, high: 2 };
const NOBODY = 'nobody';

const choices = (words: readonly string[]) => words.map((w) => ({ value: w, label: LABEL(w) }));
const blank = (services: string[]): Draft => ({ title: '', service: services[0] ?? '', priority: 'normal', assigneeId: null, summary: '' });

/**
 * `now` is the read's observation time, so an age is never fresher than the data. `may` is what the page asked of the
 * action table, so a control the person may not use is not drawn at all (both true when it is left out, for a view mounted
 * on its own); `line` says who can, once, when either is withheld. `services` and `assignees` are what the form offers.
 * The two functions are the page's server actions: the view calls them, shows a refusal and refreshes the route.
 */
export function TicketsView({ rows, now, may = { create: true, update: true }, line, services, assignees, createTicket, updateTicket }: {
  rows: TicketRow[];
  now: string;
  may?: { create: boolean; update: boolean };
  line?: string;
  services: string[];
  assignees: { id: string; name: string }[];
  createTicket: (draft: Draft) => Promise<TicketResult>;
  updateTicket: (id: string, change: Change) => Promise<TicketResult>;
}) {
  const router = useRouter();
  useLive(['tickets']);
  const asOf = new Date(now);
  const [f, set] = useQueryState({ q: '', state: 'all', priority: 'all', sort: 'changed', dir: 'desc', page: '1' });
  const matching = useMemo(() => matchingTickets(rows, { q: f.q, state: f.state, priority: f.priority }), [rows, f.q, f.state, f.priority]);
  const isFiltered = f.q !== '' || f.state !== 'all' || f.priority !== 'all';
  useShareView(ticketsContext(rows, now, f));
  const clear = () => set({ q: '', state: 'all', priority: 'all', page: '1' });
  const counts = ticketCounts(rows);

  const [pending, startTransition] = useTransition();
  const sending = useRef(false);
  const moving = useRef(new Set<string>());
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => blank(services));
  /** Why the server did not create the ticket: said inside the open form, which keeps what was typed. */
  const [refusal, setRefusal] = useState<string | null>(null);

  const open = () => { setRefusal(null); setCreating(true); };
  const create = () => {
    if (sending.current) return;
    sending.current = true;
    setRefusal(null);
    startTransition(async () => {
      try {
        const answer = await createTicket(draft);
        if (answer.ok) {
          setCreating(false);
          setDraft(blank(services));
          toast({ tone: 'positive', title: 'Ticket created', description: `${draft.title.trim()} is open.` });
          router.refresh();
        } else {
          setRefusal(answer.error);
        }
      } catch {
        setRefusal('The ticket could not be created. Try again.');
      } finally {
        sending.current = false;
      }
    });
  };

  /** One step on one ticket: refused with its reason in a toast, changing nothing, or refreshed into place. */
  const move = (t: TicketRow, state: Ticket['state']) => {
    if (moving.current.has(t.id)) return;
    moving.current.add(t.id);
    startTransition(async () => {
      try {
        const answer = await updateTicket(t.id, { state });
        if (answer.ok) {
          toast({ tone: 'neutral', title: `Moved to ${state}`, description: t.title });
          router.refresh();
        } else {
          toast({ tone: 'critical', title: 'Could not move the ticket', description: answer.error });
        }
      } catch {
        toast({ tone: 'critical', title: 'Could not move the ticket', description: 'Try again.' });
      } finally {
        moving.current.delete(t.id);
      }
    });
  };

  const columns: Column<TicketRow>[] = [
    {
      key: 'title', header: 'Ticket', grow: true, truncate: true, mobile: 'title', sortValue: (t) => t.title, title: (t) => `${t.title} · ${t.service}`,
      cell: (t) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{t.title}</span>
          <span className="t-caption truncate">{t.service}</span>
        </span>
      ),
    },
    { key: 'priority', header: 'Priority', mobile: 'fact', sortValue: (t) => PRIORITY_RANK[t.priority], cell: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{LABEL(t.priority)}</Badge>, mobileCell: (t) => `${LABEL(t.priority)} priority` },
    { key: 'state', header: 'State', mobile: 'status', sortValue: (t) => t.state, cell: (t) => <Badge tone={STATE_TONE[t.state]} dot>{LABEL(t.state)}</Badge> },
    {
      key: 'assignee', header: 'Assigned to', muted: true, hideBelow: 'lg', mobile: 'fact', sortValue: (t) => t.assignee ?? '',
      cell: (t) => (t.assignee ? <span className="whitespace-nowrap">{t.assignee}</span> : <span className="text-ink-3">Nobody</span>),
      mobileCell: (t) => (t.assignee ? `Assigned to ${t.assignee}` : 'Unassigned'),
    },
    { key: 'opened', header: 'Opened', numeric: true, muted: true, hideBelow: 'lg', mobile: 'hidden', sortValue: (t) => t.openedAt, cell: (t) => formatRelative(t.openedAt, asOf) },
    { key: 'changed', header: 'Last changed', numeric: true, mobile: 'fact', sortValue: (t) => t.updatedAt, cell: (t) => formatRelative(t.updatedAt, asOf), mobileCell: (t) => `Changed ${formatRelative(t.updatedAt, asOf)}` },
    ...(may.update ? [{
      key: 'steps', header: <span className="sr-only">Actions</span>, align: 'right' as const, mobile: 'status' as const,
      cell: (t: TicketRow) => (
        <Menu>
          <MenuTrigger asChild>
            <IconButton size="sm" variant="ghost" label={`Change state of ${t.title}`} icon={<MoreHorizontal />} />
          </MenuTrigger>
          <MenuContent align="end">
            {STEPS[t.state].map((s) => <MenuItem key={s} onSelect={() => move(t, s)}>Move to {s}</MenuItem>)}
          </MenuContent>
        </Menu>
      ),
    }] : []),
  ];

  const M = TICKET_METRICS;
  const newTicket = may.create ? <Button variant="primary" icon={<Plus />} aria-haspopup="dialog" onClick={open}>New ticket</Button> : undefined;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Operations tickets"
      description="The work the team tracks against a service: what is open, what is waiting, and who has it."
      actions={newTicket}
    >
      <Records
        summary={
          <>
            <MetricTile label={M.open.label} value={counts.open} format={(n) => String(n)} hint={M.open.hint} emphasis />
            <MetricTile label={M.waiting.label} value={counts.waiting} format={(n) => String(n)} hint={M.waiting.hint} />
            <MetricTile label={M.closed.label} value={counts.closed} format={(n) => String(n)} hint={M.closed.hint} />
          </>
        }
      >
        {/* One line for the whole page, not one per control: who can create and change tickets, when either is withheld. */}
        {line && (!may.create || !may.update) ? <p className="t-caption max-w-[72ch]">{line}</p> : null}
        {/* A row's menu button carries no tooltip, but the view brings its provider so it also stands alone, as in a test. */}
        <Tooltip.Provider delayDuration={300} skipDelayDuration={120}>
          <DataTable
            caption="Operations tickets"
            noun="tickets"
            rows={matching}
            columns={columns}
            rowKey={(t) => t.id}
            empty={{ title: 'No tickets yet', body: 'Open one when there is work to track against a service.', action: may.create ? <Button variant="primary" size="sm" icon={<Plus />} aria-haspopup="dialog" onClick={open}>New ticket</Button> : undefined }}
            state={{ sort: f.sort, dir: f.dir, page: f.page }}
            onStateChange={set}
            filtered={isFiltered}
            onClearFilters={clear}
            toolbar={
              <FilterBar
                search={{ value: f.q, onChange: (q) => set({ q, page: '1' }), placeholder: 'Search tickets' }}
                filters={[
                  { key: 'state', label: 'State', value: f.state, onChange: (state) => set({ state, page: '1' }), options: [{ value: 'all', label: 'All' }, ...choices(['open', 'waiting', 'closed'])] },
                  { key: 'priority', label: 'Priority', value: f.priority, onChange: (priority) => set({ priority, page: '1' }), options: [{ value: 'all', label: 'All' }, ...choices(['high', 'normal', 'low'])] },
                ]}
                result={<>{matching.length} of {rows.length}</>}
                onClear={clear}
              />
            }
          />
        </Tooltip.Provider>
      </Records>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent
          title="New ticket"
          description="It starts open. You can move it along once it exists."
          footer={<><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button variant="primary" busy={pending} onClick={create}>Create ticket</Button></>}
        >
          <div className="flex flex-col gap-5">
            {refusal ? <Banner tone="critical" title="Ticket not created">{refusal}</Banner> : null}
            <Field label="Title" required>
              {(p) => <Input {...p} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Rotate the gateway certificate" />}
            </Field>
            <Field label="Service">
              {(p) => <Select {...p} value={draft.service} onValueChange={(service) => setDraft({ ...draft, service })} options={services.map((s) => ({ value: s, label: s }))} />}
            </Field>
            <Field label="Priority">
              {(p) => <Select {...p} value={draft.priority} onValueChange={(priority) => setDraft({ ...draft, priority: priority as Ticket['priority'] })} options={choices(['high', 'normal', 'low'])} />}
            </Field>
            <Field label="Assignee">
              {(p) => <Select {...p} value={draft.assigneeId ?? NOBODY} onValueChange={(id) => setDraft({ ...draft, assigneeId: id === NOBODY ? null : id })} options={[{ value: NOBODY, label: 'Nobody' }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]} />}
            </Field>
            <Field label="Summary" optional>
              {(p) => <Textarea {...p} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="What is wrong, and what is known so far" />}
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}

// Named cli-* so the payload leaves it out: it draws the sample's own views, which a product replaces.
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';

import { read, readAll } from '@/data/read';
import { readReleases, readRuns } from '@/data/engineering';
import { readTickets } from '@/data/tickets';
import { DEMO_NOW, type ApiKey, type CustomerRecord, type Member } from '@/data/sample';
import { invitableRoles, memberAccess } from '@/data/member-mutations';
import { customerRow } from '@/logic/customers-context';
import { CustomersView } from '@/views/customers';
import { KeysView } from '@/views/keys';
import { MembersView } from '@/views/members';
import { ReleasesView } from '@/views/releases';
import { TestsView } from '@/views/tests';
import { TicketsView } from '@/views/tickets';

/**
 * The list views cut a long name, a service, a release line with an ellipsis, and each cut must keep the whole of itself
 * where a pointer reaches it, the rule the audit holds a page to (scripts/audit.ts `titled`). The sample's names are
 * short, so the audit judged them only where a phone's width cut one: Releases at 320px cut "Inference API · Staging"
 * under a title that read "staging", and nothing had drawn a name long enough to show the rest.
 */
const LONG = 'Northwind Global Payments Reconciliation Platform for Enterprise Customers';
/** A person's name and a company's domain as long as real ones run. */
const PERSON = 'Maximiliane Alexandrina Featherstonehaugh-Montgomery';
const DOMAIN = 'northwind-global-payments-reconciliation';
const none = async () => { throw new Error('not in this test'); };
const now = DEMO_NOW.toISOString();

const VIEWS: Record<string, () => Promise<ReactElement>> = {
  customers: async () => <CustomersView rows={((await readAll('customers')).rows as CustomerRecord[]).slice(0, 4).map(customerRow).map((c) => ({ ...c, name: `${LONG} ${c.name}` }))} />,
  keys: async () => <KeysView rows={((await read('keys')).rows as ApiKey[]).slice(0, 4).map((k) => ({ ...k, name: `${LONG} ${k.name}`, owner: `${PERSON} ${k.owner}` }))} now={now} createKey={none} revokeKey={none} />,
  members: async () => {
    const members = ((await read('members', {})).rows as Member[]).slice(0, 4);
    const access = await memberAccess(members.map((m) => m.id));
    return <MembersView rows={members.map((m) => ({ ...m, name: `${LONG} ${m.name}`, email: m.email.replace('@', `@${DOMAIN}.`) }))} now={now} actions={{ invite: none, setStatus: none, remove: none, assignRole: none } as never} access={access} roles={await invitableRoles()} />;
  },
  tickets: async () => <TicketsView rows={(await readTickets()).rows.slice(0, 4).map((t) => ({ ...t, title: `${LONG} ${t.title}`, service: `${LONG} ${t.service}`, assignee: `${PERSON} ${t.assignee ?? ''}` }))} now={now} services={[]} assignees={[]} createTicket={none as never} updateTicket={none as never} />,
  releases: async () => <ReleasesView rows={(await readReleases()).rows.slice(0, 4).map((r) => ({ ...r, service: `${LONG} ${r.service}`, version: `${r.version}-${LONG.replace(/\s/g, '-')}` }))} now={now} />,
  tests: async () => <TestsView rows={(await readRuns()).rows.slice(0, 4).map((r) => ({ ...r, release: r.release ? { ...r.release, service: `${LONG} ${r.release.service}` } : r.release }))} now={now} />,
};

const whole = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
/** The audit's rule: a title on the element or up to eight above it, or on the one inside it, that holds its whole text. */
const keeps = (el: Element) => {
  const own = whole(el.textContent);
  const holds = (t: string | null) => whole(t).length > 0 && whole(t).includes(own);
  for (let n: Element | null = el, i = 0; n && i < 8; n = n.parentElement, i++) if (holds(n.getAttribute('title'))) return true;
  return [...el.querySelectorAll('[title]')].some((n) => holds(n.getAttribute('title')));
};

describe('every list view keeps the whole of a text it cuts', () => {
  for (const [name, view] of Object.entries(VIEWS)) {
    it(name, async () => {
      const { container } = render(<Tooltip.Provider>{await view()}</Tooltip.Provider>);
      // A line that is cut: text alone (a cell that holds several lines is judged by each of them), not a Select's value,
      // which Radix draws and keeps in the trigger's accessible name.
      const cut = [...container.querySelectorAll('[class~="truncate"]')].filter((n) => whole(n.textContent) && n.childElementCount === 0 && !n.closest('[aria-hidden="true"],.sr-only,[role="combobox"],button[aria-haspopup]'));
      expect(cut.length, `${name} cuts nothing: the long names did not reach a cut element`).toBeGreaterThan(0);
      const lost = cut.filter((n) => !keeps(n)).map((n) => `<${n.localName}> "${whole(n.textContent).slice(0, 60)}"`);
      expect([...new Set(lost)].join("\n"), `${name} cuts text and keeps it nowhere`).toBe("");
      // A product's text is never held on one line with no end: a name or an address as long as real ones run widens
      // its column past the table's frame (Members' email, 2px at 1440 with a long domain). It is cut and kept, or it
      // may break: at its spaces, or an address before its @.
      const held = [...container.querySelectorAll('[class~="whitespace-nowrap"]')].filter((n) => /Featherstonehaugh|northwind-global-payments/.test(n.textContent ?? '') && !n.closest('[class~="truncate"]'));
      expect(held.map((n) => `<${n.localName}> "${whole(n.textContent).slice(0, 60)}"`).join('\n'), `${name} holds a long name on one line`).toBe('');
    });
  }
});

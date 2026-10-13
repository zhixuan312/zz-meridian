/**
 * The sample's data for the operational pages (Services, Settings) and the shell: the incidents before the current one
 * and a fixed set of alerts, derived from ./sample so the records agree across pages.
 */
import { DEMO_NOW, INCIDENTS } from '@/system/fixtures/sample';
import { CUSTOMERS } from '@/system/fixtures/company';
import type { Incident } from '@/components/patterns/incident-card';
import type { Alert } from '@/components/patterns/shell-tools';

const DAY = 86_400_000;
const ago = (ms: number) => new Date(DEMO_NOW.getTime() - ms).toISOString();

/** Incidents before the current one, newest first. */
export const PAST_INCIDENTS: Incident[] = [
  INCIDENTS[1],
  {
    id: 'inc_2571', title: 'Webhook deliveries delayed up to 9 minutes', service: 'Webhooks', severity: 'minor', state: 'resolved',
    started: ago(63 * DAY), resolved: ago(63 * DAY - 0.9 * 3600_000),
    updates: [{ at: ago(63 * DAY), text: 'A queue consumer stalled after a deploy. Restarted; the backlog drained in 14 minutes.' }],
  },
  {
    id: 'inc_2540', title: 'Embeddings returned 503 for 6 minutes in us-east-1', service: 'Embeddings', severity: 'major', state: 'resolved',
    started: ago(81 * DAY), resolved: ago(81 * DAY - 0.1 * 3600_000),
    updates: [{ at: ago(81 * DAY), text: 'A capacity rebalance drained too many nodes at once. Rolled back and added a floor.' }],
  },
];

/** How many customers are past due, as the bell would say it of the sample. */
const PAST_DUE = CUSTOMERS.filter((c) => c.status === 'past due').length;

/** A fixed set of alerts for the Shell tools card's specimens and the Atlas's held-still screens (the product's bell reads `readAlerts()`): the live incident first (new), then what happened recently that someone may act on. */
export const ALERTS: Alert[] = [
  { id: 'a1', tone: 'warning', unread: true, title: INCIDENTS[0].title, detail: 'Monitoring · p95 back under 650ms', at: INCIDENTS[0].updates.at(-1)!.at, href: '/services' },
  { id: 'a2', tone: 'warning', title: `${PAST_DUE} customers are past due`, detail: 'Their latest invoices are overdue', at: ago(0.3 * DAY), href: '/customers?status=past+due' },
  { id: 'a3', tone: 'neutral', title: 'Claude raised the rate limit for Parallax AI', detail: 'For Jonas Weber · 2,000 requests a minute', at: ago(2.4 * 3600_000), href: '/customers' },
  { id: 'a4', tone: 'positive', title: 'Gateway v4.18.2 deployed', detail: 'Every region, no errors during rollout', at: ago(5.1 * 3600_000), href: '/' },
];

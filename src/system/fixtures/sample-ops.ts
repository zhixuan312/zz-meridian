/**
 * The sample's data for the operational pages (Health, Analytics, Settings), derived from ./sample so the numbers agree
 * across pages.
 */
import { DEMO_NOW, INCIDENTS, REGIONS, demoHeatmap } from '@/system/fixtures/sample';
import type { Incident } from '@/components/patterns/incident-card';

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

/** Requests by hour of day (UTC), summed across the week: the shape of a working day. */
export function requestsByHour() {
  const grid = demoHeatmap();
  return Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: `${String(h).padStart(2, '0')}:00`, value: grid.reduce((a, row) => a + row[h], 0) }));
}

/** Requests and median latency by region. */
export const REGION_LATENCY = REGIONS.map((r, i) => ({ ...r, p50: [92, 118, 164, 101][i] }));

export const TIMEZONES = [
  { value: 'UTC', label: 'UTC', description: 'Coordinated Universal Time' },
  { value: 'America/New_York', label: 'New York', description: 'UTC−04:00 in October' },
  { value: 'Europe/London', label: 'London', description: 'UTC+01:00 in October' },
  { value: 'Europe/Berlin', label: 'Berlin', description: 'UTC+02:00 in October' },
  { value: 'Asia/Singapore', label: 'Singapore', description: 'UTC+08:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo', description: 'UTC+09:00' },
];

/** MCP hosts this workspace has connected: where the product's views appear as apps inside an assistant. */
export const CONNECTED_HOSTS = [
  { id: 'h1', name: 'Claude', kind: 'Chat client', connectedBy: 'Maya Chen', since: ago(41 * DAY), lastUsed: ago(2.4 * 3600_000), scopes: ['Read dashboards', 'Propose changes'] },
  { id: 'h2', name: 'Ops runbook agent', kind: 'Internal agent', connectedBy: 'Jonas Weber', since: ago(12 * DAY), lastUsed: ago(26 * 3600_000), scopes: ['Read dashboards'] },
];

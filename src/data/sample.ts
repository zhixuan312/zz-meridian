/**
 * The sample's fixtures that are not a collection: the series, services and alerts the pages draw, and the types and
 * constants the views share. Pages and views import them from here, never from `src/system/fixtures`, so replacing
 * the sample with your API is a change to this one file. A product deletes what it does not draw.
 */
export { DEMO_NOW, DEMO_UPDATED_AT, ENDPOINTS, STATUS_MIX, REGIONS, ACTIVITY, INCIDENTS, SERVICES, demoSeries, demoTotals, demoHeatmap } from '@/system/fixtures/sample';
export type { DailyPoint, Endpoint, Totals, RequestRow } from '@/system/fixtures/sample';
export { ROLES, STATUSES, TEAMS } from '@/system/fixtures/sample-members';
export type { Member } from '@/system/fixtures/sample-members';
export { ALERTS, CONNECTED_HOSTS, PAST_INCIDENTS, REGION_LATENCY, TIMEZONES, requestsByHour } from '@/system/fixtures/sample-ops';
export { CUSTOMERS, FEATURED_REQUEST_IDS, STATUS_TEXT, payloadsOf, statusClass, statusTone, traceOf, usageOf } from '@/system/fixtures/sample-records';
export type { ApiKey, CustomerRecord, Span } from '@/system/fixtures/sample-records';

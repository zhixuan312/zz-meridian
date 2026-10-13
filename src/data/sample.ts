/**
 * The sample's fixtures that are not a collection: the clock, the regions list the request filter uses, and the types
 * and constants the views share. Pages and views import them from here, never from `src/system/fixtures`, so replacing
 * the sample with your API is a change to this one file. A product deletes what it does not draw.
 *
 * A client view imports this file, so it names no record of the company: its days, its usage and its customers are made
 * in `src/system/fixtures/company.ts`, which only the server reads (`collections.ts`, `sign-in.ts`), and from which this
 * file takes nothing.
 */
export { DEMO_NOW, DEMO_UPDATED_AT, REGION_NAMES } from '@/system/fixtures/sample';
export type { CustomerRecord, DailyPoint, Endpoint, RequestRow, Totals } from '@/system/fixtures/sample';
export { STATUSES, TEAMS } from '@/system/fixtures/sample-members';
export type { Member } from '@/system/fixtures/sample-members';
export { FEATURED_REQUEST_IDS, STATUS_TEXT, payloadsOf, statusClass, statusTone, traceOf, usageOf } from '@/system/fixtures/sample-records';
export type { ApiKey, Span } from '@/system/fixtures/sample-records';
export type { Release, Ticket, VerificationRun } from '@/system/fixtures/sample-engineering';

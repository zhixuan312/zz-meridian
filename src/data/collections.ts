/**
 * The product's collections: the one place the console and the assistant are pointed at its data. The sample serves
 * its fixtures; a product replaces `rows` with its API and `clock` with `new Date()`.
 *
 * TWO THINGS TO DO THE DAY `rows` BECOMES A REAL DATABASE (issue #7, from a product running Postgres across a network):
 *
 * 1. Read each table ONCE per request. A console page asks for the same records from several places — the layout's
 *    shell tools, a page-level strip, the page itself and its freshness stamp — so the same query runs up to five times
 *    over. With the fixtures that is free; across a network it is a round trip each. Wrap the read in `cache()` from
 *    `react` (request-scoped, which is what the Next.js docs recommend around an ORM) and leave the write path reading
 *    directly, so a validation never sees an earlier answer. That product's three heaviest pages answered 44-46% sooner.
 * 2. Raise the connection pool's idle timeout. `pg` drops an idle connection after 10 seconds, and against a remote
 *    Postgres with TLS a new one cost that product 330 ms to 1.5 s — paid again on the next click by anybody who reads
 *    a page for a moment. `idleTimeoutMillis: 300_000` is what they settled on.
 */
import { z } from 'zod';
import { arrayCollection, type AnyCollection, type Collection } from '@/lib/collection';
import { API_KEYS, type ApiKey } from '@/system/fixtures/sample-records';
import { MEMBERS, ROLES, STATUSES, TEAMS, type Member } from '@/system/fixtures/sample-members';
import { DEMO_NOW, REQUESTS, type RequestRow } from '@/system/fixtures/sample';
import { statusClass } from '@/data/sample';

/** The data's "now": the sample's fixed clock. A product returns `new Date()`. */
export const clock = (): Date => DEMO_NOW;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const members: Collection<Member, 'id'> = arrayCollection({
  name: 'members',
  label: 'Members',
  description: 'The people in the workspace, with their role, team, status and when they last used it.',
  key: 'id',
  title: (m) => m.name,
  fields: z.object({
    name: z.string().trim().min(1),
    email: z.email(),
    role: z.enum(ROLES),
    team: z.enum(TEAMS),
    status: z.enum(STATUSES),
    joined: date,
    lastActive: date.nullable(),
  }),
  rows: MEMBERS,
  allow: ['create', 'update', 'remove'],
});

export const keys: Collection<ApiKey, 'id'> = arrayCollection({
  name: 'keys',
  label: 'API keys',
  description: 'The workspace\'s API keys: who owns each, what it can reach, and when it was last used.',
  key: 'id',
  title: (k) => k.name,
  fields: z.object({
    name: z.string(),
    secret: z.string(),
    owner: z.string(),
    created: z.string(),
    lastUsed: z.string().nullable(),
    scopes: z.array(z.string()),
    env: z.enum(['live', 'test']),
  }),
  rows: API_KEYS,
  allow: ['create', 'remove'],
  pageOnly: ['create'],
  hidden: ['secret'],
});

/** A request as the collection holds it: the record plus two values worked out for filtering, never written. `search` is the lower-cased id, route and customer; a page does not carry it (`publicRows`). */
type RequestRecord = RequestRow & { statusClass: ReturnType<typeof statusClass>; search: string };

export const requests: Collection<RequestRecord, 'id'> = arrayCollection({
  name: 'requests',
  label: 'Requests',
  description: 'The API requests the workspace received, newest first, with status, latency and customer.',
  key: 'id',
  title: (r) => r.id,
  fields: z.object({
    at: z.string(),
    method: z.string(),
    route: z.string(),
    status: z.number(),
    latency: z.number(),
    customer: z.string(),
    region: z.string(),
    bytes: z.number(),
    model: z.string().nullable(),
  }),
  derived: ['statusClass', 'search'],
  rows: REQUESTS.map((r) => ({ ...r, statusClass: statusClass(r.status), search: `${r.id} ${r.route} ${r.customer}`.toLowerCase() })),
  allow: [],
});

export const collections: AnyCollection[] = [members, keys, requests];

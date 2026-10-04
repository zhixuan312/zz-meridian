/**
 * The product's collections: the one place the console and the assistant are pointed at its data. The sample serves
 * its fixtures; a product replaces `rows` with its API and `clock` with `new Date()`.
 */
import { z } from 'zod';
import { arrayCollection, type AnyCollection, type Collection } from '@/lib/collection';
import { API_KEYS, type ApiKey } from '@/system/fixtures/sample-records';
import { MEMBERS, ROLES, STATUSES, TEAMS, type Member } from '@/system/fixtures/sample-members';
import { DEMO_NOW, REQUESTS, type RequestRow } from '@/system/fixtures/sample';

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

export const requests: Collection<RequestRow, 'id'> = arrayCollection({
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
  rows: REQUESTS,
  allow: [],
});

export const collections: AnyCollection[] = [members, keys, requests];

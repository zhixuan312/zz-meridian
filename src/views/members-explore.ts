/**
 * Members' prepared query (`src/lib/explore.ts`): what an agent on the page may count and group over the people in the
 * workspace, by status, role and team. A drilled member's line opens with its id and its name, which is where a write
 * tool's ids come from: the assistant suspends or removes a member by the id this query hands it. Server only:
 * `tools.ts` sets it on the Members tool.
 */
import { MAIN_ROLES } from '@/data/roles';
import { STATUSES, TEAMS } from '@/data/sample';
import type { PreparedQuery } from '@/lib/explore';

export const membersExplore: PreparedQuery = {
  sources: {
    members: {
      collection: 'members',
      filters: {
        status: { ops: ['eq', 'ne', 'in'], values: STATUSES },
        role: { ops: ['eq', 'ne', 'in'], values: MAIN_ROLES },
        team: { ops: ['eq', 'ne', 'in'], values: TEAMS },
        name: { ops: ['eq', 'in'] },
        lastActive: { ops: ['lt', 'gt'] },
      },
      facets: ['status', 'role', 'team'],
      measures: {
        members: { label: 'Members', unit: 'members', definition: 'People in the workspace, invited and suspended among them unless narrowed by status.', agg: 'count' },
        active: { label: 'Active', unit: 'members', definition: 'Members whose status is Active.', agg: 'count', where: [{ field: 'status', op: 'eq', value: 'Active' }] },
      },
      drill: { columns: ['id', 'name', 'role', 'team', 'status', 'lastActive'], address: () => '/members' },
      cannot: 'Last active is the last sign-in to this console, a date (YYYY-MM-DD) that lt and gt compare: it says nothing about use of the API through a key. A member who has never signed in has no date, so lt and gt both leave them out.',
    },
  },
};

import { describe, expect, it } from 'vitest';
import { ADD_ONS, GRANTS, MAIN_ROLES, effective, whoCan } from '@/data/roles';

const DASHBOARDS = ['requests:read', 'days:read', 'endpoints:read', 'responses:read', 'services:read', 'incidents:read', 'customers:read', 'activity:read'];
const TABLE: Record<string, string[]> = {
  Owner: [...DASHBOARDS, 'requests:create', 'keys:read', 'keys:create', 'keys:remove', 'members:read', 'members:create', 'members:update', 'members:remove', 'activity:create', 'workspace:read', 'workspace:update', 'workspace:remove'],
  Admin: [...DASHBOARDS, 'requests:create', 'keys:read', 'keys:create', 'keys:remove', 'members:read', 'members:create', 'members:update', 'members:remove', 'activity:create', 'workspace:read'],
  Member: [...DASHBOARDS, 'requests:create', 'keys:read', 'members:read', 'activity:create'],
  Viewer: [...DASHBOARDS],
  'Key manager': ['keys:read', 'keys:create', 'keys:remove', 'activity:create'],
};

describe('the role table', () => {
  it('declares four main roles and one add-on, in order', () => {
    expect([...MAIN_ROLES]).toEqual(['Owner', 'Admin', 'Member', 'Viewer']);
    expect([...ADD_ONS]).toEqual(['Key manager']);
  });

  it('gives each role exactly the frozen grants', () => {
    expect(Object.keys(GRANTS).sort()).toEqual(Object.keys(TABLE).sort());
    for (const [role, grants] of Object.entries(TABLE)) expect([...GRANTS[role as keyof typeof GRANTS]].sort()).toEqual([...grants].sort());
  });

  it('unions a main role with its add-ons', () => {
    const lucas = effective('Member', ['Key manager']);
    const priya = effective('Member', []);
    expect([lucas.has('keys:create'), lucas.has('keys:remove'), lucas.has('members:update')]).toEqual([true, true, false]);
    expect([priya.has('keys:create'), priya.has('keys:remove'), priya.has('members:update')]).toEqual([false, false, false]);
    expect(effective('Member', ['Key manager', 'Key manager']).size).toBe(lucas.size);
  });

  it('names the roles whose own grants satisfy a whole need, in table order', () => {
    expect(whoCan('keys:create')).toEqual(['Owner', 'Admin', 'Key manager']);
    expect(whoCan('members:update')).toEqual(['Owner', 'Admin']);
    expect(whoCan('requests:read')).toEqual(['Owner', 'Admin', 'Member', 'Viewer']);
    expect(whoCan({ allOf: ['workspace:read', 'workspace:update'] })).toEqual(['Owner']);
  });
});

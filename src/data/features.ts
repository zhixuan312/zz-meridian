/**
 * The features this dashboard offers and the actions a person may take from them: one table the rail, the command
 * palette and every page ask, so a destination and a control cannot drift apart.
 *
 * A feature's `needs` is what a person must be able to do to reach the page behind it; an action's `needs` is what they
 * must be able to do to run it, and an action's optional `line` is the one sentence a page shows when it withholds that
 * action, saying who can (`actionLine` in `src/views/no-access.tsx`). All three name grants only — the role names and
 * the grant table stay in `roles.ts`. The nav
 * in `src/app.config.ts` points each item at its feature's need **by reference** (`needs: FEATURES.analytics.needs`),
 * so an item and the table never restate one another.
 *
 * Pure data with type-only imports, so plain `node` can import it: `scripts/check.ts` reads `src/app.config.ts`, which
 * reaches this file.
 */
import type { Need, ProtectedNeed } from '@/lib/collection';

/** Every page the console offers, by the id the rail, the palette and a page's gate name it. */
export type FeatureId =
  | 'overview' | 'requests' | 'request' | 'analytics' | 'health' | 'customers'
  | 'keys' | 'members' | 'settings' | 'system' | 'docs';

/** Every action a page offers that only some people may take, by the id its control names it. */
export type ActionId =
  | 'create-key' | 'revoke-key' | 'invite-member' | 'change-role' | 'suspend-member' | 'reactivate-member'
  | 'remove-member' | 'replay-request' | 'save-workspace' | 'delete-workspace';

/** Each feature: its name as a person reads it, and the need a person must satisfy to reach it. */
export const FEATURES: Record<FeatureId, { title: string; needs: Need }> = {
  overview: { title: 'Overview', needs: { allOf: ['days:read', 'endpoints:read', 'responses:read', 'activity:read', 'incidents:read'] } },
  requests: { title: 'Requests', needs: 'requests:read' },
  request: { title: 'Request', needs: { allOf: ['requests:read', 'endpoints:read'] } },
  analytics: { title: 'Analytics', needs: { allOf: ['days:read', 'endpoints:read', 'activity:read', 'incidents:read', 'requests:read'] } },
  health: { title: 'Health', needs: { allOf: ['services:read', 'incidents:read'] } },
  customers: { title: 'Customers', needs: 'customers:read' },
  keys: { title: 'API keys', needs: 'keys:read' },
  members: { title: 'Members', needs: 'members:read' },
  settings: { title: 'Settings', needs: 'public' },
  system: { title: 'Design system', needs: 'public' },
  docs: { title: 'Docs', needs: 'public' },
};

/**
 * Each action: the feature it belongs to, its name as a control reads it, the need that permits it, and — for an action
 * a page withholds — the one sentence saying who can, so the control and its explanation are frozen together.
 */
export const ACTIONS: Record<ActionId, { feature: FeatureId; label: string; needs: ProtectedNeed; line?: string }> = {
  'create-key': { feature: 'keys', label: 'Create key', needs: 'keys:create', line: 'Owners, Admins and Key managers create and revoke keys.' },
  'revoke-key': { feature: 'keys', label: 'Revoke', needs: 'keys:remove', line: 'Owners, Admins and Key managers create and revoke keys.' },
  'invite-member': { feature: 'members', label: 'Invite member', needs: 'members:create' },
  'change-role': { feature: 'members', label: 'Change role', needs: 'members:update' },
  'suspend-member': { feature: 'members', label: 'Suspend', needs: 'members:update' },
  'reactivate-member': { feature: 'members', label: 'Reactivate', needs: 'members:update' },
  'remove-member': { feature: 'members', label: 'Remove', needs: 'members:remove' },
  'replay-request': { feature: 'request', label: 'Replay', needs: 'requests:create', line: 'Owners, Admins and Members can replay requests.' },
  'save-workspace': { feature: 'settings', label: 'Save workspace', needs: { allOf: ['workspace:read', 'workspace:update'] } },
  'delete-workspace': { feature: 'settings', label: 'Delete workspace', needs: 'workspace:remove' },
};

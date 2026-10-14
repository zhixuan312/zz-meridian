/**
 * The features this dashboard offers and the actions a person may take from them: one table the rail, the command
 * palette and every page ask, so a destination and a control cannot drift apart.
 *
 * A feature's `needs` is what a person must be able to do to reach the page behind it; an action's `needs` is what they
 * must be able to do to run it. Both name grants only — the role names and the grant table stay in `roles.ts`. The nav
 * in `src/app.config.ts` points each item at its feature's need **by reference** (`needs: FEATURES.usage.needs`),
 * so an item and the table never restate one another.
 *
 * Pure data with type-only imports, so plain `node` can import it: `scripts/check.ts` reads `src/app.config.ts`, which
 * reaches this file.
 */
import type { Need, ProtectedNeed } from '@/lib/collection';

/** Every page the console offers, by the id the rail, the palette and a page's gate name it. */
export type FeatureId =
  | 'home' | 'requests' | 'request' | 'usage' | 'services' | 'customers' | 'customer' | 'revenue' | 'now'
  | 'keys' | 'members' | 'settings' | 'system' | 'docs' | 'tickets' | 'tests' | 'releases';

/** Every action a page offers that only some people may take, by the id its control names it. */
type ActionId =
  | 'create-key' | 'revoke-key' | 'invite-member' | 'change-role' | 'suspend-member' | 'reactivate-member'
  | 'remove-member' | 'replay-request' | 'save-workspace' | 'create-ticket' | 'update-ticket';

/** What reading customers asks: the customer list and one customer's page both ask it, so they cannot drift apart. */
const CUSTOMERS_NEED: Need = 'customers:read';

/** Each feature: its name as a person reads it, and the need a person must satisfy to reach it. */
export const FEATURES: Record<FeatureId, { title: string; needs: Need }> = {
  home: { title: 'Home', needs: { allOf: ['days:read', 'usage:read', 'models:read', 'compute:read', 'incidents:read', 'customers:read', 'services:read', 'tickets:read', 'tests:read', 'releases:read'] } },
  requests: { title: 'Requests', needs: 'requests:read' },
  request: { title: 'Request', needs: { allOf: ['requests:read', 'endpoints:read'] } },
  usage: { title: 'Usage', needs: { allOf: ['days:read', 'hours:read', 'regions:read', 'endpoints:read', 'responses:read'] } },
  services: { title: 'Services', needs: { allOf: ['services:read', 'incidents:read', 'days:read'] } },
  customers: { title: 'Customers', needs: CUSTOMERS_NEED },
  customer: { title: 'Customer', needs: CUSTOMERS_NEED },
  revenue: { title: 'Revenue', needs: { allOf: ['customers:read', 'days:read', 'usage:read', 'models:read', 'regions:read'] } },
  now: { title: 'Now', needs: { allOf: ['services:read', 'incidents:read', 'releases:read', 'tests:read', 'days:read', 'usage:read', 'models:read', 'compute:read', 'endpoints:read', 'tickets:read', 'activity:read'] } },
  keys: { title: 'API keys', needs: 'keys:read' },
  members: { title: 'Members', needs: 'members:read' },
  settings: { title: 'Settings', needs: 'public' },
  system: { title: 'Design system', needs: 'public' },
  docs: { title: 'Docs', needs: 'public' },
  tickets: { title: 'Tickets', needs: 'tickets:read' },
  tests: { title: 'Tests', needs: 'tests:read' },
  releases: { title: 'Releases', needs: 'releases:read' },
};

/**
 * Each action: the feature it belongs to, its name as a control reads it, and the need that permits it. A page draws
 * the control only for a person who meets the need, and says nothing in its place for anyone else.
 */
export const ACTIONS: Record<ActionId, { feature: FeatureId; label: string; needs: ProtectedNeed }> = {
  'create-key': { feature: 'keys', label: 'Create key', needs: 'keys:create' },
  'revoke-key': { feature: 'keys', label: 'Revoke', needs: 'keys:remove' },
  'invite-member': { feature: 'members', label: 'Invite member', needs: 'members:create' },
  'change-role': { feature: 'members', label: 'Change role', needs: 'members:update' },
  'suspend-member': { feature: 'members', label: 'Suspend', needs: 'members:update' },
  'reactivate-member': { feature: 'members', label: 'Reactivate', needs: 'members:update' },
  'remove-member': { feature: 'members', label: 'Remove', needs: 'members:remove' },
  'replay-request': { feature: 'request', label: 'Replay', needs: 'requests:create' },
  'save-workspace': { feature: 'settings', label: 'Save workspace', needs: { allOf: ['workspace:read', 'workspace:update'] } },
  'create-ticket': { feature: 'tickets', label: 'New ticket', needs: 'tickets:create' },
  'update-ticket': { feature: 'tickets', label: 'Change ticket state', needs: 'tickets:update' },
};

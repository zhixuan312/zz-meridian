import {
  Activity, BarChart3, Boxes, FileText, Gauge, KeyRound, LayoutGrid, Settings, UserRound, Users, type LucideIcon,
} from 'lucide-react';
// Relative with its extension, and a type-only need below: `scripts/check.ts` imports this file under plain node.
import { FEATURES } from './data/features.ts';
import type { Need } from './lib/collection.ts';

/**
 * Everything that makes this dashboard yours, in one file. Rename the product, rewrite the navigation, pick an accent.
 * Adding a page is a route file plus a line in `nav`; the rail holds no route knowledge of its own.
 */
export const app = {
  /** The product name: the rail, the document title, the sign-in screen. */
  name: 'ZZ Meridian',
  /** One line under the name in the rail: the workspace or environment. */
  workspace: 'Production',
  /** The accent preset the product ships with; a person can still change it in Settings. */
  accent: 'indigo' as const,
  // Optional keys, left unset so the template stays on the system theme with the default mark:
  //   theme: 'dark' | 'light'  the theme a person gets until they choose one (`node scripts/brand.ts --theme dark|light`)
  //   logo: '/logo.svg'        a root-relative local SVG served from public/; the rail, sign-in and embed frame show it
  /** Every date is shown in this zone, and every daily bucket is cut on its midnight. */
  timezone: 'UTC',
  /** ISO 4217 code for every money figure: tiles, tables, chart axes. */
  currency: 'USD',
  /** The signed-in person the rail shows until your auth supplies one. */
  user: { name: 'Maya Chen', role: 'Owner' },
} as const;

/** `needs` is the feature's own need from `src/data/features.ts`, by reference: the rail asks it of the person. */
export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string; needs: Need };
export type NavGroup = { label?: string; items: NavItem[] };

export const nav: NavGroup[] = [
  {
    items: [
      { href: '/', label: 'Overview', icon: LayoutGrid, needs: FEATURES.overview.needs },
      { href: '/requests', label: 'Requests', icon: Activity, needs: FEATURES.requests.needs },
      { href: '/analytics', label: 'Analytics', icon: BarChart3, needs: FEATURES.analytics.needs },
    ],
  },
  {
    label: 'Operate',
    items: [
      { href: '/health', label: 'Health', icon: Gauge, badge: '1', needs: FEATURES.health.needs },
      { href: '/customers', label: 'Customers', icon: Users, needs: FEATURES.customers.needs },
      { href: '/keys', label: 'API keys', icon: KeyRound, needs: FEATURES.keys.needs },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: '/members', label: 'Members', icon: UserRound, needs: FEATURES.members.needs },
      { href: '/settings', label: 'Settings', icon: Settings, needs: FEATURES.settings.needs },
      { href: '/system', label: 'Design system', icon: Boxes, needs: FEATURES.system.needs },
      { href: '/system/start/start-a-dashboard', label: 'Docs', icon: FileText, needs: FEATURES.docs.needs },
    ],
  },
];

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** The name as identifiers, for the sample's addresses, URLs and MCP tool names. They follow `app.name`. */
export const slug = toSlug(app.name);
export const workspaceSlug = `${slug}-${toSlug(app.workspace)}`;
/** `.example` is reserved for documentation, so sample addresses never point at someone's real domain. */
export const domain = `${slug}.example`;
export const toolPrefix = slug.replace(/-/g, '_');

import {
  Activity, BarChart3, Boxes, CircleDollarSign, FileText, FlaskConical, Gauge, KeyRound, LayoutGrid, Radio, Rocket, Settings, Ticket, UserRound, Users, type LucideIcon,
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
  /** The environment this product runs as: every page's kicker, and the line under the name in a rail that has one navigation. */
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

/**
 * The product's workspaces, in the order the rail's menu lists them. A workspace is where a person looks, not what they
 * may do: access is decided by each page's feature, never by this. Each is `label` (its name), `audience` (a sentence
 * saying who it is for, drawn on its home) and `homeHref` (the entry the menu opens). A project without workspaces
 * deletes this declaration and the `workspace` field of its entries; `zz-meridian adopt` writes it that way.
 */
export const workspaces = {
  main: { label: 'Main', audience: 'For everyone who needs the whole product at a glance: how it is doing, who is in it and how it is set up.', homeHref: '/' },
  business: { label: 'Business', audience: 'For the people who answer for customers and usage: traffic, who relies on the product and what they ask of it.', homeHref: '/business' },
  engineering: { label: 'Engineering', audience: 'For the people who run the product: whether it is up, who holds its keys, what is being fixed, tested and released.', homeHref: '/engineering' },
} as const;
export type WorkspaceId = keyof typeof workspaces;

/** `needs` is the feature's own need from `src/data/features.ts`, by reference: the rail asks it of the person. */
export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string; workspace?: WorkspaceId; needs: Need };
export type NavGroup = { label?: string; items: NavItem[] };

export const nav: NavGroup[] = [
  {
    items: [
      { href: '/', label: 'Overview', icon: LayoutGrid, workspace: 'main', needs: FEATURES.overview.needs },
      { href: '/members', label: 'Members', icon: UserRound, workspace: 'main', needs: FEATURES.members.needs },
      { href: '/settings', label: 'Settings', icon: Settings, workspace: 'main', needs: FEATURES.settings.needs },
      { href: '/system', label: 'Design system', icon: Boxes, workspace: 'main', needs: FEATURES.system.needs },
      { href: '/system/start/start-a-dashboard', label: 'Docs', icon: FileText, workspace: 'main', needs: FEATURES.docs.needs },
    ],
  },
  {
    items: [
      { href: '/business', label: 'Revenue', icon: CircleDollarSign, workspace: 'business', needs: FEATURES.revenue.needs },
      { href: '/analytics', label: 'Analytics', icon: BarChart3, workspace: 'business', needs: FEATURES.analytics.needs },
      { href: '/customers', label: 'Customers', icon: Users, workspace: 'business', needs: FEATURES.customers.needs },
      { href: '/requests', label: 'Requests', icon: Activity, workspace: 'business', needs: FEATURES.requests.needs },
    ],
  },
  {
    items: [
      { href: '/engineering', label: 'Now', icon: Radio, workspace: 'engineering', needs: FEATURES.now.needs },
      { href: '/health', label: 'Operations', icon: Gauge, workspace: 'engineering', needs: FEATURES.health.needs },
      { href: '/keys', label: 'API keys', icon: KeyRound, workspace: 'engineering', needs: FEATURES.keys.needs },
      { href: '/operations-tickets', label: 'Operations tickets', icon: Ticket, workspace: 'engineering', needs: FEATURES.tickets.needs },
      { href: '/tests', label: 'Tests and verification', icon: FlaskConical, workspace: 'engineering', needs: FEATURES.tests.needs },
      { href: '/releases', label: 'Releases', icon: Rocket, workspace: 'engineering', needs: FEATURES.releases.needs },
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

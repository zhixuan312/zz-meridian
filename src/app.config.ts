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
  /** The line a search engine and a link preview show under the name. */
  description: 'Traffic, latency, revenue and health for every endpoint.',
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
 * saying who it is for, drawn on its home) and `homeHref` (the entry the menu opens). The rail's menu offers a workspace
 * when the person may open at least one of its destinations and opens `homeHref`, or the first of them they may open
 * when the home is not one — which is the only place a workspace and a grant meet. A project without workspaces deletes
 * this declaration and the `workspace` field of its entries; `zz-meridian adopt` writes it that way.
 */
export const workspaces = {
  main: { label: 'Main', audience: 'For everyone who needs the whole product at a glance: how it is doing, who is in it and how it is set up.', homeHref: '/' },
  business: { label: 'Business', audience: 'For the people who answer for customers and usage: traffic, who relies on the product and what they ask of it.', homeHref: '/business' },
  engineering: { label: 'Engineering', audience: 'For the people who run the product: whether it is up, who holds its keys, what is being fixed, tested and released.', homeHref: '/engineering' },
} as const;
export type WorkspaceId = keyof typeof workspaces;

/**
 * `needs` is the feature's own need from `src/data/features.ts`, by reference: the rail asks it of the person. `feature`
 * names that feature by its id where its need is one others share, as every `public` one is: the assistant reads from
 * it what the page shows (the actions the features table puts on it), whatever the item is labelled.
 *
 * `prefetch` asks for the item's page to be prefetched in full, its URL data with it, where Next's default prefetches the
 * route's App Shell only. It is for a destination whose content is its URL data (a document page under a dynamic
 * segment), and every visible such link makes a request of its own, so it is for one or two items.
 *
 * `under` is the href of an item in the same group that this item is a sub page of.
 */
export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string; workspace?: WorkspaceId; needs: Need; feature?: string; prefetch?: true; under?: string };
export type NavGroup = { label?: string; items: NavItem[] };

export const nav: NavGroup[] = [
  {
    items: [
      { href: '/', label: 'Home', icon: LayoutGrid, workspace: 'main', needs: FEATURES.home.needs },
      { href: '/members', label: 'Members', icon: UserRound, workspace: 'main', needs: FEATURES.members.needs },
      { href: '/settings', label: 'Settings', icon: Settings, workspace: 'main', needs: FEATURES.settings.needs, feature: 'settings' },
      { href: '/system', label: 'Design system', icon: Boxes, workspace: 'main', needs: FEATURES.system.needs, feature: 'system' },
      { href: '/system/start/start-a-dashboard', label: 'Docs', icon: FileText, workspace: 'main', needs: FEATURES.docs.needs, feature: 'docs', prefetch: true },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { href: '/business', label: 'Revenue', icon: CircleDollarSign, workspace: 'business', needs: FEATURES.revenue.needs },
      { href: '/customers', label: 'Customers', icon: Users, workspace: 'business', needs: FEATURES.customers.needs },
    ],
  },
  {
    label: 'Traffic',
    items: [
      { href: '/usage', label: 'Usage', icon: BarChart3, workspace: 'business', needs: FEATURES.usage.needs },
      { href: '/requests', label: 'Requests', icon: Activity, workspace: 'business', needs: FEATURES.requests.needs, under: '/usage' },
    ],
  },
  {
    items: [
      { href: '/engineering', label: 'Now', icon: Radio, workspace: 'engineering', needs: FEATURES.now.needs },
      { href: '/services', label: 'Services', icon: Gauge, workspace: 'engineering', needs: FEATURES.services.needs },
      { href: '/operations-tickets', label: 'Tickets', icon: Ticket, workspace: 'engineering', needs: FEATURES.tickets.needs },
      { href: '/tests', label: 'Tests', icon: FlaskConical, workspace: 'engineering', needs: FEATURES.tests.needs },
      { href: '/releases', label: 'Releases', icon: Rocket, workspace: 'engineering', needs: FEATURES.releases.needs },
      { href: '/keys', label: 'API keys', icon: KeyRound, workspace: 'engineering', needs: FEATURES.keys.needs },
    ],
  },
];

/**
 * What the rules behind a page's facts are handed (`src/lib/facts.ts`). A rule holds no figure of its own: a title or a
 * context that calls one passes these, so changing a value here changes what every page states.
 */
export const facts = {
  /** A day is steady when its p95 is under this many milliseconds and its error rate under this fraction. */
  band: { p95Under: 350, errorRateUnder: 0.01 },
  /** Requests a day whose first crossing is a fact, smallest first. */
  firsts: { requestsADay: [10_000_000, 25_000_000, 50_000_000] },
  /** Periods of history a record needs before it may be called one. */
  recordNeedsPeriods: 6,
  /** A customer is close to the next plan when it pays this share of what that plan's smallest customer pays. */
  nextPlanAt: 0.75,
  /** A customer paying this share of the revenue of the last 30 complete days is worth knowing across the company. */
  concentrationAt: 0.1,
} as const;

/**
 * What an address a person may not open draws, the product's choice and declared only here (`gate` in
 * `src/data/access.ts` reads it). `explain` draws the no-access page: the page's title, who can open it, who to ask and
 * one way out. `absent` draws exactly what an address that names nothing draws, the console's missing page titled
 * "Not found", so nothing on it names the page, a role or who to ask.
 */
export const refusal: 'explain' | 'absent' = 'explain';

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** The name as identifiers, for the sample's addresses, URLs and MCP tool names. They follow `app.name`. */
export const slug = toSlug(app.name);
export const workspaceSlug = `${slug}-${toSlug(app.workspace)}`;
/** `.example` is reserved for documentation, so sample addresses never point at someone's real domain. */
export const domain = `${slug}.example`;
export const toolPrefix = slug.replace(/-/g, '_');

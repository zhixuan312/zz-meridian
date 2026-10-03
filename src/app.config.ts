import {
  Activity, BarChart3, Boxes, FileText, Gauge, KeyRound, LayoutGrid, Settings, Users, type LucideIcon,
} from 'lucide-react';

/**
 * Everything that makes this dashboard yours, in one file. Rename the product, rewrite the navigation, pick an accent.
 * Adding a page is a route file plus a line in `nav`; the rail holds no route knowledge of its own.
 */
export const app = {
  /** The product name: the rail, the document title, the sign-in screen. */
  name: 'Relay',
  /** One line under the name in the rail: the workspace or environment. */
  workspace: 'Production',
  /** The accent preset the product ships with; a person can still change it in Settings. */
  accent: 'indigo' as const,
  /** Every date is shown in this zone, and every daily bucket is cut on its midnight. */
  timezone: 'UTC',
} as const;

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };
export type NavGroup = { label?: string; items: NavItem[] };

export const nav: NavGroup[] = [
  {
    items: [
      { href: '/', label: 'Overview', icon: LayoutGrid },
      { href: '/requests', label: 'Requests', icon: Activity },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Operate',
    items: [
      { href: '/health', label: 'Health', icon: Gauge, badge: '1' },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/keys', label: 'API keys', icon: KeyRound },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/system', label: 'Design system', icon: Boxes },
      { href: '/system/start/start-a-dashboard', label: 'Docs', icon: FileText },
    ],
  },
];

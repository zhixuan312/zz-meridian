/** The sample's workspace members: deterministic, dated relative to DEMO_NOW so the walk-through never drifts. */
import { domain } from '@/app.config';
import type { AddOn, MainRole } from '@/data/roles';
import { DEMO_NOW } from '@/system/fixtures/sample';

export const TEAMS = ['Engineering', 'Support', 'Sales', 'Design'] as const;
export const STATUSES = ['Active', 'Invited', 'Suspended'] as const;

export type Member = {
  id: string; name: string; email: string;
  role: MainRole; addOns: AddOn[]; team: (typeof TEAMS)[number]; status: (typeof STATUSES)[number];
  joined: string; lastActive: string | null;
};

const ago = (days: number) => new Date(DEMO_NOW.getTime() - days * 86_400_000).toISOString().slice(0, 10);

/** name, role, team, status, days since joining, days since last activity (null: never). */
const SEED: [string, Member['role'], Member['team'], Member['status'], number, number | null][] = [
  ['Maya Chen', 'Owner', 'Engineering', 'Active', 420, 0],
  ['Jonas Weber', 'Admin', 'Engineering', 'Active', 380, 0],
  ['Amara Okafor', 'Admin', 'Support', 'Active', 350, 1],
  ['Priya Nair', 'Member', 'Engineering', 'Active', 310, 0],
  ['Lucas Meyer', 'Member', 'Engineering', 'Active', 290, 2],
  ['Sofia Rossi', 'Member', 'Design', 'Active', 270, 3],
  ['Daniel Kim', 'Member', 'Sales', 'Active', 250, 1],
  ['Hannah Schmidt', 'Member', 'Support', 'Active', 230, 0],
  ['Omar Haddad', 'Member', 'Sales', 'Active', 210, 5],
  ['Elena Petrova', 'Admin', 'Design', 'Active', 200, 4],
  ['Tomas Novak', 'Member', 'Engineering', 'Active', 180, 9],
  ['Grace Liu', 'Viewer', 'Sales', 'Active', 160, 12],
  ['Alice Moreno', 'Viewer', 'Support', 'Active', 330, 94],
  ['Ravi Patel', 'Viewer', 'Support', 'Active', 300, 71],
  ['Noah Bernard', 'Viewer', 'Support', 'Active', 140, 18],
  ['Isabel Costa', 'Member', 'Support', 'Active', 120, 2],
  ['Yuki Tanaka', 'Member', 'Design', 'Active', 100, 6],
  ['Felix Andersson', 'Viewer', 'Engineering', 'Active', 90, 75],
  ['Chloe Dubois', 'Member', 'Sales', 'Suspended', 260, 140],
  ['Marcus Reed', 'Member', 'Engineering', 'Suspended', 220, 88],
  ['Nadia Karimi', 'Member', 'Support', 'Invited', 6, null],
  ['Leo Fischer', 'Viewer', 'Design', 'Invited', 4, null],
  ['Zoe Martin', 'Member', 'Sales', 'Invited', 2, null],
  ['Ben Carter', 'Member', 'Engineering', 'Active', 40, 0],
];

/** Add-ons, by member id: nobody carries one but Lucas Meyer, who manages the workspace's API keys. */
const ADD_ONS_BY_MEMBER: Record<string, AddOn[]> = { members_5: ['Key manager'] };

export const MEMBERS: Member[] = SEED.map(([name, role, team, status, joined, active], i) => ({
  id: `members_${i + 1}`,
  name,
  email: `${name.toLowerCase().replace(/ /g, '.')}@${domain}`,
  role,
  addOns: ADD_ONS_BY_MEMBER[`members_${i + 1}`] ?? [],
  team, status,
  joined: ago(joined),
  lastActive: active === null ? null : ago(active),
}));

/**
 * Members' shared context (decision 0011): who is in the workspace, with which role, and who has gone quiet, as both
 * agents read it.
 */
import type { Member } from '@/data/sample';
import { formatDate } from '@/lib/format-date';
import { listed, type Insight, type SharedContext } from '@/lib/shared-context';

const DAY = 86_400_000;
/** Days without activity after which a member counts as quiet: the question an owner asks before a seat audit. */
export const QUIET_DAYS = 60;

const count = <K extends string>(rows: Member[], key: (m: Member) => K) => Object.entries(rows.reduce<Record<string, number>>((a, m) => ({ ...a, [key(m)]: (a[key(m)] ?? 0) + 1 }), {})).map(([k, n]) => `${n} ${k}`).join(', ');

export function membersContext(rows: Member[], now: string): SharedContext {
  const at = Date.parse(now);
  const idle = (m: Member) => (m.lastActive ? Math.floor((at - Date.parse(m.lastActive)) / DAY) : null);
  const active = rows.filter((m) => m.status === 'Active');
  const quiet = active.filter((m) => (idle(m) ?? 0) >= QUIET_DAYS).sort((a, b) => (idle(b) ?? 0) - (idle(a) ?? 0));
  const invited = rows.filter((m) => m.status === 'Invited');
  const admins = active.filter((m) => m.role === 'Owner' || m.role === 'Admin');
  const insights: Insight[] = [];
  if (quiet.length) insights.push({ text: `${quiet.length} active ${quiet.length === 1 ? 'member has' : 'members have'} not been seen for ${QUIET_DAYS} days or more: ${listed(quiet, (m) => `${m.name} (${m.role}, ${m.team}, ${idle(m)} days)`, 'query_members finds them', 10)}.` });
  if (invited.length) insights.push({ text: `${invited.length} ${invited.length === 1 ? 'invitation is' : 'invitations are'} unanswered: ${listed(invited, (m) => `${m.name}, invited ${formatDate(m.joined)}`, 'query_members finds them', 10)}.` });
  insights.push({ text: `${admins.length} of ${active.length} active members can change the workspace (Owner or Admin): ${listed(admins, (m) => m.name, 'query_members finds them', 10)}.` });
  return {
    view: 'members',
    title: 'Members',
    address: '/members',
    scope: 'every member of this workspace',
    facts: [
      { label: 'Members', value: `${rows.length}: ${count(rows, (m) => m.status)}` },
      { label: 'Roles', value: count(rows, (m) => m.role), definition: 'Owner and Admin manage members and keys; Member uses the API; Viewer reads dashboards only.' },
      { label: 'Teams', value: count(rows, (m) => m.team) },
      { label: 'Everyone', value: listed(rows, (m) => `${m.name} (${m.role}, ${m.team}, ${m.status.toLowerCase()}, ${m.lastActive ? `seen ${idle(m) === 0 ? 'today' : `${idle(m)}d ago`}` : 'never seen'})`, 'query_members finds them') },
    ],
    insights,
    unknowns: ['"Last active" is the last sign-in to this console; it says nothing about a member\'s use of the API through a key.'],
  };
}

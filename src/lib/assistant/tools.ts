import { tool, type SingleToolApprovalFunction, type ToolSet, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { queryInput, visibleFields, type AnyCollection } from '@/lib/collection';

type Row = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rule = SingleToolApprovalFunction<any, any, any>;
type Change = { label: string; from: string; to: string };

const text = (v: unknown) => (v === null || v === undefined ? '—' : Array.isArray(v) ? v.join(', ') : String(v));
/** "API keys" stays, "Members" becomes "members". */
const lower = (label: string) => (/^.[A-Z]/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1));

/**
 * The assistant's tools for `collections`, and the rule that holds every change for the person's approval.
 * A rule writes the server's preview of the change to `writer` before the approval request goes out.
 */
export function assistantTools(collections: AnyCollection[], writer: UIMessageStreamWriter): { tools: ToolSet; toolApproval: Record<string, Rule> } {
  const tools: ToolSet = {};
  const toolApproval: Record<string, Rule> = {};

  for (const c of collections) {
    const hidden = (c.hidden ?? []) as string[];
    const strip = (r: Row) => Object.fromEntries(Object.entries(r).filter(([k]) => !hidden.includes(k)));
    const allowed = (op: 'create' | 'update' | 'remove') => c[op] && !c.pageOnly?.includes(op);
    const fields = visibleFields(c);

    tools[`query_${c.name}`] = tool({
      description: `Look up ${c.label.toLowerCase()}: ${c.description}`,
      inputSchema: queryInput(c),
      execute: async (input) => {
        const { rows, total } = await c.query(input);
        return { rows: rows.map(strip), total };
      },
    });

    /** The rows for `ids` in the order asked, or the ids the collection does not have. */
    const find = async (ids: string[]): Promise<{ rows: Row[] } | { missing: string[] }> => {
      const { rows } = await c.query({ where: [{ field: c.key, op: 'in', value: ids }] });
      const byId = new Map<string, Row>(rows.map((r: Row) => [String(r[c.key]), r]));
      const missing = ids.filter((id) => !byId.has(id));
      return missing.length ? { missing } : { rows: ids.map((id) => byId.get(id)!) };
    };
    const propose = (id: string, title: string, tone: 'neutral' | 'critical', changes: Change[]) => {
      writer.write({ type: 'data-proposal', id, data: { title, tone, changes } });
      return 'user-approval' as const;
    };
    const what = (rows: Row[]) => (rows.length === 1 ? c.title(rows[0]) : `${rows.length} ${lower(c.label)}`);

    if (allowed('create')) {
      tools[`create_${c.name}`] = tool({
        description: `Add a record to ${c.label.toLowerCase()}.`,
        inputSchema: fields,
        execute: (input) => c.create!(input),
      });
      toolApproval[`create_${c.name}`] = ((input: Row, { toolCallId }) =>
        propose(toolCallId, `Add ${c.title(input)}`, 'neutral', Object.entries(input).map(([label, v]) => ({ label, from: '—', to: text(v) })))) as Rule;
    }

    if (allowed('update')) {
      tools[`update_${c.name}`] = tool({
        description: `Change fields on one or more ${c.label.toLowerCase()} by id.`,
        inputSchema: z.object({ ids: z.array(z.string()).min(1), set: fields.partial() }),
        execute: ({ ids, set }) => c.update!(ids, set),
      });
      toolApproval[`update_${c.name}`] = (async ({ ids, set }: { ids: string[]; set: Row }, { toolCallId }) => {
        const found = await find(ids);
        if ('missing' in found) return { type: 'denied', reason: `No such id: ${found.missing.join(', ')}` };
        const keys = Object.keys(set);
        const changes = found.rows.flatMap((row) => keys.map((k) => ({ label: keys.length === 1 ? c.title(row) : `${c.title(row)} · ${k}`, from: text(row[k]), to: text(set[k]) })));
        return propose(toolCallId, `Change ${what(found.rows)}`, 'neutral', changes);
      }) as Rule;
    }

    if (allowed('remove')) {
      tools[`remove_${c.name}`] = tool({
        description: `Remove one or more ${c.label.toLowerCase()} by id.`,
        inputSchema: z.object({ ids: z.array(z.string()).min(1) }),
        execute: ({ ids }) => c.remove!(ids),
      });
      toolApproval[`remove_${c.name}`] = (async ({ ids }: { ids: string[] }, { toolCallId }) => {
        const found = await find(ids);
        if ('missing' in found) return { type: 'denied', reason: `No such id: ${found.missing.join(', ')}` };
        return propose(toolCallId, `Remove ${what(found.rows)}`, 'critical', found.rows.map((row) => ({ label: c.title(row), from: c.label, to: 'Removed' })));
      }) as Rule;
    }
  }
  return { tools, toolApproval };
}

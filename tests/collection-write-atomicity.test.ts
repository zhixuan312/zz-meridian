// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { arrayCollection } from '@/lib/collection';

type Row = { id: string; value: number; detail: { count: number }; computed?: unknown };
let serial = 0;
const initial: Row[] = [{ id: 'row_1', value: 1, detail: { count: 1 } }, { id: 'row_2', value: 2, detail: { count: 2 } }];
const collection = (derive: (row: Record<string, unknown>) => Partial<Row>) => arrayCollection<Row, 'id'>({
  name: `atomic_rows_${++serial}`, label: 'Rows', description: 'Atomic write regression.', key: 'id', title: (row) => row.id,
  fields: z.object({ value: z.number(), detail: z.object({ count: z.number() }) }),
  rows: initial, allow: ['create', 'update'], derived: ['computed'], derive,
});

describe('array collection commit boundary', () => {
  it('keeps every row, revision and listener unchanged when a later derivation fails', async () => {
    const c = collection((row) => {
      (row.detail as Row['detail']).count++;
      if (row.id === 'row_2') throw new Error('second derivation refused');
      return { computed: Number(row.value) * 2 };
    });
    const revision = c.revision!(), listener = vi.fn();
    const unsubscribe = c.subscribe!(listener);
    try {
      await expect(c.update!(['row_1', 'row_2'], { value: 5 })).rejects.toThrow('second derivation refused');
      expect((await c.query({})).rows).toEqual(initial);
      expect(c.revision!()).toBe(revision);
      expect(listener).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });

  it.each(['create', 'update'] as const)('does not commit a %s whose result cannot be returned as a copy', async (operation) => {
    const c = collection(() => ({ computed: () => 'not cloneable' }));
    const revision = c.revision!(), listener = vi.fn();
    const unsubscribe = c.subscribe!(listener);
    try {
      const result = operation === 'create' ? c.create!({ value: 3, detail: { count: 3 } }) : c.update!(['row_1'], { value: 3 });
      await expect(result).rejects.toThrow();
      expect(c.revision!()).toBe(revision);
      expect(listener).not.toHaveBeenCalled();
      expect((await c.query({})).rows).toEqual(initial);
    } finally { unsubscribe(); }
  });

  it('commits all staged rows and emits once when every derivation succeeds', async () => {
    const c = collection((row) => ({ computed: Number(row.value) * 2 }));
    const listener = vi.fn(), unsubscribe = c.subscribe!(listener);
    try {
      const result = await c.update!(['row_1', 'row_2'], { value: 7 });
      expect(result.map((row) => row.computed)).toEqual([14, 14]);
      expect(listener).toHaveBeenCalledTimes(1);
      result[0].detail.count = 999;
      expect((await c.query({})).rows[0].detail.count).toBe(1);
    } finally { unsubscribe(); }
  });
});

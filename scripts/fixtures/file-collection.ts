/**
 * A Collection over one JSON file, for the multi-process live test. Every process that opens the same file reads the
 * same rows, and `subscribe` hears only the writes made through this process's own collection: the shape of a shared
 * store whose change notifications do not cross processes.
 */
import fs from 'node:fs';
import { z } from 'zod';
import type { Collection, LiveEvent } from '../../src/lib/collection.ts';

export type Item = { id: string; name: string };

export function fileCollection(file: string): Collection<Item, 'id'> {
  const listeners = new Set<(event: LiveEvent) => void>();
  const read = (): Item[] => JSON.parse(fs.readFileSync(file, 'utf8')) as Item[];
  const write = (rows: Item[]) => {
    // Renamed into place, so a reader in the other process never sees half a file.
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(rows));
    fs.renameSync(`${file}.tmp`, file);
  };
  return {
    name: 'items',
    label: 'Items',
    description: 'Rows in a JSON file shared by several processes.',
    fields: z.object({ name: z.string() }),
    key: 'id',
    title: (row) => row.name,
    async query({ limit, offset = 0 }) {
      const rows = read();
      return { rows: rows.slice(offset, limit === undefined ? undefined : offset + limit), total: rows.length };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async create(input) {
      const rows = read();
      const row: Item = { id: `items_${rows.length + 1}`, name: String(input.name) };
      write([...rows, row]);
      for (const l of [...listeners]) l({ collection: 'items' });
      return row;
    },
  };
}

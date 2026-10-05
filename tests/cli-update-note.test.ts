// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dirtyNote } from '../cli/src/update.ts';

describe('dirtyNote', () => {
  it('counts one path in the singular', () => {
    expect(dirtyNote(1)).toBe('note: the git tree has uncommitted changes (1 path); a real update will refuse until they are committed (or pass --allow-dirty)');
  });
  it('counts several paths in the plural', () => {
    expect(dirtyNote(3)).toContain('(3 paths)');
  });
});

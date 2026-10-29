// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { manifestText } from '../cli/src/files.ts';

// Create, adopt, update's finalize and brand each wrote the manifest with their own copy of the sort, and finalize
// compares the file on disk with its own serialisation to tell an interrupted rename: the copies must agree byte for
// byte. localeCompare orders by the machine's collation, so two machines could write one manifest two ways.
describe('the manifest as it is written', () => {
  it('sorts its paths by code unit, whatever the locale', () => {
    const text = manifestText({ version: '1.0.0', route: 'create', brand: {}, files: { ab: '1', a_b: '2', aB: '3', 'a-b': '4', 'a.b': '5' } });
    expect(Object.keys(JSON.parse(text).files)).toEqual(['a-b', 'a.b', 'aB', 'a_b', 'ab']);
    expect(text.endsWith('}\n')).toBe(true);
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFlags } from '../cli/src/command-flags.ts';

// A mistyped or value-less flag ended the CLI with a Node stack trace (ERR_PARSE_ARGS_*), not a line the person can act on.
describe('a flag the CLI cannot read', () => {
  it('is an error message, never a throw', () => {
    expect(readFlags(['adopt', '--hexx', '#fff'])).toEqual({ error: expect.stringContaining("'--hexx'") });
    expect(readFlags(['create', 'acme', '--name'])).toEqual({ error: expect.stringContaining("'--name <value>'") });
  });
  it('reads the flags and positionals it knows', () => {
    expect(readFlags(['create', 'acme', '--name', 'Acme', '--no-install'])).toEqual({ values: { name: 'Acme', 'no-install': true }, positionals: ['create', 'acme'] });
  });
});

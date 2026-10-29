// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { curlOf } from '@/views/request';
import type { RequestRow } from '@/data/sample';

/** What a shell hands curl as each argument of the copied command, so a test reads the command as the shell will. */
const argv = (command: string) =>
  JSON.parse(execFileSync('sh', ['-c', `curl() { node -e 'console.log(JSON.stringify(process.argv.slice(1)))' -- "$@"; }; API_KEY=k; ${command}`], { encoding: 'utf8' })) as string[];

const row = { method: 'POST', route: '/v1/messages?stream=true&x=1' } as RequestRow;

describe('Copy as cURL', () => {
  it('hands curl the body exactly, quotes and whitespace inside its values included, and runs nothing it holds', () => {
    const body = JSON.stringify({ text: "it's  $(touch /tmp/pwned) `id`", n: 1 }, null, 2);
    const args = argv(curlOf(row, body));
    expect(JSON.parse(args[args.indexOf('-d') + 1])).toEqual(JSON.parse(body));
    expect(args).toContain('Authorization: Bearer k');
  });

  it('keeps an address with a query whole, and a body that is not JSON as it is', () => {
    const args = argv(curlOf(row, "a 'b'\nc"));
    expect(args.find((a) => a.startsWith('https://'))).toMatch(/\/v1\/messages\?stream=true&x=1$/);
    expect(args[args.indexOf('-d') + 1]).toBe("a 'b'\nc");
    expect(argv(curlOf(row, null))).not.toContain('-d');
  });
});

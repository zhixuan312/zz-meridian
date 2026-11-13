// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTRACT = path.join(ROOT, 'src/lib/app-contract.ts');

/** The diagnostics a probe file raises, type-checked with the repository's own compiler options. */
function diagnostics(source: string): string[] {
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, 'out', 'contract-probe-'));
  const file = path.join(dir, 'probe.ts');
  fs.writeFileSync(file, source);
  try {
    const config = ts.getParsedCommandLineOfConfigFile(path.join(ROOT, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
    const program = ts.createProgram([file], { ...config!.options, noEmit: true });
    return ts.getPreEmitDiagnostics(program).filter((d) => d.file?.fileName === file).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const app = (fields: string) => `import type { AppIdentity } from ${JSON.stringify(CONTRACT)};\nexport const app = { ${fields} } as const satisfies AppIdentity;\n`;
const FIELDS = "name: 'A', description: 'B', workspace: 'C', accent: 'indigo', timezone: 'UTC', user: { name: 'D', role: 'E' }";

describe('the application configuration meets one typed contract', () => {
  it('accepts an app with every field the contract names', () => {
    expect(diagnostics(app(`${FIELDS}, currency: 'USD'`))).toEqual([]);
  });

  it('refuses an app missing its currency, naming the field', () => {
    expect(diagnostics(app(FIELDS)).join('\n')).toMatch(/currency/);
  });
});

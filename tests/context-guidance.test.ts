// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BRIEF_TEMPLATE } from '../cli/src/context.ts';
import { BRIEF_GUIDANCE } from '@/lib/assistant/prompt';

describe('the brief guidance lines', () => {
  it('are the same in the CLI template and in the template code', () => {
    const lines = BRIEF_TEMPLATE.split('\n');
    for (const [section, line] of Object.entries(BRIEF_GUIDANCE)) {
      expect(lines[lines.indexOf(`## ${section}`) + 1], section).toBe(line);
    }
    expect(Object.keys(BRIEF_GUIDANCE)).toEqual(['Product', 'Users', 'Data', 'Decisions', 'Glossary']);
  });
});

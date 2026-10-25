// @vitest-environment node
// Named cli-* so the payload leaves it out: it is about the two copies of one guide this repository keeps.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/**
 * `docs/agents.md` is the guide for whoever works on the template; `skills/zz-meridian/references/agents.md` is the same
 * guide in the copy a project's agent reads, which marks a path that a `--product` brand deletes. The two drifted: the
 * skill's copy was missing the rule about `data-assistant="omit"`, the 409 a thread answers when the session changed
 * hands, the questions a view offers, and how `pnpm verify --full` walks the assistant. An adopter's agent read the older
 * one, and nothing failed. This is the test that keeps them one document.
 */
describe('the skill’s agent guide and the template’s', () => {
  it('are the same document, save the path markers and the sentence that explains them', () => {
    const doc = read('docs/agents.md');
    const skill = read('skills/zz-meridian/references/agents.md');
    const [head, ...rest] = skill.split('\n');
    // The skill's own opening sentence, which the template's guide has no use for.
    expect(rest[1]).toMatch(/^The rules for an agent in a Meridian product/);
    const body = [head, ...rest.slice(2)].join('\n');
    const bare = body.replace(/`(?:optional|example):([^`]+)`/g, '`$1`');
    expect(bare).toBe(doc);
  });

  it('marks a path a product may not have, so its own check finds nothing missing', () => {
    const skill = read('skills/zz-meridian/references/agents.md');
    // The template's guide names these plainly; in a product they may be gone, and `node scripts/check.ts` reads every
    // `optional:`/`example:` path as "may be absent" and every other one as "must exist".
    for (const p of ['docs/assistant.md', 'src/data/collections.ts', 'src/logic/tools.ts']) {
      expect(skill, p).toMatch(new RegExp('`(?:optional|example):' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`'));
    }
  });
});

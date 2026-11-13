import { describe, expect, it } from 'vitest';
import { PAYLOAD_EXCLUDE } from '../cli/scripts/build-payload.ts';

const ATLAS_ONLY = ['content.ts', 'hero.tsx', 'markdown.tsx', 'page-stage.tsx', 'atlas-shell.tsx', 'card-stage.tsx', 'preview-loaders.ts', 'preview-loading.tsx', 'strata.tsx', 'token-view.tsx', 'tokens-data.ts', 'registry.ts'].map((f) => `src/system/${f}`);

describe('the payload carries only what the routes read', () => {
  it('leaves out the docs, the decisions, the contributor guide, the card previews and the Atlas', () => {
    for (const p of ['docs/testing.md', 'decisions/0009-a-package-that-copies.md', 'CONTRIBUTING.md', 'src/components/ui/button/preview.tsx', 'app/system/(atlas)/page.tsx', ...ATLAS_ONLY]) {
      expect(PAYLOAD_EXCLUDE.test(p), p).toBe(true);
    }
  });

  it('keeps what a route or a project reads', () => {
    for (const p of ['CHANGELOG.md', 'README.md', 'AGENTS.md', 'src/components/ui/button/README.md', 'src/components/ui/button/index.tsx', 'src/system/fixtures/company.ts', 'journeys/workspaces.ts', 'scripts/check.ts', 'tests/setup.ts']) {
      expect(PAYLOAD_EXCLUDE.test(p), p).toBe(false);
    }
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { aliasesOf, canonicalImports } from '../cli/src/imports.ts';

describe('import specifiers in a common form', () => {
  const rel = 'src/components/patterns/metric-tile/index.tsx';
  it('reads the project aliases, with @meridian always', () => {
    expect([...aliasesOf('{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }')]).toEqual([['@meridian/', 'src/'], ['@/', 'src/']]);
    expect([...aliasesOf('{ "paths": { "@/*": ["./*"] } }')]).toEqual([['@meridian/', 'src/'], ['@/', '']]);
    expect([...aliasesOf(null)]).toEqual([['@meridian/', 'src/']]);
  });
  it('makes a relative, an aliased and a @meridian import of one module the same', () => {
    const a = aliasesOf('{ "paths": { "@/*": ["./src/*"] } }');
    const relative = canonicalImports(rel, "import { Badge } from '../../ui/badge/index';\nimport { cn } from '../../../lib/cn.ts';\n", a);
    expect(canonicalImports(rel, "import { Badge } from '@/components/ui/badge';\nimport { cn } from '@/lib/cn';\n", a)).toBe(relative);
    expect(canonicalImports(rel, "import { Badge } from '@meridian/components/ui/badge';\nimport { cn } from '@meridian/lib/cn';\n", a)).toBe(relative);
  });
  it('reads live JSONC path mappings with baseUrl, ignoring commented-out aliases', () => {
    const a = aliasesOf(`{
      "compilerOptions": {
        "baseUrl": "./src",
        "paths": { "@/*": ["./*"], },
        // "@/*": ["./wrong/*"]
      }
    }`);
    expect(a.get('@/')).toBe('src/');
    expect(canonicalImports(rel, "import { Badge } from '@/components/ui/badge';", a))
      .toBe(canonicalImports(rel, "import { Badge } from '../../ui/badge/index';", a));
  });
  it('still tells apart a file that changed anything else', () => {
    const a = aliasesOf(null);
    expect(canonicalImports(rel, "import { Badge } from '../../ui/badge';\nconst x = 1;\n", a)).not.toBe(canonicalImports(rel, "import { Badge } from '../../ui/badge';\nconst x = 2;\n", a));
    expect(canonicalImports(rel, "import { a } from 'react';\n", a)).toBe("import { a } from 'react';\n");
  });

  it.each([
    ["export const text = \"from '../../ui/badge/index'\";", "export const text = \"from '@/components/ui/badge'\";"],
    ["// import '../../ui/badge/index'", "// import '@/components/ui/badge'"],
    ["export const text = `import '../../ui/badge/index'`;", "export const text = `import '@/components/ui/badge'`;"],
  ])('preserves non-import edits instead of equating %s with import syntax', (before, after) => {
    const a = aliasesOf('{ "paths": { "@/*": ["./src/*"] } }');
    expect(canonicalImports(rel, before, a)).not.toBe(canonicalImports(rel, after, a));
  });
});

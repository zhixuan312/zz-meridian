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
  it('still tells apart a file that changed anything else', () => {
    const a = aliasesOf(null);
    expect(canonicalImports(rel, "import { Badge } from '../../ui/badge';\nconst x = 1;\n", a)).not.toBe(canonicalImports(rel, "import { Badge } from '../../ui/badge';\nconst x = 2;\n", a));
    expect(canonicalImports(rel, "import { a } from 'react';\n", a)).toBe("import { a } from 'react';\n");
  });
});

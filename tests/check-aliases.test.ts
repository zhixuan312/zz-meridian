import { describe, expect, it } from 'vitest';
import { aliasesOf, importTarget } from '../scripts/lib/aliases.ts';

describe('the import aliases the checks resolve', () => {
  it('ignores commented paths and resolves live paths against baseUrl', () => {
    const a = aliasesOf(`{
      "compilerOptions": {
        "baseUrl": "./app-code",
        // "paths": { "@/*": ["./retired/*"] },
        "paths": { "@/*": ["./live/*"], "@meridian/*": ["../src/*"], },
      },
    }`);
    expect(importTarget('app/page.tsx', '@/orders', a)).toBe('app-code/live/orders');
    expect(importTarget('app/page.tsx', '@meridian/lib/format', a)).toBe('src/lib/format');
  });

  it('does not turn a commented-out alias into a live path', () => {
    const a = aliasesOf('{ "compilerOptions": { /* "paths": { "@/*": ["./old/*"] } */ } }');
    expect(importTarget('app/page.tsx', '@/orders', a)).toBe('src/orders');
  });

  it("are the template's: @/ is src/", () => {
    const a = aliasesOf('{ "compilerOptions": { "paths": {\n  "@/*": [\n    "./src/*"\n  ]\n} } }');
    expect(importTarget('app/page.tsx', '@/data/orders', a)).toBe('src/data/orders');
  });
  it("are an adopted project's: @/ is the team's root and @meridian/ is src/", () => {
    const a = aliasesOf('{ "compilerOptions": { "paths": { "@/*": ["./*"], "@meridian/*": ["./src/*"] } } }');
    expect(importTarget('app/page.tsx', '@meridian/components/ui/button', a)).toBe('src/components/ui/button');
    expect(importTarget('app/page.tsx', '@/lib/api', a)).toBe('lib/api');
  });
  it('fall back to @/ as src/ without paths, and leave packages alone', () => {
    const a = aliasesOf(null);
    expect(importTarget('src/views/x.tsx', '@/lib/format', a)).toBe('src/lib/format');
    expect(importTarget('src/views/x.tsx', './y', a)).toBe('src/views/y');
    expect(importTarget('src/views/x.tsx', 'react', a)).toBeNull();
  });
});

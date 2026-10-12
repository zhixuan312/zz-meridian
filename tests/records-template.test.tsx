import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Records } from '@/components/templates/records';

const DIR = path.resolve(import.meta.dirname, '../src/components/templates/records');

describe('the records template', () => {
  it('arranges the summary tiles over the records, in that order, and marks itself', () => {
    const { container } = render(
      <Records summary={[<p key="a">Customers</p>, <p key="b">Spend</p>]}>
        <table><caption>Customers</caption></table>
      </Records>,
    );
    const root = container.querySelector('[data-template="records"]');
    expect(root).not.toBeNull();
    const tiles = root!.querySelector('[data-split="tiles"]');
    const table = root!.querySelector('table');
    expect(tiles).not.toBeNull();
    expect(table).not.toBeNull();
    expect(tiles!.children.length).toBe(2);
    expect(tiles!.textContent).toBe('CustomersSpend');
    expect(tiles!.compareDocumentPosition(table!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws no summary row when there is nothing to summarise', () => {
    const { container } = render(<Records><table><caption>API keys</caption></table></Records>);
    expect(container.querySelector('[data-template="records"] [data-split="tiles"]')).toBeNull();
    expect(container.querySelector('[data-template="records"] table')).not.toBeNull();
  });

  it('knows nothing of the product: outside its preview it imports no data, view, system or config module', () => {
    const files = fs.readdirSync(DIR).filter((f) => /\.tsx?$/.test(f) && f !== 'preview.tsx');
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(fs.readFileSync(path.join(DIR, f), 'utf8'), f).not.toMatch(/from '@\/(data|views|system|app\.config)/);
  });
});

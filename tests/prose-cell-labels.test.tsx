import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Prose } from '@/components/patterns/prose';

const DOC = `| Choice | Chosen | Rejected because |
|---|---|---|
| Store | **Postgres** | the queue needs order |
| Cache | none | |

| A | \`B\` |
|---|---|
| 1 | 2 | 3 |`;

describe('Prose names each body cell\'s column (#75)', () => {
  test('writes the column heading on every body cell, per table, as plain text', () => {
    const { container } = render(<Prose>{DOC}</Prose>);
    const [first, second] = [...container.querySelectorAll('table')];
    expect([...first.querySelectorAll('tbody td')].map((td) => td.getAttribute('data-label'))).toEqual(['Choice', 'Chosen', 'Rejected because', 'Choice', 'Chosen', 'Rejected because']);
    expect([...second.querySelectorAll('tbody td')].map((td) => td.getAttribute('data-label'))).toEqual(['A', 'B']);
    expect(container.querySelectorAll('th[data-label]')).toHaveLength(0);
  });

  test('stack makes each table\'s frame the container its rows stack in', () => {
    const plain = render(<Prose>{DOC}</Prose>);
    expect(plain.container.querySelector('.\\@container')).toBeNull();
    plain.unmount();
    const { container } = render(<Prose stack>{DOC}</Prose>);
    expect(container.querySelectorAll('.\\@container > table')).toHaveLength(2);
    expect(container.querySelector('tbody td')).toHaveAttribute('data-label', 'Choice');
  });
});

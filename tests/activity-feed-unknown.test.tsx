import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityFeed } from '@/components/patterns/activity-feed';

const now = new Date('2026-10-19T12:00:00Z');
const at = '2026-10-19T11:00:00Z';

describe('an activity feed event whose actor the record does not hold (#68)', () => {
  it('draws an empty mark with no initials, and the line reads the product\'s words', () => {
    const { container } = render(<ActivityFeed events={[{ id: '1', at, actor: 'Someone not recorded', unknown: true, verb: 'issued a token for', object: 'x' }]} now={now} />);
    const mark = container.querySelector('[data-actor-unknown]');
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent(/^$/);
    expect(container.querySelector('li')).not.toHaveTextContent(/\bSN\b/);
    expect(container.querySelector('p')).toHaveTextContent(/^Someone not recorded issued a token for x$/);
  });
  it('still draws a known person\'s initials', () => {
    const { container } = render(<ActivityFeed events={[{ id: '1', at, actor: 'Ada Lovelace', verb: 'resolved', object: 'x' }]} now={now} />);
    expect(container.querySelector('[data-actor-unknown]')).toBeNull();
    expect(container.querySelector('li')).toHaveTextContent(/^AL/);
  });
});

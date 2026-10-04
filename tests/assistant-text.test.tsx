import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssistantText } from '@/components/patterns/assistant/text';

/** The shape of the reply every model this template has been pointed at actually sends. */
const MARKDOWN = [
  '**Traffic** this week, in short:',
  '',
  '- requests are up **12%**',
  '- errors are flat',
  '',
  '| Metric | Value |',
  '| --- | --- |',
  '| Requests | `1204` |',
].join('\n');

describe('AssistantText', () => {
  it('renders the model\'s markdown as elements, not as the characters that made them', () => {
    const { container } = render(<AssistantText text={MARKDOWN} />);
    const block = container.querySelector('[data-assistant-text]');
    expect(block).not.toBeNull();
    expect(block!.querySelectorAll('li')).toHaveLength(2);
    expect(block!.querySelector('strong')).toHaveTextContent('Traffic');
    expect(block!.querySelector('table')).not.toBeNull();
    expect(block!.querySelector('code')).toHaveTextContent('1204');
    // The markup characters are gone: a panel that showed them is the bug this holds shut.
    expect(block!.textContent).not.toContain('**');
    expect(block!.textContent).not.toContain('| ---');
  });

  it('stays safe for an answer nobody vetted', () => {
    const { container } = render(
      <AssistantText text={"<script>alert('x')</script>\n\n[run](javascript:alert(1))\n\n![pixel](https://elsewhere.example/p.png)"} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.queryByRole('link', { name: 'run' })).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('pixel')).toBeInTheDocument();
  });
});

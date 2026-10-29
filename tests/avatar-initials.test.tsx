import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from '@/components/ui/avatar';

const shown = (name: string, src?: string) => render(<Avatar name={name} src={src} />).container.firstElementChild as HTMLElement;

describe('an avatar', () => {
  it('takes the initials of the words, whatever spaces surround them', () => {
    expect(shown(' Maya  Chen ').textContent).toBe('MC');
  });
  it('takes a whole character, never half of one', () => {
    expect(shown('😀 Ana').textContent).toBe('😀A');
    expect(shown('𝒜lex Ng').textContent).toBe('𝒜N');
  });
  it('shows its picture, and the initials when the picture fails to load', () => {
    const a = shown('Maya Chen', '/missing.png');
    const img = a.querySelector('img')!;
    expect(img).toBeTruthy();
    act(() => { fireEvent.error(img); });
    expect(a.querySelector('img')).toBeNull();
    expect(a.textContent).toBe('MC');
  });
});

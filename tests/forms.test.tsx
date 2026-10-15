import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';

/** Server actions read a native form: Select and Checkbox must post their values through hidden native controls. */
describe('form posting', () => {
  it('posts a Select and a Checkbox by name inside a form', () => {
    const { container } = render(
      <form>
        <Select name="plan" defaultValue="scale" options={[{ value: 'starter', label: 'Starter' }, { value: 'scale', label: 'Scale' }]} aria-label="Plan" />
        <Checkbox name="notify" defaultChecked label="Notify me" />
      </form>,
    );
    const data = new FormData(container.querySelector('form')!);
    expect(data.get('plan')).toBe('scale');
    expect(data.get('notify')).toBe('on');
  });
});

/**
 * A Field marks the control it wraps as required, and its contract with that control is `aria-required` — the
 * attribute, not a `required` prop. A Select dropped the attribute on the floor, so `<Field required>` around one drew
 * the asterisk beside its label and announced nothing: a screen reader was told the field was optional.
 */
describe('a required control inside a Field', () => {
  it('is announced as required when the control is a Select', () => {
    const { container } = render(
      <Field label="Plan" required>
        {(p) => <Select {...p} defaultValue="scale" options={[{ value: 'starter', label: 'Starter' }, { value: 'scale', label: 'Scale' }]} />}
      </Field>,
    );
    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).not.toBeNull();
    expect(trigger!.getAttribute('aria-required')).toBe('true');
    expect(container.querySelector('label')!.textContent).toContain('Plan');
  });
});

import { Slot } from 'radix-ui';
import { cloneElement, forwardRef, isValidElement } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};
const SIZE: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

const ignorePress: MouseEventHandler<HTMLElement> = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the child (a link) with the button's look. */
  asChild?: boolean;
  /** An icon before the label. */
  icon?: ReactNode;
  /** An icon after the label; a forward arrow moves 2px on hover. */
  trailing?: ReactNode;
  /** Takes the icon's place with a spinner, at the icon's own size, and ignores presses: it stays focusable (`aria-disabled`), so a focused button that turns busy keeps the person's place. */
  busy?: boolean;
  block?: boolean;
};

/** A button starts one action. One primary per view; every other action is secondary or ghost. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', asChild, icon, trailing, busy, block, className, children, disabled, onClick, onClickCapture, ...rest },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  const blocked = disabled || busy;
  const content = asChild ? (
    blocked && isValidElement<HTMLAttributes<HTMLElement>>(children)
      ? cloneElement(children, {
          // Slot composes the child's handler first, so replace its capture handler while unavailable.
          onClickCapture: ignorePress,
          'aria-disabled': true,
          'aria-busy': busy || children.props['aria-busy'] || rest['aria-busy'],
          tabIndex: disabled ? -1 : (children.props.tabIndex ?? rest.tabIndex),
        })
      : children
  ) : (
    <>
      {busy ? <Spinner size={size} label={null} /> : icon}
      {children}
      {trailing ? <span className="transition-transform duration-(--dur-hover) ease-out group-hover/btn:translate-x-0.5">{trailing}</span> : null}
    </>
  );
  return (
    <Comp
      {...rest}
      ref={ref}
      type={asChild ? undefined : (rest.type ?? 'button')}
      // Busy is not disabled: a disabled control loses focus, so a Retry that turns busy from a refetch would send the
      // keyboard back to the top of the page. It stays in the tab order and drops the press, a submit's included.
      disabled={disabled}
      aria-disabled={blocked || rest['aria-disabled'] || undefined}
      aria-busy={busy || rest['aria-busy'] || undefined}
      onClick={blocked ? ignorePress : onClick}
      onClickCapture={blocked ? ignorePress : onClickCapture}
      className={cn(
        // The frame is `.btn` (src/styles/base.css): the same on every button, so it is not repeated in each class list.
        'group/btn press hit btn',
        // A busy button is working, not unavailable: it keeps its colour, its shadow and its place, and the spinner is
        // the answer. Only a button nobody may press greys out.
        !busy && 'disabled:opacity-45 disabled:shadow-none aria-disabled:opacity-45 aria-disabled:shadow-none',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
    >
      {content}
    </Comp>
  );
});

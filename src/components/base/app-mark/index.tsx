import { cn } from '@/lib/cn';

/**
 * The product's mark. The template ships a neutral one: an accent tile holding a meridian, a trend crossed by the
 * line that reads it. Replace the SVG with your logo; keep the size steps (20, 24, 28, 32) and the decorative alt.
 */
export function AppMark({ size = 24, className }: { size?: 20 | 24 | 28 | 32; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={cn('shrink-0', className)}>
      <rect width="24" height="24" rx="6.5" fill="var(--accent)" />
      <rect width="24" height="24" rx="6.5" fill="url(#am-sheen)" />
      <path d="M4.5 15.5 8.2 11.6l3.1 2.4 4.2-5.6 4 3.6" fill="none" stroke="var(--on-accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 4.6v14.8" stroke="var(--on-accent)" strokeOpacity=".55" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="15.5" cy="8.4" r="1.9" fill="var(--on-accent)" />
      <defs>
        <linearGradient id="am-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--on-accent)" stopOpacity=".18" />
          <stop offset="1" stopColor="var(--on-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

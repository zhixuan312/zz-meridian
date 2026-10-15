/**
 * Where a data URL points, for the one decision that has to be right before anything starts: whether the presses and the
 * walk-throughs may run against it. `scripts/verify.ts` refuses a backend that is not this machine, because by the time
 * a press lands the damage is done.
 */

/** Can this hostname only be this machine — or a name that can only resolve inside it? */
export function isLocalHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '::1' || h === '0.0.0.0') return true;
  if (/^127\./.test(h)) return true;
  // A name with no dot cannot be a public address: a compose service (`postgres`), a container name, a bare hostname.
  return !h.includes('.');
}

/**
 * The host a data URL names, or null when the value is not something this can judge (the app fails on it long before a
 * press lands).
 *
 * Most values are read by `URL`. Two shapes are not, and both matter here because getting them wrong is the difference
 * between refusing a backend and writing to it:
 *
 * - A value written without a scheme parses with its first segment as the *protocol* and no host at all —
 *   `db.prod.example.com:5432/app`. An empty host is a name with no dot, which `isLocalHost` would call local.
 * - A value whose first segment is not a valid protocol at all throws — `10.20.30.40:5432/app`, any bare IP.
 *
 * Both fall back to reading the authority by hand. A value that is not host-shaped (it has a space, say) is null.
 */
export function dataHost(value: string): string | null {
  const byHand = (): string | null => {
    const authority = value.split(/[/?#]/)[0].replace(/:\d+$/, '');
    return /^[A-Za-z0-9._:[\]-]+$/.test(authority) ? authority : null;
  };
  try {
    return new URL(value).hostname || byHand();
  } catch {
    return byHand();
  }
}

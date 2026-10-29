import type { JSX } from 'react';
import type { Refusal } from '@/data/access';

/**
 * The one place a refusal becomes a screen. `gate` answers with a descriptor — what is withheld, which feature, what
 * chrome — because the data layer draws nothing; a page hands that descriptor here and returns the result.
 *
 * The navigation is read here, not carried on the descriptor: `navOf` is a view module's, and a data layer that
 * computed it would be drawing again. Neither kind throws `notFound()`, for the reason `MissingPage` gives.
 *
 * Both screens are imported when they are drawn rather than when this module loads, because a page a person may open
 * never draws one: a static import here would put a refusal's markup and its empty state into the first load of every
 * one of the fifteen gated pages, and it put 32 KiB there when it did. A refusal is a cold path; a page that is allowed
 * is the one that must stay light.
 */
export async function RefusalScreen(refusal: Refusal): Promise<JSX.Element> {
  if (refusal.kind === 'absent') {
    const { MissingPage } = await import('@/views/missing-page');
    return <MissingPage withheld={refusal.withheld} />;
  }
  const { NoAccess } = await import('@/views/no-access');
  return NoAccess({ feature: refusal.feature, access: refusal.access });
}

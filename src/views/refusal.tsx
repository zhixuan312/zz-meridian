import type { JSX } from 'react';
import type { Refusal } from '@/data/access';
import { MissingPage } from '@/views/missing-page';
import { NoAccess } from '@/views/no-access';

/**
 * The one place a refusal becomes a screen. `gate` answers with a descriptor — what is withheld, which feature, what
 * chrome — because the data layer draws nothing; a page hands that descriptor here and returns the result.
 *
 * The navigation is read here, not carried on the descriptor: `navOf` is a view module's, and a data layer that
 * computed it would be drawing again. Neither kind throws `notFound()`, for the reason `MissingPage` gives.
 */
export async function RefusalScreen(refusal: Refusal): Promise<JSX.Element> {
  if (refusal.kind === 'absent') return <MissingPage withheld={refusal.withheld} />;
  return await NoAccess({ feature: refusal.feature, access: refusal.access });
}

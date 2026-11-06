/**
 * The moves a ticket may take, in one place. The page offers them in its menu and the boundary refuses any other, so a
 * second copy in either would let the menu show a move the boundary rejects, or hide one it allows.
 *
 * It sits in `src/lib/` because both layers may import it: a view takes no value from `src/data/` but the five
 * vocabulary modules, and the data layer is where the rule is enforced.
 */
export const TICKET_STEPS = { open: ['waiting', 'closed'], waiting: ['open', 'closed'], closed: ['open'] } as const;

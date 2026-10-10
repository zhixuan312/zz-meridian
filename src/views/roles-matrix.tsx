import { Check } from 'lucide-react';
import { CardHeader } from '@/components/ui/card';
import { ACTIONS, FEATURES } from '@/data/features';
import { ADD_ONS, MAIN_ROLES, whoCan, type AddOn, type MainRole } from '@/data/roles';
import type { ProtectedNeed } from '@/lib/collection';

/**
 * The Roles & access matrix: which role may reach each page and run each action, read off the same tables the gates
 * read. The columns, the rows and every tick are generated — no role is listed here and no grant is written here — so
 * the table a person reads and the answer a page gives cannot disagree: editing `src/data/roles.ts` or
 * `src/data/features.ts` edits this section. The legend's two sentences are the only prose.
 */

/** Every column, in the table's own order: the four main roles, then the add-ons. */
const COLUMNS: readonly (MainRole | AddOn)[] = [...MAIN_ROLES, ...ADD_ONS];
/** One row: what a person meets on the page, the need behind it, and the columns whose own grants satisfy that need. */
type Row = { label: string; needs: ProtectedNeed; ticked: (MainRole | AddOn)[] };
/** The section's name, so its heading and its label cannot drift apart. */
const TITLE = 'Roles & access';

/**
 * The matrix's rows, in the tables' own order: every feature a grant guards — a `public` one is guarded by nothing, so
 * it has no row to show — then every action, each carrying the columns `whoCan` answers with. A column is ticked where
 * that role's own grants satisfy the whole need, which is the same test the gate behind the page makes.
 */
export function matrixRows(): Row[] {
  const features = Object.values(FEATURES).flatMap((feature) => (feature.needs === 'public' ? [] : [{ label: feature.title, needs: feature.needs }]));
  const actions = Object.values(ACTIONS).map((action) => ({ label: action.label, needs: action.needs }));
  return [...features, ...actions].map((row) => ({ ...row, ticked: whoCan(row.needs) }));
}

/** One cell: a tick where the column satisfies the need, a quiet dash where it does not, and the word either way. */
function Tick({ on }: { on: boolean }) {
  return on ? (
    <>
      <Check aria-hidden className="inline size-4 text-accent-ink" />
      <span className="sr-only">Allowed</span>
    </>
  ) : (
    <>
      <span aria-hidden className="text-ink-3">–</span>
      <span className="sr-only">Not allowed</span>
    </>
  );
}

/**
 * The section as the Members page shows it. It sits inside that page's own `<Stack>` and takes the page's gate with it,
 * so it asks nothing a second time; at a phone's width the table scrolls inside its own frame rather than widening the
 * page, and the fade at the cut edge says there is more this way.
 */
export function RolesMatrix() {
  const rows = matrixRows();
  return (
    <section aria-label={TITLE} className="card min-w-0 overflow-hidden">
      <CardHeader title={TITLE} description="Which role may reach each page and run each action, read off the tables the console asks." />
      <div className="scroll-fade-x overflow-x-auto border-t border-line">
        <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Roles and what each may reach or do</caption>
          <thead>
            <tr>
              <th scope="col" className="h-9 border-b border-line bg-surface-sunk px-4 text-left text-xs font-medium text-ink-3">
                Page or action
              </th>
              {COLUMNS.map((role) => (
                <th key={role} scope="col" className="h-9 border-b border-line bg-surface-sunk px-4 text-center text-xs font-medium whitespace-nowrap text-ink-3">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="[&>*]:border-b [&>*]:border-line last:[&>*]:border-0">
                <th scope="row" className="h-(--row-height) px-4 text-left font-medium whitespace-nowrap text-ink">
                  {row.label}
                </th>
                {COLUMNS.map((role) => (
                  <td key={role} className="h-(--row-height) px-4 text-center">
                    <Tick on={row.ticked.includes(role)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-line px-(--card-pad) py-3">
        <p className="t-caption max-w-[72ch] text-pretty">
          A column is ticked where its own grants satisfy the whole need. An add-on column is the add-on alone, and an add-on adds to a main role rather than replacing it: a member&apos;s grants are their role&apos;s plus every add-on they hold.
        </p>
        <p className="t-caption max-w-[72ch] text-pretty">
          The member rules hold on top of this table: at least one active Owner must remain, nobody may change their own role or add-ons or suspend or remove themselves, and a person who may not change the workspace may not change or remove an Owner.
        </p>
      </div>
    </section>
  );
}

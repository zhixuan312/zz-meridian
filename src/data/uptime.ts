/**
 * The sample's one derived answer: each service's uptime, worked out from the days its own record keeps,
 * rather than read from the uptime stored beside them. The days are a field of the service's row; the `days` collection
 * is the company's daily request totals and has nothing to do with a service's uptime.
 *
 * Its source is the services collection, read through `readAllInScope` on the scope the answer is keyed by: the
 * revision that read answers is what makes an unchanged source recognisable without building again, a write to any
 * other collection never re-stamps this answer, and the build reads the same tenant's records the slot is named for.
 */
import type { Service } from '@/components/patterns/status-list';
import { resolveAccess } from '@/data/access';
import { readAllInScope } from '@/data/read';
import { uptimeOf } from '@/system/fixtures/sample';
import { derivedAnswer, type DerivedAnswer } from './derived';

/** Each service's uptime over its own days, by the service's name. */
type ServiceUptimes = Record<string, number>;

/** A service's row as the collection keeps it: the name it is answered under, and the days the uptime is worked from. */
type ServiceRow = Pick<Service, 'name' | 'days'>;

const NAME = 'services.uptime';

/**
 * Every service's uptime, built from the services collection through `derivedAnswer`: `data` maps each service's name
 * to the uptime over its own days, and `sourceRevision` names the collection revision it was built from. `data` is
 * null when the first build threw, and the read that needs a figure falls back rather than inventing one.
 */
export async function serviceUptime(): Promise<DerivedAnswer<ServiceUptimes>> {
  // The scope the answer is built for: its tenant names the slot, and its own reads are made under it.
  const scope = await resolveAccess();
  // The rows this call's `source` answered, so `build` works the state its revision names rather than reading again.
  // Held per call rather than in the module: two reads of one answer share a build, and the loser of that race must not
  // be able to swap the rows under the winner's build.
  let rows: ServiceRow[] = [];
  return derivedAnswer({
    name: NAME,
    scope,
    async source() {
      const read = await readAllInScope(scope, 'services', { sort: { field: 'order', dir: 'asc' } });
      rows = read.rows as unknown as ServiceRow[];
      // A collection answers its revision; one that does not is identified by the moment its state was observed.
      return { revision: read.revision ?? read.observedAt };
    },
    async build() {
      return Object.fromEntries(rows.map((service) => [service.name, uptimeOf(service.days)]));
    },
  });
}

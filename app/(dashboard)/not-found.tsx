import { MissingPage } from '@/views/missing-page';
import { NOT_FOUND } from '@/views/not-found';

export const metadata = { title: NOT_FOUND.title };

/** Anything under the console that calls notFound(): the same in-place screen a missing record shows. */
export default function DashboardNotFound() {
  return <MissingPage />;
}

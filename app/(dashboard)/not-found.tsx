import { MissingPage } from '@/views/missing-page';

export const metadata = { title: 'Not found' };

/** Anything under the console that calls notFound(): the same in-place screen a missing record shows. */
export default function DashboardNotFound() {
  return <MissingPage />;
}

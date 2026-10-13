import { LoadingPage, TilesSkeleton } from '@/components/patterns/page-loading';

/** Revenue on its way: its three figures. */
export default function RevenueLoading() {
  return (
    <LoadingPage name="revenue" title="Revenue">
      <TilesSkeleton count={3} />
    </LoadingPage>
  );
}

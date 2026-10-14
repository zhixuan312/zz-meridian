import { LoadingPage, TilesSkeleton } from '@/components/patterns/page-loading';

/** Revenue on its way: the block its title's sentence will take, and its three figures. */
export default function RevenueLoading() {
  return (
    <LoadingPage name="revenue" title="Revenue" sentence>
      <TilesSkeleton count={3} />
    </LoadingPage>
  );
}

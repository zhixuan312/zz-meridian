'use client';

import DashboardError from '@/../app/(dashboard)/error';

const error = Object.assign(new Error('The data service did not answer in 10 seconds.'), { digest: '2610-4f3a' });

export default function ErrorState() {
  return <DashboardError error={error} reset={() => location.reload()} />;
}

import { notFound } from 'next/navigation';
import { CARDS } from '@/system/registry';
import { PreviewStage } from './stage';

/** One card's preview, bare: what the Atlas frames, and what screenshots and audits open. ?theme=dark&accent=iris&density=compact */
export default async function Page({ params }: { params: Promise<{ section: string; card: string }> }) {
  const { section, card } = await params;
  const c = CARDS.find((x) => x.section === section && x.id === card);
  if (!c || !c.Preview) notFound();
  return <PreviewStage id={`${section}/${card}`} />;
}

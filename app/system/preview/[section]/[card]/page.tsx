import { notFound } from 'next/navigation';
import { PREVIEW_KEYS } from './keys';
import { PreviewStage } from './stage';

export function generateStaticParams() {
  return PREVIEW_KEYS.map((key) => {
    const [section, card] = key.split('/');
    return { section, card };
  });
}

/** One card's preview, bare: what the Atlas frames, and what screenshots and audits open. ?theme=dark&accent=indigo&density=compact */
export default async function Page({ params }: { params: Promise<{ section: string; card: string }> }) {
  const { section, card } = await params;
  const id = `${section}/${card}`;
  if (!PREVIEW_KEYS.includes(id)) notFound();
  return <PreviewStage id={id} />;
}

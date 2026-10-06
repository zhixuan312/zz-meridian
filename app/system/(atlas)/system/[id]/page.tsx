import { ReadingPage, entriesOf, entryMetadata } from '../../_article';

export const generateStaticParams = () => entriesOf('system');

export const generateMetadata = ({ params }: { params: Promise<{ id: string }> }) => entryMetadata('system', params);

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ReadingPage section="system" params={params} />;
}

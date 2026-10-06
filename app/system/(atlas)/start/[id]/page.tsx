import { ReadingPage, entriesOf, entryMetadata } from '../../_article';

export const generateStaticParams = () => entriesOf('start');

export const generateMetadata = ({ params }: { params: Promise<{ id: string }> }) => entryMetadata('start', params);

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ReadingPage section="start" params={params} />;
}

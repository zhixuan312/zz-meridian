import { ReadingPage, entriesOf, entryMetadata } from '../../_article';

export const generateStaticParams = () => entriesOf('products');

export const generateMetadata = ({ params }: { params: Promise<{ id: string }> }) => entryMetadata('products', params);

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ReadingPage section="products" params={params} />;
}

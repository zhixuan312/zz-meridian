import { SignInPanel } from './panel';
import { SampleFooter } from '@/views/sample-footer';
import { Standalone } from '@/views/standalone';
import { Meridian } from '@/components/charts/meridian';
import { TrendChart } from '@/components/charts/trend-chart';
import { formatCompact } from '@/lib/format';
import { demoSeries } from '@/data/sample';
import { app } from '@/app.config';

export const metadata = { title: 'Sign in' };

/** Before the shell: the one screen a visitor sees before they are anyone, with the product's signature as its proof. */
export default function SignInPage() {
  const days = demoSeries('30d').current;
  return (
    <Standalone
      footer={<SampleFooter />}
      kicker={`${app.name} · Console`}
      sentence="Know your API before your customers do."
      lead="Traffic, latency, spend and health for every endpoint, on your desk, on your phone, and inside the assistant you already use."
      aside={<SignInPanel />}
    >
      {/* The proof is the signature itself: point at a day and the line reads it, as every chart in the console does. */}
      <figure className="mt-12 max-w-xl rounded-xl border border-line bg-surface/60 p-5 backdrop-blur-md max-lg:hidden">
        <figcaption className="flex items-baseline gap-3">
          <span className="t-kicker">Requests · last 30 days</span>
          <span className="t-num ml-auto text-sm font-semibold text-ink">{formatCompact(days.reduce((a, d) => a + d.requests, 0))}</span>
        </figcaption>
        <Meridian dates={days.map((d) => d.date)}>
          <TrendChart height={128} label="Requests per day, last 30 days" dates={days.map((d) => d.date)} series={[{ key: 'requests', label: 'Requests', values: days.map((d) => d.requests), kind: 'area' }]} className="mt-3" />
        </Meridian>
      </figure>
    </Standalone>
  );
}

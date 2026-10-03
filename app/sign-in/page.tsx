import { SignInPanel } from './panel';
import { Standalone } from '@/views/standalone';

export const metadata = { title: 'Sign in' };

/** Before the shell: the one screen a visitor sees before they are anyone. */
export default function SignInPage() {
  return (
    <Standalone
      kicker="Relay · API platform"
      sentence="Know your API before your customers do."
      lead="Traffic, latency, spend and health for every endpoint, on your desk, on your phone, and inside the assistant you already use."
      aside={<SignInPanel />}
    />
  );
}

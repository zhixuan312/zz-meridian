import { API_KEYS } from '@/system/fixtures/relay-records';
import { KeysView } from '@/views/keys';

export const metadata = { title: 'API keys' };

export default function KeysPage() {
  return <KeysView initial={API_KEYS} />;
}

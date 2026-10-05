'use client';

import { demoSeries } from '@/system/fixtures/sample';
import { Specimen, State } from '@/system/specimen';
import { ExportButton } from '.';

const days = demoSeries('30d').current;

export default function ExportButtonPreview() {
  return (
    <Specimen label="Variants" note="Press one: the file saves and a toast names the rows and the file. With nothing to export, the toast says so. A server export is a link: the browser saves the file the address streams.">
      <State label="Masthead (secondary)"><ExportButton rows={days} filename="overview-30d.csv" noun="days" /></State>
      <State label="Named format"><ExportButton rows={days} filename="overview-30d.csv" noun="days" label="Export CSV" /></State>
      <State label="Nothing to export"><ExportButton rows={[]} filename="requests.csv" noun="requests" /></State>
      <State label="Server export (href)"><ExportButton href="/api/export/requests?status=5xx" filename="requests-5xx.csv" noun="requests" label="Export CSV" /></State>
      <State label="Small, in a card head"><ExportButton rows={days} filename="overview-30d.csv" noun="days" size="sm" variant="ghost" /></State>
    </Specimen>
  );
}

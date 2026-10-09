'use client';

import { Card } from '@/components/ui/card';
import { Specimen, State } from '@/system/specimen';
import { Row } from '@/components/base/shell';
import { app } from '@/app.config';

const Cell = ({ label, tall }: { label: string; tall?: boolean }) => (
  <Card className={`grid place-items-center ${tall ? 'h-36' : 'h-24'}`}>
    <span className="t-eyebrow">{label}</span>
  </Card>
);

export default function ShellPreview() {
  return (
    <>
      <Specimen label="The frame" note="One scroller per page. The rail keeps its own scroll; the top bar stays; the masthead scrolls away.">
        <div className="grid h-80 w-full grid-cols-[7rem_1fr] overflow-hidden rounded-xl border border-line">
          <div className="border-r border-line bg-frame p-3"><p className="t-eyebrow">Rail</p></div>
          <div className="flex min-w-0 flex-col">
            <div className="flex h-11 items-center gap-2 border-b border-line bg-ground/72 px-4 backdrop-blur-xl">
              <span className="text-xs font-semibold">Overview</span>
              <span className="ml-auto h-6 w-28 rounded-full border border-line-strong" />
              <span className="size-6 rounded-full border border-line-strong" />
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <p className="t-kicker">{app.name} · {app.workspace}</p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">Overview</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="col-span-2 h-24 rounded-lg border border-accent-line bg-accent-tint" />
                <div className="h-24 rounded-lg border border-line bg-surface" />
              </div>
            </div>
          </div>
        </div>
      </Specimen>
      <Specimen label="Four splits" note="A page is a stack of rows; a row is one card, or cards split 1/2, 2/3 or 1/3. Cards in a row are the same height. Drawn here at their 1024px-and-up geometry; below 1024px every split stacks to one column.">
        <div className="flex w-full flex-col gap-3">
          <div className="grid gap-3"><Cell label="Full · <Row>" /></div>
          <div className="grid grid-cols-2 gap-3"><Cell label="1/2" /><Cell label="1/2" /></div>
          <div className="grid grid-cols-3 gap-3"><div className="col-span-2"><Cell label="2/3" tall /></div><Cell label="1/3" tall /></div>
          <div className="grid grid-cols-3 gap-3"><Cell label="1/3" /><div className="col-span-2"><Cell label="2/3" /></div></div>
        </div>
      </Specimen>
      <Specimen label="Tiles" note="A row of tiles counts columns from its own width and never leaves a hole: four are four or two, three are three or one.">
        <div className="w-full">
          <Row split="tiles"><Cell label="Tile" /><Cell label="Tile" /><Cell label="Tile" /><Cell label="Tile" /></Row>
        </div>
      </Specimen>
      <Specimen label="Two widths">
        <State label="data · fills the canvas at every width" className="w-full">
          <div className="h-8 w-full rounded-md border border-dashed border-line-strong bg-fill-hover" />
        </State>
        <State label="reading · 832px, centred: one long document, such as an article" className="w-full">
          <div className="mx-auto h-8 w-[53%] rounded-md border border-dashed border-line-strong bg-fill-hover" />
        </State>
      </Specimen>
    </>
  );
}

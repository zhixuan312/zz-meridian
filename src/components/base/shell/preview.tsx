'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Specimen, State } from '@/system/specimen';
import { Row } from '@/components/base/shell';
import { LeaveQuestion } from '@/components/base/shell/leave-question';
import { app } from '@/app.config';

const Cell = ({ label, tall }: { label: string; tall?: boolean }) => (
  <Card className={`grid place-items-center ${tall ? 'h-36' : 'h-24'}`}>
    <span className="t-eyebrow">{label}</span>
  </Card>
);

/** The shell's own question, asked by a button: Stay and Leave both close it here, since there is nowhere to go. */
function AskToLeave() {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Button onClick={() => setAsking(true)}>Leave this page</Button>
      {asking ? <LeaveQuestion onStay={() => setAsking(false)} onLeave={() => setAsking(false)} /> : null}
    </>
  );
}

export default function ShellPreview() {
  return (
    <>
      <Specimen label="The frame, as a diagram" note="A diagram of the frame's regions, not the shell itself: every console page of the product is the shell drawn for real. One scroller per page. The rail keeps its own scroll; the top bar stays; the masthead scrolls away.">
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
      <Specimen label="Three widths" note="A page names one. `data` is the canvas; `form` and `reading` are narrower measures that fill it until the canvas is wider than the page needs, then centre. The bar is each width against the 1560px the layout is designed at.">
        <State label="data · fills the canvas at every width" className="w-full">
          <div className="h-8 w-full rounded-md border border-dashed border-line-strong bg-fill-hover" />
        </State>
        <State label="form · a form page's measure: its head column, a `field-width` card and the gutter" className="w-full">
          <div className="mx-auto h-8 w-[80%] rounded-md border border-dashed border-line-strong bg-fill-hover" />
        </State>
        <State label="reading · 832px, centred: one long document, such as an article" className="w-full">
          <div className="mx-auto h-8 w-[53%] rounded-md border border-dashed border-line-strong bg-fill-hover" />
        </State>
      </Specimen>
      <Specimen label="Leaving with unsaved changes" note="While a form section on the page has unsaved changes, following a link, choosing a destination or a workspace, or a table row asks first. Stay closes the question and changes nothing; Leave goes where the person was going. A link opened in a new tab is never asked about, and closing the tab gets the browser's own warning.">
        <State label="The question, asked by the shell's own component: press the button">
          <AskToLeave />
        </State>
      </Specimen>
    </>
  );
}

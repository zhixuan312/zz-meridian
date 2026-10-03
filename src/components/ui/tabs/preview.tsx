'use client';

import { Specimen } from '@/system/specimen';
import { Tab, TabList, TabPanel, Tabs } from '.';

export default function TabsPreview() {
  return (
    <>
      <Specimen label="Default" note="The current tab is ink, with the accent line under it." stack>
        <Tabs defaultValue="overview" className="w-full">
          <TabList aria-label="Request">
            <Tab value="overview">Overview</Tab>
            <Tab value="headers">Headers</Tab>
            <Tab value="body">Body</Tab>
            <Tab value="timeline">Timeline</Tab>
          </TabList>
          <TabPanel value="overview"><p className="t-small text-ink-2">POST /v1/messages answered 201 in 612ms from us-east-1.</p></TabPanel>
          <TabPanel value="headers"><p className="t-small text-ink-2">14 request headers, 9 response headers.</p></TabPanel>
          <TabPanel value="body"><p className="t-small text-ink-2">4.2 KB JSON.</p></TabPanel>
          <TabPanel value="timeline"><p className="t-small text-ink-2">Queued 3ms · upstream 598ms · written 11ms.</p></TabPanel>
        </Tabs>
      </Specimen>
      <Specimen label="With counts" note="A count says how many each view holds; the current one takes the accent tint." stack>
        <Tabs defaultValue="failed" className="w-full">
          <TabList aria-label="Requests">
            <Tab value="all" count="240">All</Tab>
            <Tab value="failed" count="12">Failed</Tab>
            <Tab value="slow" count="31">Slow</Tab>
            <Tab value="disabled" disabled count="0">Archived</Tab>
          </TabList>
        </Tabs>
      </Specimen>
      <Specimen label="Narrow" note="At 340px the strip scrolls sideways with snap points; it never wraps." stack>
        <div className="w-full max-w-85">
          <Tabs defaultValue="logs">
            <TabList aria-label="Customer">
              <Tab value="overview">Overview</Tab>
              <Tab value="usage">Usage</Tab>
              <Tab value="keys">API keys</Tab>
              <Tab value="logs">Logs</Tab>
              <Tab value="billing">Billing</Tab>
              <Tab value="settings">Settings</Tab>
            </TabList>
          </Tabs>
        </div>
      </Specimen>
    </>
  );
}

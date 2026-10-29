import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabList, Tabs, Tab } from '@/components/ui/tabs';

describe("the tab strip's indicator", () => {
  it('watches every tab for size, so a count arriving on the active tab moves its line', () => {
    const observed: Element[] = [];
    vi.stubGlobal('ResizeObserver', class { observe(e: Element) { observed.push(e); } unobserve() {} disconnect() {} });
    try {
      render(<Tabs defaultValue="all"><TabList><Tab value="all">All</Tab><Tab value="failed">Failed</Tab></TabList></Tabs>);
      const tabs = [...document.querySelectorAll('[role="tab"]')];
      expect(tabs).toHaveLength(2);
      for (const t of tabs) expect(observed).toContain(t);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

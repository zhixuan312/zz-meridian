import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportButton } from '@/components/patterns/export-button';
import { downloadFile } from '@/lib/csv';
import type * as Csv from '@/lib/csv';
import { toast } from '@/components/ui/toast';

vi.mock('@/lib/csv', async (original) => ({ ...await original<typeof Csv>(), downloadFile: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('client exports', () => {
  it.each([null, undefined, () => null])('reports an unread source without downloading or calling it empty (%s)', (rows) => {
    render(<ExportButton rows={rows} filename="days.csv" noun="days" />);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(downloadFile).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'critical', title: 'Export unavailable', description: expect.stringMatching(/refresh/i) }));
  });

  it('reports a successfully read empty source without suggesting a nonexistent filter', () => {
    render(<ExportButton rows={[]} filename="days.csv" noun="days" />);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(downloadFile).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ tone: 'neutral', title: 'No days to export' });
  });

  it('builds deferred rows only on press and saves their actual CSV', () => {
    const rows = vi.fn(() => [{ date: '2026-10-01', requests: 17 }]);
    render(<ExportButton rows={rows} filename="days.csv" noun="days" />);
    expect(rows).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(rows).toHaveBeenCalledTimes(1);
    expect(downloadFile).toHaveBeenCalledWith('days.csv', 'date,requests\r\n2026-10-01,17\r\n');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'positive', title: 'Exported 1 days' }));
  });

  it('keeps server exports as download links without requiring client rows', () => {
    render(<ExportButton href="/api/export/requests?status=5xx" filename="requests.csv" noun="requests" />);
    const link = screen.getByRole('link', { name: 'Export' });
    expect(link.getAttribute('href')).toBe('/api/export/requests?status=5xx');
    expect(link.getAttribute('download')).toBe('requests.csv');
    expect(toast).not.toHaveBeenCalled();
  });
});

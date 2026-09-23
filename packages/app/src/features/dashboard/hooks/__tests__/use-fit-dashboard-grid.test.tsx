import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAutoScaledGridMeasurements } from '../use-auto-scaled-grid-measurements';
import { useFitDashboardGrid } from '../use-fit-dashboard-grid';

vi.mock('../use-auto-scaled-grid-measurements', () => ({
  useAutoScaledGridMeasurements: vi.fn(() => ({
    outerRef: { current: null },
    innerRef: { current: null },
    outerWidth: 900,
    contentHeight: 300,
  })),
}));

describe('useFitDashboardGrid', () => {
  it('uses fixed minimum column widths like the home dashboard grid', () => {
    const { result } = renderHook(() => useFitDashboardGrid(6, true));

    expect(result.current.gridStyle).toMatchObject({
      gap: 16,
      gridAutoRows: '80px',
      gridTemplateColumns: 'repeat(12, minmax(80px, 1fr))',
    });
  });

  it('uses the same phone gap for rendered tracks and measured grid width', () => {
    const { result } = renderHook(() => useFitDashboardGrid(2, false));

    expect(result.current.gridStyle).toMatchObject({
      gap: 8,
      gridTemplateColumns: 'repeat(4, minmax(80px, 1fr))',
    });
    expect(vi.mocked(useAutoScaledGridMeasurements)).toHaveBeenLastCalledWith(344, false);
  });

  it('forwards the enabled flag to auto-scaled measurements', () => {
    renderHook(() => useFitDashboardGrid(6, false));

    expect(vi.mocked(useAutoScaledGridMeasurements)).toHaveBeenLastCalledWith(1136, false);
  });
});

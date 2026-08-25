import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceGrid } from '.';

const { dashboardCardItemMock } = vi.hoisted(() => ({
  dashboardCardItemMock: vi.fn(),
}));

vi.mock('@navet/app/hooks', () => ({
  useSearch: () => ({
    filteredDeviceIds: [],
    isSearchActive: false,
  }),
}));

vi.mock('@navet/app/hooks/use-breakpoint-cols', () => ({
  useBreakpointCols: () => 4,
}));

vi.mock('../components/dashboard-card-item', () => ({
  DashboardCardItem: (props: unknown) => {
    dashboardCardItemMock(props);
    return <article>Dashboard card</article>;
  },
}));

vi.mock('../components/dashboard-edit-actions', () => ({
  DashboardEditActions: ({ children }: PropsWithChildren) => <>{children}</>,
}));

vi.mock('../hooks/use-fit-dashboard-grid', () => ({
  useFitDashboardGrid: () => ({
    gridStyle: {},
    innerContainerStyle: {},
    innerRef: { current: null },
    isAutoScaled: false,
    outerContainerStyle: {},
    outerRef: { current: null },
    renderedGridCols: 8,
  }),
}));

function createDevice(): DeviceWithType {
  return {
    id: 'climate.living_room',
    name: 'Living Room Thermostat',
    room: 'Living Room',
    size: 'small',
    temperature: 21,
    currentTemperature: 20,
    mode: 'heat',
    type: 'climate',
  };
}

function renderGrid(isEditMode: boolean) {
  const device = createDevice();
  renderWithProviders(
    <DeviceGrid
      orderedCardIds={[device.id]}
      deviceMap={new Map([[device.id, device]])}
      isEditMode={isEditMode}
      cardSizes={{}}
      updateCardSize={vi.fn()}
      densePerformanceMode
      optimizeOffscreenPaint
    />
  );
}

describe('DeviceGrid offscreen paint policy', () => {
  beforeEach(() => {
    dashboardCardItemMock.mockClear();
  });

  it('enables offscreen paint containment for a non-edit performance grid', () => {
    renderGrid(false);

    expect(dashboardCardItemMock.mock.calls.at(-1)?.[0]).toMatchObject({
      densePerformanceMode: true,
      isEditMode: false,
      optimizeOffscreenPaint: true,
    });
  });

  it('keeps every card fully painted in edit mode', () => {
    renderGrid(true);

    expect(dashboardCardItemMock.mock.calls.at(-1)?.[0]).toMatchObject({
      densePerformanceMode: true,
      isEditMode: true,
      optimizeOffscreenPaint: false,
    });
  });

  it('renders contextual supplemental cards in the same room grid', () => {
    const device = createDevice();
    renderWithProviders(
      <DeviceGrid
        orderedCardIds={[device.id]}
        deviceMap={new Map([[device.id, device]])}
        isEditMode={false}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        supplementalCards={[
          {
            id: 'room-chore-dishes',
            size: 'medium',
            content: <article>Unload dishwasher</article>,
          },
        ]}
      />
    );

    expect(screen.getByText('Unload dishwasher')).toBeInTheDocument();
    expect(screen.getByText('Unload dishwasher').parentElement).toHaveClass('col-span-4');
  });
});

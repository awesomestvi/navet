import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomSection } from '../room-section';

vi.mock('@navet/app/hooks/use-breakpoint-cols', () => ({
  useBreakpointCols: () => 6,
}));

vi.mock('@navet/app/features/dashboard/hooks/use-auto-scaled-grid-measurements', () => ({
  useAutoScaledGridMeasurements: () => ({
    outerRef: { current: null },
    innerRef: { current: null },
    outerWidth: 1200,
    contentHeight: 240,
  }),
}));

vi.mock('../../components/dashboard-card-item', () => ({
  DashboardCardItem: ({ id }: { id: string }) => <div data-testid={`card-${id}`}>{id}</div>,
}));

function createLight(id: string, size: CardSize = 'small'): DeviceWithType {
  return {
    id,
    name: id,
    room: 'Kitchen',
    size,
    type: 'lights',
    state: true,
    brightness: 80,
    temp: 3200,
  };
}

function renderRoomSection(options?: { densePerformanceMode?: boolean; isEditMode?: boolean }) {
  const devices = Array.from({ length: 8 }, (_, index) => createLight(`light.${index}`));
  const deviceMap = new Map(devices.map((device) => [device.id, device]));

  return renderWithProviders(
    <RoomSection
      title="Kitchen"
      orderedIds={devices.map((device) => device.id)}
      totalItems={devices.length}
      textColor="text-white"
      textSecondary="text-white/70"
      isEditMode={options?.isEditMode ?? false}
      cardSizes={{}}
      deviceMap={deviceMap}
      customCardMap={new Map()}
      handleSizeChange={vi.fn()}
      densePerformanceMode={options?.densePerformanceMode ?? false}
    />
  );
}

describe('RoomSection dense paint policy', () => {
  it('enables section-level offscreen paint optimization in dense performance mode', () => {
    renderRoomSection({ densePerformanceMode: true });

    const section = screen.getByText('Kitchen').closest('[data-dashboard-room-section]');

    expect(section).toHaveStyle({
      contentVisibility: 'auto',
      containIntrinsicBlockSize: '224px',
    });
  });

  it('keeps section paint optimization disabled while editing', () => {
    renderRoomSection({ densePerformanceMode: true, isEditMode: true });

    const section = screen.getByText('Kitchen').closest('[data-dashboard-room-section]');

    expect(section).not.toHaveStyle({ contentVisibility: 'auto' });
  });
});

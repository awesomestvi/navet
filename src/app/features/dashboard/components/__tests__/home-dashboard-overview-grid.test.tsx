import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { PresentationCardGrid } from '@/app/features/dashboard/components/home-dashboard-overview-presentation-grid';
import type { DeviceWithType } from '@/app/types/device.types';
import { renderWithProviders } from '@/test/render';
import { CardGrid } from '../home-dashboard-overview-card-grid';

const measurementMock = vi.hoisted(() =>
  vi.fn(() => ({
    outerRef: { current: null },
    innerRef: { current: null },
    outerWidth: 500,
    contentHeight: 320,
  }))
);

const breakpointColsMock = vi.hoisted(() => vi.fn(() => 6));
const progressiveBatchingMock = vi.hoisted(() => vi.fn(() => Number.POSITIVE_INFINITY));
const mockSettingsState = vi.hoisted(() => ({
  lowPowerMode: false,
  effectsQuality: 'high' as const,
}));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');

  return {
    ...actual,
    useDroppable: () => ({
      setNodeRef: vi.fn(),
      isOver: false,
    }),
  };
});

vi.mock('@/app/features/dashboard/hooks/use-auto-scaled-grid-measurements', () => ({
  useAutoScaledGridMeasurements: measurementMock,
}));

vi.mock('@/app/hooks/use-breakpoint-cols', () => ({
  useBreakpointCols: breakpointColsMock,
}));

vi.mock('@/app/features/dashboard/hooks/use-progressive-batching', () => ({
  useProgressiveBatching: progressiveBatchingMock,
}));

vi.mock('@/app/stores/settings-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/stores/settings-store')>();

  return {
    ...actual,
    useSettingsStore: <T,>(selector: (state: typeof mockSettingsState) => T) =>
      selector(mockSettingsState),
  };
});

vi.mock('../dashboard-card-item', () => ({
  DashboardCardItem: ({ id }: { id: string }) => <div data-testid={`card-${id}`}>{id}</div>,
}));

function createDevice(id: string, size: CardSize = 'small'): DeviceWithType {
  return {
    id,
    name: id,
    room: 'Living Room',
    size,
    type: 'lights',
    state: true,
    brightness: 50,
    temp: 3200,
  };
}

function getGridElement(container: HTMLElement) {
  const grid = container.querySelector<HTMLElement>('[style*="--home-card-cols"]');
  expect(grid).toBeTruthy();
  return grid as HTMLElement;
}

function getScaledInner(container: HTMLElement) {
  const scaled = container.querySelector<HTMLElement>('[style*="transform: scale"]');
  expect(scaled).toBeTruthy();
  return scaled as HTMLElement;
}

describe('home dashboard overview grid layout', () => {
  beforeEach(() => {
    measurementMock.mockClear();
    breakpointColsMock.mockClear();
    progressiveBatchingMock.mockClear();
    mockSettingsState.lowPowerMode = false;
    mockSettingsState.effectsQuality = 'high';
    breakpointColsMock.mockReturnValue(6);
    progressiveBatchingMock.mockReturnValue(Number.POSITIVE_INFINITY);
    measurementMock.mockReturnValue({
      outerRef: { current: null },
      innerRef: { current: null },
      outerWidth: 500,
      contentHeight: 320,
    });
  });

  it('keeps edit-grid rendered columns identical in normal and low-power mode', () => {
    const cards = new Map([['light.kitchen', createDevice('light.kitchen')]]);

    const { container, rerender } = renderWithProviders(
      <CardGrid
        cardIds={['light.kitchen']}
        gridCols={4}
        allCards={cards}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        isEditMode={false}
        onRemoveFromLayout={vi.fn()}
        showHero
        sortable={false}
      />
    );

    expect(getGridElement(container).style.getPropertyValue('--home-card-cols')).toBe('8');

    mockSettingsState.lowPowerMode = true;
    rerender(
      <CardGrid
        cardIds={['light.kitchen']}
        gridCols={4}
        allCards={cards}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        isEditMode={false}
        onRemoveFromLayout={vi.fn()}
        showHero
        sortable={false}
      />
    );

    expect(getGridElement(container).style.getPropertyValue('--home-card-cols')).toBe('8');
  });

  it('still auto-scales the edit grid in low-power mode for multi-column layouts', () => {
    mockSettingsState.lowPowerMode = true;
    const cards = new Map([['light.kitchen', createDevice('light.kitchen')]]);

    const { container } = renderWithProviders(
      <CardGrid
        cardIds={['light.kitchen']}
        gridCols={4}
        allCards={cards}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        isEditMode={false}
        onRemoveFromLayout={vi.fn()}
        showHero
        sortable={false}
      />
    );

    expect(measurementMock).toHaveBeenCalledWith(expect.any(Number));
    expect(getScaledInner(container).style.transform).toContain('scale(');
  });

  it('keeps the tiny-card edit fallback at a single rendered column', () => {
    mockSettingsState.lowPowerMode = true;
    const cards = new Map([
      ['light.kitchen', createDevice('light.kitchen', 'tiny')],
      ['light.hall', createDevice('light.hall', 'tiny')],
    ]);

    const { container } = renderWithProviders(
      <CardGrid
        cardIds={['light.kitchen', 'light.hall']}
        gridCols={4}
        allCards={cards}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        isEditMode
        onRemoveFromLayout={vi.fn()}
        showHero
        sortable={false}
      />
    );

    expect(getGridElement(container).style.getPropertyValue('--home-card-cols')).toBe('1');
    expect(container.querySelector('[style*="transform: scale"]')).toBeNull();
  });

  it('keeps presentation-grid rendered columns identical in low-power mode', () => {
    mockSettingsState.lowPowerMode = true;
    const cards = new Map([['light.kitchen', createDevice('light.kitchen')]]);

    const { container } = renderWithProviders(
      <PresentationCardGrid
        cardIds={['light.kitchen']}
        gridCols={4}
        allCards={cards}
        cardSizes={{}}
        updateCardSize={vi.fn()}
        showHero
      />
    );

    expect(getGridElement(container).style.getPropertyValue('--home-card-cols')).toBe('8');
    expect(measurementMock).toHaveBeenCalledWith(expect.any(Number));
    expect(getScaledInner(container).style.transform).toContain('scale(');
    expect(screen.getByTestId('card-light.kitchen')).toBeInTheDocument();
  });
});

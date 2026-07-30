import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { renderWithProviders } from '@navet/app/test/render';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SectionCanvasProps } from '../home-dashboard-overview.shared';
import { SectionCanvas } from '../home-dashboard-overview-section-canvas';

const cardGridPropsMock = vi.hoisted(() => vi.fn());

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
  }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  rectSortingStrategy: vi.fn(),
  SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../home-dashboard-overview-card-grid', () => ({
  CardGrid: (props: unknown) => {
    cardGridPropsMock(props);
    return <div data-testid="section-card-grid" />;
  },
  EmptyCanvas: () => <div data-testid="empty-canvas" />,
  HomeContainerDropZone: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const device = {
  id: 'light.kitchen',
  name: 'Kitchen Light',
  room: 'Kitchen',
  size: 'small',
  type: 'lights',
  state: true,
} as DeviceWithType;

const surface = getThemeSurfaceTokens('dark');

function createProps(overrides: Partial<SectionCanvasProps> = {}): SectionCanvasProps {
  return {
    sectionId: 'section-a',
    title: 'Section A',
    gridCols: 4,
    isActive: false,
    isPreviewHidden: false,
    activeDragCard: null,
    accentColor: '#7c3aed',
    cardIds: [device.id],
    allCards: new Map([[device.id, device]]),
    cardSizes: {},
    updateCardSize: vi.fn(),
    isEditMode: true,
    onUpdateCard: vi.fn(),
    onRemoveFromLayout: vi.fn(),
    showHero: true,
    onSelectSection: vi.fn(),
    onOpenLibraryForSection: vi.fn(),
    onOpenAddCardDialog: vi.fn(),
    onRenameSection: vi.fn(),
    onRemoveSection: vi.fn(),
    span: 2,
    layoutCols: 4,
    minWidthsBySection: { 'section-a': 1, 'section-b': 1 },
    rowSiblingCount: 2,
    onResizeSection: vi.fn(),
    surface,
    ...overrides,
  };
}

describe('SectionCanvas memoization', () => {
  beforeEach(() => {
    cardGridPropsMock.mockClear();
  });

  it('rerenders for prop-only section and card preview changes', () => {
    const props = createProps();
    const { container, rerender } = renderWithProviders(<SectionCanvas {...props} />);
    const section = container.querySelector('[data-dashboard-section-canvas="flat"]');

    expect(section).not.toHaveClass('opacity-0');

    rerender(<SectionCanvas {...props} isPreviewHidden />);
    expect(section).toHaveClass('opacity-0');

    rerender(<SectionCanvas {...props} isPreviewHidden activeDragCard={device.id} />);
    expect(cardGridPropsMock.mock.calls.at(-1)?.[0]).toMatchObject({
      activeDragCard: device.id,
    });
  });

  it('passes the latest sibling minimum widths to resize actions', () => {
    const onResizeSection = vi.fn();
    const props = createProps({ onResizeSection });
    const nextMinWidths = { 'section-a': 1, 'section-b': 2 };
    const { rerender } = renderWithProviders(<SectionCanvas {...props} />);

    rerender(<SectionCanvas {...props} minWidthsBySection={nextMinWidths} />);
    fireEvent.click(screen.getByRole('button', { name: /grow section/i }));

    expect(onResizeSection).toHaveBeenCalledWith('section-a', expect.any(Number), nextMinWidths);
  });
});

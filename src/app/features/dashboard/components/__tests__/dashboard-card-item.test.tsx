import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { useDashboardEntitiesStore } from '../../stores/dashboard-entities-store';
import { DashboardCardItem } from '../dashboard-card-item';

const { childAction } = vi.hoisted(() => ({
  childAction: vi.fn(),
}));

vi.mock('../../utils/card-renderer', () => ({
  renderCard: () => (
    <button type="button" onClick={childAction}>
      child action
    </button>
  ),
}));

vi.mock('../widget-card', () => ({
  WidgetCard: () => (
    <button type="button" onClick={childAction}>
      widget action
    </button>
  ),
}));

describe('DashboardCardItem card locking', () => {
  beforeEach(() => {
    localStorage.clear();
    childAction.mockClear();
    useDashboardEntitiesStore.setState(useDashboardEntitiesStore.getInitialState(), true);
  });

  it('marks locked cards inert and blocks pointer interaction outside edit mode', () => {
    useDashboardEntitiesStore.getState().lockCard('light.kitchen');

    const { container } = renderWithProviders(
      <DashboardCardItem
        id="light.kitchen"
        size="small"
        isEditMode={false}
        handleSizeChange={vi.fn()}
        device={{
          id: 'light.kitchen',
          name: 'Kitchen',
          room: 'Kitchen',
          type: 'lights',
        }}
      />
    );

    expect(screen.getByRole('img', { name: 'Card locked' })).toBeInTheDocument();
    expect(container.querySelector('[data-card-locked="true"] [inert]')).toBeTruthy();

    const overlay = container.querySelector<HTMLElement>('[data-card-lock-overlay="true"]');
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay as HTMLElement);

    expect(childAction).not.toHaveBeenCalled();
  });

  it('keeps locked cards manageable in edit mode and toggles the lock state', () => {
    useDashboardEntitiesStore.getState().lockCard('light.kitchen');

    renderWithProviders(
      <DashboardCardItem
        id="light.kitchen"
        size="small"
        isEditMode
        handleSizeChange={vi.fn()}
        device={{
          id: 'light.kitchen',
          name: 'Kitchen',
          room: 'Kitchen',
          type: 'lights',
        }}
      />
    );

    expect(screen.queryByRole('img', { name: 'Card locked' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock card' }));

    expect(useDashboardEntitiesStore.getState().lockedCardIds).toEqual([]);
  });

  it('shows the locked indicator for custom cards', () => {
    useDashboardEntitiesStore.getState().lockCard('custom-note');

    renderWithProviders(
      <DashboardCardItem
        id="custom-note"
        size="medium"
        isEditMode={false}
        handleSizeChange={vi.fn()}
        card={{
          id: 'custom-note',
          type: 'note',
          size: 'medium',
          room: 'all',
          createdAt: 1,
        }}
      />
    );

    expect(screen.getByRole('img', { name: 'Card locked' })).toBeInTheDocument();
  });
});

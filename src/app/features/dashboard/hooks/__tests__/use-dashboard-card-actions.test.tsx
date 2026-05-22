import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardCardActions } from '../use-dashboard-card-actions';

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
  },
}));

describe('useDashboardCardActions', () => {
  it('adds a hidden entity to home without unhiding it from room views', () => {
    const showAutoEntity = vi.fn();
    const addCard = vi.fn();
    const addSection = vi.fn();
    const updateCard = vi.fn();
    const removeCard = vi.fn();
    const hideAutoEntity = vi.fn();
    const homeLayoutController = {
      layout: {
        mode: 'flow' as const,
        sections: [],
      },
      addCard: vi.fn(),
      addSection,
    };

    const { result } = renderHook(() =>
      useDashboardCardActions({
        activeRoom: 'All',
        activeSection: 'home',
        isEditMode: true,
        addCard,
        removeCard,
        updateCard,
        hideAutoEntity,
        showAutoEntity,
        t: (key: string) => key,
        addCardTargetSectionId: null,
        homeLayoutController,
      })
    );

    act(() => {
      result.current.handleAddLibraryCard('calendar.kitchen');
    });

    expect(homeLayoutController.addCard).toHaveBeenCalledWith('calendar.kitchen');
    expect(showAutoEntity).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith('dashboard.feedback.cardAddedToHome');
  });

  it('reuses the entity removed toast instead of stacking duplicates', () => {
    const showAutoEntity = vi.fn();
    const addCard = vi.fn();
    const addSection = vi.fn();
    const updateCard = vi.fn();
    const removeCard = vi.fn();
    const hideAutoEntity = vi.fn();
    const homeLayoutController = {
      layout: {
        mode: 'flow' as const,
        sections: [],
      },
      addCard: vi.fn(),
      addSection,
    };

    const { result } = renderHook(() =>
      useDashboardCardActions({
        activeRoom: 'All',
        activeSection: 'home',
        isEditMode: true,
        addCard,
        removeCard,
        updateCard,
        hideAutoEntity,
        showAutoEntity,
        t: (key: string) => key,
        addCardTargetSectionId: null,
        homeLayoutController,
      })
    );

    act(() => {
      result.current.handleRemoveEntity('light.kitchen');
    });

    expect(hideAutoEntity).toHaveBeenCalledWith('light.kitchen');
    expect(toastSuccess).toHaveBeenCalledWith('dashboard.feedback.entityRemoved', {
      id: 'dashboard-entity-removed',
    });
  });

  it('adds a sensor group custom card through the widget action', () => {
    const showAutoEntity = vi.fn();
    const addCard = vi.fn(() => ({
      id: 'custom-sensor-group',
      type: 'sensor-group' as const,
      size: 'medium' as const,
      room: 'Kitchen',
      createdAt: 1,
    }));
    const addSection = vi.fn();
    const updateCard = vi.fn();
    const removeCard = vi.fn();
    const hideAutoEntity = vi.fn();
    const homeLayoutController = {
      layout: {
        mode: 'flow' as const,
        sections: [],
      },
      addCard: vi.fn(),
      addSection,
    };

    const { result } = renderHook(() =>
      useDashboardCardActions({
        activeRoom: 'Kitchen',
        activeSection: 'dashboard',
        isEditMode: true,
        addCard,
        removeCard,
        updateCard,
        hideAutoEntity,
        showAutoEntity,
        t: (key: string, values?: Record<string, unknown>) =>
          values ? `${key}:${JSON.stringify(values)}` : key,
        addCardTargetSectionId: null,
        homeLayoutController,
      })
    );

    act(() => {
      result.current.handleAddCard('sensor-group', 'medium');
    });

    expect(addCard).toHaveBeenCalledWith('sensor-group', 'medium', 'Kitchen');
    expect(toastSuccess).toHaveBeenCalledWith(
      'dashboard.feedback.widgetAdded:{"type":"sensor-group","room":"Kitchen"}'
    );
  });
});

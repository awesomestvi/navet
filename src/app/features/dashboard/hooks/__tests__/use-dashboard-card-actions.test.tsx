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
});

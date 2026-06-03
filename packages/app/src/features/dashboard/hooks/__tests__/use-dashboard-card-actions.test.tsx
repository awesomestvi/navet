import type { CardTemplate } from '@navet/app/features/dashboard/components/add-card-dialog/index';
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
  const infoTemplate: CardTemplate = {
    id: 'info',
    cardType: 'info',
    nameKey: 'dashboard.addCard.templates.info.name',
    descriptionKey: 'dashboard.addCard.templates.info.description',
    icon: null,
    defaultSize: 'medium',
    supportedSizes: ['extra-small', 'small', 'medium', 'large'],
  };

  const sceneTemplate: CardTemplate = {
    id: 'scene',
    cardType: 'button',
    nameKey: 'dashboard.addCard.templates.scene.name',
    descriptionKey: 'dashboard.addCard.templates.scene.description',
    icon: null,
    defaultSize: 'small',
    supportedSizes: ['tiny', 'extra-small', 'small'],
    initialData: {
      label: 'Scene',
      service: 'scene.turn_on',
      icon: 'Sparkles',
    },
  };

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
      removeCard: vi.fn(),
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
      removeCard: vi.fn(),
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

  it('adds an info custom card through the widget action', () => {
    const showAutoEntity = vi.fn();
    const addCard = vi.fn(() => ({
      id: 'custom-info',
      type: 'info' as const,
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
      removeCard: vi.fn(),
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
      result.current.handleAddCard(infoTemplate, 'medium');
    });

    expect(addCard).toHaveBeenCalledWith('info', 'medium', 'Kitchen', undefined);
    expect(toastSuccess).toHaveBeenCalledWith(
      'dashboard.feedback.widgetAdded:{"type":"dashboard.addCard.templates.info.name","room":"Kitchen"}'
    );
  });

  it('maps the scene template to a button widget with preset scene data', () => {
    const showAutoEntity = vi.fn();
    const addCard = vi.fn(() => ({
      id: 'custom-scene',
      type: 'button' as const,
      size: 'small' as const,
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
      removeCard: vi.fn(),
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
      result.current.handleAddCard(sceneTemplate, 'small');
    });

    expect(addCard).toHaveBeenCalledWith('button', 'small', 'Kitchen', {
      label: 'Scene',
      service: 'scene.turn_on',
      icon: 'Sparkles',
    });
    expect(toastSuccess).toHaveBeenCalledWith(
      'dashboard.feedback.widgetAdded:{"type":"dashboard.addCard.templates.scene.name","room":"Kitchen"}'
    );
  });

  it('removes deleted custom widgets from the home layout', () => {
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
      removeCard: vi.fn(),
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
      result.current.handleDeleteCard('custom-note');
    });

    expect(removeCard).toHaveBeenCalledWith('custom-note');
    expect(homeLayoutController.removeCard).toHaveBeenCalledWith('custom-note');
    expect(toastSuccess).toHaveBeenCalledWith('dashboard.feedback.widgetDeleted');
  });
});

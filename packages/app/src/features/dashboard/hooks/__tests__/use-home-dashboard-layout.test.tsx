import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHomeDashboardLayoutStore } from '../../stores/home-dashboard-layout-store';
import { useHomeDashboardLayout } from '../use-home-dashboard-layout';

describe('useHomeDashboardLayout', () => {
  beforeEach(() => {
    useHomeDashboardLayoutStore.setState(useHomeDashboardLayoutStore.getInitialState(), true);
  });

  it('keeps layout actions stable when an equivalent valid-card list is rebuilt', () => {
    const { result, rerender } = renderHook(
      ({ validCardIds }: { validCardIds: string[] }) => useHomeDashboardLayout(validCardIds, {}),
      {
        initialProps: {
          validCardIds: ['home_assistant:light.kitchen', 'custom-status'],
        },
      }
    );
    const firstAddCard = result.current.addCard;
    const firstResetLayout = result.current.resetLayout;

    rerender({
      validCardIds: ['home_assistant:light.kitchen', 'custom-status'],
    });

    expect(result.current.addCard).toBe(firstAddCard);
    expect(result.current.resetLayout).toBe(firstResetLayout);
  });

  it('refreshes add-card validation when valid membership changes', () => {
    const { result, rerender } = renderHook(
      ({ validCardIds }: { validCardIds: string[] }) => useHomeDashboardLayout(validCardIds, {}),
      {
        initialProps: {
          validCardIds: ['home_assistant:light.kitchen'],
        },
      }
    );
    const firstAddCard = result.current.addCard;

    rerender({
      validCardIds: ['home_assistant:light.kitchen', 'home_assistant:light.hall'],
    });

    expect(result.current.addCard).not.toBe(firstAddCard);
  });
});

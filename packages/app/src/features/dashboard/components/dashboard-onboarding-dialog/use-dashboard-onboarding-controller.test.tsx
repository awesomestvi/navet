import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardOnboardingController } from './use-dashboard-onboarding-controller';

describe('useDashboardOnboardingController', () => {
  it('persists the selected wallpaper when finishing onboarding', () => {
    const onChooseAll = vi.fn();
    const onChooseBlank = vi.fn();
    const setTheme = vi.fn();
    const setPrimaryColor = vi.fn();
    const setCustomPrimaryColor = vi.fn();
    const setWallpaper = vi.fn();

    const { result } = renderHookWithProviders(() =>
      useDashboardOnboardingController({
        open: true,
        phase: 'idle',
        onChooseAll,
        onChooseBlank,
        onImportConfig: vi.fn(),
        onClosingAnimationComplete: undefined,
        theme: 'black',
        primaryColor: 'orange',
        customPrimaryColor: null,
        wallpaper: null,
        setTheme,
        setPrimaryColor,
        setCustomPrimaryColor,
        setWallpaper,
      })
    );

    act(() => {
      result.current.handleContinueToLocalization('all');
    });
    act(() => {
      result.current.handleContinueToTheme();
    });
    act(() => {
      result.current.setSelectedWallpaper('builtin:nocturne-03');
    });
    act(() => {
      result.current.handleFinishThemeSetup();
    });

    expect(setWallpaper).toHaveBeenCalledWith('builtin:nocturne-03');
    expect(onChooseAll).toHaveBeenCalledTimes(1);
    expect(onChooseBlank).not.toHaveBeenCalled();
  });
});

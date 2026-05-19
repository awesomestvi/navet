import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { useOnboardingController } from '../use-onboarding-controller';

const { importDashboardConfigFromFile, toastSuccess, toastError } = vi.hoisted(() => ({
  importDashboardConfigFromFile: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
const { reloadWindow } = vi.hoisted(() => ({
  reloadWindow: vi.fn(),
}));

vi.mock('@/app/utils/dashboard-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/utils/dashboard-config')>();

  return {
    ...actual,
    importDashboardConfigFromFile,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock('@/app/utils/window-reload', () => ({
  reloadWindow,
}));

const ONBOARDING_CONFIG_IMPORT_REVEAL_KEY = 'navet-onboarding-config-import-reveal';

describe('useOnboardingController', () => {
  beforeEach(async () => {
    await resetAppStores();
    reloadWindow.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
    importDashboardConfigFromFile.mockClear();
    importDashboardConfigFromFile.mockResolvedValue(undefined);
  });

  it('reloads after onboarding config import and marks the imported reveal for the next startup', async () => {
    const file = new File(['version: 3'], 'navet-dashboard.yaml', { type: 'text/yaml' });
    const { result } = renderController();

    await act(async () => {
      await result.current.handleOnboardingImportDashboardConfig(file);
    });

    expect(importDashboardConfigFromFile).toHaveBeenCalledWith(file);
    expect(sessionStorage.getItem(ONBOARDING_CONFIG_IMPORT_REVEAL_KEY)).toBe('true');
    expect(toastSuccess).toHaveBeenCalledWith('Dashboard config restored');
    expect(reloadWindow).toHaveBeenCalledTimes(1);
  });

  it('consumes the post-import reveal flag once on startup', () => {
    sessionStorage.setItem(ONBOARDING_CONFIG_IMPORT_REVEAL_KEY, 'true');

    const firstRender = renderController();

    expect(firstRender.result.current.dashboardArrivalVariant).toBe('import');
    expect(firstRender.result.current.showImportedDashboardReveal).toBe(true);
    expect(sessionStorage.getItem(ONBOARDING_CONFIG_IMPORT_REVEAL_KEY)).toBeNull();

    firstRender.unmount();
    const secondRender = renderController();

    expect(secondRender.result.current.dashboardArrivalVariant).toBeNull();
    expect(secondRender.result.current.showImportedDashboardReveal).toBe(false);
  });
});

function renderController() {
  return renderHookWithProviders(() =>
    useOnboardingController({
      allEntityIds: ['light.kitchen'],
      changeRoom: vi.fn(),
      resetDashboard: vi.fn(),
    })
  );
}

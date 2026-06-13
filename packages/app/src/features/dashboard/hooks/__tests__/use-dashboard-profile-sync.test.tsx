import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import {
  useCardZonesStore,
  useCustomCardsStore,
  useDashboardEntitiesStore,
  useHomeDashboardLayoutStore,
} from '@navet/app/features/dashboard';
import { useLightPresetStore } from '@navet/app/features/lighting';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardProfileSync } from '../use-dashboard-profile-sync';

const {
  loadDashboardProfile,
  saveDashboardProfile,
  exportDashboardConfig,
  importDashboardConfig,
  reloadWindow,
  isHomeAssistantPanelMode,
  toast,
} = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), {
    dismiss: vi.fn(),
  });

  return {
    loadDashboardProfile: vi.fn(),
    saveDashboardProfile: vi.fn(),
    exportDashboardConfig: vi.fn(),
    importDashboardConfig: vi.fn(),
    reloadWindow: vi.fn(),
    isHomeAssistantPanelMode: vi.fn(),
    toast: toastFn,
  };
});

vi.mock('@navet/app/services/dashboard-profile.service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@navet/app/services/dashboard-profile.service')>();

  return {
    ...actual,
    loadDashboardProfile,
    saveDashboardProfile,
  };
});

vi.mock('@navet/app/utils/dashboard-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@navet/app/utils/dashboard-config')>();

  return {
    ...actual,
    exportDashboardConfig,
    importDashboardConfig,
  };
});

vi.mock('@navet/app/utils/window-reload', () => ({
  reloadWindow,
}));

vi.mock('@navet/app/runtime/app-mode', () => ({
  isHomeAssistantPanelMode,
}));

vi.mock('sonner', () => ({
  toast,
}));

function buildProfile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    version: 3 as const,
    app: 'navet' as const,
    exportedAt: '2024-01-01T00:00:00.000Z',
    theme: {
      theme: 'glass',
      primaryColor: 'blue',
    },
    settings: {},
    navigation: {
      currentRoom: ALL_ROOMS_ID,
      activeSection: 'home',
    },
    ...overrides,
  };
}

function resetStore<T>(store: {
  getInitialState: () => T;
  setState: (state: T, replace: true) => unknown;
}) {
  store.setState(store.getInitialState(), true);
}

async function resetDashboardStores() {
  resetStore(useCustomCardsStore);
  resetStore(useDashboardEntitiesStore);
  resetStore(useCardZonesStore);
  resetStore(useHomeDashboardLayoutStore);
  resetStore(useLightPresetStore);

  await Promise.all(
    [
      useCustomCardsStore,
      useDashboardEntitiesStore,
      useCardZonesStore,
      useHomeDashboardLayoutStore,
      useLightPresetStore,
    ].map((store) => store.persist.rehydrate())
  );
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advanceTime(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  });
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('useDashboardProfileSync', () => {
  let currentProfile = buildProfile();

  beforeEach(async () => {
    vi.useFakeTimers();
    setVisibility('visible');
    setOnline(true);
    await resetAppStores();
    await resetDashboardStores();

    useDashboardEntitiesStore.getState().markOnboardingCompleted();
    useSettingsStore.getState().updateSettings({ username: '' });
    useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'blue' });

    currentProfile = buildProfile();
    exportDashboardConfig.mockImplementation(() => currentProfile);
    importDashboardConfig.mockReset();
    loadDashboardProfile.mockReset();
    saveDashboardProfile.mockReset();
    reloadWindow.mockReset();
    isHomeAssistantPanelMode.mockReset();
    isHomeAssistantPanelMode.mockReturnValue(false);
    toast.mockReset();
    toast.dismiss.mockReset();

    loadDashboardProfile.mockResolvedValue({
      available: true,
      profile: null,
      notModified: false,
      etag: '"initial"',
      lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
    });
    saveDashboardProfile.mockResolvedValue({
      saved: true,
      permanentFailure: false,
      etag: '"saved"',
      lastModified: 'Mon, 01 Jan 2024 00:00:02 GMT',
    });
  });

  it('skips profile sync entirely in panel mode', async () => {
    isHomeAssistantPanelMode.mockReturnValue(true);

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    await advanceTime(120_000);

    expect(loadDashboardProfile).not.toHaveBeenCalled();
    expect(saveDashboardProfile).not.toHaveBeenCalled();
  });

  it('does not poll while hidden and polls immediately when visible again', async () => {
    setVisibility('hidden');
    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    expect(loadDashboardProfile).toHaveBeenCalledTimes(1);

    await advanceTime(120_000);
    expect(loadDashboardProfile).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(loadDashboardProfile).toHaveBeenCalledTimes(2);
  });

  it('does not poll while offline and polls immediately when online again', async () => {
    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    setOnline(false);
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
      await Promise.resolve();
    });

    await advanceTime(120_000);
    expect(loadDashboardProfile).toHaveBeenCalledTimes(1);

    setOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });

    expect(loadDashboardProfile).toHaveBeenCalledTimes(2);
  });

  it('debounces local saves instead of running a repeating save loop', async () => {
    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      exportedAt: '2024-01-01T00:00:01.000Z',
      theme: { theme: 'glass', primaryColor: 'yellow' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'yellow' });
    });

    await advanceTime(1_999);
    expect(saveDashboardProfile).not.toHaveBeenCalled();

    await advanceTime(1);
    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(saveDashboardProfile).toHaveBeenCalledWith(currentProfile, {
      keepalive: undefined,
    });

    await advanceTime(10_000);
    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
  });

  it('shows one conflict toast for the same remote profile when local edits are still pending', async () => {
    loadDashboardProfile
      .mockResolvedValueOnce({
        available: true,
        profile: null,
        notModified: false,
        etag: '"initial"',
        lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
      })
      .mockResolvedValue({
        available: true,
        profile: buildProfile({
          exportedAt: '2024-01-01T00:01:00.000Z',
          theme: { theme: 'glass', primaryColor: 'green' },
        }),
        notModified: false,
        etag: '"remote-1"',
        lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
      });
    saveDashboardProfile.mockResolvedValue({
      saved: false,
      permanentFailure: false,
      etag: null,
      lastModified: null,
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      exportedAt: '2024-01-01T00:00:05.000Z',
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
    });

    await advanceTime(2_000);
    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);

    await advanceTime(60_000);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        classNames: expect.objectContaining({
          toast: expect.stringContaining('sm:min-w-[29rem]'),
          title: expect.stringContaining('whitespace-normal'),
          content: expect.stringContaining('basis-full'),
        }),
      })
    );

    await advanceTime(60_000);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('keeps the local profile when the conflict toast action is chosen', async () => {
    const remoteProfile = buildProfile({
      exportedAt: '2024-01-01T00:01:00.000Z',
      theme: { theme: 'glass', primaryColor: 'green' },
    });
    loadDashboardProfile
      .mockResolvedValueOnce({
        available: true,
        profile: null,
        notModified: false,
        etag: '"initial"',
        lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
      })
      .mockResolvedValue({
        available: true,
        profile: remoteProfile,
        notModified: false,
        etag: '"remote-1"',
        lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
      });
    saveDashboardProfile
      .mockResolvedValueOnce({
        saved: false,
        permanentFailure: false,
        etag: null,
        lastModified: null,
      })
      .mockResolvedValueOnce({
        saved: true,
        permanentFailure: false,
        etag: '"saved-local"',
        lastModified: 'Mon, 01 Jan 2024 00:01:02 GMT',
      });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      exportedAt: '2024-01-01T00:00:05.000Z',
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
    });

    await advanceTime(2_000);
    await advanceTime(60_000);

    const conflictOptions = toast.mock.calls[0]?.[1] as {
      action: { onClick: () => void };
    };
    await act(async () => {
      conflictOptions.action.onClick();
      await Promise.resolve();
    });

    expect(saveDashboardProfile).toHaveBeenCalledTimes(2);
    expect(saveDashboardProfile).toHaveBeenLastCalledWith(currentProfile, {
      keepalive: undefined,
    });
    expect(importDashboardConfig).not.toHaveBeenCalled();
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('loads the remote profile when the conflict toast cancel action is chosen', async () => {
    const remoteProfile = buildProfile({
      exportedAt: '2024-01-01T00:01:00.000Z',
      theme: { theme: 'glass', primaryColor: 'green' },
    });
    loadDashboardProfile
      .mockResolvedValueOnce({
        available: true,
        profile: null,
        notModified: false,
        etag: '"initial"',
        lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
      })
      .mockResolvedValue({
        available: true,
        profile: remoteProfile,
        notModified: false,
        etag: '"remote-1"',
        lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
      });
    saveDashboardProfile.mockResolvedValue({
      saved: false,
      permanentFailure: false,
      etag: null,
      lastModified: null,
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      exportedAt: '2024-01-01T00:00:05.000Z',
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
    });

    await advanceTime(2_000);
    await advanceTime(60_000);

    const conflictOptions = toast.mock.calls[0]?.[1] as {
      cancel: { onClick: () => void };
    };
    act(() => {
      conflictOptions.cancel.onClick();
    });

    expect(importDashboardConfig).toHaveBeenCalledWith(remoteProfile, {
      applyNavigation: false,
    });
    expect(reloadWindow).toHaveBeenCalledTimes(1);
  });
});

import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
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
import { isValidElement, type ReactNode } from 'react';
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

function getTestProfileSignature(profile: ReturnType<typeof buildProfile>) {
  return JSON.stringify({
    ...profile,
    exportedAt: undefined,
    navigation: undefined,
  });
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

function findButtonClickHandler(node: ReactNode, label: string): null | (() => void) {
  if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) {
    return null;
  }

  const { children, onClick } = node.props;

  if (typeof children === 'string' && children === label) {
    return typeof onClick === 'function' ? onClick : null;
  }

  const nestedChildren = Array.isArray(children) ? children : [children];

  for (const child of nestedChildren) {
    const handler = findButtonClickHandler(child, label);
    if (handler) {
      return handler;
    }
  }

  return null;
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
    toast.mockReturnValue('conflict-toast');
    toast.dismiss.mockReset();

    localStorage.setItem(
      STORAGE_KEYS.dashboardProfileSync,
      JSON.stringify({ serverGeneration: 'server-1' })
    );

    loadDashboardProfile.mockResolvedValue({
      available: true,
      profile: null,
      notModified: false,
      etag: '"initial"',
      lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
      generation: 'server-1',
    });
    saveDashboardProfile.mockResolvedValue({
      saved: true,
      permanentFailure: false,
      etag: '"saved"',
      lastModified: 'Mon, 01 Jan 2024 00:00:02 GMT',
      generation: 'server-1',
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
      etag: '"initial"',
      keepalive: undefined,
      lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
    });

    await advanceTime(10_000);
    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
  });

  it('keeps local-first sync when the server generation matches and the remote profile is empty', async () => {
    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      exportedAt: '2024-01-01T00:00:01.000Z',
      theme: { theme: 'glass', primaryColor: 'yellow' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'yellow' });
    });

    await advanceTime(2_000);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(importDashboardConfig).not.toHaveBeenCalled();
    expect(useDashboardEntitiesStore.getState().onboardingCompleted).toBe(true);
  });

  it('clears stale validators before saving local changes over an empty remote profile', async () => {
    localStorage.setItem(
      STORAGE_KEYS.dashboardProfileSync,
      JSON.stringify({
        serverGeneration: 'server-1',
        lastRemoteEtag: '"stale-profile"',
        lastRemoteLastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
      })
    );
    loadDashboardProfile.mockResolvedValue({
      available: true,
      profile: null,
      notModified: false,
      etag: null,
      lastModified: null,
      generation: 'server-1',
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      exportedAt: '2024-01-01T00:00:01.000Z',
      theme: { theme: 'glass', primaryColor: 'yellow' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'yellow' });
    });

    await advanceTime(2_000);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(saveDashboardProfile).toHaveBeenCalledWith(currentProfile, {
      etag: undefined,
      keepalive: undefined,
      lastModified: undefined,
    });
  });

  it('clears stale local dashboard state when the server generation changes and the remote profile is empty', async () => {
    loadDashboardProfile.mockResolvedValueOnce({
      available: true,
      profile: null,
      notModified: false,
      etag: '"initial"',
      lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
      generation: 'server-2',
    });

    currentProfile = buildProfile({
      exportedAt: '2024-01-01T00:00:01.000Z',
      theme: { theme: 'glass', primaryColor: 'yellow' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'yellow' });
      useCustomCardsStore.getState().replaceCards([
        {
          id: 'custom-1',
          type: 'note',
          size: 'medium',
          room: ALL_ROOMS_ID,
          createdAt: 1,
        },
      ]);
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    expect(useDashboardEntitiesStore.getState().onboardingCompleted).toBe(false);
    expect(useCustomCardsStore.getState().cards).toEqual([]);
    expect(useThemeStore.getState().primaryColor).toBe('orange');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.dashboardProfileSync) ?? '{}')).toEqual(
      expect.objectContaining({
        serverGeneration: 'server-2',
      })
    );

    await advanceTime(120_000);
    expect(saveDashboardProfile).not.toHaveBeenCalled();
  });

  it('imports the server profile immediately when the server generation changes', async () => {
    const remoteProfile = buildProfile({
      exportedAt: '2024-01-01T00:01:00.000Z',
      theme: { theme: 'glass', primaryColor: 'green' },
    });
    loadDashboardProfile.mockResolvedValueOnce({
      available: true,
      profile: remoteProfile,
      notModified: false,
      etag: '"remote-1"',
      lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
      generation: 'server-2',
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    expect(importDashboardConfig).toHaveBeenCalledWith(remoteProfile, {
      applyNavigation: false,
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it('resumes normal saves after acknowledging an authoritative empty server generation', async () => {
    loadDashboardProfile.mockResolvedValueOnce({
      available: true,
      profile: null,
      notModified: false,
      etag: '"initial"',
      lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
      generation: 'server-2',
    });
    saveDashboardProfile.mockResolvedValue({
      saved: true,
      permanentFailure: false,
      etag: '"saved-2"',
      lastModified: 'Mon, 01 Jan 2024 00:00:02 GMT',
      generation: 'server-2',
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      exportedAt: '2024-01-01T00:00:03.000Z',
      theme: { theme: 'glass', primaryColor: 'teal' },
    });
    act(() => {
      useDashboardEntitiesStore.getState().markOnboardingCompleted();
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'teal' });
    });

    await advanceTime(2_000);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.dashboardProfileSync) ?? '{}')).toEqual(
      expect.objectContaining({
        serverGeneration: 'server-2',
      })
    );
  });

  it('does not reload when the fetched remote profile already matches the active local dashboard', async () => {
    const remoteProfile = buildProfile({
      exportedAt: '2024-01-01T00:01:00.000Z',
      theme: { theme: 'glass', primaryColor: 'green' },
    });

    currentProfile = remoteProfile;
    loadDashboardProfile.mockResolvedValueOnce({
      available: true,
      profile: remoteProfile,
      notModified: false,
      etag: '"remote-1"',
      lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
      generation: 'server-1',
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    expect(importDashboardConfig).not.toHaveBeenCalled();
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('does not show a conflict toast when the remote profile matches current local edits', async () => {
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
        generation: 'server-1',
      })
      .mockResolvedValue({
        available: true,
        profile: remoteProfile,
        notModified: false,
        etag: '"remote-1"',
        lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
        generation: 'server-1',
      });
    saveDashboardProfile.mockResolvedValue({
      saved: false,
      permanentFailure: false,
      etag: null,
      lastModified: null,
      generation: 'server-1',
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = remoteProfile;
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'green' });
    });

    await advanceTime(2_000);
    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);

    await advanceTime(60_000);
    expect(toast).not.toHaveBeenCalled();
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('does not reload twice for the same remote profile in one browser session', async () => {
    const remoteProfile = buildProfile({
      exportedAt: '2024-01-01T00:01:00.000Z',
      theme: { theme: 'glass', primaryColor: 'green' },
    });

    sessionStorage.setItem('navet-dashboard-profile-reload-guard', '"remote-1"');
    loadDashboardProfile.mockResolvedValueOnce({
      available: true,
      profile: remoteProfile,
      notModified: false,
      etag: '"remote-1"',
      lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
      generation: 'server-1',
    });

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    expect(importDashboardConfig).not.toHaveBeenCalled();
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('saves local edits with fresh remote validators instead of showing a same-device conflict', async () => {
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
        generation: 'server-1',
      })
      .mockResolvedValue({
        available: true,
        profile: remoteProfile,
        notModified: false,
        etag: '"remote-1"',
        lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
        generation: 'server-1',
      });
    saveDashboardProfile.mockResolvedValue({
      saved: true,
      permanentFailure: false,
      etag: '"saved-local"',
      lastModified: 'Mon, 01 Jan 2024 00:01:02 GMT',
      generation: 'server-1',
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
    expect(saveDashboardProfile).toHaveBeenCalledWith(currentProfile, {
      etag: '"remote-1"',
      keepalive: undefined,
      lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
    });
    expect(toast).not.toHaveBeenCalled();

    await advanceTime(60_000);
    expect(toast).not.toHaveBeenCalled();
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
        generation: 'server-1',
      })
      .mockResolvedValue({
        available: true,
        profile: remoteProfile,
        notModified: false,
        etag: '"remote-1"',
        lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
        generation: 'server-1',
      });
    saveDashboardProfile
      .mockResolvedValueOnce({
        saved: false,
        permanentFailure: false,
        etag: null,
        lastModified: null,
        generation: 'server-1',
      })
      .mockResolvedValueOnce({
        saved: true,
        permanentFailure: false,
        etag: '"saved-local"',
        lastModified: 'Mon, 01 Jan 2024 00:01:02 GMT',
        generation: 'server-1',
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
    localStorage.setItem(
      STORAGE_KEYS.dashboardProfileSync,
      JSON.stringify({
        serverGeneration: 'server-1',
        lastSavedSignature: getTestProfileSignature(currentProfile),
        lastRemoteEtag: '"remote-1"',
        lastRemoteLastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
      })
    );

    const conflictOptions = toast.mock.calls[0]?.[1] as { description: ReactNode };
    const keepMine = findButtonClickHandler(conflictOptions.description, 'Keep mine');

    await act(async () => {
      keepMine?.();
      await Promise.resolve();
    });

    expect(toast.dismiss).toHaveBeenCalledWith('conflict-toast');
    expect(saveDashboardProfile).toHaveBeenCalledTimes(2);
    expect(saveDashboardProfile).toHaveBeenLastCalledWith(currentProfile, {
      etag: '"remote-1"',
      keepalive: undefined,
      lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
    });
    expect(importDashboardConfig).not.toHaveBeenCalled();
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('loads the remote profile in place when the conflict toast cancel action is chosen', async () => {
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
        generation: 'server-1',
      })
      .mockResolvedValue({
        available: true,
        profile: remoteProfile,
        notModified: false,
        etag: '"remote-1"',
        lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
        generation: 'server-1',
      });
    saveDashboardProfile.mockResolvedValue({
      saved: false,
      permanentFailure: false,
      etag: null,
      lastModified: null,
      generation: 'server-1',
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
    localStorage.setItem(
      STORAGE_KEYS.dashboardProfileSync,
      JSON.stringify({
        serverGeneration: 'server-1',
        lastAppliedAt: '2024-01-01T00:02:00.000Z',
        lastRemoteEtag: '"remote-1"',
        lastRemoteLastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
      })
    );

    const conflictOptions = toast.mock.calls[0]?.[1] as { description: ReactNode };
    const loadRemote = findButtonClickHandler(conflictOptions.description, 'Load remote');

    act(() => {
      loadRemote?.();
    });

    expect(importDashboardConfig).toHaveBeenCalledWith(remoteProfile, {
      applyNavigation: false,
    });
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('retries local profile saves with fresh validators without showing a same-device conflict', async () => {
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
        generation: 'server-1',
      })
      .mockResolvedValue({
        available: true,
        profile: remoteProfile,
        notModified: false,
        etag: '"remote-1"',
        lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
        generation: 'server-1',
      });
    saveDashboardProfile
      .mockResolvedValueOnce({
        saved: false,
        permanentFailure: false,
        etag: '"remote-2"',
        lastModified: 'Mon, 01 Jan 2024 00:01:05 GMT',
        generation: 'server-1',
      })
      .mockResolvedValueOnce({
        saved: true,
        permanentFailure: false,
        etag: '"saved-local"',
        lastModified: 'Mon, 01 Jan 2024 00:01:06 GMT',
        generation: 'server-1',
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

    expect(saveDashboardProfile).toHaveBeenCalledTimes(2);
    expect(saveDashboardProfile).toHaveBeenNthCalledWith(1, currentProfile, {
      etag: '"remote-1"',
      keepalive: undefined,
      lastModified: 'Mon, 01 Jan 2024 00:01:00 GMT',
    });
    expect(saveDashboardProfile).toHaveBeenNthCalledWith(2, currentProfile, {
      etag: '"remote-2"',
      keepalive: undefined,
      lastModified: 'Mon, 01 Jan 2024 00:01:05 GMT',
    });
    expect(toast).not.toHaveBeenCalled();
  });
});

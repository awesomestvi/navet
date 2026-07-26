import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  type CustomCard,
  useCardZonesStore,
  useCustomCardsStore,
  useDashboardEntitiesStore,
  useHomeDashboardLayoutStore,
} from '@navet/app/features/dashboard';
import { writeDashboardProfileBase } from '@navet/app/features/dashboard/clients/dashboard-profile-base-cache';
import { useDashboardProfileRuntimeStore } from '@navet/app/features/dashboard/clients/dashboard-profile-runtime-store';
import {
  DASHBOARD_PROFILE_REFRESH_EVENT,
  useDashboardProfileSync,
} from '@navet/app/features/dashboard/hooks/use-dashboard-profile-sync';
import { useLightPresetStore } from '@navet/app/features/lighting';
import type { DashboardProfileAuthor } from '@navet/app/services/dashboard-profile.contract';
import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { DashboardConfigPayload } from '@navet/app/utils/dashboard-config';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
import { act } from '@testing-library/react';
import { isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  exportDashboardConfig,
  importDashboardConfig,
  isHomeAssistantPanelMode,
  loadDashboardProfile,
  loadDashboardProfileClients,
  saveDashboardProfile,
  toast,
  touchDashboardClient,
} = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), {
    dismiss: vi.fn(),
  });

  return {
    exportDashboardConfig: vi.fn(),
    importDashboardConfig: vi.fn(),
    isHomeAssistantPanelMode: vi.fn(),
    loadDashboardProfile: vi.fn(),
    loadDashboardProfileClients: vi.fn(),
    saveDashboardProfile: vi.fn(),
    toast: toastFn,
    touchDashboardClient: vi.fn(),
  };
});

vi.mock('@navet/app/services/dashboard-profile.service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@navet/app/services/dashboard-profile.service')>();
  return {
    ...actual,
    loadDashboardProfile,
    loadDashboardProfileClients,
    saveDashboardProfile,
    touchDashboardClient,
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

vi.mock('@navet/app/runtime/app-mode', () => ({
  isHomeAssistantPanelMode,
}));

vi.mock('sonner', () => ({
  toast,
}));

const WORKSPACE = {
  contractVersion: 1 as const,
  installationId: 'installation_01',
  workspaceId: 'workspace_01',
  defaultProfileId: 'default' as const,
  createdAt: '2026-07-25T09:00:00.000Z',
};

const CURRENT_CLIENT = {
  id: 'client_phone_01',
  name: 'Vishal’s phone',
  kind: 'phone' as const,
  nameSource: 'custom' as const,
  createdAt: '2026-07-25T09:00:00.000Z',
  updatedAt: '2026-07-25T09:00:00.000Z',
};

const OTHER_CLIENT = {
  id: 'client_panel_02',
  name: 'Kitchen panel',
  kind: 'wall_panel' as const,
  providerId: 'home_assistant',
  userId: 'ha_user_02',
  userName: 'Alex',
};

function buildProfile(overrides: Partial<DashboardConfigPayload> = {}): DashboardConfigPayload {
  return {
    version: 3 as const,
    app: 'navet' as const,
    exportedAt: '2026-07-25T09:00:00.000Z',
    theme: {
      theme: 'glass',
      primaryColor: 'blue',
    },
    settings: {
      showWeatherInHeader: true,
    },
    navigation: {
      currentRoom: ALL_ROOMS_ID,
      activeSection: 'home',
    },
    ...overrides,
  };
}

function metadata(
  revision: number,
  author: DashboardProfileAuthor = OTHER_CLIENT,
  changedPaths: string[] = ['/theme/primaryColor'],
  workspace = WORKSPACE
) {
  return {
    contractVersion: 1 as const,
    installationId: workspace.installationId,
    workspaceId: workspace.workspaceId,
    profileId: 'default' as const,
    revision,
    generation: `generation_${revision}`,
    kind: 'update' as const,
    updatedAt: `2026-07-25T09:0${revision}:00.000Z`,
    author,
    changedPaths,
  };
}

function activeResult(
  profile: ReturnType<typeof buildProfile>,
  revision = 1,
  author = OTHER_CLIENT,
  changedPaths?: string[],
  workspace = WORKSPACE
) {
  return {
    available: true,
    unauthorized: false,
    profile,
    notModified: false,
    etag: `"revision-${revision}"`,
    lastModified: `Sat, 25 Jul 2026 09:0${revision}:00 GMT`,
    generation: `generation_${revision}`,
    revision,
    workspace,
    metadata: metadata(revision, author, changedPaths, workspace),
    recovery: {
      status: 'active' as const,
      resetRevision: null,
      latestRecoverableRevision: revision,
    },
  };
}

function emptyResult(status: 'uninitialized' | 'reset' | 'recoverable' = 'uninitialized') {
  return {
    available: true,
    unauthorized: false,
    profile: null,
    notModified: false,
    etag: '"revision-0"',
    lastModified: null,
    generation: 'generation_0',
    revision: status === 'uninitialized' ? 0 : 2,
    workspace: WORKSPACE,
    metadata: null,
    recovery: {
      status,
      resetRevision: status === 'reset' ? 2 : null,
      latestRecoverableRevision: status === 'uninitialized' ? null : 1,
    },
  };
}

function notModifiedResult(revision = 1) {
  return {
    ...activeResult(buildProfile(), revision),
    profile: null,
    notModified: true,
  };
}

function savedResult(
  profile: ReturnType<typeof buildProfile>,
  revision = 2,
  author: DashboardProfileAuthor = {
    ...CURRENT_CLIENT,
    providerId: 'home_assistant',
    userId: 'ha_user_01',
    userName: 'Vishal',
  }
) {
  return {
    saved: true,
    unauthorized: false,
    permanentFailure: false,
    preconditionFailed: false,
    preconditionRequired: false,
    etag: `"revision-${revision}"`,
    lastModified: `Sat, 25 Jul 2026 09:0${revision}:00 GMT`,
    generation: `generation_${revision}`,
    revision,
    workspace: WORKSPACE,
    metadata: metadata(revision, author, ['/theme/primaryColor']),
    recovery: {
      status: 'active' as const,
      resetRevision: null,
      latestRecoverableRevision: revision,
    },
    profile,
  };
}

function clientRegistry() {
  return {
    workspace: WORKSPACE,
    clients: [
      {
        id: CURRENT_CLIENT.id,
        name: CURRENT_CLIENT.name,
        kind: CURRENT_CLIENT.kind,
        firstSeenAt: CURRENT_CLIENT.createdAt,
        lastSeenAt: CURRENT_CLIENT.updatedAt,
        lastRevision: 1,
        principal: {
          providerId: 'home_assistant',
          userId: 'ha_user_01',
          userName: 'Vishal',
        },
      },
    ],
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
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function advanceTime(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
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

function findButtonClickHandler(node: ReactNode, label: string): null | (() => void) {
  if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) {
    return null;
  }
  if (node.props.children === label) {
    return node.props.onClick ?? null;
  }
  for (const child of Array.isArray(node.props.children)
    ? node.props.children
    : [node.props.children]) {
    const handler = findButtonClickHandler(child, label);
    if (handler) {
      return handler;
    }
  }
  return null;
}

describe('useDashboardProfileSync', () => {
  let currentProfile = buildProfile();

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    setVisibility('visible');
    setOnline(true);
    await resetAppStores();
    await resetDashboardStores();
    useDashboardProfileRuntimeStore.getState().reset();
    useDashboardEntitiesStore.getState().markOnboardingCompleted();
    localStorage.setItem(STORAGE_KEYS.dashboardClientIdentity, JSON.stringify(CURRENT_CLIENT));

    currentProfile = buildProfile();
    exportDashboardConfig.mockReset();
    exportDashboardConfig.mockImplementation(() => currentProfile);
    importDashboardConfig.mockReset();
    importDashboardConfig.mockImplementation((profile) => {
      currentProfile = profile as ReturnType<typeof buildProfile>;
    });
    loadDashboardProfile.mockReset();
    loadDashboardProfileClients.mockReset();
    saveDashboardProfile.mockReset();
    touchDashboardClient.mockReset();
    touchDashboardClient.mockResolvedValue(clientRegistry());
    loadDashboardProfileClients.mockResolvedValue(clientRegistry());
    saveDashboardProfile.mockImplementation(async (profile) => savedResult(profile));
    isHomeAssistantPanelMode.mockReset();
    isHomeAssistantPanelMode.mockReturnValue(false);
    toast.mockReset();
    toast.mockReturnValue('profile-toast');
    toast.dismiss.mockReset();
  });

  it('skips shared storage in Home Assistant custom-panel mode', async () => {
    isHomeAssistantPanelMode.mockReturnValue(true);

    const { result } = renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    await advanceTime(120_000);

    expect(result.current.profileLoadCompleted).toBe(true);
    expect(loadDashboardProfile).not.toHaveBeenCalled();
    expect(touchDashboardClient).not.toHaveBeenCalled();
    expect(saveDashboardProfile).not.toHaveBeenCalled();
    expect(useDashboardProfileRuntimeStore.getState().status).toBe('disabled');
  });

  it('loads the shared profile on a new phone without a conflict prompt', async () => {
    const remote = buildProfile({
      theme: { theme: 'glass', primaryColor: 'green' },
    });
    loadDashboardProfile.mockResolvedValueOnce(activeResult(remote));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    expect(importDashboardConfig).toHaveBeenCalledWith(remote, { applyNavigation: false });
    expect(saveDashboardProfile).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(useDashboardProfileRuntimeStore.getState()).toMatchObject({
      revision: 1,
      status: 'synced',
      workspaceId: WORKSPACE.workspaceId,
    });
  });

  it('seeds an uninitialized installation from a configured local dashboard', async () => {
    loadDashboardProfile.mockResolvedValueOnce(emptyResult());

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    await advanceTime(1_999);
    expect(saveDashboardProfile).not.toHaveBeenCalled();

    await advanceTime(1);
    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(saveDashboardProfile).toHaveBeenCalledWith(
      currentProfile,
      expect.objectContaining({
        author: expect.objectContaining({ id: CURRENT_CLIENT.id }),
        baseRevision: 0,
        changedPaths: ['/'],
        etag: '"revision-0"',
      })
    );
  });

  it('preserves local state after an explicit server reset', async () => {
    const local = buildProfile({
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    currentProfile = local;
    loadDashboardProfile.mockResolvedValueOnce(emptyResult('reset'));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    await advanceTime(10_000);

    expect(importDashboardConfig).not.toHaveBeenCalled();
    expect(saveDashboardProfile).not.toHaveBeenCalled();
    expect(currentProfile).toBe(local);
    expect(useDashboardProfileRuntimeStore.getState().status).toBe('error');
  });

  it('debounces a local edit and writes against the loaded revision', async () => {
    const base = buildProfile();
    loadDashboardProfile.mockResolvedValueOnce(activeResult(base));
    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      theme: { theme: 'glass', primaryColor: 'yellow' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'yellow' });
    });

    await advanceTime(1_999);
    expect(saveDashboardProfile).not.toHaveBeenCalled();
    await advanceTime(1);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(saveDashboardProfile).toHaveBeenCalledWith(
      currentProfile,
      expect.objectContaining({
        baseRevision: 1,
        changedPaths: ['/theme/primaryColor'],
        etag: '"revision-1"',
      })
    );
    await advanceTime(10_000);
    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
  });

  it('creates one shared revision for one card resize despite card-order hydration events', async () => {
    const base = buildProfile({
      cardSizes: {
        'home_assistant:calendar.navet_overview': 'medium',
      },
    });
    const resized = buildProfile({
      cardSizes: {
        'home_assistant:calendar.navet_overview': 'large',
      },
    });
    loadDashboardProfile.mockResolvedValueOnce(activeResult(base));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = resized;
    act(() => {
      window.dispatchEvent(
        new CustomEvent(PERSISTED_STATE_EVENT, {
          detail: {
            key: STORAGE_KEYS.cardSizes,
            value: resized.cardSizes,
          },
        })
      );
    });
    await advanceTime(500);

    for (const room of ['Living Room', 'Kitchen']) {
      act(() => {
        window.dispatchEvent(
          new CustomEvent(PERSISTED_STATE_EVENT, {
            detail: {
              key: STORAGE_KEYS.cardOrders,
              value: { [room]: ['home_assistant:calendar.navet_overview'] },
            },
          })
        );
      });
      await advanceTime(500);
    }

    await advanceTime(499);
    expect(saveDashboardProfile).not.toHaveBeenCalled();
    await advanceTime(1);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(saveDashboardProfile).toHaveBeenCalledWith(
      resized,
      expect.objectContaining({
        baseRevision: 1,
        changedPaths: ['/cardSizes/home_assistant:calendar.navet_overview'],
      })
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(PERSISTED_STATE_EVENT, {
          detail: {
            key: STORAGE_KEYS.cardOrders,
            value: {
              Home: ['home_assistant:calendar.navet_overview'],
              Kitchen: ['home_assistant:calendar.navet_overview'],
              'Living Room': ['home_assistant:calendar.navet_overview'],
            },
          },
        })
      );
    });
    await advanceTime(4_000);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
  });

  it('queues a newer local change made while a profile save is in flight', async () => {
    const base = buildProfile();
    const firstEdit = buildProfile({
      theme: { theme: 'glass', primaryColor: 'yellow' },
    });
    const finalEdit = buildProfile({
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    let resolveFirstSave: ((result: ReturnType<typeof savedResult>) => void) | undefined;

    loadDashboardProfile.mockResolvedValueOnce(activeResult(base));
    saveDashboardProfile
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof savedResult>>((resolve) => {
            resolveFirstSave = resolve;
          })
      )
      .mockImplementationOnce(async (profile) => savedResult(profile, 3));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = firstEdit;
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'yellow' });
    });
    await advanceTime(2_000);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(saveDashboardProfile).toHaveBeenNthCalledWith(
      1,
      firstEdit,
      expect.objectContaining({
        baseRevision: 1,
        changedPaths: ['/theme/primaryColor'],
      })
    );

    currentProfile = finalEdit;
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
    });

    await act(async () => {
      resolveFirstSave?.(savedResult(firstEdit, 2));
      await Promise.resolve();
      await Promise.resolve();
    });
    await advanceTime(2_000);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(2);
    expect(saveDashboardProfile).toHaveBeenNthCalledWith(
      2,
      finalEdit,
      expect.objectContaining({
        baseRevision: 2,
        changedPaths: ['/theme/primaryColor'],
        etag: '"revision-2"',
      })
    );
  });

  it('ignores a stale remote load that resolves after a newer local save', async () => {
    const base = buildProfile();
    const local = buildProfile({
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    let resolveStaleLoad: ((result: ReturnType<typeof activeResult>) => void) | undefined;

    loadDashboardProfile.mockResolvedValueOnce(activeResult(base)).mockImplementationOnce(
      async () =>
        await new Promise<ReturnType<typeof activeResult>>((resolve) => {
          resolveStaleLoad = resolve;
        })
    );
    saveDashboardProfile.mockImplementationOnce(async (profile) => savedResult(profile, 2));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    importDashboardConfig.mockClear();

    currentProfile = local;
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
      window.dispatchEvent(new Event(DASHBOARD_PROFILE_REFRESH_EVENT));
    });
    await flushEffects();
    await advanceTime(2_000);

    expect(saveDashboardProfile).toHaveBeenCalledTimes(1);
    expect(useDashboardProfileRuntimeStore.getState().revision).toBe(2);

    await act(async () => {
      resolveStaleLoad?.(activeResult(base));
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();

    expect(importDashboardConfig).not.toHaveBeenCalled();
    expect(currentProfile).toEqual(local);
    expect(useDashboardProfileRuntimeStore.getState().revision).toBe(2);
  });

  it('accepts a lower revision from a replacement workspace', async () => {
    const base = buildProfile();
    const replacement = buildProfile({
      theme: { theme: 'glass', primaryColor: 'green' },
    });
    const replacementWorkspace = {
      ...WORKSPACE,
      installationId: 'installation_02',
      workspaceId: 'workspace_02',
      createdAt: '2026-07-25T10:00:00.000Z',
    };
    loadDashboardProfile
      .mockResolvedValueOnce(activeResult(base, 20))
      .mockResolvedValueOnce(
        activeResult(replacement, 1, OTHER_CLIENT, ['/theme/primaryColor'], replacementWorkspace)
      );

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    importDashboardConfig.mockClear();

    act(() => {
      window.dispatchEvent(new Event(DASHBOARD_PROFILE_REFRESH_EVENT));
    });
    await flushEffects();

    expect(importDashboardConfig).toHaveBeenCalledWith(replacement, {
      applyNavigation: false,
    });
    expect(useDashboardProfileRuntimeStore.getState()).toMatchObject({
      revision: 1,
      status: 'synced',
      workspaceId: replacementWorkspace.workspaceId,
    });
  });

  it('does not save an equal current remote profile because a cached merge base is stale', async () => {
    const remote = buildProfile();
    currentProfile = remote;
    loadDashboardProfile.mockResolvedValueOnce(activeResult(remote, 2));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    expect(saveDashboardProfile).not.toHaveBeenCalled();

    writeDashboardProfileBase({
      profile: buildProfile({
        customCards: [
          {
            id: 'stale-card',
            type: 'note',
            size: 'medium',
            room: ALL_ROOMS_ID,
            createdAt: 1,
          },
        ],
      }),
      profileId: 'default',
      revision: 1,
      savedAt: '2026-07-25T09:01:00.000Z',
      workspaceId: WORKSPACE.workspaceId,
    });

    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState() });
    });
    await advanceTime(2_000);

    expect(exportDashboardConfig).toHaveReturnedWith(remote);
    expect(saveDashboardProfile).not.toHaveBeenCalled();
  });

  it('compares the JSON transport shape instead of undefined object properties', async () => {
    const card: CustomCard = {
      id: 'custom-note',
      type: 'note',
      size: 'medium',
      room: ALL_ROOMS_ID,
      createdAt: 1,
    };
    const remote = buildProfile({ customCards: [card] });
    loadDashboardProfile.mockResolvedValueOnce(activeResult(remote, 2));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();

    currentProfile = buildProfile({
      customCards: [{ ...card, data: undefined }],
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState() });
    });
    await advanceTime(2_000);

    expect(saveDashboardProfile).not.toHaveBeenCalled();
  });

  it('pauses polling while hidden and refreshes immediately when visible', async () => {
    setVisibility('hidden');
    loadDashboardProfile
      .mockResolvedValueOnce(activeResult(buildProfile()))
      .mockResolvedValueOnce(notModifiedResult());

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    await advanceTime(120_000);
    expect(loadDashboardProfile).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(loadDashboardProfile).toHaveBeenCalledTimes(2);
  });

  it('applies and attributes a clean update, then keeps polling', async () => {
    const base = buildProfile();
    const remote = buildProfile({
      exportedAt: '2026-07-25T09:02:00.000Z',
      theme: { theme: 'glass', primaryColor: 'green' },
    });
    loadDashboardProfile
      .mockResolvedValueOnce(activeResult(base))
      .mockResolvedValueOnce(activeResult(remote, 2))
      .mockResolvedValueOnce(notModifiedResult(2));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    importDashboardConfig.mockClear();

    await advanceTime(60_000);
    expect(importDashboardConfig).toHaveBeenCalledWith(remote, { applyNavigation: false });
    expect(toast).toHaveBeenCalledWith(
      'Dashboard updated',
      expect.objectContaining({
        description: 'Kitchen panel updated the shared dashboard.',
        duration: 6_000,
      })
    );
    expect(useDashboardProfileRuntimeStore.getState().lastActivity?.actor.clientName).toBe(
      'Kitchen panel'
    );

    await advanceTime(60_000);
    expect(loadDashboardProfile).toHaveBeenCalledTimes(3);
  });

  it('auto-merges independent local and remote fields', async () => {
    const base = buildProfile();
    const remote = buildProfile({
      exportedAt: '2026-07-25T09:02:00.000Z',
      settings: { showWeatherInHeader: false },
    });
    loadDashboardProfile
      .mockResolvedValueOnce(activeResult(base))
      .mockResolvedValueOnce(
        activeResult(remote, 2, OTHER_CLIENT, ['/settings/showWeatherInHeader'])
      );

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    importDashboardConfig.mockClear();
    currentProfile = buildProfile({
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
      window.dispatchEvent(new Event(DASHBOARD_PROFILE_REFRESH_EVENT));
    });
    await flushEffects();

    expect(importDashboardConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: { theme: 'glass', primaryColor: 'red' },
        settings: { showWeatherInHeader: false },
      }),
      { applyNavigation: false }
    );
    expect(saveDashboardProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: { theme: 'glass', primaryColor: 'red' },
        settings: { showWeatherInHeader: false },
      }),
      expect.objectContaining({
        baseRevision: 2,
        changedPaths: ['/theme/primaryColor'],
      })
    );
    expect(toast).not.toHaveBeenCalledWith(
      'Dashboard changes detected on another device',
      expect.anything()
    );
  });

  it('interrupts only when local and remote edits overlap', async () => {
    const base = buildProfile();
    const remote = buildProfile({
      exportedAt: '2026-07-25T09:02:00.000Z',
      theme: { theme: 'glass', primaryColor: 'green' },
    });
    loadDashboardProfile
      .mockResolvedValueOnce(activeResult(base))
      .mockResolvedValueOnce(activeResult(remote, 2));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    currentProfile = buildProfile({
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
      window.dispatchEvent(new Event(DASHBOARD_PROFILE_REFRESH_EVENT));
    });
    await flushEffects();
    await advanceTime(2_000);

    expect(saveDashboardProfile).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      'Dashboard changes detected on another device',
      expect.objectContaining({ duration: Infinity })
    );
    expect(useDashboardProfileRuntimeStore.getState().conflict?.overlappingPaths).toEqual([
      '/theme/primaryColor',
    ]);

    const toastOptions = toast.mock.calls[0]?.[1] as { description: ReactNode };
    const loadRemote = findButtonClickHandler(toastOptions.description, 'Load remote');
    act(() => loadRemote?.());
    expect(importDashboardConfig).toHaveBeenLastCalledWith(remote, {
      applyNavigation: false,
    });
  });

  it('rebases Keep mine over the latest remote revision', async () => {
    const base = buildProfile();
    const remote = buildProfile({
      exportedAt: '2026-07-25T09:02:00.000Z',
      theme: { theme: 'glass', primaryColor: 'green' },
      settings: { showWeatherInHeader: false },
    });
    loadDashboardProfile
      .mockResolvedValueOnce(activeResult(base))
      .mockResolvedValueOnce(activeResult(remote, 2));
    saveDashboardProfile.mockImplementation(async (profile) => savedResult(profile, 3));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    currentProfile = buildProfile({
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
      window.dispatchEvent(new Event(DASHBOARD_PROFILE_REFRESH_EVENT));
    });
    await flushEffects();

    const toastOptions = toast.mock.calls[0]?.[1] as { description: ReactNode };
    const keepMine = findButtonClickHandler(toastOptions.description, 'Keep mine');
    await act(async () => {
      keepMine?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDashboardProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: { theme: 'glass', primaryColor: 'red' },
        settings: { showWeatherInHeader: false },
      }),
      expect.objectContaining({
        baseRevision: 2,
        changedPaths: ['/theme/primaryColor'],
      })
    );
  });

  it('reloads and reconciles after a stale write precondition', async () => {
    const base = buildProfile();
    const remote = buildProfile({
      exportedAt: '2026-07-25T09:02:00.000Z',
      settings: { showWeatherInHeader: false },
    });
    loadDashboardProfile
      .mockResolvedValueOnce(activeResult(base))
      .mockResolvedValueOnce(
        activeResult(remote, 2, OTHER_CLIENT, ['/settings/showWeatherInHeader'])
      );
    saveDashboardProfile
      .mockResolvedValueOnce({
        saved: false,
        unauthorized: false,
        permanentFailure: false,
        preconditionFailed: true,
        preconditionRequired: false,
        etag: '"revision-2"',
        lastModified: null,
        generation: 'generation_2',
        revision: 2,
        workspace: WORKSPACE,
        metadata: metadata(2),
        recovery: activeResult(remote, 2).recovery,
      })
      .mockImplementationOnce(async (profile) => savedResult(profile, 3));

    renderHookWithProviders(() => useDashboardProfileSync());
    await flushEffects();
    currentProfile = buildProfile({
      theme: { theme: 'glass', primaryColor: 'red' },
    });
    act(() => {
      useThemeStore.setState({ ...useThemeStore.getState(), primaryColor: 'red' });
    });
    await advanceTime(2_000);
    await flushEffects();

    expect(loadDashboardProfile).toHaveBeenNthCalledWith(2, {});
    expect(saveDashboardProfile).toHaveBeenCalledTimes(2);
    expect(saveDashboardProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({
        theme: { theme: 'glass', primaryColor: 'red' },
        settings: { showWeatherInHeader: false },
      }),
      expect.objectContaining({ baseRevision: 2 })
    );
  });
});

import { AUTH_SESSION_REFRESHED_EVENT } from '@navet/app/auth/session-events';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { DASHBOARD_CLIENT_IDENTITY_EVENT } from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import {
  DASHBOARD_PROFILE_ERROR_CODES,
  type DashboardPreferenceDocument,
  type DashboardPreferenceScope,
  type DashboardProfileClient,
} from '@navet/app/services/dashboard-profile.contract';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import {
  projectSettingsPreferenceLayer,
  SETTINGS_PROFILE_SCHEMA_VERSION,
} from '@navet/app/utils/settings-profile-scope';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardPreferenceSync } from '../use-dashboard-preference-sync';

const { loadDashboardPreferences, saveDashboardPreferences } = vi.hoisted(() => ({
  loadDashboardPreferences: vi.fn(),
  saveDashboardPreferences: vi.fn(),
}));

vi.mock('@navet/app/services/dashboard-profile.service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@navet/app/services/dashboard-profile.service')>();
  return {
    ...actual,
    loadDashboardPreferences,
    saveDashboardPreferences,
  };
});

const CLIENT: DashboardProfileClient = {
  id: 'client_phone_01',
  name: 'Vishal’s phone',
  kind: 'phone',
};

function preferenceDocument(
  scope: DashboardPreferenceScope,
  revision: number,
  values: Record<string, unknown>
): DashboardPreferenceDocument {
  return {
    contractVersion: 1,
    schemaVersion: SETTINGS_PROFILE_SCHEMA_VERSION,
    scope,
    revision,
    updatedAt: `2026-07-25T09:${String(revision).padStart(2, '0')}:00.000Z`,
    values,
    principal: {
      providerId: 'home_assistant',
      userId: scope === 'account' ? 'ha_user_01' : null,
      userName: scope === 'account' ? 'Vishal' : null,
    },
    clientId: scope === 'client' ? CLIENT.id : null,
  };
}

function availableDocument(
  scope: DashboardPreferenceScope,
  revision: number,
  values: Record<string, unknown>
) {
  return {
    available: true,
    unauthorized: false,
    document: preferenceDocument(scope, revision, values),
  };
}

function unavailableDocument(unauthorized = false) {
  return {
    available: false,
    unauthorized,
    document: null,
  };
}

function savedDocument(
  scope: DashboardPreferenceScope,
  revision: number,
  values: Record<string, unknown>
) {
  return {
    saved: true,
    unauthorized: false,
    permanentFailure: false,
    preconditionFailed: false,
    preconditionRequired: false,
    document: preferenceDocument(scope, revision, values),
  };
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  });
}

async function flushEffects() {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }
  });
}

async function advanceTime(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    for (let index = 0; index < 8; index += 1) {
      await Promise.resolve();
    }
  });
}

describe('useDashboardPreferenceSync', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    setOnline(true);
    setVisibility('visible');
    await resetAppStores();
    localStorage.clear();
    loadDashboardPreferences.mockReset();
    saveDashboardPreferences.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('applies remote account and client documents only to their fixed layers', async () => {
    useSettingsStore.getState().updateSettings({
      username: 'Local user',
      email: 'local@example.com',
      language: 'en',
      showHomeSummaryBar: false,
      kioskMode: false,
      cameraDirectStreamUrls: {
        'camera.front': 'https://local.example.com/live?token=private',
      },
    });
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) =>
      scope === 'account'
        ? availableDocument('account', 3, {
            schemaVersion: 1,
            settings: {
              language: 'sv',
              showNotifications: false,
              showHomeSummaryBar: true,
              kioskMode: true,
              username: 'Remote account user',
            },
          })
        : availableDocument('client', 7, {
            schemaVersion: 1,
            settings: {
              kioskMode: true,
              headerTitleMode: 'clock',
              language: 'de',
              showHomeSummaryBar: true,
              cameraDirectStreamUrls: {
                'camera.front': 'https://remote.example.com/live?token=leaked',
              },
            },
          })
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    expect(useSettingsStore.getState()).toMatchObject({
      username: 'Local user',
      email: 'local@example.com',
      language: 'sv',
      showNotifications: false,
      showHomeSummaryBar: false,
      kioskMode: true,
      headerTitleMode: 'clock',
      cameraDirectStreamUrls: {
        'home_assistant:camera.front': 'https://local.example.com/live?token=private',
      },
    });
    expect(saveDashboardPreferences).not.toHaveBeenCalled();
  });

  it('polls only client preferences when account sync is unavailable in standalone mode', async () => {
    const deviceProjection = projectSettingsPreferenceLayer(useSettingsStore.getState(), 'device');
    loadDashboardPreferences.mockResolvedValue(
      availableDocument('client', 7, deviceProjection as unknown as Record<string, unknown>)
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        accountEnabled: false,
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    expect(loadDashboardPreferences.mock.calls.map(([scope]) => scope)).toEqual(['client']);

    await advanceTime(60_000);

    expect(loadDashboardPreferences.mock.calls.map(([scope]) => scope)).toEqual([
      'client',
      'client',
    ]);
    expect(saveDashboardPreferences).not.toHaveBeenCalled();
  });

  it.each([
    ['unavailable', unavailableDocument(false)],
    ['unauthorized', unavailableDocument(true)],
  ])('keeps account preferences local when that layer is %s', async (_label, accountResult) => {
    useSettingsStore.getState().updateSettings({
      language: 'de',
      showNotifications: true,
      kioskMode: false,
    });
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) =>
      scope === 'account'
        ? accountResult
        : availableDocument('client', 5, {
            settings: {
              kioskMode: true,
              language: 'sv',
            },
          })
    );
    saveDashboardPreferences.mockImplementation(
      async (
        scope: DashboardPreferenceScope,
        values: Record<string, unknown>,
        baseRevision: number
      ) => savedDocument(scope, baseRevision + 1, values)
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    expect(useSettingsStore.getState()).toMatchObject({
      language: 'de',
      showNotifications: true,
      kioskMode: true,
    });

    act(() => {
      useSettingsStore.getState().updateSettings({
        language: 'sv',
        compactMode: true,
      });
    });
    await advanceTime(750);

    expect(saveDashboardPreferences).toHaveBeenCalledTimes(1);
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'client',
      expect.objectContaining({
        settings: expect.objectContaining({ compactMode: true }),
      }),
      5,
      expect.objectContaining({ author: CLIENT })
    );
  });

  it('retries unauthorized preference loads as soon as authentication refreshes', async () => {
    let authenticated = false;
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) => {
      if (!authenticated) {
        return unavailableDocument(true);
      }
      return scope === 'account'
        ? availableDocument('account', 2, {
            settings: {
              language: 'sv',
            },
          })
        : availableDocument('client', 3, {
            settings: {
              kioskMode: true,
            },
          });
    });

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();
    expect(loadDashboardPreferences).toHaveBeenCalledTimes(2);

    authenticated = true;
    act(() => {
      window.dispatchEvent(
        new CustomEvent(AUTH_SESSION_REFRESHED_EVENT, {
          detail: { providerId: 'home_assistant' },
        })
      );
    });
    await flushEffects();

    expect(loadDashboardPreferences).toHaveBeenCalledTimes(4);
    expect(useSettingsStore.getState()).toMatchObject({
      language: 'sv',
      kioskMode: true,
    });
  });

  it('preserves settings changed while preference authentication is unavailable', async () => {
    let authenticated = false;
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) => {
      if (!authenticated) {
        return unavailableDocument(true);
      }
      return scope === 'account'
        ? availableDocument('account', 2, {
            settings: {
              language: 'de',
            },
          })
        : availableDocument('client', 3, {
            settings: {
              kioskMode: false,
            },
          });
    });
    saveDashboardPreferences.mockImplementation(
      async (
        scope: DashboardPreferenceScope,
        values: Record<string, unknown>,
        baseRevision: number
      ) => savedDocument(scope, baseRevision + 1, values)
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    act(() => {
      useSettingsStore.getState().updateSettings({
        language: 'sv',
        kioskMode: true,
      });
    });
    authenticated = true;
    act(() => {
      window.dispatchEvent(
        new CustomEvent(AUTH_SESSION_REFRESHED_EVENT, {
          detail: { providerId: 'home_assistant' },
        })
      );
    });
    await flushEffects();

    expect(useSettingsStore.getState()).toMatchObject({
      language: 'sv',
      kioskMode: true,
    });
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({ language: 'sv' }),
      }),
      2,
      expect.any(Object)
    );
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'client',
      expect.objectContaining({
        settings: expect.objectContaining({ kioskMode: true }),
      }),
      3,
      expect.any(Object)
    );
  });

  it('rotates a stale browser client identity when the binding cookie is lost', async () => {
    localStorage.setItem(
      STORAGE_KEYS.dashboardClientIdentity,
      JSON.stringify({
        ...CLIENT,
        nameSource: 'custom',
        createdAt: '2026-07-25T09:00:00.000Z',
        updatedAt: '2026-07-25T09:00:00.000Z',
      })
    );
    const listener = vi.fn();
    window.addEventListener(DASHBOARD_CLIENT_IDENTITY_EVENT, listener);
    loadDashboardPreferences
      .mockResolvedValueOnce({
        available: false,
        unauthorized: false,
        failureCode: DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch,
        document: null,
      })
      .mockResolvedValue(unavailableDocument());

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    const rotated = JSON.parse(localStorage.getItem(STORAGE_KEYS.dashboardClientIdentity) ?? '{}');
    expect(rotated).toMatchObject({
      name: CLIENT.name,
      nameSource: 'custom',
    });
    expect(rotated.id).not.toBe(CLIENT.id);
    expect(listener).toHaveBeenCalledOnce();
    expect(saveDashboardPreferences).not.toHaveBeenCalled();
    window.removeEventListener(DASHBOARD_CLIENT_IDENTITY_EVENT, listener);
  });

  it('reuses an already-rotated client identity and immediately retries preference binding', async () => {
    const recoveredClient = {
      ...CLIENT,
      id: '87654321_4321_4321_4321_876543218765',
      updatedAt: '2026-07-25T09:05:00.000Z',
    };
    localStorage.setItem(
      STORAGE_KEYS.dashboardClientIdentity,
      JSON.stringify({
        ...recoveredClient,
        nameSource: 'custom',
        createdAt: '2026-07-25T09:00:00.000Z',
      })
    );
    const listener = vi.fn();
    window.addEventListener(DASHBOARD_CLIENT_IDENTITY_EVENT, listener);
    loadDashboardPreferences.mockImplementation(
      async (_scope: DashboardPreferenceScope, options?: { author?: typeof CLIENT }) => {
        if (options?.author?.id === CLIENT.id) {
          return {
            available: false,
            unauthorized: false,
            failureCode: DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch,
            document: null,
          };
        }
        return unavailableDocument();
      }
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ id: recoveredClient.id }),
      })
    );
    expect(loadDashboardPreferences).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        author: expect.objectContaining({ id: recoveredClient.id }),
      })
    );
    window.removeEventListener(DASHBOARD_CLIENT_IDENTITY_EVENT, listener);
  });

  it('seeds each available empty preference document from its owned local settings', async () => {
    useSettingsStore.getState().updateSettings({
      username: 'Local user',
      language: 'sv',
      temperatureUnit: 'celsius',
      showHomeSummaryBar: false,
      kioskMode: true,
      keepDeviceAwake: true,
    });
    loadDashboardPreferences.mockResolvedValue({
      available: true,
      unauthorized: false,
      document: null,
    });
    saveDashboardPreferences.mockImplementation(
      async (
        scope: DashboardPreferenceScope,
        values: Record<string, unknown>,
        baseRevision: number
      ) => savedDocument(scope, baseRevision + 1, values)
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    expect(saveDashboardPreferences).toHaveBeenCalledTimes(2);
    const accountProjection = projectSettingsPreferenceLayer(
      useSettingsStore.getState(),
      'account'
    );
    const deviceProjection = projectSettingsPreferenceLayer(useSettingsStore.getState(), 'device');
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'account',
      accountProjection,
      0,
      expect.objectContaining({
        author: CLIENT,
        schemaVersion: SETTINGS_PROFILE_SCHEMA_VERSION,
      })
    );
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'client',
      deviceProjection,
      0,
      expect.objectContaining({
        author: CLIENT,
        schemaVersion: SETTINGS_PROFILE_SCHEMA_VERSION,
      })
    );
    expect(JSON.stringify(accountProjection)).not.toContain('Local user');
    expect(accountProjection.settings).not.toHaveProperty('showHomeSummaryBar');
    expect(deviceProjection.settings).not.toHaveProperty('language');
    expect(deviceProjection.settings).not.toHaveProperty('showHomeSummaryBar');
  });

  it('accepts a concurrent first account seed without overwriting it', async () => {
    useSettingsStore.getState().updateSettings({ language: 'sv' });
    let accountLoadCount = 0;
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) => {
      if (scope === 'client') {
        return unavailableDocument();
      }
      accountLoadCount += 1;
      return accountLoadCount === 1
        ? {
            available: true,
            unauthorized: false,
            document: null,
          }
        : availableDocument('account', 1, {
            schemaVersion: 1,
            settings: { language: 'de' },
          });
    });
    saveDashboardPreferences.mockResolvedValueOnce({
      saved: false,
      unauthorized: false,
      permanentFailure: false,
      preconditionFailed: true,
      preconditionRequired: false,
      document: null,
    });

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    expect(saveDashboardPreferences).toHaveBeenCalledOnce();
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({ language: 'sv' }),
      }),
      0,
      expect.any(Object)
    );
    expect(useSettingsStore.getState().language).toBe('de');
  });

  it('recreates an authoritative empty preference document from revision zero', async () => {
    let accountLoadCount = 0;
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) => {
      if (scope === 'client') {
        return unavailableDocument();
      }
      accountLoadCount += 1;
      return accountLoadCount === 1
        ? availableDocument('account', 4, {
            schemaVersion: 1,
            settings: { language: 'sv' },
          })
        : {
            available: true,
            unauthorized: false,
            document: null,
          };
    });
    saveDashboardPreferences.mockImplementation(
      async (
        scope: DashboardPreferenceScope,
        values: Record<string, unknown>,
        baseRevision: number
      ) => savedDocument(scope, baseRevision + 1, values)
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();
    await advanceTime(60_000);

    expect(saveDashboardPreferences).toHaveBeenCalledOnce();
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({ language: 'sv' }),
      }),
      0,
      expect.any(Object)
    );
  });

  it('debounces local changes and advances account and client revisions independently', async () => {
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) =>
      scope === 'account'
        ? availableDocument('account', 3, {
            settings: {
              language: 'en',
              temperatureUnit: 'fahrenheit',
            },
          })
        : availableDocument('client', 7, {
            settings: {
              kioskMode: false,
              keepDeviceAwake: false,
            },
          })
    );
    saveDashboardPreferences.mockImplementation(
      async (
        scope: DashboardPreferenceScope,
        values: Record<string, unknown>,
        baseRevision: number
      ) => savedDocument(scope, baseRevision + 1, values)
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    act(() => {
      useSettingsStore.getState().updateSettings({
        language: 'sv',
        kioskMode: true,
        username: 'Never synchronized',
        showHomeSummaryBar: false,
      });
    });
    await advanceTime(749);
    expect(saveDashboardPreferences).not.toHaveBeenCalled();

    await advanceTime(1);
    expect(saveDashboardPreferences).toHaveBeenCalledTimes(2);
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({ language: 'sv' }),
      }),
      3,
      expect.any(Object)
    );
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'client',
      expect.objectContaining({
        settings: expect.objectContaining({ kioskMode: true }),
      }),
      7,
      expect.any(Object)
    );
    for (const [, projection] of saveDashboardPreferences.mock.calls) {
      expect(projection.settings).not.toHaveProperty('username');
      expect(projection.settings).not.toHaveProperty('showHomeSummaryBar');
    }

    act(() => {
      useSettingsStore.getState().updateSettings({
        temperatureUnit: 'celsius',
      });
    });
    await advanceTime(750);

    expect(saveDashboardPreferences).toHaveBeenCalledTimes(3);
    expect(saveDashboardPreferences).toHaveBeenLastCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({
          language: 'sv',
          temperatureUnit: 'celsius',
        }),
      }),
      4,
      expect.any(Object)
    );
  });

  it('preserves a pending device preference when client metadata rerenders before the debounce', async () => {
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) =>
      scope === 'account'
        ? unavailableDocument()
        : availableDocument('client', 7, {
            settings: {
              dashboardProfileMode: 'standard',
            },
          })
    );
    saveDashboardPreferences.mockImplementation(
      async (
        scope: DashboardPreferenceScope,
        values: Record<string, unknown>,
        baseRevision: number
      ) => savedDocument(scope, baseRevision + 1, values)
    );
    const wallPanelClient: DashboardProfileClient = {
      ...CLIENT,
      kind: 'wall_panel',
      name: 'Kitchen panel',
    };
    const { rerender } = renderHookWithProviders(
      ({ activeClient }: { activeClient: DashboardProfileClient }) =>
        useDashboardPreferenceSync({
          client: activeClient,
          enabled: true,
        }),
      {
        initialProps: {
          activeClient: CLIENT,
        },
      }
    );
    await flushEffects();

    act(() => {
      useSettingsStore.getState().updateSettings({
        dashboardProfileMode: 'wall_display',
      });
    });
    await advanceTime(300);
    rerender({ activeClient: wallPanelClient });
    await flushEffects();

    expect(loadDashboardPreferences).toHaveBeenCalledTimes(2);
    expect(useSettingsStore.getState().dashboardProfileMode).toBe('wall_display');

    await advanceTime(450);

    expect(saveDashboardPreferences).toHaveBeenCalledOnce();
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'client',
      expect.objectContaining({
        settings: expect.objectContaining({
          dashboardProfileMode: 'wall_display',
        }),
      }),
      7,
      expect.objectContaining({
        author: wallPanelClient,
      })
    );
    expect(useSettingsStore.getState().dashboardProfileMode).toBe('wall_display');
  });

  it('merges a stale account write over the newer remote revision and retries once', async () => {
    let accountLoad = 0;
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) => {
      if (scope === 'client') {
        return unavailableDocument();
      }
      accountLoad += 1;
      return accountLoad === 1
        ? availableDocument('account', 2, {
            settings: {
              language: 'en',
              showNotifications: true,
            },
          })
        : availableDocument('account', 3, {
            settings: {
              language: 'en',
              showNotifications: false,
            },
          });
    });
    saveDashboardPreferences
      .mockResolvedValueOnce({
        saved: false,
        unauthorized: false,
        permanentFailure: false,
        preconditionFailed: true,
        preconditionRequired: false,
        document: null,
      })
      .mockImplementationOnce(
        async (
          scope: DashboardPreferenceScope,
          values: Record<string, unknown>,
          baseRevision: number
        ) => savedDocument(scope, baseRevision + 1, values)
      );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    act(() => {
      useSettingsStore.getState().updateSettings({
        language: 'sv',
      });
    });
    await advanceTime(750);

    expect(saveDashboardPreferences).toHaveBeenCalledTimes(2);
    expect(saveDashboardPreferences.mock.calls[0]?.[2]).toBe(2);
    expect(saveDashboardPreferences).toHaveBeenLastCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({
          language: 'sv',
          showNotifications: false,
        }),
      }),
      3,
      expect.any(Object)
    );
    expect(useSettingsStore.getState()).toMatchObject({
      language: 'sv',
      showNotifications: false,
    });
  });

  it('retries an unsaved local preference after a transient write failure', async () => {
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) =>
      scope === 'account'
        ? availableDocument('account', 2, {
            settings: {
              language: 'en',
            },
          })
        : unavailableDocument()
    );
    saveDashboardPreferences
      .mockResolvedValueOnce({
        saved: false,
        unauthorized: false,
        permanentFailure: false,
        preconditionFailed: false,
        preconditionRequired: false,
        document: null,
      })
      .mockImplementationOnce(
        async (
          scope: DashboardPreferenceScope,
          values: Record<string, unknown>,
          baseRevision: number
        ) => savedDocument(scope, baseRevision + 1, values)
      );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    act(() => {
      useSettingsStore.getState().updateSettings({ language: 'sv' });
    });
    await advanceTime(750);
    expect(saveDashboardPreferences).toHaveBeenCalledTimes(1);

    await advanceTime(60_000);

    expect(saveDashboardPreferences).toHaveBeenCalledTimes(2);
    expect(saveDashboardPreferences).toHaveBeenLastCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({ language: 'sv' }),
      }),
      2,
      expect.any(Object)
    );
  });

  it('saves the latest local preference when it changes during an in-flight write', async () => {
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) =>
      scope === 'account'
        ? availableDocument('account', 2, {
            settings: {
              language: 'en',
            },
          })
        : unavailableDocument()
    );
    let resolveFirstSave: ((result: ReturnType<typeof savedDocument>) => void) | undefined;
    saveDashboardPreferences
      .mockImplementationOnce(
        async () =>
          await new Promise<ReturnType<typeof savedDocument>>((resolve) => {
            resolveFirstSave = resolve;
          })
      )
      .mockImplementationOnce(
        async (
          scope: DashboardPreferenceScope,
          values: Record<string, unknown>,
          baseRevision: number
        ) => savedDocument(scope, baseRevision + 1, values)
      );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    act(() => {
      useSettingsStore.getState().updateSettings({ language: 'sv' });
    });
    await advanceTime(750);
    expect(saveDashboardPreferences).toHaveBeenCalledTimes(1);

    act(() => {
      useSettingsStore.getState().updateSettings({ language: 'de' });
    });
    await advanceTime(750);
    expect(saveDashboardPreferences).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstSave?.(
        savedDocument(
          'account',
          3,
          saveDashboardPreferences.mock.calls[0]?.[1] as Record<string, unknown>
        )
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDashboardPreferences).toHaveBeenCalledTimes(2);
    expect(saveDashboardPreferences).toHaveBeenLastCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({ language: 'de' }),
      }),
      3,
      expect.any(Object)
    );
  });

  it('retries immediately when authentication refreshes during an in-flight preference save', async () => {
    let accountLoadCount = 0;
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) => {
      if (scope === 'client') {
        return unavailableDocument();
      }
      accountLoadCount += 1;
      return availableDocument('account', accountLoadCount, {
        settings: {
          language: 'en',
        },
      });
    });
    let resolveFirstSave:
      | ((result: {
          saved: boolean;
          unauthorized: boolean;
          failureCode: null;
          permanentFailure: boolean;
          preconditionFailed: boolean;
          preconditionRequired: boolean;
          document: null;
        }) => void)
      | undefined;
    saveDashboardPreferences
      .mockImplementationOnce(
        async () =>
          await new Promise((resolve) => {
            resolveFirstSave = resolve;
          })
      )
      .mockImplementation(
        async (
          scope: DashboardPreferenceScope,
          values: Record<string, unknown>,
          baseRevision: number
        ) => savedDocument(scope, baseRevision + 1, values)
      );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    act(() => {
      useSettingsStore.getState().updateSettings({ language: 'sv' });
    });
    await advanceTime(750);
    expect(saveDashboardPreferences).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(AUTH_SESSION_REFRESHED_EVENT, {
          detail: { providerId: 'home_assistant' },
        })
      );
    });
    await flushEffects();
    expect(loadDashboardPreferences).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFirstSave?.({
        saved: false,
        unauthorized: true,
        failureCode: null,
        permanentFailure: false,
        preconditionFailed: false,
        preconditionRequired: false,
        document: null,
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushEffects();

    expect(loadDashboardPreferences).toHaveBeenCalledTimes(4);
    expect(saveDashboardPreferences).toHaveBeenLastCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({ language: 'sv' }),
      }),
      2,
      expect.any(Object)
    );
  });

  it('flushes a debounced preference with keepalive when the page is hidden', async () => {
    loadDashboardPreferences.mockImplementation(async (scope: DashboardPreferenceScope) =>
      scope === 'account'
        ? availableDocument('account', 2, {
            settings: {
              language: 'en',
            },
          })
        : unavailableDocument()
    );
    saveDashboardPreferences.mockImplementation(
      async (
        scope: DashboardPreferenceScope,
        values: Record<string, unknown>,
        baseRevision: number
      ) => savedDocument(scope, baseRevision + 1, values)
    );

    renderHookWithProviders(() =>
      useDashboardPreferenceSync({
        client: CLIENT,
        enabled: true,
      })
    );
    await flushEffects();

    act(() => {
      useSettingsStore.getState().updateSettings({ language: 'sv' });
      window.dispatchEvent(new Event('pagehide'));
    });
    await flushEffects();

    expect(saveDashboardPreferences).toHaveBeenCalledTimes(1);
    expect(saveDashboardPreferences).toHaveBeenCalledWith(
      'account',
      expect.objectContaining({
        settings: expect.objectContaining({ language: 'sv' }),
      }),
      2,
      expect.objectContaining({
        author: CLIENT,
        keepalive: true,
      })
    );
  });
});

import type {
  DashboardPreferenceDocument,
  DashboardPreferenceScope,
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

const CLIENT = {
  id: 'client_phone_01',
  name: 'Vishal’s phone',
  kind: 'phone' as const,
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
});

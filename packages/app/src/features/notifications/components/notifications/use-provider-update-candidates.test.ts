import type { PlatformEntitySnapshotMap } from '@navet/app/platform/provider-feature-models';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProviderUpdateCandidates } from './use-provider-update-candidates';

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    subscribeEntitySnapshots: vi.fn(() => () => {}),
    subscribeEntityRegistryEntries: vi.fn(() => () => {}),
    subscribeConfig: vi.fn(() => () => {}),
    getConfig: vi.fn(() => null),
    getEntitySnapshots: vi.fn<() => PlatformEntitySnapshotMap | null>(() => null),
    getEntityRegistryEntries: vi.fn(() => []),
  },
}));

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: () => ({ entityRuntimeService: serviceMock }),
}));

describe('useProviderUpdateCandidates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationStore.getState().setCurrentProviderId('home_assistant');
    serviceMock.subscribeEntitySnapshots.mockImplementation(() => () => {});
    serviceMock.getEntitySnapshots.mockReturnValue({
      'update.navet_dashboard': {
        entityId: 'update.navet_dashboard',
        state: 'on',
        attributes: {
          friendly_name: 'Navet Dashboard',
          installed_version: '1.0.0',
          latest_version: '1.1.0',
          release_summary: 'Bug fixes',
          release_notes: 'https://example.com/release-notes',
          update_progress: 42.4,
          in_progress: true,
        },
        lastChanged: '2026-05-29T07:00:00.000Z',
        lastUpdated: '2026-05-29T07:01:00.000Z',
      },
      'update.navet_os': {
        entityId: 'update.navet_os',
        state: 'off',
        attributes: {
          friendly_name: 'Navet OS',
          release_notes:
            "<ha-alert alert-type='error'>Restart of Home Assistant required</ha-alert>",
          release_notes_url: 'https://example.com/os-notes',
        },
        lastChanged: '2026-05-29T06:00:00.000Z',
        lastUpdated: '2026-05-29T06:30:00.000Z',
      },
      'sensor.not_an_update': {
        entityId: 'sensor.not_an_update',
        state: 'idle',
        attributes: {
          friendly_name: 'Ignore me',
        },
        lastChanged: '2026-05-29T06:00:00.000Z',
        lastUpdated: '2026-05-29T06:30:00.000Z',
      },
    });
  });

  it('maps only update entities from the provider runtime snapshot', () => {
    const { result } = renderHookWithProviders(() => useProviderUpdateCandidates());

    expect(result.current).toEqual([
      expect.objectContaining({
        entityId: 'update.navet_dashboard',
        friendlyName: 'Navet Dashboard',
        installedVersion: '1.0.0',
        latestVersion: '1.1.0',
        detailsUrl: 'https://example.com/release-notes',
        progress: 42,
        inProgress: true,
      }),
      expect.objectContaining({
        entityId: 'update.navet_os',
        releaseNotes: 'Restart of Home Assistant required',
        detailsUrl: 'https://example.com/os-notes',
        requiresRestart: true,
      }),
    ]);
  });

  it('returns no candidates for non-Home Assistant providers', () => {
    integrationStore.getState().setCurrentProviderId('homey');

    const { result } = renderHookWithProviders(() => useProviderUpdateCandidates());

    expect(result.current).toEqual([]);
  });
});

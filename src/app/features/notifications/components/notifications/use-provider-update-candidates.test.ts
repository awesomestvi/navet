import { beforeEach, describe, expect, it, vi } from 'vitest';
import { integrationStore } from '@/app/stores/integration-store';
import { renderHookWithProviders } from '@/test/render';
import { useProviderUpdateCandidates } from './use-provider-update-candidates';

type MockEntityMap = Record<
  string,
  {
    state: string;
    attributes?: Record<string, unknown>;
    last_changed?: string;
    last_updated?: string;
  }
>;

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    addListener: vi.fn(() => () => {}),
    getConfig: vi.fn(() => null),
    getEntities: vi.fn<() => MockEntityMap | null>(() => null),
    getEntityRegistry: vi.fn(() => []),
  },
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

describe('useProviderUpdateCandidates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationStore.getState().setCurrentProviderId('home_assistant');
    serviceMock.addListener.mockImplementation(() => () => {});
    serviceMock.getEntities.mockReturnValue({
      'update.navet_dashboard': {
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
        last_changed: '2026-05-29T07:00:00.000Z',
        last_updated: '2026-05-29T07:01:00.000Z',
      },
      'update.navet_os': {
        state: 'off',
        attributes: {
          friendly_name: 'Navet OS',
          release_notes: 'Maintenance release',
          release_notes_url: 'https://example.com/os-notes',
        },
        last_changed: '2026-05-29T06:00:00.000Z',
        last_updated: '2026-05-29T06:30:00.000Z',
      },
      'sensor.not_an_update': {
        state: 'idle',
        attributes: {
          friendly_name: 'Ignore me',
        },
        last_changed: '2026-05-29T06:00:00.000Z',
        last_updated: '2026-05-29T06:30:00.000Z',
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
        releaseNotes: 'Maintenance release',
        detailsUrl: 'https://example.com/os-notes',
      }),
    ]);
  });

  it('returns no candidates for non-Home Assistant providers', () => {
    integrationStore.getState().setCurrentProviderId('homey');

    const { result } = renderHookWithProviders(() => useProviderUpdateCandidates());

    expect(result.current).toEqual([]);
  });
});

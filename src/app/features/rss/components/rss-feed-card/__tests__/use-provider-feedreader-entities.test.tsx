import { beforeEach, describe, expect, it, vi } from 'vitest';
import { integrationStore } from '@/app/stores/integration-store';
import { renderHookWithProviders } from '@/test/render';
import { useProviderFeedreaderEntities } from '../use-provider-feedreader-entities';

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
    getEntities: vi.fn<() => MockEntityMap | null>(() => null),
  },
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

describe('useProviderFeedreaderEntities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationStore.getState().setCurrentProviderId('home_assistant');
    serviceMock.addListener.mockImplementation(() => () => {});
    serviceMock.getEntities.mockReturnValue({
      'event.feedreader_world': {
        state: '2026-05-29T07:00:00+00:00',
        attributes: {
          title: 'World headline',
          link: 'https://example.com/world',
          attribution: 'Example News',
        },
        last_changed: '2026-05-29T07:00:00.000Z',
        last_updated: '2026-05-29T07:00:00.000Z',
      },
      'event.ignored_without_link': {
        state: '2026-05-29T07:01:00+00:00',
        attributes: {
          title: 'Ignored item',
        },
        last_changed: '2026-05-29T07:01:00.000Z',
        last_updated: '2026-05-29T07:01:00.000Z',
      },
      'sensor.not_a_feed': {
        state: 'on',
        attributes: {
          title: 'Wrong domain',
          link: 'https://example.com/ignore',
        },
        last_changed: '2026-05-29T07:02:00.000Z',
        last_updated: '2026-05-29T07:02:00.000Z',
      },
    });
  });

  it('returns only feedreader-style Home Assistant event entities', () => {
    const { result } = renderHookWithProviders(() => useProviderFeedreaderEntities());

    expect(result.current).toEqual({
      'event.feedreader_world': expect.objectContaining({
        entityId: 'event.feedreader_world',
        state: '2026-05-29T07:00:00+00:00',
      }),
    });
  });

  it('narrows to requested entity ids', () => {
    const { result } = renderHookWithProviders(() =>
      useProviderFeedreaderEntities(['event.feedreader_world', 'event.missing'])
    );

    expect(Object.keys(result.current)).toEqual(['event.feedreader_world']);
  });

  it('returns empty data for non-Home Assistant providers', () => {
    integrationStore.getState().setCurrentProviderId('homey');

    const { result } = renderHookWithProviders(() => useProviderFeedreaderEntities());

    expect(result.current).toEqual({});
  });
});

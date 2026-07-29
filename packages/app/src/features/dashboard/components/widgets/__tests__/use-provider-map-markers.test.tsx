import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProviderMapMarkers } from '../use-provider-map-markers';

const { useIntegrationStoreMock, useProviderEntitySnapshotsByPrefixMock } = vi.hoisted(() => ({
  useIntegrationStoreMock: vi.fn(),
  useProviderEntitySnapshotsByPrefixMock: vi.fn(),
}));

vi.mock('@navet/app/hooks', () => ({
  useIntegrationStore: useIntegrationStoreMock,
}));

vi.mock('@navet/app/hooks/use-provider-entity', () => ({
  useProviderEntitySnapshotsByPrefix: useProviderEntitySnapshotsByPrefixMock,
}));

describe('useProviderMapMarkers', () => {
  beforeEach(() => {
    useIntegrationStoreMock.mockReset();
    useIntegrationStoreMock.mockReturnValue('home_assistant');
    useProviderEntitySnapshotsByPrefixMock.mockReset();
    useProviderEntitySnapshotsByPrefixMock.mockReturnValue({
      'person.vishal': {
        state: 'home',
        attributes: {
          friendly_name: 'Vishal',
          latitude: 59.33,
          longitude: 18.06,
        },
      },
    });
  });

  it('subscribes only to person and tracker snapshots when enabled', () => {
    const { result } = renderHook(() => useProviderMapMarkers(true));

    expect(useProviderEntitySnapshotsByPrefixMock).toHaveBeenLastCalledWith(
      ['person.', 'device_tracker.'],
      {
        providerId: 'home_assistant',
        enabled: true,
      }
    );
    expect(result.current).toEqual([
      expect.objectContaining({
        id: 'person.vishal',
        latitude: 59.33,
        longitude: 18.06,
      }),
    ]);
  });

  it('keeps the provider snapshot subscription disabled when the map is inactive', () => {
    renderHook(() => useProviderMapMarkers(false));

    expect(useProviderEntitySnapshotsByPrefixMock).toHaveBeenLastCalledWith(
      ['person.', 'device_tracker.'],
      {
        providerId: 'home_assistant',
        enabled: false,
      }
    );
  });

  it('does not subscribe to unsupported provider snapshots', () => {
    useIntegrationStoreMock.mockReturnValue('homey');

    renderHook(() => useProviderMapMarkers(true));

    expect(useProviderEntitySnapshotsByPrefixMock).toHaveBeenLastCalledWith(
      ['person.', 'device_tracker.'],
      {
        providerId: 'homey',
        enabled: false,
      }
    );
  });
});

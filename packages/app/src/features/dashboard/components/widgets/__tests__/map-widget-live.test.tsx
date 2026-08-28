import { OPENFREEMAP_LIGHT_STYLE_URL } from '@navet/app/constants';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapWidgetLive } from '../map-widget-live';

const { addControlMock, mapInstances, mapRemoveMock } = vi.hoisted(() => ({
  addControlMock: vi.fn(),
  mapInstances: [] as Array<Record<string, unknown>>,
  mapRemoveMock: vi.fn(),
}));

vi.mock('maplibre-gl', () => {
  class MapMock {
    addControl = addControlMock;
    addImage = vi.fn();
    addLayer = vi.fn();
    addSource = vi.fn();
    fitBounds = vi.fn();
    getLayer = vi.fn(() => undefined);
    getSource = vi.fn(() => undefined);
    hasImage = vi.fn(() => false);
    jumpTo = vi.fn();
    isStyleLoaded = vi.fn(() => true);
    off = vi.fn();
    once = vi.fn();
    remove = mapRemoveMock;
    removeLayer = vi.fn();
    removeSource = vi.fn();
    setMissingStyleImageResolver = vi.fn();

    constructor(options: Record<string, unknown>) {
      Object.assign(this, { options });
      mapInstances.push(this as unknown as Record<string, unknown>);
    }
  }

  return {
    LngLatBounds: class {
      extend = vi.fn();
    },
    Map: MapMock,
    Marker: class {},
    Popup: class {},
  };
});

describe('MapWidgetLive', () => {
  beforeEach(() => {
    addControlMock.mockClear();
    mapInstances.length = 0;
    mapRemoveMock.mockClear();
  });

  it('mounts and cleans up the keyless OpenFreeMap vector map', () => {
    const { unmount } = render(
      <MapWidgetLive
        accentHex="#f97316"
        defaultCenter={[20, 0]}
        isSmallCard={false}
        mapStyleUrl={OPENFREEMAP_LIGHT_STYLE_URL}
        mapWidgetSurface={{
          popupBg: '#fff',
          popupBorder: '#ddd',
          popupShadow: 'none',
          popupText: '#111',
          tileFilter: 'none',
          tileOpacity: '1',
        }}
        markers={[]}
      />
    );

    expect(mapInstances).toHaveLength(1);
    expect(mapInstances[0].options).toEqual(
      expect.objectContaining({
        attributionControl: false,
        style: OPENFREEMAP_LIGHT_STYLE_URL,
      })
    );
    expect(addControlMock).not.toHaveBeenCalled();

    unmount();
    expect(mapRemoveMock).toHaveBeenCalledOnce();
  });
});

import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { MapMarker } from './map-types';

export function BoundsFitter({ markers }: { markers: readonly MapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize(false);

      if (markers.length === 0) {
        return;
      }

      if (markers.length === 1) {
        map.setView([markers[0].latitude, markers[0].longitude], 13, { animate: false });
        return;
      }

      const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
      map.fitBounds(bounds, { padding: [32, 32], animate: false, maxZoom: 15 });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [map, markers]);

  return null;
}

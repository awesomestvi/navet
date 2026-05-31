import L from 'leaflet';
import type { MapMarker } from './map-types';

export function buildMarkerIcon(marker: MapMarker, accentHex: string): L.DivIcon {
  const size = 36;
  const initials = marker.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const inner = marker.entityPicture
    ? `<img src="${marker.entityPicture}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="font-size:12px;font-weight:700;color:#fff;line-height:1;">${initials}</span>`;

  const isHome = marker.state === 'home';
  const borderColor = isHome ? accentHex : 'rgba(255,255,255,0.35)';

  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      border:2.5px solid ${borderColor};
      background:${marker.entityPicture ? 'transparent' : isHome ? accentHex : 'rgba(30,30,40,0.85)'};
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.45);
      backdrop-filter:blur(4px);
    ">${inner}</div>
    <div style="
      width:6px;height:6px;border-radius:50%;
      background:${isHome ? accentHex : 'rgba(255,255,255,0.45)'};
      margin:-2px auto 0;box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  });
}

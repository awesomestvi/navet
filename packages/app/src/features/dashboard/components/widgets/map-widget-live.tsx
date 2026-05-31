import 'leaflet/dist/leaflet.css';
import type { MapWidgetSurfaceTokens } from '@navet/app/components/shared/theme/map-widget-surface-tokens';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { AttributionControl, Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { BoundsFitter } from './map-bounds-fitter';
import { buildMarkerIcon } from './map-marker-icon';
import { TILE_ATTRIBUTION } from './map-tiles';
import type { MapMarker } from './map-types';

interface MapWidgetLiveProps {
  accentHex: string;
  defaultCenter: [number, number];
  isSmallCard: boolean;
  mapWidgetSurface: MapWidgetSurfaceTokens;
  markers: readonly MapMarker[];
  shouldReduceMapEffects: boolean;
  theme: ThemeType;
  tileUrl: string;
}

export function MapWidgetLive({
  accentHex,
  defaultCenter,
  isSmallCard,
  mapWidgetSurface,
  markers,
  shouldReduceMapEffects,
  theme,
  tileUrl,
}: MapWidgetLiveProps) {
  return (
    <>
      <MapContainer
        center={defaultCenter}
        zoom={4}
        zoomControl={false}
        attributionControl={false}
        className="dashboard-map-widget h-full w-full"
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={tileUrl} attribution={TILE_ATTRIBUTION} detectRetina={false} />
        {!isSmallCard ? <AttributionControl prefix={false} position="bottomleft" /> : null}
        <BoundsFitter markers={markers} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={buildMarkerIcon(marker, accentHex)}
          >
            <Popup>
              <div style={{ minWidth: 120 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{marker.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'capitalize' }}>
                  {marker.state}
                </div>
                {typeof marker.gpsAccuracy === 'number' && (
                  <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
                    ±{marker.gpsAccuracy} m
                  </div>
                )}
              </div>
            </Popup>
            {typeof marker.gpsAccuracy === 'number' && marker.gpsAccuracy > 0 && (
              <Circle
                center={[marker.latitude, marker.longitude]}
                radius={marker.gpsAccuracy}
                pathOptions={{
                  color: accentHex,
                  fillColor: accentHex,
                  fillOpacity: 0.08,
                  weight: 1,
                }}
              />
            )}
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        .dashboard-map-widget,
        .dashboard-map-widget.leaflet-container {
          border-radius: inherit;
          background: transparent;
        }

        .dashboard-map-widget .leaflet-tile-pane {
          opacity: ${mapWidgetSurface.tileOpacity};
          filter: ${mapWidgetSurface.tileFilter};
        }

        .dashboard-map-widget .leaflet-control-attribution {
          margin: 8px;
          border-radius: 12px 12px 12px 20px;
          padding: 3px 8px;
          font-size: 10px;
          line-height: 1.15;
          background: ${mapWidgetSurface.attributionBg};
          color: ${mapWidgetSurface.attributionText};
          border: 1px solid ${mapWidgetSurface.attributionBorder};
          backdrop-filter: ${theme === 'light' || shouldReduceMapEffects ? 'none' : 'blur(16px)'};
        }

        .dashboard-map-widget .leaflet-control-attribution a {
          color: inherit;
        }

        .dashboard-map-widget .leaflet-popup-content-wrapper,
        .dashboard-map-widget .leaflet-popup-tip {
          background: ${mapWidgetSurface.popupBg};
          color: ${mapWidgetSurface.popupText};
          border: 1px solid ${mapWidgetSurface.popupBorder};
          box-shadow: ${mapWidgetSurface.popupShadow};
          backdrop-filter: ${shouldReduceMapEffects ? 'none' : 'blur(16px)'};
        }
      `}</style>
    </>
  );
}

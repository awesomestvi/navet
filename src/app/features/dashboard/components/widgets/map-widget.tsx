import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AttributionControl, Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { useShallow } from 'zustand/react/shallow';
import { BaseCard } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { normalizeCustomCardTint } from '@/app/components/shared/theme/custom-card-tint-surface';
import {
  getMapControlSurfaceTokens,
  getMapWidgetSurfaceTokens,
} from '@/app/components/shared/theme/map-widget-surface-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, usePrimaryColor, useThemeMode } from '@/app/hooks';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import { resolveEffectsQuality } from '@/app/utils/effects-quality';
import { resolveHomeAssistantProxyUrl } from '@/app/utils/home-assistant-url';
import { BoundsFitter } from './map-bounds-fitter';
import { getCompactHomeAssistantImageUrl } from './map-image-url';
import { buildMarkerIcon } from './map-marker-icon';
import { getTileUrl, TILE_ATTRIBUTION } from './map-tiles';
import type { MapMarker } from './map-types';
import { useProviderMapMarkers } from './use-provider-map-markers';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

export interface MapWidgetProps {
  size?: CardSize;
  tintColor?: string;
  markers?: MapMarker[];
}

function requestDeferredMapReady(callback: () => void) {
  const timeoutId = window.setTimeout(callback, 650);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

function MapPlaceholder({
  markerCount,
  mapControlSurface,
  baseSurface,
  cardShell,
  label,
}: {
  markerCount: number;
  mapControlSurface: ReturnType<typeof getMapControlSurfaceTokens>;
  baseSurface: ReturnType<typeof getThemeSurfaceTokens>;
  cardShell: ReturnType<typeof getCardShellSurfaceTokens>;
  label: string;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${baseSurface.panel} ${cardShell.backdropClassName}`}
      data-map-placeholder="true"
    >
      <MapPin className={`h-8 w-8 ${mapControlSurface.emptyStateIconClassName}`} />
      <span className={`text-xs ${baseSurface.textMuted}`}>{markerCount > 0 ? label : ''}</span>
    </div>
  );
}

export const MapWidget = memo(function MapWidget({
  size = 'large',
  tintColor,
  markers: staticMarkers,
}: MapWidgetProps) {
  const theme = useThemeMode();
  const primaryColor = usePrimaryColor();
  const { t } = useI18n();
  const { disableAnimations, lowPowerMode, effectsQuality } = useSettingsStore(
    useShallow((state) => ({
      disableAnimations: state.disableAnimations,
      lowPowerMode: state.lowPowerMode,
      effectsQuality: settingsSelectors.effectsQuality(state),
    }))
  );
  const resolvedEffectsQuality = resolveEffectsQuality(
    effectsQuality,
    disableAnimations || lowPowerMode
  );
  const shouldReduceMapEffects = resolvedEffectsQuality !== 'high';
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const baseSurface = getThemeSurfaceTokens(theme);
  const cardShell = getCardShellSurfaceTokens(theme);
  const accentHex = normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const tileUrl = getTileUrl(theme);
  const isSmallCard = size === 'small';
  const mapWidgetSurface = useMemo(() => {
    const tokens = getMapWidgetSurfaceTokens(theme);
    if (!shouldReduceMapEffects) {
      return tokens;
    }

    return {
      ...tokens,
      tileFilter: 'none',
      popupShadow: 'none',
      lightOverlayBg: undefined,
    };
  }, [shouldReduceMapEffects, theme]);
  const mapControlSurface = getMapControlSurfaceTokens(theme, baseSurface, cardShell);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isMapDeferredReady, setIsMapDeferredReady] = useState(false);
  const mapFrameStyle = useMemo(
    () => ({
      borderColor:
        typeof surface.panelStyle?.borderColor === 'string'
          ? surface.panelStyle.borderColor
          : undefined,
      boxShadow: surface.panelStyle?.boxShadow,
    }),
    [surface.panelStyle]
  );
  const mapInnerStyle = useMemo(() => surface.panelStyle, [surface.panelStyle]);
  const homeAssistantMarkers = useProviderMapMarkers();
  const markers = staticMarkers ?? homeAssistantMarkers;
  const resolvedMarkers = useMemo(
    () =>
      markers.map((marker) => ({
        ...marker,
        entityPicture: marker.entityPicture
          ? (resolveHomeAssistantProxyUrl(getCompactHomeAssistantImageUrl(marker.entityPicture)) ??
            undefined)
          : undefined,
      })),
    [markers]
  );
  const shouldRenderLiveMap = resolvedMarkers.length > 0 && isMapVisible && isMapDeferredReady;

  const defaultCenter = useMemo<[number, number]>(() => [20, 0], []);

  useEffect(() => {
    const node = mapViewportRef.current;
    if (!node || resolvedMarkers.length === 0) {
      setIsMapVisible(false);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsMapVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '180px 0px' }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [resolvedMarkers.length]);

  useEffect(() => {
    if (!isMapVisible || resolvedMarkers.length === 0) {
      setIsMapDeferredReady(false);
      return;
    }

    return requestDeferredMapReady(() => setIsMapDeferredReady(true));
  }, [isMapVisible, resolvedMarkers.length]);

  return (
    <BaseCard
      size={size}
      fullBleed
      frameClassName={surface.outerFrameClassName}
      style={mapFrameStyle}
      disableDefaultSheen
      contentClassName="h-full"
    >
      <div
        ref={mapViewportRef}
        className={`${surface.innerFrameClassName} z-2 overflow-hidden ${baseSurface.panel} ${cardShell.backdropClassName}`}
        style={mapInnerStyle}
      >
        {surface.glowStyle ? (
          <div className="pointer-events-none absolute inset-0" style={surface.glowStyle} />
        ) : null}
        {resolvedMarkers.length === 0 ? (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${baseSurface.panel} ${cardShell.backdropClassName}`}
          >
            <MapPin className={`h-8 w-8 ${mapControlSurface.emptyStateIconClassName}`} />
            <span className={`text-xs ${baseSurface.textMuted}`}>
              {t('widgets.map.noTrackers')}
            </span>
          </div>
        ) : shouldRenderLiveMap ? (
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
            <BoundsFitter markers={resolvedMarkers} />
            {resolvedMarkers.map((marker) => (
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
        ) : (
          <MapPlaceholder
            markerCount={resolvedMarkers.length}
            mapControlSurface={mapControlSurface}
            baseSurface={baseSurface}
            cardShell={cardShell}
            label={t('widgets.map.title')}
          />
        )}
        {shouldRenderLiveMap && surface.overlayClassName ? (
          <div
            className={`pointer-events-none absolute inset-0 z-[350] ${surface.overlayClassName}`}
          />
        ) : null}
        {shouldRenderLiveMap && baseSurface.lightOverlay ? (
          <div
            className={`pointer-events-none absolute inset-0 z-[351] ${baseSurface.lightOverlay}`}
          />
        ) : null}
        {shouldRenderLiveMap && mapWidgetSurface.lightOverlayBg ? (
          <div
            className="pointer-events-none absolute inset-0 z-[352]"
            style={{ background: mapWidgetSurface.lightOverlayBg }}
          />
        ) : null}

        {isSmallCard ? (
          <div
            className={`pointer-events-auto absolute z-[450] border ${mapControlSurface.smallAttributionClassName} ${mapControlSurface.attributionClassName}`}
          >
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className={baseSurface.textSecondary}
              aria-label="OpenStreetMap copyright"
              title="OpenStreetMap contributors"
            >
              OSM
            </a>{' '}
            <span className={`mx-1 ${baseSurface.textMuted}`}>|</span>
            <a
              href="https://carto.com/attributions"
              target="_blank"
              rel="noreferrer"
              className={baseSurface.textSecondary}
              aria-label="CARTO attributions"
              title="CARTO attributions"
            >
              CARTO
            </a>
          </div>
        ) : null}
      </div>

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
    </BaseCard>
  );
});

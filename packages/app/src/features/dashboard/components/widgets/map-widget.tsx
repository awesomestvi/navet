import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { RenderProfiler } from '@navet/app/components/shared/render-profiler';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { normalizeCustomCardTint } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import {
  getMapControlSurfaceTokens,
  getMapWidgetSurfaceTokens,
} from '@navet/app/components/shared/theme/map-widget-surface-tokens';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, usePrimaryColor, useThemeMode } from '@navet/app/hooks';
import { normalizeResourceUrl } from '@navet/app/services/integration-resource.service';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { resolveEffectsQuality } from '@navet/app/utils/effects-quality';
import { MapPin } from 'lucide-react';
import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getCompactHomeAssistantImageUrl } from './map-image-url';
import { mapMarkersEqual } from './map-markers';
import { getTileUrl } from './map-tiles';
import type { MapMarker } from './map-types';
import { useProviderMapMarkers } from './use-provider-map-markers';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

const MapWidgetLive = lazy(async () => {
  const module = await import('./map-widget-live');
  return { default: module.MapWidgetLive };
});

export interface MapWidgetProps {
  size?: CardSize;
  tintColor?: string;
  markers?: readonly MapMarker[];
}

function requestDeferredMapReady(callback: () => void) {
  const timeoutId = window.setTimeout(callback, 1200);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

function subscribeToMapInteraction(callback: () => void) {
  const controller = new AbortController();
  const options = { once: true, passive: true, signal: controller.signal } as const;
  const handleInteraction = () => callback();

  window.addEventListener('pointerdown', handleInteraction, options);
  window.addEventListener('keydown', handleInteraction, { once: true, signal: controller.signal });
  window.addEventListener('scroll', handleInteraction, options);

  return () => controller.abort();
}

function MapPlaceholder({
  markerCount,
  mapControlSurface,
  baseSurface,
  cardShell,
  label,
  onActivate,
}: {
  markerCount: number;
  mapControlSurface: ReturnType<typeof getMapControlSurfaceTokens>;
  baseSurface: ReturnType<typeof getThemeSurfaceTokens>;
  cardShell: ReturnType<typeof getCardShellSurfaceTokens>;
  label: string;
  onActivate?: () => void;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${baseSurface.panel} ${cardShell.backdropClassName}`}
      data-map-placeholder="true"
    >
      <MapPin className={`h-8 w-8 ${mapControlSurface.emptyStateIconClassName}`} />
      <span className={`text-xs ${baseSurface.textMuted}`}>{markerCount > 0 ? label : ''}</span>
      {markerCount > 0 && onActivate ? (
        <button
          type="button"
          onClick={onActivate}
          className={`pointer-events-auto rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${mapControlSurface.attributionClassName} ${baseSurface.textSecondary}`}
        >
          Load live map
        </button>
      ) : null}
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
  const [isMapActivated, setIsMapActivated] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
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
  const stableResolvedMarkersRef = useRef<MapMarker[]>([]);
  const resolvedMarkers = useMemo(() => {
    const nextMarkers = markers.map((marker) => ({
      ...marker,
      entityPicture: marker.entityPicture
        ? (normalizeResourceUrl(
            getCompactHomeAssistantImageUrl(marker.entityPicture),
            'home_assistant'
          ) ?? undefined)
        : undefined,
    }));

    if (mapMarkersEqual(stableResolvedMarkersRef.current, nextMarkers)) {
      return stableResolvedMarkersRef.current;
    }

    stableResolvedMarkersRef.current = nextMarkers;
    return nextMarkers;
  }, [markers]);
  const shouldRenderLiveMap =
    resolvedMarkers.length > 0 &&
    isMapVisible &&
    isMapDeferredReady &&
    (isMapActivated || hasUserInteracted);

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

  useEffect(() => {
    if (resolvedMarkers.length === 0 || hasUserInteracted) {
      return;
    }

    return subscribeToMapInteraction(() => setHasUserInteracted(true));
  }, [hasUserInteracted, resolvedMarkers.length]);

  return (
    <RenderProfiler id={`MapWidget:${size}`}>
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
            <Suspense
              fallback={
                <MapPlaceholder
                  markerCount={resolvedMarkers.length}
                  mapControlSurface={mapControlSurface}
                  baseSurface={baseSurface}
                  cardShell={cardShell}
                  label={t('widgets.map.title')}
                />
              }
            >
              <MapWidgetLive
                accentHex={accentHex}
                defaultCenter={defaultCenter}
                isSmallCard={isSmallCard}
                mapWidgetSurface={mapWidgetSurface}
                markers={resolvedMarkers}
                shouldReduceMapEffects={shouldReduceMapEffects}
                theme={theme}
                tileUrl={tileUrl}
              />
            </Suspense>
          ) : (
            <MapPlaceholder
              markerCount={resolvedMarkers.length}
              mapControlSurface={mapControlSurface}
              baseSurface={baseSurface}
              cardShell={cardShell}
              label={t('widgets.map.title')}
              onActivate={() => setIsMapActivated(true)}
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
      </BaseCard>
    </RenderProfiler>
  );
});

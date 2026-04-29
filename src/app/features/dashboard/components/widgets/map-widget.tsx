import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Settings2 } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  AttributionControl,
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { BaseCard, customCardDialogShellProps, DialogShell } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { CustomCardTintPicker, DialogHeader } from '@/app/components/shared/device-editor';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { useAuth } from '@/app/stores/auth-store';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { authSelectors } from '@/app/stores/selectors';
import { resolveHomeAssistantProxyUrl } from '@/app/utils/home-assistant-url';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

// ── types ──────────────────────────────────────────────────────────────────

interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  entityPicture?: string;
  state: string;
  gpsAccuracy?: number;
}

export interface MapWidgetProps {
  size?: CardSize;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
  isEditMode?: boolean;
}

interface MapSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

function normalizeMarkerName(value: string | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function getFirstName(value: string | undefined) {
  const normalized = normalizeMarkerName(value);
  return normalized.split(/\s+/)[0] ?? '';
}

function readEntityPicture(attributes: Record<string, unknown>) {
  return (
    (typeof attributes.entity_picture === 'string' && attributes.entity_picture) ||
    (typeof attributes.entity_picture_local === 'string' && attributes.entity_picture_local) ||
    undefined
  );
}

// ── selector ───────────────────────────────────────────────────────────────

export function selectMapMarkersFromHa(store: HomeAssistantStore): MapMarker[] {
  const { entities } = store;
  if (!entities) return [];

  const personPicturesByName = new Map<string, string>();
  const personPicturesByFirstName = new Map<string, string>();
  const markers: MapMarker[] = [];

  for (const [id, entity] of Object.entries(entities)) {
    const attrs = entity.attributes as Record<string, unknown>;
    if (id.startsWith('person.')) {
      const entityPicture = readEntityPicture(attrs);
      const friendlyName =
        typeof attrs.friendly_name === 'string' ? attrs.friendly_name : id.replace(/_/g, ' ');
      const normalizedName = normalizeMarkerName(friendlyName);
      const firstName = getFirstName(friendlyName);

      if (entityPicture && normalizedName) {
        personPicturesByName.set(normalizedName, entityPicture);
      }

      if (entityPicture && firstName && !personPicturesByFirstName.has(firstName)) {
        personPicturesByFirstName.set(firstName, entityPicture);
      }
    }

    if (!id.startsWith('person.') && !id.startsWith('device_tracker.')) {
      continue;
    }

    const lat = attrs.latitude;
    const lon = attrs.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      continue;
    }

    const markerName = (attrs.friendly_name as string | undefined) ?? id.replace(/_/g, ' ');
    markers.push({
      id,
      name: markerName,
      latitude: lat,
      longitude: lon,
      entityPicture: readEntityPicture(attrs),
      state: entity.state,
      gpsAccuracy: attrs.gps_accuracy as number | undefined,
    });
  }

  return markers.map((marker) => {
    if (marker.entityPicture) {
      return marker;
    }

    const normalizedMarkerName = normalizeMarkerName(marker.name);
    const markerFirstName = getFirstName(marker.name);
    return {
      ...marker,
      entityPicture:
        personPicturesByName.get(normalizedMarkerName) ??
        personPicturesByFirstName.get(markerFirstName),
    };
  });
}

export function mapMarkersEqual(a: MapMarker[], b: MapMarker[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every(
    (m, i) =>
      m.id === b[i].id &&
      m.latitude === b[i].latitude &&
      m.longitude === b[i].longitude &&
      m.state === b[i].state &&
      m.gpsAccuracy === b[i].gpsAccuracy &&
      m.entityPicture === b[i].entityPicture
  );
}

// ── tile URLs ──────────────────────────────────────────────────────────────

function getTileUrl(theme: string): string {
  return theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
}

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ── custom marker icon ─────────────────────────────────────────────────────

function buildMarkerIcon(marker: MapMarker, accentHex: string): L.DivIcon {
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
      background:${marker.entityPicture ? 'transparent' : 'rgba(30,30,40,0.85)'};
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

// ── bounds fitter ──────────────────────────────────────────────────────────

function BoundsFitter({ markers }: { markers: MapMarker[] }) {
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

function MapSettingsDialog({
  isOpen,
  onOpenChange,
  tintColor,
  onTintColorChange,
}: MapSettingsDialogProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    { maxWidth: 'sm' }
  );

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <DialogHeader title={t('widgets.map.title')} isOn={theme !== 'light'} />
      {onTintColorChange ? (
        <CustomCardTintPicker
          value={tintColor}
          onChange={onTintColorChange}
          defaultColor="#3b82f6"
          className={surface.textMuted}
        />
      ) : null}
    </DialogShell>
  );
}

// ── widget ─────────────────────────────────────────────────────────────────

export const MapWidget = memo(function MapWidget({
  size = 'large',
  tintColor,
  onTintColorChange,
  isEditMode = false,
}: MapWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const authConfig = useAuth(authSelectors.config);
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const baseSurface = getThemeSurfaceTokens(theme);
  const cardShell = getCardShellSurfaceTokens(theme);
  const accentHex = normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const tileUrl = getTileUrl(theme);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isSmallCard = size === 'small';
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
  const emptyStateIconClassName = theme === 'light' ? 'text-slate-400' : baseSurface.textMuted;
  const attributionClassName =
    theme === 'light'
      ? `${baseSurface.border} ${baseSurface.panel} ${cardShell.backdropClassName} ${baseSurface.textMuted}`
      : theme === 'glass'
        ? 'border-white/10 bg-slate-950/68 text-white/60 backdrop-blur-xl'
        : theme === 'black'
          ? 'border-white/8 bg-black/72 text-zinc-500'
          : 'border-zinc-800 bg-zinc-950/78 text-zinc-500';
  const settingsButtonClassName = `${baseSurface.border} ${baseSurface.panel} ${cardShell.backdropClassName} ${baseSurface.textSecondary}`;

  const markers = useHomeAssistant(selectMapMarkersFromHa, mapMarkersEqual);
  const resolvedMarkers = useMemo(
    () =>
      markers.map((marker) => ({
        ...marker,
        entityPicture: marker.entityPicture
          ? (resolveHomeAssistantProxyUrl(marker.entityPicture, authConfig?.url) ?? undefined)
          : undefined,
      })),
    [authConfig?.url, markers]
  );

  // Stable default center (BoundsFitter overrides on mount)
  const defaultCenter = useMemo<[number, number]>(() => [20, 0], []);

  useEffect(() => {
    if (!isEditMode) {
      setIsSettingsOpen(false);
    }
  }, [isEditMode]);

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
            <MapPin className={`h-8 w-8 ${emptyStateIconClassName}`} />
            <span className={`text-xs ${baseSurface.textMuted}`}>
              {t('widgets.map.noTrackers')}
            </span>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={4}
            zoomControl={false}
            attributionControl={false}
            className="dashboard-map-widget h-full w-full"
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url={tileUrl} attribution={TILE_ATTRIBUTION} />
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
        )}
        {resolvedMarkers.length > 0 && surface.overlayClassName ? (
          <div
            className={`pointer-events-none absolute inset-0 z-[350] ${surface.overlayClassName}`}
          />
        ) : null}
        {resolvedMarkers.length > 0 && baseSurface.lightOverlay ? (
          <div
            className={`pointer-events-none absolute inset-0 z-[351] ${baseSurface.lightOverlay}`}
          />
        ) : null}
        {resolvedMarkers.length > 0 ? (
          <div
            className="pointer-events-none absolute inset-0 z-[352]"
            style={{
              background:
                theme === 'light'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.03) 45%, rgba(248,250,252,0.12) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0.015) 45%, rgba(2,6,16,0.10) 100%)',
            }}
          />
        ) : null}

        {isSmallCard ? (
          <div
            className={`pointer-events-auto absolute bottom-2 left-2 z-[450] max-w-28 rounded-[12px] rounded-bl-[20px] border px-2 py-1.5 text-xs leading-tight ${attributionClassName}`}
          >
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className={baseSurface.textSecondary}
            >
              OpenStreetMap
            </a>{' '}
            contributors
            <span className={`mx-1 ${baseSurface.textMuted}`}>|</span>
            <a
              href="https://carto.com/attributions"
              target="_blank"
              rel="noreferrer"
              className={baseSurface.textSecondary}
            >
              CARTO
            </a>
          </div>
        ) : null}
      </div>

      {isEditMode && onTintColorChange ? (
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className={`absolute bottom-4 right-4 z-500 shrink-0 rounded-full border p-2 transition-opacity hover:opacity-90 ${settingsButtonClassName}`}
          aria-label={t('widgets.map.title')}
        >
          <Settings2 className="h-4 w-4" />
        </button>
      ) : null}

      <MapSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        tintColor={tintColor}
        onTintColorChange={onTintColorChange}
      />

      <style>{`
        .dashboard-map-widget,
        .dashboard-map-widget.leaflet-container {
          border-radius: inherit;
          background: transparent;
        }

        .dashboard-map-widget .leaflet-tile-pane {
          opacity: ${theme === 'light' ? '0.94' : '0.9'};
          filter: ${
            theme === 'light'
              ? 'saturate(0.88) contrast(0.94) brightness(1.03)'
              : 'saturate(0.82) contrast(0.94) brightness(0.94)'
          };
        }

        .dashboard-map-widget .leaflet-control-attribution {
          margin: 8px;
          border-radius: 12px 12px 12px 20px;
          padding: 3px 8px;
          font-size: 10px;
          line-height: 1.15;
          background: ${
            theme === 'light'
              ? 'rgba(255,255,255,0.9)'
              : theme === 'glass'
                ? 'rgba(2, 6, 16, 0.68)'
                : theme === 'black'
                  ? 'rgba(0, 0, 0, 0.72)'
                  : 'rgba(9, 9, 11, 0.78)'
          };
          color: ${
            theme === 'light'
              ? 'rgb(100 116 139)'
              : theme === 'glass'
                ? 'rgba(255,255,255,0.6)'
                : theme === 'black'
                  ? 'rgb(113 113 122)'
                  : 'rgb(113 113 122)'
          };
          border: 1px solid ${
            theme === 'light'
              ? 'rgba(203,213,225,0.8)'
              : theme === 'glass'
                ? 'rgba(255,255,255,0.1)'
                : theme === 'black'
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(39,39,42,1)'
          };
          backdrop-filter: ${theme === 'light' ? 'none' : 'blur(16px)'};
        }

        .dashboard-map-widget .leaflet-control-attribution a {
          color: inherit;
        }

        .dashboard-map-widget .leaflet-popup-content-wrapper,
        .dashboard-map-widget .leaflet-popup-tip {
          background: ${theme === 'light' ? 'rgba(255,255,255,0.94)' : 'rgba(11,18,32,0.88)'};
          color: ${theme === 'light' ? 'rgb(15 23 42)' : 'rgba(255,255,255,0.92)'};
          border: 1px solid ${theme === 'light' ? 'rgba(148,163,184,0.28)' : 'rgba(255,255,255,0.14)'};
          box-shadow: ${
            theme === 'light'
              ? '0 20px 36px -24px rgba(15,23,42,0.22)'
              : '0 18px 34px -24px rgba(2,8,20,0.72)'
          };
          backdrop-filter: blur(16px);
        }
      `}</style>
    </BaseCard>
  );
});

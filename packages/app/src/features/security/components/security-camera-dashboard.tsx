import { SectionCustomizeButton } from '@navet/app/components/layout/section-customize-button';
import { DashboardHeroSection } from '@navet/app/components/patterns';
import {
  Badge,
  BaseCard,
  InteractivePill,
  OverlayScrollArea,
} from '@navet/app/components/primitives';
import { type CardSize, getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getDeviceTypeIcon } from '@navet/app/constants/device-type-icons';
import { readNavetCameraState } from '@navet/app/core/navet-device-state';
import { DashboardCardItem, DashboardEditActions } from '@navet/app/features/dashboard';
import { DashboardResizeTrigger } from '@navet/app/features/dashboard/components/dashboard-edit-actions';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { useProgressiveBatching } from '@navet/app/features/dashboard/hooks/use-progressive-batching';
import { useCameraPlaybackPlan } from '@navet/app/features/security/hooks/use-camera-playback-plan';
import { useI18n, useMediaQuery, useProviderCameraTopology } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { usePersistedState } from '@navet/app/hooks/use-persisted-state';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import { type ThemeType, useTheme } from '@navet/app/hooks/use-theme';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import { normalizeResourceUrl } from '@navet/app/services/integration-resource.service';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { type CameraViewMode, useSettingsStore } from '@navet/app/stores/settings-store';
import type { CameraDevice, DeviceWithType, SecuritySeverity } from '@navet/app/types/device.types';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import { ChevronDown, Plus } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { resolveDashboardPerformanceProfile } from '../../dashboard/hooks/use-dashboard-performance-mode';
import type {
  CameraDashboardModel,
  SecurityGroupSummary,
} from '../utils/security-camera-dashboard-model';
import { SecurityPanelCard } from './alarm-panel-card';
import { CameraLiveViewer } from './camera-card/camera-live-viewer';
import {
  appendCameraCacheBuster,
  normalizeCameraSnapshotUrl,
  resolveViewerInitialCameraViewMode,
} from './camera-card/camera-view-mode';
import { useProviderCameraLiveData } from './camera-card/use-provider-camera-live-data';
import { getSecurityStateSurfaceProps } from './security-card-surface-tokens';

interface SecurityCameraDashboardProps {
  model: CameraDashboardModel;
  isEditMode: boolean;
  onToggleEditMode?: () => void;
  onAddEntity?: () => void;
  alarms?: NavetAlarmEntity[];
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onRemoveEntity?: (entityId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}

const ATTENTION_NOW_CARD_ID = 'security.now.attention';
const SECURE_NOW_CARD_ID = 'security.now.secure';
const LIVE_NOW_CARD_ID = 'security.now.live';
const ALARM_NOW_CARD_ID = 'security.now.alarm';
const NOW_LANE_ALLOWED_SIZES: CardSize[] = ['medium', 'large', 'extra-large'];
const NOW_ALARM_ALLOWED_SIZES: CardSize[] = ['medium', 'large'];
const SECURITY_DASHBOARD_COLLAPSED_SECTIONS_KEY = 'navet-security-dashboard-collapsed-sections';
const SECURITY_DASHBOARD_SELECTED_GROUP_KEY = 'navet-security-dashboard-selected-group';

function getSeverityLabel(severity: SecuritySeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Attention';
    case 'active':
      return 'Active';
    case 'unknown':
      return 'Unavailable';
    default:
      return 'Normal';
  }
}

function readDeviceStatusLabel(device: DeviceWithType): string {
  switch (device.type) {
    case 'locks':
      return device.state ? 'Locked' : 'Unlocked';
    case 'cameras':
      return device.state.replace(/\b\w/g, (segment) => segment.toUpperCase());
    case 'persons':
      return device.state === 'home' ? 'Home' : 'Away';
    case 'helpers':
      return device.serviceAction === 'press' ? 'Action' : device.state ? 'On' : 'Off';
    case 'sensors':
      if (
        device.securityKind === 'door' ||
        device.securityKind === 'window' ||
        device.securityKind === 'garageDoor' ||
        device.securityKind === 'opening'
      ) {
        if (device.status === 'active') {
          return 'Open';
        }
        if (device.status === 'clear') {
          return 'Closed';
        }
        if (device.status === 'unavailable') {
          return 'Unavailable';
        }
      }
      return device.value;
    default:
      return 'Active';
  }
}

function getSeverityAccentClassName(device: DeviceWithType, severity: SecuritySeverity) {
  if (device.type === 'locks' && device.state === false) {
    return 'bg-red-400';
  }

  if (severity === 'critical' && device.securityKind === 'siren') {
    return 'bg-red-500';
  }

  if (severity === 'active') {
    if (device.type === 'cameras' || device.securityKind === 'camera') {
      return 'bg-emerald-400';
    }

    if (
      device.securityKind === 'motion' ||
      device.securityKind === 'occupancy' ||
      device.securityKind === 'presence' ||
      device.securityKind === 'vibration' ||
      device.securityKind === 'sound'
    ) {
      return 'bg-amber-300';
    }
  }

  switch (severity) {
    case 'critical':
      return 'bg-rose-500';
    case 'warning':
      return 'bg-red-400';
    case 'active':
      return 'bg-sky-300';
    case 'unknown':
      return 'bg-zinc-400';
    default:
      return 'bg-emerald-300';
  }
}

function getSeverityStatusClassName(
  device: DeviceWithType,
  severity: SecuritySeverity,
  theme: ThemeType
) {
  if (device.type === 'locks' && device.state === false) {
    return theme === 'light' ? 'text-red-700' : 'text-red-300';
  }

  if (severity === 'critical' && device.securityKind === 'siren') {
    return theme === 'light' ? 'text-red-700' : 'text-red-400';
  }

  switch (severity) {
    case 'critical':
      return theme === 'light' ? 'text-rose-700' : 'text-rose-300';
    case 'warning':
      return theme === 'light' ? 'text-red-700' : 'text-red-300';
    case 'unknown':
      return theme === 'light' ? 'text-slate-600' : 'text-zinc-300';
    default:
      return '';
  }
}

function getSecureStatusClassName(theme: ThemeType) {
  return theme === 'light' ? 'text-emerald-800' : 'text-green-300';
}

function getLiveStatusClassName(device: DeviceWithType, theme: ThemeType) {
  if (device.type === 'cameras' || device.securityKind === 'camera') {
    return theme === 'light' ? 'text-emerald-800' : 'text-emerald-300';
  }

  if (
    device.securityKind === 'motion' ||
    device.securityKind === 'occupancy' ||
    device.securityKind === 'presence' ||
    device.securityKind === 'vibration' ||
    device.securityKind === 'sound'
  ) {
    return theme === 'light' ? 'text-amber-900' : 'text-amber-200';
  }

  return '';
}

function getRowIconSurfaceClassName(
  device: DeviceWithType,
  severity: SecuritySeverity,
  theme: ThemeType,
  emphasizeStatusBySeverity: boolean,
  emphasizeStatusByActivity: boolean,
  emphasizeStatusBySecure: boolean
) {
  if (emphasizeStatusBySeverity) {
    if (device.type === 'locks' && device.state === false) {
      return theme === 'light' ? 'bg-red-100' : 'bg-red-400/16';
    }

    if (severity === 'critical' && device.securityKind === 'siren') {
      return theme === 'light' ? 'bg-red-100' : 'bg-red-500/18';
    }

    if (severity === 'critical') {
      return theme === 'light' ? 'bg-rose-100' : 'bg-rose-400/16';
    }

    if (severity === 'warning') {
      return theme === 'light' ? 'bg-red-100' : 'bg-red-400/16';
    }

    if (severity === 'unknown') {
      return theme === 'light' ? 'bg-slate-100' : 'bg-zinc-400/12';
    }
  }

  if (emphasizeStatusByActivity) {
    if (device.securityKind === 'motion' || device.securityKind === 'occupancy') {
      return theme === 'light' ? 'bg-amber-100' : 'bg-amber-300/16';
    }

    return theme === 'light' ? 'bg-sky-100' : 'bg-sky-400/16';
  }

  if (emphasizeStatusBySecure) {
    return theme === 'light' ? 'bg-green-100' : 'bg-green-400/16';
  }

  return theme === 'light' ? 'bg-slate-100' : 'bg-zinc-900';
}

function getRowIconClassName(
  device: DeviceWithType,
  severity: SecuritySeverity,
  theme: ThemeType,
  emphasizeStatusBySeverity: boolean,
  emphasizeStatusByActivity: boolean,
  emphasizeStatusBySecure: boolean
) {
  if (emphasizeStatusBySeverity) {
    if (device.type === 'locks' && device.state === false) {
      return theme === 'light' ? 'text-red-700' : 'text-red-200';
    }

    if (severity === 'critical' && device.securityKind === 'siren') {
      return theme === 'light' ? 'text-red-700' : 'text-red-100';
    }

    if (severity === 'critical') {
      return theme === 'light' ? 'text-rose-700' : 'text-rose-200';
    }

    if (severity === 'warning') {
      return theme === 'light' ? 'text-red-700' : 'text-red-200';
    }

    if (severity === 'unknown') {
      return theme === 'light' ? 'text-slate-500' : 'text-zinc-300';
    }
  }

  if (emphasizeStatusByActivity) {
    if (device.securityKind === 'motion' || device.securityKind === 'occupancy') {
      return theme === 'light' ? 'text-amber-700' : 'text-amber-200';
    }

    return theme === 'light' ? 'text-sky-700' : 'text-sky-200';
  }

  if (emphasizeStatusBySecure) {
    return theme === 'light' ? 'text-green-700' : 'text-green-100';
  }

  return theme === 'light' ? 'text-slate-600' : 'text-zinc-300';
}

function getIndicatorDotClassName(group: SecurityGroupSummary, theme: ThemeType) {
  const isLightTheme = theme === 'light';
  const usesLockAlertColor = group.id === 'locks' && group.warning > 0;
  const usesSirenCriticalColor = group.id === 'sirens' && group.critical > 0;

  if (usesSirenCriticalColor) {
    return isLightTheme ? 'bg-red-600' : 'bg-red-500';
  }

  if (usesLockAlertColor) {
    return isLightTheme ? 'bg-red-500' : 'bg-red-400';
  }

  if (group.critical > 0) {
    return isLightTheme ? 'bg-rose-600' : 'bg-rose-500';
  }

  if (group.warning > 0) {
    return isLightTheme ? 'bg-red-500' : 'bg-red-400';
  }

  if (group.unknown > 0) {
    return isLightTheme ? 'bg-slate-400' : 'bg-zinc-400';
  }

  if (group.active > 0) {
    if (group.id === 'cameras') {
      return isLightTheme ? 'bg-emerald-500' : 'bg-emerald-400';
    }

    if (group.id === 'motion-occupancy') {
      return isLightTheme ? 'bg-amber-500' : 'bg-amber-300';
    }

    return isLightTheme ? 'bg-sky-500' : 'bg-sky-400';
  }

  return isLightTheme ? 'bg-slate-400' : 'bg-zinc-400';
}

function getDetailsPillClassName(
  isActive: boolean,
  theme: ThemeType,
  surface: ReturnType<typeof getThemeSurfaceTokens>
) {
  if (isActive) {
    if (theme === 'light') {
      return `border ${surface.borderStrong} bg-white text-slate-950 shadow-sm`;
    }

    if (theme === 'glass') {
      return 'border-white/14 bg-slate-950/88 text-white shadow-none';
    }

    if (theme === 'black') {
      return 'border-white/10 bg-zinc-950 text-white shadow-none';
    }

    return 'border-[rgba(161,161,170,0.22)] bg-[rgba(18,18,21,0.98)] text-white shadow-none';
  }

  if (theme === 'light') {
    return `border border-transparent bg-transparent ${surface.hoverBg} text-slate-700`;
  }

  if (theme === 'glass') {
    return 'border-transparent bg-transparent hover:bg-white/8 text-white/80';
  }

  if (theme === 'black') {
    return 'border-transparent bg-transparent hover:bg-zinc-950 text-zinc-300';
  }

  return 'border-transparent bg-transparent hover:bg-zinc-800/82 text-zinc-300';
}

function AttentionPulseDot({
  device,
  severity,
  animated = false,
}: {
  device: DeviceWithType;
  severity: SecuritySeverity;
  animated?: boolean;
}) {
  const accentClassName = getSeverityAccentClassName(device, severity);
  const pulseClassName =
    severity === 'critical'
      ? 'motion-safe:animate-[navet-security-critical-pulse_1.4s_ease-out_infinite]'
      : severity === 'warning'
        ? 'motion-safe:animate-[navet-security-warning-pulse_2s_ease-out_infinite]'
        : '';

  if (!animated || pulseClassName.length === 0) {
    return <span className={`h-2 w-2 shrink-0 rounded-full ${accentClassName}`} />;
  }

  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-full ${accentClassName} opacity-70 ${pulseClassName}`}
      />
      <span className={`relative h-2 w-2 rounded-full ${accentClassName}`} />
    </span>
  );
}

function readCompactThumbnailUrl(
  device: DeviceWithType,
  allEntities: DeviceWithType[]
): string | undefined {
  if (device.type === 'cameras') {
    const snapshotUrl = readImageUrl(device.entityPicture);
    if (!snapshotUrl) {
      return undefined;
    }

    return normalizeResourceUrl(snapshotUrl, device.providerId) ?? snapshotUrl;
  }

  const relatedSourceDeviceId = 'sourceDeviceId' in device ? device.sourceDeviceId : undefined;
  if (!relatedSourceDeviceId) {
    return undefined;
  }

  const relatedCamera = allEntities.find(
    (entity): entity is Extract<DeviceWithType, { type: 'cameras' }> =>
      entity.type === 'cameras' && entity.sourceDeviceId === relatedSourceDeviceId
  );
  if (!relatedCamera) {
    return undefined;
  }

  const snapshotUrl = readImageUrl(relatedCamera.entityPicture);
  if (!snapshotUrl) {
    return undefined;
  }

  return normalizeResourceUrl(snapshotUrl, relatedCamera.providerId) ?? snapshotUrl;
}

function readImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveHomeAssistantImageUrl(imageUrl: string | undefined) {
  if (!imageUrl) {
    return undefined;
  }

  return normalizeResourceUrl(imageUrl, 'home_assistant') ?? imageUrl;
}

function StatusBanner({
  model,
  isEditMode,
  onToggleEditMode,
  onAddEntity,
  surface,
}: {
  model: CameraDashboardModel['summary'];
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onAddEntity?: () => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { accentColor } = useTheme();
  const { t } = useI18n();
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  const badges = !isMobileViewport ? (
    <div className="flex min-h-10 items-center justify-end gap-2">
      {isEditMode && onAddEntity ? (
        <button
          type="button"
          onClick={onAddEntity}
          className={`inline-flex items-center gap-1.5 rounded-[22px] border px-2.5 py-1.5 text-xs font-medium transition-colors md:gap-2 md:px-3 md:py-2 md:text-sm ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
        >
          <Plus className={`h-4 w-4 ${surface.textSecondary}`} />
          <span className={`hidden text-xs font-medium md:inline ${surface.textSecondary}`}>
            {t('dashboard.addEntity.title')}
          </span>
        </button>
      ) : null}
      <SectionCustomizeButton isEditMode={isEditMode} onToggle={onToggleEditMode} />
    </div>
  ) : null;

  return (
    <DashboardHeroSection
      accentColor={accentColor}
      surface={surface}
      title={model.title}
      description="Monitor live cameras, locks, openings, and alarms from one place."
      actions={badges}
      actionsClassName="md:absolute md:top-0 md:right-0 md:mt-0 md:max-w-[22rem] md:justify-end"
    />
  );
}

function NowStatusBadges({ model }: { model: CameraDashboardModel['summary'] }) {
  const { theme } = useTheme();
  const needsAttention = model.attentionEntityCount;
  const primaryBadge =
    needsAttention > 0 ? (
      <Badge tone="danger">{needsAttention} to check</Badge>
    ) : needsAttention === 0 && model.secureItems.length > 0 ? (
      <Badge
        tone="success"
        className={
          theme === 'light' ? 'border-emerald-300/90 bg-emerald-100/95 text-emerald-800' : ''
        }
      >
        {model.secureItems.length} secure
      </Badge>
    ) : null;
  const liveBadge =
    model.liveItems.length > 0 ? (
      <Badge
        className={
          theme === 'light'
            ? 'border-sky-300/90 bg-sky-100/95 text-sky-800'
            : 'border-sky-400/30 bg-sky-500/10 text-sky-100'
        }
      >
        {model.liveItems.length} live
      </Badge>
    ) : null;

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">{primaryBadge}</div>
      <div className="flex shrink-0 items-center justify-end gap-2">{liveBadge}</div>
    </div>
  );
}

function FlatSection({
  id,
  title,
  count,
  headerSuffix,
  children,
  isCollapsed = false,
  onToggleCollapse,
  surface,
}: {
  id: string;
  title: string;
  count?: number;
  headerSuffix?: ReactNode;
  children: ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const headerContent = (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 md:gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>{title}</h2>
        {onToggleCollapse ? (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent transition-colors ${surface.hoverBg}`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${surface.textMuted} ${
                isCollapsed ? '' : 'rotate-180'
              }`}
              aria-hidden="true"
            />
          </span>
        ) : null}
      </div>
      {typeof count === 'number' ? (
        <span className={`text-xs md:text-sm ${surface.textSecondary}`}>{count} items</span>
      ) : null}
      {headerSuffix ? <div className="flex min-w-0 flex-1 items-center">{headerSuffix}</div> : null}
    </div>
  );

  return (
    <section className="space-y-3">
      {onToggleCollapse ? (
        <button
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls={`security-section-panel-${id}`}
          onClick={() => onToggleCollapse(id)}
          className="flex w-full items-center gap-3 text-left"
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex items-center gap-3">{headerContent}</div>
      )}
      {!isCollapsed ? <div id={`security-section-panel-${id}`}>{children}</div> : null}
    </section>
  );
}

function CompactEntityRow({
  device,
  onClick,
  animateAttention = false,
  trailingLabelMode = 'severity',
  showInlineStatus = true,
  emphasizeStatusBySeverity = false,
  emphasizeStatusByActivity = false,
  emphasizeStatusBySecure = false,
  preferThumbnail = false,
  allEntities = [],
  surface,
}: {
  device: DeviceWithType;
  onClick?: () => void;
  animateAttention?: boolean;
  trailingLabelMode?: 'severity' | 'status';
  showInlineStatus?: boolean;
  emphasizeStatusBySeverity?: boolean;
  emphasizeStatusByActivity?: boolean;
  emphasizeStatusBySecure?: boolean;
  preferThumbnail?: boolean;
  allEntities?: DeviceWithType[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { theme } = useTheme();
  const Icon = getDeviceTypeIcon(
    device.type,
    'deviceClass' in device && typeof device.deviceClass === 'string'
      ? device.deviceClass
      : undefined
  );
  const severity =
    device.type === 'covers'
      ? device.position > 0
        ? 'warning'
        : 'normal'
      : (device.securitySeverity ?? 'normal');
  const statusLabel = readDeviceStatusLabel(device);
  const trailingLabel = trailingLabelMode === 'status' ? statusLabel : getSeverityLabel(severity);
  const thumbnailUrl = preferThumbnail ? readCompactThumbnailUrl(device, allEntities) : undefined;
  const content = (
    <>
      <AttentionPulseDot device={device} severity={severity} animated={animateAttention} />
      {thumbnailUrl ? (
        <div
          className={`h-8 w-12 shrink-0 overflow-hidden rounded-xl border ${
            theme === 'light' ? 'border-slate-300/70 bg-white/45' : 'border-white/10 bg-black/20'
          }`}
        >
          <img
            src={thumbnailUrl}
            alt=""
            data-testid={`live-thumbnail:${device.id}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${getRowIconSurfaceClassName(
            device,
            severity,
            theme,
            emphasizeStatusBySeverity,
            emphasizeStatusByActivity,
            emphasizeStatusBySecure
          )}`}
        >
          <Icon
            className={`h-3 w-3 ${getRowIconClassName(
              device,
              severity,
              theme,
              emphasizeStatusBySeverity,
              emphasizeStatusByActivity,
              emphasizeStatusBySecure
            )}`}
            aria-hidden="true"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className={`truncate text-[13px] font-semibold ${surface.textPrimary}`}>
            {device.name}
          </p>
          {showInlineStatus ? (
            <span className={`text-[13px] ${surface.textMuted}`}>{statusLabel}</span>
          ) : null}
        </div>
      </div>
      <span
        className={`shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] ${
          emphasizeStatusBySeverity
            ? getSeverityStatusClassName(device, severity, theme)
            : emphasizeStatusByActivity
              ? getLiveStatusClassName(device, theme)
              : emphasizeStatusBySecure
                ? getSecureStatusClassName(theme)
                : surface.textMuted
        }`}
      >
        {trailingLabel}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-2 border-b py-2 text-left last:border-b-0 ${surface.border}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 border-b py-2 last:border-b-0 ${surface.border}`}>
      {content}
    </div>
  );
}

function NowLane({
  items,
  tone,
  emptyLabel,
  animateAttention = false,
  trailingLabelMode = 'severity',
  showInlineStatus = true,
  emphasizeStatusBySeverity = false,
  emphasizeStatusByActivity = false,
  emphasizeStatusBySecure = false,
  preferThumbnail = false,
  allEntities = [],
  onItemClick,
  surface,
}: {
  items: DeviceWithType[];
  tone: 'neutral' | 'warning' | 'danger' | 'accent' | 'success';
  emptyLabel: string;
  animateAttention?: boolean;
  trailingLabelMode?: 'severity' | 'status';
  showInlineStatus?: boolean;
  emphasizeStatusBySeverity?: boolean;
  emphasizeStatusByActivity?: boolean;
  emphasizeStatusBySecure?: boolean;
  preferThumbnail?: boolean;
  allEntities?: DeviceWithType[];
  onItemClick?: (device: DeviceWithType) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { theme, colors, accentColor } = useTheme();
  const laneSurface = getSecurityStateSurfaceProps(tone, theme, colors, accentColor);
  const laneListId = `security-now-lane-list-${tone}`;

  return (
    <BaseCard
      size="small"
      surfaceVariant="muted"
      className="min-w-0"
      frameClassName={laneSurface.frameClassName}
      style={laneSurface.frameStyle}
      overlay={laneSurface.overlay}
      disableDefaultSheen={laneSurface.disableDefaultSheen}
      contentClassName="min-h-0"
    >
      <div className="flex h-full min-h-0 flex-col">
        {items.length > 0 ? (
          <OverlayScrollArea
            className="min-h-0 flex-1"
            contentClassName="px-3 md:px-3.5"
            viewportProps={{ 'data-testid': laneListId }}
          >
            {items.map((device) => (
              <CompactEntityRow
                key={device.id}
                device={device}
                animateAttention={animateAttention}
                trailingLabelMode={trailingLabelMode}
                showInlineStatus={showInlineStatus}
                emphasizeStatusBySeverity={emphasizeStatusBySeverity}
                emphasizeStatusByActivity={emphasizeStatusByActivity}
                emphasizeStatusBySecure={emphasizeStatusBySecure}
                preferThumbnail={preferThumbnail}
                allEntities={allEntities}
                surface={surface}
                onClick={onItemClick ? () => onItemClick(device) : undefined}
              />
            ))}
          </OverlayScrollArea>
        ) : (
          <p className={`py-1 text-sm ${surface.textMuted}`}>{emptyLabel}</p>
        )}
      </div>
    </BaseCard>
  );
}

function SummaryCameraViewer({
  camera,
  isOpen,
  onOpenChange,
}: {
  camera: CameraDevice;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const providerEntity = useProviderEntityModel(camera.id);
  const { siblingIds: deviceEntityIds } = useProviderCameraTopology(camera.id);
  const { cameraState, liveEntity, liveState } = useProviderCameraLiveData(
    camera.id,
    deviceEntityIds
  );
  const preferredTransport = useSettingsStore(
    settingsSelectors.cameraStreamPreferenceForEntity(camera.id)
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>('live');

  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const providerState = readNavetCameraState(providerEntity);
  const liveEntityPicture =
    readImageUrl(liveAttrs?.entity_picture_local) ?? readImageUrl(liveAttrs?.entity_picture);
  const initialSnapshotUrl =
    readImageUrl(camera.entityPicture) ??
    readImageUrl(
      typeof providerState?.entityPicture === 'string' ? providerState.entityPicture : undefined
    );
  const baseSnapshotUrl = normalizeCameraSnapshotUrl(
    liveEntityPicture ? resolveHomeAssistantImageUrl(liveEntityPicture) : initialSnapshotUrl
  );
  const snapshotUrl = appendCameraCacheBuster(baseSnapshotUrl, refreshKey);
  const hasSnapshot = Boolean(snapshotUrl);
  const isStreamCapable =
    liveState.isStreamCapable ||
    providerState?.isStreamCapable === true ||
    (camera.isStreamCapable ?? false);
  const playbackModel = useCameraPlaybackPlan({
    entityId: camera.id,
    cameraState,
    preferredMode: 'live',
    preferredTransport,
    snapshotUrl,
    isStreamCapable,
    motionDetectionEnabled: liveState.motionDetectionEnabled,
    failedTransports: new Set(),
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCameraViewMode(resolveViewerInitialCameraViewMode({ isStreamCapable, hasSnapshot }));
  }, [hasSnapshot, isOpen, isStreamCapable]);

  const handleRefresh = () => {
    setRefreshKey((key) => key + 1);
    void integrationCameraFeatureService.refreshCameraSnapshot?.(camera.id).catch(() => undefined);
  };

  return (
    <CameraLiveViewer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      entityId={camera.id}
      name={camera.name}
      room={camera.room}
      cameraState={cameraState}
      snapshotUrl={snapshotUrl}
      cameraViewMode={cameraViewMode}
      preferredTransport={preferredTransport}
      isStreamCapable={isStreamCapable}
      motionDetectionEnabled={liveState.motionDetectionEnabled}
      initialStreamResource={playbackModel?.selectedStreamResource ?? null}
      onRefresh={handleRefresh}
      onOpenSettings={() => undefined}
      onCameraViewModeChange={setCameraViewMode}
    />
  );
}

function SecureLane({
  items,
  onItemClick,
  surface,
}: {
  items: DeviceWithType[];
  onItemClick?: (device: DeviceWithType) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  return (
    <NowLane
      items={items}
      tone="success"
      emptyLabel="No secure devices."
      trailingLabelMode="status"
      showInlineStatus={false}
      emphasizeStatusBySecure
      allEntities={items}
      onItemClick={onItemClick}
      surface={surface}
    />
  );
}

function NowLaneCard({
  cardId,
  size,
  isEditMode,
  allowedSizes = NOW_LANE_ALLOWED_SIZES,
  onSizeChange,
  children,
}: {
  cardId: string;
  size: CardSize;
  isEditMode: boolean;
  allowedSizes?: CardSize[];
  onSizeChange: (size: CardSize) => void;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={`security-now-card:${cardId}`}
      data-draggable-card="true"
      className={`${getCardSpanClass(size)} relative min-w-0`}
    >
      {isEditMode ? (
        <DashboardResizeTrigger
          cardSize={size}
          allowedSizes={allowedSizes}
          onSizeChange={onSizeChange}
        />
      ) : null}
      {children}
    </div>
  );
}

function readSecureSummaryGroupId(device: DeviceWithType): string | null {
  switch (device.id) {
    case 'security.aggregate.attention.alarms':
      return 'alarms';
    case 'security.aggregate.attention.doors-windows':
      return 'doors-windows';
    case 'security.aggregate.attention.locks':
      return 'locks';
    case 'security.aggregate.attention.motion-occupancy':
      return 'motion-occupancy';
    case 'security.aggregate.attention.hazards':
      return 'hazards';
    case 'security.aggregate.attention.cameras':
      return 'cameras';
    case 'security.aggregate.attention.sirens':
      return 'sirens';
    case 'security.aggregate.attention.system':
      return 'system';
    case 'security.aggregate.openings.secure':
      return 'doors-windows';
    case 'security.aggregate.locks.secure':
      return 'locks';
    case 'security.aggregate.motion.secure':
      return 'motion-occupancy';
    case 'security.aggregate.hazards.secure':
      return 'hazards';
    default:
      return null;
  }
}

function DetailsGrid({
  devices,
  cardSizes,
  updateCardSize,
  isEditMode,
  onRemoveEntity,
}: {
  devices: DeviceWithType[];
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
}) {
  const breakpointCols = useBreakpointCols();
  const { disableAnimations, effectsQuality, lowPowerMode } = useSettingsStore(
    useShallow((state) => ({
      disableAnimations: settingsSelectors.disableAnimations(state),
      effectsQuality: settingsSelectors.effectsQuality(state),
      lowPowerMode: settingsSelectors.lowPowerMode(state),
    }))
  );
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);
  const performanceProfile = useMemo(
    () =>
      resolveDashboardPerformanceProfile({
        activeSection: 'security',
        deviceTier: detectDeviceTier(),
        effectsQuality,
        isEditMode,
        lowPowerMode,
        reducedEffectsEnabled: disableAnimations || lowPowerMode,
        visibleCardCount: devices.length,
        visibleDevices: devices,
      }),
    [devices, disableAnimations, effectsQuality, isEditMode, lowPowerMode]
  );
  const shouldBatch = performanceProfile.batchHeavyCards;
  const batchedVisibleCount = useProgressiveBatching(devices.length, isEditMode, {
    enabled: shouldBatch,
    initialBatch: performanceProfile.progressiveBatchInitialCount,
    batchSize: performanceProfile.progressiveBatchSize,
  });
  const visibleDevices = shouldBatch ? devices.slice(0, batchedVisibleCount) : devices;
  const optimizeOffscreenPaint = performanceProfile.optimizeOffscreenPaint;

  return (
    <DashboardEditActions isEditMode={isEditMode} onRemoveEntity={onRemoveEntity}>
      <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
        <div
          ref={innerRef}
          className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
          style={innerContainerStyle}
        >
          <div
            className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
            style={gridStyle as CSSProperties}
          >
            {visibleDevices.map((device) => {
              const defaultSize = device.type === 'cameras' ? 'large' : device.size;
              const size = cardSizes[device.id] ?? defaultSize;
              const spanClassName = getCardSpanClass(size);

              return (
                <div
                  key={device.id}
                  className={`${spanClassName}${
                    optimizeOffscreenPaint
                      ? ' [content-visibility:auto] [contain-intrinsic-block-size:22rem]'
                      : ''
                  }`}
                >
                  <DashboardCardItem
                    id={device.id}
                    device={device}
                    size={size}
                    isEditMode={isEditMode}
                    handleSizeChange={updateCardSize}
                    onRemoveEntity={onRemoveEntity}
                    allowEntityRemoval
                    usesHideAction
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardEditActions>
  );
}

function DetailsSection({
  groupSummaries,
  selectedGroupId,
  onSelectGroup,
  cardSizes,
  updateCardSize,
  isEditMode,
  onRemoveEntity,
  surface,
}: {
  groupSummaries: SecurityGroupSummary[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onRemoveEntity?: (entityId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { theme } = useTheme();
  const selectedGroup =
    groupSummaries.find((group) => group.id === selectedGroupId) ?? groupSummaries[0] ?? null;

  if (!selectedGroup) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Security detail groups"
        className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max min-w-full flex-nowrap gap-2">
          {groupSummaries.map((group) => {
            const isActive = group.id === selectedGroup.id;
            const attentionCount = group.critical + group.warning + group.unknown;
            const indicatorCount = group.id === 'presence' ? 0 : attentionCount + group.active;

            return (
              <InteractivePill
                key={group.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`security-details-panel-${group.id}`}
                id={`security-details-tab-${group.id}`}
                active={isActive}
                size="small"
                intent="navigation"
                variant="ghost"
                onClick={() => onSelectGroup(group.id)}
                className={`shrink-0 rounded-[22px] gap-2 whitespace-nowrap border transition-colors ${getDetailsPillClassName(
                  isActive,
                  theme,
                  surface
                )}`}
              >
                {indicatorCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${getIndicatorDotClassName(group, theme)}`}
                  />
                ) : null}
                <span>{group.label}</span>
              </InteractivePill>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`security-details-panel-${selectedGroup.id}`}
        aria-labelledby={`security-details-tab-${selectedGroup.id}`}
        className=""
      >
        <DetailsGrid
          devices={selectedGroup.entities}
          cardSizes={cardSizes}
          updateCardSize={updateCardSize}
          isEditMode={isEditMode}
          onRemoveEntity={onRemoveEntity}
        />
      </div>
    </div>
  );
}

export function SecurityCameraDashboard({
  model,
  isEditMode,
  onToggleEditMode = () => {},
  onAddEntity,
  alarms = [],
  cardSizes,
  updateCardSize,
  onRemoveEntity,
  surface,
}: SecurityCameraDashboardProps) {
  const breakpointCols = useBreakpointCols();
  const {
    outerRef: nowOuterRef,
    innerRef: nowInnerRef,
    outerContainerStyle: nowOuterContainerStyle,
    innerContainerStyle: nowInnerContainerStyle,
    isAutoScaled: isNowAutoScaled,
    gridStyle: nowGridStyle,
  } = useFitDashboardGrid(breakpointCols);
  const [viewerCamera, setViewerCamera] = useState<CameraDevice | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [collapsedSections, setCollapsedSections] = usePersistedState<Record<string, boolean>>(
    SECURITY_DASHBOARD_COLLAPSED_SECTIONS_KEY,
    {}
  );
  const attentionCount = model.summary.attentionEntityCount;
  const attentionCardSize = cardSizes[ATTENTION_NOW_CARD_ID] ?? 'large';
  const secureCardSize = cardSizes[SECURE_NOW_CARD_ID] ?? 'large';
  const liveCardSize = cardSizes[LIVE_NOW_CARD_ID] ?? 'large';
  const alarmCardSize: Extract<CardSize, 'medium' | 'large'> =
    cardSizes[ALARM_NOW_CARD_ID] === 'medium' ? 'medium' : 'large';
  const defaultGroupId = useMemo(
    () =>
      model.summary.groupSummaries.find((group) => group.defaultExpanded)?.id ??
      model.summary.groupSummaries[0]?.id ??
      '',
    [model.summary.groupSummaries]
  );
  const [selectedGroupId, setSelectedGroupId] = usePersistedState(
    SECURITY_DASHBOARD_SELECTED_GROUP_KEY,
    defaultGroupId
  );

  useEffect(() => {
    setSelectedGroupId((current) => {
      if (current && model.summary.groupSummaries.some((group) => group.id === current)) {
        return current;
      }

      return defaultGroupId;
    });
  }, [defaultGroupId, model.summary.groupSummaries]);

  const navigateToEntity = (device: DeviceWithType) => {
    const secureSummaryGroupId = readSecureSummaryGroupId(device);
    if (secureSummaryGroupId) {
      setSelectedGroupId(secureSummaryGroupId);

      requestAnimationFrame(() => {
        detailsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
      return;
    }

    const targetGroup = model.summary.groupSummaries.find((group) =>
      group.entities.some((entity) => entity.id === device.id)
    );
    if (!targetGroup) {
      return;
    }

    setSelectedGroupId(targetGroup.id);

    requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handleAttentionItemClick = (device: DeviceWithType) => {
    navigateToEntity(device);
  };

  const handleLiveItemClick = (device: DeviceWithType) => {
    if (device.type === 'cameras') {
      setViewerCamera(device);
      return;
    }

    navigateToEntity(device);
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  return (
    <div className="space-y-7">
      <style>{`
        @keyframes navet-security-critical-pulse {
          0% {
            transform: scale(1);
            opacity: 0.86;
          }
          68% {
            transform: scale(3.1);
            opacity: 0;
          }
          100% {
            transform: scale(3.1);
            opacity: 0;
          }
        }

        @keyframes navet-security-warning-pulse {
          0% {
            transform: scale(1);
            opacity: 0.58;
          }
          72% {
            transform: scale(2.25);
            opacity: 0;
          }
          100% {
            transform: scale(2.25);
            opacity: 0;
          }
        }
      `}</style>
      <StatusBanner
        model={model.summary}
        isEditMode={isEditMode}
        onToggleEditMode={onToggleEditMode}
        onAddEntity={onAddEntity}
        surface={surface}
      />

      <FlatSection
        id="now"
        title="Now"
        headerSuffix={<NowStatusBadges model={model.summary} />}
        isCollapsed={collapsedSections.now ?? false}
        onToggleCollapse={toggleSectionCollapse}
        surface={surface}
      >
        <div ref={nowOuterRef} className="relative w-full" style={nowOuterContainerStyle}>
          <div
            ref={nowInnerRef}
            className={`w-full${isNowAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
            style={nowInnerContainerStyle}
          >
            <div
              className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
              style={nowGridStyle as CSSProperties}
            >
              <NowLaneCard
                cardId={attentionCount > 0 ? ATTENTION_NOW_CARD_ID : SECURE_NOW_CARD_ID}
                size={attentionCount > 0 ? attentionCardSize : secureCardSize}
                isEditMode={isEditMode}
                onSizeChange={(size) =>
                  updateCardSize(
                    attentionCount > 0 ? ATTENTION_NOW_CARD_ID : SECURE_NOW_CARD_ID,
                    size
                  )
                }
              >
                {attentionCount > 0 ? (
                  <NowLane
                    items={model.summary.attentionItems}
                    tone="danger"
                    emptyLabel="Nothing needs attention."
                    animateAttention
                    trailingLabelMode="status"
                    showInlineStatus={false}
                    emphasizeStatusBySeverity
                    allEntities={model.allEntities}
                    onItemClick={handleAttentionItemClick}
                    surface={surface}
                  />
                ) : (
                  <SecureLane
                    items={model.summary.secureItems}
                    onItemClick={handleAttentionItemClick}
                    surface={surface}
                  />
                )}
              </NowLaneCard>
              <NowLaneCard
                cardId={LIVE_NOW_CARD_ID}
                size={liveCardSize}
                isEditMode={isEditMode}
                onSizeChange={(size) => updateCardSize(LIVE_NOW_CARD_ID, size)}
              >
                <NowLane
                  items={model.summary.liveItems}
                  tone="accent"
                  emptyLabel="No live activity."
                  trailingLabelMode="status"
                  showInlineStatus={false}
                  emphasizeStatusByActivity
                  preferThumbnail
                  allEntities={model.allEntities}
                  onItemClick={handleLiveItemClick}
                  surface={surface}
                />
              </NowLaneCard>
              {alarms.length > 0 ? (
                <NowLaneCard
                  cardId={ALARM_NOW_CARD_ID}
                  size={alarmCardSize}
                  isEditMode={isEditMode}
                  allowedSizes={NOW_ALARM_ALLOWED_SIZES}
                  onSizeChange={(size) => updateCardSize(ALARM_NOW_CARD_ID, size)}
                >
                  <SecurityPanelCard alarms={alarms} size={alarmCardSize} />
                </NowLaneCard>
              ) : null}
            </div>
          </div>
        </div>
      </FlatSection>

      {model.summary.totalEntities > 0 ? (
        <FlatSection
          id="details"
          title="All Security"
          count={model.summary.totalEntities}
          isCollapsed={collapsedSections.details ?? false}
          onToggleCollapse={toggleSectionCollapse}
          surface={surface}
        >
          <div ref={detailsRef}>
            <DetailsSection
              groupSummaries={model.summary.groupSummaries}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              cardSizes={cardSizes}
              updateCardSize={updateCardSize}
              isEditMode={isEditMode}
              onRemoveEntity={onRemoveEntity}
              surface={surface}
            />
          </div>
        </FlatSection>
      ) : null}

      {viewerCamera ? (
        <SummaryCameraViewer
          camera={viewerCamera}
          isOpen={viewerCamera !== null}
          onOpenChange={(open) => {
            if (!open) {
              setViewerCamera(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

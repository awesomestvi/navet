import { SectionCustomizeButton } from '@navet/app/components/layout/section-customize-button';
import { DashboardHeroSection } from '@navet/app/components/patterns';
import { Badge, BaseCard, InteractivePill } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { type CardSize, getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getDeviceTypeIcon } from '@navet/app/constants/device-type-icons';
import { readNavetCameraState } from '@navet/app/core/navet-device-state';
import { DashboardCardItem, DashboardEditActions } from '@navet/app/features/dashboard';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { getLightCardSurfaceTokens } from '@navet/app/features/lighting/components/light-card/light-card-surface-tokens';
import { useCameraPlaybackPlan } from '@navet/app/features/security/hooks/use-camera-playback-plan';
import { useProviderCameraTopology } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import { type ThemeType, useTheme } from '@navet/app/hooks/use-theme';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import { normalizeResourceUrl } from '@navet/app/services/integration-resource.service';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { type CameraViewMode, useSettingsStore } from '@navet/app/stores/settings-store';
import type { CameraDevice, DeviceWithType, SecuritySeverity } from '@navet/app/types/device.types';
import { ChevronDown } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CameraDashboardModel,
  SecurityGroupSummary,
} from '../utils/security-camera-dashboard-model';
import { CameraLiveViewer } from './camera-card/camera-live-viewer';
import {
  appendCameraCacheBuster,
  normalizeCameraSnapshotUrl,
  resolveViewerInitialCameraViewMode,
} from './camera-card/camera-view-mode';
import { useProviderCameraLiveData } from './camera-card/use-provider-camera-live-data';
import { getSecurityCardSurfaceTokens } from './security-card-surface-tokens';

interface SecurityCameraDashboardProps {
  model: CameraDashboardModel;
  isEditMode: boolean;
  onToggleEditMode?: () => void;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onRemoveEntity?: (entityId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}

function getSeverityTone(severity: SecuritySeverity): 'neutral' | 'warning' | 'danger' | 'accent' {
  if (severity === 'critical') {
    return 'danger';
  }
  if (severity === 'warning' || severity === 'unknown') {
    return 'warning';
  }
  if (severity === 'active') {
    return 'accent';
  }
  return 'neutral';
}

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

function getLaneHeaderBaseColor(tone: 'neutral' | 'warning' | 'danger' | 'accent') {
  switch (tone) {
    case 'danger':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    case 'accent':
      return '#38bdf8';
    default:
      return null;
  }
}

function getNowLaneHeaderTone(tone: 'neutral' | 'warning' | 'danger' | 'accent') {
  switch (tone) {
    case 'danger':
    case 'warning':
      return 'red' as const;
    case 'accent':
      return 'blue' as const;
    default:
      return 'neutral' as const;
  }
}

function getNowLaneSurfaceProps(
  tone: 'neutral' | 'warning' | 'danger' | 'accent',
  theme: ThemeType,
  colors: ReturnType<typeof useTheme>['colors'],
  accentColor: string
) {
  const cardShell = getCardShellSurfaceTokens(theme);

  if (tone === 'accent') {
    const fanSurface = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      currentColor: '#38bdf8',
      theme,
      lightColors: colors.light,
      accentColor,
    });

    return {
      frameClassName: `${cardShell.rootFrameClassName} ${fanSurface.cardClassName}`,
      style: fanSurface.cardStyle,
      overlay: (
        <>
          {fanSurface.activeGlowClassName ? (
            <div className={fanSurface.activeGlowClassName} style={fanSurface.activeGlowStyle} />
          ) : null}
          {fanSurface.innerOverlayClassName ? (
            <div
              className={fanSurface.innerOverlayClassName}
              style={fanSurface.innerOverlayStyle}
            />
          ) : null}
          {fanSurface.shineOverlayClassName ? (
            <div className={fanSurface.shineOverlayClassName} />
          ) : null}
        </>
      ),
      disableDefaultSheen: true,
    };
  }

  const securitySurface = getSecurityCardSurfaceTokens(theme);
  const lockColors = colors.lock.unlocked;

  return {
    frameClassName: `${cardShell.rootFrameClassName} bg-linear-to-br ${lockColors.gradient} ${lockColors.border} ${securitySurface.containerShadowClassName}`,
    overlay: (
      <>
        <div
          className={`absolute inset-0 bg-linear-to-b ${lockColors.glow} via-transparent to-transparent`}
        />
        <div className={`absolute inset-0 ${securitySurface.lockCardOverlay}`} />
      </>
    ),
    disableDefaultSheen: true,
  };
}

function getSeverityStatusClassName(device: DeviceWithType, severity: SecuritySeverity) {
  if (device.type === 'locks' && device.state === false) {
    return 'text-red-300';
  }

  if (severity === 'critical' && device.securityKind === 'siren') {
    return 'text-red-400';
  }

  switch (severity) {
    case 'critical':
      return 'text-rose-300';
    case 'warning':
      return 'text-red-300';
    case 'unknown':
      return 'text-zinc-300';
    default:
      return '';
  }
}

function getLiveStatusClassName(device: DeviceWithType) {
  if (device.type === 'cameras' || device.securityKind === 'camera') {
    return 'text-emerald-300';
  }

  if (
    device.securityKind === 'motion' ||
    device.securityKind === 'occupancy' ||
    device.securityKind === 'presence' ||
    device.securityKind === 'vibration' ||
    device.securityKind === 'sound'
  ) {
    return 'text-amber-200';
  }

  return '';
}

function getRowIconSurfaceClassName(
  device: DeviceWithType,
  severity: SecuritySeverity,
  theme: ThemeType,
  emphasizeStatusBySeverity: boolean,
  emphasizeStatusByActivity: boolean
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

  return theme === 'light' ? 'bg-slate-100' : 'bg-zinc-900';
}

function getRowIconClassName(
  device: DeviceWithType,
  severity: SecuritySeverity,
  theme: ThemeType,
  emphasizeStatusBySeverity: boolean,
  emphasizeStatusByActivity: boolean
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
  surface,
}: {
  model: CameraDashboardModel['summary'];
  isEditMode: boolean;
  onToggleEditMode: () => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { accentColor } = useTheme();
  const needsAttention = model.attentionItems.length;
  const badges = (
    <>
      <SectionCustomizeButton isEditMode={isEditMode} onToggle={onToggleEditMode} />
      {needsAttention > 0 ? (
        <Badge tone={getSeverityTone(model.highestSeverity)}>{needsAttention} to check</Badge>
      ) : null}
      {model.activeCount > 0 ? (
        <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-100">
          {model.activeCount} live
        </Badge>
      ) : null}
      {needsAttention === 0 && model.securedCounts.totalSecure > 0 ? (
        <Badge tone="success">{model.securedCounts.totalSecure} secure</Badge>
      ) : null}
    </>
  );

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

function FlatSection({
  id,
  title,
  count,
  children,
  isCollapsed = false,
  onToggleCollapse,
  surface,
}: {
  id: string;
  title: string;
  count?: number;
  children: ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const headerContent = (
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
      {typeof count === 'number' ? (
        <span className={`ml-1.5 text-xs md:text-sm ${surface.textSecondary}`}>{count} items</span>
      ) : null}
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
        <div className="h-8 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20">
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
            emphasizeStatusByActivity
          )}`}
        >
          <Icon
            className={`h-3 w-3 ${getRowIconClassName(
              device,
              severity,
              theme,
              emphasizeStatusBySeverity,
              emphasizeStatusByActivity
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
            ? getSeverityStatusClassName(device, severity)
            : emphasizeStatusByActivity
              ? getLiveStatusClassName(device)
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
  title,
  items,
  tone,
  emptyLabel,
  animateAttention = false,
  trailingLabelMode = 'severity',
  showInlineStatus = true,
  emphasizeStatusBySeverity = false,
  emphasizeStatusByActivity = false,
  preferThumbnail = false,
  allEntities = [],
  onItemClick,
  surface,
}: {
  title: string;
  items: DeviceWithType[];
  tone: 'neutral' | 'warning' | 'danger' | 'accent';
  emptyLabel: string;
  animateAttention?: boolean;
  trailingLabelMode?: 'severity' | 'status';
  showInlineStatus?: boolean;
  emphasizeStatusBySeverity?: boolean;
  emphasizeStatusByActivity?: boolean;
  preferThumbnail?: boolean;
  allEntities?: DeviceWithType[];
  onItemClick?: (device: DeviceWithType) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { theme, colors, accentColor } = useTheme();
  const laneSurface = getNowLaneSurfaceProps(tone, theme, colors, accentColor);
  const headerCount = (
    <EntityCardHeaderIcon
      iconText={String(items.length)}
      isActive={items.length > 0}
      size="small"
      tone={items.length > 0 ? 'primary' : 'neutral'}
      baseColor={getLaneHeaderBaseColor(tone)}
    />
  );

  return (
    <BaseCard
      size="small"
      surfaceVariant="muted"
      title={title}
      headerLeading={headerCount}
      headerTone={getNowLaneHeaderTone(tone)}
      accentColor={getLaneHeaderBaseColor(tone) ?? undefined}
      className="min-w-0"
      frameClassName={laneSurface.frameClassName}
      style={laneSurface.style}
      overlay={laneSurface.overlay}
      disableDefaultSheen={laneSurface.disableDefaultSheen}
      contentClassName="px-3 pb-2.5 md:px-3.5"
    >
      {items.length > 0 ? (
        <div className="-mx-1">
          {items.map((device) => (
            <CompactEntityRow
              key={device.id}
              device={device}
              animateAttention={animateAttention}
              trailingLabelMode={trailingLabelMode}
              showInlineStatus={showInlineStatus}
              emphasizeStatusBySeverity={emphasizeStatusBySeverity}
              emphasizeStatusByActivity={emphasizeStatusByActivity}
              preferThumbnail={preferThumbnail}
              allEntities={allEntities}
              surface={surface}
              onClick={onItemClick ? () => onItemClick(device) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className={`py-1 text-sm ${surface.textMuted}`}>{emptyLabel}</p>
      )}
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

function SecuredOverview({
  summary,
}: {
  summary: CameraDashboardModel['summary']['securedCounts'];
}) {
  const { theme } = useTheme();
  const parts = [
    summary.openingsClosed > 0 ? `${summary.openingsClosed} openings closed` : '',
    summary.locksLocked > 0 ? `${summary.locksLocked} locks locked` : '',
    summary.hazardSensorsClear > 0 ? `${summary.hazardSensorsClear} hazard sensors clear` : '',
    summary.motionSensorsClear > 0 ? `${summary.motionSensorsClear} motion sensors clear` : '',
    summary.camerasAvailable > 0 ? `${summary.camerasAvailable} cameras available` : '',
  ].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {parts.map((part) => (
        <span
          key={part}
          className={`rounded-full border px-3 py-2 text-sm ${
            theme === 'light'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-emerald-400/18 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          {part}
        </span>
      ))}
    </div>
  );
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
  const dashboardSpaceMode = useSettingsStore(settingsSelectors.dashboardSpaceMode);
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols, dashboardSpaceMode === 'more_space');

  return (
    <DashboardEditActions isEditMode={isEditMode} onRemoveEntity={onRemoveEntity}>
      <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
        <div
          ref={innerRef}
          className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
          style={innerContainerStyle}
        >
          <div
            className="grid w-full grid-flow-row-dense gap-3 pt-3 lg:gap-4"
            style={gridStyle as CSSProperties}
          >
            {devices.map((device) => {
              const defaultSize = device.type === 'cameras' ? 'large' : device.size;
              const size = cardSizes[device.id] ?? defaultSize;

              return (
                <DashboardCardItem
                  key={device.id}
                  id={device.id}
                  device={device}
                  size={size}
                  isEditMode={isEditMode}
                  handleSizeChange={updateCardSize}
                  onRemoveEntity={onRemoveEntity}
                  allowEntityRemoval
                  usesHideAction
                />
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
      <div role="tablist" aria-label="Security detail groups" className="flex flex-wrap gap-2">
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
              className={`rounded-[22px] gap-2 whitespace-nowrap border transition-colors ${getDetailsPillClassName(
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

      <div
        role="tabpanel"
        id={`security-details-panel-${selectedGroup.id}`}
        aria-labelledby={`security-details-tab-${selectedGroup.id}`}
        className="pt-1"
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
  cardSizes,
  updateCardSize,
  onRemoveEntity,
  surface,
}: SecurityCameraDashboardProps) {
  const breakpointCols = useBreakpointCols();
  const dashboardSpaceMode = useSettingsStore(settingsSelectors.dashboardSpaceMode);
  const {
    outerRef: nowOuterRef,
    innerRef: nowInnerRef,
    outerContainerStyle: nowOuterContainerStyle,
    innerContainerStyle: nowInnerContainerStyle,
    isAutoScaled: isNowAutoScaled,
    gridStyle: nowGridStyle,
  } = useFitDashboardGrid(breakpointCols, dashboardSpaceMode === 'more_space');
  const [viewerCamera, setViewerCamera] = useState<CameraDevice | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const attentionCount = model.summary.attentionItems.length;
  const defaultGroupId = useMemo(
    () =>
      model.summary.groupSummaries.find((group) => group.defaultExpanded)?.id ??
      model.summary.groupSummaries[0]?.id ??
      '',
    [model.summary.groupSummaries]
  );
  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId);

  useEffect(() => {
    setSelectedGroupId((current) => {
      if (current && model.summary.groupSummaries.some((group) => group.id === current)) {
        return current;
      }

      return defaultGroupId;
    });
  }, [defaultGroupId, model.summary.groupSummaries]);

  const navigateToEntity = (device: DeviceWithType) => {
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
        surface={surface}
      />

      <FlatSection
        id="now"
        title="Now"
        count={attentionCount + model.summary.activityItems.length}
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
              <div className={`${getCardSpanClass('large')} min-w-0`}>
                <NowLane
                  title="Attention"
                  items={model.summary.attentionItems}
                  tone={
                    attentionCount > 0 ? getSeverityTone(model.summary.highestSeverity) : 'neutral'
                  }
                  emptyLabel="Nothing needs attention."
                  animateAttention
                  trailingLabelMode="status"
                  showInlineStatus={false}
                  emphasizeStatusBySeverity
                  allEntities={model.allEntities}
                  onItemClick={handleAttentionItemClick}
                  surface={surface}
                />
              </div>
              <div className={`${getCardSpanClass('large')} min-w-0`}>
                <NowLane
                  title="Live"
                  items={model.summary.activityItems}
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
              </div>
            </div>
          </div>
        </div>
      </FlatSection>

      {attentionCount === 0 ? (
        <FlatSection
          id="secure"
          title="Secure"
          isCollapsed={collapsedSections.secure ?? false}
          onToggleCollapse={toggleSectionCollapse}
          surface={surface}
        >
          <SecuredOverview summary={model.summary.securedCounts} />
        </FlatSection>
      ) : null}

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

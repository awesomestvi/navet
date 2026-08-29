import { CardEmptyState } from '@navet/app/components/patterns';
import {
  Badge,
  BaseCard,
  Button,
  EntityCardHeaderIcon,
  OverlayScrollArea,
} from '@navet/app/components/primitives';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { useTheme } from '@navet/app/hooks/use-theme';
import { useI18n } from '@navet/app/i18n';
import type { CameraDevice, DeviceWithType, SecuritySeverity } from '@navet/app/types/device.types';
import { getDeviceRoomLabel, UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import type { NavetAlarmEntity } from '@navet/core/alarm-types';
import {
  Activity,
  ChevronRight,
  CircleOff,
  DoorOpen,
  Droplets,
  Flame,
  Lock,
  LockOpen,
  type LucideIcon,
  Radio,
  ShieldCheck,
  TriangleAlert,
  Wind,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useMemo } from 'react';
import { useFitDashboardGrid } from '../../dashboard/hooks/use-fit-dashboard-grid';
import {
  SECURITY_ACTIVITY_EVENT_LIMIT,
  useSecurityActivityHistory,
} from '../hooks/use-security-activity-history';
import type {
  SecurityActivityEvent,
  SecurityActivityKind,
} from '../utils/security-activity-history';
import type { CameraDashboardModel } from '../utils/security-camera-dashboard-model';
import { SecurityPanelCard } from './alarm-panel-card';
import { getSecurityStateSurfaceProps } from './security-card-surface-tokens';

interface SecurityCommandCenterProps {
  model: CameraDashboardModel;
  alarms: NavetAlarmEntity[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  renderOverviewContent: (columnCount: number, isMobile: boolean) => ReactNode;
  renderDetailsContent?: (columnCount: number) => ReactNode;
  onSelectEntity: (device: DeviceWithType) => void;
  onSelectCamera: (camera: CameraDevice) => void;
}

function readSeverity(device: DeviceWithType): SecuritySeverity {
  if (device.type === 'covers') {
    return device.position > 0 ? 'warning' : 'normal';
  }
  if (device.type === 'cameras') {
    return device.securitySeverity === 'unknown'
      ? 'unknown'
      : device.state === 'streaming' || device.state === 'recording' || device.state === 'on'
        ? 'active'
        : 'normal';
  }
  return device.securitySeverity ?? 'normal';
}

function getAttentionIcon(device: DeviceWithType) {
  if (device.type === 'locks' || device.securityKind === 'lock') return LockOpen;
  if (
    device.type === 'covers' ||
    device.securityKind === 'door' ||
    device.securityKind === 'window' ||
    device.securityKind === 'garageDoor' ||
    device.securityKind === 'opening'
  ) {
    return DoorOpen;
  }
  if (device.securityKind === 'waterLeak') return Droplets;
  if (device.securityKind === 'gas' || device.securityKind === 'carbonMonoxide') return Wind;
  if (device.securityKind === 'smoke' || device.securityKind === 'safety') return Flame;
  if (readSeverity(device) === 'unknown') return CircleOff;
  return TriangleAlert;
}

function getAlertTone(device: DeviceWithType) {
  const severity = readSeverity(device);

  if (severity === 'critical' || (device.type === 'locks' && device.state === false)) {
    return 'red' as const;
  }
  if (severity === 'warning') return 'yellow' as const;
  if (severity === 'active') return 'amber' as const;
  return 'neutral' as const;
}

function formatAlertTitle(device: DeviceWithType, t: ReturnType<typeof useI18n>['t']) {
  if (readSeverity(device) === 'unknown') {
    return t('security.activity.changed', {
      name: device.name,
      state: t('common.unavailable'),
    });
  }
  if (device.type === 'locks' && device.state === false) {
    return t('security.activity.unlocked', { name: device.name });
  }
  if (device.type === 'covers' && device.position > 0) {
    return t('security.activity.opened', { name: device.name });
  }
  if (
    device.type === 'sensors' &&
    (device.securityKind === 'motion' || device.securityKind === 'occupancy')
  ) {
    return t('security.activity.motion', { name: device.name });
  }
  if (
    device.type === 'sensors' &&
    ['smoke', 'carbonMonoxide', 'gas', 'waterLeak', 'safety'].includes(device.securityKind ?? '')
  ) {
    return t('security.activity.hazard', { name: device.name });
  }
  return device.name;
}

function getActivityIcon(kind: SecurityActivityKind) {
  switch (kind) {
    case 'motion':
      return Radio;
    case 'unlocked':
      return LockOpen;
    case 'locked':
      return Lock;
    case 'opened':
    case 'closed':
      return DoorOpen;
    case 'hazard':
      return TriangleAlert;
    case 'hazard-cleared':
      return ShieldCheck;
    default:
      return Activity;
  }
}

function getActivityTone(kind: SecurityActivityKind) {
  switch (kind) {
    case 'locked':
    case 'closed':
    case 'hazard-cleared':
      return 'green' as const;
    case 'motion':
      return 'yellow' as const;
    case 'unlocked':
    case 'opened':
    case 'hazard':
    case 'alarm':
      return 'red' as const;
    case 'system':
      return 'amber' as const;
  }
}

function formatActivityTitle(event: SecurityActivityEvent, t: ReturnType<typeof useI18n>['t']) {
  switch (event.kind) {
    case 'motion':
      return t('security.activity.motion', { name: event.device.name });
    case 'unlocked':
      return t('security.activity.unlocked', { name: event.device.name });
    case 'locked':
      return t('security.activity.locked', { name: event.device.name });
    case 'opened':
      return t('security.activity.opened', { name: event.device.name });
    case 'closed':
      return t('security.activity.closed', { name: event.device.name });
    case 'hazard':
      return t('security.activity.hazard', { name: event.device.name });
    case 'hazard-cleared':
      return t('security.activity.hazardCleared', { name: event.device.name });
    default:
      return t('security.activity.changed', {
        name: event.device.name,
        state: event.state.replaceAll('_', ' '),
      });
  }
}

type SecurityHeaderTone = 'red' | 'yellow' | 'blue' | 'green' | 'neutral';

function SecurityStatusHeader({
  title,
  eyebrow,
  Icon,
  tone,
  theme,
  dividerClassName,
  surface,
}: {
  title: string;
  eyebrow: string;
  Icon: LucideIcon;
  tone: SecurityHeaderTone;
  theme: ReturnType<typeof useTheme>['theme'];
  dividerClassName: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const eyebrowClassName =
    tone === 'red'
      ? theme === 'light'
        ? 'text-red-700'
        : 'text-red-200'
      : tone === 'yellow'
        ? theme === 'light'
          ? 'text-amber-700'
          : 'text-amber-200'
        : tone === 'green'
          ? theme === 'light'
            ? 'text-emerald-700'
            : 'text-emerald-200'
          : tone === 'blue'
            ? theme === 'light'
              ? 'text-sky-700'
              : 'text-sky-200'
            : surface.textMuted;

  return (
    <div
      className={`flex min-h-[4.5rem] items-center gap-2.5 border-b px-3 py-2.5 ${dividerClassName}`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`mb-px text-[11px] font-medium leading-[14px] tracking-normal ${eyebrowClassName}`}
        >
          {eyebrow}
        </p>
        <h3
          className={`truncate text-lg font-bold leading-[22px] tracking-[-0.035em] ${surface.textPrimary}`}
        >
          {title}
        </h3>
      </div>
      <EntityCardHeaderIcon
        IconComponent={Icon}
        isActive={tone !== 'neutral'}
        size="medium"
        tone={tone}
      />
    </div>
  );
}

function OutcomePanel({
  model,
  surface,
}: {
  model: CameraDashboardModel;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { t } = useI18n();
  const { theme, colors, accentColor } = useTheme();
  const Icon =
    model.summary.highestSeverity === 'critical'
      ? TriangleAlert
      : model.summary.highestSeverity === 'warning'
        ? TriangleAlert
        : model.summary.highestSeverity === 'active'
          ? Radio
          : model.summary.highestSeverity === 'unknown'
            ? CircleOff
            : ShieldCheck;
  const tone =
    model.summary.highestSeverity === 'critical'
      ? 'red'
      : model.summary.highestSeverity === 'warning'
        ? 'yellow'
        : model.summary.highestSeverity === 'active'
          ? 'blue'
          : model.summary.highestSeverity === 'normal'
            ? 'green'
            : 'neutral';
  const count =
    model.summary.highestSeverity === 'critical'
      ? model.summary.criticalCount
      : model.summary.highestSeverity === 'warning'
        ? model.summary.warningCount
        : model.summary.highestSeverity === 'active'
          ? model.summary.activeCount
          : model.summary.highestSeverity === 'unknown'
            ? model.summary.unknownCount
            : model.summary.normalCount;
  const label = t(
    model.summary.highestSeverity === 'critical'
      ? 'security.severity.critical'
      : model.summary.highestSeverity === 'warning'
        ? 'security.severity.attention'
        : model.summary.highestSeverity === 'active'
          ? 'security.severity.active'
          : model.summary.highestSeverity === 'unknown'
            ? 'common.unavailable'
            : 'security.severity.normal'
  );
  const stateSurface = getSecurityStateSurfaceProps(
    tone === 'green' ? 'success' : tone === 'blue' ? 'accent' : 'neutral',
    theme,
    colors,
    accentColor
  );
  const dividerClassName = theme === 'light' ? 'border-black/10' : 'border-white/10';

  return (
    <BaseCard
      size="large"
      fullBleed
      header={
        <SecurityStatusHeader
          title={model.summary.title}
          eyebrow={`${count} ${label}`}
          Icon={Icon}
          tone={tone}
          theme={theme}
          dividerClassName={dividerClassName}
          surface={surface}
        />
      }
      frameClassName={stateSurface.frameClassName}
      style={stateSurface.frameStyle}
      overlay={stateSurface.overlay}
      disableDefaultSheen={stateSurface.disableDefaultSheen}
      aria-label={model.summary.title}
      data-testid="security-outcome-panel"
      className="h-auto"
    >
      {null}
    </BaseCard>
  );
}

function SecurityAlertsPanel({
  items,
  surface,
  onSelect,
}: {
  items: DeviceWithType[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  onSelect: (device: DeviceWithType) => void;
}) {
  const { t } = useI18n();
  const { theme, colors, accentColor } = useTheme();

  if (items.length === 0) return null;

  let criticalCount = 0;
  let warningCount = 0;
  for (const device of items) {
    const tone = getAlertTone(device);
    if (tone === 'red') criticalCount += 1;
    if (tone === 'yellow') warningCount += 1;
  }
  const headerTone = criticalCount > 0 ? 'red' : warningCount > 0 ? 'yellow' : 'neutral';
  const stateSurface = getSecurityStateSurfaceProps(
    headerTone === 'red' ? 'danger' : headerTone === 'yellow' ? 'warning' : 'neutral',
    theme,
    colors,
    accentColor
  );
  const dividerClassName = theme === 'light' ? 'border-black/10' : 'border-white/10';
  const rowHoverClassName = theme === 'light' ? 'hover:bg-white/45' : 'hover:bg-white/[0.06]';
  const dominantCount =
    criticalCount > 0 ? criticalCount : warningCount > 0 ? warningCount : items.length;
  const dominantLabel = t(
    criticalCount > 0
      ? 'security.severity.critical'
      : warningCount > 0
        ? 'security.severity.attention'
        : 'common.unavailable'
  );
  const alertRows = items.map((device) => {
    const Icon = getAttentionIcon(device);
    const tone = getAlertTone(device);
    const room = getDeviceRoomLabel(device);
    const title = formatAlertTitle(device, t);
    return (
      <button
        key={device.id}
        type="button"
        onClick={() => onSelect(device)}
        className={`grid min-h-14 w-full grid-cols-[2rem_minmax(0,1fr)_1rem] items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 ${dividerClassName} ${rowHoverClassName} ${getThemeFocusRingClassName(theme)}`}
        data-testid="security-alert-row"
        data-alert-tone={tone}
        aria-label={title}
      >
        <EntityCardHeaderIcon
          IconComponent={Icon}
          isActive={tone !== 'neutral'}
          size="large"
          tone={tone}
          badgeClassName="!h-8 !w-8 !shadow-none !drop-shadow-none"
          glyphClassName="!drop-shadow-none"
        />
        <span className="min-w-0">
          <span className={`block truncate text-xs font-medium ${surface.textPrimary}`}>
            {title}
          </span>
          {room !== UNKNOWN_ROOM_LABEL ? (
            <span className={`mt-0.5 block truncate text-[10px] ${surface.textMuted}`}>{room}</span>
          ) : null}
        </span>
        <ChevronRight aria-hidden="true" className={`h-4 w-4 ${surface.textMuted}`} />
      </button>
    );
  });
  const shouldScrollAlerts = items.length > 6;

  return (
    <BaseCard
      size="large"
      fullBleed
      header={
        <SecurityStatusHeader
          title={t('security.attention.title')}
          eyebrow={`${dominantCount} ${dominantLabel}`}
          Icon={TriangleAlert}
          tone={headerTone}
          theme={theme}
          dividerClassName={dividerClassName}
          surface={surface}
        />
      }
      frameClassName={stateSurface.frameClassName}
      style={stateSurface.frameStyle}
      overlay={stateSurface.overlay}
      disableDefaultSheen={stateSurface.disableDefaultSheen}
      aria-label={t('security.attention.title')}
      data-testid="security-alerts-panel"
      data-alert-tone={headerTone}
      className="h-auto"
      role={headerTone === 'red' ? 'alert' : undefined}
    >
      {shouldScrollAlerts ? (
        <OverlayScrollArea
          className="h-[22rem]"
          viewportClassName="h-full"
          scrollbarStartInset={6}
          scrollbarEndInset={6}
        >
          {alertRows}
        </OverlayScrollArea>
      ) : (
        <div>{alertRows}</div>
      )}
    </BaseCard>
  );
}

function ActivityPanel({
  events,
  hasMore,
  isLoading,
  isLoadingMore,
  loadMore,
  surface,
  onSelectEntity,
  onSelectCamera,
}: {
  events: SecurityActivityEvent[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  onSelectEntity: (device: DeviceWithType) => void;
  onSelectCamera: (camera: CameraDevice) => void;
}) {
  const { t, formatDate, formatTime, locale } = useI18n();
  const { theme } = useTheme();
  const visibleEvents = events.slice(0, SECURITY_ACTIVITY_EVENT_LIMIT);
  const isActivityScrollable = visibleEvents.length > 5;
  const relativeDayFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
    [locale]
  );
  const today = new Date();
  const todayOrdinal =
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000;
  const getActivityDayOffset = (date: Date) => {
    const dayOrdinal = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
    return dayOrdinal - todayOrdinal;
  };
  const formatActivityDayLabel = (date: Date) => {
    const dayOffset = getActivityDayOffset(date);

    if (dayOffset === 0) {
      const relativeDay = relativeDayFormatter.format(0, 'day');
      const [firstCharacter = '', ...remainingCharacters] = Array.from(relativeDay);
      return `${firstCharacter.toLocaleUpperCase(locale)}${remainingCharacters.join('')}`;
    }

    if (dayOffset >= -6 && dayOffset < 0) {
      return formatDate(date, { weekday: 'long' });
    }

    const weekday = formatDate(date, { weekday: 'short' });
    const dayOfMonth = formatDate(date, { day: 'numeric' });
    const month = formatDate(date, { month: 'short' });
    return `${weekday}, ${dayOfMonth} ${month}`;
  };
  const activityDays = useMemo(() => {
    const days: Array<{
      key: string;
      date: Date | null;
      minuteGroups: Array<{ key: string; date: Date | null; events: SecurityActivityEvent[] }>;
    }> = [];

    for (const event of visibleEvents) {
      const date = event.timestampMs === null ? null : new Date(event.timestampMs);
      const dayKey = date
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        : 'current';
      const minuteKey = date ? String(Math.floor(date.getTime() / 60_000)) : 'current';
      let day = days.at(-1);
      if (!day || day.key !== dayKey) {
        day = { key: dayKey, date, minuteGroups: [] };
        days.push(day);
      }
      let minuteGroup = day.minuteGroups.at(-1);
      if (!minuteGroup || minuteGroup.key !== minuteKey) {
        minuteGroup = { key: minuteKey, date, events: [] };
        day.minuteGroups.push(minuteGroup);
      }
      minuteGroup.events.push(event);
    }

    return days;
  }, [visibleEvents]);

  const activityTimeline = activityDays.map((day, dayIndex) => {
    const dayLabel = day.date ? formatActivityDayLabel(day.date) : t('security.activity.current');
    return (
      <section
        key={day.key}
        aria-label={dayLabel}
        className={dayIndex > 0 ? 'relative z-10 pt-2' : 'relative z-10'}
        data-testid="security-activity-day"
      >
        <header className="sticky top-0 z-30 flex min-h-11 items-center justify-center px-3">
          <h4 data-testid="security-activity-day-label">
            <Badge
              size="small"
              className={`${surface.iconBg} ${surface.textSecondary} font-semibold`}
            >
              {dayLabel}
            </Badge>
          </h4>
        </header>
        <div>
          {day.minuteGroups.flatMap((minuteGroup, minuteGroupIndex) =>
            minuteGroup.events.map((event, eventIndex) => {
              const Icon = getActivityIcon(event.kind);
              const tone = getActivityTone(event.kind);
              const room = getDeviceRoomLabel(event.device);
              const isFirstEvent = minuteGroupIndex === 0 && eventIndex === 0;
              const isLastEventInMinuteGroup = eventIndex === minuteGroup.events.length - 1;
              const isLastEvent =
                minuteGroupIndex === day.minuteGroups.length - 1 && isLastEventInMinuteGroup;
              const showMinuteGroupDivider = isLastEventInMinuteGroup && !isLastEvent;
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() =>
                    event.device.type === 'cameras'
                      ? onSelectCamera(event.device)
                      : onSelectEntity(event.device)
                  }
                  className={`relative grid min-h-12 w-full grid-cols-[3rem_1.75rem_minmax(0,1fr)] items-start gap-x-2.5 px-3 pt-2 text-left [contain-intrinsic-size:auto_48px] [content-visibility:auto] ${surface.hoverBg} ${getThemeFocusRingClassName(theme)}`}
                >
                  {eventIndex > 0 ? (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-[6.75rem] right-3 top-0 z-10 border-t opacity-50 ${surface.dividerBorder}`}
                      data-testid="security-activity-same-time-divider"
                    />
                  ) : null}
                  {!isFirstEvent ? (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-[5.25rem] top-0 z-10 h-2 border-l ${surface.border}`}
                      data-testid="security-activity-timeline-line-incoming"
                    />
                  ) : null}
                  {!isLastEvent ? (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute bottom-0 left-[5.25rem] top-9 z-10 border-l ${surface.border}`}
                      data-testid="security-activity-timeline-line"
                    />
                  ) : null}
                  <span
                    className={`pt-1.5 text-right text-[10px] leading-4 tabular-nums ${surface.textMuted}`}
                    data-testid={eventIndex === 0 ? 'security-activity-time' : undefined}
                    aria-hidden={eventIndex === 0 ? undefined : true}
                  >
                    {eventIndex === 0
                      ? minuteGroup.date
                        ? formatTime(minuteGroup.date)
                        : t('security.activity.now')
                      : null}
                  </span>
                  <span
                    className="flex h-7 w-7 justify-center"
                    data-activity-tone={tone}
                    data-testid="security-activity-marker"
                  >
                    <EntityCardHeaderIcon
                      IconComponent={Icon}
                      isActive
                      size="large"
                      tone={tone}
                      badgeClassName="relative z-20 !h-7 !w-7 !shadow-none !drop-shadow-none"
                      glyphClassName="!drop-shadow-none"
                    />
                  </span>
                  <span
                    className={`min-w-0 self-stretch pb-2 ${showMinuteGroupDivider ? `border-b ${surface.dividerBorder}` : ''}`}
                    data-testid="security-activity-event-content"
                  >
                    <span className={`block truncate text-xs font-medium ${surface.textPrimary}`}>
                      {formatActivityTitle(event, t)}
                    </span>
                    <span className={`mt-0.5 block truncate text-[10px] ${surface.textMuted}`}>
                      {room}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    );
  });

  const activityContent = (
    <div className="relative isolate" data-testid="security-activity-content">
      {visibleEvents.length > 0 ? (
        activityTimeline
      ) : isLoading ? (
        <p className={`px-3 py-4 text-xs ${surface.textMuted}`} role="status">
          {t('common.loading')}
        </p>
      ) : (
        <CardEmptyState
          title={t('security.activity.title')}
          description={t('security.activity.empty')}
          icon={Activity}
          size="large"
          className="min-h-36 px-4 py-6"
        />
      )}
      {hasMore && visibleEvents.length > 0 ? (
        <div
          className={`relative z-30 flex justify-center border-t px-3 py-2 ${surface.dividerBorder}`}
        >
          <Button
            variant="ghost"
            size="small"
            disabled={isLoadingMore}
            onClick={() => void loadMore()}
          >
            {isLoadingMore ? t('common.loading') : t('security.activity.loadOlder')}
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <BaseCard
      size="large"
      fullBleed
      aria-label={t('security.activity.title')}
      data-testid="security-activity-panel"
      className="h-auto"
    >
      {isActivityScrollable ? (
        <OverlayScrollArea
          className="h-[21rem] md:h-96"
          viewportClassName="touch-pan-y overscroll-contain [-webkit-overflow-scrolling:touch]"
          viewportProps={{
            'aria-label': t('security.activity.title'),
            'data-testid': 'security-activity-scroll',
            tabIndex: 0,
          }}
          scrollbarStartInset={6}
          scrollbarEndInset={6}
        >
          {activityContent}
        </OverlayScrollArea>
      ) : (
        activityContent
      )}
    </BaseCard>
  );
}

function SecurityActivitySidebar({
  model,
  alarms,
  attentionEntities,
  fullWidthGridStyle,
  surface,
  onSelectEntity,
  onSelectCamera,
}: {
  model: CameraDashboardModel;
  alarms: NavetAlarmEntity[];
  attentionEntities: DeviceWithType[];
  fullWidthGridStyle: CSSProperties;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  onSelectEntity: (device: DeviceWithType) => void;
  onSelectCamera: (camera: CameraDevice) => void;
}) {
  const { events, hasMore, isLoading, isLoadingMore, loadMore } = useSecurityActivityHistory({
    entities: model.allEntities,
    currentActivity: model.summary.activityItems,
  });

  return (
    <>
      {attentionEntities.length > 0 ? (
        <div className="order-1 min-w-0" style={fullWidthGridStyle}>
          <SecurityAlertsPanel
            items={attentionEntities}
            surface={surface}
            onSelect={onSelectEntity}
          />
        </div>
      ) : (
        <div className="order-2 min-w-0" style={fullWidthGridStyle}>
          <OutcomePanel model={model} surface={surface} />
        </div>
      )}
      {alarms.length > 0 ? (
        <div className="order-3 min-w-0" style={fullWidthGridStyle}>
          <SecurityPanelCard alarms={alarms} presentation="compact" />
        </div>
      ) : null}
      <div className="order-5 min-w-0" style={fullWidthGridStyle}>
        <ActivityPanel
          events={events}
          hasMore={hasMore}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          loadMore={loadMore}
          surface={surface}
          onSelectEntity={onSelectEntity}
          onSelectCamera={onSelectCamera}
        />
      </div>
    </>
  );
}

export function SecurityCommandCenter({
  model,
  alarms,
  surface,
  renderOverviewContent,
  renderDetailsContent,
  onSelectEntity,
  onSelectCamera,
}: SecurityCommandCenterProps) {
  const { t } = useI18n();
  const breakpointCols = useBreakpointCols();
  const {
    gridStyle,
    innerContainerStyle,
    innerRef,
    isAutoScaled,
    outerContainerStyle,
    outerRef,
    renderedGridCols,
  } = useFitDashboardGrid(breakpointCols);
  const attentionEntities = model.summary.attentionEntities;
  const sidebarSpan = Math.min(renderedGridCols, 4);
  const mainSpan = breakpointCols <= 2 ? renderedGridCols : renderedGridCols - sidebarSpan;
  const fullWidthGridStyle = { gridColumn: `span ${renderedGridCols} / span ${renderedGridCols}` };
  const mainGridStyle = {
    gridColumn: `span ${mainSpan} / span ${mainSpan}`,
  };
  const sidebarGridStyle = {
    gridColumn: `span ${sidebarSpan} / span ${sidebarSpan}`,
  };

  return (
    <div data-testid="security-command-center">
      <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
        <div
          ref={innerRef}
          className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
          style={innerContainerStyle}
        >
          <div
            data-testid="security-command-grid"
            className="grid w-full grid-flow-row-dense items-start gap-3 lg:gap-4"
            style={{ ...gridStyle, gridAutoRows: 'auto' }}
          >
            <div
              data-testid="security-command-main"
              className="contents min-w-0 md:order-1 md:flex md:flex-col md:gap-7"
              style={mainGridStyle}
            >
              <section
                aria-label={t('security.overview.customize.previewLabel')}
                data-testid="security-overview-grid"
                className="order-4 min-w-0"
                style={fullWidthGridStyle}
              >
                {renderOverviewContent(mainSpan, breakpointCols <= 2)}
              </section>
              {renderDetailsContent ? (
                <div
                  data-testid="security-command-main-details"
                  className="order-6 min-w-0"
                  style={fullWidthGridStyle}
                >
                  {renderDetailsContent(mainSpan)}
                </div>
              ) : null}
            </div>
            <aside
              data-testid="security-command-sidebar"
              className="contents min-w-0 md:order-2 md:block md:space-y-3 lg:space-y-4"
              style={sidebarGridStyle}
            >
              <SecurityActivitySidebar
                model={model}
                alarms={alarms}
                attentionEntities={attentionEntities}
                fullWidthGridStyle={fullWidthGridStyle}
                surface={surface}
                onSelectEntity={onSelectEntity}
                onSelectCamera={onSelectCamera}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

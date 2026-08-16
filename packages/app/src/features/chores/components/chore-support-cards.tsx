import { Badge, Panel } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  getThemeFocusRingClassName,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import {
  Check,
  ChevronRight,
  Flame,
  Gift,
  HeartHandshake,
  Home,
  type LucideIcon,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  ChoreHousePulse,
  ChoreMissionProgress,
  ChoreRewardProgress,
} from '../chore-dashboard-selectors';
import { ChoreBaseCard } from './chore-base-card';
import { ChorePointsToken } from './chore-points-token';

const blackThemeCardEdge = {
  borderColor: 'rgba(255,255,255,0.16)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.055)',
} as const;

export function HousePulse({
  pulse,
  onSeeRewards,
  rewardsExpanded = false,
}: {
  pulse: ChoreHousePulse;
  onSeeRewards?: () => void;
  rewardsExpanded?: boolean;
}) {
  const { formatNumber, t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const settled = pulse.remaining === 0;

  return (
    <Panel
      as="section"
      className="relative overflow-hidden px-3 py-3 sm:px-4 md:px-5"
      style={theme === 'black' ? blackThemeCardEdge : undefined}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 8% 0%, ${accentColor}18, transparent 34%), radial-gradient(circle at 88% 100%, ${themeColorValues.teal}10, transparent 30%)`,
        }}
      />
      <div
        className={cn(
          'relative grid min-h-14 items-center',
          onSeeRewards
            ? 'grid-cols-[minmax(6.25rem,1.2fr)_repeat(4,minmax(3.5rem,0.7fr))]'
            : 'grid-cols-[minmax(6.25rem,1.2fr)_repeat(3,minmax(3.5rem,0.7fr))]'
        )}
        data-house-pulse-layout="single-row"
      >
        <div className="flex min-w-0 items-center gap-3 pr-2 sm:pr-4 md:pr-6">
          <span
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border sm:flex"
            style={{
              color: accentColor,
              borderColor: `${accentColor}42`,
              backgroundColor: `${accentColor}14`,
            }}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className={cn('truncate', navetTypographyTokens.titleMd, surface.textPrimary)}>
              {settled ? t('household.pulse.settled') : t('household.pulse.title')}
            </h2>
            <p className={cn('mt-0.5 hidden truncate text-sm sm:block', surface.textSecondary)}>
              {settled
                ? t('household.pulse.complete')
                : t('household.pulse.remaining', { count: pulse.remaining })}
            </p>
          </div>
        </div>
        <PulseMetric
          Icon={Sparkles}
          color={themeColorValues.pink}
          value={t('household.card.points', { count: pulse.pointsEarned })}
          mobileValue={formatNumber(pulse.pointsEarned)}
          label={t('household.card.earned')}
        />
        <PulseMetric
          Icon={Flame}
          color={themeColorValues.orange}
          value={formatNumber(pulse.streakDays)}
          label={t('household.pulse.rhythm')}
        />
        <PulseMetric
          Icon={Check}
          color={themeColorValues.teal}
          value={`${pulse.completed}/${pulse.total}`}
          label={t('household.pulse.completed')}
        />
        {onSeeRewards ? (
          <PulseMetric
            Icon={Gift}
            color={themeColorValues.purple}
            value={t('household.today.seeRewards')}
            mobileValue={t('household.tabs.rewards')}
            label={t('household.today.supporting')}
            onClick={onSeeRewards}
            expanded={rewardsExpanded}
            controls="chores-rewards-section"
          />
        ) : null}
      </div>
    </Panel>
  );
}

function PulseMetric({
  Icon,
  color,
  value,
  mobileValue,
  label,
  onClick,
  expanded,
  controls,
}: {
  Icon?: LucideIcon;
  color: string;
  value: string;
  mobileValue?: string;
  label?: string;
  onClick?: () => void;
  expanded?: boolean;
  controls?: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const accessibleLabel = label ? `${value}, ${label}` : value;
  const content = (
    <>
      {Icon ? (
        <span
          data-pulse-metric-icon="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11"
          style={{ color, backgroundColor: `${color}14` }}
        >
          <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-sm font-semibold tabular-nums sm:text-lg',
            surface.textPrimary
          )}
        >
          <span className="sm:hidden">{mobileValue ?? value}</span>
          <span className="hidden sm:inline">{value}</span>
        </p>
        {label ? (
          <p className={cn('mt-0.5 hidden truncate text-xs sm:block', surface.textSecondary)}>
            {label}
          </p>
        ) : null}
      </div>
      {onClick ? (
        <ChevronRight
          className={cn(
            'ml-auto h-3.5 w-3.5 shrink-0 transition-transform sm:h-4 sm:w-4',
            expanded && 'rotate-90'
          )}
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  const className = cn(
    '-my-3 flex h-[calc(100%+1.5rem)] min-w-0 self-stretch items-center gap-1 border-l border-current/10 px-1.5 sm:gap-2.5 sm:px-4 md:px-6',
    onClick &&
      `-mr-3 w-[calc(100%+0.75rem)] rounded-none text-left transition-colors sm:-mr-4 sm:w-[calc(100%+1rem)] md:-mr-5 md:w-[calc(100%+1.25rem)] ${surface.hoverBg} ${getThemeFocusRingClassName(theme)}`
  );

  return onClick ? (
    <button
      type="button"
      data-pulse-metric="true"
      className={className}
      aria-label={accessibleLabel}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <section data-pulse-metric="true" className={className} aria-label={accessibleLabel}>
      {content}
    </section>
  );
}

export function MissionCard({
  progress,
  compact = false,
  footer,
}: {
  progress: ChoreMissionProgress;
  compact?: boolean;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const missionColor = themeColorValues.orange;
  const label =
    progress.mission.status === 'complete'
      ? t('household.missions.complete')
      : progress.mission.status === 'upcoming'
        ? t('household.missions.upcoming')
        : t('household.missions.active');
  return (
    <ChoreBaseCard
      size={compact ? 'small' : 'medium'}
      title={progress.mission.title}
      eyebrow={label}
      surfaceVariant={progress.mission.status === 'complete' ? 'muted' : 'default'}
      style={theme === 'black' ? blackThemeCardEdge : undefined}
      leading={
        <EntityCardHeaderIcon
          IconComponent={HeartHandshake}
          isActive={progress.mission.status === 'active'}
          size="small"
          tone="primary"
          baseColor={missionColor}
        />
      }
      metrics={
        <div className="flex items-center gap-2">
          <Badge size="small" tone={progress.mission.status === 'complete' ? 'success' : 'accent'}>
            {progress.completed}/{progress.total}
          </Badge>
          {progress.mission.rewardPoints ? (
            <ChorePointsToken points={progress.mission.rewardPoints} color={missionColor} />
          ) : null}
        </div>
      }
      instructions={
        progress.mission.description ? (
          <p className="mt-auto line-clamp-2 text-sm opacity-75">{progress.mission.description}</p>
        ) : undefined
      }
      footerAction={footer}
    />
  );
}

export function RewardGoalCard({
  progress,
  compact = false,
  footer,
}: {
  progress: ChoreRewardProgress;
  compact?: boolean;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const rewardColor = themeColorValues.purple;
  const Icon =
    progress.goal.type === 'experience'
      ? Sparkles
      : progress.goal.type === 'family'
        ? HeartHandshake
        : Gift;
  return (
    <ChoreBaseCard
      size={compact ? 'small' : 'medium'}
      title={progress.goal.title}
      eyebrow={
        progress.goal.type === 'instant'
          ? t('household.rewards.type.instant')
          : progress.goal.type === 'saving'
            ? t('household.rewards.type.saving')
            : progress.goal.type === 'family'
              ? t('household.rewards.type.family')
              : t('household.rewards.type.experience')
      }
      surfaceVariant={progress.percent >= 100 ? 'muted' : 'default'}
      style={theme === 'black' ? blackThemeCardEdge : undefined}
      leading={
        <EntityCardHeaderIcon
          IconComponent={Icon}
          isActive={progress.percent < 100}
          size="small"
          tone="primary"
          baseColor={rewardColor}
        />
      }
      metrics={
        <div className="flex items-center gap-2">
          {progress.percent >= 100 ? (
            <Badge size="small" tone="success">
              {t('household.rewards.ready')}
            </Badge>
          ) : null}
          <ChorePointsToken
            points={progress.points}
            total={progress.goal.targetPoints}
            showPlus={false}
            color={rewardColor}
          />
        </div>
      }
      footerAction={footer}
    />
  );
}

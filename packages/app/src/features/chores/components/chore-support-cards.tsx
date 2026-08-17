import { Badge, Panel } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Check, Flame, Gift, HeartHandshake, Home, type LucideIcon, Sparkles } from 'lucide-react';
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
  showPoints = true,
  onSeeRewards,
  rewardsExpanded = false,
  actions,
  headingLevel = 'h2',
}: {
  pulse: ChoreHousePulse;
  showPoints?: boolean;
  onSeeRewards?: () => void;
  rewardsExpanded?: boolean;
  actions?: ReactNode;
  headingLevel?: 'h1' | 'h2';
}) {
  const { formatNumber, t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const settled = pulse.remaining === 0;
  const metricCount = 2 + Number(showPoints) + Number(Boolean(onSeeRewards));
  const Heading = headingLevel;

  return (
    <Panel
      as="section"
      className="relative overflow-hidden p-3"
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
          'relative',
          !showPoints && 'lg:landscape:flex lg:landscape:items-center xl:flex xl:items-center'
        )}
        data-house-pulse-layout="responsive"
        data-house-pulse-density={showPoints ? 'standard' : 'inline-metrics'}
      >
        <div
          className={cn(
            'flex min-w-0 flex-col gap-2.5 pb-3 sm:flex-row sm:items-center sm:justify-between',
            !showPoints && 'lg:landscape:contents xl:contents'
          )}
          data-house-pulse-header="true"
        >
          <div
            className={cn(
              'flex min-w-0 items-center gap-2.5',
              !showPoints && 'lg:landscape:order-1 lg:landscape:mr-2 xl:order-1 xl:mr-3'
            )}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border xl:h-9 xl:w-9"
              data-house-pulse-icon="true"
              style={{
                color: accentColor,
                borderColor: `${accentColor}42`,
                backgroundColor: `${accentColor}14`,
              }}
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Heading
                className={cn('truncate text-sm font-semibold leading-tight', surface.textPrimary)}
              >
                {settled ? t('household.pulse.settled') : t('household.pulse.title')}
              </Heading>
              <p className={cn('mt-0.5 truncate text-[11px] leading-tight', surface.textSecondary)}>
                {settled
                  ? t('household.pulse.complete')
                  : t('household.pulse.remaining', { count: pulse.remaining })}
              </p>
            </div>
          </div>
          {actions ? (
            <div
              className={cn(
                'flex w-full shrink-0 items-center gap-2 sm:w-auto',
                !showPoints &&
                  'lg:landscape:order-3 lg:landscape:ml-3 lg:landscape:border-l lg:landscape:pl-4 xl:order-3 xl:ml-3 xl:border-l xl:pl-4',
                !showPoints && surface.borderStrong
              )}
              data-house-pulse-actions="true"
            >
              {actions}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            '-mx-3 -mb-3 grid',
            showPoints
              ? 'grid-cols-1 sm:grid-cols-2'
              : onSeeRewards
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-2',
            metricCount === 4
              ? 'lg:landscape:grid-cols-4 xl:grid-cols-4'
              : metricCount === 3
                ? 'lg:landscape:grid-cols-3 xl:grid-cols-3'
                : 'lg:landscape:grid-cols-2 xl:grid-cols-2',
            !showPoints && 'lg:landscape:contents xl:contents'
          )}
          data-house-pulse-metrics="true"
        >
          {showPoints ? (
            <PulseMetric
              Icon={Sparkles}
              color={themeColorValues.pink}
              value={t('household.card.points', { count: pulse.pointsEarned })}
              mobileValue={formatNumber(pulse.pointsEarned)}
              label={t('household.card.earned')}
              alignStart
            />
          ) : null}
          <PulseMetric
            Icon={Flame}
            color={themeColorValues.orange}
            value={formatNumber(pulse.streakDays)}
            label={t('household.pulse.rhythm')}
            compactDivider={showPoints}
            wideDivider={showPoints}
            inlineWithHeader={!showPoints}
            inlineStart={!showPoints}
          />
          <PulseMetric
            Icon={Check}
            color={themeColorValues.teal}
            value={`${pulse.completed}/${pulse.total}`}
            label={t('household.pulse.completed')}
            mobileDivider={!showPoints}
            compactSpanFull={!onSeeRewards && metricCount % 2 === 1}
            wideDivider
            inlineWithHeader={!showPoints}
          />
          {onSeeRewards ? (
            <PulseMetric
              Icon={Gift}
              color={themeColorValues.purple}
              value={t('household.today.seeRewards')}
              mobileValue={t('household.tabs.rewards')}
              label={t('household.today.supporting')}
              compactMobileValue
              onClick={onSeeRewards}
              expanded={rewardsExpanded}
              controls="chores-rewards-section"
              compactDivider
              mobileSpanFull={!showPoints}
              wideDivider
              inlineWithHeader={!showPoints}
            />
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function PulseMetric({
  Icon,
  color,
  value,
  mobileValue,
  compactMobileValue = false,
  label,
  onClick,
  expanded,
  controls,
  compactDivider = false,
  mobileDivider = false,
  mobileSpanFull = false,
  compactSpanFull = false,
  wideDivider = false,
  alignStart = false,
  inlineWithHeader = false,
  inlineStart = false,
}: {
  Icon?: LucideIcon;
  color: string;
  value: string;
  mobileValue?: string;
  compactMobileValue?: boolean;
  label?: string;
  onClick?: () => void;
  expanded?: boolean;
  controls?: string;
  compactDivider?: boolean;
  mobileDivider?: boolean;
  mobileSpanFull?: boolean;
  compactSpanFull?: boolean;
  wideDivider?: boolean;
  alignStart?: boolean;
  inlineWithHeader?: boolean;
  inlineStart?: boolean;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const accessibleLabel = label ? `${value}, ${label}` : value;
  const content = (
    <>
      {Icon ? (
        <span
          data-pulse-metric-icon="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full xl:h-9 xl:w-9"
          style={{ color, backgroundColor: `${color}14` }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-sm font-semibold tabular-nums',
            compactMobileValue && 'text-xs sm:text-sm',
            surface.textPrimary
          )}
        >
          <span className="sm:hidden">{mobileValue ?? value}</span>
          <span className="hidden sm:inline">{value}</span>
        </p>
        {label ? (
          <p className={cn('mt-0.5 truncate text-[11px] leading-tight', surface.textSecondary)}>
            {label}
          </p>
        ) : null}
      </div>
    </>
  );

  const className = cn(
    'flex min-h-14 min-w-0 items-center gap-2 border-t border-current/10 px-3 py-3.5 sm:px-4 md:px-5',
    mobileDivider && 'border-l',
    mobileSpanFull && 'col-span-2 sm:col-span-1',
    compactDivider && 'sm:border-l',
    compactSpanFull && 'sm:col-span-2',
    'lg:landscape:col-span-1 lg:landscape:min-h-14 lg:landscape:px-3 lg:landscape:py-3.5 xl:col-span-1 xl:min-h-14 xl:px-4 xl:py-3.5 2xl:px-6',
    alignStart && 'lg:landscape:pl-5 xl:pl-5',
    inlineWithHeader &&
      'px-3 py-3 sm:px-3 md:px-3 lg:landscape:order-2 lg:landscape:min-h-0 lg:landscape:w-auto lg:landscape:flex-none lg:landscape:border-0 lg:landscape:px-4 lg:landscape:py-0 xl:order-2 xl:min-h-0 xl:w-auto xl:flex-none xl:border-0 xl:px-5 xl:py-0',
    wideDivider && 'lg:landscape:border-l xl:border-l',
    inlineStart && 'lg:landscape:ml-auto xl:ml-auto',
    onClick &&
      `w-full rounded-none text-left transition-colors ${surface.hoverBg} ${getThemeFocusRingClassName(theme)}`
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

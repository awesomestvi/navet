import { Badge, BaseCard, Button, Panel } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetTypographyTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Check, ChevronRight, Gift, HeartHandshake, Home, Leaf, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  ChoreHousePulse,
  ChoreMissionProgress,
  ChoreRewardProgress,
  ChoreRoomSummary,
} from '../chore-dashboard-selectors';
import { ChorePointsToken } from './chore-points-token';

function ProgressTrack({ value, label }: { value: number; label: string }) {
  const { accentColor } = useTheme();
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-current/10"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: accentColor }}
      />
    </div>
  );
}

function PulseProgressIndicator({
  value,
  label,
  settled,
}: {
  value: number;
  label: string;
  settled: boolean;
}) {
  const { accentColor } = useTheme();
  const progress = Math.min(100, Math.max(0, value));

  return (
    <span
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      style={{ color: accentColor, backgroundColor: `${accentColor}14` }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <svg
        className="absolute inset-0 h-full w-full -rotate-90"
        viewBox="0 0 44 44"
        aria-hidden="true"
      >
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.16"
        />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - progress}
          className="transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
        />
      </svg>
      {settled ? (
        <Check className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Leaf className="h-4 w-4" aria-hidden="true" />
      )}
    </span>
  );
}

export function HousePulse({
  pulse,
  rooms = [],
}: {
  pulse: ChoreHousePulse;
  rooms?: ChoreRoomSummary[];
}) {
  const { formatNumber, t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const settled = pulse.remaining === 0;

  return (
    <Panel
      as="section"
      className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(7rem,0.55fr))] sm:items-center md:px-5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <PulseProgressIndicator
            value={pulse.percent}
            label={t('household.pulse.progress')}
            settled={settled}
          />
          <div className="min-w-0">
            <h2 className={cn(navetTypographyTokens.titleMd, surface.textPrimary)}>
              {settled ? t('household.pulse.settled') : t('household.pulse.title')}
            </h2>
            <p className={cn('mt-0.5 text-sm', surface.textSecondary)}>
              {settled
                ? t('household.pulse.complete')
                : t('household.pulse.remaining', { count: pulse.remaining })}
            </p>
          </div>
        </div>
        {rooms.length > 0 ? (
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {rooms.slice(0, 8).map((room) => (
              <span
                key={room.canonicalId}
                className="h-1 flex-1 overflow-hidden rounded-full bg-current/10"
                title={room.label}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${room.total > 0 ? Math.round((room.completed / room.total) * 100) : 100}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <PulseMetric value={`${pulse.percent}%`} label={t('household.pulse.balance')} />
      <PulseMetric
        value={`${pulse.completed}/${pulse.total}`}
        label={t('household.pulse.completed')}
      />
      <PulseMetric value={formatNumber(pulse.strongDays)} label={t('household.pulse.rhythm')} />
    </Panel>
  );
}

function PulseMetric({ value, label }: { value: string; label: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <div className="min-w-0 border-t border-current/10 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
      <p className={cn('text-xl font-semibold tabular-nums', surface.textPrimary)}>{value}</p>
      <p className={cn('mt-0.5 text-xs', surface.textSecondary)}>{label}</p>
    </div>
  );
}

export function RoomChoreSummaryCard({
  summary,
  onSelect,
}: {
  summary: ChoreRoomSummary;
  onSelect?: () => void;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const allDone = summary.remaining === 0;
  return (
    <BaseCard
      size="small"
      title={summary.label}
      subtitle={
        allDone
          ? t('household.rooms.allDone')
          : t('household.rooms.remaining', { count: summary.remaining })
      }
      surfaceVariant={allDone ? 'muted' : 'default'}
      headerLayout="title-first"
      headerCompact
      headerLeading={
        <EntityCardHeaderIcon
          IconComponent={allDone ? Check : Home}
          isActive={!allDone}
          size="small"
          tone={allDone ? 'green' : 'primary'}
          baseColor={accentColor}
        />
      }
      headerTrailing={
        onSelect ? (
          <Button
            size="compact"
            variant="ghost"
            className="min-h-10 min-w-10 px-2"
            aria-label={t('household.rooms.open', { room: summary.label })}
            onClick={onSelect}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null
      }
    >
      <div className="mt-auto flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: Math.min(6, summary.total) }, (_, index) => (
          <span
            key={index}
            className="h-1.5 flex-1 rounded-full"
            style={{
              backgroundColor:
                index < summary.completed
                  ? accentColor
                  : theme === 'light'
                    ? 'rgba(15,23,42,0.12)'
                    : 'rgba(255,255,255,0.14)',
            }}
          />
        ))}
      </div>
    </BaseCard>
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
  const { accentColor } = useTheme();
  const label =
    progress.mission.status === 'complete'
      ? t('household.missions.complete')
      : progress.mission.status === 'upcoming'
        ? t('household.missions.upcoming')
        : t('household.missions.active');
  return (
    <BaseCard
      size={compact ? 'small' : 'medium'}
      title={progress.mission.title}
      subtitle={label}
      headerLayout="title-first"
      headerCompact
      headerLeading={
        <EntityCardHeaderIcon
          IconComponent={HeartHandshake}
          isActive={progress.mission.status === 'active'}
          size="small"
          tone="primary"
          baseColor={accentColor}
        />
      }
      headerTrailing={
        <div className="flex items-center gap-2">
          <Badge size="small" tone={progress.mission.status === 'complete' ? 'success' : 'accent'}>
            {progress.completed}/{progress.total}
          </Badge>
          {progress.mission.rewardPoints ? (
            <ChorePointsToken points={progress.mission.rewardPoints} />
          ) : null}
        </div>
      }
      footer={footer}
      footerClassName={footer ? 'border-t border-current/10 pt-3' : undefined}
    >
      <div className="mt-auto space-y-3">
        {progress.mission.description ? (
          <p className="line-clamp-2 text-sm opacity-75">{progress.mission.description}</p>
        ) : null}
        <ProgressTrack value={progress.percent} label={t('household.missions.progress')} />
      </div>
    </BaseCard>
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
  const { accentColor } = useTheme();
  const Icon =
    progress.goal.type === 'experience'
      ? Sparkles
      : progress.goal.type === 'family'
        ? HeartHandshake
        : Gift;
  return (
    <BaseCard
      size={compact ? 'small' : 'medium'}
      title={progress.goal.title}
      subtitle={
        progress.goal.type === 'instant'
          ? t('household.rewards.type.instant')
          : progress.goal.type === 'saving'
            ? t('household.rewards.type.saving')
            : progress.goal.type === 'family'
              ? t('household.rewards.type.family')
              : t('household.rewards.type.experience')
      }
      headerLayout="title-first"
      headerLeading={
        <EntityCardHeaderIcon
          IconComponent={Icon}
          isActive={progress.percent < 100}
          size="small"
          tone="primary"
          baseColor={accentColor}
        />
      }
      headerTrailing={
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
          />
        </div>
      }
      footer={footer}
      footerClassName={footer ? 'border-t border-current/10 pt-3' : undefined}
    >
      <div className="mt-auto space-y-3">
        <ProgressTrack value={progress.percent} label={t('household.rewards.progress')} />
      </div>
    </BaseCard>
  );
}

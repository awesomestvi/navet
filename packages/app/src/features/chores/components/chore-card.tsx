import { Badge, BaseCard, Button, Panel } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ChorePresentationMetadata } from '@navet/core/chore-experience';
import {
  type ChoreDefinition,
  type ChoreOccurrence,
  type ChoreParticipant,
  getChoreTiming,
} from '@navet/core/chores';
import {
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  Clock3,
  Home,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { resolveChoreIconComponent } from './chore-icon';
import { ChorePointsToken } from './chore-points-token';

export interface ChoreCardAction {
  label: string;
  onSelect: () => void;
  kind: 'complete' | 'claim' | 'approve' | 'reopen';
  disabled?: boolean;
}

function statusDetails(occurrence: ChoreOccurrence, now: Date, t: ReturnType<typeof useI18n>['t']) {
  const timing = getChoreTiming(occurrence, now);
  if (occurrence.status === 'done') {
    return { label: t('household.today.done'), tone: 'success' as const, Icon: CheckCircle2 };
  }
  if (occurrence.status === 'awaiting_approval') {
    return {
      label: t('household.today.awaitingApproval'),
      tone: 'warning' as const,
      Icon: ShieldCheck,
    };
  }
  if (occurrence.status === 'claimed') {
    return { label: t('household.today.claimed'), tone: 'accent' as const, Icon: CircleDashed };
  }
  if (occurrence.status === 'missed') {
    return { label: t('household.today.missed'), tone: 'danger' as const, Icon: RotateCcw };
  }
  if (timing === 'overdue') {
    return { label: t('household.today.overdue'), tone: 'danger' as const, Icon: Clock3 };
  }
  return {
    label: timing === 'due' ? t('household.today.due') : t('household.today.upcoming'),
    tone: 'neutral' as const,
    Icon: Circle,
  };
}

function assigneeLabel(
  occurrence: ChoreOccurrence,
  participantsById: Record<string, ChoreParticipant>,
  t: ReturnType<typeof useI18n>['t']
) {
  if (occurrence.assigneeIds.length === 0) return t('household.assignment.anyone');
  return occurrence.assigneeIds
    .map((id) => participantsById[id]?.displayName)
    .filter(Boolean)
    .join(', ');
}

function ChoreMetadata({
  definition,
  occurrence,
  participantsById,
  presentation,
}: {
  definition: ChoreDefinition;
  occurrence: ChoreOccurrence;
  participantsById: Record<string, ChoreParticipant>;
  presentation?: ChorePresentationMetadata;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const items = [
    definition.roomRef?.label ? { icon: Home, label: definition.roomRef.label } : undefined,
    { icon: undefined, label: assigneeLabel(occurrence, participantsById, t) },
    presentation?.estimatedMinutes
      ? {
          icon: Clock3,
          label: t('household.card.minutes', { count: presentation.estimatedMinutes }),
        }
      : undefined,
  ].filter(Boolean) as Array<{ icon?: typeof Home; label: string }>;

  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs', surface.textSecondary)}
    >
      {items.map(({ icon: Icon, label }, index) => (
        <span key={`${label}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
          {label}
        </span>
      ))}
    </div>
  );
}

export function ChoreFocusCard({
  definition,
  occurrence,
  participantsById,
  presentation,
  action,
  childMode = false,
  now = new Date(),
}: {
  definition: ChoreDefinition;
  occurrence: ChoreOccurrence;
  participantsById: Record<string, ChoreParticipant>;
  presentation?: ChorePresentationMetadata;
  action?: ChoreCardAction;
  childMode?: boolean;
  now?: Date;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const status = statusDetails(occurrence, now, t);
  const completed = occurrence.status === 'done';
  const title = childMode && presentation?.childTitle ? presentation.childTitle : definition.title;
  const ChoreIcon = resolveChoreIconComponent(presentation?.icon);
  const ActionIcon =
    action?.kind === 'approve' ? ShieldCheck : action?.kind === 'claim' ? Sparkles : Check;

  return (
    <BaseCard
      size="medium"
      title={title}
      subtitle={status.label}
      surfaceVariant={completed ? 'muted' : 'default'}
      isActive={!completed}
      activeColor={status.tone === 'danger' ? themeColorValues.red : accentColor}
      headerLayout="title-first"
      headerCompact
      headerLeading={
        <EntityCardHeaderIcon
          IconComponent={ChoreIcon}
          isActive={!completed}
          size="small"
          tone={status.tone === 'danger' ? 'red' : status.tone === 'warning' ? 'amber' : 'primary'}
          baseColor={status.tone === 'danger' ? themeColorValues.red : accentColor}
        />
      }
      headerTrailing={
        action || presentation?.points ? (
          <div className="flex items-center gap-2">
            {action ? (
              <RoundControlButton
                theme={theme}
                size="medium"
                variant={
                  action.kind === 'complete' || action.kind === 'approve' ? 'emphasis' : 'soft'
                }
                aria-label={action.label}
                title={action.label}
                disabled={action.disabled}
                onClick={action.onSelect}
              >
                <ActionIcon className="h-4 w-4" aria-hidden="true" />
              </RoundControlButton>
            ) : null}
            {presentation?.points ? <ChorePointsToken points={presentation.points} /> : null}
          </div>
        ) : null
      }
      contentClassName="flex min-h-0 flex-col"
      className={cn(completed && 'opacity-75')}
    >
      <div className="mt-auto space-y-3">
        <ChoreMetadata
          definition={definition}
          occurrence={occurrence}
          participantsById={participantsById}
          presentation={presentation}
        />
      </div>
    </BaseCard>
  );
}

export function ChoreListItem({
  definition,
  occurrence,
  participantsById,
  presentation,
  action,
  now = new Date(),
}: {
  definition: ChoreDefinition;
  occurrence: ChoreOccurrence;
  participantsById: Record<string, ChoreParticipant>;
  presentation?: ChorePresentationMetadata;
  action?: ChoreCardAction;
  now?: Date;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const status = statusDetails(occurrence, now, t);
  const ChoreIcon = resolveChoreIconComponent(presentation?.icon);

  return (
    <Panel as="article" muted className="flex min-h-16 flex-col p-3">
      <div className="flex items-start gap-3">
        <EntityCardHeaderIcon
          IconComponent={ChoreIcon}
          isActive={occurrence.status !== 'done'}
          size="small"
          tone={status.tone === 'danger' ? 'red' : status.tone === 'warning' ? 'amber' : 'neutral'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn('truncate text-xs font-semibold leading-[18px]', surface.textPrimary)}
            >
              {definition.title}
            </h3>
            <Badge size="small" tone={status.tone}>
              {status.label}
            </Badge>
          </div>
          <div className="mt-1">
            <ChoreMetadata
              definition={definition}
              occurrence={occurrence}
              participantsById={participantsById}
              presentation={presentation}
            />
          </div>
        </div>
        {presentation?.points ? <ChorePointsToken points={presentation.points} /> : null}
      </div>
      {action ? (
        <footer className="mt-auto border-t border-current/10 pt-3">
          <Button
            size="compact"
            variant="secondary"
            className="w-full justify-center"
            onClick={action.onSelect}
          >
            {action.label}
          </Button>
        </footer>
      ) : null}
    </Panel>
  );
}

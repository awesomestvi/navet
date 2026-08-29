import { DashboardEmptyState } from '@navet/app/components/patterns';
import { Badge, Button } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  getThemeFocusRingClassName,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@navet/app/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { cn } from '@navet/app/components/ui/utils';
import { isEmojiLightIcon, resolveLightIconComponent } from '@navet/app/constants/icon-map';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { normalizeChoreExperienceState } from '@navet/core/chore-experience';
import type {
  ChoreOccurrence,
  ChoreParticipant,
  ChoreWorkspaceAction,
  ChoreWorkspaceData,
} from '@navet/core/chores';
import { CalendarCheck, ChevronDown, Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getChoreCardAction } from '../chore-card-action';
import {
  getDefinition,
  getHousePulse,
  getMissionProgressList,
  getRewardProgressList,
  getTodayChoresForParticipant,
} from '../chore-dashboard-selectors';
import { ChoreFocusCard } from './chore-card';
import { ChoreDashboardGrid } from './chore-dashboard-grid';
import { HousePulse, MissionCard, RewardGoalCard } from './chore-support-cards';

function SectionHeading({ id, title, count }: { id?: string; title: string; count?: number }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <div
      className="mb-2 flex min-h-8 items-center gap-3 md:mb-3 md:min-h-10 lg:landscape:mb-2 lg:landscape:min-h-8 xl:mb-3 xl:min-h-10"
      data-chore-section-heading="true"
    >
      <h2 id={id} className={cn(navetTypographyTokens.sectionHeading, surface.textPrimary)}>
        {title}
      </h2>
      {count !== undefined ? (
        <Badge size="small" tone="neutral" className="shrink-0">
          <span data-chore-section-count="true">{count}</span>
        </Badge>
      ) : null}
      <div className={cn('h-px flex-1', surface.borderStrong)} />
    </div>
  );
}

function getParticipantInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function ParticipantAvatar({
  participant,
  className,
}: {
  participant?: ChoreParticipant;
  className?: string;
}) {
  const { accentColor } = useTheme();
  const AvatarIcon = participant?.avatarIcon
    ? resolveLightIconComponent(participant.avatarIcon)
    : null;
  return (
    <Avatar
      className={cn('h-8 w-8', className)}
      style={{ backgroundColor: participant?.color ?? accentColor }}
      aria-hidden="true"
    >
      {participant?.avatarUrl ? <AvatarImage src={participant.avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
        {participant ? (
          AvatarIcon ? (
            <AvatarIcon aria-hidden="true" className="h-4 w-4" />
          ) : participant.avatarIcon && isEmojiLightIcon(participant.avatarIcon) ? (
            <span aria-hidden="true">{participant.avatarIcon.trim()}</span>
          ) : (
            getParticipantInitials(participant.displayName)
          )
        ) : (
          <Users className="h-4 w-4" />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

function ParticipantPicker({
  participants,
  selectedParticipantId,
  onSelectedParticipantChange,
}: {
  participants: ChoreParticipant[];
  selectedParticipantId: string;
  onSelectedParticipantChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const selectedParticipant = participants.find((item) => item.id === selectedParticipantId);
  const selectedLabel = selectedParticipant?.displayName ?? t('household.personPicker.all');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-chore-toolbar-control="participant-picker"
          className={cn(
            'flex h-9 shrink-0 items-center gap-1.5 rounded-full border p-1 pr-1.5 transition-colors sm:pr-2.5',
            surface.inputBg,
            surface.border,
            surface.hoverBg,
            surface.textPrimary,
            getThemeFocusRingClassName(theme)
          )}
          aria-label={t('household.personPicker.label')}
        >
          <ParticipantAvatar participant={selectedParticipant} className="h-7 w-7" />
          <span className="max-w-20 truncate text-xs font-semibold sm:max-w-32">
            {selectedLabel}
          </span>
          <ChevronDown className={cn('h-3.5 w-3.5', surface.textSecondary)} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="w-60 !animate-none"
      >
        <DropdownMenuLabel>{t('household.personPicker.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={selectedParticipantId}
          onValueChange={onSelectedParticipantChange}
        >
          <DropdownMenuRadioItem value="all">
            <ParticipantAvatar />
            <span className="min-w-0 flex-1 truncate">{t('household.personPicker.all')}</span>
          </DropdownMenuRadioItem>
          {participants.map((participant) => (
            <DropdownMenuRadioItem key={participant.id} value={participant.id}>
              <ParticipantAvatar participant={participant} />
              <span className="min-w-0 flex-1 truncate">{participant.displayName}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChoreTodayView({
  data,
  participants,
  selectedParticipantId,
  onSelectedParticipantChange,
  execute,
  onAddChore,
}: {
  data: ChoreWorkspaceData;
  participants: ChoreParticipant[];
  selectedParticipantId: string;
  onSelectedParticipantChange: (id: string) => void;
  execute: (action: ChoreWorkspaceAction) => Promise<boolean>;
  onAddChore: () => void;
}) {
  const { t } = useI18n();
  const [rewardsVisible, setRewardsVisible] = useState(false);
  const breakpointCols = useBreakpointCols();
  const cardsPerRow = Math.max(1, Math.floor(breakpointCols / 2));
  const now = useMemo(() => new Date(), []);
  const experience = normalizeChoreExperienceState(data.experience);
  const occurrences = useMemo(
    () => getTodayChoresForParticipant(data, selectedParticipantId, now),
    [data, now, selectedParticipantId]
  );
  const active = occurrences.filter(
    (occurrence) => occurrence.status !== 'done' && occurrence.status !== 'skipped'
  );
  const completed = occurrences.filter((occurrence) => occurrence.status === 'done');
  const focus = active.slice(0, cardsPerRow);
  const remaining = active.slice(cardsPerRow);
  const pulse = useMemo(() => getHousePulse(data, now), [data, now]);
  const missions = useMemo(() => getMissionProgressList(data, now), [data, now]);
  const rewards = useMemo(() => getRewardProgressList(data), [data]);
  const activeMission =
    experience.gamificationMode !== 'off'
      ? (missions.find((mission) => mission.mission.status === 'active') ?? missions[0])
      : undefined;
  const rewardGoal = experience.gamificationMode !== 'off' ? rewards[0] : undefined;
  const hasRewardsSection = Boolean(activeMission || rewardGoal);
  const childMode = experience.gamificationMode === 'adventure';

  const renderChore = (occurrence: ChoreOccurrence, size: 'small' | 'medium' = 'medium') => {
    const definition = getDefinition(data, occurrence);
    if (!definition) return null;
    const action = getChoreCardAction(occurrence, definition, selectedParticipantId, execute, t);
    const storedPresentation = experience.presentationByDefinitionId[definition.id];
    const presentation =
      experience.gamificationMode === 'off' && storedPresentation
        ? { ...storedPresentation, points: undefined, childTitle: undefined }
        : storedPresentation;
    return (
      <ChoreFocusCard
        key={occurrence.id}
        size={size}
        definition={definition}
        occurrence={occurrence}
        participantsById={data.participantsById}
        presentation={presentation}
        action={action}
        childMode={childMode}
        now={now}
      />
    );
  };

  return (
    <div
      className="space-y-4 md:space-y-6 lg:landscape:space-y-4 xl:space-y-6"
      data-chore-today-layout="true"
    >
      <HousePulse
        pulse={pulse}
        showPoints={experience.gamificationMode !== 'off'}
        onSeeRewards={
          hasRewardsSection ? () => setRewardsVisible((visible) => !visible) : undefined
        }
        rewardsExpanded={rewardsVisible}
        headingLevel="h1"
        actions={
          <>
            <Button
              size="compact"
              variant="secondary"
              leading={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              data-chore-toolbar-control="add-chore"
              onClick={onAddChore}
            >
              {t('household.chores.add')}
            </Button>
            <ParticipantPicker
              participants={participants}
              selectedParticipantId={selectedParticipantId}
              onSelectedParticipantChange={onSelectedParticipantChange}
            />
          </>
        }
      />

      {hasRewardsSection && rewardsVisible ? (
        <section id="chores-rewards-section" aria-labelledby="chores-supporting-title">
          <SectionHeading
            id="chores-supporting-title"
            title={t('household.today.supporting')}
            count={Number(Boolean(activeMission)) + Number(Boolean(rewardGoal))}
          />
          <ChoreDashboardGrid>
            {activeMission ? <MissionCard progress={activeMission} /> : null}
            {rewardGoal ? <RewardGoalCard progress={rewardGoal} /> : null}
          </ChoreDashboardGrid>
        </section>
      ) : null}

      <div className="space-y-5">
        {focus.length === 0 ? (
          <DashboardEmptyState
            compact
            variant="inline"
            icon={CalendarCheck}
            title={t('household.today.emptyTitle')}
            description={t('household.today.emptyDescription')}
            actionLabel={
              Object.keys(data.definitionsById).length === 0 ? t('household.chores.add') : undefined
            }
            onAction={Object.keys(data.definitionsById).length === 0 ? onAddChore : undefined}
            actionIcon={Plus}
          />
        ) : (
          <section aria-labelledby="chores-focus-title">
            <SectionHeading
              id="chores-focus-title"
              title={t('household.focus.title')}
              count={active.length}
            />
            <ChoreDashboardGrid>
              {focus.map((occurrence) => renderChore(occurrence))}
            </ChoreDashboardGrid>
          </section>
        )}

        {remaining.length > 0 ? (
          <section aria-labelledby="chores-remaining-title">
            <SectionHeading
              id="chores-remaining-title"
              title={t('household.remaining.title')}
              count={remaining.length}
            />
            <ChoreDashboardGrid>{remaining.map((item) => renderChore(item))}</ChoreDashboardGrid>
          </section>
        ) : null}

        {completed.length > 0 ? (
          <section aria-labelledby="chores-done-title">
            <SectionHeading
              id="chores-done-title"
              title={t('household.today.done')}
              count={completed.length}
            />
            <ChoreDashboardGrid cardSize="small">
              {completed.map((item) => renderChore(item, 'small'))}
            </ChoreDashboardGrid>
          </section>
        ) : null}
      </div>
    </div>
  );
}

import { DashboardEmptyState, NavigationWorkspace } from '@navet/app/components/patterns';
import { Badge, BaseCard, Button, Input, Panel, Select } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@navet/app/components/ui/avatar';
import { cn } from '@navet/app/components/ui/utils';
import { isEmojiLightIcon, resolveLightIconComponent } from '@navet/app/constants/icon-map';
import {
  SettingsEmbeddedSurface,
  SettingsSectionShell,
} from '@navet/app/features/settings/components/settings-section-shell';
import { getSettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import { useI18n, useMediaQuery, useTheme } from '@navet/app/hooks';
import {
  type ChoreMission,
  type ChoreRewardGoal,
  normalizeChoreExperienceState,
} from '@navet/core/chore-experience';
import {
  type ChoreDefinition,
  type ChoreParticipant,
  type ChoreWorkspaceData,
  getChoreExperiencePointBalances,
} from '@navet/core/chores';
import {
  Archive,
  ClipboardList,
  Copy,
  DatabaseBackup,
  Gift,
  HeartHandshake,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { getMissionProgressList, getRewardProgressList } from '../chore-dashboard-selectors';
import { ChoreDashboardGrid } from './chore-dashboard-grid';
import { resolveChoreIconComponent } from './chore-icon';
import { ChorePointsToken } from './chore-points-token';
import { MissionCard, RewardGoalCard } from './chore-support-cards';

function ViewHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>{title}</h1>
        <p className={cn('mt-1 max-w-2xl', navetTypographyTokens.body, surface.textSecondary)}>
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0 self-start sm:self-auto">{action}</div> : null}
    </header>
  );
}

function assignmentLabel(
  definition: ChoreDefinition,
  participants: Record<string, ChoreParticipant>,
  t: ReturnType<typeof useI18n>['t']
) {
  if (definition.assignment.mode === 'anyone') return t('household.assignment.anyone');
  if (definition.assignment.mode === 'everyone') return t('household.assignment.everyone');
  if (definition.assignment.mode === 'rotation') return t('household.assignment.rotation');
  return (
    participants[definition.assignment.participantIds[0] ?? '']?.displayName ??
    t('household.assignment.person')
  );
}

function participantInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function ProgressParticipantAvatar({ participant }: { participant: ChoreParticipant }) {
  const { accentColor } = useTheme();
  const AvatarIcon = participant.avatarIcon
    ? resolveLightIconComponent(participant.avatarIcon)
    : null;

  return (
    <Avatar
      className="h-8 w-8 shrink-0 border"
      style={{
        backgroundColor: participant.color ?? accentColor,
        borderColor: participant.color ?? accentColor,
      }}
      aria-hidden="true"
    >
      {participant.avatarUrl ? <AvatarImage src={participant.avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
        {AvatarIcon ? (
          <AvatarIcon className="h-3.5 w-3.5" aria-hidden="true" />
        ) : participant.avatarIcon && isEmojiLightIcon(participant.avatarIcon) ? (
          <span aria-hidden="true">{participant.avatarIcon.trim()}</span>
        ) : (
          participantInitials(participant.displayName)
        )}
      </AvatarFallback>
    </Avatar>
  );
}

export function AllChoresView({
  data,
  initialRoomId,
  onAdd,
  onEdit,
  onDuplicate,
  onToggleEnabled,
  onArchive,
  onRestore,
}: {
  data: ChoreWorkspaceData;
  initialRoomId?: string;
  onAdd: () => void;
  onEdit: (definition: ChoreDefinition) => void;
  onDuplicate: (definition: ChoreDefinition) => void;
  onToggleEnabled: (definition: ChoreDefinition) => void;
  onArchive: (definition: ChoreDefinition) => void;
  onRestore: (definition: ChoreDefinition) => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [query, setQuery] = useState('');
  const [room, setRoom] = useState('all');
  const [person, setPerson] = useState('all');
  const [recurrence, setRecurrence] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  useEffect(() => {
    if (initialRoomId) setRoom(initialRoomId);
  }, [initialRoomId]);
  const experience = normalizeChoreExperienceState(data.experience);
  const roomOptions = [
    ...new Map(
      Object.values(data.definitionsById).flatMap((definition) =>
        definition.roomRef
          ? [[definition.roomRef.canonicalId, definition.roomRef.label] as const]
          : []
      )
    ).entries(),
  ];
  const definitions = Object.values(data.definitionsById)
    .filter((definition) => !definition.archivedAt)
    .filter(
      (definition) =>
        statusFilter === 'all' ||
        (statusFilter === 'active' && definition.enabled) ||
        (statusFilter === 'paused' && !definition.enabled)
    )
    .filter(
      (definition) =>
        !query.trim() ||
        [definition.title, definition.description, definition.roomRef?.label]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    )
    .filter((definition) => room === 'all' || definition.roomRef?.canonicalId === room)
    .filter(
      (definition) => person === 'all' || definition.assignment.participantIds.includes(person)
    )
    .filter((definition) => recurrence === 'all' || definition.schedule.frequency === recurrence)
    .sort((left, right) => left.title.localeCompare(right.title));
  const archivedDefinitions = Object.values(data.definitionsById)
    .filter((definition) => Boolean(definition.archivedAt))
    .sort((left, right) => left.title.localeCompare(right.title));

  return (
    <div>
      <ViewHeader
        title={t('household.chores.title')}
        description={t('household.chores.description')}
        action={
          <Button size="small" leading={<Plus className="h-4 w-4" />} onClick={onAdd}>
            {t('household.chores.add')}
          </Button>
        }
      />
      <Panel
        muted
        className="mb-4 grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_repeat(4,minmax(8rem,0.4fr))]"
      >
        <Input
          type="search"
          size="small"
          aria-label={t('household.chores.search')}
          placeholder={t('household.chores.search')}
          leading={<Search className="h-4 w-4" aria-hidden="true" />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          size="small"
          aria-label={t('household.filters.room')}
          value={room}
          onChange={(event) => setRoom(event.target.value)}
        >
          <option value="all">{t('household.filters.allRooms')}</option>
          {roomOptions.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          size="small"
          aria-label={t('household.filters.person')}
          value={person}
          onChange={(event) => setPerson(event.target.value)}
        >
          <option value="all">{t('household.personPicker.all')}</option>
          {Object.values(data.participantsById).map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.displayName}
            </option>
          ))}
        </Select>
        <Select
          size="small"
          aria-label={t('household.filters.recurrence')}
          value={recurrence}
          onChange={(event) => setRecurrence(event.target.value)}
        >
          <option value="all">{t('household.filters.allSchedules')}</option>
          <option value="once">{t('household.schedule.once')}</option>
          <option value="daily">{t('household.schedule.daily')}</option>
          <option value="weekly">{t('household.schedule.weekly')}</option>
          <option value="monthly">{t('household.schedule.monthly')}</option>
          <option value="after_completion">{t('household.schedule.afterCompletion')}</option>
        </Select>
        <Select
          size="small"
          aria-label={t('household.filters.status')}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">{t('household.filters.allStatuses')}</option>
          <option value="active">{t('household.chores.active')}</option>
          <option value="paused">{t('household.chores.paused')}</option>
          <option value="archived">{t('household.chores.archived')}</option>
        </Select>
      </Panel>
      {statusFilter === 'archived' ? null : definitions.length === 0 ? (
        <DashboardEmptyState
          compact
          variant="inline"
          icon={ClipboardList}
          title={query ? t('household.chores.noResults') : t('household.chores.empty')}
          description={
            query ? t('household.filters.tryAgain') : t('household.today.emptyDescription')
          }
          actionLabel={!query ? t('household.chores.add') : undefined}
          onAction={!query ? onAdd : undefined}
          actionIcon={Plus}
        />
      ) : (
        <ChoreDashboardGrid>
          {definitions.map((definition) => {
            const presentation = experience.presentationByDefinitionId[definition.id];
            const ChoreIcon = resolveChoreIconComponent(presentation?.icon);
            return (
              <Panel as="article" muted key={definition.id} className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <EntityCardHeaderIcon
                    IconComponent={ChoreIcon}
                    isActive={definition.enabled}
                    size="small"
                    tone="primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={cn('text-xs font-semibold leading-[18px]', surface.textPrimary)}
                      >
                        {definition.title}
                      </h2>
                      {!definition.enabled ? (
                        <Badge size="small">{t('household.chores.paused')}</Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className={cn('text-[11px] leading-[14px]', surface.textSecondary)}>
                        {[
                          definition.roomRef?.label,
                          assignmentLabel(definition, data.participantsById, t),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <Badge size="small">
                        {definition.schedule.frequency === 'once'
                          ? t('household.schedule.once')
                          : definition.schedule.frequency === 'daily'
                            ? t('household.schedule.daily')
                            : definition.schedule.frequency === 'weekly'
                              ? t('household.schedule.weekly')
                              : definition.schedule.frequency === 'monthly'
                                ? t('household.schedule.monthly')
                                : t('household.schedule.afterCompletion')}
                      </Badge>
                      {presentation?.estimatedMinutes ? (
                        <Badge size="small">
                          {t('household.card.minutes', { count: presentation.estimatedMinutes })}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {presentation?.points ? <ChorePointsToken points={presentation.points} /> : null}
                </div>
                <footer className="mt-auto grid grid-cols-2 gap-2 border-t border-current/10 pt-3 sm:flex sm:flex-nowrap sm:items-center sm:justify-start">
                  <Button
                    size="compact"
                    variant="secondary"
                    className="min-h-10 w-full sm:w-auto"
                    leading={<Pencil className="h-4 w-4 min-h-4 min-w-4 shrink-0" />}
                    onClick={() => onEdit(definition)}
                  >
                    {t('household.actions.edit')}
                  </Button>
                  <Button
                    size="compact"
                    variant="secondary"
                    className="min-h-10 w-full sm:w-auto"
                    leading={<Copy className="h-4 w-4 min-h-4 min-w-4 shrink-0 stroke-[2.25]" />}
                    onClick={() => onDuplicate(definition)}
                  >
                    {t('household.actions.duplicate')}
                  </Button>
                  <Button
                    size="compact"
                    variant="secondary"
                    className="min-h-10 w-full sm:w-auto"
                    leading={
                      definition.enabled ? (
                        <Pause className="h-4 w-4 min-h-4 min-w-4 shrink-0" />
                      ) : (
                        <Play className="h-4 w-4 min-h-4 min-w-4 shrink-0" />
                      )
                    }
                    onClick={() => onToggleEnabled(definition)}
                  >
                    {definition.enabled
                      ? t('household.chores.pause')
                      : t('household.chores.resume')}
                  </Button>
                  <Button
                    size="compact"
                    variant="secondary"
                    className="min-h-10 w-full sm:w-auto"
                    leading={<Archive className="h-4 w-4 min-h-4 min-w-4 shrink-0" />}
                    onClick={() => onArchive(definition)}
                  >
                    {t('household.chores.archive')}
                  </Button>
                </footer>
              </Panel>
            );
          })}
        </ChoreDashboardGrid>
      )}
      {archivedDefinitions.length > 0 && (statusFilter === 'all' || statusFilter === 'archived') ? (
        <details className="group mt-5" open={statusFilter === 'archived' || undefined}>
          <summary
            className={cn(
              'flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden',
              surface.textSecondary
            )}
          >
            {t('household.chores.archived')} · {archivedDefinitions.length}
          </summary>
          <div className="mt-2 grid gap-2">
            {archivedDefinitions.map((definition) => (
              <Panel
                key={definition.id}
                muted
                className="flex min-h-14 items-center gap-3 px-4 py-2"
              >
                <span
                  className={cn('min-w-0 flex-1 truncate text-sm font-medium', surface.textPrimary)}
                >
                  {definition.title}
                </span>
                <Button
                  size="compact"
                  variant="ghost"
                  className="min-h-10"
                  leading={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => onRestore(definition)}
                >
                  {t('household.chores.restore')}
                </Button>
              </Panel>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function MissionsView({
  data,
  onAdd,
  onEdit,
  onDelete,
}: {
  data: ChoreWorkspaceData;
  onAdd: () => void;
  onEdit: (mission: ChoreMission) => void;
  onDelete: (mission: ChoreMission) => void;
}) {
  const { t } = useI18n();
  const missions = getMissionProgressList(data);
  return (
    <div>
      <ViewHeader
        title={t('household.missions.title')}
        description={t('household.missions.description')}
        action={
          <Button size="small" leading={<Plus className="h-4 w-4" />} onClick={onAdd}>
            {t('household.missions.add')}
          </Button>
        }
      />
      {missions.length === 0 ? (
        <DashboardEmptyState
          compact
          variant="inline"
          icon={HeartHandshake}
          title={t('household.missions.emptyTitle')}
          description={t('household.missions.emptyDescription')}
          actionLabel={t('household.missions.add')}
          onAction={onAdd}
          actionIcon={Plus}
        />
      ) : (
        <ChoreDashboardGrid>
          {missions.map((progress) => (
            <MissionCard
              key={progress.mission.id}
              progress={progress}
              footer={
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="compact"
                    variant="secondary"
                    className="min-h-10 w-full"
                    leading={<Pencil className="h-4 w-4" />}
                    aria-label={t('household.missions.editNamed', { name: progress.mission.title })}
                    onClick={() => onEdit(progress.mission)}
                  >
                    {t('household.actions.edit')}
                  </Button>
                  <Button
                    size="compact"
                    variant="destructive"
                    className="min-h-10 w-full"
                    leading={<Trash2 className="h-4 w-4" />}
                    aria-label={t('household.missions.deleteNamed', {
                      name: progress.mission.title,
                    })}
                    onClick={() => onDelete(progress.mission)}
                  >
                    {t('household.chores.delete')}
                  </Button>
                </div>
              }
            />
          ))}
        </ChoreDashboardGrid>
      )}
    </div>
  );
}

export function RewardsView({
  data,
  onAdd,
  onEdit,
  onDelete,
}: {
  data: ChoreWorkspaceData;
  onAdd: () => void;
  onEdit: (reward: ChoreRewardGoal) => void;
  onDelete: (reward: ChoreRewardGoal) => void;
}) {
  const { t } = useI18n();
  const rewards = getRewardProgressList(data);
  return (
    <div>
      <ViewHeader
        title={t('household.rewards.title')}
        description={t('household.rewards.description')}
        action={
          <Button size="small" leading={<Plus className="h-4 w-4" />} onClick={onAdd}>
            {t('household.rewards.add')}
          </Button>
        }
      />
      {rewards.length === 0 ? (
        <DashboardEmptyState
          compact
          variant="inline"
          icon={Gift}
          title={t('household.rewards.emptyTitle')}
          description={t('household.rewards.emptyDescription')}
          actionLabel={t('household.rewards.add')}
          onAction={onAdd}
          actionIcon={Plus}
        />
      ) : (
        <ChoreDashboardGrid>
          {rewards.map((progress) => (
            <RewardGoalCard
              key={progress.goal.id}
              progress={progress}
              footer={
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="compact"
                    variant="secondary"
                    className="min-h-10 w-full"
                    leading={<Pencil className="h-4 w-4" />}
                    aria-label={t('household.rewards.editNamed', { name: progress.goal.title })}
                    onClick={() => onEdit(progress.goal)}
                  >
                    {t('household.actions.edit')}
                  </Button>
                  <Button
                    size="compact"
                    variant="destructive"
                    className="min-h-10 w-full"
                    leading={<Trash2 className="h-4 w-4" />}
                    aria-label={t('household.rewards.deleteNamed', { name: progress.goal.title })}
                    onClick={() => onDelete(progress.goal)}
                  >
                    {t('household.chores.delete')}
                  </Button>
                </div>
              }
            />
          ))}
        </ChoreDashboardGrid>
      )}
    </div>
  );
}

export function ProgressView({
  data,
  onEditPerson,
}: {
  data: ChoreWorkspaceData;
  onEditPerson: (participant: ChoreParticipant) => void;
}) {
  const { t } = useI18n();
  const gamificationEnabled =
    normalizeChoreExperienceState(data.experience).gamificationMode !== 'off';
  const completed = Object.values(data.occurrencesById).filter(
    (occurrence) => occurrence.status === 'done'
  );
  const balances = getChoreExperiencePointBalances(data);
  const people = Object.values(data.participantsById).map((participant) => {
    const completions = completed.filter(
      (occurrence) => occurrence.completedBy === participant.id
    ).length;
    return {
      participant,
      completions,
      points: balances[participant.id] ?? 0,
    };
  });
  return (
    <div>
      <ViewHeader
        title={t('household.progress.title')}
        description={t('household.progress.description')}
      />
      <ChoreDashboardGrid>
        {people.map(({ participant, completions, points }) => (
          <BaseCard
            key={participant.id}
            size="medium"
            surfaceVariant="muted"
            title={participant.displayName}
            subtitle={t('household.progress.completedCount', { count: completions })}
            headerLayout="title-first"
            headerLeading={<ProgressParticipantAvatar participant={participant} />}
            headerTrailing={
              gamificationEnabled ? <ChorePointsToken points={points} showPlus={false} /> : null
            }
            footer={
              <Button
                size="compact"
                variant="secondary"
                className="min-h-10 w-full"
                leading={<Pencil className="h-4 w-4" />}
                onClick={() => onEditPerson(participant)}
              >
                {t('household.actions.edit')}
              </Button>
            }
            footerClassName="border-t border-current/10 pt-3"
          >
            <span aria-hidden="true" />
          </BaseCard>
        ))}
      </ChoreDashboardGrid>
    </div>
  );
}

export function ChoreSettingsView({
  data,
  onModeChange,
  onAddPerson,
  onEditPerson,
  recoveryContent,
}: {
  data: ChoreWorkspaceData;
  onModeChange: (mode: 'off' | 'light' | 'family' | 'adventure') => void;
  onAddPerson: () => void;
  onEditPerson: (participant: ChoreParticipant) => void;
  recoveryContent?: ReactNode;
}) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const styles = getSettingsSectionStyles(theme, primaryColor);
  const experience = normalizeChoreExperienceState(data.experience);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [activeSection, setActiveSection] = useState<'motivation' | 'people' | 'recovery'>(
    'motivation'
  );
  const sections = [
    {
      id: 'motivation' as const,
      icon: Sparkles,
      label: t('household.settings.gamification'),
    },
    { id: 'people' as const, icon: Users, label: t('household.members.title') },
    { id: 'recovery' as const, icon: DatabaseBackup, label: t('household.data.title') },
  ];
  const activeSectionMeta = sections.find((section) => section.id === activeSection) ?? sections[0];
  const motivationExample = {
    off: t('household.settings.mode.offDescription'),
    light: t('household.settings.mode.lightDescription'),
    family: t('household.settings.mode.familyDescription'),
    adventure: t('household.settings.mode.adventureDescription'),
  }[experience.gamificationMode];

  const sectionContent =
    activeSection === 'motivation' ? (
      <SettingsEmbeddedSurface>
        <SettingsSectionShell
          id="household-motivation"
          icon={Sparkles}
          title={t('household.settings.gamification')}
          description={t('household.settings.gamificationDescription')}
          styles={styles}
        >
          <div className="p-4 md:p-5">
            <Select
              aria-label={t('household.settings.gamification')}
              value={experience.gamificationMode}
              onChange={(event) =>
                onModeChange(event.target.value as 'off' | 'light' | 'family' | 'adventure')
              }
            >
              <option value="off">{t('household.settings.mode.off')}</option>
              <option value="light">{t('household.settings.mode.light')}</option>
              <option value="family">{t('household.settings.mode.family')}</option>
              <option value="adventure">{t('household.settings.mode.adventure')}</option>
            </Select>
            <p
              key={experience.gamificationMode}
              className={cn('mt-3 text-sm leading-5', styles.subtleColor)}
              aria-live="polite"
            >
              {motivationExample}
            </p>
          </div>
        </SettingsSectionShell>
      </SettingsEmbeddedSurface>
    ) : activeSection === 'people' ? (
      <SettingsEmbeddedSurface>
        <SettingsSectionShell
          id="household-people"
          icon={Users}
          title={t('household.members.title')}
          description={t('household.members.description')}
          styles={styles}
        >
          <div className="flex justify-end px-4 py-3 md:px-5">
            <Button
              size="compact"
              variant="secondary"
              className="min-h-10"
              leading={<Plus className="h-4 w-4 shrink-0" />}
              onClick={onAddPerson}
            >
              {t('household.people.add')}
            </Button>
          </div>
          <div className={`divide-y ${styles.dividerColor}`}>
            {Object.values(data.participantsById).map((participant) => (
              <div
                key={participant.id}
                className="flex min-h-15 items-center gap-3 px-4 py-2.5 md:px-5"
              >
                <ProgressParticipantAvatar participant={participant} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${styles.textColor}`}>
                    {participant.displayName}
                  </p>
                  <p className={`mt-0.5 truncate text-xs ${styles.subtleColor}`}>
                    {participant.capabilities.includes('manage')
                      ? t('household.personDialog.manager')
                      : t('household.personDialog.member')}
                  </p>
                </div>
                <Button
                  size="compact"
                  variant="ghost"
                  className="min-h-10 shrink-0"
                  onClick={() => onEditPerson(participant)}
                >
                  {t('household.actions.edit')}
                </Button>
              </div>
            ))}
          </div>
        </SettingsSectionShell>
      </SettingsEmbeddedSurface>
    ) : (
      <SettingsEmbeddedSurface>
        <SettingsSectionShell
          id="household-recovery"
          icon={DatabaseBackup}
          title={t('household.data.title')}
          description={t('household.data.description')}
          styles={styles}
        >
          <div className="p-4 md:p-5">{recoveryContent}</div>
        </SettingsSectionShell>
      </SettingsEmbeddedSurface>
    );

  return (
    <NavigationWorkspace.Frame
      aria-label={t('household.settings.title')}
      className="mx-auto h-[min(72dvh,46rem)] min-h-[34rem] max-w-6xl"
      data-chore-settings-workspace
    >
      <NavigationWorkspace.Header className="px-5 py-4 md:px-6">
        <h1 className={cn(navetTypographyTokens.pageHeading, styles.textColor)}>
          {t('household.settings.title')}
        </h1>
      </NavigationWorkspace.Header>

      <NavigationWorkspace.Body className={isMobile ? '' : 'grid-cols-[16rem_minmax(0,1fr)]'}>
        {!isMobile ? (
          <NavigationWorkspace.Sidebar>
            <nav aria-label={t('household.settings.title')} className="grid gap-1 px-3 py-4">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <NavigationWorkspace.Item
                    key={section.id}
                    active={activeSection === section.id}
                    accentColor={styles.accentColor}
                  >
                    <NavigationWorkspace.ItemButton
                      aria-current={activeSection === section.id ? 'page' : undefined}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <NavigationWorkspace.ItemIcon>
                        <Icon className={navetIconSizeTokens.sm} />
                      </NavigationWorkspace.ItemIcon>
                      <NavigationWorkspace.ItemText title={section.label} />
                    </NavigationWorkspace.ItemButton>
                  </NavigationWorkspace.Item>
                );
              })}
            </nav>
          </NavigationWorkspace.Sidebar>
        ) : null}

        <NavigationWorkspace.Content aria-label={activeSectionMeta.label}>
          {isMobile ? (
            <nav
              aria-label={t('household.settings.title')}
              className={cn('flex gap-2 overflow-x-auto border-b px-3 py-3', styles.borderColor)}
            >
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Button
                    key={section.id}
                    size="compact"
                    variant={activeSection === section.id ? 'primary' : 'secondary'}
                    className="min-h-10 shrink-0"
                    leading={<Icon className={navetIconSizeTokens.sm} />}
                    onClick={() => setActiveSection(section.id)}
                  >
                    {section.label}
                  </Button>
                );
              })}
            </nav>
          ) : null}
          <NavigationWorkspace.ScrollArea>{sectionContent}</NavigationWorkspace.ScrollArea>
        </NavigationWorkspace.Content>
      </NavigationWorkspace.Body>
    </NavigationWorkspace.Frame>
  );
}

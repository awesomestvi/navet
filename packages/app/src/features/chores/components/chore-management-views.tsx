import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
  DashboardEmptyState,
  NavigationWorkspace,
} from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  Input,
  Panel,
  Select,
  SheetSurface,
  SheetSurfaceHeader,
  Textarea,
} from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@navet/app/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { cn } from '@navet/app/components/ui/utils';
import { isEmojiLightIcon, resolveLightIconComponent } from '@navet/app/constants/icon-map';
import {
  SettingsEmbeddedSurface,
  SettingsItem,
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
  Clock3,
  Copy,
  DatabaseBackup,
  Gift,
  HeartHandshake,
  ListFilter,
  Minus,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  getMissionProgressList,
  getParticipantPointHistory,
  getRewardProgressList,
} from '../chore-dashboard-selectors';
import { ChoreBaseCard } from './chore-base-card';
import { ChoreDashboardGrid } from './chore-dashboard-grid';
import { resolveChoreIconComponent } from './chore-icon';
import { ChorePointsToken } from './chore-points-token';
import { MissionCard, RewardGoalCard } from './chore-support-cards';

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

function choreScheduleLabel(definition: ChoreDefinition, t: ReturnType<typeof useI18n>['t']) {
  if (definition.schedule.frequency === 'once') return t('household.schedule.once');
  if (definition.schedule.frequency === 'daily') return t('household.schedule.daily');
  if (definition.schedule.frequency === 'weekly') {
    if (definition.schedule.intervalWeeks === 2) return t('household.schedule.biweekly');
    if (definition.schedule.intervalWeeks === 3) return t('household.schedule.triweekly');
    if (definition.schedule.intervalWeeks === 4) return t('household.schedule.fourWeekly');
    return t('household.schedule.weekly');
  }
  if (definition.schedule.frequency === 'monthly') return t('household.schedule.monthly');
  return t('household.schedule.afterCompletion');
}

function LibraryAssignmentSummary({
  definition,
  participants,
}: {
  definition: ChoreDefinition;
  participants: Record<string, ChoreParticipant>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const assignedParticipants = definition.assignment.participantIds
    .map((id) => participants[id])
    .filter((participant): participant is ChoreParticipant => Boolean(participant));

  return (
    <div className="flex min-w-0 items-center gap-2">
      {assignedParticipants.length > 0 ? (
        <div className="flex shrink-0 -space-x-2" aria-hidden="true">
          {assignedParticipants.slice(0, 3).map((participant) => (
            <ProgressParticipantAvatar key={participant.id} participant={participant} />
          ))}
        </div>
      ) : (
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/10 bg-current/[0.08]',
            surface.textSecondary
          )}
          aria-hidden="true"
        >
          <Users className="h-3.5 w-3.5" />
        </span>
      )}
      <span className={cn('min-w-0 truncate text-sm font-semibold', surface.textPrimary)}>
        {assignmentLabel(definition, participants, t)}
      </span>
    </div>
  );
}

function ChoreFilterFields({
  room,
  onRoomChange,
  roomOptions,
  person,
  onPersonChange,
  participants,
  recurrence,
  onRecurrenceChange,
  status,
  onStatusChange,
}: {
  room: string;
  onRoomChange: (value: string) => void;
  roomOptions: ReadonlyArray<readonly [string, string]>;
  person: string;
  onPersonChange: (value: string) => void;
  participants: Record<string, ChoreParticipant>;
  recurrence: string;
  onRecurrenceChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <Select
        size="small"
        aria-label={t('household.filters.room')}
        value={room}
        onChange={(event) => onRoomChange(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
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
        onChange={(event) => onPersonChange(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <option value="all">{t('household.personPicker.all')}</option>
        {Object.values(participants).map((participant) => (
          <option key={participant.id} value={participant.id}>
            {participant.displayName}
          </option>
        ))}
      </Select>
      <Select
        size="small"
        aria-label={t('household.filters.recurrence')}
        value={recurrence}
        onChange={(event) => onRecurrenceChange(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
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
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <option value="all">{t('household.filters.allStatuses')}</option>
        <option value="active">{t('household.chores.active')}</option>
        <option value="paused">{t('household.chores.paused')}</option>
        <option value="archived">{t('household.chores.archived')}</option>
      </Select>
    </>
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
  const activeFilterCount =
    Number(room !== 'all') +
    Number(person !== 'all') +
    Number(recurrence !== 'all') +
    Number(statusFilter !== 'all');

  return (
    <div>
      <section
        aria-label={t('household.chores.title')}
        className="mb-4 flex min-w-0 items-center gap-2"
      >
        <Input
          type="search"
          size="small"
          aria-label={t('household.chores.search')}
          placeholder={t('household.chores.search')}
          leading={<Search className="h-4 w-4" aria-hidden="true" />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          containerClassName="min-w-0 flex-1 sm:max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="small"
              variant="secondary"
              className="relative h-9 w-9 shrink-0 justify-center p-0"
              aria-label={t('dashboard.addCard.filter.label')}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              {activeFilterCount > 0 ? (
                <span
                  data-active-filter-count="true"
                  className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none"
                  style={{
                    backgroundColor: theme === 'light' ? '#111827' : '#ffffff',
                    color: theme === 'light' ? '#ffffff' : '#111827',
                  }}
                >
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-80 max-w-[calc(100vw-2rem)] overflow-visible p-2"
          >
            <DropdownMenuLabel className="px-1 pt-1 pb-2 text-xs font-semibold">
              {t('dashboard.addCard.filter.label')}
            </DropdownMenuLabel>
            <div className="grid gap-2">
              <ChoreFilterFields
                room={room}
                onRoomChange={setRoom}
                roomOptions={roomOptions}
                person={person}
                onPersonChange={setPerson}
                participants={data.participantsById}
                recurrence={recurrence}
                onRecurrenceChange={setRecurrence}
                status={statusFilter}
                onStatusChange={setStatusFilter}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="small"
          className="shrink-0"
          leading={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={onAdd}
        >
          {t('household.chores.add')}
        </Button>
      </section>
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
            const scheduleLabel = choreScheduleLabel(definition, t);
            return (
              <ChoreBaseCard
                key={definition.id}
                title={definition.title}
                eyebrow={
                  <>
                    {definition.roomRef?.label ? (
                      <>
                        <span>{definition.roomRef.label}</span>
                        <span aria-hidden="true"> · </span>
                      </>
                    ) : null}
                    <span className={cn(!definition.enabled && 'text-amber-400')}>
                      {definition.enabled ? scheduleLabel : t('household.chores.paused')}
                    </span>
                  </>
                }
                leading={
                  <EntityCardHeaderIcon
                    IconComponent={ChoreIcon}
                    isActive={definition.enabled}
                    size="small"
                    tone="primary"
                  />
                }
                metrics={
                  <>
                    {presentation?.estimatedMinutes ? (
                      <span
                        className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-current/20 bg-current/[0.06] px-2 text-xs font-semibold tabular-nums"
                        title={t('household.card.minutes', {
                          count: presentation.estimatedMinutes,
                        })}
                      >
                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {t('household.card.compactMinutes', {
                            count: presentation.estimatedMinutes,
                          })}
                        </span>
                      </span>
                    ) : null}
                    {experience.gamificationMode !== 'off' && presentation?.points ? (
                      <ChorePointsToken points={presentation.points} />
                    ) : null}
                  </>
                }
                instructions={
                  definition.description ? (
                    <p className={cn('line-clamp-2 text-xs leading-5', surface.textSecondary)}>
                      {definition.description}
                    </p>
                  ) : undefined
                }
                footerLeading={
                  <LibraryAssignmentSummary
                    definition={definition}
                    participants={data.participantsById}
                  />
                }
                footerAction={
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="compact"
                      variant="secondary"
                      className="min-w-20 justify-center px-3"
                      leading={<Pencil className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => onEdit(definition)}
                    >
                      {t('household.actions.edit')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="compact"
                          variant="secondary"
                          className="h-9 w-9 justify-center p-0"
                          aria-label={t('common.moreActions')}
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={8}>
                        <DropdownMenuItem onSelect={() => onDuplicate(definition)}>
                          <Copy className="h-4 w-4 stroke-[2.25]" aria-hidden="true" />
                          {t('household.actions.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onToggleEnabled(definition)}>
                          {definition.enabled ? (
                            <Pause className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Play className="h-4 w-4" aria-hidden="true" />
                          )}
                          {definition.enabled
                            ? t('household.chores.pause')
                            : t('household.chores.resume')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onArchive(definition)}>
                          <Archive className="h-4 w-4" aria-hidden="true" />
                          {t('household.chores.archive')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                }
                surfaceVariant={definition.enabled ? 'default' : 'muted'}
                className={cn(!definition.enabled && 'opacity-75')}
              />
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
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ChoreMission['status']>('all');
  const allMissions = getMissionProgressList(data);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const missions = allMissions
    .filter(
      ({ mission }) =>
        !normalizedQuery ||
        [mission.title, mission.description]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
    )
    .filter(({ mission }) => statusFilter === 'all' || mission.status === statusFilter);
  return (
    <div>
      <section
        aria-label={t('household.missions.title')}
        className="mb-4 flex min-w-0 items-center gap-2"
      >
        <Input
          type="search"
          size="small"
          aria-label={t('household.filters.search')}
          placeholder={t('household.filters.search')}
          leading={<Search className="h-4 w-4" aria-hidden="true" />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          containerClassName="min-w-0 flex-1 sm:max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="small"
              variant="secondary"
              className="relative h-9 w-9 shrink-0 justify-center p-0"
              aria-label={t('dashboard.addCard.filter.label')}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              {statusFilter !== 'all' ? (
                <span
                  data-active-filter-count="true"
                  className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none"
                  style={{
                    backgroundColor: theme === 'light' ? '#111827' : '#ffffff',
                    color: theme === 'light' ? '#ffffff' : '#111827',
                  }}
                >
                  1
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-80 max-w-[calc(100vw-2rem)] overflow-visible p-2"
          >
            <DropdownMenuLabel className="px-1 pt-1 pb-2 text-xs font-semibold">
              {t('dashboard.addCard.filter.label')}
            </DropdownMenuLabel>
            <Select
              size="small"
              aria-label={t('household.filters.status')}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | ChoreMission['status'])
              }
            >
              <option value="all">{t('household.filters.allStatuses')}</option>
              <option value="active">{t('household.missions.active')}</option>
              <option value="upcoming">{t('household.missions.upcoming')}</option>
              <option value="complete">{t('household.missions.complete')}</option>
            </Select>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="small"
          className="shrink-0"
          leading={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={onAdd}
        >
          {t('household.missions.add')}
        </Button>
      </section>
      {missions.length === 0 ? (
        <DashboardEmptyState
          compact
          variant="inline"
          icon={HeartHandshake}
          title={t('household.missions.emptyTitle')}
          description={
            allMissions.length > 0
              ? t('household.filters.tryAgain')
              : t('household.missions.emptyDescription')
          }
          actionLabel={allMissions.length === 0 ? t('household.missions.add') : undefined}
          onAction={allMissions.length === 0 ? onAdd : undefined}
          actionIcon={Plus}
        />
      ) : (
        <ChoreDashboardGrid>
          {missions.map((progress) => (
            <MissionCard
              key={progress.mission.id}
              progress={progress}
              footer={
                <div className="flex items-center gap-1.5">
                  <Button
                    size="compact"
                    variant="secondary"
                    className="min-w-20 justify-center px-3"
                    leading={<Pencil className="h-4 w-4" />}
                    aria-label={t('household.missions.editNamed', { name: progress.mission.title })}
                    onClick={() => onEdit(progress.mission)}
                  >
                    {t('household.actions.edit')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="compact"
                        variant="secondary"
                        className="h-9 w-9 justify-center p-0"
                        aria-label={t('common.moreActions')}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8}>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDelete(progress.mission)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {t('household.chores.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ChoreRewardGoal['type']>('all');
  const allRewards = getRewardProgressList(data);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const rewards = allRewards
    .filter(
      ({ goal }) => !normalizedQuery || goal.title.toLocaleLowerCase().includes(normalizedQuery)
    )
    .filter(({ goal }) => typeFilter === 'all' || goal.type === typeFilter);
  return (
    <div>
      <section
        aria-label={t('household.rewards.title')}
        className="mb-4 flex min-w-0 items-center gap-2"
      >
        <Input
          type="search"
          size="small"
          aria-label={t('household.filters.search')}
          placeholder={t('household.filters.search')}
          leading={<Search className="h-4 w-4" aria-hidden="true" />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          containerClassName="min-w-0 flex-1 sm:max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="small"
              variant="secondary"
              className="relative h-9 w-9 shrink-0 justify-center p-0"
              aria-label={t('dashboard.addCard.filter.label')}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              {typeFilter !== 'all' ? (
                <span
                  data-active-filter-count="true"
                  className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none"
                  style={{
                    backgroundColor: theme === 'light' ? '#111827' : '#ffffff',
                    color: theme === 'light' ? '#ffffff' : '#111827',
                  }}
                >
                  1
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-80 max-w-[calc(100vw-2rem)] overflow-visible p-2"
          >
            <DropdownMenuLabel className="px-1 pt-1 pb-2 text-xs font-semibold">
              {t('dashboard.addCard.filter.label')}
            </DropdownMenuLabel>
            <Select
              size="small"
              aria-label={t('household.rewardDialog.type')}
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as 'all' | ChoreRewardGoal['type'])
              }
            >
              <option value="all">{t('household.rewards.allTypes')}</option>
              <option value="instant">{t('household.rewards.type.instant')}</option>
              <option value="saving">{t('household.rewards.type.saving')}</option>
              <option value="family">{t('household.rewards.type.family')}</option>
              <option value="experience">{t('household.rewards.type.experience')}</option>
            </Select>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="small"
          className="shrink-0"
          leading={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={onAdd}
        >
          {t('household.rewards.add')}
        </Button>
      </section>
      {rewards.length === 0 ? (
        <DashboardEmptyState
          compact
          variant="inline"
          icon={Gift}
          title={t('household.rewards.emptyTitle')}
          description={
            allRewards.length > 0
              ? t('household.filters.tryAgain')
              : t('household.rewards.emptyDescription')
          }
          actionLabel={allRewards.length === 0 ? t('household.rewards.add') : undefined}
          onAction={allRewards.length === 0 ? onAdd : undefined}
          actionIcon={Plus}
        />
      ) : (
        <ChoreDashboardGrid>
          {rewards.map((progress) => (
            <RewardGoalCard
              key={progress.goal.id}
              progress={progress}
              footer={
                <div className="flex items-center gap-1.5">
                  <Button
                    size="compact"
                    variant="secondary"
                    className="min-w-20 justify-center px-3"
                    leading={<Pencil className="h-4 w-4" />}
                    aria-label={t('household.rewards.editNamed', { name: progress.goal.title })}
                    onClick={() => onEdit(progress.goal)}
                  >
                    {t('household.actions.edit')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="compact"
                        variant="secondary"
                        className="h-9 w-9 justify-center p-0"
                        aria-label={t('common.moreActions')}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8}>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDelete(progress.goal)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {t('household.chores.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
  onAdjustPoints,
  requestManagementAccess,
}: {
  data: ChoreWorkspaceData;
  onAdjustPoints: (
    participant: ChoreParticipant,
    pointsDelta: number,
    reason: string
  ) => Promise<boolean>;
  requestManagementAccess: (action: () => void) => void;
}) {
  const { t } = useI18n();
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [pointAdjustment, setPointAdjustment] = useState<{
    participantId: string;
    direction: 'add' | 'remove';
  } | null>(null);
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
  const selectedParticipant = selectedParticipantId
    ? data.participantsById[selectedParticipantId]
    : undefined;
  const adjustmentParticipant = pointAdjustment
    ? data.participantsById[pointAdjustment.participantId]
    : undefined;
  const requestPointAdjustment = (participantId: string, direction: 'add' | 'remove') => {
    requestManagementAccess(() => setPointAdjustment({ participantId, direction }));
  };
  return (
    <>
      <ChoreDashboardGrid>
        {people.map(({ participant, completions, points }) => (
          <ChoreBaseCard
            key={participant.id}
            size="medium"
            surfaceVariant="muted"
            title={participant.displayName}
            eyebrow={t('household.progress.completedCount', { count: completions })}
            leading={<ProgressParticipantAvatar participant={participant} />}
            metrics={
              gamificationEnabled ? <ChorePointsToken points={points} showPlus={false} /> : null
            }
            footerLeading={
              gamificationEnabled ? (
                <div className="flex items-center gap-1.5" data-point-adjustment-control="true">
                  <Button
                    iconOnly
                    label={t('household.points.addFor', {
                      name: participant.displayName,
                    })}
                    size="compact"
                    variant="secondary"
                    onClick={() => requestPointAdjustment(participant.id, 'add')}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    iconOnly
                    label={t('household.points.removeFor', {
                      name: participant.displayName,
                    })}
                    size="compact"
                    variant="secondary"
                    onClick={() => requestPointAdjustment(participant.id, 'remove')}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : null
            }
            footerAction={
              <Button
                size="compact"
                variant="secondary"
                className="min-w-20 justify-center px-3"
                leading={<Clock3 className="h-4 w-4" />}
                onClick={() => setSelectedParticipantId(participant.id)}
              >
                {t('household.points.view')}
              </Button>
            }
          />
        ))}
      </ChoreDashboardGrid>
      {selectedParticipant ? (
        <ParticipantPointsSheet
          data={data}
          participant={selectedParticipant}
          isOpen
          onOpenChange={(open) => {
            if (!open) setSelectedParticipantId(null);
          }}
        />
      ) : null}
      {adjustmentParticipant && pointAdjustment ? (
        <PointAdjustmentDialog
          isOpen
          participant={adjustmentParticipant}
          direction={pointAdjustment.direction}
          currentBalance={getChoreExperiencePointBalances(data)[adjustmentParticipant.id] ?? 0}
          onOpenChange={(open) => {
            if (!open) setPointAdjustment(null);
          }}
          onSave={(pointsDelta, reason) =>
            onAdjustPoints(adjustmentParticipant, pointsDelta, reason)
          }
        />
      ) : null}
    </>
  );
}

function ParticipantPointsSheet({
  data,
  participant,
  isOpen,
  onOpenChange,
}: {
  data: ChoreWorkspaceData;
  participant: ChoreParticipant;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const { accentColor, theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const history = useMemo(
    () => getParticipantPointHistory(data, participant.id),
    [data, participant.id]
  );
  const completedCount = Object.values(data.occurrencesById).filter(
    (occurrence) => occurrence.status === 'done' && occurrence.completedBy === participant.id
  ).length;
  return (
    <SheetSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('household.points.title', { name: participant.displayName })}
      description={t('household.points.description')}
      closeLabel={t('household.points.close')}
      accentColor={participant.color ?? accentColor}
      responsive
      contentClassName="sm:max-w-lg"
      bodyClassName="pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <SheetSurfaceHeader
        title={participant.displayName}
        description={t('household.points.description')}
        closeLabel={t('household.points.close')}
        onClose={() => onOpenChange(false)}
        className={cn('border-b', surface.border)}
      />
      <div className="px-4 pt-4 sm:px-5">
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl border p-4',
            surface.border,
            surface.subtleBg
          )}
        >
          <ProgressParticipantAvatar participant={participant} />
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-semibold', surface.textPrimary)}>
              {t('household.points.currentBalance')}
            </p>
            <p className={cn('mt-0.5 text-xs', surface.textSecondary)}>
              {t('household.progress.completedCount', { count: completedCount })}
            </p>
          </div>
          <span className={cn('text-2xl font-semibold tabular-nums', surface.textPrimary)}>
            {history.balance}
          </span>
        </div>
        <section className="mt-6" aria-labelledby="participant-point-history-title">
          <h2
            id="participant-point-history-title"
            className={cn(navetTypographyTokens.sectionHeading, surface.textPrimary)}
          >
            {t('household.points.history')}
          </h2>
          {history.entries.length === 0 ? (
            <p className={cn('mt-3 text-sm', surface.textSecondary)}>
              {t('household.points.emptyHistory')}
            </p>
          ) : (
            <div className={cn('mt-2 divide-y', surface.border)}>
              {history.entries.map((entry) => {
                const definitionTitle = entry.definitionId
                  ? data.definitionsById[entry.definitionId]?.title
                  : undefined;
                const label =
                  entry.type === 'earlier'
                    ? t('household.points.earlierBalance')
                    : entry.type === 'adjusted'
                      ? (entry.reason ?? t('household.points.manualAdjustment'))
                      : entry.type === 'reopened'
                        ? t('household.points.choreReopened', {
                            name: definitionTitle ?? t('household.points.chore'),
                          })
                        : t('household.points.choreCompleted', {
                            name: definitionTitle ?? t('household.points.chore'),
                          });
                return (
                  <div key={entry.id} className="flex min-h-14 items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', surface.textPrimary)}>
                        {label}
                      </p>
                      {entry.timestamp ? (
                        <p className={cn('mt-0.5 text-xs', surface.textSecondary)}>
                          {i18n.formatDate(new Date(entry.timestamp), {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          · {i18n.formatTime(new Date(entry.timestamp))}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        entry.pointsDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      )}
                    >
                      {entry.pointsDelta > 0 ? '+' : ''}
                      {entry.pointsDelta}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </SheetSurface>
  );
}

function PointAdjustmentDialog({
  isOpen,
  participant,
  direction,
  currentBalance,
  onOpenChange,
  onSave,
}: {
  isOpen: boolean;
  participant: ChoreParticipant;
  direction: 'add' | 'remove';
  currentBalance: number;
  onOpenChange: (open: boolean) => void;
  onSave: (pointsDelta: number, reason: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setAmount(1);
    setReason('');
    setSaveError(false);
  }, [direction, isOpen]);
  const pointsDelta = direction === 'add' ? Math.round(amount) : -Math.round(amount);
  const validAmount = Number.isSafeInteger(amount) && amount >= 1 && amount <= 10_000;
  const projectedBalance = currentBalance + (validAmount ? pointsDelta : 0);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validAmount) return;
    setSaving(true);
    setSaveError(false);
    const saved = await onSave(pointsDelta, reason.trim());
    setSaving(false);
    setSaveError(!saved);
    if (saved) onOpenChange(false);
  };
  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t(direction === 'add' ? 'household.points.addFor' : 'household.points.removeFor', {
        name: participant.displayName,
      })}
      description={t('household.points.adjustDescription')}
      theme={theme}
      maxWidth="sm"
      bodyPadding={false}
    >
      <form onSubmit={submit}>
        <CardDialogBody>
          <CardDialogHeader
            title={t(
              direction === 'add' ? 'household.points.addFor' : 'household.points.removeFor',
              { name: participant.displayName }
            )}
            description={t('household.points.adjustDescription')}
            showRoomSelector={false}
          />
          <CardDialogSection label={t('household.points.amount')}>
            <Input
              autoFocus
              aria-label={t('household.points.amount')}
              type="number"
              min={1}
              max={10000}
              step={1}
              value={amount}
              invalid={!validAmount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </CardDialogSection>
          <CardDialogSection label={t('household.points.reason')}>
            <Textarea
              aria-label={t('household.points.reason')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </CardDialogSection>
          <output
            aria-live="polite"
            data-point-balance-preview="true"
            className={cn(
              'flex min-h-11 items-center rounded-xl border px-3 py-2.5 text-sm font-semibold tabular-nums',
              surface.borderStrong,
              surface.subtleBg,
              surface.textPrimary
            )}
          >
            {t('household.points.projectedBalance', { count: projectedBalance })}
          </output>
          {saveError ? (
            <p className="text-sm text-red-500" role="alert">
              {t('household.points.saveFailed')}
            </p>
          ) : null}
          <CardDialogFooter>
            <Button type="submit" loading={saving} disabled={!validAmount || saving}>
              {t(direction === 'add' ? 'household.points.saveAdd' : 'household.points.saveRemove')}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </form>
    </BaseCardDialog>
  );
}

export function ChoreSettingsView({
  data,
  onModeChange,
  onAddPerson,
  onEditPerson,
  managementPinConfigured,
  onManagePin,
  onRemovePin,
  recoveryContent,
}: {
  data: ChoreWorkspaceData;
  onModeChange: (mode: 'off' | 'light' | 'family' | 'adventure') => void;
  onAddPerson: () => void;
  onEditPerson: (participant: ChoreParticipant) => void;
  managementPinConfigured: boolean;
  onManagePin: () => void;
  onRemovePin: () => void;
  recoveryContent?: ReactNode;
}) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();
  const styles = getSettingsSectionStyles(theme, primaryColor);
  const experience = normalizeChoreExperienceState(data.experience);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [activeSection, setActiveSection] = useState<
    'motivation' | 'people' | 'protection' | 'recovery'
  >('motivation');
  const sections = [
    {
      id: 'motivation' as const,
      icon: Sparkles,
      label: t('household.settings.gamification'),
    },
    { id: 'people' as const, icon: Users, label: t('household.members.title') },
    {
      id: 'protection' as const,
      icon: ShieldCheck,
      label: t('household.management.pinLabel'),
    },
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
    ) : activeSection === 'protection' ? (
      <SettingsEmbeddedSurface>
        <SettingsSectionShell
          id="household-protection"
          icon={ShieldCheck}
          title={t('household.management.pinLabel')}
          description={t('household.setup.securityDescription')}
          styles={styles}
        >
          <SettingsItem
            title={t('household.management.pinLabel')}
            description={t('household.setup.pinHelper')}
            styles={styles}
          >
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
              <span className={cn('text-sm font-medium', styles.subtleColor)}>
                {managementPinConfigured ? t('common.on') : t('common.off')}
              </span>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="compact"
                  variant="secondary"
                  className="min-h-10 shrink-0"
                  onClick={onManagePin}
                >
                  {managementPinConfigured
                    ? t('household.management.changePin')
                    : t('household.management.setPin')}
                </Button>
                {managementPinConfigured ? (
                  <Button
                    size="compact"
                    variant="destructive"
                    className="min-h-10 shrink-0"
                    onClick={onRemovePin}
                  >
                    {t('household.management.removePin')}
                  </Button>
                ) : null}
              </div>
            </div>
          </SettingsItem>
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

import { DashboardEmptyState, SectionCard } from '@navet/app/components/patterns';
import {
  Badge,
  Button,
  LoadingSpinner,
  MessageBar,
  Panel,
  Select,
  TabList,
  TabPanel,
  Tabs,
  TabTrigger,
} from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetTypographyTokens } from '@navet/app/components/system/tokens';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@navet/app/components/ui/alert-dialog';
import { TasksSection } from '@navet/app/features/tasks/components/tasks-section';
import { useI18n, useTheme } from '@navet/app/hooks';
import {
  applyChoreOccurrenceCommand,
  type ChoreDefinition,
  type ChoreOccurrence,
  type ChoreParticipant,
  getChoreTiming,
} from '@navet/core/chores';
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  ClipboardList,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  archiveChoreDefinition,
  createChoreActivity,
  materializeChoreWorkspace,
} from '../chore-workspace-model';
import { useChoreWorkspaceStore } from '../chore-workspace-store';
import { useChoreWorkspaceSync } from '../use-chore-workspace-sync';
import { AddChoreDialog, AddPersonDialog } from './chore-setup-dialogs';

type HouseholdView = 'today' | 'chores' | 'routines';

function assignmentLabel(
  definition: ChoreDefinition,
  participantsById: Record<string, ChoreParticipant>,
  t: ReturnType<typeof useI18n>['t']
) {
  if (definition.assignment.mode === 'anyone') return t('household.assignment.anyone');
  if (definition.assignment.mode === 'everyone') return t('household.assignment.everyone');
  if (definition.assignment.mode === 'rotation') return t('household.assignment.rotation');
  return (
    participantsById[definition.assignment.participantIds[0] ?? '']?.displayName ??
    t('household.assignment.person')
  );
}

function scheduleLabel(definition: ChoreDefinition, t: ReturnType<typeof useI18n>['t']) {
  const frequency = definition.schedule.frequency;
  return frequency === 'once'
    ? t('household.schedule.once')
    : frequency === 'daily'
      ? t('household.schedule.daily')
      : frequency === 'weekly'
        ? t('household.schedule.weekly')
        : frequency === 'monthly'
          ? t('household.schedule.monthly')
          : t('household.schedule.afterCompletion');
}

function HouseholdUnavailable({
  status,
  retry,
}: {
  status: 'unavailable' | 'unauthorized' | 'error';
  retry: () => void;
}) {
  const { t } = useI18n();
  const unauthorized = status === 'unauthorized';
  const unavailable = status === 'unavailable';
  return (
    <DashboardEmptyState
      icon={unavailable ? ClipboardList : AlertTriangle}
      title={
        unavailable
          ? t('household.unavailable.title')
          : unauthorized
            ? t('household.unauthorized.title')
            : t('household.error.title')
      }
      description={
        unavailable
          ? t('household.unavailable.description')
          : unauthorized
            ? t('household.unauthorized.description')
            : t('household.error.description')
      }
      actionLabel={unavailable ? undefined : t('household.retry')}
      onAction={unavailable ? undefined : retry}
      actionIcon={RotateCcw}
      className="mx-auto max-w-xl"
    />
  );
}

function TodayChoreRow({
  occurrence,
  definition,
  participantsById,
  selectedParticipantId,
}: {
  occurrence: ChoreOccurrence;
  definition: ChoreDefinition;
  participantsById: Record<string, ChoreParticipant>;
  selectedParticipantId: string;
}) {
  const { formatTime, t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const mutate = useChoreWorkspaceStore((state) => state.mutate);
  const timing = getChoreTiming(occurrence);
  const participantNames = occurrence.assigneeIds
    .map((id) => participantsById[id]?.displayName)
    .filter(Boolean)
    .join(', ');
  const selectedParticipant = participantsById[selectedParticipantId];
  const canApprove =
    occurrence.status === 'awaiting_approval' &&
    definition.approval.approverIds.includes(selectedParticipantId);
  const canComplete =
    (occurrence.status === 'available' ||
      (occurrence.status === 'claimed' && occurrence.claimedBy === selectedParticipantId)) &&
    occurrence.assigneeIds.includes(selectedParticipantId);
  const runCommand = (type: 'complete' | 'approve' | 'reject') =>
    mutate(({ commandId, data, timestamp }) => {
      const current = data.occurrencesById[occurrence.id];
      const currentDefinition = data.definitionsById[definition.id];
      if (!current || !currentDefinition || !selectedParticipant) {
        throw new Error('Chore is no longer available');
      }
      const result = applyChoreOccurrenceCommand({
        commandId,
        command: { type, participantId: selectedParticipant.id },
        definition: currentDefinition,
        occurrence: current,
        timestamp,
      });
      return {
        activity: result.activity,
        data: {
          ...data,
          occurrencesById: { ...data.occurrencesById, [result.occurrence.id]: result.occurrence },
        },
      };
    });
  const statusLabel =
    occurrence.status === 'done'
      ? t('household.today.done')
      : occurrence.status === 'awaiting_approval'
        ? t('household.today.awaitingApproval')
        : timing === 'overdue'
          ? t('household.today.overdue')
          : timing === 'due'
            ? t('household.today.due')
            : t('household.today.upcoming');
  const tone =
    occurrence.status === 'done'
      ? 'success'
      : occurrence.status === 'awaiting_approval'
        ? 'warning'
        : timing === 'overdue'
          ? 'danger'
          : 'neutral';

  return (
    <div className="relative pl-9 before:absolute before:top-7 before:bottom-[-1.25rem] before:left-[0.72rem] before:w-px before:bg-current before:opacity-15 last:before:hidden">
      <span
        className="absolute top-6 left-1.5 h-3 w-3 rounded-full border-2 border-white/70"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <Panel
        muted
        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <time
              className={`text-sm font-semibold ${surface.textPrimary}`}
              dateTime={occurrence.scheduledAt}
            >
              {formatTime(new Date(occurrence.scheduledAt))}
            </time>
            <Badge tone={tone} size="small">
              {statusLabel}
            </Badge>
          </div>
          <h3 className={`mt-2 text-base font-semibold ${surface.textPrimary}`}>
            {definition.title}
          </h3>
          <p className={`mt-1 text-sm ${surface.textSecondary}`}>{participantNames}</p>
        </div>
        {canApprove ? (
          <div className="flex shrink-0 gap-2">
            <Button size="small" variant="secondary" onClick={() => void runCommand('reject')}>
              {t('household.actions.reject')}
            </Button>
            <Button
              size="small"
              leading={<Check className="h-4 w-4" />}
              onClick={() => void runCommand('approve')}
            >
              {t('household.actions.approve')}
            </Button>
          </div>
        ) : canComplete ? (
          <Button
            size="small"
            leading={<Check className="h-4 w-4" />}
            onClick={() => void runCommand('complete')}
          >
            {t('household.actions.complete')}
          </Button>
        ) : null}
      </Panel>
    </div>
  );
}

function TodayView({
  participants,
  selectedParticipantId,
  onSelectedParticipantChange,
}: {
  participants: ChoreParticipant[];
  selectedParticipantId: string;
  onSelectedParticipantChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const data = useChoreWorkspaceStore((state) => state.data);
  const now = Date.now();
  const endOfTomorrow = now + 36 * 60 * 60 * 1000;
  const visibleOccurrences = useMemo(() => {
    if (!data) return [];
    return Object.values(data.occurrencesById)
      .filter((occurrence) => {
        const scheduled = Date.parse(occurrence.scheduledAt);
        const relevantToPerson =
          selectedParticipantId === 'all' ||
          occurrence.assigneeIds.includes(selectedParticipantId) ||
          data.definitionsById[occurrence.definitionId]?.approval.approverIds.includes(
            selectedParticipantId
          );
        const definition = data.definitionsById[occurrence.definitionId];
        return (
          Boolean(definition && !definition.archivedAt) &&
          relevantToPerson &&
          (getChoreTiming(occurrence) === 'overdue' || scheduled <= endOfTomorrow)
        );
      })
      .sort((left, right) => {
        const doneDelta = Number(left.status === 'done') - Number(right.status === 'done');
        return doneDelta || Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt);
      });
  }, [data, endOfTomorrow, selectedParticipantId]);

  return (
    <SectionCard
      title={t('household.tabs.today')}
      description={t('household.description')}
      action={
        <div className="flex items-center gap-2 text-sm">
          <span className="sr-only">{t('household.personPicker.label')}</span>
          <Users className="h-4 w-4" aria-hidden="true" />
          <Select
            size="small"
            value={selectedParticipantId}
            aria-label={t('household.personPicker.label')}
            onChange={(event) => onSelectedParticipantChange(event.target.value)}
          >
            <option value="all">{t('household.personPicker.all')}</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.displayName}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      {visibleOccurrences.length === 0 || !data ? (
        <DashboardEmptyState
          compact
          variant="inline"
          icon={CalendarCheck}
          title={t('household.today.emptyTitle')}
          description={t('household.today.emptyDescription')}
        />
      ) : (
        <div className="space-y-5">
          {visibleOccurrences.map((occurrence) => {
            const definition = data.definitionsById[occurrence.definitionId];
            return definition ? (
              <TodayChoreRow
                key={occurrence.id}
                occurrence={occurrence}
                definition={definition}
                participantsById={data.participantsById}
                selectedParticipantId={selectedParticipantId}
              />
            ) : null;
          })}
        </div>
      )}
    </SectionCard>
  );
}

function ChoresView({
  participants,
  onAddChore,
  onAddPerson,
}: {
  participants: ChoreParticipant[];
  onAddChore: () => void;
  onAddPerson: () => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const data = useChoreWorkspaceStore((state) => state.data);
  const mutate = useChoreWorkspaceStore((state) => state.mutate);
  const [definitionPendingDelete, setDefinitionPendingDelete] = useState<ChoreDefinition | null>(
    null
  );
  const definitions = data
    ? Object.values(data.definitionsById).filter((item) => !item.archivedAt)
    : [];
  const toggleDefinition = (definition: ChoreDefinition) =>
    mutate(({ commandId, data: current, timestamp }) => {
      const currentDefinition = current.definitionsById[definition.id];
      if (!currentDefinition) throw new Error('Chore is no longer available');
      return {
        activity: createChoreActivity({
          commandId,
          definitionId: definition.id,
          timestamp,
          type: 'definition_updated',
        }),
        data: {
          ...current,
          definitionsById: {
            ...current.definitionsById,
            [definition.id]: {
              ...currentDefinition,
              enabled: !currentDefinition.enabled,
              updatedAt: timestamp,
            },
          },
        },
      };
    });
  const deleteDefinition = (definition: ChoreDefinition) =>
    mutate(({ commandId, data: current, timestamp }) => ({
      activity: createChoreActivity({
        commandId,
        definitionId: definition.id,
        timestamp,
        type: 'definition_archived',
      }),
      data: archiveChoreDefinition(current, definition.id, timestamp),
    }));

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)]">
      <SectionCard
        title={t('household.chores.title')}
        description={t('household.chores.description')}
        action={
          <Button size="small" leading={<Plus className="h-4 w-4" />} onClick={onAddChore}>
            {t('household.chores.add')}
          </Button>
        }
      >
        {definitions.length === 0 ? (
          <p className={`py-8 text-center text-sm ${surface.textSecondary}`}>
            {t('household.chores.empty')}
          </p>
        ) : (
          <div className="divide-y divide-current/10">
            {definitions.map((definition) => (
              <div
                key={definition.id}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`${navetTypographyTokens.titleMd} ${surface.textPrimary}`}>
                      {definition.title}
                    </h3>
                    {!definition.enabled ? (
                      <Badge size="small">{t('household.chores.paused')}</Badge>
                    ) : null}
                  </div>
                  <p className={`mt-1 ${navetTypographyTokens.helper} ${surface.textSecondary}`}>
                    {assignmentLabel(definition, data?.participantsById ?? {}, t)} ·{' '}
                    {scheduleLabel(definition, t)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="compact"
                    variant="ghost"
                    className="min-h-11"
                    onClick={() => void toggleDefinition(definition)}
                  >
                    {definition.enabled
                      ? t('household.chores.pause')
                      : t('household.chores.resume')}
                  </Button>
                  <Button
                    size="compact"
                    variant="ghost"
                    className={`min-h-11 ${
                      theme === 'light'
                        ? 'text-red-700 hover:bg-red-50'
                        : 'text-red-300 hover:bg-red-500/10'
                    }`}
                    leading={<Trash2 className="h-3.5 w-3.5" />}
                    aria-label={t('household.chores.deleteNamed', { name: definition.title })}
                    onClick={() => setDefinitionPendingDelete(definition)}
                  >
                    {t('household.chores.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard
        title={t('household.members.title')}
        description={t('household.members.description')}
        action={
          <Button
            size="small"
            variant="secondary"
            leading={<Plus className="h-4 w-4" />}
            onClick={onAddPerson}
          >
            {t('household.people.add')}
          </Button>
        }
      >
        <div className="space-y-3">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-current/8 text-sm font-semibold"
                style={{ color: participant.color }}
              >
                {participant.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className={`text-sm font-medium ${surface.textPrimary}`}>
                {participant.displayName}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
      <AlertDialog
        open={definitionPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDefinitionPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('household.chores.deleteTitle', {
                name: definitionPendingDelete?.title ?? '',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('household.chores.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">{t('common.cancel')}</AlertDialogCancel>
            <Button
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                if (!definitionPendingDelete) return;
                void deleteDefinition(definitionPendingDelete);
                setDefinitionPendingDelete(null);
              }}
            >
              {t('household.chores.delete')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function HouseholdSection({ syncEnabled = true }: { syncEnabled?: boolean }) {
  const { t } = useI18n();
  const [view, setView] = useState<HouseholdView>('today');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [choreDialogOpen, setChoreDialogOpen] = useState(false);
  const data = useChoreWorkspaceStore((state) => state.data);
  const status = useChoreWorkspaceStore((state) => state.status);
  const load = useChoreWorkspaceStore((state) => state.load);
  const mutate = useChoreWorkspaceStore((state) => state.mutate);
  useChoreWorkspaceSync(syncEnabled);
  const participants = useMemo(
    () => (data ? Object.values(data.participantsById).filter((item) => !item.pausedAt) : []),
    [data]
  );

  useEffect(() => {
    if (!selectedParticipantId && participants[0]) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  useEffect(() => {
    if (
      !syncEnabled ||
      status !== 'ready' ||
      !data ||
      Object.keys(data.definitionsById).length === 0
    )
      return;
    const materialized = materializeChoreWorkspace(data);
    if (!materialized.changed) return;
    void mutate(({ commandId, data: current, timestamp }) => ({
      activity: createChoreActivity({ commandId, timestamp, type: 'workspace_materialized' }),
      data: materializeChoreWorkspace(current, new Date(timestamp)).data,
    }));
  }, [data, mutate, status, syncEnabled]);

  const addParticipant = (participant: ChoreParticipant) =>
    mutate(({ commandId, data: current, timestamp }) => ({
      activity: createChoreActivity({
        commandId,
        participantId: participant.id,
        timestamp,
        type: 'participant_created',
      }),
      data: {
        ...current,
        participantsById: { ...current.participantsById, [participant.id]: participant },
      },
    }));
  const addDefinition = (definition: ChoreDefinition) =>
    mutate(({ commandId, data: current, timestamp }) => {
      const next = {
        ...current,
        definitionsById: { ...current.definitionsById, [definition.id]: definition },
      };
      return {
        activity: createChoreActivity({
          commandId,
          definitionId: definition.id,
          timestamp,
          type: 'definition_created',
        }),
        data: materializeChoreWorkspace(next, new Date(timestamp)).data,
      };
    });

  const choreStatus = status === 'saving' && data ? 'ready' : status;
  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto pb-24 md:pb-0">
      <Tabs
        value={view}
        defaultValue="today"
        onValueChange={(value) => setView(value as HouseholdView)}
      >
        <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
          <TabList size="small">
            <TabTrigger value="today" size="small">
              {t('household.tabs.today')}
            </TabTrigger>
            <TabTrigger value="chores" size="small">
              {t('household.tabs.chores')}
            </TabTrigger>
            <TabTrigger value="routines" size="small">
              {t('household.tabs.routines')}
            </TabTrigger>
          </TabList>
        </div>
        <TabPanel value="today">
          {choreStatus === 'loading' || choreStatus === 'idle' ? (
            <div
              className="flex min-h-64 items-center justify-center"
              role="status"
              aria-label={t('household.loading')}
            >
              <LoadingSpinner />
            </div>
          ) : choreStatus === 'unavailable' ||
            choreStatus === 'unauthorized' ||
            choreStatus === 'error' ? (
            <HouseholdUnavailable status={choreStatus} retry={() => void load({ force: true })} />
          ) : participants.length === 0 ? (
            <DashboardEmptyState
              icon={Users}
              title={t('household.people.emptyTitle')}
              description={t('household.people.emptyDescription')}
              actionLabel={t('household.people.add')}
              onAction={() => setPersonDialogOpen(true)}
              actionIcon={Plus}
              className="mx-auto max-w-xl"
            />
          ) : (
            <TodayView
              participants={participants}
              selectedParticipantId={selectedParticipantId}
              onSelectedParticipantChange={setSelectedParticipantId}
            />
          )}
        </TabPanel>
        <TabPanel value="chores">
          {choreStatus === 'unavailable' ||
          choreStatus === 'unauthorized' ||
          choreStatus === 'error' ? (
            <HouseholdUnavailable status={choreStatus} retry={() => void load({ force: true })} />
          ) : participants.length === 0 ? (
            <DashboardEmptyState
              icon={Users}
              title={t('household.people.emptyTitle')}
              description={t('household.people.emptyDescription')}
              actionLabel={t('household.people.add')}
              onAction={() => setPersonDialogOpen(true)}
              actionIcon={Plus}
              className="mx-auto max-w-xl"
            />
          ) : (
            <ChoresView
              participants={participants}
              onAddChore={() => setChoreDialogOpen(true)}
              onAddPerson={() => setPersonDialogOpen(true)}
            />
          )}
        </TabPanel>
        <TabPanel value="routines">
          <MessageBar tone="info" title={t('household.tabs.routines')}>
            {t('tasks.dashboard.sourceNote')}
          </MessageBar>
          <div className="mt-4">
            <TasksSection />
          </div>
        </TabPanel>
      </Tabs>
      <AddPersonDialog
        isOpen={personDialogOpen}
        onOpenChange={setPersonDialogOpen}
        onSave={addParticipant}
      />
      <AddChoreDialog
        isOpen={choreDialogOpen}
        onOpenChange={setChoreDialogOpen}
        participants={participants}
        onSave={addDefinition}
      />
    </div>
  );
}

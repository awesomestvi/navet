import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
} from '@navet/app/components/patterns';
import { BaseCardDialog, Button, Input, Select, Switch } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type {
  ChoreAssignmentMode,
  ChoreDefinition,
  ChoreParticipant,
  ChoreSchedule,
} from '@navet/core/chores';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function createEntityId(prefix: string, label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `${prefix}:${slug || 'item'}:${Date.now().toString(36)}`;
}

export function AddPersonDialog({
  isOpen,
  onOpenChange,
  onSave,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (participant: ChoreParticipant) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [name, setName] = useState('');
  const [manager, setManager] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setManager(false);
      setSaving(false);
    }
  }, [isOpen]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) return;
    const timestamp = new Date().toISOString();
    setSaving(true);
    const saved = await onSave({
      id: createEntityId('participant', displayName),
      displayName,
      capabilities: manager ? ['complete', 'approve', 'manage'] : ['complete'],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('household.personDialog.title')}
      description={t('household.personDialog.description')}
      theme={theme}
      maxWidth="sm"
      bodyPadding={false}
    >
      <form onSubmit={submit}>
        <CardDialogBody>
          <CardDialogHeader
            title={t('household.personDialog.title')}
            description={t('household.personDialog.description')}
            showRoomSelector={false}
          />
          <CardDialogSection label={t('household.personDialog.name')}>
            <Input
              autoFocus
              value={name}
              placeholder={t('household.personDialog.namePlaceholder')}
              onChange={(event) => setName(event.target.value)}
            />
          </CardDialogSection>
          <div className={`flex items-center justify-between gap-4 text-sm ${surface.textPrimary}`}>
            <span>{t('household.personDialog.manager')}</span>
            <Switch
              aria-label={t('household.personDialog.manager')}
              checked={manager}
              onCheckedChange={setManager}
            />
          </div>
          <CardDialogFooter>
            <Button type="submit" loading={saving} disabled={!name.trim()}>
              {t('household.personDialog.save')}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </form>
    </BaseCardDialog>
  );
}

export function AddChoreDialog({
  isOpen,
  onOpenChange,
  participants,
  onSave,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  participants: ChoreParticipant[];
  onSave: (definition: ChoreDefinition) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [title, setTitle] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<ChoreAssignmentMode>('person');
  const [participantId, setParticipantId] = useState('');
  const [frequency, setFrequency] = useState<ChoreSchedule['frequency']>('daily');
  const [time, setTime] = useState('18:00');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const completers = useMemo(
    () => participants.filter((participant) => participant.capabilities.includes('complete')),
    [participants]
  );
  const approverIds = useMemo(
    () =>
      participants
        .filter((participant) => participant.capabilities.includes('approve'))
        .map((participant) => participant.id),
    [participants]
  );

  useEffect(() => {
    if (isOpen && !participantId) setParticipantId(completers[0]?.id ?? '');
    if (!isOpen) {
      setTitle('');
      setAssignmentMode('person');
      setParticipantId('');
      setFrequency('daily');
      setTime('18:00');
      setApprovalRequired(false);
      setSaving(false);
    }
  }, [completers, isOpen, participantId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || completers.length === 0) return;
    const timestamp = new Date().toISOString();
    const startDate = localDateKey();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const schedule: ChoreSchedule =
      frequency === 'once'
        ? { frequency, date: startDate, time, timeZone }
        : frequency === 'weekly'
          ? { frequency, startDate, time, timeZone, daysOfWeek: [new Date().getDay()] }
          : frequency === 'monthly'
            ? { frequency, startDate, time, timeZone, dayOfMonth: new Date().getDate() }
            : frequency === 'after_completion'
              ? { frequency, startDate, time, timeZone, intervalDays: 1 }
              : { frequency: 'daily', startDate, time, timeZone };
    const participantIds =
      assignmentMode === 'person'
        ? [participantId || completers[0].id]
        : completers.map((participant) => participant.id);
    setSaving(true);
    const saved = await onSave({
      id: createEntityId('chore', normalizedTitle),
      title: normalizedTitle,
      enabled: true,
      assignment: { mode: assignmentMode, participantIds },
      schedule,
      dueWindowMinutes: 120,
      approval: {
        required: approvalRequired && approverIds.length > 0,
        approverIds,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('household.choreDialog.title')}
      description={t('household.choreDialog.description')}
      theme={theme}
      maxWidth="md"
      height="capped"
      bodyPadding={false}
      contentClassName="flex min-h-0 flex-col overscroll-contain max-sm:!h-[calc(100dvh-1rem)]"
      shellBodyClassName="relative min-h-0 flex-1 overflow-hidden"
    >
      <form
        className="flex min-h-0 flex-col overflow-hidden max-sm:absolute max-sm:inset-0 sm:max-h-[min(85vh,46rem)]"
        onSubmit={submit}
      >
        <div className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <CardDialogBody className="pb-5">
            <CardDialogHeader
              title={t('household.choreDialog.title')}
              description={t('household.choreDialog.description')}
              showRoomSelector={false}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CardDialogSection className="sm:col-span-2" label={t('household.choreDialog.name')}>
                <Input
                  aria-label={t('household.choreDialog.name')}
                  autoComplete="off"
                  name="chore-name"
                  value={title}
                  placeholder={t('household.choreDialog.namePlaceholder')}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </CardDialogSection>
              <CardDialogSection label={t('household.choreDialog.assignment')}>
                <Select
                  aria-label={t('household.choreDialog.assignment')}
                  name="chore-assignment"
                  value={assignmentMode}
                  onChange={(event) => setAssignmentMode(event.target.value as ChoreAssignmentMode)}
                >
                  <option value="person">{t('household.assignment.person')}</option>
                  <option value="anyone">{t('household.assignment.anyone')}</option>
                  <option value="everyone">{t('household.assignment.everyone')}</option>
                  <option value="rotation">{t('household.assignment.rotation')}</option>
                </Select>
              </CardDialogSection>
              <CardDialogSection label={t('household.choreDialog.person')}>
                <Select
                  aria-label={t('household.choreDialog.person')}
                  value={participantId}
                  disabled={assignmentMode !== 'person'}
                  name="chore-person"
                  onChange={(event) => setParticipantId(event.target.value)}
                >
                  {completers.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.displayName}
                    </option>
                  ))}
                </Select>
              </CardDialogSection>
              <CardDialogSection label={t('household.choreDialog.schedule')}>
                <Select
                  aria-label={t('household.choreDialog.schedule')}
                  name="chore-schedule"
                  value={frequency}
                  onChange={(event) =>
                    setFrequency(event.target.value as ChoreSchedule['frequency'])
                  }
                >
                  <option value="once">{t('household.schedule.once')}</option>
                  <option value="daily">{t('household.schedule.daily')}</option>
                  <option value="weekly">{t('household.schedule.weekly')}</option>
                  <option value="monthly">{t('household.schedule.monthly')}</option>
                  <option value="after_completion">
                    {t('household.schedule.afterCompletion')}
                  </option>
                </Select>
              </CardDialogSection>
              <CardDialogSection label={t('household.choreDialog.time')}>
                <Input
                  aria-label={t('household.choreDialog.time')}
                  name="chore-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </CardDialogSection>
            </div>
            <div
              className={`flex items-center justify-between gap-4 text-sm ${surface.textPrimary}`}
            >
              <span>{t('household.choreDialog.approval')}</span>
              <Switch
                aria-label={t('household.choreDialog.approval')}
                checked={approvalRequired}
                disabled={approverIds.length === 0}
                onCheckedChange={setApprovalRequired}
              />
            </div>
          </CardDialogBody>
        </div>
        <CardDialogFooter
          className={`mt-0 shrink-0 border-t px-6 py-4 max-sm:px-3.5 max-sm:pt-3 max-sm:pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] ${surface.border}`}
        >
          <Button type="submit" loading={saving} disabled={!title.trim() || !participantId}>
            {t('household.choreDialog.save')}
          </Button>
        </CardDialogFooter>
      </form>
    </BaseCardDialog>
  );
}

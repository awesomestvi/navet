import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  NavigationWorkspace,
} from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  ColorInputSwatch,
  IconButton,
  Input,
  InteractivePill,
  MessageBar,
  Select,
  Switch,
  Textarea,
} from '@navet/app/components/primitives';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import { prepareAvatarImageDataUrl, validateImageFile } from '@navet/app/utils/image-upload';
import type { ChorePresentationMetadata } from '@navet/core/chore-experience';
import type {
  ChoreAssignmentMode,
  ChoreDefinition,
  ChoreParticipant,
  ChoreSchedule,
} from '@navet/core/chores';
import {
  CalendarClock,
  ChevronDown,
  ListChecks,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { resolveChoreColorPalette } from '../chore-color-palette';
import { ChoreFormGroup } from './chore-creation-form-groups';
import { ChoreIconPicker } from './chore-icon-picker';
import { ChoreProfileAppearanceEditor } from './chore-profile-appearance-editor';

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
  error,
  managerRequired = false,
  participant,
  onOpenChange,
  onSave,
}: {
  isOpen: boolean;
  error?: string | null;
  managerRequired?: boolean;
  participant?: ChoreParticipant | null;
  onOpenChange: (open: boolean) => void;
  onSave: (participant: ChoreParticipant) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [name, setName] = useState('');
  const [manager, setManager] = useState(false);
  const [paused, setPaused] = useState(false);
  const [color, setColor] = useState(themeColorValues.orange);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarIcon, setAvatarIcon] = useState('');
  const [avatarUploadError, setAvatarUploadError] = useState('');
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [linkedPersonEntityId, setLinkedPersonEntityId] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [reminderDestination, setReminderDestination] = useState<'in_app' | 'home_assistant'>(
    'in_app'
  );
  const [reminderTarget, setReminderTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftParticipantId, setDraftParticipantId] = useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const personSteps = useMemo(
    () => [
      {
        id: 'profile',
        label: t('household.personDialog.stepProfile'),
        icon: UserRound,
      },
      {
        id: 'customize',
        label: t('household.personDialog.stepCustomize'),
        icon: SlidersHorizontal,
        disabled: !name.trim(),
      },
    ],
    [name, t]
  );

  useEffect(() => {
    if (isOpen) {
      setDraftParticipantId(participant?.id ?? createEntityId('participant', 'person'));
      setName(participant?.displayName ?? '');
      setManager(managerRequired || participant?.capabilities.includes('manage') === true);
      setPaused(Boolean(participant?.pausedAt));
      setColor(participant?.color ?? themeColorValues.orange);
      setAvatarUrl(participant?.avatarUrl ?? '');
      setAvatarIcon(participant?.avatarIcon ?? '');
      setAvatarUploadError('');
      setAvatarProcessing(false);
      setLinkedAccountId(participant?.linkedAccountId ?? '');
      setLinkedPersonEntityId(participant?.linkedPersonEntityId ?? '');
      setRemindersEnabled(participant?.reminderPreferences?.enabled ?? true);
      setQuietStart(participant?.reminderPreferences?.quietHours?.start ?? '21:00');
      setQuietEnd(participant?.reminderPreferences?.quietHours?.end ?? '07:00');
      setReminderDestination(participant?.reminderPreferences?.destination?.type ?? 'in_app');
      setReminderTarget(participant?.reminderPreferences?.destination?.target ?? '');
      setCurrentStep(0);
    }
    if (!isOpen) {
      setDraftParticipantId('');
      setName('');
      setManager(managerRequired);
      setPaused(false);
      setColor(themeColorValues.orange);
      setAvatarUrl('');
      setAvatarIcon('');
      setAvatarUploadError('');
      setAvatarProcessing(false);
      setLinkedAccountId('');
      setLinkedPersonEntityId('');
      setRemindersEnabled(true);
      setQuietStart('21:00');
      setQuietEnd('07:00');
      setReminderDestination('in_app');
      setReminderTarget('');
      setSaving(false);
      setCurrentStep(0);
    }
  }, [isOpen, managerRequired, participant]);

  useEffect(() => {
    formRef.current?.scrollTo({ top: 0 });
  }, [currentStep]);

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    setAvatarUploadError('');
    if (validateImageFile(file)) {
      setAvatarUploadError(t('household.personDialog.avatarError'));
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }
    setAvatarProcessing(true);
    try {
      setAvatarUrl(await prepareAvatarImageDataUrl(file));
      setAvatarIcon('');
    } catch {
      setAvatarUploadError(t('household.personDialog.avatarError'));
    } finally {
      setAvatarProcessing(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) return;
    if (currentStep < personSteps.length - 1) {
      setCurrentStep((step) => step + 1);
      return;
    }
    const timestamp = new Date().toISOString();
    setSaving(true);
    const saved = await onSave({
      id: participant?.id ?? draftParticipantId ?? createEntityId('participant', displayName),
      displayName,
      color,
      avatarUrl: avatarUrl.trim() || undefined,
      avatarIcon: avatarIcon.trim() || undefined,
      capabilities: manager || managerRequired ? ['complete', 'approve', 'manage'] : ['complete'],
      pausedAt: paused ? (participant?.pausedAt ?? timestamp) : undefined,
      linkedAccountId: linkedAccountId.trim() || undefined,
      linkedPersonEntityId: linkedPersonEntityId.trim() || undefined,
      reminderPreferences: {
        enabled: remindersEnabled,
        quietHours: { start: quietStart, end: quietEnd },
        destination: {
          type: reminderDestination,
          target: reminderTarget.trim() || undefined,
        },
      },
      createdAt: participant?.createdAt ?? timestamp,
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
      title={
        participant ? t('household.personDialog.editTitle') : t('household.personDialog.title')
      }
      description={
        participant
          ? t('household.personDialog.editDescription')
          : t('household.personDialog.description')
      }
      theme={theme}
      maxWidth="sm"
      height="capped"
      bodyPadding={false}
    >
      <form ref={formRef} className="max-h-[85vh] overflow-y-auto" onSubmit={submit}>
        <CardDialogBody>
          <CardDialogHeader
            title={
              participant
                ? t('household.personDialog.editTitle')
                : t('household.personDialog.title')
            }
            description={
              participant
                ? t('household.personDialog.editDescription')
                : t('household.personDialog.description')
            }
            showRoomSelector={false}
          />
          {error ? (
            <MessageBar tone="error" title={t('household.error.title')} className="mb-3">
              {error}
            </MessageBar>
          ) : null}
          <CardDialogTabList className="mt-0 mb-0 grid w-full grid-cols-2 gap-2">
            {personSteps.map((step, index) => (
              <InteractivePill
                key={step.id}
                active={currentStep === index}
                accentColor={accentColor}
                aria-controls="person-dialog-step"
                aria-pressed={currentStep === index}
                className="min-w-0 px-2 motion-reduce:transition-none"
                disabled={step.disabled}
                icon={step.icon}
                size="compact"
                onClick={() => setCurrentStep(index)}
              >
                <span className="truncate">{step.label}</span>
              </InteractivePill>
            ))}
          </CardDialogTabList>
          <div id="person-dialog-step" className="mt-6">
            {currentStep === 0 ? (
              <div className="grid gap-4">
                <CardDialogSection className="mb-0" label={t('household.personDialog.name')}>
                  <Input
                    autoFocus
                    aria-label={t('household.personDialog.name')}
                    value={name}
                    placeholder={t('household.personDialog.namePlaceholder')}
                    onChange={(event) => setName(event.target.value)}
                  />
                </CardDialogSection>
                <CardDialogSection className="mb-0" label={t('household.personDialog.role')}>
                  <Select
                    aria-label={t('household.personDialog.role')}
                    value={manager ? 'manager' : 'member'}
                    disabled={managerRequired}
                    onChange={(event) => setManager(event.target.value === 'manager')}
                  >
                    <option value="member">{t('household.personDialog.member')}</option>
                    <option value="manager">{t('household.personDialog.roleManager')}</option>
                  </Select>
                </CardDialogSection>
              </div>
            ) : null}
            {currentStep === 1 ? (
              <div className="grid gap-4">
                <ChoreProfileAppearanceEditor
                  displayName={name}
                  color={color}
                  avatarUrl={avatarUrl}
                  avatarIcon={avatarIcon}
                  avatarProcessing={avatarProcessing}
                  avatarUploadError={avatarUploadError}
                  avatarInputRef={avatarInputRef}
                  onUploadAvatar={(file) => void uploadAvatar(file)}
                  onRemoveAvatar={() => {
                    setAvatarUrl('');
                    setAvatarUploadError('');
                  }}
                  onIconChange={(iconName) => {
                    setAvatarIcon(iconName);
                    setAvatarUrl('');
                    setAvatarUploadError('');
                  }}
                  onColorChange={setColor}
                />
                {participant ? (
                  <div
                    className={`flex min-h-14 items-center justify-between gap-6 rounded-2xl border px-4 py-2.5 text-sm ${surface.border} ${surface.subtleBg} ${surface.textPrimary}`}
                  >
                    <span className="font-medium">{t('household.personDialog.paused')}</span>
                    <Switch
                      aria-label={t('household.personDialog.paused')}
                      checked={paused}
                      size="compact"
                      onCheckedChange={setPaused}
                    />
                  </div>
                ) : null}
                <details
                  className={`group overflow-hidden rounded-2xl border ${surface.border} ${surface.subtleBg}`}
                >
                  <summary
                    className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden ${surface.textPrimary}`}
                  >
                    {t('household.personDialog.moreOptions')}
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <div className={`grid gap-4 border-t px-4 py-4 ${surface.border}`}>
                    <CardDialogSection
                      className="mb-0"
                      label={t('household.personDialog.accountLink')}
                    >
                      <Input
                        aria-label={t('household.personDialog.accountLink')}
                        value={linkedAccountId}
                        size="small"
                        onChange={(event) => setLinkedAccountId(event.target.value)}
                      />
                    </CardDialogSection>
                    <CardDialogSection
                      className="mb-0"
                      label={t('household.personDialog.personLink')}
                    >
                      <Input
                        aria-label={t('household.personDialog.personLink')}
                        value={linkedPersonEntityId}
                        size="small"
                        onChange={(event) => setLinkedPersonEntityId(event.target.value)}
                      />
                    </CardDialogSection>
                  </div>
                </details>
                <details
                  className={`group overflow-hidden rounded-2xl border ${surface.border} ${surface.subtleBg}`}
                >
                  <summary
                    className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden ${surface.textPrimary}`}
                  >
                    {t('household.personDialog.stepReminders')}
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <div className={`grid gap-4 border-t px-4 py-4 ${surface.border}`}>
                    <div
                      className={`flex min-h-9 items-center justify-between gap-6 text-sm ${surface.textPrimary}`}
                    >
                      <span className="font-medium">{t('household.personDialog.reminders')}</span>
                      <Switch
                        aria-label={t('household.personDialog.reminders')}
                        checked={remindersEnabled}
                        size="compact"
                        onCheckedChange={setRemindersEnabled}
                      />
                    </div>
                    {remindersEnabled ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <CardDialogSection
                            className="mb-0"
                            label={t('household.personDialog.quietStart')}
                          >
                            <Input
                              aria-label={t('household.personDialog.quietStart')}
                              type="time"
                              value={quietStart}
                              size="small"
                              onChange={(event) => setQuietStart(event.target.value)}
                            />
                          </CardDialogSection>
                          <CardDialogSection
                            className="mb-0"
                            label={t('household.personDialog.quietEnd')}
                          >
                            <Input
                              aria-label={t('household.personDialog.quietEnd')}
                              type="time"
                              value={quietEnd}
                              size="small"
                              onChange={(event) => setQuietEnd(event.target.value)}
                            />
                          </CardDialogSection>
                        </div>
                        <CardDialogSection
                          className="mb-0"
                          label={t('household.personDialog.destination')}
                        >
                          <Select
                            aria-label={t('household.personDialog.destination')}
                            value={reminderDestination}
                            onChange={(event) =>
                              setReminderDestination(
                                event.target.value as 'in_app' | 'home_assistant'
                              )
                            }
                          >
                            <option value="in_app">
                              {t('household.personDialog.destinationInApp')}
                            </option>
                            <option value="home_assistant">
                              {t('household.personDialog.destinationHomeAssistant')}
                            </option>
                          </Select>
                        </CardDialogSection>
                        {reminderDestination === 'home_assistant' ? (
                          <CardDialogSection
                            className="mb-0"
                            label={t('household.personDialog.destinationTarget')}
                          >
                            <Input
                              aria-label={t('household.personDialog.destinationTarget')}
                              value={reminderTarget}
                              size="small"
                              onChange={(event) => setReminderTarget(event.target.value)}
                            />
                          </CardDialogSection>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </details>
              </div>
            ) : null}
          </div>
          <CardDialogFooter className={`gap-2 border-t pt-4 ${surface.border}`}>
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setCurrentStep((step) => step - 1)}
              >
                {t('login.actions.back')}
              </Button>
            ) : null}
            {currentStep < personSteps.length - 1 ? (
              <Button
                type="button"
                size="compact"
                disabled={!name.trim()}
                onClick={() => setCurrentStep((step) => step + 1)}
              >
                {t('dashboard.multiple.create.next')}
              </Button>
            ) : (
              <Button type="submit" size="compact" loading={saving} disabled={!name.trim()}>
                {participant
                  ? t('household.personDialog.saveChanges')
                  : t('household.personDialog.save')}
              </Button>
            )}
          </CardDialogFooter>
        </CardDialogBody>
      </form>
    </BaseCardDialog>
  );
}

export function ChoreManagementPinDialog({
  isOpen,
  error,
  onOpenChange,
  onUnlock,
}: {
  isOpen: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onUnlock: (pin: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [pin, setPin] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (isOpen) setPin('');
  }, [isOpen]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) return;
    setUnlocking(true);
    const unlocked = await onUnlock(pin);
    setUnlocking(false);
    if (unlocked) onOpenChange(false);
  };

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('household.management.title')}
      description={t('household.management.description')}
      theme={theme}
      maxWidth="sm"
      bodyPadding={false}
    >
      <form onSubmit={unlock}>
        <CardDialogHeader
          title={t('household.management.title')}
          description={t('household.management.description')}
        />
        <CardDialogBody className="grid gap-3">
          <CardDialogSection className="mb-0" label={t('household.management.pinLabel')}>
            <Input
              autoFocus
              aria-label={t('household.management.pinLabel')}
              autoComplete="current-password"
              inputMode="numeric"
              maxLength={8}
              pattern="[0-9]*"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            />
          </CardDialogSection>
          {error ? (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}
        </CardDialogBody>
        <CardDialogFooter className={`border-t ${surface.border}`}>
          <Button type="submit" loading={unlocking} disabled={!/^\d{4,8}$/.test(pin)}>
            {t('household.management.unlock')}
          </Button>
        </CardDialogFooter>
      </form>
    </BaseCardDialog>
  );
}

export function AddChoreDialog({
  definition,
  presentation,
  isOpen,
  onOpenChange,
  participants,
  rooms = [],
  onSave,
}: {
  definition?: ChoreDefinition | null;
  presentation?: ChorePresentationMetadata;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  participants: ChoreParticipant[];
  rooms?: Array<{ canonicalId: string; label: string }>;
  onSave: (
    definition: ChoreDefinition,
    presentation: ChorePresentationMetadata
  ) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [title, setTitle] = useState('');
  const [choreIcon, setChoreIcon] = useState('ListChecks');
  const [choreColor, setChoreColor] = useState('');
  const [description, setDescription] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<ChoreAssignmentMode>('person');
  const [participantId, setParticipantId] = useState('');
  const [frequency, setFrequency] = useState<ChoreSchedule['frequency']>('daily');
  const [time, setTime] = useState('18:00');
  const [scheduleStartDate, setScheduleStartDate] = useState(localDateKey());
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleInterval, setScheduleInterval] = useState(1);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([new Date().getDay()]);
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate());
  const [extraTimes, setExtraTimes] = useState('');
  const [excludedDates, setExcludedDates] = useState('');
  const [rotationReset, setRotationReset] = useState<'never' | 'weekly' | 'monthly'>('never');
  const [rotationOffset, setRotationOffset] = useState(0);
  const [participantTimes, setParticipantTimes] = useState<Record<string, string>>({});
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [dueWindowMinutes, setDueWindowMinutes] = useState(120);
  const [roomLabel, setRoomLabel] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(5);
  const [points, setPoints] = useState(0);
  const [childTitle, setChildTitle] = useState('');
  const [claimRequired, setClaimRequired] = useState(false);
  const [claimExpiryMinutes, setClaimExpiryMinutes] = useState(60);
  const [missedGraceMinutes, setMissedGraceMinutes] = useState(60);
  const [missedAction, setMissedAction] = useState<'none' | 'skip' | 'carry_forward'>('none');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [remindBeforeMinutes, setRemindBeforeMinutes] = useState(30);
  const [overdueEveryMinutes, setOverdueEveryMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [editorSection, setEditorSection] = useState<
    'details' | 'assignment' | 'schedule' | 'options'
  >('details');
  const [furthestEditorSection, setFurthestEditorSection] = useState(0);
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
  const roomChoices = useMemo(
    () =>
      definition?.roomRef &&
      !rooms.some((room) => room.canonicalId === definition.roomRef?.canonicalId)
        ? [...rooms, definition.roomRef]
        : rooms,
    [definition, rooms]
  );

  useEffect(() => {
    if (isOpen) {
      setEditorSection('details');
      setFurthestEditorSection(0);
      setTitle(definition?.title ?? '');
      setChoreIcon(presentation?.icon ?? 'ListChecks');
      setChoreColor(presentation?.color ?? '');
      setDescription(definition?.description ?? '');
      setAssignmentMode(definition?.assignment.mode ?? 'person');
      setParticipantId(definition?.assignment.participantIds[0] ?? completers[0]?.id ?? '');
      setFrequency(definition?.schedule.frequency ?? 'daily');
      setTime(definition?.schedule.time ?? '18:00');
      setScheduleStartDate(
        definition?.schedule.frequency === 'once'
          ? definition.schedule.date
          : (definition?.schedule.startDate ?? localDateKey())
      );
      setScheduleEndDate(definition?.schedule.endDate ?? '');
      setScheduleInterval(
        definition?.schedule.frequency === 'daily' ||
          definition?.schedule.frequency === 'after_completion'
          ? (definition.schedule.intervalDays ?? 1)
          : definition?.schedule.frequency === 'weekly'
            ? (definition.schedule.intervalWeeks ?? 1)
            : 1
      );
      setWeeklyDays(
        definition?.schedule.frequency === 'daily' || definition?.schedule.frequency === 'weekly'
          ? (definition.schedule.daysOfWeek ?? [new Date().getDay()])
          : [new Date().getDay()]
      );
      setDayOfMonth(
        definition?.schedule.frequency === 'monthly'
          ? (definition.schedule.dayOfMonth ?? new Date().getDate())
          : new Date().getDate()
      );
      setExtraTimes(
        (definition?.schedule.times ?? [])
          .filter((scheduledTime) => scheduledTime !== definition?.schedule.time)
          .join(', ')
      );
      setExcludedDates((definition?.schedule.excludedDates ?? []).join(', '));
      setRotationReset(definition?.assignment.rotationReset ?? 'never');
      setRotationOffset(definition?.assignment.rotationCursor ?? 0);
      setParticipantTimes(
        Object.fromEntries(
          Object.entries(definition?.assignment.participantScheduleOverrides ?? {}).map(
            ([id, override]) => [id, (override.times ?? []).join(', ')]
          )
        )
      );
      setApprovalRequired(definition?.approval.required ?? false);
      setDueWindowMinutes(definition?.dueWindowMinutes ?? 120);
      setRoomLabel(definition?.roomRef?.canonicalId ?? '');
      setEstimatedMinutes(presentation?.estimatedMinutes ?? 5);
      setPoints(presentation?.points ?? 0);
      setChildTitle(presentation?.childTitle ?? '');
      setClaimRequired(definition?.claimPolicy?.required ?? false);
      setClaimExpiryMinutes(definition?.claimPolicy?.expiresAfterMinutes ?? 60);
      setMissedGraceMinutes(definition?.missedPolicy?.graceMinutes ?? 60);
      setMissedAction(definition?.missedPolicy?.action ?? 'none');
      setRemindersEnabled(definition?.reminderPolicy?.enabled ?? false);
      setRemindBeforeMinutes(definition?.reminderPolicy?.beforeDueMinutes[0] ?? 30);
      setOverdueEveryMinutes(definition?.reminderPolicy?.overdueEveryMinutes ?? 60);
    }
    if (!isOpen) {
      setTitle('');
      setChoreIcon('ListChecks');
      setChoreColor('');
      setDescription('');
      setAssignmentMode('person');
      setParticipantId('');
      setFrequency('daily');
      setTime('18:00');
      setScheduleStartDate(localDateKey());
      setScheduleEndDate('');
      setScheduleInterval(1);
      setWeeklyDays([new Date().getDay()]);
      setDayOfMonth(new Date().getDate());
      setExtraTimes('');
      setExcludedDates('');
      setRotationReset('never');
      setRotationOffset(0);
      setParticipantTimes({});
      setApprovalRequired(false);
      setDueWindowMinutes(120);
      setRoomLabel('');
      setEstimatedMinutes(5);
      setPoints(0);
      setChildTitle('');
      setClaimRequired(false);
      setClaimExpiryMinutes(60);
      setMissedGraceMinutes(60);
      setMissedAction('none');
      setRemindersEnabled(false);
      setRemindBeforeMinutes(30);
      setOverdueEveryMinutes(60);
      setSaving(false);
      setEditorSection('details');
      setFurthestEditorSection(0);
    }
  }, [completers, definition, isOpen, presentation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || completers.length === 0) return;
    const activeEditorIndex = editorSections.findIndex((section) => section.id === editorSection);
    if (editorSection === 'assignment' && assignmentMode === 'person' && !participantId) return;
    if (!definition && activeEditorIndex < editorSections.length - 1) {
      const nextIndex = activeEditorIndex + 1;
      setEditorSection(editorSections[nextIndex].id);
      setFurthestEditorSection((current) => Math.max(current, nextIndex));
      return;
    }
    const timestamp = new Date().toISOString();
    const startDate = scheduleStartDate || localDateKey();
    const timeZone =
      definition?.schedule.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const extraScheduleTimes = extraTimes
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
    const scheduleOptions = {
      endDate: frequency === 'once' ? undefined : scheduleEndDate || undefined,
      excludedDates:
        frequency === 'once'
          ? undefined
          : excludedDates
              .split(',')
              .map((value) => value.trim())
              .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
      times:
        extraScheduleTimes.length > 0 ? [...new Set([time, ...extraScheduleTimes])] : undefined,
    };
    const schedule: ChoreSchedule =
      frequency === 'once'
        ? { frequency, date: startDate, time, timeZone }
        : frequency === 'weekly'
          ? {
              frequency,
              startDate,
              time,
              timeZone,
              daysOfWeek: weeklyDays.length > 0 ? weeklyDays : [new Date().getDay()],
              intervalWeeks: Math.max(1, scheduleInterval),
              ...scheduleOptions,
            }
          : frequency === 'monthly'
            ? {
                frequency,
                startDate,
                time,
                timeZone,
                ...(definition?.schedule.frequency === 'monthly' && definition.schedule.nthWeekday
                  ? { nthWeekday: definition.schedule.nthWeekday }
                  : { dayOfMonth: Math.min(31, Math.max(1, dayOfMonth)) }),
                ...scheduleOptions,
              }
            : frequency === 'after_completion'
              ? {
                  frequency,
                  startDate,
                  time,
                  timeZone,
                  intervalDays: Math.max(1, scheduleInterval),
                  ...scheduleOptions,
                }
              : {
                  frequency: 'daily',
                  startDate,
                  time,
                  timeZone,
                  daysOfWeek: weeklyDays.length === 7 ? undefined : weeklyDays,
                  intervalDays: Math.max(1, scheduleInterval),
                  ...scheduleOptions,
                };
    const participantIds =
      assignmentMode === 'person'
        ? [participantId || completers[0].id]
        : definition?.assignment.mode === assignmentMode
          ? definition.assignment.participantIds
          : completers.map((participant) => participant.id);
    const participantScheduleOverrides = Object.fromEntries(
      participantIds.flatMap((id) => {
        const existing = definition?.assignment.participantScheduleOverrides?.[id];
        const times = (participantTimes[id] ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
        const override = {
          ...existing,
          times: times.length > 0 ? times : undefined,
        };
        return override.daysOfWeek || override.times ? [[id, override] as const] : [];
      })
    );
    setSaving(true);
    const selectedRoom = roomChoices.find(
      (room) => room.canonicalId === roomLabel || room.label === roomLabel
    );
    const saved = await onSave(
      {
        ...definition,
        id: definition?.id ?? createEntityId('chore', normalizedTitle),
        title: normalizedTitle,
        description: description.trim() || undefined,
        roomRef: selectedRoom
          ? { canonicalId: selectedRoom.canonicalId, label: selectedRoom.label }
          : undefined,
        enabled: definition?.enabled ?? true,
        assignment: {
          ...(definition?.assignment.mode === assignmentMode ? definition.assignment : {}),
          mode: assignmentMode,
          participantIds,
          rotationReset: assignmentMode === 'rotation' ? rotationReset : undefined,
          rotationCursor: assignmentMode === 'rotation' ? Math.max(0, rotationOffset) : undefined,
          participantScheduleOverrides:
            Object.keys(participantScheduleOverrides).length > 0
              ? participantScheduleOverrides
              : undefined,
        },
        schedule,
        dueWindowMinutes: Math.max(0, dueWindowMinutes),
        approval: {
          required: approvalRequired && approverIds.length > 0,
          approverIds,
        },
        claimPolicy: claimRequired
          ? {
              required: true,
              allowSteal: true,
              expiresAfterMinutes: Math.max(1, claimExpiryMinutes),
            }
          : undefined,
        missedPolicy: {
          graceMinutes: Math.max(0, missedGraceMinutes),
          action: missedAction,
          carryForwardDays: missedAction === 'carry_forward' ? 1 : undefined,
        },
        reminderPolicy: {
          enabled: remindersEnabled,
          beforeDueMinutes: [Math.max(1, remindBeforeMinutes)],
          atDue: true,
          overdueEveryMinutes: Math.max(1, overdueEveryMinutes),
          maxOverdueReminders: 3,
          approvalAfterMinutes: 30,
        },
        createdAt: definition?.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
      {
        estimatedMinutes: estimatedMinutes > 0 ? Math.round(estimatedMinutes) : undefined,
        points: points > 0 ? Math.round(points) : undefined,
        childTitle: childTitle.trim() || undefined,
        icon: choreIcon,
        color: choreColor || undefined,
      }
    );
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  const dialogTitle = definition
    ? t('household.choreDialog.editTitle')
    : t('household.choreDialog.title');
  const dialogDescription = definition
    ? t('household.choreDialog.editDescription')
    : t('household.choreDialog.description');
  const editorSections = [
    {
      id: 'details' as const,
      label: t('household.choreDialog.name'),
      icon: ListChecks,
    },
    {
      id: 'assignment' as const,
      label: t('household.choreDialog.assignment'),
      icon: UserRound,
    },
    {
      id: 'schedule' as const,
      label: t('household.choreDialog.schedule'),
      icon: CalendarClock,
    },
    {
      id: 'options' as const,
      label: t('household.choreDialog.moreOptions'),
      icon: SlidersHorizontal,
    },
  ];
  const activeSection =
    editorSections.find((section) => section.id === editorSection) ?? editorSections[0];
  const activeEditorIndex = editorSections.findIndex((section) => section.id === editorSection);
  const isCreationStepper = !definition;
  const canContinue =
    title.trim().length > 0 &&
    completers.length > 0 &&
    (editorSection !== 'assignment' || assignmentMode !== 'person' || participantId.length > 0);
  const repeatValue =
    frequency === 'weekly' && scheduleInterval === 2
      ? 'biweekly'
      : frequency === 'weekly' && scheduleInterval === 3
        ? 'triweekly'
        : frequency;

  const selectEditorSection = (index: number) => {
    if (isCreationStepper && index > furthestEditorSection) return;
    setEditorSection(editorSections[index].id);
  };

  const selectRepeat = (value: ChoreSchedule['frequency'] | 'biweekly' | 'triweekly') => {
    if (value === 'biweekly' || value === 'triweekly') {
      setFrequency('weekly');
      setScheduleInterval(value === 'biweekly' ? 2 : 3);
      return;
    }

    setFrequency(value);
    setScheduleInterval(1);
  };

  return (
    <BaseCardDialog
      variant="fullscreen"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      theme={theme}
      contentClassName={cn(
        'md:left-1/2 md:right-auto md:w-[calc(100%-4rem)] md:max-w-[1200px] md:-translate-x-1/2',
        'backdrop-blur-2xl',
        surface.shellPanel,
        surface.border
      )}
      shellBodyClassName="h-full min-h-0"
    >
      <form className="h-full min-h-0" onSubmit={submit}>
        <NavigationWorkspace.Frame
          aria-label={dialogTitle}
          className="h-full min-h-0 rounded-none border-0 bg-transparent shadow-none"
        >
          <NavigationWorkspace.Header className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
                {dialogTitle}
              </h1>
              <p className={cn('mt-1', navetTypographyTokens.body, surface.textSecondary)}>
                {dialogDescription}
              </p>
            </div>
            <IconButton
              variant="ghost"
              label={t('common.close')}
              icon={<X aria-hidden="true" className={navetIconSizeTokens.sm} />}
              className={cn('min-h-10 min-w-10 shrink-0', surface.subtleBg, surface.hoverBg)}
              onClick={() => onOpenChange(false)}
            />
          </NavigationWorkspace.Header>
          <NavigationWorkspace.Body className="grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[16rem_minmax(0,1fr)] md:grid-rows-1">
            <NavigationWorkspace.Sidebar className="scrollbar-hide overflow-x-auto border-r-0 border-b p-3 md:overflow-y-auto md:border-r md:border-b-0 md:p-4">
              <nav
                className="flex min-w-max gap-1 md:grid md:min-w-0"
                aria-label={isCreationStepper ? t('household.setup.progressLabel') : dialogTitle}
              >
                {editorSections.map((section, index) => {
                  const Icon = section.icon;
                  const active = section.id === editorSection;
                  const disabled = isCreationStepper && index > furthestEditorSection;
                  return (
                    <NavigationWorkspace.Item
                      key={section.id}
                      active={active}
                      accentColor={accentColor}
                      className="w-[10.5rem] md:w-auto"
                    >
                      <NavigationWorkspace.ItemButton
                        aria-current={active ? (isCreationStepper ? 'step' : 'page') : undefined}
                        disabled={disabled}
                        className="disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => selectEditorSection(index)}
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
            <NavigationWorkspace.Content>
              <NavigationWorkspace.ScrollArea className="scrollbar-hide">
                <div className="flex min-h-full flex-col">
                  <div className="w-full flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
                    {isCreationStepper ? (
                      <p className={cn('mb-2 text-xs font-semibold', surface.textSecondary)}>
                        {t('household.setup.stepCount', {
                          current: activeEditorIndex + 1,
                          total: editorSections.length,
                        })}
                      </p>
                    ) : null}
                    <h2 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
                      {activeSection.label}
                    </h2>
                    <p
                      className={cn(
                        'mt-2 max-w-xl',
                        navetTypographyTokens.body,
                        surface.textSecondary
                      )}
                    >
                      {dialogDescription}
                    </p>

                    {editorSection === 'details' ? (
                      <div className="mt-7">
                        <ChoreFormGroup title={t('household.setup.choreGroupDetails')}>
                          <CardDialogSection
                            className="sm:col-span-2"
                            label={t('household.choreDialog.name')}
                          >
                            <Input
                              autoFocus
                              aria-label={t('household.choreDialog.name')}
                              autoComplete="off"
                              name="chore-name"
                              value={title}
                              placeholder={t('household.choreDialog.namePlaceholder')}
                              onChange={(event) => setTitle(event.target.value)}
                            />
                          </CardDialogSection>
                          <CardDialogSection
                            className="sm:col-span-2"
                            label={t('household.personDialog.avatarModeIcon')}
                          >
                            <ChoreIconPicker value={choreIcon} onChange={setChoreIcon} />
                          </CardDialogSection>
                          <CardDialogSection label={t('widgets.customCard.color')}>
                            <div className="flex min-h-10 items-center gap-2">
                              <ColorInputSwatch
                                mode="picker"
                                size="medium"
                                value={
                                  choreColor ||
                                  resolveChoreColorPalette(
                                    definition?.id ?? (title.trim() || 'new-chore')
                                  ).primary
                                }
                                visual={choreColor ? 'color' : 'rainbow'}
                                selected={Boolean(choreColor)}
                                ariaLabel={t('widgets.customCard.colorPicker')}
                                onChange={setChoreColor}
                              />
                              {choreColor ? (
                                <Button
                                  type="button"
                                  size="compact"
                                  variant="ghost"
                                  onClick={() => setChoreColor('')}
                                >
                                  {t('common.reset')}
                                </Button>
                              ) : null}
                            </div>
                          </CardDialogSection>
                          <CardDialogSection
                            className="sm:col-span-2"
                            label={t('household.choreDialog.instructions')}
                          >
                            <Textarea
                              aria-label={t('household.choreDialog.instructions')}
                              value={description}
                              onChange={(event) => setDescription(event.target.value)}
                            />
                          </CardDialogSection>
                          <CardDialogSection label={t('household.choreDialog.room')}>
                            <Select
                              aria-label={t('household.choreDialog.room')}
                              value={roomLabel}
                              onChange={(event) => setRoomLabel(event.target.value)}
                            >
                              <option value="">{t('household.choreDialog.noRoom')}</option>
                              {roomChoices.map((room) => (
                                <option key={room.canonicalId} value={room.canonicalId}>
                                  {room.label}
                                </option>
                              ))}
                            </Select>
                          </CardDialogSection>
                          <CardDialogSection label={t('household.choreDialog.estimatedTime')}>
                            <Input
                              aria-label={t('household.choreDialog.estimatedTime')}
                              min={0}
                              max={1440}
                              type="number"
                              value={estimatedMinutes}
                              onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
                            />
                          </CardDialogSection>
                          <CardDialogSection label={t('household.choreDialog.points')}>
                            <Input
                              aria-label={t('household.choreDialog.points')}
                              min={0}
                              max={10000}
                              type="number"
                              value={points}
                              onChange={(event) => setPoints(Number(event.target.value))}
                            />
                          </CardDialogSection>
                          <CardDialogSection label={t('household.choreDialog.childTitle')}>
                            <Input
                              aria-label={t('household.choreDialog.childTitle')}
                              value={childTitle}
                              onChange={(event) => setChildTitle(event.target.value)}
                            />
                          </CardDialogSection>
                        </ChoreFormGroup>
                      </div>
                    ) : null}

                    {editorSection === 'assignment' ? (
                      <div className="mt-7">
                        <ChoreFormGroup title={t('household.setup.choreGroupAssignment')}>
                          <CardDialogSection label={t('household.choreDialog.assignment')}>
                            <Select
                              aria-label={t('household.choreDialog.assignment')}
                              name="chore-assignment"
                              value={assignmentMode}
                              onChange={(event) =>
                                setAssignmentMode(event.target.value as ChoreAssignmentMode)
                              }
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
                          <div
                            className={cn(
                              'flex min-h-12 items-center justify-between gap-4 rounded-2xl border px-4 sm:col-span-2',
                              surface.borderStrong,
                              surface.subtleBg,
                              surface.textPrimary
                            )}
                          >
                            <span className="text-sm font-medium">
                              {t('household.choreDialog.approval')}
                            </span>
                            <Switch
                              aria-label={t('household.choreDialog.approval')}
                              checked={approvalRequired}
                              size="compact"
                              disabled={approverIds.length === 0}
                              onCheckedChange={setApprovalRequired}
                            />
                          </div>
                          {assignmentMode === 'rotation' ? (
                            <>
                              <CardDialogSection label={t('household.choreDialog.rotationReset')}>
                                <Select
                                  aria-label={t('household.choreDialog.rotationReset')}
                                  value={rotationReset}
                                  onChange={(event) =>
                                    setRotationReset(
                                      event.target.value as 'never' | 'weekly' | 'monthly'
                                    )
                                  }
                                >
                                  <option value="never">
                                    {t('household.choreDialog.rotationNever')}
                                  </option>
                                  <option value="weekly">{t('household.schedule.weekly')}</option>
                                  <option value="monthly">{t('household.schedule.monthly')}</option>
                                </Select>
                              </CardDialogSection>
                              <CardDialogSection label={t('household.choreDialog.rotationOffset')}>
                                <Input
                                  aria-label={t('household.choreDialog.rotationOffset')}
                                  min={0}
                                  type="number"
                                  value={rotationOffset}
                                  onChange={(event) =>
                                    setRotationOffset(Number(event.target.value))
                                  }
                                />
                              </CardDialogSection>
                            </>
                          ) : null}
                          {assignmentMode === 'rotation' || assignmentMode === 'everyone'
                            ? completers.map((participant) => (
                                <CardDialogSection
                                  key={participant.id}
                                  label={t('household.choreDialog.personTimes', {
                                    name: participant.displayName,
                                  })}
                                >
                                  <Input
                                    aria-label={t('household.choreDialog.personTimes', {
                                      name: participant.displayName,
                                    })}
                                    placeholder="08:00, 20:00"
                                    value={participantTimes[participant.id] ?? ''}
                                    onChange={(event) =>
                                      setParticipantTimes((current) => ({
                                        ...current,
                                        [participant.id]: event.target.value,
                                      }))
                                    }
                                  />
                                </CardDialogSection>
                              ))
                            : null}
                          <div
                            className={cn(
                              'flex min-h-12 items-center justify-between gap-4 rounded-2xl border px-4 sm:col-span-2',
                              surface.borderStrong,
                              surface.subtleBg,
                              surface.textPrimary
                            )}
                          >
                            <span className="text-sm font-medium">
                              {t('household.choreDialog.claimRequired')}
                            </span>
                            <Switch
                              aria-label={t('household.choreDialog.claimRequired')}
                              checked={claimRequired}
                              size="compact"
                              onCheckedChange={setClaimRequired}
                            />
                          </div>
                          {claimRequired ? (
                            <CardDialogSection label={t('household.choreDialog.claimExpiry')}>
                              <Input
                                aria-label={t('household.choreDialog.claimExpiry')}
                                min={1}
                                type="number"
                                value={claimExpiryMinutes}
                                onChange={(event) =>
                                  setClaimExpiryMinutes(Number(event.target.value))
                                }
                              />
                            </CardDialogSection>
                          ) : null}
                        </ChoreFormGroup>
                      </div>
                    ) : null}

                    {editorSection === 'schedule' ? (
                      <div className="mt-7">
                        <ChoreFormGroup title={t('household.setup.choreGroupSchedule')}>
                          <CardDialogSection label={t('household.choreDialog.schedule')}>
                            <Select
                              aria-label={t('household.choreDialog.schedule')}
                              name="chore-schedule"
                              value={repeatValue}
                              onChange={(event) =>
                                selectRepeat(
                                  event.target.value as
                                    | ChoreSchedule['frequency']
                                    | 'biweekly'
                                    | 'triweekly'
                                )
                              }
                            >
                              <option value="once">{t('household.schedule.once')}</option>
                              <option value="daily">{t('household.schedule.daily')}</option>
                              <option value="weekly">{t('household.schedule.weekly')}</option>
                              <option value="biweekly">{t('household.schedule.biweekly')}</option>
                              <option value="triweekly">{t('household.schedule.triweekly')}</option>
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
                          <CardDialogSection label={t('household.choreDialog.startDate')}>
                            <Input
                              aria-label={t('household.choreDialog.startDate')}
                              type="date"
                              value={scheduleStartDate}
                              onChange={(event) => setScheduleStartDate(event.target.value)}
                            />
                          </CardDialogSection>
                          {frequency !== 'once' ? (
                            <CardDialogSection label={t('household.choreDialog.endDate')}>
                              <Input
                                aria-label={t('household.choreDialog.endDate')}
                                type="date"
                                value={scheduleEndDate}
                                onChange={(event) => setScheduleEndDate(event.target.value)}
                              />
                            </CardDialogSection>
                          ) : null}
                          {frequency === 'daily' ||
                          frequency === 'weekly' ||
                          frequency === 'after_completion' ? (
                            <CardDialogSection label={t('household.choreDialog.repeatEvery')}>
                              <Input
                                aria-label={t('household.choreDialog.repeatEvery')}
                                min={1}
                                type="number"
                                value={scheduleInterval}
                                onChange={(event) =>
                                  setScheduleInterval(Number(event.target.value))
                                }
                              />
                            </CardDialogSection>
                          ) : null}
                          {frequency === 'daily' || frequency === 'weekly' ? (
                            <CardDialogSection
                              className="sm:col-span-2"
                              label={t('household.choreDialog.weekdays')}
                            >
                              <div className="flex flex-wrap gap-1.5">
                                {Array.from({ length: 7 }, (_, day) => {
                                  const selected = weeklyDays.includes(day);
                                  const label = new Intl.DateTimeFormat(undefined, {
                                    weekday: 'short',
                                  }).format(new Date(Date.UTC(2026, 7, 2 + day)));
                                  return (
                                    <Button
                                      key={day}
                                      type="button"
                                      size="compact"
                                      variant={selected ? 'secondary' : 'ghost'}
                                      className="min-h-9 min-w-9 px-2"
                                      aria-pressed={selected}
                                      onClick={() =>
                                        setWeeklyDays((current) =>
                                          selected
                                            ? current.filter((candidate) => candidate !== day)
                                            : [...current, day].sort()
                                        )
                                      }
                                    >
                                      {label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </CardDialogSection>
                          ) : null}
                          {frequency !== 'once' ? (
                            <CardDialogSection label={t('household.choreDialog.excludedDates')}>
                              <Input
                                aria-label={t('household.choreDialog.excludedDates')}
                                placeholder="2026-12-24, 2026-12-25"
                                value={excludedDates}
                                onChange={(event) => setExcludedDates(event.target.value)}
                              />
                            </CardDialogSection>
                          ) : null}
                          <CardDialogSection label={t('household.choreDialog.dueWindow')}>
                            <Input
                              aria-label={t('household.choreDialog.dueWindow')}
                              min={0}
                              step={15}
                              type="number"
                              value={dueWindowMinutes}
                              onChange={(event) => setDueWindowMinutes(Number(event.target.value))}
                            />
                          </CardDialogSection>
                        </ChoreFormGroup>
                      </div>
                    ) : null}

                    {editorSection === 'options' ? (
                      <div className="mt-7">
                        <ChoreFormGroup title={t('household.choreDialog.moreOptions')}>
                          <CardDialogSection label={t('household.choreDialog.missedGrace')}>
                            <Input
                              aria-label={t('household.choreDialog.missedGrace')}
                              min={0}
                              type="number"
                              value={missedGraceMinutes}
                              onChange={(event) =>
                                setMissedGraceMinutes(Number(event.target.value))
                              }
                            />
                          </CardDialogSection>
                          <CardDialogSection label={t('household.choreDialog.missedAction')}>
                            <Select
                              aria-label={t('household.choreDialog.missedAction')}
                              value={missedAction}
                              onChange={(event) =>
                                setMissedAction(
                                  event.target.value as 'none' | 'skip' | 'carry_forward'
                                )
                              }
                            >
                              <option value="none">{t('household.choreDialog.missedNone')}</option>
                              <option value="skip">{t('household.choreDialog.missedSkip')}</option>
                              <option value="carry_forward">
                                {t('household.choreDialog.missedCarryForward')}
                              </option>
                            </Select>
                          </CardDialogSection>
                          <div
                            className={cn(
                              'flex min-h-12 items-center justify-between gap-4 rounded-2xl border px-4 sm:col-span-2',
                              surface.borderStrong,
                              surface.subtleBg,
                              surface.textPrimary
                            )}
                          >
                            <span className="text-sm font-medium">
                              {t('household.choreDialog.reminders')}
                            </span>
                            <Switch
                              aria-label={t('household.choreDialog.reminders')}
                              checked={remindersEnabled}
                              size="compact"
                              onCheckedChange={setRemindersEnabled}
                            />
                          </div>
                          {remindersEnabled ? (
                            <>
                              <CardDialogSection label={t('household.choreDialog.remindBefore')}>
                                <Input
                                  aria-label={t('household.choreDialog.remindBefore')}
                                  min={1}
                                  type="number"
                                  value={remindBeforeMinutes}
                                  onChange={(event) =>
                                    setRemindBeforeMinutes(Number(event.target.value))
                                  }
                                />
                              </CardDialogSection>
                              <CardDialogSection label={t('household.choreDialog.overdueEvery')}>
                                <Input
                                  aria-label={t('household.choreDialog.overdueEvery')}
                                  min={1}
                                  type="number"
                                  value={overdueEveryMinutes}
                                  onChange={(event) =>
                                    setOverdueEveryMinutes(Number(event.target.value))
                                  }
                                />
                              </CardDialogSection>
                            </>
                          ) : null}
                        </ChoreFormGroup>
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'sticky bottom-0 border-t px-4 py-3 sm:px-7',
                      surface.border,
                      surface.shellPanel
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      {isCreationStepper && activeEditorIndex > 0 ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => selectEditorSection(activeEditorIndex - 1)}
                        >
                          {t('login.actions.back')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onOpenChange(false)}
                        >
                          {t('common.cancel')}
                        </Button>
                      )}
                      {isCreationStepper && activeEditorIndex < editorSections.length - 1 ? (
                        <Button type="submit" disabled={!canContinue}>
                          {t('dashboard.multiple.create.next')}
                        </Button>
                      ) : (
                        <Button type="submit" loading={saving} disabled={!canContinue}>
                          {definition
                            ? t('household.choreDialog.saveChanges')
                            : t('household.choreDialog.save')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </NavigationWorkspace.ScrollArea>
            </NavigationWorkspace.Content>
          </NavigationWorkspace.Body>
        </NavigationWorkspace.Frame>
      </form>
    </BaseCardDialog>
  );
}

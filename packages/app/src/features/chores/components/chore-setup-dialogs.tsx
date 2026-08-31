import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
} from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  ColorInputSwatch,
  coverSheetHeaderClassName,
  IconButton,
  Input,
  InteractivePill,
  MessageBar,
  ModalSurface,
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
import { ChevronDown, RotateCcw, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { resolveChoreColorPalette } from '../chore-color-palette';
import {
  ChoreCreationFormGroups,
  type ChoreCreationRepeat,
  ChoreCreationSectionOptions,
} from './chore-creation-form-groups';
import { resolveChoreIconComponent } from './chore-icon';
import { ChoreProfileAppearanceEditor } from './chore-profile-appearance-editor';

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

function hasExactlyDays(days: number[], expected: number[]) {
  return days.length === expected.length && expected.every((day) => days.includes(day));
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
                onClick={() => setCurrentStep((step) => step - 1)}
              >
                {t('login.actions.back')}
              </Button>
            ) : null}
            {currentStep < personSteps.length - 1 ? (
              <Button
                type="button"
                disabled={!name.trim()}
                onClick={() => setCurrentStep((step) => step + 1)}
              >
                {t('dashboard.multiple.create.next')}
              </Button>
            ) : (
              <Button type="submit" loading={saving} disabled={!name.trim()}>
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
    <ModalSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('household.management.title')}
      description={t('household.management.description')}
      mobileCoverSheet
      contentClassName="flex max-h-[85vh] max-w-sm flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={unlock}>
        <header
          data-card-dialog-header
          className={cn(
            coverSheetHeaderClassName,
            'shrink-0 border-b max-sm:pt-2 max-sm:pr-4',
            surface.border
          )}
        >
          <CardDialogHeader
            title={t('household.management.title')}
            description={t('household.management.description')}
            theme={theme}
            className="mb-0 max-sm:pr-0"
          />
        </header>
        <CardDialogBody className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <CardDialogSection className="mb-0" label={t('household.management.pinLabel')}>
            <Input
              autoFocus
              aria-label={t('household.management.pinLabel')}
              autoComplete="current-password"
              inputMode="numeric"
              maxLength={8}
              pattern="[0-9]{4,8}"
              type="password"
              enterKeyHint="done"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            />
          </CardDialogSection>
          {error ? (
            <p className="mt-3 text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}
          <CardDialogFooter className={`gap-2 border-t pt-4 ${surface.border}`}>
            <Button type="submit" loading={unlocking} disabled={!/^\d{4,8}$/.test(pin)}>
              {t('household.management.unlock')}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </form>
    </ModalSurface>
  );
}

export function ChoreManagementPinEditorDialog({
  configured,
  error,
  isOpen,
  onOpenChange,
  onSave,
}: {
  configured: boolean;
  error?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (pin: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPin('');
    setConfirmation('');
    setValidationError(null);
  }, [isOpen]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) {
      setValidationError(t('household.setup.pinLengthError'));
      return;
    }
    if (pin !== confirmation) {
      setValidationError(t('household.setup.pinMismatchError'));
      return;
    }

    setValidationError(null);
    setSaving(true);
    const saved = await onSave(pin);
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  const title = configured ? t('household.management.changePin') : t('household.management.setPin');
  const pinLabel = configured
    ? t('household.management.newPinLabel')
    : t('household.management.pinLabel');
  const confirmationLabel = configured
    ? t('household.management.confirmNewPinLabel')
    : t('household.setup.pinConfirmLabel');

  return (
    <ModalSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={t('household.setup.securityDescription')}
      mobileCoverSheet
      contentClassName="flex max-h-[85vh] max-w-sm flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={save}>
        <header
          data-card-dialog-header
          className={cn(
            coverSheetHeaderClassName,
            'shrink-0 border-b max-sm:pt-2 max-sm:pr-4',
            surface.border
          )}
        >
          <CardDialogHeader
            title={title}
            description={t('household.setup.securityDescription')}
            theme={theme}
            className="mb-0 max-sm:pr-0"
          />
        </header>
        <CardDialogBody className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-4">
            <CardDialogSection className="mb-0" label={pinLabel}>
              <Input
                autoFocus
                aria-label={pinLabel}
                autoComplete="new-password"
                enterKeyHint="next"
                inputMode="numeric"
                maxLength={8}
                pattern="[0-9]{4,8}"
                type="password"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, ''));
                  setValidationError(null);
                }}
              />
            </CardDialogSection>
            <CardDialogSection className="mb-0" label={confirmationLabel}>
              <Input
                aria-label={confirmationLabel}
                autoComplete="new-password"
                enterKeyHint="done"
                inputMode="numeric"
                maxLength={8}
                pattern="[0-9]{4,8}"
                type="password"
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value.replace(/\D/g, ''));
                  setValidationError(null);
                }}
              />
            </CardDialogSection>
          </div>
          {validationError || error ? (
            <p className="mt-3 text-sm text-red-500" role="alert">
              {validationError ?? error}
            </p>
          ) : null}
          <CardDialogFooter className={`gap-2 border-t pt-4 ${surface.border}`}>
            <Button
              type="submit"
              loading={saving}
              disabled={!/^\d{4,8}$/.test(pin) || !/^\d{4,8}$/.test(confirmation)}
            >
              {t('common.save')}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </form>
    </ModalSurface>
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
  const { theme } = useTheme();
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
  const [weeklyDays, setWeeklyDays] = useState<number[]>(ALL_WEEK_DAYS);
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
        definition?.schedule.frequency === 'daily'
          ? (definition.schedule.daysOfWeek ?? ALL_WEEK_DAYS)
          : definition?.schedule.frequency === 'weekly'
            ? definition.schedule.daysOfWeek
            : ALL_WEEK_DAYS
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
      setWeeklyDays(ALL_WEEK_DAYS);
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
    }
  }, [completers, definition, isOpen, presentation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || completers.length === 0) return;
    if (assignmentMode === 'person' && !participantId) return;
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
    const selectedRepeat =
      frequency === 'daily' && scheduleInterval === 1 && hasExactlyDays(weeklyDays, WEEKDAYS)
        ? 'weekdays'
        : frequency === 'daily' && scheduleInterval === 1 && hasExactlyDays(weeklyDays, WEEKENDS)
          ? 'weekends'
          : frequency === 'daily' &&
              scheduleInterval > 1 &&
              hasExactlyDays(weeklyDays, ALL_WEEK_DAYS)
            ? 'custom'
            : frequency;
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
                  daysOfWeek:
                    selectedRepeat === 'weekdays'
                      ? WEEKDAYS
                      : selectedRepeat === 'weekends'
                        ? WEEKENDS
                        : selectedRepeat === 'custom' || weeklyDays.length === 7
                          ? undefined
                          : weeklyDays,
                  intervalDays:
                    selectedRepeat === 'custom'
                      ? Math.max(2, scheduleInterval)
                      : Math.max(1, scheduleInterval),
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
  const canSave =
    title.trim().length > 0 &&
    completers.length > 0 &&
    (assignmentMode !== 'person' || participantId.length > 0);
  const repeatValue: ChoreCreationRepeat =
    frequency === 'daily' && scheduleInterval === 1 && hasExactlyDays(weeklyDays, WEEKDAYS)
      ? 'weekdays'
      : frequency === 'daily' && scheduleInterval === 1 && hasExactlyDays(weeklyDays, WEEKENDS)
        ? 'weekends'
        : frequency === 'daily' && scheduleInterval > 1 && hasExactlyDays(weeklyDays, ALL_WEEK_DAYS)
          ? 'custom'
          : frequency === 'weekly' && scheduleInterval === 2
            ? 'biweekly'
            : frequency === 'weekly' && scheduleInterval === 3
              ? 'triweekly'
              : frequency === 'weekly' && scheduleInterval === 4
                ? 'fourweekly'
                : frequency;

  const selectRepeat = (value: ChoreCreationRepeat) => {
    if (value === 'weekdays' || value === 'weekends' || value === 'custom') {
      setFrequency('daily');
      setWeeklyDays(
        value === 'weekdays' ? WEEKDAYS : value === 'weekends' ? WEEKENDS : ALL_WEEK_DAYS
      );
      setScheduleInterval(value === 'custom' ? 2 : 1);
      return;
    }

    if (value === 'biweekly' || value === 'triweekly' || value === 'fourweekly') {
      if (frequency !== 'weekly') {
        setWeeklyDays([new Date(`${scheduleStartDate || localDateKey()}T12:00:00`).getDay()]);
      }
      setFrequency('weekly');
      setScheduleInterval(value === 'biweekly' ? 2 : value === 'triweekly' ? 3 : 4);
      return;
    }

    if (value === 'daily') setWeeklyDays(ALL_WEEK_DAYS);
    if (value === 'weekly' && frequency !== 'weekly') {
      setWeeklyDays([new Date(`${scheduleStartDate || localDateKey()}T12:00:00`).getDay()]);
    }
    setFrequency(value);
    setScheduleInterval(1);
  };
  const previewColor =
    choreColor || resolveChoreColorPalette(definition?.id ?? (title.trim() || 'new-chore')).primary;
  const PreviewIcon = resolveChoreIconComponent(choreIcon);
  const selectedRoom = roomChoices.find((room) => room.canonicalId === roomLabel);
  const repeatLabel =
    repeatValue === 'once'
      ? t('household.schedule.once')
      : repeatValue === 'daily'
        ? t('household.schedule.daily')
        : repeatValue === 'weekdays'
          ? t('household.schedule.weekdays')
          : repeatValue === 'weekends'
            ? t('household.schedule.weekends')
            : repeatValue === 'weekly'
              ? t('household.schedule.weekly')
              : repeatValue === 'biweekly'
                ? t('household.schedule.biweekly')
                : repeatValue === 'triweekly'
                  ? t('household.schedule.triweekly')
                  : repeatValue === 'fourweekly'
                    ? t('household.schedule.fourWeekly')
                    : repeatValue === 'monthly'
                      ? t('household.schedule.monthly')
                      : repeatValue === 'custom'
                        ? t('household.schedule.custom')
                        : t('household.schedule.afterCompletion');

  return (
    <BaseCardDialog
      variant="fullscreen"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      theme={theme}
      contentClassName={cn(
        'md:left-1/2 md:right-auto md:w-[calc(100%-4rem)] md:max-w-[900px] md:-translate-x-1/2',
        'max-sm:!overflow-y-auto max-sm:overscroll-contain max-sm:touch-pan-y',
        'backdrop-blur-2xl',
        surface.shellPanel,
        surface.border
      )}
      shellBodyClassName="h-full min-h-0"
    >
      <form
        className="flex h-full min-h-0 flex-col max-sm:h-auto max-sm:min-h-full"
        onSubmit={submit}
      >
        <header
          className={cn(
            coverSheetHeaderClassName,
            'flex items-start justify-between gap-3 border-b sm:gap-4 sm:px-6',
            surface.border
          )}
        >
          <div className="min-w-0">
            <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
              {dialogTitle}
            </h1>
            <p className={cn('mt-1 max-w-2xl', navetTypographyTokens.body, surface.textSecondary)}>
              {dialogDescription}
            </p>
          </div>
          <IconButton
            data-cover-sheet-inline-dismiss
            variant="ghost"
            label={t('common.close')}
            icon={<X aria-hidden="true" className={navetIconSizeTokens.sm} />}
            className={cn('min-h-10 min-w-10 shrink-0', surface.subtleBg, surface.hoverBg)}
            onClick={() => onOpenChange(false)}
          />
        </header>

        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y max-sm:flex-none max-sm:overflow-visible max-sm:overscroll-auto max-sm:touch-auto">
          <main className="mx-auto w-full max-w-[50rem] px-4 py-6 sm:px-7 sm:py-8">
            <div
              className={cn(
                'mb-7 flex min-w-0 items-center gap-3 rounded-[24px] border p-3.5 sm:p-4',
                surface.subtleBg,
                surface.borderStrong
              )}
              aria-live="polite"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border"
                style={{
                  backgroundColor: `${previewColor}18`,
                  borderColor: `${previewColor}45`,
                  color: previewColor,
                }}
              >
                <PreviewIcon aria-hidden="true" className={navetIconSizeTokens.md} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-semibold', surface.textPrimary)}>
                  {title.trim() || t('household.choreDialog.namePlaceholder')}
                </p>
                <p className={cn('mt-0.5 truncate text-xs', surface.textSecondary)}>
                  {selectedRoom?.label ?? t('household.choreDialog.noRoom')}
                  <span aria-hidden="true"> · </span>
                  {repeatLabel}
                  <span aria-hidden="true"> · </span>
                  {time}
                </p>
              </div>
              <ColorInputSwatch
                mode="picker"
                size="medium"
                value={previewColor}
                visual={choreColor ? 'color' : 'rainbow'}
                selected={Boolean(choreColor)}
                ariaLabel={t('widgets.customCard.colorPicker')}
                onChange={setChoreColor}
              />
              {choreColor ? (
                <IconButton
                  variant="ghost"
                  label={t('common.reset')}
                  icon={<RotateCcw aria-hidden="true" className={navetIconSizeTokens.sm} />}
                  className="min-h-10 min-w-10 shrink-0"
                  onClick={() => setChoreColor('')}
                />
              ) : null}
            </div>

            <ChoreCreationFormGroups
              title={title}
              icon={choreIcon}
              roomId={roomLabel}
              rooms={roomChoices}
              assignmentMode={assignmentMode}
              participantId={participantId}
              participants={completers}
              repeat={repeatValue}
              dueTime={time}
              startDate={scheduleStartDate}
              endDate={scheduleEndDate}
              interval={scheduleInterval}
              excludedDates={excludedDates}
              showTemplates={!definition}
              onTitleChange={setTitle}
              onIconChange={setChoreIcon}
              onRoomChange={setRoomLabel}
              onAssignmentModeChange={setAssignmentMode}
              onParticipantChange={setParticipantId}
              onRepeatChange={selectRepeat}
              onDueTimeChange={setTime}
              onStartDateChange={setScheduleStartDate}
              onEndDateChange={setScheduleEndDate}
              onIntervalChange={setScheduleInterval}
              onExcludedDatesChange={setExcludedDates}
            >
              <ChoreCreationSectionOptions section="details">
                <CardDialogSection
                  className="mb-0 sm:col-span-2"
                  label={t('household.choreDialog.instructions')}
                >
                  <Textarea
                    aria-label={t('household.choreDialog.instructions')}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </CardDialogSection>
                <CardDialogSection
                  className="mb-0"
                  label={t('household.choreDialog.estimatedTime')}
                >
                  <Input
                    aria-label={t('household.choreDialog.estimatedTime')}
                    min={0}
                    max={1440}
                    type="number"
                    value={estimatedMinutes}
                    onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
                  />
                </CardDialogSection>
                <CardDialogSection className="mb-0" label={t('household.choreDialog.points')}>
                  <Input
                    aria-label={t('household.choreDialog.points')}
                    min={0}
                    max={10000}
                    type="number"
                    value={points}
                    onChange={(event) => setPoints(Number(event.target.value))}
                  />
                </CardDialogSection>
                <CardDialogSection className="mb-0" label={t('household.choreDialog.childTitle')}>
                  <Input
                    aria-label={t('household.choreDialog.childTitle')}
                    value={childTitle}
                    onChange={(event) => setChildTitle(event.target.value)}
                  />
                </CardDialogSection>
              </ChoreCreationSectionOptions>
              <ChoreCreationSectionOptions section="assignment">
                <div
                  className={cn(
                    'flex min-h-12 items-center justify-between gap-4 rounded-2xl border px-4 sm:col-span-2',
                    surface.borderStrong,
                    surface.panelMuted,
                    surface.textPrimary
                  )}
                >
                  <span className="text-sm font-medium">{t('household.choreDialog.approval')}</span>
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
                    <CardDialogSection
                      className="mb-0"
                      label={t('household.choreDialog.rotationReset')}
                    >
                      <Select
                        aria-label={t('household.choreDialog.rotationReset')}
                        value={rotationReset}
                        onChange={(event) =>
                          setRotationReset(event.target.value as 'never' | 'weekly' | 'monthly')
                        }
                      >
                        <option value="never">{t('household.choreDialog.rotationNever')}</option>
                        <option value="weekly">{t('household.schedule.weekly')}</option>
                        <option value="monthly">{t('household.schedule.monthly')}</option>
                      </Select>
                    </CardDialogSection>
                    <CardDialogSection
                      className="mb-0"
                      label={t('household.choreDialog.rotationOffset')}
                    >
                      <Input
                        aria-label={t('household.choreDialog.rotationOffset')}
                        min={0}
                        type="number"
                        value={rotationOffset}
                        onChange={(event) => setRotationOffset(Number(event.target.value))}
                      />
                    </CardDialogSection>
                  </>
                ) : null}
                {assignmentMode === 'rotation' || assignmentMode === 'everyone'
                  ? completers.map((participant) => (
                      <CardDialogSection
                        key={participant.id}
                        className="mb-0"
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
                    surface.panelMuted,
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
                  <CardDialogSection
                    className="mb-0"
                    label={t('household.choreDialog.claimExpiry')}
                  >
                    <Input
                      aria-label={t('household.choreDialog.claimExpiry')}
                      min={1}
                      type="number"
                      value={claimExpiryMinutes}
                      onChange={(event) => setClaimExpiryMinutes(Number(event.target.value))}
                    />
                  </CardDialogSection>
                ) : null}
              </ChoreCreationSectionOptions>
              <ChoreCreationSectionOptions section="schedule">
                <CardDialogSection className="mb-0" label={t('household.choreDialog.dueWindow')}>
                  <Input
                    aria-label={t('household.choreDialog.dueWindow')}
                    min={0}
                    step={15}
                    type="number"
                    value={dueWindowMinutes}
                    onChange={(event) => setDueWindowMinutes(Number(event.target.value))}
                  />
                </CardDialogSection>
                <CardDialogSection className="mb-0" label={t('household.choreDialog.missedGrace')}>
                  <Input
                    aria-label={t('household.choreDialog.missedGrace')}
                    min={0}
                    type="number"
                    value={missedGraceMinutes}
                    onChange={(event) => setMissedGraceMinutes(Number(event.target.value))}
                  />
                </CardDialogSection>
                <CardDialogSection className="mb-0" label={t('household.choreDialog.missedAction')}>
                  <Select
                    aria-label={t('household.choreDialog.missedAction')}
                    value={missedAction}
                    onChange={(event) =>
                      setMissedAction(event.target.value as 'none' | 'skip' | 'carry_forward')
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
                    surface.panelMuted,
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
                    <CardDialogSection
                      className="mb-0"
                      label={t('household.choreDialog.remindBefore')}
                    >
                      <Input
                        aria-label={t('household.choreDialog.remindBefore')}
                        min={1}
                        type="number"
                        value={remindBeforeMinutes}
                        onChange={(event) => setRemindBeforeMinutes(Number(event.target.value))}
                      />
                    </CardDialogSection>
                    <CardDialogSection
                      className="mb-0"
                      label={t('household.choreDialog.overdueEvery')}
                    >
                      <Input
                        aria-label={t('household.choreDialog.overdueEvery')}
                        min={1}
                        type="number"
                        value={overdueEveryMinutes}
                        onChange={(event) => setOverdueEveryMinutes(Number(event.target.value))}
                      />
                    </CardDialogSection>
                  </>
                ) : null}
              </ChoreCreationSectionOptions>
            </ChoreCreationFormGroups>
          </main>
        </div>

        <footer className={cn('border-t px-4 py-3 sm:px-6', surface.border, surface.shellPanel)}>
          <div className="mx-auto flex w-full max-w-[50rem] items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving} disabled={!canSave}>
              {definition
                ? t('household.choreDialog.saveChanges')
                : t('household.choreDialog.save')}
            </Button>
          </div>
        </footer>
      </form>
    </BaseCardDialog>
  );
}

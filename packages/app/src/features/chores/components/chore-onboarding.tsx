import { CardDialogSection, NavigationWorkspace } from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  coverSheetHeaderClassName,
  IconButton,
  Input,
  MessageBar,
  Select,
  Switch,
} from '@navet/app/components/primitives';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@navet/app/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@navet/app/components/ui/avatar';
import { cn } from '@navet/app/components/ui/utils';
import { isEmojiLightIcon, resolveLightIconComponent } from '@navet/app/constants/icon-map';
import { useI18n, useTheme } from '@navet/app/hooks';
import { prepareAvatarImageDataUrl, validateImageFile } from '@navet/app/utils/image-upload';
import type {
  ChoreExperienceState,
  ChoreGamificationMode,
  ChorePresentationMetadata,
  ChoreRewardGoal,
} from '@navet/core/chore-experience';
import {
  type ChoreInterchangeDocument,
  parseChoreInterchangeDocument,
} from '@navet/core/chore-interchange';
import type {
  ChoreAssignmentMode,
  ChoreDefinition,
  ChoreParticipant,
  ChoreSchedule,
} from '@navet/core/chores';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Gift,
  ListChecks,
  type LucideIcon,
  Plus,
  Repeat2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ChoreCreationFormGroups, type ChoreCreationRepeat } from './chore-creation-form-groups';
import { resolveChoreIconComponent } from './chore-icon';
import { ChoreProfileAppearanceEditor } from './chore-profile-appearance-editor';
import { ChoreManagementPinDialog } from './chore-setup-dialogs';

type SetupStepId = 'person' | 'customize' | 'chores' | 'rewards' | 'security' | 'ready';
type SetupParticipantRole = 'member' | 'manager';
type SetupRepeat = ChoreCreationRepeat;

interface SetupStep {
  id: SetupStepId;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface ChoreOnboardingDialogProps {
  isOpen: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  participants: ChoreParticipant[];
  definitions: ChoreDefinition[];
  experience: ChoreExperienceState;
  rooms: Array<{ canonicalId: string; label: string }>;
  onSaveParticipant: (participant: ChoreParticipant) => Promise<boolean>;
  onSaveChore: (
    definition: ChoreDefinition,
    presentation: ChorePresentationMetadata
  ) => Promise<boolean>;
  onRemoveChore: (definition: ChoreDefinition) => Promise<boolean>;
  onSaveRewards: (mode: ChoreGamificationMode, reward?: ChoreRewardGoal) => Promise<boolean>;
  onConfigurePin: (actorParticipantId: string, pin: string) => Promise<boolean>;
  managementPinConfigured?: boolean;
  managementUnlocked?: boolean;
  managementError?: string | null;
  onUnlockManagement?: (pin: string) => Promise<boolean>;
  onComplete: () => Promise<boolean>;
}

function createSetupId(prefix: string, label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `${prefix}:${slug || 'item'}:${Date.now().toString(36)}`;
}

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function SetupFeature({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border',
          surface.iconBg,
          surface.borderStrong,
          surface.textPrimary
        )}
      >
        <Icon aria-hidden="true" className={navetIconSizeTokens.md} />
      </span>
      <div className="min-w-0 pt-0.5">
        <h3 className={cn(navetTypographyTokens.titleSm, surface.textPrimary)}>{title}</h3>
        <p className={cn('mt-1', navetTypographyTokens.compactHelper, surface.textSecondary)}>
          {description}
        </p>
      </div>
    </div>
  );
}

function AvatarFallbackIdentity({
  avatarIcon,
  displayName,
  iconClassName,
}: {
  avatarIcon?: string;
  displayName: string;
  iconClassName: string;
}) {
  const Icon = avatarIcon ? resolveLightIconComponent(avatarIcon) : null;
  return Icon ? (
    <Icon aria-hidden="true" className={iconClassName} />
  ) : avatarIcon && isEmojiLightIcon(avatarIcon) ? (
    <span aria-hidden="true">{avatarIcon.trim()}</span>
  ) : (
    displayName.slice(0, 2).toUpperCase()
  );
}

export function ChoreOnboardingWelcome({
  onStart,
  onRestoreBackup,
  restoreError,
}: {
  onStart: () => void;
  onRestoreBackup: (input: {
    actorParticipantId: string;
    document: ChoreInterchangeDocument;
  }) => Promise<boolean>;
  restoreError?: string | null;
}) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<{
    actorParticipantId: string;
    document: ChoreInterchangeDocument;
  } | null>(null);
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const features = [
    {
      title: t('household.setup.featureAssignTitle'),
      description: t('household.setup.featureAssignDescription'),
      icon: UsersRound,
    },
    {
      title: t('household.setup.featureRepeatTitle'),
      description: t('household.setup.featureRepeatDescription'),
      icon: Repeat2,
    },
    {
      title: t('household.setup.featureRewardTitle'),
      description: t('household.setup.featureRewardDescription'),
      icon: ListChecks,
    },
  ];

  const readBackup = async (file: File | undefined) => {
    if (!file) return;
    setBackupFeedback(null);
    setRestoreFailed(false);
    try {
      const document = parseChoreInterchangeDocument(JSON.parse(await file.text()) as unknown);
      const manager = Object.values(document.workspace.participantsById).find(
        (participant) => !participant.pausedAt && participant.capabilities.includes('manage')
      );
      if (!manager) throw new Error('Backup does not contain an active household manager');
      setPendingBackup({ actorParticipantId: manager.id, document });
    } catch {
      setBackupFeedback(t('household.data.invalidBackup'));
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  return (
    <>
      <section
        aria-labelledby="chore-setup-welcome-title"
        className={cn(
          'relative mx-auto flex min-h-[32rem] max-w-5xl items-center overflow-hidden rounded-[28px] border px-5 py-8 sm:px-8 lg:px-12',
          surface.shellPanel,
          surface.border,
          surface.cardShadow
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: accentColor }}
        />
        <div className="relative grid w-full gap-9 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,1.05fr)] lg:items-center lg:gap-12">
          <div className="min-w-0">
            <span
              className={cn(
                'mb-5 flex h-12 w-12 items-center justify-center rounded-[20px] border',
                surface.iconBg,
                surface.borderStrong,
                surface.textPrimary
              )}
            >
              <ClipboardCheck aria-hidden="true" className={navetIconSizeTokens.lg} />
            </span>
            <h1
              id="chore-setup-welcome-title"
              className={cn(
                'max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl',
                surface.textPrimary
              )}
            >
              {t('household.setup.welcomeTitle')}
            </h1>
            <p
              className={cn(
                'mt-4 max-w-xl text-base leading-7 sm:text-lg sm:leading-8',
                surface.textSecondary
              )}
            >
              {t('household.setup.welcomeDescription')}
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                className="h-11 min-h-11 motion-reduce:transition-none"
                trailing={<ArrowRight aria-hidden="true" className={navetIconSizeTokens.sm} />}
                onClick={onStart}
              >
                {t('household.setup.start')}
              </Button>
              <Button
                variant="secondary"
                className="h-11 min-h-11 motion-reduce:transition-none"
                leading={<Upload aria-hidden="true" className={navetIconSizeTokens.sm} />}
                onClick={() => backupInputRef.current?.click()}
              >
                {t('household.data.import')}
              </Button>
            </div>
            <input
              ref={backupInputRef}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              aria-label={t('household.data.import')}
              onChange={(event) => void readBackup(event.target.files?.[0])}
            />
            {backupFeedback ? (
              <p
                className={cn(
                  'mt-3 max-w-xl rounded-xl px-3 py-2 text-xs',
                  surface.subtleBg,
                  surface.textSecondary
                )}
                role="status"
              >
                {backupFeedback}
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              'rounded-[24px] border p-5 sm:p-7 lg:p-8',
              surface.subtleBg,
              surface.borderStrong
            )}
          >
            <h2 className={cn(navetTypographyTokens.titleSm, surface.textPrimary)}>
              {t('household.setup.benefitsTitle')}
            </h2>
            <div className="mt-6 grid gap-6">
              {features.map((feature) => (
                <SetupFeature key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <AlertDialog
        open={pendingBackup !== null}
        onOpenChange={(open) => {
          if (!open && !restoringBackup) setPendingBackup(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('household.data.importTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('household.setup.restoreDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {restoreFailed ? (
            <MessageBar tone="error" title={t('household.error.title')}>
              {restoreError ?? t('household.error.description')}
            </MessageBar>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-10" disabled={restoringBackup}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <Button
              className="min-h-10"
              disabled={restoringBackup}
              onClick={async () => {
                if (!pendingBackup) return;
                setRestoringBackup(true);
                const saved = await onRestoreBackup(pendingBackup);
                setRestoringBackup(false);
                setRestoreFailed(!saved);
                if (saved) setPendingBackup(null);
              }}
            >
              {t('household.data.import')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StepPanel({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="flex min-h-full flex-col">
      <div className="w-full flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
        <p className={cn(navetTypographyTokens.eyebrow, surface.textMuted)}>{eyebrow}</p>
        <h2 className={cn('mt-2', navetTypographyTokens.pageHeading, surface.textPrimary)}>
          {title}
        </h2>
        <p className={cn('mt-2 max-w-2xl', navetTypographyTokens.body, surface.textSecondary)}>
          {description}
        </p>
        <div className="mt-7">{children}</div>
      </div>
      <div
        className={cn(
          'sticky bottom-0 border-t px-4 py-3 sm:px-7',
          surface.border,
          surface.shellPanel
        )}
      >
        <div className="flex w-full items-center justify-between gap-3">{footer}</div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <Button
      variant="secondary"
      leading={<ArrowLeft aria-hidden="true" className={navetIconSizeTokens.sm} />}
      onClick={onClick}
    >
      {t('login.actions.back')}
    </Button>
  );
}

export function ChoreOnboardingDialog({
  isOpen,
  error,
  onOpenChange,
  participants,
  definitions,
  experience,
  rooms,
  onSaveParticipant,
  onSaveChore,
  onRemoveChore,
  onSaveRewards,
  onConfigurePin,
  managementPinConfigured = false,
  managementUnlocked = false,
  managementError,
  onUnlockManagement,
  onComplete,
}: ChoreOnboardingDialogProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const motivationModeDescriptions: Record<ChoreGamificationMode, string> = {
    off: t('household.settings.mode.offDescription'),
    light: t('household.settings.mode.lightDescription'),
    family: t('household.settings.mode.familyDescription'),
    adventure: t('household.settings.mode.adventureDescription'),
  };
  const steps = useMemo<SetupStep[]>(
    () => [
      {
        id: 'person',
        label: t('household.members.title'),
        description: t('household.setup.stepPeopleDescription'),
        icon: UserRound,
      },
      {
        id: 'customize',
        label: t('household.setup.stepProfiles'),
        description: t('household.setup.stepProfilesDescription'),
        icon: SlidersHorizontal,
      },
      {
        id: 'chores',
        label: t('household.tabs.chores'),
        description: t('household.setup.stepChoresDescription'),
        icon: ListChecks,
      },
      {
        id: 'rewards',
        label: t('household.setup.stepMotivation'),
        description: t('household.setup.stepMotivationDescription'),
        icon: Gift,
      },
      {
        id: 'security',
        label: t('household.setup.stepProtection'),
        description: t('household.setup.stepProtectionDescription'),
        icon: ShieldCheck,
      },
      {
        id: 'ready',
        label: t('household.setup.stepReady'),
        description: t('household.setup.stepReadyDescription'),
        icon: Check,
      },
    ],
    [t]
  );
  const firstManager =
    participants.find((participant) => participant.capabilities.includes('manage')) ??
    participants[0];
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [setupRoster, setSetupRoster] = useState<ChoreParticipant[]>([]);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonRole, setNewPersonRole] = useState<SetupParticipantRole>('manager');
  const [participantId, setParticipantId] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState(themeColorValues.orange);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarIcon, setAvatarIcon] = useState('');
  const [avatarUploadError, setAvatarUploadError] = useState('');
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [choreTitle, setChoreTitle] = useState('');
  const [choreIcon, setChoreIcon] = useState('ListChecks');
  const [addingChore, setAddingChore] = useState(false);
  const [choreAssignmentMode, setChoreAssignmentMode] = useState<ChoreAssignmentMode>('person');
  const [choreParticipantId, setChoreParticipantId] = useState('');
  const [repeat, setRepeat] = useState<SetupRepeat>('daily');
  const [dueTime, setDueTime] = useState('18:00');
  const [scheduleStartDate, setScheduleStartDate] = useState(localDateKey());
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleInterval, setScheduleInterval] = useState(1);
  const [excludedDates, setExcludedDates] = useState('');
  const [roomId, setRoomId] = useState('');
  const [points, setPoints] = useState(10);
  const [mode, setMode] = useState<ChoreGamificationMode>('off');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardTarget, setRewardTarget] = useState(100);
  const [managementPin, setManagementPin] = useState('');
  const [managementPinConfirmation, setManagementPinConfirmation] = useState('');
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);
  const [managementPinDialogOpen, setManagementPinDialogOpen] = useState(false);
  const wasOpenRef = useRef(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const activeStepButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    const initialStep = participants.length === 0 ? 0 : definitions.length === 0 ? 2 : 3;
    const existingReward = Object.values(experience.rewardGoalsById)[0];
    setStepIndex(initialStep);
    setFurthestStep(initialStep);
    setSetupRoster(participants);
    setAddingPerson(false);
    setAddingChore(false);
    setManagementPinDialogOpen(false);
    setNewPersonRole(participants.length === 0 ? 'manager' : 'member');
    setParticipantId(firstManager?.id ?? '');
    setName(firstManager?.displayName ?? '');
    setColor(firstManager?.color ?? themeColorValues.orange);
    setAvatarUrl(firstManager?.avatarUrl ?? '');
    setAvatarIcon(firstManager?.avatarIcon ?? '');
    setAvatarUploadError('');
    setAvatarProcessing(false);
    setRemindersEnabled(firstManager?.reminderPreferences?.enabled ?? true);
    setQuietStart(firstManager?.reminderPreferences?.quietHours?.start ?? '21:00');
    setQuietEnd(firstManager?.reminderPreferences?.quietHours?.end ?? '07:00');
    setChoreParticipantId(firstManager?.id ?? '');
    setChoreAssignmentMode('person');
    setRepeat('daily');
    setDueTime('18:00');
    setScheduleStartDate(localDateKey());
    setScheduleEndDate('');
    setScheduleInterval(1);
    setExcludedDates('');
    setMode(experience.gamificationMode);
    setRewardTitle(existingReward?.title ?? '');
    setRewardTarget(existingReward?.targetPoints ?? 100);
    setManagementPin('');
    setManagementPinConfirmation('');
    setPinError('');
    setSaving(false);
  }, [definitions.length, experience, firstManager, isOpen, participants.length]);

  useEffect(() => {
    activeStepButtonRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
    });
  }, [stepIndex]);

  useEffect(() => {
    if (!choreParticipantId && setupRoster[0]) {
      setChoreParticipantId(setupRoster[0].id);
    }
  }, [choreParticipantId, setupRoster]);

  const moveTo = (index: number) => {
    setStepIndex(index);
    setFurthestStep((current) => Math.max(current, index));
  };

  const loadParticipantForCustomization = (participant: ChoreParticipant) => {
    setParticipantId(participant.id);
    setName(participant.displayName);
    setColor(participant.color ?? themeColorValues.orange);
    setAvatarUrl(participant.avatarUrl ?? '');
    setAvatarIcon(participant.avatarIcon ?? '');
    setAvatarUploadError('');
    setRemindersEnabled(participant.reminderPreferences?.enabled ?? true);
    setQuietStart(participant.reminderPreferences?.quietHours?.start ?? '21:00');
    setQuietEnd(participant.reminderPreferences?.quietHours?.end ?? '07:00');
  };

  const applyCurrentCustomization = (roster: ChoreParticipant[]) =>
    roster.map((participant) =>
      participant.id === participantId
        ? {
            ...participant,
            color,
            avatarUrl: avatarUrl.trim() || undefined,
            avatarIcon: avatarIcon.trim() || undefined,
            reminderPreferences: {
              enabled: remindersEnabled,
              quietHours: { start: quietStart, end: quietEnd },
              destination: { type: 'in_app' as const },
            },
            updatedAt: new Date().toISOString(),
          }
        : participant
    );

  const selectParticipantForCustomization = (id: string) => {
    const nextRoster = applyCurrentCustomization(setupRoster);
    const nextParticipant = nextRoster.find((participant) => participant.id === id);
    setSetupRoster(nextRoster);
    if (nextParticipant) loadParticipantForCustomization(nextParticipant);
  };

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

  const addPerson = () => {
    const displayName = name.trim();
    if (!displayName) return;
    const timestamp = new Date().toISOString();
    const id = createSetupId('participant', displayName);
    const participant: ChoreParticipant = {
      id,
      displayName,
      color: setupRoster.length === 0 ? themeColorValues.orange : undefined,
      capabilities: newPersonRole === 'manager' ? ['complete', 'approve', 'manage'] : ['complete'],
      reminderPreferences: {
        enabled: true,
        quietHours: { start: '21:00', end: '07:00' },
        destination: { type: 'in_app' },
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setSetupRoster((current) => [...current, participant]);
    setName('');
    setAddingPerson(false);
    setNewPersonRole('member');
    setParticipantId(id);
  };

  const startAddingPerson = () => {
    setName('');
    setNewPersonRole(setupRoster.length === 0 ? 'manager' : 'member');
    setAddingPerson(true);
  };

  const cancelAddingPerson = () => {
    setName('');
    setNewPersonRole(setupRoster.length === 0 ? 'manager' : 'member');
    setAddingPerson(false);
  };

  const setSetupParticipantRole = (id: string, role: SetupParticipantRole) => {
    const timestamp = new Date().toISOString();
    setSetupRoster((current) =>
      current.map((participant) =>
        participant.id === id
          ? {
              ...participant,
              capabilities: role === 'manager' ? ['complete', 'approve', 'manage'] : ['complete'],
              updatedAt: timestamp,
            }
          : participant
      )
    );
  };

  const removeSetupPerson = (id: string) => {
    const nextRoster = setupRoster.filter((participant) => participant.id !== id);
    const fallbackId = nextRoster[0]?.id ?? '';

    setSetupRoster(nextRoster);
    if (participantId === id) setParticipantId(fallbackId);
  };

  const saveSetupRosterAndContinue = async () => {
    const hasManager = setupRoster.some((participant) =>
      participant.capabilities.includes('manage')
    );
    if (setupRoster.length === 0 || !hasManager) return;

    const existingById = new Map(participants.map((participant) => [participant.id, participant]));
    const changedParticipants = setupRoster.filter((participant) => {
      const existing = existingById.get(participant.id);
      if (!existing) return true;
      return (
        existing.capabilities.includes('manage') !== participant.capabilities.includes('manage')
      );
    });
    const managersFirst = [...changedParticipants].sort(
      (left, right) =>
        Number(right.capabilities.includes('manage')) - Number(left.capabilities.includes('manage'))
    );

    setSaving(true);
    for (const participant of managersFirst) {
      const saved = await onSaveParticipant(participant);
      if (!saved) {
        setSaving(false);
        return;
      }
    }
    setSaving(false);

    const participant = setupRoster[0];
    if (participant) loadParticipantForCustomization(participant);
    moveTo(1);
  };

  const savePersonCustomization = async () => {
    const nextRoster = applyCurrentCustomization(setupRoster);
    if (!nextRoster.some((participant) => participant.id === participantId)) return false;
    setSetupRoster(nextRoster);
    setSaving(true);
    for (const participant of nextRoster) {
      const saved = await onSaveParticipant(participant);
      if (!saved) {
        setSaving(false);
        return false;
      }
    }
    setSaving(false);
    return true;
  };

  const resetChoreForm = () => {
    setChoreTitle('');
    setChoreIcon('ListChecks');
    setChoreAssignmentMode('person');
    setRepeat('daily');
    setDueTime('18:00');
    setScheduleStartDate(localDateKey());
    setScheduleEndDate('');
    setScheduleInterval(1);
    setExcludedDates('');
    setRoomId('');
    setPoints(10);
  };

  const selectSetupRepeat = (value: SetupRepeat) => {
    setRepeat(value);
    setScheduleInterval(
      value === 'biweekly' ? 2 : value === 'triweekly' ? 3 : value === 'custom' ? 2 : 1
    );
  };

  const saveChore = async () => {
    const title = choreTitle.trim();
    if (!title) return;
    const timestamp = new Date().toISOString();
    const selectedRoom = rooms.find((room) => room.canonicalId === roomId);
    const completers = setupRoster.filter((participant) =>
      participant.capabilities.includes('complete')
    );
    const selectedParticipant =
      completers.find((participant) => participant.id === choreParticipantId) ?? completers[0];
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const startDate = scheduleStartDate || localDateKey();
    const startDateValue = new Date(`${startDate}T12:00:00`);
    const scheduleOptions = {
      endDate: repeat === 'once' ? undefined : scheduleEndDate || undefined,
      excludedDates:
        repeat === 'once'
          ? undefined
          : excludedDates
              .split(',')
              .map((value) => value.trim())
              .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
    };
    const schedule: ChoreSchedule =
      repeat === 'once'
        ? {
            frequency: 'once',
            date: startDate,
            time: dueTime,
            timeZone,
          }
        : repeat === 'weekdays' || repeat === 'weekends'
          ? {
              frequency: 'daily',
              startDate,
              time: dueTime,
              timeZone,
              daysOfWeek: repeat === 'weekdays' ? [1, 2, 3, 4, 5] : [0, 6],
              intervalDays: 1,
              ...scheduleOptions,
            }
          : repeat === 'custom'
            ? {
                frequency: 'daily',
                startDate,
                time: dueTime,
                timeZone,
                intervalDays: Math.max(2, scheduleInterval),
                ...scheduleOptions,
              }
            : repeat === 'weekly' || repeat === 'biweekly' || repeat === 'triweekly'
              ? {
                  frequency: 'weekly',
                  startDate,
                  time: dueTime,
                  timeZone,
                  daysOfWeek: [startDateValue.getDay()],
                  intervalWeeks:
                    repeat === 'biweekly'
                      ? 2
                      : repeat === 'triweekly'
                        ? 3
                        : Math.max(1, scheduleInterval),
                  ...scheduleOptions,
                }
              : repeat === 'monthly'
                ? {
                    frequency: 'monthly',
                    startDate,
                    time: dueTime,
                    timeZone,
                    dayOfMonth: startDateValue.getDate(),
                    ...scheduleOptions,
                  }
                : repeat === 'after_completion'
                  ? {
                      frequency: 'after_completion',
                      startDate,
                      time: dueTime,
                      timeZone,
                      intervalDays: Math.max(1, scheduleInterval),
                      ...scheduleOptions,
                    }
                  : {
                      frequency: 'daily',
                      startDate,
                      time: dueTime,
                      timeZone,
                      intervalDays: Math.max(1, scheduleInterval),
                      ...scheduleOptions,
                    };
    setSaving(true);
    const saved = await onSaveChore(
      {
        id: createSetupId('chore', title),
        title,
        roomRef: selectedRoom,
        enabled: true,
        assignment: {
          mode: selectedParticipant ? choreAssignmentMode : 'anyone',
          participantIds:
            selectedParticipant && choreAssignmentMode === 'person'
              ? [selectedParticipant.id]
              : completers.map((participant) => participant.id),
          rotationReset: choreAssignmentMode === 'rotation' ? 'never' : undefined,
          rotationCursor: choreAssignmentMode === 'rotation' ? 0 : undefined,
        },
        schedule,
        dueWindowMinutes: 120,
        approval: { required: false, approverIds: [] },
        missedPolicy: { graceMinutes: 60, action: 'none' },
        reminderPolicy: {
          enabled: remindersEnabled,
          beforeDueMinutes: [30],
          atDue: true,
          overdueEveryMinutes: 60,
          maxOverdueReminders: 3,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        estimatedMinutes: 5,
        points: points > 0 ? Math.round(points) : undefined,
        icon: choreIcon,
      }
    );
    setSaving(false);
    if (saved) {
      resetChoreForm();
      setAddingChore(false);
    }
  };

  const removeChore = async (definition: ChoreDefinition) => {
    setSaving(true);
    await onRemoveChore(definition);
    setSaving(false);
  };

  const saveRewardsAndContinue = async () => {
    const normalizedTitle = rewardTitle.trim();
    const timestamp = new Date().toISOString();
    const reward =
      mode !== 'off' && normalizedTitle
        ? {
            id:
              Object.values(experience.rewardGoalsById)[0]?.id ??
              createSetupId('reward', normalizedTitle),
            title: normalizedTitle,
            type: 'family' as const,
            targetPoints: Math.max(1, Math.round(rewardTarget)),
            enabled: true,
            createdAt: Object.values(experience.rewardGoalsById)[0]?.createdAt ?? timestamp,
            updatedAt: timestamp,
          }
        : undefined;
    setSaving(true);
    const saved = await onSaveRewards(mode, reward);
    setSaving(false);
    if (saved) moveTo(4);
  };

  const saveManagementPin = async () => {
    const managerParticipant =
      participants.find(
        (participant) =>
          participant.id === participantId && participant.capabilities.includes('manage')
      ) ?? participants.find((participant) => participant.capabilities.includes('manage'));
    if (!managerParticipant) return;
    if (!/^\d{4,8}$/.test(managementPin)) {
      setPinError(t('household.setup.pinLengthError'));
      return;
    }
    if (managementPin !== managementPinConfirmation) {
      setPinError(t('household.setup.pinMismatchError'));
      return;
    }
    setPinError('');
    setSaving(true);
    const saved = await onConfigurePin(managerParticipant.id, managementPin);
    setSaving(false);
    if (saved) moveTo(5);
  };

  const finishSetupNow = async () => {
    setSaving(true);
    const saved = await onComplete();
    setSaving(false);
    if (saved) onOpenChange(false);
    return saved;
  };

  const finishSetup = async () => {
    if (managementPinConfigured && !managementUnlocked && onUnlockManagement) {
      setManagementPinDialogOpen(true);
      return;
    }
    await finishSetupNow();
  };

  useEffect(() => {
    if (
      isOpen &&
      managementPinConfigured &&
      !managementUnlocked &&
      onUnlockManagement &&
      error?.startsWith('Unlock chore management')
    ) {
      setManagementPinDialogOpen(true);
    }
  }, [error, isOpen, managementPinConfigured, managementUnlocked, onUnlockManagement]);

  const currentStep = steps[stepIndex] ?? steps[0];

  return (
    <Fragment key="chore-onboarding-dialog">
      <BaseCardDialog
        variant="fullscreen"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={t('household.setup.dialogTitle')}
        description={t('household.setup.dialogDescription')}
        theme={theme}
        contentClassName={cn(
          'md:left-1/2 md:right-auto md:w-[calc(100%-4rem)] md:max-w-[1200px] md:-translate-x-1/2',
          'backdrop-blur-2xl',
          surface.shellPanel,
          surface.border
        )}
        shellBodyClassName="h-full min-h-0"
      >
        <NavigationWorkspace.Frame
          aria-label={t('household.setup.dialogTitle')}
          className="h-full min-h-0 rounded-none border-0 bg-transparent shadow-none"
        >
          <NavigationWorkspace.Header
            className={cn(
              coverSheetHeaderClassName,
              'flex items-start justify-between gap-3 sm:gap-4'
            )}
          >
            <div className="min-w-0">
              <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
                {t('household.setup.dialogTitle')}
              </h1>
              <p className={cn('mt-1', navetTypographyTokens.body, surface.textSecondary)}>
                {t('household.setup.dialogDescription')}
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
          </NavigationWorkspace.Header>
          <NavigationWorkspace.Body className="grid-rows-[minmax(0,1fr)] md:grid-cols-[16rem_minmax(0,1fr)] md:grid-rows-1">
            <NavigationWorkspace.Sidebar className="scrollbar-hide hidden p-4 md:block md:overflow-y-auto">
              <nav aria-label={t('household.setup.progressLabel')} className="grid min-w-0 gap-1">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const active = index === stepIndex;
                  const disabled = index > furthestStep;
                  return (
                    <NavigationWorkspace.Item
                      key={step.id}
                      active={active}
                      accentColor={accentColor}
                      className="w-auto"
                    >
                      <NavigationWorkspace.ItemButton
                        ref={active ? activeStepButtonRef : undefined}
                        aria-current={active ? 'step' : undefined}
                        disabled={disabled}
                        className="!items-start py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setStepIndex(index)}
                      >
                        <NavigationWorkspace.ItemIcon>
                          <Icon className={navetIconSizeTokens.sm} />
                        </NavigationWorkspace.ItemIcon>
                        <NavigationWorkspace.ItemText
                          title={step.label}
                          description={step.description}
                          descriptionClassName="!overflow-visible !text-clip !whitespace-normal break-words leading-4"
                        />
                      </NavigationWorkspace.ItemButton>
                    </NavigationWorkspace.Item>
                  );
                })}
              </nav>
            </NavigationWorkspace.Sidebar>
            <NavigationWorkspace.Content>
              <NavigationWorkspace.ScrollArea className="scrollbar-hide">
                {error ? (
                  <div className="px-5 pt-5 md:px-8 md:pt-8">
                    <MessageBar tone="error" title={t('household.error.title')}>
                      {error}
                    </MessageBar>
                  </div>
                ) : null}
                {currentStep.id === 'person' ? (
                  <StepPanel
                    eyebrow={t('household.setup.stepCount', { current: 1, total: steps.length })}
                    title={t('household.setup.personTitle')}
                    description={t('household.setup.personDescription')}
                    footer={
                      <>
                        <span />
                        <Button
                          loading={saving}
                          disabled={
                            setupRoster.length === 0 ||
                            !setupRoster.some((participant) =>
                              participant.capabilities.includes('manage')
                            )
                          }
                          trailing={
                            <ArrowRight aria-hidden="true" className={navetIconSizeTokens.sm} />
                          }
                          onClick={saveSetupRosterAndContinue}
                        >
                          {t('household.setup.continueToProfiles')}
                        </Button>
                      </>
                    }
                  >
                    <div className="grid gap-5">
                      {setupRoster.length > 0 ? (
                        <ul className="grid gap-2" aria-label={t('household.members.title')}>
                          {setupRoster.map((participant) => (
                            <li
                              key={participant.id}
                              className={cn(
                                'grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 rounded-[20px] border px-3 py-3 sm:flex sm:gap-3 sm:py-2.5',
                                surface.subtleBg,
                                surface.borderStrong,
                                surface.textPrimary
                              )}
                            >
                              <Avatar
                                className="h-9 w-9 border"
                                style={{
                                  backgroundColor: participant.color ?? accentColor,
                                  borderColor: participant.color ?? accentColor,
                                }}
                              >
                                {participant.avatarUrl ? (
                                  <AvatarImage src={participant.avatarUrl} alt="" />
                                ) : null}
                                <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
                                  <AvatarFallbackIdentity
                                    avatarIcon={participant.avatarIcon}
                                    displayName={participant.displayName}
                                    iconClassName={navetIconSizeTokens.sm}
                                  />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">
                                  {participant.displayName}
                                </p>
                                <p className={cn('text-xs leading-4', surface.textSecondary)}>
                                  {participant.capabilities.includes('manage')
                                    ? t('household.personDialog.manager')
                                    : t('household.personDialog.member')}
                                </p>
                              </div>
                              <Select
                                size="small"
                                aria-label={`${t('household.personDialog.role')}: ${participant.displayName}`}
                                containerClassName="max-sm:col-start-2 max-sm:col-end-4 max-sm:row-start-2 w-full shrink-0 sm:w-52"
                                value={
                                  participant.capabilities.includes('manage') ? 'manager' : 'member'
                                }
                                onChange={(event) =>
                                  setSetupParticipantRole(
                                    participant.id,
                                    event.target.value as SetupParticipantRole
                                  )
                                }
                              >
                                <option value="member">{t('household.personDialog.member')}</option>
                                <option value="manager">
                                  {t('household.personDialog.roleManager')}
                                </option>
                              </Select>
                              {!participants.some(
                                (candidate) => candidate.id === participant.id
                              ) ? (
                                <IconButton
                                  variant="ghost"
                                  label={t('household.setup.removePerson', {
                                    name: participant.displayName,
                                  })}
                                  icon={
                                    <Trash2 aria-hidden="true" className={navetIconSizeTokens.sm} />
                                  }
                                  className="min-h-9 min-w-9 shrink-0 max-sm:col-start-3 max-sm:row-start-1 max-sm:self-start"
                                  onClick={() => removeSetupPerson(participant.id)}
                                />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {setupRoster.length > 0 &&
                      !setupRoster.some((participant) =>
                        participant.capabilities.includes('manage')
                      ) ? (
                        <MessageBar tone="warning">
                          {t('household.setup.managerRequired')}
                        </MessageBar>
                      ) : null}
                      {addingPerson ? (
                        <section
                          className={cn(
                            'rounded-[24px] border p-4 sm:p-5',
                            surface.subtleBg,
                            surface.borderStrong
                          )}
                          aria-label={t('household.people.add')}
                        >
                          <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto]">
                            <CardDialogSection
                              className="mb-0 min-w-0"
                              label={t('household.personDialog.name')}
                            >
                              <Input
                                autoFocus
                                aria-label={t('household.personDialog.name')}
                                autoComplete="name"
                                value={name}
                                placeholder={t('household.personDialog.namePlaceholder')}
                                onChange={(event) => setName(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') cancelAddingPerson();
                                  if (event.key === 'Enter' && name.trim()) addPerson();
                                }}
                              />
                            </CardDialogSection>
                            <CardDialogSection
                              className="mb-0 min-w-0"
                              label={t('household.personDialog.role')}
                            >
                              <Select
                                aria-label={t('household.personDialog.role')}
                                value={newPersonRole}
                                onChange={(event) =>
                                  setNewPersonRole(event.target.value as SetupParticipantRole)
                                }
                              >
                                <option value="member">{t('household.personDialog.member')}</option>
                                <option value="manager">
                                  {t('household.personDialog.roleManager')}
                                </option>
                              </Select>
                            </CardDialogSection>
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="secondary" onClick={cancelAddingPerson}>
                                {t('common.cancel')}
                              </Button>
                              <Button
                                className="shrink-0"
                                variant={name.trim() ? 'primary' : 'secondary'}
                                disabled={!name.trim()}
                                leading={
                                  <UserPlus aria-hidden="true" className={navetIconSizeTokens.sm} />
                                }
                                onClick={addPerson}
                              >
                                {t('household.personDialog.save')}
                              </Button>
                            </div>
                          </div>
                        </section>
                      ) : (
                        <Button
                          variant="secondary"
                          leading={
                            <UserPlus aria-hidden="true" className={navetIconSizeTokens.sm} />
                          }
                          onClick={startAddingPerson}
                        >
                          {t('household.people.add')}
                        </Button>
                      )}
                    </div>
                  </StepPanel>
                ) : null}

                {currentStep.id === 'customize' ? (
                  <StepPanel
                    eyebrow={t('household.setup.stepCount', { current: 2, total: steps.length })}
                    title={t('household.setup.customizeTitle')}
                    description={t('household.setup.customizeDescription')}
                    footer={
                      <>
                        <BackButton onClick={() => setStepIndex(0)} />
                        <Button
                          loading={saving}
                          disabled={!participantId || !name.trim()}
                          onClick={async () => {
                            if (await savePersonCustomization()) moveTo(2);
                          }}
                        >
                          {t('household.setup.savePersonContinue')}
                        </Button>
                      </>
                    }
                  >
                    <div className="grid gap-5">
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {setupRoster.map((participant) => (
                          <button
                            key={participant.id}
                            type="button"
                            aria-pressed={participant.id === participantId}
                            className={cn(
                              'flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm font-semibold',
                              surface.borderStrong,
                              participant.id === participantId ? surface.iconBg : surface.hoverBg,
                              surface.textPrimary
                            )}
                            onClick={() => selectParticipantForCustomization(participant.id)}
                          >
                            <Avatar
                              className="h-7 w-7"
                              style={{ backgroundColor: participant.color ?? accentColor }}
                            >
                              {participant.avatarUrl ? (
                                <AvatarImage src={participant.avatarUrl} alt="" />
                              ) : null}
                              <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
                                <AvatarFallbackIdentity
                                  avatarIcon={participant.avatarIcon}
                                  displayName={participant.displayName}
                                  iconClassName={navetIconSizeTokens.sm}
                                />
                              </AvatarFallback>
                            </Avatar>
                            {participant.displayName}
                          </button>
                        ))}
                      </div>
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
                      <div
                        className={cn(
                          'rounded-[22px] border p-4',
                          surface.subtleBg,
                          surface.borderStrong,
                          surface.textPrimary
                        )}
                      >
                        <div className="flex items-center justify-between gap-5">
                          <div>
                            <p className={navetTypographyTokens.label}>
                              {t('household.personDialog.reminders')}
                            </p>
                            <p
                              className={cn(
                                'mt-1 max-w-xl',
                                navetTypographyTokens.compactHelper,
                                surface.textSecondary
                              )}
                            >
                              {t('household.setup.remindersHelper')}
                            </p>
                          </div>
                          <Switch
                            aria-label={t('household.personDialog.reminders')}
                            checked={remindersEnabled}
                            size="compact"
                            onCheckedChange={setRemindersEnabled}
                          />
                        </div>
                        {remindersEnabled ? (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <CardDialogSection
                              className="mb-0"
                              label={t('household.personDialog.quietStart')}
                            >
                              <Input
                                aria-label={t('household.personDialog.quietStart')}
                                type="time"
                                value={quietStart}
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
                                onChange={(event) => setQuietEnd(event.target.value)}
                              />
                            </CardDialogSection>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </StepPanel>
                ) : null}

                {currentStep.id === 'chores' ? (
                  <StepPanel
                    eyebrow={t('household.setup.stepCount', { current: 3, total: steps.length })}
                    title={t('household.setup.choresTitle')}
                    description={t('household.setup.choresDescription')}
                    footer={
                      <>
                        <BackButton onClick={() => setStepIndex(1)} />
                        <Button
                          disabled={definitions.length === 0 || addingChore}
                          trailing={
                            <ArrowRight aria-hidden="true" className={navetIconSizeTokens.sm} />
                          }
                          onClick={() => moveTo(3)}
                        >
                          {t('household.setup.continueToMotivation')}
                        </Button>
                      </>
                    }
                  >
                    <div className="grid gap-6">
                      {definitions.length > 0 ? (
                        <ul className="grid gap-2" aria-label={t('household.chores.title')}>
                          {definitions.map((definition) => {
                            const Icon = resolveChoreIconComponent(
                              experience.presentationByDefinitionId[definition.id]?.icon
                            );
                            return (
                              <li
                                key={definition.id}
                                className={cn(
                                  'flex min-h-12 items-center gap-3 rounded-[20px] border px-3 py-2',
                                  surface.subtleBg,
                                  surface.borderStrong,
                                  surface.textPrimary
                                )}
                              >
                                <span
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                  style={{
                                    backgroundColor: `${accentColor}18`,
                                    color: accentColor,
                                  }}
                                >
                                  <Icon aria-hidden="true" className={navetIconSizeTokens.sm} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">
                                    {definition.title}
                                  </p>
                                  <p className={cn('truncate text-xs', surface.textSecondary)}>
                                    {definition.roomRef?.label ?? t('household.choreDialog.noRoom')}
                                  </p>
                                </div>
                                <IconButton
                                  variant="ghost"
                                  label={t('household.chores.deleteNamed', {
                                    name: definition.title,
                                  })}
                                  icon={
                                    <Trash2 aria-hidden="true" className={navetIconSizeTokens.sm} />
                                  }
                                  className="min-h-9 min-w-9 shrink-0"
                                  disabled={saving}
                                  onClick={() => void removeChore(definition)}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      {!addingChore ? (
                        <Button
                          className="justify-self-start"
                          variant="secondary"
                          leading={<Plus aria-hidden="true" className={navetIconSizeTokens.sm} />}
                          onClick={() => setAddingChore(true)}
                        >
                          {t('household.chores.add')}
                        </Button>
                      ) : (
                        <section className="grid gap-6" aria-label={t('household.chores.add')}>
                          <ChoreCreationFormGroups
                            title={choreTitle}
                            icon={choreIcon}
                            roomId={roomId}
                            rooms={rooms}
                            assignmentMode={choreAssignmentMode}
                            participantId={choreParticipantId}
                            participants={setupRoster}
                            repeat={repeat}
                            dueTime={dueTime}
                            startDate={scheduleStartDate}
                            endDate={scheduleEndDate}
                            interval={scheduleInterval}
                            excludedDates={excludedDates}
                            onTitleChange={setChoreTitle}
                            onIconChange={setChoreIcon}
                            onRoomChange={setRoomId}
                            onAssignmentModeChange={setChoreAssignmentMode}
                            onParticipantChange={setChoreParticipantId}
                            onRepeatChange={selectSetupRepeat}
                            onDueTimeChange={setDueTime}
                            onStartDateChange={setScheduleStartDate}
                            onEndDateChange={setScheduleEndDate}
                            onIntervalChange={setScheduleInterval}
                            onExcludedDatesChange={setExcludedDates}
                          />
                          <div className="flex flex-wrap justify-end gap-2 border-t border-current/10 pt-4">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                resetChoreForm();
                                setAddingChore(false);
                              }}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              loading={saving}
                              disabled={!choreTitle.trim()}
                              onClick={saveChore}
                            >
                              {t('household.setup.addThisChore')}
                            </Button>
                          </div>
                        </section>
                      )}
                    </div>
                  </StepPanel>
                ) : null}

                {currentStep.id === 'rewards' ? (
                  <StepPanel
                    eyebrow={t('household.setup.stepCount', { current: 4, total: steps.length })}
                    title={t('household.setup.rewardsTitle')}
                    description={t('household.setup.rewardsDescription')}
                    footer={
                      <>
                        <BackButton onClick={() => setStepIndex(2)} />
                        <Button loading={saving} onClick={saveRewardsAndContinue}>
                          {t('household.setup.continueToProtection')}
                        </Button>
                      </>
                    }
                  >
                    <div className="grid gap-5">
                      <CardDialogSection
                        className="mb-0"
                        label={t('household.settings.gamification')}
                      >
                        <Select
                          aria-label={t('household.settings.gamification')}
                          value={mode}
                          onChange={(event) => setMode(event.target.value as ChoreGamificationMode)}
                        >
                          <option value="off">{t('household.settings.mode.off')}</option>
                          <option value="light">{t('household.settings.mode.light')}</option>
                          <option value="family">{t('household.settings.mode.family')}</option>
                          <option value="adventure">
                            {t('household.settings.mode.adventure')}
                          </option>
                        </Select>
                      </CardDialogSection>
                      <div
                        className={cn(
                          'flex items-start gap-3 rounded-[22px] border p-4',
                          surface.subtleBg,
                          surface.borderStrong,
                          surface.textSecondary
                        )}
                      >
                        <Sparkles
                          aria-hidden="true"
                          className={cn('mt-0.5 shrink-0', navetIconSizeTokens.sm)}
                        />
                        <p className={navetTypographyTokens.body}>
                          {motivationModeDescriptions[mode]}
                        </p>
                      </div>
                      {mode !== 'off' ? (
                        <div
                          className={cn(
                            'grid gap-4 rounded-[22px] border p-4 sm:grid-cols-[minmax(0,1fr)_9rem]',
                            surface.subtleBg,
                            surface.borderStrong
                          )}
                        >
                          <CardDialogSection
                            className="mb-0"
                            label={t('household.rewardDialog.name')}
                          >
                            <Input
                              aria-label={t('household.rewardDialog.name')}
                              value={rewardTitle}
                              placeholder={t('household.demo.rewardTitle')}
                              onChange={(event) => setRewardTitle(event.target.value)}
                            />
                          </CardDialogSection>
                          <CardDialogSection
                            className="mb-0"
                            label={t('household.rewardDialog.target')}
                          >
                            <Input
                              aria-label={t('household.rewardDialog.target')}
                              type="number"
                              min={1}
                              max={1000000}
                              value={rewardTarget}
                              onChange={(event) => setRewardTarget(Number(event.target.value))}
                            />
                          </CardDialogSection>
                        </div>
                      ) : null}
                    </div>
                  </StepPanel>
                ) : null}

                {currentStep.id === 'security' ? (
                  <StepPanel
                    eyebrow={t('household.setup.stepCount', { current: 5, total: steps.length })}
                    title={t('household.setup.securityTitle')}
                    description={t('household.setup.securityDescription')}
                    footer={
                      <>
                        <BackButton onClick={() => setStepIndex(3)} />
                        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                          <Button variant="secondary" onClick={() => moveTo(5)}>
                            {t('household.setup.skipPin')}
                          </Button>
                          <Button
                            loading={saving}
                            disabled={!managementPin || !managementPinConfirmation}
                            leading={
                              <ShieldCheck aria-hidden="true" className={navetIconSizeTokens.sm} />
                            }
                            onClick={saveManagementPin}
                          >
                            {t('household.setup.savePin')}
                          </Button>
                        </div>
                      </>
                    }
                  >
                    <div className="grid gap-4">
                      <div
                        className={cn(
                          'flex items-start gap-3 rounded-[22px] border p-4',
                          surface.subtleBg,
                          surface.borderStrong,
                          surface.textSecondary
                        )}
                      >
                        <ShieldCheck
                          aria-hidden="true"
                          className={cn('mt-0.5 shrink-0', navetIconSizeTokens.sm)}
                        />
                        <p className={navetTypographyTokens.body}>
                          {t('household.setup.pinHelper')}
                        </p>
                      </div>
                      <CardDialogSection className="mb-0" label={t('household.setup.pinLabel')}>
                        <Input
                          aria-label={t('household.setup.pinLabel')}
                          autoComplete="new-password"
                          inputMode="numeric"
                          maxLength={8}
                          pattern="[0-9]*"
                          type="password"
                          value={managementPin}
                          onChange={(event) => {
                            setPinError('');
                            setManagementPin(event.target.value.replace(/\D/g, ''));
                          }}
                        />
                      </CardDialogSection>
                      <CardDialogSection
                        className="mb-0"
                        label={t('household.setup.pinConfirmLabel')}
                      >
                        <Input
                          aria-label={t('household.setup.pinConfirmLabel')}
                          autoComplete="new-password"
                          inputMode="numeric"
                          maxLength={8}
                          pattern="[0-9]*"
                          type="password"
                          value={managementPinConfirmation}
                          onChange={(event) => {
                            setPinError('');
                            setManagementPinConfirmation(event.target.value.replace(/\D/g, ''));
                          }}
                        />
                      </CardDialogSection>
                      {pinError ? (
                        <p className="text-sm text-red-500" role="alert">
                          {pinError}
                        </p>
                      ) : null}
                    </div>
                  </StepPanel>
                ) : null}

                {currentStep.id === 'ready' ? (
                  <StepPanel
                    eyebrow={t('household.setup.stepCount', { current: 6, total: steps.length })}
                    title={t('household.setup.readyTitle')}
                    description={t('household.setup.readyDescription')}
                    footer={
                      <>
                        <BackButton onClick={() => setStepIndex(4)} />
                        <Button
                          loading={saving}
                          leading={
                            <Sparkles aria-hidden="true" className={navetIconSizeTokens.sm} />
                          }
                          onClick={finishSetup}
                        >
                          {t('household.setup.finish')}
                        </Button>
                      </>
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        [UserRound, t('household.members.title'), participants.length],
                        [ListChecks, t('household.tabs.chores'), definitions.length],
                        [
                          Gift,
                          t('household.tabs.rewards'),
                          Object.keys(experience.rewardGoalsById).length,
                        ],
                      ].map(([Icon, label, value]) => {
                        const SummaryIcon = Icon as LucideIcon;
                        return (
                          <div
                            key={String(label)}
                            className={cn(
                              'rounded-[22px] border p-4',
                              surface.subtleBg,
                              surface.borderStrong,
                              surface.textPrimary
                            )}
                          >
                            <SummaryIcon aria-hidden="true" className={navetIconSizeTokens.md} />
                            <p className="mt-5 text-2xl font-semibold">{String(value)}</p>
                            <p className={cn('mt-1 text-xs', surface.textSecondary)}>
                              {String(label)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </StepPanel>
                ) : null}
              </NavigationWorkspace.ScrollArea>
            </NavigationWorkspace.Content>
          </NavigationWorkspace.Body>
        </NavigationWorkspace.Frame>
      </BaseCardDialog>
      {onUnlockManagement ? (
        <ChoreManagementPinDialog
          isOpen={managementPinDialogOpen}
          error={managementError}
          onOpenChange={setManagementPinDialogOpen}
          onUnlock={async (pin) => {
            const unlocked = await onUnlockManagement(pin);
            if (!unlocked) return false;
            setManagementPinDialogOpen(false);
            await finishSetupNow();
            return true;
          }}
        />
      ) : null}
    </Fragment>
  );
}

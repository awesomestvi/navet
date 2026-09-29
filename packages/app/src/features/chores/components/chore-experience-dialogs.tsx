import {
  CardDialogBody,
  CardDialogFooter,
  CardDialogHeader,
  CardDialogSection,
} from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  Checkbox,
  Input,
  Select,
  Textarea,
} from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import type {
  ChoreMission,
  ChoreProgressTarget,
  ChoreRewardGoal,
  ChoreRewardType,
} from '@navet/core/chore-experience';
import type { ChoreDefinition, ChoreParticipant } from '@navet/core/chores';
import { type FormEvent, useEffect, useState } from 'react';
import {
  ChoreFieldError,
  isBoundedInteger,
  type NumericDraft,
  numericDraft,
} from './chore-form-validation';

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now().toString(36)}`;
}

export function ProgressTargetDialog({
  isOpen,
  kind,
  target,
  definitions,
  participants,
  onOpenChange,
  onSave,
}: {
  isOpen: boolean;
  kind: 'badge' | 'achievement';
  target?: ChoreProgressTarget | null;
  definitions: ChoreDefinition[];
  participants: ChoreParticipant[];
  onOpenChange: (open: boolean) => void;
  onSave: (target: ChoreProgressTarget) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<ChoreProgressTarget['metric']>('count');
  const [targetCount, setTargetCount] = useState<NumericDraft>(1);
  const [cycle, setCycle] = useState<NonNullable<ChoreProgressTarget['cycle']>>('once');
  const [awardPoints, setAwardPoints] = useState<NumericDraft>(0);
  const [participantId, setParticipantId] = useState('');
  const [definitionIds, setDefinitionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setTitle(target?.title ?? '');
    setMetric(target?.metric ?? 'count');
    setTargetCount(target?.target ?? 1);
    setCycle(target?.cycle ?? 'once');
    setAwardPoints(target?.awardPoints ?? 0);
    setParticipantId(target?.participantId ?? '');
    setDefinitionIds(target?.definitionIds ?? []);
  }, [isOpen, target]);
  const valid =
    title.trim().length > 0 &&
    isBoundedInteger(targetCount, 1, 100_000) &&
    isBoundedInteger(awardPoints, 0, 100_000) &&
    (metric !== 'selected_chore' || definitionIds.length > 0) &&
    (kind !== 'achievement' || Boolean(participantId));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const saved = await onSave({
        id: target?.id ?? createId(kind),
        title: title.trim(),
        metric,
        target: Number(targetCount),
        cycle,
        participantId: kind === 'achievement' ? participantId : undefined,
        definitionIds: definitionIds.length ? definitionIds : undefined,
        awardPoints: Number(awardPoints) || undefined,
      });
      if (saved) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };
  return (
    <BaseCardDialog
      variant="modal"
      titleInContent
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t(
        kind === 'badge'
          ? 'household.progression.badgeTitle'
          : 'household.progression.achievementTitle'
      )}
      description={t('household.progression.description')}
      theme={theme}
      maxWidth="md"
      height="capped"
      bodyPadding={false}
    >
      <form onSubmit={submit}>
        <CardDialogBody>
          <CardDialogHeader
            title={t(
              kind === 'badge'
                ? 'household.progression.badgeTitle'
                : 'household.progression.achievementTitle'
            )}
            description={t('household.progression.description')}
            showRoomSelector={false}
          />
          <CardDialogSection label={t('household.missionDialog.name')}>
            <Input
              autoFocus
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </CardDialogSection>
          {kind === 'achievement' ? (
            <CardDialogSection label={t('household.progression.person')}>
              <Select
                value={participantId}
                onChange={(event) => setParticipantId(event.target.value)}
              >
                <option value="">{t('household.progression.choosePerson')}</option>
                {participants.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </Select>
            </CardDialogSection>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <CardDialogSection label={t('household.progression.metric')}>
              <Select
                value={metric}
                onChange={(event) => setMetric(event.target.value as ChoreProgressTarget['metric'])}
              >
                {(['selected_chore', 'count', 'points', 'days', 'streak'] as const).map((value) => (
                  <option key={value} value={value}>
                    {t(`household.progression.metric.${value}`)}
                  </option>
                ))}
              </Select>
            </CardDialogSection>
            <CardDialogSection label={t('household.progression.target')}>
              <Input
                type="number"
                min={1}
                max={100000}
                step={1}
                required
                invalid={!isBoundedInteger(targetCount, 1, 100000)}
                value={targetCount}
                onChange={(event) => setTargetCount(numericDraft(event.target.value))}
              />
            </CardDialogSection>
          </div>
          <CardDialogSection label={t('household.missionDialog.chores')}>
            <p className={cn('mb-2 text-xs', surface.textSecondary)}>
              {t('household.progression.choresHint')}
            </p>
            <div className="grid gap-1">
              {definitions.map((definition) => (
                <label
                  key={definition.id}
                  htmlFor={`progress-chore-${definition.id}`}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm',
                    surface.textPrimary
                  )}
                >
                  <Checkbox
                    id={`progress-chore-${definition.id}`}
                    checked={definitionIds.includes(definition.id)}
                    onCheckedChange={(checked) =>
                      setDefinitionIds((current) =>
                        checked
                          ? [...new Set([...current, definition.id])]
                          : current.filter((id) => id !== definition.id)
                      )
                    }
                  />
                  <span>{definition.title}</span>
                </label>
              ))}
            </div>
          </CardDialogSection>
          <div className="grid gap-3 sm:grid-cols-2">
            <CardDialogSection label={t('household.progression.cycle')}>
              <Select
                value={cycle}
                onChange={(event) =>
                  setCycle(event.target.value as NonNullable<ChoreProgressTarget['cycle']>)
                }
              >
                <option value="once">{t('household.progression.once')}</option>
                <option value="weekly">{t('household.progression.weekly')}</option>
                <option value="monthly">{t('household.progression.monthly')}</option>
              </Select>
            </CardDialogSection>
            <CardDialogSection label={t('household.progression.awardPoints')}>
              <Input
                type="number"
                min={0}
                max={100000}
                step={1}
                required
                invalid={!isBoundedInteger(awardPoints, 0, 100000)}
                value={awardPoints}
                onChange={(event) => setAwardPoints(numericDraft(event.target.value))}
              />
            </CardDialogSection>
          </div>
          <CardDialogFooter>
            <Button type="submit" loading={saving} disabled={!valid}>
              {t('household.missionDialog.save')}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </form>
    </BaseCardDialog>
  );
}

export function MissionDialog({
  isOpen,
  mission,
  definitions,
  onOpenChange,
  onSave,
}: {
  isOpen: boolean;
  mission?: ChoreMission | null;
  definitions: ChoreDefinition[];
  onOpenChange: (open: boolean) => void;
  onSave: (mission: ChoreMission) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [definitionIds, setDefinitionIds] = useState<string[]>([]);
  const [status, setStatus] = useState<ChoreMission['status']>('upcoming');
  const [rewardPoints, setRewardPoints] = useState<NumericDraft>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(mission?.title ?? '');
    setDescription(mission?.description ?? '');
    setDefinitionIds(mission?.definitionIds ?? []);
    setStatus(mission?.status ?? 'upcoming');
    setRewardPoints(mission?.rewardPoints ?? 0);
  }, [isOpen, mission]);
  const rewardPointsValid = isBoundedInteger(rewardPoints, 0, 100_000);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || definitionIds.length === 0 || !rewardPointsValid) return;
    const timestamp = new Date().toISOString();
    setSaving(true);
    const saved = await onSave({
      id: mission?.id ?? createId('mission'),
      title: title.trim(),
      description: description.trim() || undefined,
      definitionIds,
      status,
      rewardPoints: Number(rewardPoints) > 0 ? Number(rewardPoints) : undefined,
      createdAt: mission?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <BaseCardDialog
      variant="modal"
      titleInContent
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={mission ? t('household.missionDialog.editTitle') : t('household.missionDialog.title')}
      description={t('household.missionDialog.description')}
      theme={theme}
      maxWidth="md"
      height="capped"
      bodyPadding={false}
    >
      <form onSubmit={submit}>
        <CardDialogBody>
          <CardDialogHeader
            title={
              mission ? t('household.missionDialog.editTitle') : t('household.missionDialog.title')
            }
            description={t('household.missionDialog.description')}
            showRoomSelector={false}
          />
          <CardDialogSection label={t('household.missionDialog.name')}>
            <Input
              autoFocus
              aria-label={t('household.missionDialog.name')}
              maxLength={200}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </CardDialogSection>
          <CardDialogSection label={t('household.missionDialog.outcome')}>
            <Textarea
              aria-label={t('household.missionDialog.outcome')}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </CardDialogSection>
          <CardDialogSection label={t('household.missionDialog.chores')}>
            <div className="grid gap-1">
              {definitions.map((definition) => {
                const checked = definitionIds.includes(definition.id);
                return (
                  <label
                    key={definition.id}
                    htmlFor={`mission-chore-${definition.id}`}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm',
                      surface.textPrimary
                    )}
                  >
                    <Checkbox
                      id={`mission-chore-${definition.id}`}
                      checked={checked}
                      onCheckedChange={(next) =>
                        setDefinitionIds((current) =>
                          next
                            ? [...new Set([...current, definition.id])]
                            : current.filter((id) => id !== definition.id)
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{definition.title}</span>
                    {definition.roomRef?.label ? (
                      <span className={cn('text-xs', surface.textSecondary)}>
                        {definition.roomRef.label}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </CardDialogSection>
          <div className="grid gap-3 sm:grid-cols-2">
            <CardDialogSection label={t('household.missionDialog.status')}>
              <Select
                aria-label={t('household.missionDialog.status')}
                value={status}
                onChange={(event) => setStatus(event.target.value as ChoreMission['status'])}
              >
                <option value="upcoming">{t('household.missions.upcoming')}</option>
                <option value="active">{t('household.missions.active')}</option>
                <option value="complete">{t('household.missions.complete')}</option>
              </Select>
            </CardDialogSection>
            <CardDialogSection label={t('household.missionDialog.reward')}>
              <Input
                aria-describedby={rewardPointsValid ? undefined : 'mission-reward-points-error'}
                aria-label={t('household.missionDialog.reward')}
                invalid={!rewardPointsValid}
                type="number"
                min={0}
                max={100000}
                required
                step={1}
                value={rewardPoints}
                onChange={(event) => setRewardPoints(numericDraft(event.target.value))}
              />
              {!rewardPointsValid ? (
                <ChoreFieldError id="mission-reward-points-error">
                  {t('household.validation.wholeNumberRange', { min: 0, max: 100_000 })}
                </ChoreFieldError>
              ) : null}
            </CardDialogSection>
          </div>
          <CardDialogFooter>
            <Button
              type="submit"
              loading={saving}
              disabled={!title.trim() || definitionIds.length === 0 || !rewardPointsValid}
            >
              {mission
                ? t('household.missionDialog.saveChanges')
                : t('household.missionDialog.save')}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </form>
    </BaseCardDialog>
  );
}

export function RewardDialog({
  isOpen,
  reward,
  participants,
  onOpenChange,
  onSave,
}: {
  isOpen: boolean;
  reward?: ChoreRewardGoal | null;
  participants: ChoreParticipant[];
  onOpenChange: (open: boolean) => void;
  onSave: (reward: ChoreRewardGoal) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ChoreRewardType>('saving');
  const [targetPoints, setTargetPoints] = useState<NumericDraft>(100);
  const [startingPoints, setStartingPoints] = useState<NumericDraft>(0);
  const [participantId, setParticipantId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(reward?.title ?? '');
    setType(reward?.type ?? 'saving');
    setTargetPoints(reward?.targetPoints ?? 100);
    setStartingPoints(reward?.startingPoints ?? 0);
    setParticipantId(reward?.participantId ?? '');
  }, [isOpen, reward]);
  const targetPointsValid = isBoundedInteger(targetPoints, 1, 1_000_000);
  const startingPointsValid = isBoundedInteger(startingPoints, 0, 1_000_000);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !targetPointsValid || !startingPointsValid) return;
    const timestamp = new Date().toISOString();
    setSaving(true);
    const saved = await onSave({
      id: reward?.id ?? createId('reward'),
      title: title.trim(),
      type,
      targetPoints: Number(targetPoints),
      startingPoints: Number(startingPoints) > 0 ? Number(startingPoints) : undefined,
      participantId: type === 'family' ? undefined : participantId || undefined,
      enabled: reward?.enabled ?? true,
      createdAt: reward?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <BaseCardDialog
      variant="modal"
      titleInContent
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={reward ? t('household.rewardDialog.editTitle') : t('household.rewardDialog.title')}
      description={t('household.rewardDialog.description')}
      theme={theme}
      maxWidth="sm"
      bodyPadding={false}
    >
      <form onSubmit={submit}>
        <CardDialogBody>
          <CardDialogHeader
            title={
              reward ? t('household.rewardDialog.editTitle') : t('household.rewardDialog.title')
            }
            description={t('household.rewardDialog.description')}
            showRoomSelector={false}
          />
          <CardDialogSection label={t('household.rewardDialog.name')}>
            <Input
              autoFocus
              aria-label={t('household.rewardDialog.name')}
              maxLength={200}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </CardDialogSection>
          <CardDialogSection label={t('household.rewardDialog.type')}>
            <Select
              aria-label={t('household.rewardDialog.type')}
              value={type}
              onChange={(event) => setType(event.target.value as ChoreRewardType)}
            >
              <option value="instant">{t('household.rewards.type.instant')}</option>
              <option value="saving">{t('household.rewards.type.saving')}</option>
              <option value="family">{t('household.rewards.type.family')}</option>
              <option value="experience">{t('household.rewards.type.experience')}</option>
            </Select>
          </CardDialogSection>
          {type !== 'family' ? (
            <CardDialogSection label={t('household.rewardDialog.person')}>
              <Select
                aria-label={t('household.rewardDialog.person')}
                value={participantId}
                onChange={(event) => setParticipantId(event.target.value)}
              >
                <option value="">{t('household.personPicker.all')}</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </Select>
            </CardDialogSection>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <CardDialogSection label={t('household.rewardDialog.target')}>
              <Input
                aria-describedby={targetPointsValid ? undefined : 'reward-target-points-error'}
                aria-label={t('household.rewardDialog.target')}
                invalid={!targetPointsValid}
                type="number"
                min={1}
                max={1000000}
                required
                step={1}
                value={targetPoints}
                onChange={(event) => setTargetPoints(numericDraft(event.target.value))}
              />
              {!targetPointsValid ? (
                <ChoreFieldError id="reward-target-points-error">
                  {t('household.validation.wholeNumberRange', { min: 1, max: 1_000_000 })}
                </ChoreFieldError>
              ) : null}
            </CardDialogSection>
            <CardDialogSection label={t('household.rewardDialog.starting')}>
              <Input
                aria-describedby={startingPointsValid ? undefined : 'reward-starting-points-error'}
                aria-label={t('household.rewardDialog.starting')}
                invalid={!startingPointsValid}
                type="number"
                min={0}
                max={1000000}
                required
                step={1}
                value={startingPoints}
                onChange={(event) => setStartingPoints(numericDraft(event.target.value))}
              />
              {!startingPointsValid ? (
                <ChoreFieldError id="reward-starting-points-error">
                  {t('household.validation.wholeNumberRange', { min: 0, max: 1_000_000 })}
                </ChoreFieldError>
              ) : null}
            </CardDialogSection>
          </div>
          <CardDialogFooter>
            <Button
              type="submit"
              loading={saving}
              disabled={!title.trim() || !targetPointsValid || !startingPointsValid}
            >
              {reward ? t('household.rewardDialog.saveChanges') : t('household.rewardDialog.save')}
            </Button>
          </CardDialogFooter>
        </CardDialogBody>
      </form>
    </BaseCardDialog>
  );
}

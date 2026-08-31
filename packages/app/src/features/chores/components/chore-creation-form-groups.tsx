import { CardDialogSection } from '@navet/app/components/patterns';
import { Input, Select } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ChoreAssignmentMode, ChoreParticipant, ChoreSchedule } from '@navet/core/chores';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Children, isValidElement, type ReactNode } from 'react';
import { ChoreIconPicker } from './chore-icon-picker';

export type ChoreCreationRepeat =
  | ChoreSchedule['frequency']
  | 'weekdays'
  | 'weekends'
  | 'biweekly'
  | 'triweekly'
  | 'fourweekly'
  | 'custom';
export type ChoreCreationSection = 'details' | 'assignment' | 'schedule';

interface ChoreCreationSectionOptionsProps {
  section: ChoreCreationSection;
  children: ReactNode;
}

export function ChoreCreationSectionOptions({ children }: ChoreCreationSectionOptionsProps) {
  return <>{children}</>;
}

interface ChoreCreationFormGroupsProps {
  title: string;
  icon: string;
  roomId: string;
  rooms: Array<{ canonicalId: string; label: string }>;
  assignmentMode: ChoreAssignmentMode;
  participantId: string;
  participants: ChoreParticipant[];
  repeat: ChoreCreationRepeat;
  dueTime: string;
  startDate: string;
  endDate: string;
  interval: number;
  excludedDates: string;
  showTemplates?: boolean;
  children?: ReactNode;
  onTitleChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onRoomChange: (value: string) => void;
  onAssignmentModeChange: (value: ChoreAssignmentMode) => void;
  onParticipantChange: (value: string) => void;
  onRepeatChange: (value: ChoreCreationRepeat) => void;
  onDueTimeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onIntervalChange: (value: number) => void;
  onExcludedDatesChange: (value: string) => void;
}

export function ChoreFormGroup({
  title,
  children,
  moreOptions,
}: {
  title: string;
  children: ReactNode;
  moreOptions?: ReactNode;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <section>
      <h3
        className={cn(
          'mb-2 px-1 font-semibold',
          navetTypographyTokens.caption,
          surface.textSecondary
        )}
      >
        {title}
      </h3>
      <div
        className={cn(
          'grid gap-4 rounded-[22px] border p-4 sm:grid-cols-2 sm:p-5',
          surface.subtleBg,
          surface.borderStrong
        )}
      >
        {children}
        {moreOptions ? (
          <details className={cn('group border-t pt-2 sm:col-span-2', surface.border)}>
            <summary
              aria-label={`${t('household.choreDialog.moreOptions')}: ${title}`}
              className={cn(
                '-mx-1 flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold select-none focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden',
                surface.hoverBg,
                surface.textPrimary
              )}
            >
              <SlidersHorizontal aria-hidden="true" className={navetIconSizeTokens.sm} />
              <span className="min-w-0 flex-1">{t('household.choreDialog.moreOptions')}</span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  navetIconSizeTokens.sm,
                  'transition-transform group-open:rotate-180 motion-reduce:transition-none',
                  surface.textSecondary
                )}
              />
            </summary>
            <div className="grid gap-4 pt-4 sm:grid-cols-2">{moreOptions}</div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

export function ChoreCreationFormGroups({
  title,
  icon,
  roomId,
  rooms,
  assignmentMode,
  participantId,
  participants,
  repeat,
  dueTime,
  startDate,
  endDate,
  interval,
  excludedDates,
  showTemplates = true,
  children,
  onTitleChange,
  onIconChange,
  onRoomChange,
  onAssignmentModeChange,
  onParticipantChange,
  onRepeatChange,
  onDueTimeChange,
  onStartDateChange,
  onEndDateChange,
  onIntervalChange,
  onExcludedDatesChange,
}: ChoreCreationFormGroupsProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const templates = [
    [t('household.demo.dishwasher'), 'Utensils'],
    [t('household.demo.plants'), 'Sprout'],
    [t('household.demo.bins'), 'Recycle'],
  ] as const;
  const sectionOptions = (section: ChoreCreationSection) => {
    for (const child of Children.toArray(children)) {
      if (
        isValidElement<ChoreCreationSectionOptionsProps>(child) &&
        child.type === ChoreCreationSectionOptions &&
        child.props.section === section
      ) {
        return child.props.children;
      }
    }
    return undefined;
  };

  return (
    <div className="grid gap-6">
      <ChoreFormGroup
        title={t('household.setup.choreGroupDetails')}
        moreOptions={sectionOptions('details')}
      >
        {showTemplates ? (
          <div className="sm:col-span-2">
            <p className={cn(navetTypographyTokens.label, surface.textPrimary)}>
              {t('household.choreDialog.quickStart')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {templates.map(([templateTitle, templateIcon]) => (
                <button
                  key={templateTitle}
                  type="button"
                  aria-pressed={title === templateTitle}
                  className={cn(
                    'min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
                    surface.borderStrong,
                    title === templateTitle ? surface.iconBg : surface.hoverBg,
                    surface.textPrimary
                  )}
                  onClick={() => {
                    onTitleChange(templateTitle);
                    onIconChange(templateIcon);
                  }}
                >
                  {templateTitle}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <CardDialogSection className="mb-0" label={t('household.choreDialog.name')}>
          <Input
            aria-label={t('household.choreDialog.name')}
            value={title}
            placeholder={t('household.choreDialog.namePlaceholder')}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </CardDialogSection>
        <CardDialogSection className="mb-0" label={t('household.choreDialog.room')}>
          <Select
            aria-label={t('household.choreDialog.room')}
            value={roomId}
            onChange={(event) => onRoomChange(event.target.value)}
          >
            <option value="">{t('household.choreDialog.noRoom')}</option>
            {rooms.map((room) => (
              <option key={room.canonicalId} value={room.canonicalId}>
                {room.label}
              </option>
            ))}
          </Select>
        </CardDialogSection>
        <CardDialogSection
          className="mb-0 sm:col-span-2"
          label={t('household.personDialog.avatarModeIcon')}
        >
          <ChoreIconPicker value={icon} onChange={onIconChange} />
        </CardDialogSection>
      </ChoreFormGroup>

      <ChoreFormGroup
        title={t('household.setup.choreGroupAssignment')}
        moreOptions={sectionOptions('assignment')}
      >
        <CardDialogSection className="mb-0" label={t('household.choreDialog.assignment')}>
          <Select
            aria-label={t('household.choreDialog.assignment')}
            value={assignmentMode}
            onChange={(event) => onAssignmentModeChange(event.target.value as ChoreAssignmentMode)}
          >
            <option value="person">{t('household.assignment.person')}</option>
            <option value="anyone">{t('household.assignment.anyone')}</option>
            <option value="everyone">{t('household.assignment.everyone')}</option>
            <option value="rotation">{t('household.assignment.rotation')}</option>
          </Select>
        </CardDialogSection>
        <CardDialogSection className="mb-0" label={t('household.choreDialog.person')}>
          <Select
            aria-label={t('household.choreDialog.person')}
            value={participantId}
            disabled={assignmentMode !== 'person'}
            onChange={(event) => onParticipantChange(event.target.value)}
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.displayName}
              </option>
            ))}
          </Select>
        </CardDialogSection>
      </ChoreFormGroup>

      <ChoreFormGroup
        title={t('household.setup.choreGroupSchedule')}
        moreOptions={sectionOptions('schedule')}
      >
        <CardDialogSection className="mb-0" label={t('household.choreDialog.schedule')}>
          <Select
            aria-label={t('household.choreDialog.schedule')}
            value={repeat}
            onChange={(event) => onRepeatChange(event.target.value as ChoreCreationRepeat)}
          >
            <option value="once">{t('household.schedule.once')}</option>
            <option value="daily">{t('household.schedule.daily')}</option>
            <option value="weekdays">{t('household.schedule.weekdays')}</option>
            <option value="weekends">{t('household.schedule.weekends')}</option>
            <option value="weekly">{t('household.schedule.weekly')}</option>
            <option value="biweekly">{t('household.schedule.biweekly')}</option>
            <option value="triweekly">{t('household.schedule.triweekly')}</option>
            <option value="fourweekly">{t('household.schedule.fourWeekly')}</option>
            <option value="monthly">{t('household.schedule.monthly')}</option>
            <option value="custom">{t('household.schedule.custom')}</option>
            <option value="after_completion">{t('household.schedule.afterCompletion')}</option>
          </Select>
        </CardDialogSection>
        {repeat === 'custom' ? (
          <CardDialogSection className="mb-0" label={t('household.choreDialog.repeatEveryDays')}>
            <Input
              aria-label={t('household.choreDialog.repeatEveryDays')}
              min={2}
              type="number"
              value={interval}
              onChange={(event) => onIntervalChange(Math.max(2, Number(event.target.value)))}
            />
          </CardDialogSection>
        ) : null}
        <CardDialogSection className="mb-0" label={t('household.choreDialog.time')}>
          <Input
            aria-label={t('household.choreDialog.time')}
            type="time"
            value={dueTime}
            onChange={(event) => onDueTimeChange(event.target.value)}
          />
        </CardDialogSection>
        <CardDialogSection className="mb-0" label={t('household.choreDialog.startDate')}>
          <Input
            aria-label={t('household.choreDialog.startDate')}
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        </CardDialogSection>
        {repeat !== 'once' ? (
          <CardDialogSection className="mb-0" label={t('household.choreDialog.endDate')}>
            <Input
              aria-label={t('household.choreDialog.endDate')}
              type="date"
              min={startDate}
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
            />
          </CardDialogSection>
        ) : null}
        {repeat === 'after_completion' ? (
          <CardDialogSection
            className="mb-0"
            label={t('household.setup.scheduleAfterCompletionLabel')}
            helperText={t('household.setup.scheduleAfterCompletionHelper')}
          >
            <Input
              aria-label={t('household.setup.scheduleAfterCompletionLabel')}
              min={1}
              type="number"
              value={interval}
              onChange={(event) => onIntervalChange(Math.max(1, Number(event.target.value)))}
            />
          </CardDialogSection>
        ) : null}
        {repeat !== 'once' ? (
          <CardDialogSection
            className="mb-0 sm:col-span-2"
            label={t('household.choreDialog.excludedDates')}
          >
            <Input
              aria-label={t('household.choreDialog.excludedDates')}
              placeholder="2026-12-24, 2026-12-25"
              value={excludedDates}
              onChange={(event) => onExcludedDatesChange(event.target.value)}
            />
          </CardDialogSection>
        ) : null}
      </ChoreFormGroup>
    </div>
  );
}

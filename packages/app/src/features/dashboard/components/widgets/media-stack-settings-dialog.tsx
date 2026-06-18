import {
  CardDialogChoicePill,
  CardDialogSection,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import { BaseCardDialogWithState } from '@navet/app/components/primitives';
import { getDashboardWidgetSurfaceTokens } from '@navet/app/features/dashboard/components/widgets/widget-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import type { MediaStackIdleBehavior, MediaStackWidgetData } from './media-stack-widget-data';

export interface MediaStackPlayerOption {
  id: string;
  name: string;
  room: string;
  subtitle: string;
}

interface MediaStackSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  playerOptions: MediaStackPlayerOption[];
  data?: MediaStackWidgetData;
  onUpdate?: (data: MediaStackWidgetData) => void;
  roomValue: string;
  roomLabel: string;
  roomOptions: Array<{ label: string; value: string }>;
  onRoomChange?: (room: string) => void;
}

const IDLE_BEHAVIORS: MediaStackIdleBehavior[] = ['compact', 'hidden', 'top-priority'];

function getIdleBehaviorLabel(
  idleBehavior: MediaStackIdleBehavior,
  t: ReturnType<typeof useI18n>['t']
) {
  switch (idleBehavior) {
    case 'compact':
      return t('widgets.mediaStack.settings.idleBehavior.compact');
    case 'hidden':
      return t('widgets.mediaStack.settings.idleBehavior.hidden');
    case 'top-priority':
      return t('widgets.mediaStack.settings.idleBehavior.top-priority');
    default:
      return t('widgets.mediaStack.settings.idleBehavior.compact');
  }
}

export function MediaStackSettingsDialog({
  isOpen,
  onOpenChange,
  playerOptions,
  data,
  onUpdate,
  roomValue,
  roomLabel,
  roomOptions,
  onRoomChange,
}: MediaStackSettingsDialogProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme);
  const entityIds = Array.isArray(data?.entityIds) ? data.entityIds : [];
  const priorityOrder = Array.isArray(data?.priorityOrder) ? data.priorityOrder : entityIds;
  const selectedIds = useMemo(() => new Set(entityIds), [entityIds]);
  const selectedPlayerOptions = useMemo(
    () =>
      priorityOrder
        .map((entityId) => playerOptions.find((option) => option.id === entityId))
        .filter((option): option is MediaStackPlayerOption => Boolean(option)),
    [playerOptions, priorityOrder]
  );

  const updateSelection = (nextEntityIds: string[], nextPriorityOrder = nextEntityIds) => {
    onUpdate?.({
      entityIds: nextEntityIds,
      priorityOrder: nextPriorityOrder,
      idleBehavior: data?.idleBehavior ?? 'compact',
    });
  };

  const handleToggle = (entityId: string) => {
    if (selectedIds.has(entityId)) {
      const nextEntityIds = entityIds.filter((currentId) => currentId !== entityId);
      const nextPriorityOrder = priorityOrder.filter((currentId) => currentId !== entityId);
      updateSelection(nextEntityIds, nextPriorityOrder);
      return;
    }

    const nextEntityIds = [...entityIds, entityId];
    updateSelection(nextEntityIds, [...priorityOrder, entityId]);
  };

  const moveSelected = (
    event: MouseEvent<HTMLButtonElement>,
    entityId: string,
    direction: -1 | 1
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const currentIndex = priorityOrder.indexOf(entityId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= priorityOrder.length) {
      return;
    }

    const nextPriorityOrder = [...priorityOrder];
    const [movedId] = nextPriorityOrder.splice(currentIndex, 1);
    nextPriorityOrder.splice(nextIndex, 0, movedId);
    updateSelection(entityIds, nextPriorityOrder);
  };

  const controlsTabContent = (
    <>
      <CardDialogSection
        label={t('widgets.mediaStack.settings.players')}
        helperText={t('widgets.mediaStack.settings.help')}
      >
        {playerOptions.length === 0 ? (
          <p
            className={`rounded-2xl border px-4 py-4 text-sm ${surface.borderClassName} ${surface.textMuted}`}
          >
            {t('widgets.mediaStack.settings.noneAvailable')}
          </p>
        ) : (
          <ul className="max-h-72 min-w-0 max-w-full space-y-1.5 overflow-x-hidden overflow-y-auto pr-1">
            {playerOptions.map((player) => {
              const isChecked = selectedIds.has(player.id);
              const currentIndex = priorityOrder.indexOf(player.id);
              return (
                <li key={player.id} className="w-full min-w-0 max-w-full">
                  <SelectableCheckboxRow
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(player.id)}
                    label={
                      <span className="block truncate" title={player.name}>
                        {player.name}
                      </span>
                    }
                    description={`${player.room} · ${player.subtitle}`}
                    trailing={
                      isChecked ? (
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${surface.textMuted}`}>{currentIndex + 1}</span>
                          <GripVertical className={`h-4 w-4 ${surface.textMuted}`} />
                          <button
                            type="button"
                            aria-label={t('widgets.mediaStack.settings.moveUp')}
                            className={`rounded-full p-1 ${surface.textSecondary}`}
                            onClick={(event) => moveSelected(event, player.id, -1)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={t('widgets.mediaStack.settings.moveDown')}
                            className={`rounded-full p-1 ${surface.textSecondary}`}
                            onClick={(event) => moveSelected(event, player.id, 1)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null
                    }
                    rowClassName={`w-full min-w-0 max-w-full overflow-hidden ${surface.borderClassName} ${surface.textPrimary}`}
                    labelClassName="truncate"
                    descriptionClassName={`whitespace-normal break-all ${surface.textMuted}`}
                    style={{ background: surface.subtleFill }}
                    selectedStyle={{
                      background: surface.subtleFill,
                      borderColor: 'rgba(255,255,255,0.22)',
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardDialogSection>

      <CardDialogSection
        label={t('widgets.mediaStack.settings.priority')}
        helperText={t('widgets.mediaStack.settings.priorityHelp')}
      >
        {selectedPlayerOptions.length === 0 ? (
          <p
            className={`rounded-2xl border px-4 py-4 text-sm ${surface.borderClassName} ${surface.textMuted}`}
          >
            {t('widgets.mediaStack.settings.priorityEmpty')}
          </p>
        ) : (
          <div className="space-y-2">
            {selectedPlayerOptions.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${surface.borderClassName} ${surface.textPrimary}`}
                style={{ background: surface.subtleFill }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{player.name}</div>
                  <div className={`mt-0.5 text-xs ${surface.textMuted}`}>
                    {t('widgets.mediaStack.settings.priorityPosition', {
                      position: index + 1,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardDialogSection>

      <CardDialogSection
        label={t('widgets.mediaStack.settings.idleBehavior')}
        helperText={t('widgets.mediaStack.settings.idleBehaviorHelp')}
      >
        <div className="space-y-2">
          {IDLE_BEHAVIORS.map((idleBehavior) => {
            const active = (data?.idleBehavior ?? 'compact') === idleBehavior;
            return (
              <CardDialogChoicePill
                key={idleBehavior}
                active={active}
                onClick={() =>
                  onUpdate?.({
                    entityIds,
                    priorityOrder,
                    idleBehavior,
                  })
                }
                className={`flex w-full items-start justify-start rounded-2xl border px-4 py-3 text-left ${surface.borderClassName} ${surface.textPrimary}`}
                style={{ background: surface.subtleFill }}
              >
                <div>
                  <div className="text-sm font-medium">{getIdleBehaviorLabel(idleBehavior, t)}</div>
                </div>
              </CardDialogChoicePill>
            );
          })}
        </div>
      </CardDialogSection>
    </>
  );

  return (
    <BaseCardDialogWithState
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('widgets.mediaStack.settings.title')}
      description={t('widgets.common.widget')}
      roomSelector={{
        value: roomValue,
        label: roomLabel,
        options: roomOptions,
        onChange: onRoomChange,
      }}
      controlsTabContent={controlsTabContent}
      theme={theme}
      maxWidth="md"
      height="capped"
      scrollClassName="max-h-[85vh] w-full min-w-0"
      bodyClassName="max-h-[85vh] w-full min-w-0"
    />
  );
}

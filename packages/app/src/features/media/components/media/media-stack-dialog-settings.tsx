import {
  CardDialogChoicePill,
  CardDialogSection,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import { CompactRoomSelector } from '@navet/app/components/shared/device-editor/compact-room-selector';
import { useI18n } from '@navet/app/hooks';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import type { CSSProperties, MouseEvent } from 'react';
import { useMemo } from 'react';
import type {
  MediaDialogMediaStackPlayer,
  MediaDialogMediaStackSettings,
  MediaStackIdleBehavior,
} from './media-dialog.types';

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

interface MediaStackDialogSettingsProps {
  controller: {
    isGlass: boolean;
    readableForeground: {
      titleStyle?: CSSProperties;
      subtitleStyle?: CSSProperties;
      subtitleColor: string;
      titleColor: string;
    };
    surface: {
      textPrimary: string;
      textSecondary: string;
    };
  };
  settings: MediaDialogMediaStackSettings;
}

function getSelectedPlayers(
  playerOptions: MediaDialogMediaStackPlayer[],
  priorityOrder: string[]
): MediaDialogMediaStackPlayer[] {
  return priorityOrder
    .map((entityId) => playerOptions.find((option) => option.id === entityId))
    .filter((option): option is MediaDialogMediaStackPlayer => Boolean(option));
}

export function MediaStackDialogSettings({ controller, settings }: MediaStackDialogSettingsProps) {
  const { t } = useI18n();
  const selectedIds = useMemo(() => new Set(settings.entityIds), [settings.entityIds]);
  const selectedPlayers = useMemo(
    () => getSelectedPlayers(settings.playerOptions, settings.priorityOrder),
    [settings.playerOptions, settings.priorityOrder]
  );
  const cardStyle = {
    backgroundColor: controller.isGlass ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
    borderColor: controller.isGlass ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.12)',
  };

  const updateSelection = (nextEntityIds: string[], nextPriorityOrder = nextEntityIds) => {
    settings.onUpdate({
      entityIds: nextEntityIds,
      priorityOrder: nextPriorityOrder,
      idleBehavior: settings.idleBehavior,
    });
  };

  const handleToggle = (entityId: string) => {
    if (selectedIds.has(entityId)) {
      const nextEntityIds = settings.entityIds.filter((currentId) => currentId !== entityId);
      const nextPriorityOrder = settings.priorityOrder.filter(
        (currentId) => currentId !== entityId
      );
      updateSelection(nextEntityIds, nextPriorityOrder);
      return;
    }

    const nextEntityIds = [...settings.entityIds, entityId];
    updateSelection(nextEntityIds, [...settings.priorityOrder, entityId]);
  };

  const moveSelected = (
    event: MouseEvent<HTMLButtonElement>,
    entityId: string,
    direction: -1 | 1
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const currentIndex = settings.priorityOrder.indexOf(entityId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= settings.priorityOrder.length) {
      return;
    }

    const nextPriorityOrder = [...settings.priorityOrder];
    const [movedId] = nextPriorityOrder.splice(currentIndex, 1);
    nextPriorityOrder.splice(nextIndex, 0, movedId);
    updateSelection(settings.entityIds, nextPriorityOrder);
  };

  return (
    <div className="space-y-5 pt-2 md:space-y-6 md:pt-3">
      {settings.roomValue && settings.roomOptions && settings.onRoomChange ? (
        <div className="flex justify-start">
          <CompactRoomSelector
            value={settings.roomValue}
            label={settings.roomLabel ?? t('dashboard.roomNav.all')}
            options={settings.roomOptions}
            onChange={settings.onRoomChange}
          />
        </div>
      ) : null}

      <CardDialogSection
        label={t('widgets.mediaStack.settings.players')}
        helperText={t('widgets.mediaStack.settings.help')}
      >
        {settings.playerOptions.length === 0 ? (
          <p
            className={`rounded-2xl border px-4 py-4 text-sm ${controller.surface.textSecondary}`}
            style={cardStyle}
          >
            {t('widgets.mediaStack.settings.noneAvailable')}
          </p>
        ) : (
          <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {settings.playerOptions.map((player) => {
              const isChecked = selectedIds.has(player.id);
              const currentIndex = settings.priorityOrder.indexOf(player.id);
              return (
                <li key={player.id}>
                  <SelectableCheckboxRow
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(player.id)}
                    label={<span className="block truncate">{player.name}</span>}
                    description={`${player.room} · ${player.subtitle}`}
                    trailing={
                      isChecked ? (
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${controller.surface.textSecondary}`}>
                            {currentIndex + 1}
                          </span>
                          <GripVertical className={`h-4 w-4 ${controller.surface.textSecondary}`} />
                          <button
                            type="button"
                            aria-label={t('widgets.mediaStack.settings.moveUp')}
                            className={`rounded-full p-1 ${controller.surface.textSecondary}`}
                            onClick={(event) => moveSelected(event, player.id, -1)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={t('widgets.mediaStack.settings.moveDown')}
                            className={`rounded-full p-1 ${controller.surface.textSecondary}`}
                            onClick={(event) => moveSelected(event, player.id, 1)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null
                    }
                    rowClassName={controller.surface.textPrimary}
                    labelClassName="truncate"
                    descriptionClassName={controller.surface.textSecondary}
                    style={cardStyle}
                    selectedStyle={cardStyle}
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
        {selectedPlayers.length === 0 ? (
          <p
            className={`rounded-2xl border px-4 py-4 text-sm ${controller.surface.textSecondary}`}
            style={cardStyle}
          >
            {t('widgets.mediaStack.settings.priorityEmpty')}
          </p>
        ) : (
          <div className="space-y-2">
            {selectedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`rounded-2xl border px-4 py-3 ${controller.surface.textPrimary}`}
                style={cardStyle}
              >
                <div className="truncate text-sm font-medium">{player.name}</div>
                <div className={`mt-0.5 text-xs ${controller.surface.textSecondary}`}>
                  {t('widgets.mediaStack.settings.priorityPosition', {
                    position: index + 1,
                  })}
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
            const active = settings.idleBehavior === idleBehavior;
            return (
              <CardDialogChoicePill
                key={idleBehavior}
                active={active}
                onClick={() =>
                  settings.onUpdate({
                    entityIds: settings.entityIds,
                    priorityOrder: settings.priorityOrder,
                    idleBehavior,
                  })
                }
                className={`flex w-full items-start justify-start rounded-2xl border px-4 py-3 text-left ${controller.surface.textPrimary}`}
                style={cardStyle}
              >
                <div className="text-sm font-medium">{getIdleBehaviorLabel(idleBehavior, t)}</div>
              </CardDialogChoicePill>
            );
          })}
        </div>
      </CardDialogSection>
    </div>
  );
}

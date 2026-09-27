import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CardDialogSection, SelectableCheckboxList } from '@navet/app/components/patterns';
import { Button } from '@navet/app/components/primitives';
import { CompactRoomSelector } from '@navet/app/components/shared/device-editor/compact-room-selector';
import { getDndTransformStyle } from '@navet/app/components/shared/dnd-transform-style';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { GripVertical, Minus, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type {
  MediaDialogMediaStackPlayer,
  MediaDialogMediaStackSettings,
} from './media-dialog.types';

type MediaStackDialogController = {
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

interface MediaStackDialogSettingsProps {
  controller: MediaStackDialogController;
  settings: MediaDialogMediaStackSettings;
}

export function MediaStackDialogSettings({ controller, settings }: MediaStackDialogSettingsProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const addLabel = t('dashboard.roomNav.add');
  const removeLabel = t('settings.customExtensions.remove');
  const selectedIds = useMemo(() => new Set(settings.entityIds), [settings.entityIds]);
  const requiredIds = useMemo(
    () => new Set(settings.requiredEntityIds ?? []),
    [settings.requiredEntityIds]
  );
  const orderedPlayers = useMemo(
    () => [
      ...settings.priorityOrder
        .map((entityId) => settings.playerOptions.find((option) => option.id === entityId))
        .filter((option): option is MediaDialogMediaStackPlayer => Boolean(option)),
      ...settings.playerOptions.filter((option) => !selectedIds.has(option.id)),
    ],
    [selectedIds, settings.playerOptions, settings.priorityOrder]
  );
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 10 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateSelection = (nextEntityIds: string[], nextPriorityOrder = nextEntityIds) => {
    settings.onUpdate({
      entityIds: nextEntityIds,
      priorityOrder: nextPriorityOrder,
      idleBehavior: settings.idleBehavior,
    });
  };

  const handleToggle = (entityId: string) => {
    if (requiredIds.has(entityId)) return;
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = settings.priorityOrder.indexOf(String(active.id));
    const newIndex = settings.priorityOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    updateSelection(settings.entityIds, arrayMove(settings.priorityOrder, oldIndex, newIndex));
  };

  return (
    <div className="space-y-5 pt-2 pb-4 md:pt-3 md:pb-5">
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
            className={`rounded-2xl border px-4 py-4 text-sm ${surface.panelMuted} ${surface.border} ${controller.surface.textSecondary}`}
          >
            {t('widgets.mediaStack.settings.noneAvailable')}
          </p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={settings.priorityOrder} strategy={verticalListSortingStrategy}>
              <SelectableCheckboxList className="max-h-[40vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[55vh]">
                {orderedPlayers.map((player) => {
                  const isSelected = selectedIds.has(player.id);

                  return isSelected ? (
                    <SortableMediaPlayerRow
                      key={player.id}
                      player={player}
                      controller={controller}
                      hoverClassName={surface.hoverBg}
                      removeLabel={removeLabel}
                      removeDisabled={requiredIds.has(player.id)}
                      reorderLabel={t('widgets.mediaStack.settings.players')}
                      onRemove={() => handleToggle(player.id)}
                    />
                  ) : (
                    <li key={player.id} className="flex min-h-14 items-center gap-3 px-4 py-3">
                      <span className="h-9 w-9 shrink-0" aria-hidden="true" />
                      <MediaPlayerDetails player={player} controller={controller} />
                      <Button
                        variant="secondary"
                        size="compact"
                        aria-label={`${addLabel}: ${player.name}`}
                        onClick={() => handleToggle(player.id)}
                        leading={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                        className="h-[30px] shrink-0 rounded-full px-2.5 motion-reduce:transition-none md:h-8 md:px-3"
                      >
                        {addLabel}
                      </Button>
                    </li>
                  );
                })}
              </SelectableCheckboxList>
            </SortableContext>
          </DndContext>
        )}
      </CardDialogSection>
    </div>
  );
}

function SortableMediaPlayerRow({
  controller,
  hoverClassName,
  onRemove,
  player,
  removeDisabled,
  removeLabel,
  reorderLabel,
}: {
  controller: MediaStackDialogController;
  hoverClassName: string;
  onRemove: () => void;
  player: MediaDialogMediaStackPlayer;
  removeDisabled: boolean;
  removeLabel: string;
  reorderLabel: string;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: player.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={getDndTransformStyle(transform, transition)}
      className={`relative flex min-h-14 items-center gap-3 px-4 py-3 ${
        isDragging ? 'z-10 opacity-80' : ''
      }`}
    >
      <button
        type="button"
        aria-label={`${reorderLabel}: ${player.name}`}
        className={`flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-md transition-colors motion-reduce:transition-none ${controller.surface.textSecondary} ${hoverClassName}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <MediaPlayerDetails player={player} controller={controller} />
      <Button
        variant="secondary"
        size="compact"
        disabled={removeDisabled}
        aria-label={`${removeLabel}: ${player.name}`}
        onClick={onRemove}
        leading={<Minus className="h-3.5 w-3.5" aria-hidden="true" />}
        className="h-[30px] shrink-0 rounded-full px-2.5 motion-reduce:transition-none md:h-8 md:px-3"
      >
        {removeLabel}
      </Button>
    </li>
  );
}

function MediaPlayerDetails({
  controller,
  player,
}: {
  controller: MediaStackDialogController;
  player: MediaDialogMediaStackPlayer;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className={`truncate text-sm font-medium ${controller.surface.textPrimary}`}>
        {player.name}
      </div>
      <div className={`mt-0.5 truncate text-xs ${controller.surface.textSecondary}`}>
        {player.room}
      </div>
    </div>
  );
}

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
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  Button,
  DialogFooter,
  DialogShell,
  settingsDialogContentClass,
} from '@/app/components/primitives';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

interface RoomOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: string[];
  areas: Array<{ area_id: string; name: string }>;
  roomHiddenItemCounts: Map<string, number>;
  roomEntityCounts: Map<string, number>;
  onRoomOrderChange?: (rooms: string[]) => void;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) {
    return items;
  }
  next.splice(toIndex, 0, moved);
  return next;
}

export const RoomOrderDialog = memo(function RoomOrderDialog({
  isOpen,
  onOpenChange,
  rooms,
  areas,
  roomHiddenItemCounts,
  roomEntityCounts,
  onRoomOrderChange,
}: RoomOrderDialogProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const separatorClassName =
    theme === 'light' ? 'bg-slate-300/90' : theme === 'black' ? 'bg-white/28' : 'bg-white/14';
  const [draftRooms, setDraftRooms] = useState(rooms);
  const [pendingDeleteRoom, setPendingDeleteRoom] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isDeleteDialogOpen = pendingDeleteRoom !== null;

  useEffect(() => {
    if (isOpen) {
      setDraftRooms(rooms);
      setPendingDeleteRoom(null);
      setIsSaving(false);
    }
  }, [isOpen, rooms]);

  const areaIdByName = useMemo(() => {
    return new Map(areas.map((area) => [area.name, area.area_id]));
  }, [areas]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const moveRoom = (fromIndex: number, direction: -1 | 1) => {
    setDraftRooms((current) => {
      return moveItem(current, fromIndex, fromIndex + direction);
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    setDraftRooms((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleDeleteRoom = async () => {
    if (!pendingDeleteRoom) {
      return;
    }

    const areaId = areaIdByName.get(pendingDeleteRoom);
    if (!areaId) {
      return;
    }

    setIsSaving(true);
    try {
      await homeAssistantService.deleteArea(areaId);
      const nextRooms = draftRooms.filter((room) => room !== pendingDeleteRoom);
      setDraftRooms(nextRooms);
      onRoomOrderChange?.(nextRooms);
      setPendingDeleteRoom(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDone = () => {
    onRoomOrderChange?.(draftRooms);
    onOpenChange(false);
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentAriaDescribedBy={undefined}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={settingsDialogContentClass(surface, {
        maxWidth: 'sm',
        height: 'capped',
        overflow: true,
        padding: false,
        animate: true,
      })}
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className={`text-xl font-semibold ${surface.textPrimary}`}>
              {t('dashboard.roomNav.reorderDialog.title')}
            </Dialog.Title>
            <Dialog.Description className={`mt-1 text-sm ${surface.textSecondary}`}>
              {t('dashboard.roomNav.reorderDialog.description')}
            </Dialog.Description>
          </div>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={draftRooms} strategy={verticalListSortingStrategy}>
            <div className={`overflow-hidden rounded-2xl border ${surface.border}`}>
              {draftRooms.map((room, index) => (
                <RoomOrderDialogRow
                  key={room}
                  room={room}
                  index={index}
                  totalCount={draftRooms.length}
                  isLast={index === draftRooms.length - 1}
                  surface={surface}
                  separatorClassName={separatorClassName}
                  entityCount={roomEntityCounts.get(room) ?? 0}
                  hiddenCount={roomHiddenItemCounts.get(room) ?? 0}
                  onMove={moveRoom}
                  onDelete={() => setPendingDeleteRoom(room)}
                  deleteDisabled={isSaving}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <DialogFooter>
          <Button variant="soft" size="small" onClick={handleDone} disabled={isSaving}>
            {t('common.done')}
          </Button>
        </DialogFooter>
      </div>

      <DeleteRoomDialog
        isOpen={isDeleteDialogOpen}
        isSaving={isSaving}
        room={pendingDeleteRoom}
        surface={surface}
        onClose={() => setPendingDeleteRoom(null)}
        onConfirm={() => void handleDeleteRoom()}
      />
    </DialogShell>
  );
});

interface DeleteRoomDialogProps {
  isOpen: boolean;
  isSaving: boolean;
  room: string | null;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteRoomDialog = memo(function DeleteRoomDialog({
  isOpen,
  isSaving,
  room,
  surface,
  onClose,
  onConfirm,
}: DeleteRoomDialogProps) {
  const { t } = useI18n();

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      contentAriaDescribedBy={undefined}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={settingsDialogContentClass(surface, {
        maxWidth: 'sm',
        overflow: false,
        padding: false,
        animate: true,
      })}
    >
      <div className="p-6">
        <div className="space-y-2">
          <Dialog.Title className={`text-lg font-semibold ${surface.textPrimary}`}>
            {t('dashboard.roomNav.reorderDialog.deleteTitle')}
          </Dialog.Title>
          <Dialog.Description className={`text-sm ${surface.textSecondary}`}>
            {t('dashboard.roomNav.reorderDialog.deleteDescription', {
              room: room ?? '',
            })}
          </Dialog.Description>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="small" onClick={onClose} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="soft"
            size="small"
            onClick={onConfirm}
            loading={isSaving}
            className="text-red-500"
          >
            {t('dashboard.roomNav.reorderDialog.deleteAction')}
          </Button>
        </DialogFooter>
      </div>
    </DialogShell>
  );
});

interface RoomOrderDialogRowProps {
  room: string;
  index: number;
  totalCount: number;
  isLast: boolean;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  separatorClassName: string;
  entityCount: number;
  hiddenCount: number;
  onMove: (fromIndex: number, direction: -1 | 1) => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}

const RoomOrderDialogRow = memo(function RoomOrderDialogRow({
  room,
  index,
  totalCount,
  isLast,
  surface,
  separatorClassName,
  entityCount,
  hiddenCount,
  onMove,
  onDelete,
  deleteDisabled,
}: RoomOrderDialogRowProps) {
  const { t } = useI18n();
  const visibleCount = Math.max(0, entityCount - hiddenCount);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: room,
  });

  return (
    <div
      ref={setNodeRef}
      style={getDndTransformStyle(transform, transition)}
      className={`flex items-center gap-2 px-3 py-2.5 ${surface.panel} ${
        isLast ? '' : `border-b ${surface.border}`
      }`}
    >
      <button
        type="button"
        aria-label={t('dashboard.roomNav.reorderDialog.dragRoom', { room })}
        className={`flex h-8 w-8 touch-none items-center justify-center rounded-full transition-colors ${surface.textSecondary} ${surface.hoverBg}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${surface.textPrimary}`}>{room}</div>
        <div className={`truncate text-xs ${surface.textMuted}`}>
          {t(
            visibleCount <= 1
              ? 'dashboard.roomNav.reorderDialog.itemCount.one'
              : 'dashboard.roomNav.reorderDialog.itemCount.other',
            { count: visibleCount }
          )}
          {hiddenCount > 0
            ? ` · ${t('dashboard.roomNav.reorderDialog.hiddenCount', { count: hiddenCount })}`
            : ''}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          iconOnly
          size="compact"
          variant="secondary"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          label={t('dashboard.roomNav.reorderDialog.moveUp')}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          iconOnly
          size="compact"
          variant="secondary"
          onClick={() => onMove(index, 1)}
          disabled={index === totalCount - 1}
          label={t('dashboard.roomNav.reorderDialog.moveDown')}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <div aria-hidden="true" className={`mx-1 h-5 w-px rounded-full ${separatorClassName}`} />
        <Button
          iconOnly
          size="compact"
          variant="soft"
          onClick={onDelete}
          disabled={deleteDisabled}
          label={t('dashboard.roomNav.reorderDialog.deleteRoom', { room })}
          className="border-red-500/20 bg-red-500/8 text-red-500 hover:bg-red-500/12"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});

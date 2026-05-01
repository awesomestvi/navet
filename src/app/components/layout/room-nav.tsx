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
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Edit3,
  GripVertical,
  LayoutGrid,
  Lightbulb,
  Trash2,
} from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, memo, useEffect, useMemo, useState } from 'react';
import {
  Button,
  DialogFooter,
  DialogShell,
  settingsDialogContentClass,
} from '@/app/components/primitives';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import { getThemeDropdownSurfaceClasses } from '@/app/components/shared/theme/dropdown-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/components/ui/utils';
import type { AllViewGrouping } from '@/app/features/dashboard';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getVisibleRoomNavRooms } from './room-nav.utils';

interface RoomNavProps {
  rooms?: string[];
  roomHiddenItemCounts?: Map<string, number>;
  roomItemCounts?: Map<string, number>;
  activeRoom: string;
  onRoomChange: (room: string) => void;
  allViewGrouping?: AllViewGrouping;
  isEditMode: boolean;
  onRoomOrderChange?: (rooms: string[]) => void;
  onAllViewGroupingChange?: (grouping: AllViewGrouping) => void;
  onToggleEditMode: () => void;
  onAddEntity?: () => void;
  addEntityLabel?: string;
}

interface RoomNavItemProps {
  room: string;
  activeRoom: string;
  allLabel: string;
  activeClassName: string;
  inactiveClassName: string;
  onRoomChange: (room: string) => void;
}

interface RoomNavMenuButtonProps {
  icon: typeof Lightbulb;
  label: string;
  textSecondary: string;
  className: string;
}

export const RoomNav = memo(function RoomNav({
  rooms = [],
  roomHiddenItemCounts = new Map(),
  roomItemCounts = new Map(),
  activeRoom,
  onRoomChange,
  allViewGrouping = 'custom',
  isEditMode,
  onRoomOrderChange,
  onAllViewGroupingChange,
  onToggleEditMode,
  onAddEntity,
  addEntityLabel = 'Add Entity',
}: RoomNavProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const areas = useHomeAssistant(homeAssistantSelectors.areas);
  const surface = getThemeSurfaceTokens(theme);
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false);
  const manageableRooms = useMemo(() => {
    const areaNames = areas.map((area) => area.name).filter((name) => name && name !== 'All');
    const orderedKnownRooms = rooms.filter((room) => areaNames.includes(room));
    const unorderedAreaRooms = areaNames.filter((room) => !orderedKnownRooms.includes(room));
    const navetOnlyRooms = rooms.filter((room) => room !== 'All' && !areaNames.includes(room));
    return [...new Set([...orderedKnownRooms, ...unorderedAreaRooms, ...navetOnlyRooms])];
  }, [areas, rooms]);
  const visibleRooms = useMemo(() => getVisibleRoomNavRooms(rooms), [rooms]);
  const textSecondary = surface.textSecondary;
  const inactiveBg = surface.subtleBg;
  const hoverBg = surface.hoverBg;
  const dividerClass =
    theme === 'light' ? 'bg-slate-300/90' : theme === 'black' ? 'bg-white/30' : 'bg-white/14';
  const showAllViewGrouping = activeRoom === 'All' && onAllViewGroupingChange;
  const canReorderRooms = isEditMode && Boolean(onRoomOrderChange) && manageableRooms.length > 0;
  const hasEditMenus = Boolean(
    canReorderRooms || (isEditMode && showAllViewGrouping) || (isEditMode && onAddEntity)
  );
  const lightPillClassName =
    theme === 'light'
      ? 'border-slate-300/80 bg-white/92 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.3)]'
      : '';
  const inactiveRoomItemClassName =
    theme === 'light' ? `${textSecondary} ${hoverBg}` : `${textSecondary} ${hoverBg}`;
  const activeRoomItemClassName =
    theme === 'light'
      ? 'room-nav-item-active text-slate-950 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.28)]'
      : 'room-nav-item-active text-white';
  const actionPillClassName = `flex items-center gap-2 rounded-[22px] px-3 py-2 text-sm md:gap-2.5 md:px-3.5 md:py-2 transition-colors ${inactiveBg} ${lightPillClassName} ${hoverBg}`;
  const dropdownItemClassName = `rounded-xl px-3 py-2 ${surface.textPrimary} ${hoverBg}`;
  const allViewGroupingOptions: Array<{ label: string; value: AllViewGrouping }> = [
    { label: t('dashboard.roomNav.grouping.custom'), value: 'custom' },
    { label: t('dashboard.roomNav.grouping.room'), value: 'room' },
    { label: t('dashboard.roomNav.grouping.type'), value: 'type' },
    { label: t('dashboard.roomNav.grouping.none'), value: 'none' },
  ];

  return (
    <>
      <div className="hidden md:block">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            <div className="flex min-w-max items-center gap-1.5 md:gap-2">
              {visibleRooms.map((room) => (
                <RoomNavItem
                  key={room}
                  room={room}
                  activeRoom={activeRoom}
                  allLabel={t('dashboard.roomNav.all')}
                  activeClassName={activeRoomItemClassName}
                  inactiveClassName={inactiveRoomItemClassName}
                  onRoomChange={onRoomChange}
                />
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 pl-1.5 md:gap-2 md:pl-2">
            {isEditMode && showAllViewGrouping ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <RoomNavMenuButton
                    icon={LayoutGrid}
                    label={t('dashboard.roomNav.view')}
                    textSecondary={textSecondary}
                    className={actionPillClassName}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className={cn(getThemeDropdownSurfaceClasses(theme), 'overflow-visible p-2')}
                >
                  <DropdownMenuLabel className={`px-3 py-2 text-sm font-medium ${textSecondary}`}>
                    {t('dashboard.roomNav.groupBy')}
                  </DropdownMenuLabel>
                  {allViewGroupingOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      className={dropdownItemClassName}
                      onClick={() => onAllViewGroupingChange(option.value)}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span>{option.label}</span>
                      </span>
                      {allViewGrouping === option.value ? <Check className="h-4 w-4" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {canReorderRooms ? (
              <InteractivePill
                onClick={() => setIsReorderDialogOpen(true)}
                intent="action"
                size="small"
                className={actionPillClassName}
              >
                <GripVertical className={`h-4 w-4 ${textSecondary}`} />
                <span className={`hidden text-sm font-medium md:inline ${textSecondary}`}>
                  {t('dashboard.roomNav.reorder')}
                </span>
              </InteractivePill>
            ) : null}

            {isEditMode && onAddEntity ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <RoomNavMenuButton
                    icon={Lightbulb}
                    label={t('dashboard.roomNav.add')}
                    textSecondary={textSecondary}
                    className={actionPillClassName}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className={cn(getThemeDropdownSurfaceClasses(theme), 'overflow-visible p-2')}
                >
                  <DropdownMenuItem className={dropdownItemClassName} onClick={onAddEntity}>
                    <Lightbulb className="h-4 w-4" />
                    {addEntityLabel}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {hasEditMenus ? (
              <div
                aria-hidden="true"
                className={`mx-1 h-6 w-px shrink-0 rounded-full ${dividerClass}`}
              />
            ) : null}

            <InteractivePill
              onClick={onToggleEditMode}
              active={isEditMode}
              intent="action"
              size="small"
              className={`room-nav-action-pill flex items-center gap-2 rounded-[22px] px-3 py-2 text-sm md:gap-2.5 md:px-3.5 md:py-2 transition-colors ${
                isEditMode ? 'shadow-sm' : `${inactiveBg} ${lightPillClassName} ${hoverBg}`
              }`}
              style={
                isEditMode
                  ? {
                      backgroundColor: accentColor,
                      borderColor: `${accentColor}66`,
                      boxShadow: `0 14px 28px -18px ${accentColor}`,
                    }
                  : undefined
              }
            >
              {isEditMode ? (
                <>
                  <Check className="h-4 w-4 text-white" />
                  <span className="hidden text-sm font-medium text-white md:inline">
                    {t('dashboard.roomNav.doneEditing')}
                  </span>
                </>
              ) : (
                <>
                  <Edit3 className={`h-4 w-4 ${textSecondary}`} />
                  <span className={`hidden text-sm font-medium md:inline ${textSecondary}`}>
                    {t('dashboard.roomNav.customize')}
                  </span>
                </>
              )}
            </InteractivePill>
          </div>
        </div>
      </div>
      {canReorderRooms ? (
        <RoomOrderDialog
          isOpen={isReorderDialogOpen}
          onOpenChange={setIsReorderDialogOpen}
          rooms={manageableRooms}
          areas={areas}
          roomHiddenItemCounts={roomHiddenItemCounts}
          roomEntityCounts={roomItemCounts}
          onRoomOrderChange={onRoomOrderChange}
        />
      ) : null}
    </>
  );
});

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

const RoomOrderDialog = memo(function RoomOrderDialog({
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
  const [roomPendingDelete, setRoomPendingDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftRooms(rooms);
      setRoomPendingDelete(null);
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
    if (!roomPendingDelete) {
      return;
    }

    const areaId = areaIdByName.get(roomPendingDelete);
    if (!areaId) {
      return;
    }

    setIsSaving(true);
    try {
      await homeAssistantService.deleteArea(areaId);
      const nextRooms = draftRooms.filter((room) => room !== roomPendingDelete);
      setDraftRooms(nextRooms);
      onRoomOrderChange?.(nextRooms);
      setRoomPendingDelete(null);
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
                  onDelete={() => setRoomPendingDelete(room)}
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

      <DialogShell
        isOpen={roomPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRoomPendingDelete(null);
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
                room: roomPendingDelete ?? '',
              })}
            </Dialog.Description>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setRoomPendingDelete(null)}
              disabled={isSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="soft"
              size="small"
              onClick={() => void handleDeleteRoom()}
              loading={isSaving}
              className="text-red-500"
            >
              {t('dashboard.roomNav.reorderDialog.deleteAction')}
            </Button>
          </DialogFooter>
        </div>
      </DialogShell>
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

const RoomNavMenuButton = memo(
  forwardRef<HTMLButtonElement, RoomNavMenuButtonProps & ButtonHTMLAttributes<HTMLButtonElement>>(
    function RoomNavMenuButton({ icon: Icon, label, textSecondary, className, ...props }, ref) {
      return (
        <InteractivePill ref={ref} intent="action" size="small" className={className} {...props}>
          <Icon className={`h-4 w-4 ${textSecondary}`} />
          <span className={`hidden text-sm font-medium md:inline ${textSecondary}`}>{label}</span>
          <ChevronDown className={`h-3.5 w-3.5 ${textSecondary}`} />
        </InteractivePill>
      );
    }
  )
);

const RoomNavItem = memo(function RoomNavItem({
  room,
  activeRoom,
  allLabel,
  activeClassName,
  inactiveClassName,
  onRoomChange,
}: RoomNavItemProps) {
  return (
    <InteractivePill
      active={activeRoom === room}
      onClick={() => onRoomChange(room)}
      size="small"
      variant="ghost"
      className={`room-nav-item rounded-[22px] whitespace-nowrap shrink-0 transition-colors ${
        activeRoom === room ? activeClassName : inactiveClassName
      }`}
    >
      {room === 'All' ? allLabel : room}
    </InteractivePill>
  );
});

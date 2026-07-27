import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  CardDialogTabList,
  DashboardEmptyState,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import {
  Button,
  IconButton,
  Input,
  InteractivePill,
  LoadingSpinner,
  Select,
} from '@navet/app/components/primitives';
import { getDndTransformStyle } from '@navet/app/components/shared/dnd-transform-style';
import {
  getThemeFocusRingClassName,
  getThemeSurfaceTokens,
  navetIconSizeTokens,
  navetSemanticColorTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { cn } from '@navet/app/components/ui/utils';
import { getDeviceTypeIcon } from '@navet/app/constants/device-type-icons';
import { useTheme } from '@navet/app/hooks';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Combine,
  Edit3,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  Heart,
  Home,
  Layers3,
  type LucideIcon,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Plus,
  Scissors,
  Search,
  SearchX,
  Settings2,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useId, useMemo, useState } from 'react';
import { RoomSymbolIcon } from './room-symbol-icon';
import { RoomWallpaperPreviewImage } from './room-wallpaper-preview-image';
import type {
  RoomWorkspaceActions,
  RoomWorkspaceComponentProps,
  RoomWorkspaceDeviceViewModel,
  RoomWorkspaceLabels,
  RoomWorkspaceRoomViewModel,
  RoomWorkspaceStatus,
  RoomWorkspaceStatusTone,
} from './room-workspace.types';

type SurfaceTokens = ReturnType<typeof getThemeSurfaceTokens>;

interface WorkspacePanelProps extends RoomWorkspaceComponentProps {
  surface: SurfaceTokens;
  accentColor: string;
  showInlineSaveBar?: boolean;
}

function RoomDeviceIcon({
  device,
  surface,
}: {
  device: RoomWorkspaceDeviceViewModel;
  surface: SurfaceTokens;
}) {
  const Icon = getDeviceTypeIcon(device.entityType, device.deviceClass);

  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border',
        surface.iconBg,
        surface.borderStrong
      )}
      aria-hidden="true"
    >
      <Icon className={cn(navetIconSizeTokens.sm, surface.textSecondary)} />
    </span>
  );
}

function getStatusToneClassName(tone: RoomWorkspaceStatusTone | undefined, surface: SurfaceTokens) {
  if (tone === 'positive') {
    return navetSemanticColorTokens.success;
  }
  if (tone === 'warning') {
    return navetSemanticColorTokens.warning;
  }
  if (tone === 'critical') {
    return navetSemanticColorTokens.error;
  }
  return `${surface.subtleBg} ${surface.borderStrong} ${surface.textSecondary}`;
}

function getChangeToneClassName(
  tone: 'neutral' | 'warning' | 'critical' | undefined,
  surface: SurfaceTokens
) {
  if (tone === 'warning') {
    return navetSemanticColorTokens.warning;
  }
  if (tone === 'critical') {
    return navetSemanticColorTokens.error;
  }
  return `${surface.subtleBg} ${surface.borderStrong} ${surface.textSecondary}`;
}

function ChangeDetailList({
  details,
  className,
}: {
  details: string[] | undefined;
  className?: string;
}) {
  if (!details?.length) {
    return null;
  }

  return (
    <ul className={cn('mt-2 space-y-1.5', className)}>
      {details.map((detail, index) => (
        <li key={`${index}-${detail}`} className="flex items-start gap-2">
          <span
            className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-current opacity-55"
            aria-hidden="true"
          />
          <span>{detail}</span>
        </li>
      ))}
    </ul>
  );
}

function RoomSymbol({
  room,
  surface,
  size = 'standard',
}: {
  room: RoomWorkspaceRoomViewModel;
  surface: SurfaceTokens;
  size?: 'compact' | 'header' | 'standard';
}) {
  const isCompact = size === 'compact';
  const isHeader = size === 'header';

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center border font-semibold',
        isCompact
          ? 'h-8 w-8 rounded-[14px] text-sm'
          : isHeader
            ? 'h-9 w-9 rounded-2xl text-sm'
            : 'h-10 w-10 rounded-[18px] text-base',
        surface.iconBg,
        surface.borderStrong,
        surface.textPrimary
      )}
    >
      {room.symbol ? (
        <RoomSymbolIcon
          value={room.symbol}
          className={size === 'standard' ? navetIconSizeTokens.md : navetIconSizeTokens.sm}
        />
      ) : (
        room.name.trim().slice(0, 1).toLocaleUpperCase() || <Home />
      )}
    </span>
  );
}

function RoomImagePreview({
  room,
  surface,
  className,
  children,
}: {
  room: RoomWorkspaceRoomViewModel;
  surface: SurfaceTokens;
  className?: string;
  children?: ReactNode;
}) {
  if (!room.image) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative isolate aspect-[16/7] w-full overflow-hidden rounded-[24px] border',
        surface.border,
        children ? 'bg-slate-950' : surface.subtleBg,
        className
      )}
    >
      <RoomWallpaperPreviewImage
        value={room.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {children ? (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,transparent_32%,rgba(2,6,12,0.5)_68%,rgba(2,6,12,0.94)_100%)]"
          />
          <div className="absolute inset-x-0 bottom-0 z-10 min-w-0 p-4 md:p-5">{children}</div>
        </>
      ) : null}
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  description,
  descriptionLive = false,
  hideDescriptionOnSmall = true,
  size = 'standard',
  surface,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  descriptionLive?: boolean;
  hideDescriptionOnSmall?: boolean;
  size?: 'compact' | 'standard';
  surface: SurfaceTokens;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className={cn(navetTypographyTokens.eyebrow, surface.textMuted)}>{eyebrow}</p>
        ) : null}
        <h2
          className={cn(
            eyebrow ? 'mt-1' : '',
            size === 'compact'
              ? navetTypographyTokens.titleMd
              : navetTypographyTokens.featureHeading,
            surface.textPrimary
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            aria-live={descriptionLive ? 'polite' : undefined}
            className={cn(
              'mt-1 max-w-2xl',
              hideDescriptionOnSmall ? 'max-sm:sr-only' : '',
              size === 'compact'
                ? navetTypographyTokens.compactMetadata
                : navetTypographyTokens.body,
              surface.textSecondary
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function GroupActionsMenu({
  groupId,
  groupName,
  canRename,
  canDelete,
  canMoveEarlier,
  canMoveLater,
  labels,
  actions,
}: {
  groupId: string;
  groupName: string;
  canRename: boolean;
  canDelete: boolean;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
}) {
  if (
    !actions.onMoveGroup &&
    (!canRename || !actions.onRenameGroup) &&
    !actions.onChooseGroupAppearance &&
    (!canDelete || !actions.onRequestGroupDeletion)
  ) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="compact"
          iconOnly
          label={`${labels.moreActions}: ${groupName}`}
          className="min-h-11 min-w-11 motion-reduce:transition-none"
        >
          <MoreHorizontal className={navetIconSizeTokens.sm} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-52 motion-reduce:animate-none">
        {actions.onMoveGroup ? (
          <>
            <DropdownMenuItem
              aria-label={`${labels.moveEarlier}: ${groupName}`}
              disabled={!canMoveEarlier}
              className="min-h-11 motion-reduce:transition-none"
              onClick={() => actions.onMoveGroup?.(groupId, 'earlier')}
            >
              <ArrowUp />
              {labels.moveEarlier}
            </DropdownMenuItem>
            <DropdownMenuItem
              aria-label={`${labels.moveLater}: ${groupName}`}
              disabled={!canMoveLater}
              className="min-h-11 motion-reduce:transition-none"
              onClick={() => actions.onMoveGroup?.(groupId, 'later')}
            >
              <ArrowDown />
              {labels.moveLater}
            </DropdownMenuItem>
          </>
        ) : null}
        {canRename && actions.onRenameGroup ? (
          <DropdownMenuItem
            className="min-h-11 motion-reduce:transition-none"
            onClick={() => actions.onRenameGroup?.(groupId)}
          >
            <Pencil />
            {labels.renameGroup}
          </DropdownMenuItem>
        ) : null}
        {actions.onChooseGroupAppearance ? (
          <DropdownMenuItem
            className="min-h-11 motion-reduce:transition-none"
            onClick={() => actions.onChooseGroupAppearance?.(groupId)}
          >
            <Sparkles />
            {labels.chooseAppearance}
          </DropdownMenuItem>
        ) : null}
        {canDelete && actions.onRequestGroupDeletion ? (
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11 motion-reduce:transition-none"
            onClick={() => actions.onRequestGroupDeletion?.(groupId)}
          >
            <Trash2 />
            {labels.deleteGroup}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RoomActionsSection({
  room,
  labels,
  actions,
  surface,
}: {
  room: RoomWorkspaceRoomViewModel;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
  surface: SurfaceTokens;
}) {
  const { theme } = useTheme();
  const destructiveTextClassName = theme === 'light' ? 'text-red-700' : 'text-red-300';
  const canMerge = room.canMerge && actions.onRequestRoomMerge;
  const canSplit = room.canSplit && actions.onRequestRoomSplit;
  const canDelete = room.canDelete && actions.onRequestRoomDeletion;
  const roomActions: Array<{
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    destructive?: boolean;
    onClick: () => void;
  }> = [
    ...(canMerge
      ? [
          {
            id: 'merge',
            title: labels.mergeRoom,
            description: labels.mergeRoomDescription,
            icon: Combine,
            onClick: () => actions.onRequestRoomMerge?.(room.id),
          },
        ]
      : []),
    ...(canSplit
      ? [
          {
            id: 'split',
            title: labels.splitRoom,
            description: labels.splitRoomDescription,
            icon: Scissors,
            onClick: () => actions.onRequestRoomSplit?.(room.id),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            id: 'delete',
            title: labels.deleteRoom,
            description: labels.deleteRoomDescription,
            icon: Trash2,
            destructive: true,
            onClick: () => actions.onRequestRoomDeletion?.(room.id),
          },
        ]
      : []),
  ];

  if (roomActions.length === 0) {
    return null;
  }

  return (
    <section aria-label={labels.roomActionsTitle} className={cn('border-t pt-5', surface.border)}>
      <h3 className={cn(navetTypographyTokens.titleSm, surface.textPrimary)}>
        {labels.roomActionsTitle}
      </h3>
      <div
        className={cn(
          'mt-3 overflow-hidden rounded-[24px] border',
          surface.border,
          surface.subtleBg
        )}
      >
        {roomActions.map((action, index) => {
          const ActionIcon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className={cn(
                'flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left transition-colors motion-reduce:transition-none',
                index > 0 ? `border-t ${surface.border}` : '',
                surface.hoverBg,
                getThemeFocusRingClassName(theme)
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border',
                  surface.iconBg,
                  surface.borderStrong,
                  action.destructive ? navetSemanticColorTokens.error : surface.textSecondary
                )}
                aria-hidden="true"
              >
                <ActionIcon className={navetIconSizeTokens.sm} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm font-semibold',
                    action.destructive ? destructiveTextClassName : surface.textPrimary
                  )}
                >
                  {action.title}
                </span>
                <span className={cn('mt-1 block text-xs leading-5', surface.textMuted)}>
                  {action.description}
                </span>
              </span>
              <ChevronRight
                className={cn(
                  'mt-2 shrink-0',
                  navetIconSizeTokens.sm,
                  action.destructive ? destructiveTextClassName : surface.textMuted
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function RoomWorkspaceHeader({
  viewModel,
  labels,
  actions,
  surface,
  trailingAction,
}: WorkspacePanelProps & { trailingAction?: ReactNode }) {
  return (
    <header className={cn('border-b px-3 py-3 md:px-5 md:py-4', surface.border)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
            {labels.title}
          </h1>
          <p
            className={cn(
              'mt-1 max-w-2xl max-sm:sr-only',
              navetTypographyTokens.body,
              surface.textSecondary
            )}
          >
            {labels.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant={viewModel.mode === 'manage' ? 'ghost' : 'primary'}
            size="compact"
            leading={
              viewModel.mode === 'manage' ? (
                <ArrowLeft className={navetIconSizeTokens.xs} aria-hidden="true" />
              ) : (
                <Edit3 className={navetIconSizeTokens.xs} aria-hidden="true" />
              )
            }
            onClick={() => actions.onModeChange(viewModel.mode === 'manage' ? 'browse' : 'manage')}
            className="h-[30px] shrink-0 rounded-full px-2.5 motion-reduce:transition-none md:h-8 md:px-3"
          >
            {viewModel.mode === 'manage' ? labels.browseMode : labels.manageMode}
          </Button>
          {trailingAction}
        </div>
      </div>
    </header>
  );
}

function RoomOutlineItem({
  room,
  selected,
  manage,
  dragDisabled,
  labels,
  actions,
  surface,
  accentColor,
}: {
  room: RoomWorkspaceRoomViewModel;
  selected: boolean;
  manage: boolean;
  dragDisabled: boolean;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
  surface: SurfaceTokens;
  accentColor: string;
}) {
  const { theme } = useTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: room.id,
    disabled: dragDisabled,
  });
  const selectedStyle: CSSProperties | undefined = selected
    ? { backgroundColor: `${accentColor}14` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group/room relative flex min-w-0 items-center rounded-[22px] border transition-[background-color,border-color] motion-reduce:transition-none',
        selected ? surface.borderStrong : 'border-transparent',
        selected ? '' : surface.hoverBg,
        isDragging ? 'z-10 opacity-75 shadow-lg' : ''
      )}
      style={{
        ...getDndTransformStyle(transform, transition),
        ...selectedStyle,
        contentVisibility: 'auto',
        containIntrinsicSize: '48px',
      }}
    >
      {selected ? (
        <span
          className="absolute inset-y-2.5 left-0 w-1 rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
      ) : null}
      {manage && actions.onDropRoom ? (
        <button
          type="button"
          aria-label={labels.dragRoom(room.name)}
          disabled={dragDisabled}
          className={cn(
            'ml-1 flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-2xl motion-reduce:transition-none',
            dragDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing',
            surface.hoverBg,
            surface.textSecondary
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className={navetIconSizeTokens.sm} aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          actions.onSelectRoom(room.id);
          if (manage) {
            actions.onStageChange('room-details');
          }
        }}
        aria-current={selected ? 'page' : undefined}
        aria-label={`${labels.selectRoom}: ${room.name}`}
        className={cn(
          'flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[22px] px-2.5 py-1 text-left',
          getThemeFocusRingClassName(theme)
        )}
      >
        <RoomSymbol room={room} surface={surface} size="compact" />
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-semibold', surface.textPrimary)}>
            {room.name}
          </span>
          <span className={cn('mt-0.5 block truncate text-xs', surface.textMuted)}>
            {room.deviceSummary}
          </span>
        </span>
        {room.attentionSummary ? (
          <CircleAlert
            className={cn(navetIconSizeTokens.sm, 'shrink-0 text-amber-400')}
            aria-hidden="true"
          />
        ) : null}
      </button>
    </div>
  );
}

export function RoomOutline({
  viewModel,
  labels,
  actions,
  surface,
  accentColor,
}: WorkspacePanelProps) {
  const [isUngroupedCollapsed, setIsUngroupedCollapsed] = useState(false);
  const ungroupedSectionId = useId();
  const searchActive = viewModel.query.trim().length > 0;
  const dragDisabled = viewModel.mode !== 'manage' || searchActive || !actions.onDropRoom;
  const roomsById = useMemo(
    () => new Map(viewModel.rooms.map((room) => [room.id, room])),
    [viewModel.rooms]
  );
  const groupedRoomIds = useMemo(
    () => new Set(viewModel.groups.flatMap((group) => group.roomIds)),
    [viewModel.groups]
  );
  const ungroupedRooms = viewModel.rooms.filter((room) => !groupedRoomIds.has(room.id));
  const isUngroupedSectionCollapsed = isUngroupedCollapsed && !searchActive;
  const hasRooms = viewModel.rooms.length > 0;
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (dragDisabled || !over || active.id === over.id) {
      return;
    }
    actions.onDropRoom?.(String(active.id), String(over.id));
  };

  return (
    <nav
      aria-label={labels.roomsRegion}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-region="outline"
    >
      <div className={cn('border-b p-4 md:p-5', surface.border)}>
        <PanelHeading
          title={labels.roomsRegion}
          description={viewModel.resultSummary ?? viewModel.inventorySummary}
          descriptionLive
          hideDescriptionOnSmall={false}
          size="compact"
          surface={surface}
          action={
            viewModel.mode === 'manage' && (actions.onAddGroup || actions.onAddRoom) ? (
              <div className="flex shrink-0 items-center gap-1">
                {actions.onAddGroup ? (
                  <Button
                    variant="ghost"
                    size="compact"
                    iconOnly
                    label={labels.addGroup}
                    onClick={actions.onAddGroup}
                    className="min-h-11 min-w-11 motion-reduce:transition-none"
                  >
                    <FolderPlus className={navetIconSizeTokens.sm} />
                  </Button>
                ) : null}
                {actions.onAddRoom ? (
                  <Button
                    variant="ghost"
                    size="compact"
                    iconOnly
                    label={labels.addRoom}
                    onClick={() => actions.onAddRoom?.()}
                    className="min-h-11 min-w-11 motion-reduce:transition-none"
                  >
                    <Plus className={navetIconSizeTokens.sm} />
                  </Button>
                ) : null}
              </div>
            ) : undefined
          }
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"
        data-room-workspace-outline-content
      >
        <div className="mb-2 min-w-0">
          <Input
            type="search"
            size="small"
            name="room-workspace-search"
            autoComplete="off"
            spellCheck={false}
            value={viewModel.query}
            aria-label={labels.searchLabel}
            placeholder={labels.searchPlaceholder}
            onChange={(event) => actions.onQueryChange(event.currentTarget.value)}
            leading={<Search className={navetIconSizeTokens.sm} aria-hidden="true" />}
            trailing={
              viewModel.query ? (
                <IconButton
                  size="small"
                  variant="ghost"
                  label={labels.clearSearch}
                  onClick={() => actions.onQueryChange('')}
                  icon={<X className={navetIconSizeTokens.sm} />}
                  className="border-transparent motion-reduce:transition-none"
                />
              ) : null
            }
            containerClassName="min-w-0"
            inputClassName="[&::-webkit-search-cancel-button]:appearance-none motion-reduce:transition-none"
          />
        </div>

        {!hasRooms ? (
          <DashboardEmptyState
            variant="inline"
            compact
            icon={SearchX}
            title={labels.noRoomsFoundTitle}
            description={labels.noRoomsFoundDescription}
            surface={surface}
            accentColor={accentColor}
            className="m-2"
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={viewModel.rooms.map((room) => room.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {viewModel.groups.map((group, groupIndex) => {
                  const groupRooms = group.roomIds
                    .map((roomId) => roomsById.get(roomId))
                    .filter((room): room is RoomWorkspaceRoomViewModel => room !== undefined);
                  if (
                    groupRooms.length === 0 &&
                    (viewModel.mode !== 'manage' || Boolean(viewModel.query))
                  ) {
                    return null;
                  }
                  const isCollapsed = Boolean(group.isCollapsed && !viewModel.query);

                  return (
                    <section key={group.id} aria-labelledby={`room-group-${group.id}`}>
                      <div className="flex min-h-11 items-center gap-1 px-1">
                        <button
                          id={`room-group-${group.id}`}
                          type="button"
                          aria-expanded={!isCollapsed}
                          onClick={() => actions.onToggleGroup?.(group.id, !group.isCollapsed)}
                          className={cn(
                            'flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[18px] px-2 text-left',
                            surface.hoverBg,
                            surface.textSecondary
                          )}
                        >
                          {isCollapsed ? (
                            <ChevronRight className={navetIconSizeTokens.sm} aria-hidden="true" />
                          ) : (
                            <ChevronDown className={navetIconSizeTokens.sm} aria-hidden="true" />
                          )}
                          {group.symbol ? (
                            <span
                              aria-hidden="true"
                              className="flex shrink-0 items-center justify-center text-base leading-none"
                            >
                              <RoomSymbolIcon
                                value={group.symbol}
                                className={navetIconSizeTokens.sm}
                              />
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.12em]">
                            {group.name}
                          </span>
                          {group.summary ? (
                            <span className={cn('shrink-0 text-xs font-normal', surface.textMuted)}>
                              {group.summary}
                            </span>
                          ) : null}
                        </button>
                        {viewModel.mode === 'manage' && actions.onAddRoom ? (
                          <Button
                            variant="ghost"
                            size="compact"
                            iconOnly
                            label={`${labels.addRoomToGroup}: ${group.name}`}
                            onClick={() => actions.onAddRoom?.(group.id)}
                            className="min-h-11 min-w-11 motion-reduce:transition-none"
                          >
                            <Plus className={navetIconSizeTokens.sm} />
                          </Button>
                        ) : null}
                        {viewModel.mode === 'manage' ? (
                          <GroupActionsMenu
                            groupId={group.id}
                            groupName={group.name}
                            canRename={Boolean(group.canRename)}
                            canDelete={Boolean(group.canDelete)}
                            canMoveEarlier={!viewModel.query.trim() && groupIndex > 0}
                            canMoveLater={
                              !viewModel.query.trim() && groupIndex < viewModel.groups.length - 1
                            }
                            labels={labels}
                            actions={actions}
                          />
                        ) : null}
                      </div>
                      {!isCollapsed ? (
                        <div className="space-y-1">
                          {groupRooms.map((room) => (
                            <RoomOutlineItem
                              key={room.id}
                              room={room}
                              selected={room.id === viewModel.selectedRoomId}
                              manage={viewModel.mode === 'manage'}
                              dragDisabled={dragDisabled}
                              labels={labels}
                              actions={actions}
                              surface={surface}
                              accentColor={accentColor}
                            />
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}

                {ungroupedRooms.length > 0 ? (
                  <section aria-labelledby={ungroupedSectionId}>
                    <div className="flex min-h-11 items-center gap-1 px-1">
                      <button
                        id={ungroupedSectionId}
                        type="button"
                        aria-expanded={!isUngroupedSectionCollapsed}
                        onClick={() => setIsUngroupedCollapsed((collapsed) => !collapsed)}
                        className={cn(
                          'flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[18px] px-2 text-left',
                          surface.hoverBg,
                          surface.textSecondary
                        )}
                      >
                        {isUngroupedSectionCollapsed ? (
                          <ChevronRight className={navetIconSizeTokens.sm} aria-hidden="true" />
                        ) : (
                          <ChevronDown className={navetIconSizeTokens.sm} aria-hidden="true" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.12em]">
                          {labels.ungroupedGroup}
                        </span>
                      </button>
                      {viewModel.mode === 'manage' && actions.onAddRoom ? (
                        <Button
                          variant="ghost"
                          size="compact"
                          iconOnly
                          label={`${labels.addRoomToGroup}: ${labels.ungroupedGroup}`}
                          onClick={() => actions.onAddRoom?.()}
                          className="min-h-11 min-w-11 motion-reduce:transition-none"
                        >
                          <Plus className={navetIconSizeTokens.sm} />
                        </Button>
                      ) : null}
                    </div>
                    {!isUngroupedSectionCollapsed ? (
                      <div className="space-y-1">
                        {ungroupedRooms.map((room) => (
                          <RoomOutlineItem
                            key={room.id}
                            room={room}
                            selected={room.id === viewModel.selectedRoomId}
                            manage={viewModel.mode === 'manage'}
                            dragDisabled={dragDisabled}
                            labels={labels}
                            actions={actions}
                            surface={surface}
                            accentColor={accentColor}
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </nav>
  );
}

function MissingRoomState({
  labels,
  surface,
  accentColor,
}: {
  labels: RoomWorkspaceLabels;
  surface: SurfaceTokens;
  accentColor: string;
}) {
  return (
    <DashboardEmptyState
      icon={Home}
      title={labels.selectRoomTitle}
      description={labels.selectRoomDescription}
      surface={surface}
      accentColor={accentColor}
      className="m-auto w-full max-w-lg"
    />
  );
}

export function RoomBrowsePanel({
  viewModel,
  labels,
  actions,
  surface,
  accentColor,
}: WorkspacePanelProps) {
  const [deviceVisibility, setDeviceVisibility] = useState<'dashboard' | 'hidden'>('dashboard');
  const [deviceQuery, setDeviceQuery] = useState('');
  const devicesPanelId = useId();
  const selectedRoom = viewModel.rooms.find((room) => room.id === viewModel.selectedRoomId);
  const roomDevices = selectedRoom
    ? viewModel.devices.filter(
        (device) => device.roomId === selectedRoom.id && device.isDashboardDevice
      )
    : [];
  const dashboardDevices = roomDevices.filter((device) => device.isShownOnDashboard);
  const hiddenDevices = roomDevices.filter((device) => !device.isShownOnDashboard);
  const activeDevices = deviceVisibility === 'dashboard' ? dashboardDevices : hiddenDevices;
  const normalizedDeviceQuery = deviceQuery.trim().toLocaleLowerCase();
  const visibleDevices = normalizedDeviceQuery
    ? activeDevices.filter((device) =>
        [device.name, device.description, device.stateLabel].some((value) =>
          value?.toLocaleLowerCase().includes(normalizedDeviceQuery)
        )
      )
    : activeDevices;

  if (!selectedRoom) {
    return (
      <div className="flex h-full min-h-0 p-4 md:p-6">
        <MissingRoomState labels={labels} surface={surface} accentColor={accentColor} />
      </div>
    );
  }

  return (
    <section
      aria-label={labels.workspaceRegion}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-panel="browse"
    >
      <div className={cn('border-b', selectedRoom.image ? 'p-0' : 'p-4 md:p-5', surface.border)}>
        {selectedRoom.image ? (
          <RoomImagePreview
            room={selectedRoom}
            surface={surface}
            className="max-h-56 rounded-none border-0"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2
                  className={cn(
                    navetTypographyTokens.featureHeading,
                    'min-w-0 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]'
                  )}
                >
                  {selectedRoom.name}
                </h2>
                {selectedRoom.statusLabel ? (
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium',
                      getStatusToneClassName(selectedRoom.statusTone, surface)
                    )}
                  >
                    {selectedRoom.statusLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/82">
                {selectedRoom.description ? (
                  <>
                    <span className="max-w-full truncate">{selectedRoom.description}</span>
                    <span aria-hidden="true" className="text-white/45">
                      ·
                    </span>
                  </>
                ) : null}
                <span className="font-semibold text-white">{selectedRoom.deviceSummary}</span>
              </p>
              {selectedRoom.attentionSummary ? (
                <p className="mt-1.5 text-sm font-semibold text-amber-300">
                  {selectedRoom.attentionSummary}
                </p>
              ) : null}
            </div>
          </RoomImagePreview>
        ) : (
          <div className="flex min-w-0 items-start gap-4">
            <RoomSymbol room={selectedRoom} surface={surface} size="header" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={cn(navetTypographyTokens.titleMd, surface.textPrimary)}>
                  {selectedRoom.name}
                </h2>
                {selectedRoom.statusLabel ? (
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium',
                      getStatusToneClassName(selectedRoom.statusTone, surface)
                    )}
                  >
                    {selectedRoom.statusLabel}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  'mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1',
                  navetTypographyTokens.compactMetadata,
                  surface.textSecondary
                )}
              >
                {selectedRoom.description ? (
                  <>
                    <span className="max-w-full truncate">{selectedRoom.description}</span>
                    <span aria-hidden="true" className={surface.textMuted}>
                      ·
                    </span>
                  </>
                ) : null}
                <span className={cn('font-semibold', surface.textPrimary)}>
                  {selectedRoom.deviceSummary}
                </span>
              </p>
              {selectedRoom.attentionSummary ? (
                <p className="mt-1.5 text-sm font-semibold text-amber-400">
                  {selectedRoom.attentionSummary}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"
        data-room-workspace-panel-content="browse"
      >
        <CardDialogTabList className="mt-0 flex w-full flex-wrap gap-2">
          <InteractivePill
            active={deviceVisibility === 'dashboard'}
            accentColor={accentColor}
            size="compact"
            icon={Layers3}
            aria-pressed={deviceVisibility === 'dashboard'}
            aria-controls={devicesPanelId}
            onClick={() => setDeviceVisibility('dashboard')}
            className="motion-reduce:transition-none"
          >
            {labels.dashboardDevices}
            <span className="opacity-65">{dashboardDevices.length}</span>
          </InteractivePill>
          <InteractivePill
            active={deviceVisibility === 'hidden'}
            accentColor={accentColor}
            size="compact"
            icon={EyeOff}
            aria-pressed={deviceVisibility === 'hidden'}
            aria-controls={devicesPanelId}
            onClick={() => setDeviceVisibility('hidden')}
            className="motion-reduce:transition-none"
          >
            {labels.hiddenDevices}
            <span className="opacity-65">{hiddenDevices.length}</span>
          </InteractivePill>
          <Input
            type="search"
            size="small"
            name="room-device-search"
            autoComplete="off"
            spellCheck={false}
            value={deviceQuery}
            aria-label={labels.deviceSearchPlaceholder}
            placeholder={labels.deviceSearchPlaceholder}
            onChange={(event) => setDeviceQuery(event.currentTarget.value)}
            leading={<Search className={navetIconSizeTokens.sm} aria-hidden="true" />}
            containerClassName="ml-auto w-full sm:w-56"
            inputClassName="[&::-webkit-search-cancel-button]:appearance-none motion-reduce:transition-none"
          />
        </CardDialogTabList>
        <section
          id={devicesPanelId}
          aria-label={
            deviceVisibility === 'dashboard' ? labels.dashboardDevices : labels.hiddenDevices
          }
        >
          {visibleDevices.length > 0 ? (
            <div className={cn('overflow-hidden rounded-[24px] border', surface.border)}>
              {visibleDevices.map((device, index) => (
                <div
                  key={device.id}
                  className={cn(
                    'flex min-h-14 items-center gap-3 px-4 py-3',
                    index > 0 ? `border-t ${surface.border}` : ''
                  )}
                >
                  <RoomDeviceIcon device={device} surface={surface} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', surface.textPrimary)}>
                      {device.name}
                    </p>
                    {device.description ? (
                      <p className={cn('mt-0.5 truncate text-xs', surface.textMuted)}>
                        {device.description}
                      </p>
                    ) : null}
                  </div>
                  {device.stateLabel ? (
                    <span
                      className={cn(
                        'shrink-0 text-xs font-medium',
                        device.isUnavailable ? 'text-amber-400' : surface.textSecondary
                      )}
                    >
                      {device.stateLabel}
                    </span>
                  ) : null}
                  <Button
                    variant="secondary"
                    size="compact"
                    aria-label={`${
                      deviceVisibility === 'dashboard' ? labels.hideDevice : labels.showDevice
                    }: ${device.name}`}
                    onClick={() =>
                      actions.onDeviceVisibilityChange?.(device.id, deviceVisibility === 'hidden')
                    }
                    disabled={!actions.onDeviceVisibilityChange}
                    leading={
                      deviceVisibility === 'dashboard' ? (
                        <EyeOff className={navetIconSizeTokens.xs} aria-hidden="true" />
                      ) : (
                        <Eye className={navetIconSizeTokens.xs} aria-hidden="true" />
                      )
                    }
                    className="h-[30px] shrink-0 rounded-full px-2.5 motion-reduce:transition-none md:h-8 md:px-3"
                  >
                    {deviceVisibility === 'dashboard' ? labels.hideDevice : labels.showDevice}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmptyState
              variant="inline"
              icon={deviceVisibility === 'dashboard' ? Layers3 : EyeOff}
              title={
                deviceVisibility === 'dashboard'
                  ? labels.noDashboardDevicesTitle
                  : labels.noHiddenDevicesTitle
              }
              description={
                deviceVisibility === 'dashboard'
                  ? labels.noDashboardDevicesDescription
                  : labels.noHiddenDevicesDescription
              }
              surface={surface}
              accentColor={accentColor}
            />
          )}
        </section>
      </div>
    </section>
  );
}

function RoomSaveBar({
  viewModel,
  labels,
  actions,
  surface,
  stacked = false,
}: WorkspacePanelProps & { stacked?: boolean }) {
  return (
    <div
      className={cn(stacked ? 'space-y-3' : 'flex flex-wrap items-center justify-between gap-3')}
    >
      <p aria-live="polite" className={cn('text-sm', surface.textMuted)}>
        {viewModel.hasUnsavedChanges
          ? labels.unsavedChanges(viewModel.unsavedChangeCount)
          : labels.allChangesSaved}
      </p>
      <div className={cn('flex gap-2', stacked ? 'flex-col-reverse' : 'flex-wrap')}>
        <Button
          variant="ghost"
          onClick={actions.onDiscard}
          disabled={!viewModel.hasUnsavedChanges || viewModel.isSaving}
          className={cn('min-h-11 motion-reduce:transition-none', stacked ? 'w-full' : '')}
        >
          {labels.discardChanges}
        </Button>
        <Button
          onClick={actions.onSave}
          loading={viewModel.isSaving}
          disabled={!viewModel.hasUnsavedChanges || viewModel.hasValidationErrors}
          className={cn('min-h-11 motion-reduce:transition-none', stacked ? 'w-full' : '')}
        >
          {labels.saveChanges}
        </Button>
      </div>
    </div>
  );
}

export function RoomDetailsPanel({
  viewModel,
  labels,
  actions,
  surface,
  accentColor,
  showInlineSaveBar = false,
}: WorkspacePanelProps) {
  const [activeSection, setActiveSection] = useState<'settings' | 'devices'>('devices');
  const settingsPanelId = useId();
  const devicesPanelId = useId();
  const room = viewModel.rooms.find((candidate) => candidate.id === viewModel.selectedRoomId);
  if (!room) {
    return (
      <div className="flex h-full min-h-0 p-4 md:p-6">
        <MissingRoomState labels={labels} surface={surface} accentColor={accentColor} />
      </div>
    );
  }
  const currentDevices = viewModel.devices.filter(
    (device) => device.isDashboardDevice && viewModel.selectedDeviceIds.includes(device.id)
  );

  return (
    <section
      aria-label={labels.workspaceRegion}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-panel="room-editor"
    >
      <div className={cn('border-b p-4 md:p-5', surface.border)}>
        <PanelHeading
          title={room.name}
          description={[room.description, room.deviceSummary].filter(Boolean).join(' · ')}
          size="compact"
          surface={surface}
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"
        data-room-workspace-panel-content="manage"
      >
        <CardDialogTabList className="mt-0 flex w-full flex-wrap gap-2">
          <InteractivePill
            active={activeSection === 'devices'}
            accentColor={accentColor}
            size="compact"
            icon={Layers3}
            aria-pressed={activeSection === 'devices'}
            aria-controls={devicesPanelId}
            onClick={() => setActiveSection('devices')}
            className="motion-reduce:transition-none"
          >
            {labels.devicesTitle}
          </InteractivePill>
          <InteractivePill
            active={activeSection === 'settings'}
            accentColor={accentColor}
            size="compact"
            icon={Settings2}
            aria-pressed={activeSection === 'settings'}
            aria-controls={settingsPanelId}
            onClick={() => setActiveSection('settings')}
            className="motion-reduce:transition-none"
          >
            {labels.roomDetailsTitle}
          </InteractivePill>
          {activeSection === 'devices' && actions.onDeviceSelectionChange ? (
            <Button
              size="compact"
              onClick={() => actions.onStageChange('device-selection')}
              leading={<Plus className={navetIconSizeTokens.xs} aria-hidden="true" />}
              className="ml-auto h-[30px] shrink-0 rounded-full px-2.5 motion-reduce:transition-none md:h-8 md:px-3"
            >
              {labels.manageDevices}
            </Button>
          ) : null}
        </CardDialogTabList>

        {activeSection === 'settings' ? (
          <section id={settingsPanelId} aria-label={labels.roomDetailsTitle} className="space-y-5">
            <div>
              <label
                htmlFor={`room-name-${room.id}`}
                className={cn(navetTypographyTokens.label, surface.textPrimary)}
              >
                {labels.roomNameLabel}
              </label>
              <Input
                id={`room-name-${room.id}`}
                name={`room-name-${room.id}`}
                value={room.nameDraft ?? room.name}
                placeholder={labels.roomNamePlaceholder}
                onChange={(event) => actions.onRoomNameChange?.(room.id, event.currentTarget.value)}
                disabled={!actions.onRoomNameChange}
                invalid={Boolean(room.nameValidationMessage)}
                aria-describedby={
                  room.nameValidationMessage ? `room-name-error-${room.id}` : undefined
                }
                containerClassName="mt-2"
                inputClassName="min-h-11 motion-reduce:transition-none"
              />
              {room.nameValidationMessage ? (
                <p
                  id={`room-name-error-${room.id}`}
                  role="alert"
                  className={cn('mt-2 text-sm', navetSemanticColorTokens.error)}
                >
                  {room.nameValidationMessage}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={`room-group-${room.id}`}
                className={cn(navetTypographyTokens.label, surface.textPrimary)}
              >
                {labels.groupLabel}
              </label>
              <Select
                id={`room-group-${room.id}`}
                name={`room-group-${room.id}`}
                value={room.groupId ?? ''}
                onChange={(event) =>
                  actions.onRoomGroupChange?.(room.id, event.currentTarget.value || null)
                }
                disabled={!actions.onRoomGroupChange}
                containerClassName="mt-2"
                selectClassName="min-h-11 motion-reduce:transition-none"
              >
                <option value="">{labels.ungroupedGroup}</option>
                {viewModel.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-3">
              <SelectableCheckboxRow
                checked={room.isVisible}
                onCheckedChange={(visible) => actions.onRoomVisibilityChange?.(room.id, visible)}
                disabled={!actions.onRoomVisibilityChange}
                label={labels.visibilityLabel}
                description={labels.visibilityDescription}
                leading={<Eye className={cn(navetIconSizeTokens.sm, surface.textSecondary)} />}
                rowClassName={cn('min-h-14', surface.subtleBg, surface.border)}
                selectedClassName={surface.borderStrong}
                labelClassName={surface.textPrimary}
                descriptionClassName={surface.textMuted}
                checkboxPaletteColor={accentColor}
              />
              <SelectableCheckboxRow
                checked={room.isFavorite}
                onCheckedChange={(favorite) => actions.onRoomFavoriteChange?.(room.id, favorite)}
                disabled={!actions.onRoomFavoriteChange}
                label={labels.favoriteLabel}
                description={labels.favoriteDescription}
                leading={<Heart className={cn(navetIconSizeTokens.sm, surface.textSecondary)} />}
                rowClassName={cn('min-h-14', surface.subtleBg, surface.border)}
                selectedClassName={surface.borderStrong}
                labelClassName={surface.textPrimary}
                descriptionClassName={surface.textMuted}
                checkboxPaletteColor={accentColor}
              />
            </div>

            <div
              className={cn(
                'grid gap-4 rounded-[24px] border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
                surface.border,
                surface.subtleBg
              )}
            >
              <div className="flex min-w-0 items-center gap-4">
                <RoomSymbol room={room} surface={surface} />
                <div className="min-w-0 flex-1">
                  <p className={cn(navetTypographyTokens.titleSm, surface.textPrimary)}>
                    {labels.appearanceLabel}
                  </p>
                  <p className={cn('mt-1 text-sm', surface.textMuted)}>
                    {labels.appearanceDescription}
                  </p>
                </div>
              </div>
              {actions.onChooseRoomAppearance ? (
                <Button
                  variant="secondary"
                  onClick={() => actions.onChooseRoomAppearance?.(room.id)}
                  leading={<Sparkles className={navetIconSizeTokens.sm} />}
                  className="min-h-11 shrink-0 motion-reduce:transition-none"
                >
                  {labels.chooseAppearance}
                </Button>
              ) : null}
              <RoomImagePreview
                room={room}
                surface={surface}
                className="sm:col-span-2 sm:aspect-[16/5]"
              />
            </div>

            <RoomActionsSection room={room} labels={labels} actions={actions} surface={surface} />
          </section>
        ) : null}

        {activeSection === 'devices' ? (
          <section id={devicesPanelId} aria-label={labels.devicesTitle}>
            {currentDevices.length > 0 ? (
              <div className={cn('overflow-hidden rounded-[24px] border', surface.border)}>
                {currentDevices.map((device, index) => (
                  <div
                    key={device.id}
                    className={cn(
                      'flex min-h-14 items-center gap-3 px-4 py-3',
                      index > 0 ? `border-t ${surface.border}` : ''
                    )}
                  >
                    <RoomDeviceIcon device={device} surface={surface} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', surface.textPrimary)}>
                        {device.name}
                      </p>
                      {device.description ? (
                        <p className={cn('mt-0.5 truncate text-xs', surface.textMuted)}>
                          {device.description}
                        </p>
                      ) : null}
                    </div>
                    {device.stateLabel ? (
                      <span
                        className={cn(
                          'hidden shrink-0 text-xs font-medium sm:block',
                          device.isUnavailable ? 'text-amber-400' : surface.textSecondary
                        )}
                      >
                        {device.stateLabel}
                      </span>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="compact"
                          aria-label={`${labels.deviceActions}: ${device.name}`}
                          leading={
                            <MoreHorizontal className={navetIconSizeTokens.xs} aria-hidden="true" />
                          }
                          className="shrink-0 rounded-full motion-reduce:transition-none"
                        >
                          {labels.deviceActions}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        className="w-52 motion-reduce:animate-none"
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            actions.onDeviceVisibilityChange?.(
                              device.id,
                              !device.isShownOnDashboard
                            )
                          }
                          disabled={!actions.onDeviceVisibilityChange}
                        >
                          {device.isShownOnDashboard ? (
                            <EyeOff className={navetIconSizeTokens.sm} aria-hidden="true" />
                          ) : (
                            <Eye className={navetIconSizeTokens.sm} aria-hidden="true" />
                          )}
                          <span>
                            {device.isShownOnDashboard ? labels.hideDevice : labels.showDevice}
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => actions.onRequestDeviceMove?.(device.id)}
                          disabled={!actions.onRequestDeviceMove}
                        >
                          <MoveRight className={navetIconSizeTokens.sm} aria-hidden="true" />
                          <span>{labels.moveDevice}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => actions.onDeviceSelectionChange?.(device.id, false)}
                          disabled={!actions.onDeviceSelectionChange}
                        >
                          <Trash2 className={navetIconSizeTokens.sm} aria-hidden="true" />
                          <span>{labels.removeDevice}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <DashboardEmptyState
                variant="inline"
                compact
                icon={Layers3}
                title={labels.noDevicesTitle}
                description={labels.noDevicesDescription}
                surface={surface}
                accentColor={accentColor}
                className="mt-4"
              />
            )}
          </section>
        ) : null}
      </div>

      {showInlineSaveBar ? (
        <div className={cn('border-t p-4', surface.border)}>
          <RoomSaveBar
            viewModel={viewModel}
            labels={labels}
            actions={actions}
            surface={surface}
            accentColor={accentColor}
          />
        </div>
      ) : null}
    </section>
  );
}

export function RoomDeviceSelectionPanel({
  viewModel,
  labels,
  actions,
  surface,
  accentColor,
}: WorkspacePanelProps) {
  const selectedIds = new Set(viewModel.selectedDeviceIds);
  const selectedRoom = viewModel.rooms.find((room) => room.id === viewModel.selectedRoomId);
  const availableDevices = viewModel.devices.filter(
    (device) =>
      device.isDashboardDevice && !selectedIds.has(device.id) && device.roomId !== selectedRoom?.id
  );

  return (
    <section
      aria-label={labels.manageDevices}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-panel="device-selection"
    >
      <div className={cn('border-b p-4 md:px-6', surface.border)}>
        <Input
          type="search"
          name="room-device-search"
          autoComplete="off"
          spellCheck={false}
          value={viewModel.deviceQuery}
          aria-label={labels.deviceSearchPlaceholder}
          placeholder={labels.deviceSearchPlaceholder}
          onChange={(event) => actions.onDeviceQueryChange(event.currentTarget.value)}
          leading={<Search className={navetIconSizeTokens.sm} aria-hidden="true" />}
          containerClassName="w-full min-w-0"
          inputClassName="min-h-11 motion-reduce:transition-none"
        />
        {viewModel.selectionSummary ? (
          <p aria-live="polite" className={cn('mt-3 text-sm', surface.textMuted)}>
            {viewModel.selectionSummary}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
        {availableDevices.length > 0 && selectedRoom ? (
          <div className={cn('overflow-hidden rounded-[24px] border', surface.border)}>
            {availableDevices.map((device, index) => (
              <div
                key={device.id}
                className={cn(
                  'flex min-h-16 items-center gap-3 px-4 py-3',
                  index > 0 ? `border-t ${surface.border}` : ''
                )}
              >
                <RoomDeviceIcon device={device} surface={surface} />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-medium', surface.textPrimary)}>
                    {device.name}
                  </p>
                  <p className={cn('mt-0.5 truncate text-xs', surface.textMuted)}>
                    {device.description ? `${device.description} · ` : ''}
                    {device.roomName ?? labels.notInRoom}
                    <span aria-hidden="true"> → </span>
                    {selectedRoom.name}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="compact"
                  aria-label={`${labels.addDevice}: ${device.name}`}
                  onClick={() => actions.onDeviceSelectionChange?.(device.id, true)}
                  disabled={device.isUnavailable || !actions.onDeviceSelectionChange}
                  leading={<Plus className={navetIconSizeTokens.sm} aria-hidden="true" />}
                  className="min-h-11 shrink-0 motion-reduce:transition-none"
                >
                  {labels.addDevice}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <DashboardEmptyState
            variant="inline"
            icon={SearchX}
            title={labels.noDevicesTitle}
            description={labels.noDevicesDescription}
            surface={surface}
            accentColor={accentColor}
          />
        )}
      </div>
    </section>
  );
}

export function RoomImpactReviewPanel({
  viewModel,
  labels,
  actions,
  surface,
  accentColor,
}: WorkspacePanelProps) {
  return (
    <section
      aria-label={labels.impactTitle}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-panel="impact-review"
    >
      <div className={cn('border-b p-4 md:p-5', surface.border)}>
        <PanelHeading
          title={labels.impactTitle}
          description={labels.impactDescription}
          surface={surface}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
        {viewModel.changes.length > 0 ? (
          <div className="space-y-3">
            {viewModel.changes.map((change) => (
              <div
                key={change.id}
                className={cn(
                  'grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[24px] border p-4',
                  getChangeToneClassName(change.tone, surface)
                )}
              >
                {change.tone === 'warning' || change.tone === 'critical' ? (
                  <AlertTriangle className={navetIconSizeTokens.md} aria-hidden="true" />
                ) : (
                  <Check className={navetIconSizeTokens.md} aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{change.title}</p>
                  <p className="mt-1 text-sm opacity-80">{change.description}</p>
                  <ChangeDetailList details={change.details} className="text-sm opacity-90" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DashboardEmptyState
            variant="inline"
            icon={Check}
            title={labels.noChangesTitle}
            description={labels.noChangesDescription}
            surface={surface}
            accentColor={accentColor}
          />
        )}
      </div>

      <div className={cn('border-t p-4', surface.border)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn('text-sm', surface.textMuted)}>
            {viewModel.hasUnsavedChanges
              ? labels.unsavedChanges(viewModel.unsavedChangeCount)
              : labels.allChangesSaved}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={actions.onDiscard}
              disabled={!viewModel.hasUnsavedChanges || viewModel.isSaving}
              className="min-h-11 motion-reduce:transition-none"
            >
              {labels.discardChanges}
            </Button>
            <Button
              variant="ghost"
              onClick={() => actions.onStageChange('room-details')}
              leading={<ArrowLeft className={navetIconSizeTokens.sm} />}
              className="min-h-11 motion-reduce:transition-none"
            >
              {labels.back}
            </Button>
            <Button
              onClick={actions.onSave}
              loading={viewModel.isSaving}
              disabled={!viewModel.hasUnsavedChanges || viewModel.hasValidationErrors}
              className="min-h-11 motion-reduce:transition-none"
            >
              {labels.saveChanges}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RoomWorkspaceContextPanel({
  viewModel,
  labels,
  actions,
  surface,
  accentColor,
}: WorkspacePanelProps) {
  if (viewModel.mode === 'manage') {
    return (
      <aside
        aria-label={labels.contextRegion}
        className="flex h-full min-h-0 flex-col"
        data-room-workspace-region="context"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <section>
            <p className={cn(navetTypographyTokens.eyebrow, surface.textMuted)}>
              {labels.pendingChangesTitle}
            </p>
            {viewModel.changes.length > 0 ? (
              <div className="mt-3 space-y-2">
                {viewModel.changes.slice(0, 4).map((change) => (
                  <div
                    key={change.id}
                    className={cn(
                      'rounded-[20px] border p-3',
                      getChangeToneClassName(change.tone, surface)
                    )}
                  >
                    <p className="text-sm font-semibold">{change.title}</p>
                    <p className="mt-1 text-xs opacity-80">{change.description}</p>
                    <ChangeDetailList details={change.details} className="text-xs opacity-90" />
                  </div>
                ))}
              </div>
            ) : viewModel.hasUnsavedChanges ? (
              <div
                className={cn(
                  'mt-3 flex items-center gap-3 rounded-[20px] border p-3',
                  surface.border,
                  surface.subtleBg
                )}
              >
                <AlertTriangle
                  className={cn(navetIconSizeTokens.sm, surface.textSecondary)}
                  aria-hidden="true"
                />
                <p className={cn('text-sm', surface.textMuted)}>
                  {labels.unsavedChanges(viewModel.unsavedChangeCount)}
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  'mt-3 flex items-center gap-3 rounded-[20px] border p-3',
                  surface.border,
                  surface.subtleBg
                )}
              >
                <Check
                  className={cn(navetIconSizeTokens.sm, surface.textSecondary)}
                  aria-hidden="true"
                />
                <p className={cn('text-sm', surface.textMuted)}>{labels.allChangesSaved}</p>
              </div>
            )}
          </section>
        </div>
        <div className={cn('border-t p-4', surface.border)}>
          <RoomSaveBar
            viewModel={viewModel}
            labels={labels}
            actions={actions}
            surface={surface}
            accentColor={accentColor}
            stacked
          />
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label={labels.contextRegion}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-region="context"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <section>
          <p className={cn(navetTypographyTokens.eyebrow, surface.textMuted)}>
            {labels.pendingChangesTitle}
          </p>
          {viewModel.changes.length > 0 ? (
            <div className="mt-3 space-y-2">
              {viewModel.changes.slice(0, 4).map((change) => (
                <div
                  key={change.id}
                  className={cn(
                    'rounded-[20px] border p-3',
                    getChangeToneClassName(change.tone, surface)
                  )}
                >
                  <p className="text-sm font-semibold">{change.title}</p>
                  <p className="mt-1 text-xs opacity-80">{change.description}</p>
                  <ChangeDetailList details={change.details} className="text-xs opacity-90" />
                </div>
              ))}
            </div>
          ) : (
            <p className={cn('mt-3 text-sm leading-6', surface.textMuted)}>
              {labels.noChangesDescription}
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}

export function RoomWorkspaceActivePanel(props: WorkspacePanelProps) {
  if (props.viewModel.mode === 'browse') {
    return <RoomBrowsePanel {...props} />;
  }
  if (props.viewModel.stage === 'impact-review') {
    return <RoomImpactReviewPanel {...props} />;
  }
  return <RoomDetailsPanel {...props} />;
}

export function RoomWorkspaceStatusPanel({
  status,
  labels,
  actions,
}: {
  status: Exclude<RoomWorkspaceStatus, { kind: 'ready' }>;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  if (status.kind === 'loading') {
    return (
      <div
        className={cn(
          'flex min-h-[28rem] items-center justify-center rounded-[28px] border [&_svg]:motion-reduce:animate-none',
          surface.shellPanel,
          surface.border,
          surface.cardShadow
        )}
      >
        <LoadingSpinner message={status.message} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-[28rem] items-center justify-center rounded-[28px] border p-4',
        surface.shellPanel,
        surface.border,
        surface.cardShadow
      )}
    >
      <DashboardEmptyState
        icon={status.kind === 'error' ? AlertTriangle : UsersRound}
        title={status.title}
        description={status.description}
        actionLabel={status.actionLabel}
        onAction={
          status.kind === 'error'
            ? actions.onRetry
            : status.actionLabel
              ? () => actions.onAddRoom?.()
              : undefined
        }
        actionIcon={status.kind === 'error' ? AlertTriangle : Plus}
        surface={surface}
        accentColor={accentColor}
        className="w-full max-w-xl"
      />
      <span className="sr-only">{labels.title}</span>
    </div>
  );
}

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
import { DashboardEmptyState, SelectableCheckboxRow } from '@navet/app/components/patterns';
import { Button, Input, LoadingSpinner, Select } from '@navet/app/components/primitives';
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
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Scissors,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import { type CSSProperties, type ReactNode, useMemo } from 'react';
import { RoomWallpaperPreviewImage } from './room-wallpaper-preview-image';
import type {
  RoomWorkspaceActions,
  RoomWorkspaceComponentProps,
  RoomWorkspaceLabels,
  RoomWorkspaceRoomViewModel,
  RoomWorkspaceStatus,
  RoomWorkspaceStatusTone,
} from './room-workspace.types';

type SurfaceTokens = ReturnType<typeof getThemeSurfaceTokens>;

interface WorkspacePanelProps extends RoomWorkspaceComponentProps {
  surface: SurfaceTokens;
  accentColor: string;
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

function RoomSymbol({
  room,
  surface,
}: {
  room: RoomWorkspaceRoomViewModel;
  surface: SurfaceTokens;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border text-base font-semibold',
        surface.iconBg,
        surface.borderStrong,
        surface.textPrimary
      )}
    >
      {room.symbol || room.name.trim().slice(0, 1).toLocaleUpperCase() || <Home />}
    </span>
  );
}

function RoomImagePreview({
  room,
  surface,
  className,
}: {
  room: RoomWorkspaceRoomViewModel;
  surface: SurfaceTokens;
  className?: string;
}) {
  if (!room.image) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative isolate aspect-[16/7] w-full overflow-hidden rounded-[24px] border',
        surface.border,
        surface.subtleBg,
        className
      )}
    >
      <RoomWallpaperPreviewImage
        value={room.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  description,
  surface,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
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
            navetTypographyTokens.featureHeading,
            surface.textPrimary
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              'mt-1 max-w-2xl max-sm:sr-only',
              navetTypographyTokens.body,
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

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? 'soft' : 'ghost'}
      aria-pressed={active}
      onClick={onClick}
      className="min-h-11 flex-1 px-4 motion-reduce:transition-none"
    >
      {label}
    </Button>
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

function RoomMoreActionsMenu({
  room,
  labels,
  actions,
}: {
  room: RoomWorkspaceRoomViewModel;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
}) {
  const canMerge = room.canMerge && actions.onRequestRoomMerge;
  const canSplit = room.canSplit && actions.onRequestRoomSplit;
  const canDelete = room.canDelete && actions.onRequestRoomDeletion;

  if (!canMerge && !canSplit && !canDelete) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          leading={<MoreHorizontal className={navetIconSizeTokens.sm} />}
          className="min-h-11 motion-reduce:transition-none"
        >
          {labels.moreActions}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 motion-reduce:animate-none">
        {canMerge ? (
          <DropdownMenuItem
            className="min-h-14 items-start py-3 motion-reduce:transition-none"
            onClick={() => actions.onRequestRoomMerge?.(room.id)}
          >
            <Combine className="mt-0.5" />
            <span>
              <span className="block font-medium">{labels.mergeRoom}</span>
              <span className="mt-0.5 block text-xs opacity-70">{labels.mergeRoomDescription}</span>
            </span>
          </DropdownMenuItem>
        ) : null}
        {canSplit ? (
          <DropdownMenuItem
            className="min-h-14 items-start py-3 motion-reduce:transition-none"
            onClick={() => actions.onRequestRoomSplit?.(room.id)}
          >
            <Scissors className="mt-0.5" />
            <span>
              <span className="block font-medium">{labels.splitRoom}</span>
              <span className="mt-0.5 block text-xs opacity-70">{labels.splitRoomDescription}</span>
            </span>
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem
            variant="destructive"
            className="min-h-14 items-start py-3 motion-reduce:transition-none"
            onClick={() => actions.onRequestRoomDeletion?.(room.id)}
          >
            <Trash2 className="mt-0.5" />
            <span>
              <span className="block font-medium">{labels.deleteRoom}</span>
              <span className="mt-0.5 block text-xs opacity-70">
                {labels.deleteRoomDescription}
              </span>
            </span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RoomWorkspaceHeader({
  viewModel,
  labels,
  actions,
  surface,
  trailingAction,
}: Omit<WorkspacePanelProps, 'accentColor'> & { trailingAction?: ReactNode }) {
  return (
    <header className={cn('border-b px-3 py-3 md:px-5 md:py-4', surface.border)}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
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

          <fieldset
            aria-label={labels.title}
            className={cn(
              'grid min-w-0 grid-cols-2 gap-1 rounded-[24px] border p-1 xl:w-[18rem]',
              surface.border,
              surface.subtleBg
            )}
          >
            <ModeButton
              active={viewModel.mode === 'browse'}
              label={labels.browseMode}
              onClick={() => actions.onModeChange('browse')}
            />
            <ModeButton
              active={viewModel.mode === 'manage'}
              label={labels.manageMode}
              onClick={() => actions.onModeChange('manage')}
            />
          </fieldset>
        </div>
        {trailingAction ? <div className="shrink-0">{trailingAction}</div> : null}
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-3 sm:mt-4 sm:flex-row sm:items-center">
        <Input
          type="search"
          name="room-workspace-search"
          autoComplete="off"
          spellCheck={false}
          value={viewModel.query}
          aria-label={labels.searchLabel}
          placeholder={labels.searchPlaceholder}
          onChange={(event) => actions.onQueryChange(event.currentTarget.value)}
          leading={<Search className={navetIconSizeTokens.sm} aria-hidden="true" />}
          containerClassName="min-w-0 flex-1"
          inputClassName="min-h-11 motion-reduce:transition-none"
        />
        {viewModel.query ? (
          <Button
            variant="ghost"
            iconOnly
            label={labels.clearSearch}
            onClick={() => actions.onQueryChange('')}
            className="min-h-11 min-w-11 motion-reduce:transition-none"
          >
            <X className={navetIconSizeTokens.sm} />
          </Button>
        ) : null}
        <p
          aria-live="polite"
          className={cn('min-w-0 text-sm max-sm:sr-only sm:max-w-56', surface.textMuted)}
        >
          {viewModel.resultSummary ?? viewModel.inventorySummary}
        </p>
      </div>
    </header>
  );
}

function RoomOutlineItem({
  room,
  selected,
  manage,
  labels,
  actions,
  surface,
  accentColor,
}: {
  room: RoomWorkspaceRoomViewModel;
  selected: boolean;
  manage: boolean;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
  surface: SurfaceTokens;
  accentColor: string;
}) {
  const { theme } = useTheme();
  const selectedStyle: CSSProperties | undefined = selected
    ? { backgroundColor: `${accentColor}14` }
    : undefined;

  return (
    <div
      className={cn(
        'group/room relative flex min-w-0 items-center rounded-[22px] border transition-[background-color,border-color] motion-reduce:transition-none',
        selected ? surface.borderStrong : 'border-transparent',
        selected ? '' : surface.hoverBg
      )}
      style={{
        ...selectedStyle,
        contentVisibility: 'auto',
        containIntrinsicSize: '56px',
      }}
    >
      {selected ? (
        <span
          className="absolute inset-y-3 left-0 w-1 rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
      ) : null}
      <button
        type="button"
        onClick={() => actions.onSelectRoom(room.id)}
        aria-current={selected ? 'page' : undefined}
        aria-label={`${labels.selectRoom}: ${room.name}`}
        className={cn(
          'flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[22px] px-3 py-2 text-left',
          getThemeFocusRingClassName(theme)
        )}
      >
        <RoomSymbol room={room} surface={surface} />
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
      {manage ? (
        <Button
          variant="ghost"
          size="compact"
          iconOnly
          label={`${labels.editRoom}: ${room.name}`}
          onClick={() => {
            actions.onSelectRoom(room.id);
            actions.onStageChange('room-details');
          }}
          className="mr-1 min-h-11 min-w-11 shrink-0 opacity-80 motion-reduce:transition-none"
        >
          <Edit3 className={navetIconSizeTokens.sm} />
        </Button>
      ) : null}
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
  const roomsById = useMemo(
    () => new Map(viewModel.rooms.map((room) => [room.id, room])),
    [viewModel.rooms]
  );
  const groupedRoomIds = useMemo(
    () => new Set(viewModel.groups.flatMap((group) => group.roomIds)),
    [viewModel.groups]
  );
  const ungroupedRooms = viewModel.rooms.filter((room) => !groupedRoomIds.has(room.id));
  const hasRooms = viewModel.rooms.length > 0;

  return (
    <nav
      aria-label={labels.roomsRegion}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-region="outline"
    >
      <div
        className={cn('flex items-center justify-between gap-3 border-b px-4 py-3', surface.border)}
      >
        <div className="min-w-0">
          <p className={cn(navetTypographyTokens.titleSm, surface.textPrimary)}>
            {labels.roomsRegion}
          </p>
          <p className={cn('mt-0.5 truncate text-xs', surface.textMuted)}>
            {viewModel.inventorySummary}
          </p>
        </div>
        {viewModel.mode === 'manage' && actions.onAddRoom ? (
          <Button
            variant="ghost"
            size="compact"
            iconOnly
            label={labels.addRoom}
            onClick={() => actions.onAddRoom?.()}
            className="min-h-11 min-w-11 shrink-0 motion-reduce:transition-none"
          >
            <Plus className={navetIconSizeTokens.sm} />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
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
                        <span aria-hidden="true" className="shrink-0 text-base leading-none">
                          {group.symbol}
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
              <div className="space-y-1">
                {ungroupedRooms.map((room) => (
                  <RoomOutlineItem
                    key={room.id}
                    room={room}
                    selected={room.id === viewModel.selectedRoomId}
                    manage={viewModel.mode === 'manage'}
                    labels={labels}
                    actions={actions}
                    surface={surface}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            ) : null}
          </div>
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
  const selectedRoom = viewModel.rooms.find((room) => room.id === viewModel.selectedRoomId);
  const roomDevices = selectedRoom
    ? viewModel.devices.filter((device) => device.roomId === selectedRoom.id)
    : [];

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
      <div className={cn('border-b p-5 md:p-6', surface.border)}>
        <RoomImagePreview room={selectedRoom} surface={surface} className="mb-5 max-h-56" />
        <div className="flex min-w-0 items-start gap-4">
          <RoomSymbol room={selectedRoom} surface={surface} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cn(navetTypographyTokens.featureHeading, surface.textPrimary)}>
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
            {selectedRoom.description ? (
              <p className={cn('mt-1', navetTypographyTokens.body, surface.textSecondary)}>
                {selectedRoom.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className={cn('text-xs font-medium', surface.textMuted)}>
              {labels.currentRoomTitle}
            </p>
            <p className={cn('mt-1 text-sm font-semibold', surface.textPrimary)}>
              {selectedRoom.deviceSummary}
            </p>
          </div>
          {selectedRoom.attentionSummary ? (
            <div>
              <p className={cn('text-xs font-medium', surface.textMuted)}>
                {labels.roomActivityTitle}
              </p>
              <p className="mt-1 text-sm font-semibold text-amber-400">
                {selectedRoom.attentionSummary}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
        <PanelHeading
          title={labels.devicesTitle}
          description={labels.devicesDescription}
          surface={surface}
        />
        {roomDevices.length > 0 ? (
          <div className={cn('mt-4 overflow-hidden rounded-[24px] border', surface.border)}>
            {roomDevices.map((device, index) => (
              <div
                key={device.id}
                className={cn(
                  'flex min-h-14 items-center gap-3 px-4 py-3',
                  index > 0 ? `border-t ${surface.border}` : ''
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border',
                    surface.iconBg,
                    surface.borderStrong
                  )}
                  aria-hidden="true"
                >
                  <SlidersHorizontal
                    className={cn(navetIconSizeTokens.sm, surface.textSecondary)}
                  />
                </span>
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
              </div>
            ))}
          </div>
        ) : (
          <DashboardEmptyState
            variant="inline"
            icon={Layers3}
            title={labels.noDevicesTitle}
            description={labels.noDevicesDescription}
            surface={surface}
            accentColor={accentColor}
            className="mt-4"
          />
        )}
      </div>

      <div className={cn('flex flex-wrap justify-end gap-2 border-t p-4', surface.border)}>
        <Button
          variant="secondary"
          onClick={() => {
            actions.onModeChange('manage');
            actions.onStageChange('room-details');
          }}
          leading={<Edit3 className={navetIconSizeTokens.sm} />}
          className="min-h-11 motion-reduce:transition-none"
        >
          {labels.editRoom}
        </Button>
        <Button
          onClick={() => {
            actions.onModeChange('manage');
            actions.onStageChange('device-selection');
          }}
          leading={<ListChecks className={navetIconSizeTokens.sm} />}
          className="min-h-11 motion-reduce:transition-none"
        >
          {labels.manageDevices}
        </Button>
      </div>
    </section>
  );
}

export function RoomStructurePanel({ viewModel, labels, actions, surface }: WorkspacePanelProps) {
  const searchActive = viewModel.query.trim().length > 0;
  const dragDisabled = searchActive || !actions.onDropRoom;
  const groupNameById = useMemo(
    () => new Map(viewModel.groups.map((group) => [group.id, group.name])),
    [viewModel.groups]
  );
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
    <section
      aria-label={labels.workspaceRegion}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-panel="structure"
    >
      <div className={cn('border-b p-5 md:p-6', surface.border)}>
        <PanelHeading
          title={labels.structureTitle}
          description={labels.structureDescription}
          surface={surface}
          action={
            actions.onAddRoom || actions.onAddGroup ? (
              <div className="flex items-center gap-2">
                {actions.onAddGroup ? (
                  <Button
                    variant="ghost"
                    iconOnly
                    label={labels.addGroup}
                    onClick={actions.onAddGroup}
                    className="min-h-11 min-w-11 motion-reduce:transition-none"
                  >
                    <FolderPlus className={navetIconSizeTokens.sm} />
                  </Button>
                ) : null}
                {actions.onAddRoom ? (
                  <>
                    <Button
                      variant="secondary"
                      iconOnly
                      label={labels.addRoom}
                      onClick={() => actions.onAddRoom?.()}
                      className="min-h-11 min-w-11 motion-reduce:transition-none sm:hidden"
                    >
                      <Plus className={navetIconSizeTokens.sm} />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => actions.onAddRoom?.()}
                      leading={<Plus className={navetIconSizeTokens.sm} />}
                      className="min-h-11 motion-reduce:transition-none max-sm:hidden"
                    >
                      {labels.addRoom}
                    </Button>
                  </>
                ) : null}
              </div>
            ) : undefined
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={viewModel.rooms.map((room) => room.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul
              aria-label={labels.structureTitle}
              className={cn('overflow-hidden rounded-[24px] border', surface.border)}
            >
              {viewModel.rooms.map((room, index) => (
                <SortableRoomStructureRow
                  key={room.id}
                  room={room}
                  index={index}
                  roomCount={viewModel.rooms.length}
                  groupName={room.groupId ? groupNameById.get(room.groupId) : undefined}
                  dragDisabled={dragDisabled}
                  reorderDisabled={searchActive}
                  labels={labels}
                  actions={actions}
                  surface={surface}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-t p-4',
          surface.border
        )}
      >
        <Button
          variant="ghost"
          onClick={actions.onCancel}
          className="min-h-11 motion-reduce:transition-none"
        >
          {labels.cancel}
        </Button>
        <Button
          onClick={() => actions.onStageChange('impact-review')}
          disabled={!viewModel.hasUnsavedChanges}
          trailing={<ChevronRight className={navetIconSizeTokens.sm} />}
          className="min-h-11 motion-reduce:transition-none"
        >
          {labels.reviewChanges}
        </Button>
      </div>
    </section>
  );
}

function SortableRoomStructureRow({
  room,
  index,
  roomCount,
  groupName,
  dragDisabled,
  reorderDisabled,
  labels,
  actions,
  surface,
}: {
  room: RoomWorkspaceRoomViewModel;
  index: number;
  roomCount: number;
  groupName?: string;
  dragDisabled: boolean;
  reorderDisabled: boolean;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
  surface: SurfaceTokens;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: room.id,
    disabled: dragDisabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={getDndTransformStyle(transform, transition)}
      data-room-id={room.id}
      className={cn(
        'relative flex min-w-0 items-center gap-2 px-3 py-2 motion-reduce:transition-none',
        index > 0 ? `border-t ${surface.border}` : '',
        isDragging ? 'z-10 opacity-75 shadow-lg' : ''
      )}
    >
      {actions.onDropRoom ? (
        <button
          type="button"
          aria-label={labels.dragRoom(room.name)}
          disabled={dragDisabled}
          className={cn(
            'flex min-h-11 min-w-11 shrink-0 touch-none items-center justify-center rounded-[18px] motion-reduce:transition-none',
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
      <RoomSymbol room={room} surface={surface} />
      <button
        type="button"
        onClick={() => {
          actions.onSelectRoom(room.id);
          actions.onStageChange('room-details');
        }}
        className={cn('min-h-11 min-w-0 flex-1 rounded-[18px] px-2 text-left', surface.hoverBg)}
      >
        <span className={cn('block truncate text-sm font-semibold', surface.textPrimary)}>
          {room.name}
        </span>
        <span className={cn('mt-0.5 block truncate text-xs', surface.textMuted)}>
          {room.deviceSummary}
          {groupName ? ` · ${groupName}` : ''}
        </span>
      </button>
      <span
        className={cn(
          'hidden shrink-0 items-center gap-1 text-xs sm:flex',
          room.isVisible ? surface.textSecondary : surface.textMuted
        )}
      >
        {room.isVisible ? (
          <Eye className={navetIconSizeTokens.sm} aria-hidden="true" />
        ) : (
          <EyeOff className={navetIconSizeTokens.sm} aria-hidden="true" />
        )}
        {room.isFavorite ? (
          <Heart className={cn(navetIconSizeTokens.sm, 'fill-current')} aria-hidden="true" />
        ) : null}
      </span>
      {actions.onMoveRoom ? (
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="compact"
            iconOnly
            label={`${labels.moveEarlier}: ${room.name}`}
            disabled={reorderDisabled || index === 0}
            onClick={() => actions.onMoveRoom?.(room.id, 'earlier')}
            className="min-h-11 min-w-11 motion-reduce:transition-none"
          >
            <ArrowUp className={navetIconSizeTokens.sm} />
          </Button>
          <Button
            variant="ghost"
            size="compact"
            iconOnly
            label={`${labels.moveLater}: ${room.name}`}
            disabled={reorderDisabled || index === roomCount - 1}
            onClick={() => actions.onMoveRoom?.(room.id, 'later')}
            className="min-h-11 min-w-11 motion-reduce:transition-none"
          >
            <ArrowDown className={navetIconSizeTokens.sm} />
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function RoomDetailsPanel({
  viewModel,
  labels,
  actions,
  surface,
  accentColor,
}: WorkspacePanelProps) {
  const room = viewModel.rooms.find((candidate) => candidate.id === viewModel.selectedRoomId);
  if (!room) {
    return (
      <div className="flex h-full min-h-0 p-4 md:p-6">
        <MissingRoomState labels={labels} surface={surface} accentColor={accentColor} />
      </div>
    );
  }

  return (
    <section
      aria-label={labels.roomDetailsTitle}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-panel="room-details"
    >
      <div className={cn('border-b p-5 md:p-6', surface.border)}>
        <PanelHeading
          title={labels.roomDetailsTitle}
          description={labels.roomDetailsDescription}
          surface={surface}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 md:p-6">
        <div>
          <p className={cn(navetTypographyTokens.label, surface.textPrimary)}>
            {labels.roomNameLabel}
          </p>
          <div
            className={cn(
              'mt-2 flex min-w-0 items-center justify-between gap-3 rounded-[20px] border p-3',
              surface.border,
              surface.subtleBg
            )}
          >
            <p className={cn('min-w-0 flex-1 truncate text-sm font-medium', surface.textPrimary)}>
              {room.name}
            </p>
            {actions.onRequestRoomRename ? (
              <Button
                variant="secondary"
                onClick={() => actions.onRequestRoomRename?.(room.id)}
                className="min-h-11 shrink-0 motion-reduce:transition-none"
              >
                {labels.editRoom}
              </Button>
            ) : null}
          </div>
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

        <div className="flex justify-end">
          <RoomMoreActionsMenu room={room} labels={labels} actions={actions} />
        </div>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-t p-4',
          surface.border
        )}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={actions.onCancel}
            className="min-h-11 motion-reduce:transition-none"
          >
            {labels.cancel}
          </Button>
          <Button
            variant="ghost"
            onClick={() => actions.onStageChange('structure')}
            leading={<ArrowLeft className={navetIconSizeTokens.sm} />}
            className="min-h-11 motion-reduce:transition-none"
          >
            {labels.back}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => actions.onStageChange('device-selection')}
            className="min-h-11 motion-reduce:transition-none"
          >
            {labels.manageDevices}
          </Button>
          <Button
            onClick={() => actions.onStageChange('impact-review')}
            disabled={!viewModel.hasUnsavedChanges}
            trailing={<ChevronRight className={navetIconSizeTokens.sm} />}
            className="min-h-11 motion-reduce:transition-none"
          >
            {labels.reviewChanges}
          </Button>
        </div>
      </div>
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
  const visibleDeviceIds = viewModel.devices
    .filter((device) => !device.isUnavailable)
    .map((device) => device.id);
  const everyVisibleDeviceSelected =
    visibleDeviceIds.length > 0 && visibleDeviceIds.every((id) => selectedIds.has(id));

  return (
    <section
      aria-label={labels.devicesTitle}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-panel="device-selection"
    >
      <div className={cn('border-b p-5 md:p-6', surface.border)}>
        <PanelHeading
          title={labels.devicesTitle}
          description={labels.devicesDescription}
          surface={surface}
        />
        <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            name="room-device-search"
            autoComplete="off"
            spellCheck={false}
            value={viewModel.deviceQuery}
            aria-label={labels.searchLabel}
            placeholder={labels.searchPlaceholder}
            onChange={(event) => actions.onDeviceQueryChange(event.currentTarget.value)}
            leading={<Search className={navetIconSizeTokens.sm} aria-hidden="true" />}
            containerClassName="min-w-0 flex-1"
            inputClassName="min-h-11 motion-reduce:transition-none"
          />
          {actions.onVisibleDeviceSelectionChange ? (
            <Button
              variant="secondary"
              onClick={() =>
                actions.onVisibleDeviceSelectionChange?.(
                  visibleDeviceIds,
                  !everyVisibleDeviceSelected
                )
              }
              className="min-h-11 shrink-0 motion-reduce:transition-none"
            >
              {everyVisibleDeviceSelected ? labels.clearSelection : labels.selectAll}
            </Button>
          ) : null}
        </div>
        {viewModel.selectionSummary ? (
          <p aria-live="polite" className={cn('mt-3 text-sm', surface.textMuted)}>
            {viewModel.selectionSummary}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
        {viewModel.devices.length > 0 ? (
          <div className="space-y-2">
            {viewModel.devices.map((device) => {
              const selected = selectedIds.has(device.id);
              return (
                <SelectableCheckboxRow
                  key={device.id}
                  id={`room-device-${device.id}`}
                  checked={selected}
                  onCheckedChange={(checked) =>
                    actions.onDeviceSelectionChange?.(device.id, checked)
                  }
                  disabled={device.isUnavailable || !actions.onDeviceSelectionChange}
                  label={device.name}
                  description={device.description}
                  leading={
                    <SlidersHorizontal
                      className={cn(navetIconSizeTokens.sm, surface.textSecondary)}
                    />
                  }
                  trailing={
                    device.stateLabel ? (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          device.isUnavailable ? 'text-amber-400' : surface.textSecondary
                        )}
                      >
                        {device.stateLabel}
                      </span>
                    ) : null
                  }
                  rowClassName={cn(
                    'min-h-14 [contain-intrinsic-size:56px] [content-visibility:auto]',
                    surface.subtleBg,
                    surface.border
                  )}
                  selectedClassName={surface.borderStrong}
                  labelClassName={surface.textPrimary}
                  descriptionClassName={surface.textMuted}
                  checkboxPaletteColor={accentColor}
                  selectedStyle={{
                    backgroundColor: `${accentColor}14`,
                    borderColor: `${accentColor}66`,
                  }}
                />
              );
            })}
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

      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-t p-4',
          surface.border
        )}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={actions.onCancel}
            className="min-h-11 motion-reduce:transition-none"
          >
            {labels.cancel}
          </Button>
          <Button
            variant="ghost"
            onClick={() => actions.onStageChange('room-details')}
            leading={<ArrowLeft className={navetIconSizeTokens.sm} />}
            className="min-h-11 motion-reduce:transition-none"
          >
            {labels.back}
          </Button>
        </div>
        <Button
          onClick={() => actions.onStageChange('impact-review')}
          trailing={<ChevronRight className={navetIconSizeTokens.sm} />}
          className="min-h-11 motion-reduce:transition-none"
        >
          {labels.reviewChanges}
        </Button>
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
      <div className={cn('border-b p-5 md:p-6', surface.border)}>
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
            {viewModel.hasUnsavedChanges ? labels.unsavedChanges : labels.allChangesSaved}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={actions.onCancel}
              className="min-h-11 motion-reduce:transition-none"
            >
              {labels.cancel}
            </Button>
            <Button
              variant="ghost"
              onClick={() => actions.onStageChange('device-selection')}
              leading={<ArrowLeft className={navetIconSizeTokens.sm} />}
              className="min-h-11 motion-reduce:transition-none"
            >
              {labels.back}
            </Button>
            <Button
              onClick={actions.onSave}
              loading={viewModel.isSaving}
              disabled={!viewModel.hasUnsavedChanges}
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
}: WorkspacePanelProps) {
  const selectedRoom = viewModel.rooms.find((room) => room.id === viewModel.selectedRoomId);

  return (
    <aside
      aria-label={labels.contextRegion}
      className="flex h-full min-h-0 flex-col"
      data-room-workspace-region="context"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {selectedRoom ? (
          <section>
            <p className={cn(navetTypographyTokens.eyebrow, surface.textMuted)}>
              {labels.currentRoomTitle}
            </p>
            <div className="mt-3 flex min-w-0 items-center gap-3">
              <RoomSymbol room={selectedRoom} surface={surface} />
              <div className="min-w-0">
                <p className={cn('truncate text-sm font-semibold', surface.textPrimary)}>
                  {selectedRoom.name}
                </p>
                <p className={cn('mt-0.5 truncate text-xs', surface.textMuted)}>
                  {selectedRoom.deviceSummary}
                </p>
              </div>
            </div>
            {selectedRoom.attentionSummary ? (
              <p className="mt-3 text-sm font-medium text-amber-400">
                {selectedRoom.attentionSummary}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className={cn(selectedRoom ? `mt-5 border-t pt-5 ${surface.border}` : '')}>
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

      {viewModel.mode === 'manage' ? (
        <div className={cn('space-y-2 border-t p-4', surface.border)}>
          <Button
            variant="secondary"
            onClick={() => actions.onStageChange('impact-review')}
            disabled={!viewModel.hasUnsavedChanges}
            leading={<ListChecks className={navetIconSizeTokens.sm} />}
            className="min-h-11 w-full motion-reduce:transition-none"
          >
            {labels.reviewChanges}
          </Button>
          <Button
            onClick={actions.onSave}
            loading={viewModel.isSaving}
            disabled={!viewModel.hasUnsavedChanges}
            className="min-h-11 w-full motion-reduce:transition-none"
          >
            {labels.saveChanges}
          </Button>
          <Button
            variant="ghost"
            onClick={actions.onCancel}
            className="min-h-11 w-full motion-reduce:transition-none"
          >
            {labels.cancel}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

export function RoomWorkspaceActivePanel(props: WorkspacePanelProps) {
  if (props.viewModel.mode === 'browse') {
    return <RoomBrowsePanel {...props} />;
  }
  if (props.viewModel.stage === 'room-details') {
    return <RoomDetailsPanel {...props} />;
  }
  if (props.viewModel.stage === 'device-selection') {
    return <RoomDeviceSelectionPanel {...props} />;
  }
  if (props.viewModel.stage === 'impact-review') {
    return <RoomImpactReviewPanel {...props} />;
  }
  return <RoomStructurePanel {...props} />;
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

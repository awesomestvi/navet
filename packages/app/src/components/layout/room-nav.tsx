import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { getThemeDropdownSurfaceClasses } from '@navet/app/components/shared/theme/dropdown-surface-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { cn } from '@navet/app/components/ui/utils';
import { getDashboardRoomLabel, isAllRooms } from '@navet/app/constants/rooms';
import type { AllViewGrouping } from '@navet/app/features/dashboard';
import { useI18n, useIntegrationStore, useTheme } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import {
  Check,
  ChevronDown,
  Edit3,
  LayoutGrid,
  type Lightbulb,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getManageableRoomOrder } from './mobile-layout-helpers';
import { getVisibleRoomNavRooms } from './room-nav.utils';
import { RoomOrderDialog } from './room-order-dialog';

const ROOM_NAV_GAP_PX = 8;

interface RoomNavProps {
  rooms?: string[];
  hiddenRoomNames?: string[];
  roomHiddenItemCounts?: Map<string, number>;
  roomItemCounts?: Map<string, number>;
  activeRoom: string;
  onRoomChange: (room: string) => void;
  allViewGrouping?: AllViewGrouping;
  isEditMode: boolean;
  onRoomOrderChange?: (rooms: string[]) => void;
  onHiddenRoomsChange?: (rooms: string[]) => void;
  onAllViewGroupingChange?: (grouping: AllViewGrouping) => void;
  onToggleEditMode: () => void;
  onAddEntity?: () => void;
  addEntityLabel?: string;
}

interface RoomNavItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  room: string;
  activeRoom: string;
  allLabel: string;
  activeClassName: string;
  inactiveClassName: string;
  onRoomChange?: (room: string) => void;
}

interface RoomNavMenuButtonProps {
  icon: typeof Lightbulb;
  label: string;
  textSecondary: string;
  className: string;
}

interface RoomLayoutState {
  visibleRooms: string[];
  overflowRooms: string[];
}

function areRoomListsEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function getInlineWidth(widths: number[]) {
  if (widths.length === 0) {
    return 0;
  }

  return widths.reduce((total, width) => total + width, 0) + ROOM_NAV_GAP_PX * (widths.length - 1);
}

function resolveRoomLayout({
  activeRoom,
  availableWidth,
  overflowWidth,
  rooms,
  roomWidths,
}: {
  activeRoom: string;
  availableWidth: number;
  overflowWidth: number;
  rooms: string[];
  roomWidths: Map<string, number>;
}): RoomLayoutState {
  if (rooms.length === 0 || availableWidth <= 0) {
    return { visibleRooms: rooms, overflowRooms: [] };
  }

  const widths = rooms.map((room) => roomWidths.get(room) ?? 0);

  if (widths.some((width) => width <= 0)) {
    return { visibleRooms: rooms, overflowRooms: [] };
  }

  if (getInlineWidth(widths) <= availableWidth) {
    return { visibleRooms: rooms, overflowRooms: [] };
  }

  const nextVisibleRooms: string[] = [];

  for (let index = 0; index < rooms.length; index += 1) {
    const room = rooms[index];
    const visibleWidths = [...nextVisibleRooms, room].map((value) => roomWidths.get(value) ?? 0);
    const remainingCount = rooms.length - index - 1;
    const projectedWidth =
      getInlineWidth(visibleWidths) + (remainingCount > 0 ? ROOM_NAV_GAP_PX + overflowWidth : 0);

    if (projectedWidth <= availableWidth || nextVisibleRooms.length === 0) {
      nextVisibleRooms.push(room);
      continue;
    }

    break;
  }

  if (nextVisibleRooms.includes(activeRoom)) {
    return {
      visibleRooms: nextVisibleRooms,
      overflowRooms: rooms.filter((room) => !nextVisibleRooms.includes(room)),
    };
  }

  const activeWidth = roomWidths.get(activeRoom);

  if (!activeWidth) {
    return {
      visibleRooms: nextVisibleRooms,
      overflowRooms: rooms.filter((room) => !nextVisibleRooms.includes(room)),
    };
  }

  for (let cutIndex = nextVisibleRooms.length - 1; cutIndex >= 0; cutIndex -= 1) {
    const candidateVisibleRooms = [...nextVisibleRooms.slice(0, cutIndex), activeRoom];
    const candidateWidths = candidateVisibleRooms.map((room) => roomWidths.get(room) ?? 0);

    if (getInlineWidth(candidateWidths) + ROOM_NAV_GAP_PX + overflowWidth <= availableWidth) {
      return {
        visibleRooms: candidateVisibleRooms,
        overflowRooms: rooms.filter((room) => !candidateVisibleRooms.includes(room)),
      };
    }
  }

  return {
    visibleRooms: [activeRoom],
    overflowRooms: rooms.filter((room) => room !== activeRoom),
  };
}

export const RoomNav = memo(function RoomNav({
  rooms = [],
  hiddenRoomNames = [],
  roomHiddenItemCounts = new Map(),
  roomItemCounts = new Map(),
  activeRoom,
  onRoomChange,
  allViewGrouping = 'custom',
  isEditMode,
  onRoomOrderChange,
  onHiddenRoomsChange,
  onAllViewGroupingChange,
  onToggleEditMode,
  onAddEntity,
  addEntityLabel = 'Add Entity',
}: RoomNavProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const manageableRoomsByProviderId = useIntegrationStore(
    integrationSelectors.manageableRoomsByProviderId
  );
  const surface = getThemeSurfaceTokens(theme);
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false);
  const [roomLayout, setRoomLayout] = useState<RoomLayoutState>({
    visibleRooms: [],
    overflowRooms: [],
  });
  const roomListRef = useRef<HTMLDivElement>(null);
  const overflowMeasureRef = useRef<HTMLButtonElement>(null);
  const roomMeasureRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const manageableRooms = useMemo(
    () => Object.values(manageableRoomsByProviderId).flat(),
    [manageableRoomsByProviderId]
  );
  const orderedManageableRoomNames = useMemo(
    () => getManageableRoomOrder(rooms, manageableRooms),
    [manageableRooms, rooms]
  );
  const allLabel = t('dashboard.roomNav.all');
  const availableRooms = useMemo(
    () => getVisibleRoomNavRooms(rooms.filter((room) => !hiddenRoomNames.includes(room))),
    [hiddenRoomNames, rooms]
  );
  const textSecondary = surface.textSecondary;
  const inactiveBg = surface.subtleBg;
  const hoverBg = surface.hoverBg;
  const dividerClass =
    theme === 'light' ? 'bg-slate-300/90' : theme === 'black' ? 'bg-white/30' : 'bg-white/14';
  const showAllViewGrouping = isAllRooms(activeRoom) && onAllViewGroupingChange;
  const canReorderRooms =
    isEditMode && Boolean(onRoomOrderChange) && orderedManageableRoomNames.length > 0;
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
  const overflowRooms = roomLayout.overflowRooms;
  const overflowLabel = t(
    overflowRooms.length === 1
      ? 'dashboard.roomNav.overflow.one'
      : 'dashboard.roomNav.overflow.other',
    { count: overflowRooms.length }
  );

  const updateRoomLayout = useCallback(() => {
    const containerWidth = roomListRef.current?.getBoundingClientRect().width ?? 0;
    const overflowWidth = overflowMeasureRef.current?.getBoundingClientRect().width ?? 0;
    const roomWidths = new Map<string, number>();

    for (const room of availableRooms) {
      const width = roomMeasureRefs.current[room]?.getBoundingClientRect().width ?? 0;
      roomWidths.set(room, width);
    }

    const nextLayout = resolveRoomLayout({
      activeRoom,
      availableWidth: containerWidth,
      overflowWidth,
      rooms: availableRooms,
      roomWidths,
    });

    setRoomLayout((currentLayout) =>
      areRoomListsEqual(currentLayout.visibleRooms, nextLayout.visibleRooms) &&
      areRoomListsEqual(currentLayout.overflowRooms, nextLayout.overflowRooms)
        ? currentLayout
        : nextLayout
    );
  }, [activeRoom, availableRooms]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(updateRoomLayout);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [updateRoomLayout]);

  useEffect(() => {
    window.addEventListener('resize', updateRoomLayout);
    return () => {
      window.removeEventListener('resize', updateRoomLayout);
    };
  }, [updateRoomLayout]);

  return (
    <>
      <div className="hidden md:block">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div ref={roomListRef} className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1 overflow-hidden">
              {roomLayout.visibleRooms.map((room) => (
                <RoomNavItem
                  key={room}
                  room={room}
                  activeRoom={activeRoom}
                  allLabel={allLabel}
                  activeClassName={activeRoomItemClassName}
                  inactiveClassName={inactiveRoomItemClassName}
                  onRoomChange={onRoomChange}
                />
              ))}
              {overflowRooms.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <InteractivePill
                      aria-label={t('dashboard.roomNav.openRooms')}
                      size="small"
                      variant="ghost"
                      className={`room-nav-item rounded-[22px] whitespace-nowrap shrink-0 transition-colors ${inactiveRoomItemClassName}`}
                    >
                      <span>{overflowLabel}</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </InteractivePill>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={8}
                    className={cn(
                      getThemeDropdownSurfaceClasses(theme),
                      'w-[min(44rem,calc(100vw-2rem))] max-h-none overflow-visible p-2'
                    )}
                  >
                    <DropdownMenuLabel
                      className={`px-3 pb-2 pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${surface.textMuted}`}
                    >
                      {t('dashboard.roomNav.openRooms')}
                    </DropdownMenuLabel>
                    <div className={`mb-2 h-px ${dividerClass}`} />
                    <div className="grid grid-cols-2 gap-1 lg:grid-cols-3">
                      {overflowRooms.map((room) => (
                        <DropdownMenuItem
                          key={room}
                          className={dropdownItemClassName}
                          onClick={() => onRoomChange(room)}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate">
                              {getDashboardRoomLabel(room, allLabel)}
                            </span>
                          </span>
                          {activeRoom === room ? <Check className="h-4 w-4" /> : null}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
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
                <SlidersHorizontal className={`h-4 w-4 ${textSecondary}`} />
                <span className={`hidden text-sm font-medium md:inline ${textSecondary}`}>
                  {t('dashboard.roomNav.reorder')}
                </span>
              </InteractivePill>
            ) : null}

            {isEditMode && onAddEntity ? (
              <InteractivePill
                onClick={onAddEntity}
                intent="action"
                size="small"
                className={actionPillClassName}
              >
                <Plus className={`h-4 w-4 ${textSecondary}`} />
                <span className={`hidden text-sm font-medium md:inline ${textSecondary}`}>
                  {addEntityLabel}
                </span>
              </InteractivePill>
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
              className={`room-nav-action-pill hidden md:flex items-center gap-2 rounded-[22px] px-3 py-2 text-sm md:gap-2.5 md:px-3.5 md:py-2 transition-colors ${
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

      <div aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-0 -z-10">
        <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
          {availableRooms.map((room) => (
            <RoomNavItem
              key={`measure-${room}`}
              ref={(node) => {
                roomMeasureRefs.current[room] = node;
              }}
              room={room}
              activeRoom="__measure__"
              allLabel={allLabel}
              activeClassName={activeRoomItemClassName}
              inactiveClassName={inactiveRoomItemClassName}
              tabIndex={-1}
              onRoomChange={() => undefined}
            />
          ))}
          <InteractivePill
            ref={overflowMeasureRef}
            size="small"
            variant="ghost"
            className={`room-nav-item rounded-[22px] whitespace-nowrap shrink-0 transition-colors ${inactiveRoomItemClassName}`}
            tabIndex={-1}
          >
            <span>{t('dashboard.roomNav.overflow.other', { count: 99 })}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </InteractivePill>
        </div>
      </div>

      {canReorderRooms ? (
        <RoomOrderDialog
          isOpen={isReorderDialogOpen}
          onOpenChange={setIsReorderDialogOpen}
          rooms={orderedManageableRoomNames}
          hiddenRoomNames={hiddenRoomNames}
          manageableRooms={manageableRooms}
          roomHiddenItemCounts={roomHiddenItemCounts}
          roomEntityCounts={roomItemCounts}
          onRoomOrderChange={onRoomOrderChange}
          onHiddenRoomsChange={onHiddenRoomsChange}
        />
      ) : null}
    </>
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

const RoomNavItem = memo(
  forwardRef<HTMLButtonElement, RoomNavItemProps>(function RoomNavItem(
    { room, activeRoom, allLabel, activeClassName, inactiveClassName, onRoomChange, ...props },
    ref
  ) {
    const isActive = activeRoom === room;

    return (
      <InteractivePill
        ref={ref}
        active={isActive}
        onClick={() => onRoomChange?.(room)}
        size="small"
        variant="ghost"
        className={`room-nav-item rounded-[22px] whitespace-nowrap shrink-0 transition-colors ${
          isActive ? activeClassName : inactiveClassName
        }`}
        {...props}
      >
        {getDashboardRoomLabel(room, allLabel)}
      </InteractivePill>
    );
  })
);

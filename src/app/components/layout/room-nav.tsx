import { Check, ChevronDown, Edit3, GripVertical, LayoutGrid, Lightbulb } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  forwardRef,
  memo,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
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
import { isAllRooms } from '@/app/constants/rooms';
import type { AllViewGrouping } from '@/app/features/dashboard';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getManageableRoomOrder } from './mobile-layout-helpers';
import { getVisibleRoomNavRooms } from './room-nav.utils';
import { RoomOrderDialog } from './room-order-dialog';

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

interface RoomNavScrollbarStyle extends CSSProperties {
  '--room-nav-scrollbar-left': string;
  '--room-nav-scrollbar-width': string;
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
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const [scrollbarStyle, setScrollbarStyle] = useState<RoomNavScrollbarStyle>({
    '--room-nav-scrollbar-left': '0px',
    '--room-nav-scrollbar-width': '0px',
  });
  const [hasRoomOverflow, setHasRoomOverflow] = useState(false);
  const roomScrollerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    maxScrollLeft: number;
    maxThumbLeft: number;
    startScrollLeft: number;
    startX: number;
  } | null>(null);
  const manageableRooms = useMemo(() => {
    return getManageableRoomOrder(rooms, areas);
  }, [areas, rooms]);
  const visibleRooms = useMemo(() => getVisibleRoomNavRooms(rooms), [rooms]);
  const textSecondary = surface.textSecondary;
  const inactiveBg = surface.subtleBg;
  const hoverBg = surface.hoverBg;
  const dividerClass =
    theme === 'light' ? 'bg-slate-300/90' : theme === 'black' ? 'bg-white/30' : 'bg-white/14';
  const showAllViewGrouping = isAllRooms(activeRoom) && onAllViewGroupingChange;
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
  const updateScrollbarMetrics = useCallback(() => {
    const scroller = roomScrollerRef.current;

    if (!scroller) {
      return;
    }

    const { clientWidth, scrollLeft, scrollWidth } = scroller;
    const maxScrollLeft = scrollWidth - clientWidth;

    if (maxScrollLeft <= 1) {
      setHasRoomOverflow(false);
      setScrollbarStyle({
        '--room-nav-scrollbar-left': '0px',
        '--room-nav-scrollbar-width': '0px',
      });
      return;
    }

    const thumbWidth = Math.max(32, (clientWidth / scrollWidth) * clientWidth);
    const maxThumbLeft = clientWidth - thumbWidth;
    const thumbLeft = (scrollLeft / maxScrollLeft) * maxThumbLeft;

    setHasRoomOverflow(true);
    setScrollbarStyle({
      '--room-nav-scrollbar-left': `${thumbLeft}px`,
      '--room-nav-scrollbar-width': `${thumbWidth}px`,
    });
  }, []);
  const handleRoomScroll = useCallback(() => {
    updateScrollbarMetrics();
  }, [updateScrollbarMetrics]);
  const handleScrollbarPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const scroller = roomScrollerRef.current;

    if (!scroller) {
      return;
    }

    const { clientWidth, scrollLeft, scrollWidth } = scroller;
    const maxScrollLeft = scrollWidth - clientWidth;

    if (maxScrollLeft <= 1) {
      return;
    }

    const thumbWidth = Math.max(32, (clientWidth / scrollWidth) * clientWidth);
    dragStateRef.current = {
      maxScrollLeft,
      maxThumbLeft: clientWidth - thumbWidth,
      startScrollLeft: scrollLeft,
      startX: event.clientX,
    };
    setIsScrollbarDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, []);
  const handleScrollbarPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const scroller = roomScrollerRef.current;
    const dragState = dragStateRef.current;

    if (!scroller || !dragState) {
      return;
    }

    const scrollDelta =
      ((event.clientX - dragState.startX) / dragState.maxThumbLeft) * dragState.maxScrollLeft;
    scroller.scrollLeft = dragState.startScrollLeft + scrollDelta;
  }, []);
  const handleScrollbarPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    setIsScrollbarDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    const scroller = roomScrollerRef.current;

    if (!scroller) {
      return;
    }

    updateScrollbarMetrics();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScrollbarMetrics);

      return () => {
        window.removeEventListener('resize', updateScrollbarMetrics);
      };
    }

    const resizeObserver = new ResizeObserver(updateScrollbarMetrics);
    resizeObserver.observe(scroller);

    if (scroller.firstElementChild) {
      resizeObserver.observe(scroller.firstElementChild);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateScrollbarMetrics]);

  return (
    <>
      <div className="hidden md:block">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div
            className={`room-nav-scrollbar relative flex-1 min-w-0 ${
              isScrollbarDragging ? 'is-dragging' : ''
            }`}
            style={scrollbarStyle}
          >
            <div
              ref={roomScrollerRef}
              className="w-full overflow-x-auto scrollbar-hide"
              onScroll={handleRoomScroll}
            >
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
            {hasRoomOverflow ? (
              <div
                aria-hidden="true"
                className="room-nav-scrollbar-bar absolute inset-x-0 -bottom-1.5 z-10 h-2 touch-none select-none rounded-full"
              >
                <div
                  className="room-nav-scrollbar-thumb absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                  onPointerDown={handleScrollbarPointerDown}
                  onPointerMove={handleScrollbarPointerMove}
                  onPointerUp={handleScrollbarPointerUp}
                  onPointerCancel={handleScrollbarPointerUp}
                />
              </div>
            ) : null}
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
      {isAllRooms(room) ? allLabel : room}
    </InteractivePill>
  );
});

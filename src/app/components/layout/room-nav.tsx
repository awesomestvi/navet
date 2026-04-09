import { Check, ChevronDown, Edit3, LayoutGrid, Lightbulb } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import type { AllViewGrouping } from '@/app/features/dashboard';
import { useI18n, useTheme } from '@/app/hooks';
import { useViewportResize } from '@/app/hooks/use-viewport-resize';

interface RoomNavProps {
  rooms?: string[];
  activeRoom: string;
  onRoomChange: (room: string) => void;
  allViewGrouping?: AllViewGrouping;
  isEditMode: boolean;
  onAllViewGroupingChange?: (grouping: AllViewGrouping) => void;
  onToggleEditMode: () => void;
  onAddEntity?: () => void;
  addEntityLabel?: string;
}

interface RoomNavItemProps {
  room: string;
  activeRoom: string;
  allLabel: string;
  textSecondary: string;
  hoverBg: string;
  onRoomChange: (room: string) => void;
}

interface RoomNavMenuButtonProps {
  icon: typeof Lightbulb;
  label: string;
  textSecondary: string;
  className: string;
}

function useStickyActivation() {
  const stickyMarkerRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const attachObserver = useCallback(() => {
    const markerNode = stickyMarkerRef.current;
    const stickyNode = stickyRef.current;
    const shellNode = shellRef.current;
    if (!markerNode || !stickyNode || !shellNode) {
      return;
    }

    observerRef.current?.disconnect();

    const stickyTop = Number.parseFloat(window.getComputedStyle(stickyNode).top) || 0;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        shellNode.classList.toggle('is-stuck', Boolean(entry) && !entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: `-${stickyTop}px 0px 0px 0px`,
      }
    );

    observerRef.current.observe(markerNode);
  }, []);

  useViewportResize(attachObserver);

  useEffect(() => {
    attachObserver();

    return () => {
      observerRef.current?.disconnect();
    };
  }, [attachObserver]);

  return { stickyMarkerRef, stickyRef, shellRef };
}

export const RoomNav = memo(function RoomNav({
  rooms = [],
  activeRoom,
  onRoomChange,
  allViewGrouping = 'custom',
  isEditMode,
  onAllViewGroupingChange,
  onToggleEditMode,
  onAddEntity,
  addEntityLabel = 'Add Entity',
}: RoomNavProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { stickyMarkerRef, stickyRef, shellRef } = useStickyActivation();
  const visibleRooms = ['All', ...rooms];
  const textSecondary = surface.textSecondary;
  const inactiveBg = surface.subtleBg;
  const hoverBg = surface.hoverBg;
  const dividerClass =
    theme === 'light' ? 'bg-gray-300/90' : theme === 'black' ? 'bg-white/30' : 'bg-white/14';
  const stickyOffset = 'calc(env(safe-area-inset-top, 0px) + 8px)';
  const stickyShellStyle = useMemo<CSSProperties>(() => {
    if (theme === 'light') {
      return {
        '--room-nav-sticky-border': 'rgba(229, 231, 235, 0.8)',
        '--room-nav-sticky-bg': 'rgba(255, 255, 255, 0.9)',
        '--room-nav-sticky-shadow': '0 10px 24px -24px rgba(15, 23, 42, 0.22)',
      } as CSSProperties;
    }

    if (theme === 'glass') {
      return {
        '--room-nav-sticky-border': 'rgba(255, 255, 255, 0.12)',
        '--room-nav-sticky-bg': 'rgba(255, 255, 255, 0.10)',
        '--room-nav-sticky-shadow': 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
      } as CSSProperties;
    }

    if (theme === 'black') {
      return {
        '--room-nav-sticky-border': 'rgba(255, 255, 255, 0.18)',
        '--room-nav-sticky-bg': 'rgba(0, 0, 0, 0.94)',
        '--room-nav-sticky-shadow': '0 16px 36px -28px rgba(0, 0, 0, 0.8)',
      } as CSSProperties;
    }

    return {
      '--room-nav-sticky-border': 'rgba(255, 255, 255, 0.1)',
      '--room-nav-sticky-bg': 'rgba(20, 21, 24, 0.92)',
      '--room-nav-sticky-shadow': '0 10px 24px -24px rgba(0, 0, 0, 0.72)',
    } as CSSProperties;
  }, [theme]);
  const showAllViewGrouping = activeRoom === 'All' && onAllViewGroupingChange;
  const hasEditMenus = Boolean((isEditMode && showAllViewGrouping) || (isEditMode && onAddEntity));
  const actionPillClassName = `flex items-center gap-1.5 rounded-[22px] px-2.5 py-1.5 text-xs md:gap-2 md:px-3 md:py-2 md:text-sm transition-colors ${inactiveBg} ${hoverBg}`;
  const dropdownItemClassName = `rounded-xl px-3 py-2 ${surface.textPrimary} ${hoverBg}`;
  const allViewGroupingOptions: Array<{ label: string; value: AllViewGrouping }> = [
    { label: t('dashboard.roomNav.grouping.custom'), value: 'custom' },
    { label: t('dashboard.roomNav.grouping.room'), value: 'room' },
    { label: t('dashboard.roomNav.grouping.type'), value: 'type' },
    { label: t('dashboard.roomNav.grouping.none'), value: 'none' },
  ];

  return (
    <>
      <div
        ref={stickyMarkerRef}
        aria-hidden="true"
        // Zero height keeps this marker out of layout. The negative bottom margin
        // cancels the parent flex gap so the nav does not gain extra top spacing.
        className="h-0 -mb-6 pointer-events-none md:-mb-8"
      />
      <div ref={stickyRef} className="sticky top-0 z-30" style={{ top: stickyOffset }}>
        <div ref={shellRef} className="room-nav-shell" data-theme={theme} style={stickyShellStyle}>
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1 min-w-max md:gap-1.5">
                {visibleRooms.map((room) => (
                  <RoomNavItem
                    key={room}
                    room={room}
                    activeRoom={activeRoom}
                    allLabel={t('dashboard.roomNav.all')}
                    textSecondary={textSecondary}
                    hoverBg={hoverBg}
                    onRoomChange={onRoomChange}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 pl-1 md:gap-1.5 md:pl-1.5">
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
                    <DropdownMenuLabel className={`px-3 py-2 text-xs font-medium ${textSecondary}`}>
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
                className={`room-nav-action-pill flex items-center gap-1.5 rounded-[22px] px-2.5 py-1.5 text-xs md:gap-2 md:px-3 md:py-2 md:text-sm transition-colors ${
                  isEditMode ? 'shadow-sm' : `${inactiveBg} ${hoverBg}`
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
                    <span className="hidden text-xs font-medium text-white md:inline">
                      {t('dashboard.roomNav.doneEditing')}
                    </span>
                  </>
                ) : (
                  <>
                    <Edit3 className={`h-4 w-4 ${textSecondary}`} />
                    <span className={`hidden text-xs font-medium md:inline ${textSecondary}`}>
                      {t('dashboard.roomNav.customize')}
                    </span>
                  </>
                )}
              </InteractivePill>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

const RoomNavMenuButton = memo(
  forwardRef<HTMLButtonElement, RoomNavMenuButtonProps & ButtonHTMLAttributes<HTMLButtonElement>>(
    function RoomNavMenuButton({ icon: Icon, label, textSecondary, className, ...props }, ref) {
      return (
        <InteractivePill ref={ref} intent="action" className={className} {...props}>
          <Icon className={`h-4 w-4 ${textSecondary}`} />
          <span className={`hidden text-xs font-medium md:inline ${textSecondary}`}>{label}</span>
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
  textSecondary,
  hoverBg,
  onRoomChange,
}: RoomNavItemProps) {
  return (
    <InteractivePill
      active={activeRoom === room}
      onClick={() => onRoomChange(room)}
      variant="ghost"
      className={`room-nav-item px-2.5 md:px-3 py-1.5 md:py-2 rounded-[22px] text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
        activeRoom === room ? 'room-nav-item-active text-white' : `${textSecondary} ${hoverBg}`
      }`}
    >
      {room === 'All' ? allLabel : room}
    </InteractivePill>
  );
});

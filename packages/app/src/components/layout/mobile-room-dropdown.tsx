import { Button } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { getDashboardRoomLabel } from '@navet/app/constants/rooms';
import { RoomSymbolIcon } from '@navet/app/features/dashboard/rooms/components/room-symbol-icon';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Check, ChevronDown, Layers3 } from 'lucide-react';
import { memo, useMemo } from 'react';
import {
  filterHiddenRooms,
  getVisibleRoomNavRooms,
  type RoomNavigationGroup,
} from './room-nav.utils';

export interface MobileRoomNavigation {
  activeRoom: string;
  onRoomChange: (room: string) => void;
  rooms: string[];
  hiddenRoomNames?: string[];
  groups?: RoomNavigationGroup[];
}

interface MobileRoomDropdownProps {
  navigation: MobileRoomNavigation;
  compact?: boolean;
}

export const MobileRoomDropdown = memo(function MobileRoomDropdown({
  navigation,
  compact = false,
}: MobileRoomDropdownProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const allLabel = t('dashboard.roomNav.all');
  const { standaloneRooms, visibleGroups } = useMemo(() => {
    const visibleRooms = getVisibleRoomNavRooms(
      filterHiddenRooms(navigation.rooms, navigation.hiddenRoomNames ?? [])
    );
    const visibleRoomSet = new Set(visibleRooms);
    const groups = (navigation.groups ?? [])
      .map((group) => ({
        ...group,
        rooms: group.rooms.filter((room) => visibleRoomSet.has(room)),
      }))
      .filter((group) => group.rooms.length > 0);
    const groupedRooms = new Set(groups.flatMap((group) => group.rooms));

    return {
      visibleGroups: groups,
      standaloneRooms: visibleRooms.filter((room) => !groupedRooms.has(room)),
    };
  }, [navigation.groups, navigation.hiddenRoomNames, navigation.rooms]);
  const activeLabel = getDashboardRoomLabel(navigation.activeRoom, allLabel);
  const triggerWidthClassName = compact ? 'max-w-[42vw]' : 'max-w-[68vw]';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size={compact ? 'compact' : 'small'}
          trailing={<ChevronDown className="h-4 w-4 shrink-0 text-current/72" />}
          className={`${triggerWidthClassName} h-9 rounded-full justify-start backdrop-blur-xl px-3`}
          aria-label={t('dashboard.roomNav.openRooms')}
        >
          <span
            className={`truncate ${compact ? 'text-[0.8rem]' : 'text-sm'} font-semibold tracking-[-0.01em] ${surface.textPrimary}`}
          >
            {activeLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 md:hidden">
        {standaloneRooms.map((room) => {
          const label = getDashboardRoomLabel(room, allLabel);

          return (
            <DropdownMenuItem
              key={room}
              className={surface.textPrimary}
              onSelect={() => navigation.onRoomChange(room)}
            >
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {navigation.activeRoom === room ? (
                <Check className="h-4 w-4" style={{ color: accentColor }} />
              ) : null}
            </DropdownMenuItem>
          );
        })}
        {visibleGroups.map((group) => (
          <div key={group.id}>
            <DropdownMenuLabel className="flex items-center gap-2 pb-1 pt-3 text-xs font-semibold">
              {group.symbol ? (
                <span aria-hidden="true">
                  <RoomSymbolIcon value={group.symbol} className="h-3.5 w-3.5" />
                </span>
              ) : (
                <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="truncate">{group.name}</span>
            </DropdownMenuLabel>
            {group.rooms.map((room) => (
              <DropdownMenuItem
                key={room}
                className={`${surface.textPrimary} pl-6`}
                onSelect={() => navigation.onRoomChange(room)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {getDashboardRoomLabel(room, allLabel)}
                </span>
                {navigation.activeRoom === room ? (
                  <Check className="h-4 w-4" style={{ color: accentColor }} />
                ) : null}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

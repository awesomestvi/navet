import { Check, ChevronDown } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { getDashboardRoomLabel } from '@/app/constants/rooms';
import { useI18n, useTheme } from '@/app/hooks';
import { filterHiddenRooms, getVisibleRoomNavRooms } from './room-nav.utils';

export interface MobileRoomNavigation {
  activeRoom: string;
  onRoomChange: (room: string) => void;
  rooms: string[];
  hiddenRoomNames?: string[];
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
  const visibleRooms = getVisibleRoomNavRooms(
    filterHiddenRooms(navigation.rooms, navigation.hiddenRoomNames ?? [])
  );
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
        {visibleRooms.map((room) => {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

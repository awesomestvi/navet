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
import { useI18n, useTheme } from '@/app/hooks';
import { getVisibleRoomNavRooms } from './room-nav.utils';

export interface MobileRoomNavigation {
  activeRoom: string;
  onRoomChange: (room: string) => void;
  rooms: string[];
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
  const visibleRooms = getVisibleRoomNavRooms(navigation.rooms);
  const activeLabel = navigation.activeRoom === 'All' ? allLabel : navigation.activeRoom;
  const triggerWidthClassName = compact ? 'max-w-[42vw]' : 'max-w-[68vw]';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size={compact ? 'compact' : 'small'}
          trailing={<ChevronDown className="h-4 w-4 shrink-0 text-current/72" />}
          className={`${triggerWidthClassName} justify-start backdrop-blur-xl`}
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
          const label = room === 'All' ? allLabel : room;

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

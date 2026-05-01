import { Check, ChevronDown, House } from 'lucide-react';
import { memo } from 'react';
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
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const allLabel = t('dashboard.roomNav.all');
  const visibleRooms = getVisibleRoomNavRooms(navigation.rooms);
  const activeLabel = navigation.activeRoom === 'All' ? allLabel : navigation.activeRoom;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InteractivePill
          intent="navigation"
          variant="ghost"
          className={`flex items-center gap-2 rounded-[22px] ${compact ? 'max-w-[42vw] px-2.5 py-1.5' : 'max-w-[68vw] px-3 py-2'} ${surface.subtleBg} ${surface.hoverBg}`}
          aria-label={t('dashboard.roomNav.openRooms')}
        >
          <House className={`h-4 w-4 shrink-0 ${surface.textSecondary}`} />
          <span
            className={`truncate ${compact ? 'text-[0.8rem]' : 'text-sm'} font-medium ${surface.textPrimary}`}
          >
            {activeLabel}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 ${surface.textSecondary}`} />
        </InteractivePill>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(getThemeDropdownSurfaceClasses(theme), 'w-64 overflow-visible p-2 md:hidden')}
      >
        <DropdownMenuLabel className={`px-3 py-2 text-sm font-medium ${surface.textSecondary}`}>
          {t('dashboard.roomNav.openRooms')}
        </DropdownMenuLabel>
        {visibleRooms.map((room) => {
          const label = room === 'All' ? allLabel : room;

          return (
            <DropdownMenuItem
              key={room}
              className={`rounded-xl px-3 py-2 ${surface.textPrimary} ${surface.hoverBg}`}
              onSelect={() => navigation.onRoomChange(room)}
            >
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {navigation.activeRoom === room ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

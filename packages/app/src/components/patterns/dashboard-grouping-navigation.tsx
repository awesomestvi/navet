import { InteractivePill } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { ChevronDown } from 'lucide-react';

export interface DashboardGroupingOption {
  id: string;
  label: string;
}

export interface DashboardGroupingItem {
  id: string;
  label: string;
  indicatorTone?: 'critical' | 'attention';
}

export interface DashboardGroupingNavigationProps {
  ariaLabel: string;
  groupingLabel: string;
  idPrefix: string;
  items: DashboardGroupingItem[];
  modes: DashboardGroupingOption[];
  selectedItemId: string;
  selectedModeId: string;
  onItemChange: (itemId: string) => void;
  onModeChange: (modeId: string) => void;
}

function getGroupingPillClassName(
  isActive: boolean,
  theme: ThemeType,
  surface: ReturnType<typeof getThemeSurfaceTokens>
) {
  if (isActive) {
    if (theme === 'light') {
      return `border ${surface.borderStrong} bg-white text-slate-950 shadow-sm`;
    }
    if (theme === 'glass') {
      return 'border-white/14 bg-slate-950/88 text-white shadow-none';
    }
    if (theme === 'black') {
      return 'border-white/10 bg-zinc-950 text-white shadow-none';
    }
    return 'border-[rgba(161,161,170,0.22)] bg-[rgba(18,18,21,0.98)] text-white shadow-none';
  }

  if (theme === 'light') {
    return `border border-transparent bg-transparent ${surface.hoverBg} text-slate-700`;
  }
  if (theme === 'glass') {
    return 'border-transparent bg-transparent text-white/80 hover:bg-white/8';
  }
  if (theme === 'black') {
    return 'border-transparent bg-transparent text-zinc-300 hover:bg-zinc-950';
  }
  return 'border-transparent bg-transparent text-zinc-300 hover:bg-zinc-800/82';
}

export function DashboardGroupingNavigation({
  ariaLabel,
  groupingLabel,
  idPrefix,
  items,
  modes,
  selectedItemId,
  selectedModeId,
  onItemChange,
  onModeChange,
}: DashboardGroupingNavigationProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const selectedMode = modes.find((mode) => mode.id === selectedModeId) ?? modes[0];

  if (!selectedMode) return null;

  return (
    <div
      className="-mx-1 min-w-0 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-dashboard-grouping-navigation
    >
      <div className="flex w-max min-w-full flex-nowrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <InteractivePill
              aria-label={`${groupingLabel}: ${selectedMode.label}`}
              size="compact"
              intent="navigation"
              variant="ghost"
              className={`shrink-0 gap-1 whitespace-nowrap rounded-[22px] border sm:gap-2 sm:px-3.5 sm:font-medium ${getGroupingPillClassName(
                false,
                theme,
                surface
              )}`}
            >
              <span>{selectedMode.label}</span>
              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
            </InteractivePill>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8}>
            <DropdownMenuRadioGroup
              value={selectedMode.id}
              onValueChange={(modeId) => {
                if (modes.some((mode) => mode.id === modeId)) onModeChange(modeId);
              }}
            >
              {modes.map((mode) => (
                <DropdownMenuRadioItem key={mode.id} value={mode.id}>
                  {mode.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <span
          aria-hidden="true"
          className={`mx-0.5 h-5 shrink-0 self-center border-l ${surface.border}`}
        />

        <div role="tablist" aria-label={ariaLabel} className="flex gap-2">
          {items.map((item) => {
            const isActive = item.id === selectedItemId;
            const indicatorClassName =
              item.indicatorTone === 'critical'
                ? theme === 'light'
                  ? 'bg-red-600'
                  : 'bg-red-500'
                : theme === 'light'
                  ? 'bg-amber-500'
                  : 'bg-amber-400';

            return (
              <InteractivePill
                key={item.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${idPrefix}-panel-${item.id}`}
                id={`${idPrefix}-tab-${item.id}`}
                active={isActive}
                size="compact"
                intent="navigation"
                variant="ghost"
                onClick={() => onItemChange(item.id)}
                className={`shrink-0 gap-1 whitespace-nowrap rounded-[22px] border transition-colors sm:gap-2 sm:px-3.5 sm:font-medium ${getGroupingPillClassName(
                  isActive,
                  theme,
                  surface
                )}`}
              >
                {item.indicatorTone ? (
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${indicatorClassName}`}
                  />
                ) : null}
                <span>{item.label}</span>
              </InteractivePill>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { ChevronDown } from 'lucide-react';
import type { CSSProperties } from 'react';

interface TvSourceSelectorProps {
  source?: string;
  sourceList: string[];
  isSmallTvCard: boolean;
  theme: ThemeType;
  panelStyle: CSSProperties;
  tvTextTokens: {
    titleColor: string;
    subtitleColor: string;
  };
  onSelectSource: (source: string) => void;
}

export function TvSourceSelector({
  source,
  sourceList,
  isSmallTvCard,
  theme,
  panelStyle,
  tvTextTokens,
  onSelectSource,
}: TvSourceSelectorProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const sourceLabel =
    source &&
    source.trim().length > 0 &&
    source !== t('media.nothingPlaying') &&
    source !== t('media.nothingPlayingDescription')
      ? source
      : 'Source';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={`flex h-8 min-w-0 max-w-32 items-center rounded-full border backdrop-blur-xl ${
            isSmallTvCard ? 'gap-1 px-2.5' : 'gap-1.5 px-3'
          }`}
          style={panelStyle}
        >
          <span
            className="min-w-0 truncate text-xs font-medium"
            style={{ color: tvTextTokens.titleColor }}
          >
            {sourceLabel}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0" style={{ color: tvTextTokens.subtitleColor }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`min-w-44 rounded-xl border backdrop-blur-xl ${surface.border} ${surface.panel} ${surface.textPrimary}`}
        onClick={(event) => event.stopPropagation()}
      >
        {sourceList.length > 0 ? (
          sourceList.map((entry) => (
            <DropdownMenuItem key={entry} onClick={() => onSelectSource(entry)}>
              {entry}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>{sourceLabel}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

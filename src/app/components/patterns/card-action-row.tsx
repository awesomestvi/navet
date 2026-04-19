import { type LucideIcon, MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { getThemeDropdownSurfaceClasses } from '@/app/components/shared/theme/dropdown-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/components/ui/utils';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';

type CardActionRowSize = 'small' | 'default' | 'medium' | 'large';
type CardActionRowResolvedSize = 'small' | 'default';

function toControlButtonSize(size: CardActionRowResolvedSize): 'small' | 'medium' {
  return size === 'default' ? 'medium' : size;
}

interface CardActionOverflowItem {
  key: string;
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}

interface CardActionRowProps {
  theme: ThemeType;
  size?: CardActionRowSize;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  overflowItems?: CardActionOverflowItem[];
}

function resolveCardActionRowSize(size: CardActionRowSize): CardActionRowResolvedSize {
  return size === 'small' ? 'small' : 'default';
}

function getActionButtonSize(size: CardActionRowResolvedSize) {
  if (size === 'small') {
    return {
      button: 'h-8 w-8',
      icon: 'h-3 w-3',
    };
  }

  if (size === 'default') {
    return {
      button: 'h-8 w-8',
      icon: 'h-3.5 w-3.5',
    };
  }

  return {
    button: 'h-10 w-10',
    icon: 'h-3.5 w-3.5',
  };
}

export function CardActionRow({
  theme,
  size = 'default',
  leftContent,
  rightContent,
  overflowItems = [],
}: CardActionRowProps) {
  const resolvedSize = resolveCardActionRowSize(size);
  const gapClass = resolvedSize === 'small' ? 'gap-1' : 'gap-2';

  return (
    <div className={`flex items-center ${gapClass}`}>
      <div className={`flex min-w-0 flex-1 items-center ${gapClass}`}>
        {leftContent}
        {overflowItems.length > 0 ? (
          <CardActionOverflowMenu theme={theme} size={resolvedSize} items={overflowItems} />
        ) : null}
      </div>
      {rightContent}
    </div>
  );
}

function CardActionOverflowMenu({
  theme,
  size,
  items,
}: {
  theme: ThemeType;
  size: CardActionRowResolvedSize;
  items: CardActionOverflowItem[];
}) {
  const { t } = useI18n();
  const actionSize = getActionButtonSize(size);
  const buttonSize = toControlButtonSize(size);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <RoundControlButton
          theme={theme}
          size={buttonSize}
          variant="neutral"
          aria-label={t('common.moreActions')}
          className="hover:scale-105 active:scale-95"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className={actionSize.icon} />
        </RoundControlButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className={cn(getThemeDropdownSurfaceClasses(theme), 'overflow-visible p-2')}
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <DropdownMenuItem
              key={item.key}
              disabled={item.disabled}
              onClick={(event) => {
                event.stopPropagation();
                item.onSelect();
              }}
              className="rounded-xl px-3 py-2"
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

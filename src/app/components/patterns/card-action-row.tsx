import { type LucideIcon, MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { ThemeDropdownContent } from '@/app/components/primitives/theme-dropdown-content';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';

type CardActionRowSize = 'small' | 'medium' | 'large';

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

function getActionButtonSize(size: CardActionRowSize) {
  if (size === 'small') {
    return {
      button: 'h-8 w-8',
      icon: 'h-3.5 w-3.5',
    };
  }

  if (size === 'medium') {
    return {
      button: 'h-8 w-8',
      icon: 'h-3.5 w-3.5',
    };
  }

  return {
    button: 'h-10 w-10',
    icon: 'h-5 w-5',
  };
}

export function CardActionRow({
  theme,
  size = 'medium',
  leftContent,
  rightContent,
  overflowItems = [],
}: CardActionRowProps) {
  const gapClass = size === 'small' ? 'gap-1.5' : 'gap-2';

  return (
    <div className={`flex items-center ${gapClass}`}>
      <div className={`flex min-w-0 flex-1 items-center ${gapClass}`}>
        {leftContent}
        {overflowItems.length > 0 ? (
          <CardActionOverflowMenu theme={theme} size={size} items={overflowItems} />
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
  size: CardActionRowSize;
  items: CardActionOverflowItem[];
}) {
  const { t } = useI18n();
  const actionSize = getActionButtonSize(size);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <RoundControlButton
          theme={theme}
          size={size}
          variant="neutral"
          aria-label={t('common.moreActions')}
          className="hover:scale-105 active:scale-95"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className={actionSize.icon} />
        </RoundControlButton>
      </DropdownMenuTrigger>
      <ThemeDropdownContent
        theme={theme}
        align="end"
        sideOffset={10}
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
      </ThemeDropdownContent>
    </DropdownMenu>
  );
}

import {
  getPortalActionDockAnchorRect,
  PortalActionDock,
  type PortalActionDockAnchorRect,
} from '@navet/app/components/patterns/portal-action-dock';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { useAccentColor, useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { type LucideIcon, MoreHorizontal } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useState } from 'react';
import { navetSpacingTokens } from '../system/tokens';

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

export function CardActionRowGroup({ children }: { children: ReactNode }) {
  return (
    <div className={`flex min-w-0 items-center ${navetSpacingTokens.inline.xs}`}>{children}</div>
  );
}

export function CardActionRow({
  theme,
  size = 'default',
  leftContent,
  rightContent,
  overflowItems = [],
}: CardActionRowProps) {
  const resolvedSize = resolveCardActionRowSize(size);
  const gapClass = navetSpacingTokens.inline.xs;

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
  const accentColor = useAccentColor();
  const actionSize = getActionButtonSize(size);
  const buttonSize = toControlButtonSize(size);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<PortalActionDockAnchorRect | null>(null);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorRect(getPortalActionDockAnchorRect(event.currentTarget));
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setAnchorRect(null);
  };

  return (
    <>
      {isOpen ? (
        <PortalActionDock
          accentColor={accentColor}
          anchorRect={anchorRect}
          onClose={handleClose}
          theme={theme}
          title={t('common.moreActions')}
        >
          <div className="flex w-full flex-col gap-2">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={item.disabled}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-3.5 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    item.onSelect();
                    handleClose();
                  }}
                >
                  {Icon ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/78">
                      <Icon className="h-4 w-4" />
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </PortalActionDock>
      ) : null}

      <div>
        <RoundControlButton
          theme={theme}
          size={buttonSize}
          variant="neutral"
          aria-label={t('common.moreActions')}
          className="transform-none transition-[background-color,border-color,color,opacity,box-shadow] hover:scale-100 active:scale-100"
          onClick={handleOpen}
        >
          <MoreHorizontal className={actionSize.icon} />
        </RoundControlButton>
      </div>
    </>
  );
}

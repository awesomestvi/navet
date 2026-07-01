import { BaseCardDialog } from '@navet/app/components/primitives/Cards/BaseCardDialog';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetTypographyTokens } from '@navet/app/components/system/tokens';
import {
  getUiKitGlassSheetGlowClassName,
  getUiKitSheetContentClassName,
  getUiKitSheetOverlayClassName,
} from '@navet/app/components/system/tokens/ui-kit-surfaces';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

export interface SheetSurfaceProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  accentColor?: string;
  contentClassName?: string;
  overlayClassName?: string;
  bodyClassName?: string;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
}

export interface SheetSurfaceHeaderProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  className?: string;
  description?: string;
  eyebrow?: string;
  titleAccessory?: ReactNode;
  endAccessory?: ReactNode;
}

export function SheetSurfaceHeader({
  title,
  closeLabel,
  onClose,
  className,
  description,
  eyebrow,
  titleAccessory,
  endAccessory,
}: SheetSurfaceHeaderProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>{eyebrow}</p>
        ) : null}
        <div className={cn('flex min-w-0 items-center gap-2', eyebrow ? 'mt-1' : 'mt-0')}>
          <p className={`truncate ${navetTypographyTokens.titleMd} ${surface.textPrimary}`}>
            {title}
          </p>
          {titleAccessory ? <span className="shrink-0">{titleAccessory}</span> : null}
        </div>
        {description ? (
          <p className={`mt-0.5 ${navetTypographyTokens.compactHelper} ${surface.textSecondary}`}>
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {endAccessory ? <div className="shrink-0">{endAccessory}</div> : null}
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] transition-colors',
            surface.subtleBg,
            surface.hoverBg
          )}
        >
          <X className={`h-5 w-5 ${surface.textSecondary}`} />
        </button>
      </div>
    </div>
  );
}

export function SheetSurface({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  accentColor,
  contentClassName,
  overlayClassName,
  bodyClassName,
  contentStyle,
  contentGlowClassName,
}: SheetSurfaceProps) {
  const { theme } = useTheme();
  return (
    <BaseCardDialog
      variant="sheet"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      theme={theme}
      contentTitle={title}
      contentDescription={description}
      overlayClassName={overlayClassName ?? getUiKitSheetOverlayClassName(theme)}
      contentClassName={cn(getUiKitSheetContentClassName(theme), contentClassName)}
      contentGlowClassName={contentGlowClassName ?? getUiKitGlassSheetGlowClassName(theme)}
      contentStyle={contentStyle}
      accentColor={accentColor}
      bodyClassName={bodyClassName}
    >
      {children}
    </BaseCardDialog>
  );
}

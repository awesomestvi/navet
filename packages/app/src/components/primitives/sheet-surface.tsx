import { BaseCardDialog } from '@navet/app/components/primitives/Cards/BaseCardDialog';
import { coverSheetHeaderClassName } from '@navet/app/components/primitives/dialog-primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetTypographyTokens } from '@navet/app/components/system/tokens';
import {
  getUiKitGlassSheetGlowClassName,
  getUiKitGlassSurfaceFoundationStyle,
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
  closeLabel?: string;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
  /** Keep the sheet available above the mobile breakpoint for focused detail surfaces. */
  responsive?: boolean;
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
    <div
      data-sheet-surface-header
      className={cn(
        coverSheetHeaderClassName,
        'flex shrink-0 items-start justify-between gap-4 max-sm:pt-2 max-sm:pr-4',
        className
      )}
    >
      <div className="min-w-0 max-sm:pr-14">
        {eyebrow ? (
          <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>{eyebrow}</p>
        ) : null}
        <div className={cn('flex min-w-0 items-center gap-2', eyebrow ? 'mt-1' : 'mt-0')}>
          <p className={`truncate ${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
            {title}
          </p>
          {titleAccessory ? <span className="shrink-0">{titleAccessory}</span> : null}
        </div>
        {description ? (
          <p className={`-mt-0.5 ${navetTypographyTokens.label} ${surface.textSecondary}`}>
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {endAccessory ? <div className="shrink-0">{endAccessory}</div> : null}
        <button
          type="button"
          data-cover-sheet-inline-dismiss
          aria-label={closeLabel}
          onClick={onClose}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors',
            surface.border,
            surface.subtleBg,
            surface.hoverBg,
            surface.textPrimary
          )}
        >
          <X className="h-4 w-4" />
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
  closeLabel,
  contentStyle,
  contentGlowClassName,
  responsive = false,
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
      overlayClassName={cn(
        overlayClassName ?? getUiKitSheetOverlayClassName(theme),
        responsive && 'md:block'
      )}
      contentClassName={cn(
        getUiKitSheetContentClassName(theme),
        responsive &&
          'md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:mx-0 md:mb-0 md:block md:w-[min(92vw,32rem)] md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2',
        contentClassName
      )}
      contentGlowClassName={contentGlowClassName ?? getUiKitGlassSheetGlowClassName(theme)}
      contentStyle={{ ...getUiKitGlassSurfaceFoundationStyle(theme), ...contentStyle }}
      accentColor={accentColor}
      bodyClassName={bodyClassName}
      closeLabel={closeLabel}
    >
      {children}
    </BaseCardDialog>
  );
}

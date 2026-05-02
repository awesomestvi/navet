import * as Dialog from '@radix-ui/react-dialog';
import { type CSSProperties, type ReactNode, useId } from 'react';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import {
  getUiKitGlassSheetGlowClassName,
  getUiKitSheetContentClassName,
  getUiKitSheetOverlayClassName,
} from '@/app/components/system/tokens/ui-kit-surfaces';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

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
  const descriptionId = useId();

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentAriaDescribedBy={descriptionId}
      overlayClassName={overlayClassName ?? getUiKitSheetOverlayClassName(theme)}
      contentClassName={cn(getUiKitSheetContentClassName(theme), contentClassName)}
      contentGlowClassName={contentGlowClassName ?? getUiKitGlassSheetGlowClassName(theme)}
      contentStyle={{
        ...(theme === 'glass' && accentColor
          ? {
              boxShadow: `0 -24px 64px -40px ${accentColor}66, 0 24px 48px -36px rgba(0,0,0,0.72)`,
            }
          : {}),
        ...contentStyle,
      }}
    >
      <Dialog.Title className="sr-only">{title}</Dialog.Title>
      <Dialog.Description id={descriptionId} className="sr-only">
        {description}
      </Dialog.Description>
      <div
        className={cn(
          'relative pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] pt-3',
          bodyClassName
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
        {children}
      </div>
    </DialogShell>
  );
}

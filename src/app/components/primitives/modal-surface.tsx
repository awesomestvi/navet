import * as Dialog from '@radix-ui/react-dialog';
import { type CSSProperties, type ReactNode, useId } from 'react';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import {
  getUiKitModalContentClassName,
  navetUiKitRadiusTokens,
} from '@/app/components/system/tokens/ui-kit-surfaces';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface ModalSurfaceProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  bodyClassName?: string;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
  contentGlowStyle?: CSSProperties;
  contentOverlayClassName?: string | null;
  disableOpenAutoFocus?: boolean;
}

export function ModalSurface({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  contentClassName,
  overlayClassName,
  bodyClassName,
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  contentOverlayClassName,
  disableOpenAutoFocus,
}: ModalSurfaceProps) {
  const { theme } = useTheme();
  const descriptionId = useId();

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={overlayClassName ?? 'animate-in fade-in bg-black/55 backdrop-blur-sm'}
      contentAriaDescribedBy={description ? descriptionId : undefined}
      disableOpenAutoFocus={disableOpenAutoFocus}
      contentClassName={cn(getUiKitModalContentClassName(theme), contentClassName)}
      contentStyle={contentStyle}
      contentGlowClassName={contentGlowClassName}
      contentGlowStyle={contentGlowStyle}
      contentOverlayClassName={contentOverlayClassName}
    >
      <Dialog.Title className="sr-only">{title}</Dialog.Title>
      {description ? (
        <Dialog.Description id={descriptionId} className="sr-only">
          {description}
        </Dialog.Description>
      ) : null}
      <div className={cn('relative', navetUiKitRadiusTokens.dialog, bodyClassName)}>{children}</div>
    </DialogShell>
  );
}

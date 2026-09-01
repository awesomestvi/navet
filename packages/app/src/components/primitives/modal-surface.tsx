import { BaseCardDialog } from '@navet/app/components/primitives/Cards/BaseCardDialog';
import {
  getUiKitModalContentClassName,
  navetUiKitRadiusTokens,
} from '@navet/app/components/system/tokens/ui-kit-surfaces';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import type { CSSProperties, ReactNode } from 'react';

export interface ModalSurfaceProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  bodyClassName?: string;
  shellBodyClassName?: string;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
  contentGlowStyle?: CSSProperties;
  contentOverlayClassName?: string | null;
  disableOpenAutoFocus?: boolean;
  mobileCoverSheet?: boolean;
  mobileCoverSheetActions?: ReactNode;
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
  shellBodyClassName,
  contentStyle,
  contentGlowClassName,
  contentGlowStyle,
  contentOverlayClassName,
  disableOpenAutoFocus,
  mobileCoverSheet = false,
  mobileCoverSheetActions,
}: ModalSurfaceProps) {
  const { theme } = useTheme();

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      theme={theme}
      overlayClassName={overlayClassName}
      disableOpenAutoFocus={disableOpenAutoFocus}
      contentClassName={cn(getUiKitModalContentClassName(theme), contentClassName)}
      contentStyle={contentStyle}
      contentGlowClassName={contentGlowClassName}
      contentGlowStyle={contentGlowStyle}
      contentOverlayClassName={contentOverlayClassName}
      shellBodyClassName={shellBodyClassName}
      bodyClassName={shellBodyClassName}
      bodyPadding={false}
      mobileCoverSheet={mobileCoverSheet}
      persistentMobileDismiss={mobileCoverSheet}
      mobileCoverSheetActions={mobileCoverSheetActions}
    >
      <div className={cn('relative', navetUiKitRadiusTokens.dialog, bodyClassName)}>{children}</div>
    </BaseCardDialog>
  );
}

import { SheetSurface, SheetSurfaceHeader } from '@navet/app/ui-kit/primitives';
import type { ReactNode, RefObject } from 'react';

export interface DetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  responsive?: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export function DetailSheet({
  isOpen,
  onOpenChange,
  title,
  closeLabel,
  children,
  responsive = false,
  returnFocusRef,
}: DetailSheetProps) {
  return (
    <SheetSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      closeLabel={closeLabel}
      responsive={responsive}
      onCloseAutoFocus={(event) => {
        if (returnFocusRef.current?.isConnected) {
          event.preventDefault();
          returnFocusRef.current.focus();
        }
      }}
    >
      <SheetSurfaceHeader
        title={title}
        closeLabel={closeLabel}
        onClose={() => onOpenChange(false)}
      />
      <div className="px-4 pb-4">{children}</div>
    </SheetSurface>
  );
}

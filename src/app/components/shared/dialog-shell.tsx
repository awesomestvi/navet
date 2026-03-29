import * as Dialog from '@radix-ui/react-dialog';
import type { CSSProperties, ReactNode } from 'react';

interface DialogShellProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  overlayClassName: string;
  contentClassName: string;
  contentStyle?: CSSProperties;
  children: ReactNode;
}

export function DialogShell({
  isOpen,
  onOpenChange,
  overlayClassName,
  contentClassName,
  contentStyle,
  children,
}: DialogShellProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 z-50 ${overlayClassName}`} />
        <Dialog.Content className={contentClassName} style={contentStyle}>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

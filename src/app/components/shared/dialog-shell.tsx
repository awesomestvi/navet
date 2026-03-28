import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

interface DialogShellProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  overlayClassName: string;
  contentClassName: string;
  children: ReactNode;
}

export function DialogShell({
  isOpen,
  onOpenChange,
  overlayClassName,
  contentClassName,
  children,
}: DialogShellProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={`fixed inset-0 z-50 ${overlayClassName}`} />
        <Dialog.Content className={contentClassName}>{children}</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

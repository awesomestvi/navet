import { useTheme } from '@navet/app/hooks';
import { CardDialogFooter, CardDialogHeader } from '@navet/app/ui-kit/patterns';
import { BaseCardDialog, Button } from '@navet/app/ui-kit/primitives';
import type { ReactNode, RefObject } from 'react';

export interface SettingsDialogProps {
  isOpen: boolean;
  title: string;
  saveLabel: string;
  cancelLabel: string;
  pending: boolean;
  canSave: boolean;
  children: ReactNode;
  onSave: () => void;
  onRequestClose: (reason: 'dismiss' | 'cancel') => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

// The feature decides whether a dismissal is accepted, including dirty and pending state.
export function SettingsDialog({
  isOpen,
  title,
  saveLabel,
  cancelLabel,
  pending,
  canSave,
  children,
  onSave,
  onRequestClose,
  returnFocusRef,
}: SettingsDialogProps) {
  const { theme } = useTheme();
  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      title={title}
      theme={theme}
      titleInContent
      height="capped"
      contentClassName="flex flex-col"
      shellBodyClassName="min-h-0 overflow-y-auto overscroll-contain"
      mobileCoverSheet
      persistentMobileDismiss
      onOpenChange={(open) => {
        if (!open) onRequestClose('dismiss');
      }}
      onCloseAutoFocus={(event) => {
        if (returnFocusRef.current?.isConnected) {
          event.preventDefault();
          returnFocusRef.current.focus();
        }
      }}
    >
      <CardDialogHeader
        title={title}
        theme={theme}
        editableTitle={false}
        showRoomSelector={false}
      />
      <form
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave && !pending) onSave();
        }}
      >
        <fieldset disabled={pending} className="min-w-0">
          {children}
        </fieldset>
        <CardDialogFooter>
          <Button
            type="button"
            variant="soft"
            disabled={pending}
            onClick={() => onRequestClose('cancel')}
          >
            {cancelLabel}
          </Button>
          <Button type="submit" disabled={!canSave || pending}>
            {saveLabel}
          </Button>
        </CardDialogFooter>
      </form>
    </BaseCardDialog>
  );
}

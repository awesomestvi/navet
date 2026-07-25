import { FieldBlock } from '@navet/app/components/patterns';
import { Button, Input } from '@navet/app/components/primitives';
import { useId } from 'react';
import { RoomOperationDialogFrame } from './room-operation-dialog-frame';

export interface RoomNameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  nameLabel: string;
  namePlaceholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  validationMessage?: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function RoomNameDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  nameLabel,
  namePlaceholder,
  value,
  onValueChange,
  validationMessage,
  cancelLabel,
  confirmLabel,
  onConfirm,
  isConfirming = false,
}: RoomNameDialogProps) {
  const inputId = useId();
  const validationId = `${inputId}-validation`;
  const isConfirmDisabled = isConfirming || value.trim().length === 0 || Boolean(validationMessage);

  return (
    <RoomOperationDialogFrame
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onSubmit={() => {
        if (!isConfirmDisabled) {
          onConfirm();
        }
      }}
      footer={
        <>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            className="min-h-11"
            loading={isConfirming}
            disabled={isConfirmDisabled}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <FieldBlock
        label={nameLabel}
        htmlFor={inputId}
        error={
          validationMessage ? (
            <span id={validationId} role="alert">
              {validationMessage}
            </span>
          ) : undefined
        }
      >
        <Input
          id={inputId}
          name="room-name"
          autoComplete="off"
          value={value}
          placeholder={namePlaceholder}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          invalid={Boolean(validationMessage)}
          aria-describedby={validationMessage ? validationId : undefined}
          inputClassName="min-h-11"
          maxLength={120}
        />
      </FieldBlock>
    </RoomOperationDialogFrame>
  );
}

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';

interface DialogHeaderProps {
  title: string;
  description?: string;
  isOn: boolean;
  trailing?: ReactNode;
  supportingContent?: ReactNode;
  supportingContentClassName?: string;
}

export const DialogHeader = memo(function DialogHeader({
  title,
  description,
  isOn,
  trailing,
  supportingContent,
  supportingContentClassName = '',
}: DialogHeaderProps) {
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Dialog.Title
          className={`truncate text-xl font-semibold transition-colors duration-500 ${editorSurface.titleClassName}`}
        >
          {title}
        </Dialog.Title>
        {description ? (
          <Dialog.Description
            className={`mt-1 truncate text-sm transition-colors duration-500 ${editorSurface.descriptionClassName}`}
          >
            {description}
          </Dialog.Description>
        ) : null}
        {supportingContent ? (
          <div className={`mt-2 min-w-0 ${supportingContentClassName}`}>{supportingContent}</div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {trailing}

        <Dialog.Close asChild>
          <button
            type="button"
            className={`rounded-lg p-2 transition-all duration-300 ${editorSurface.closeButtonClassName}`}
          >
            <X
              className={`h-5 w-5 transition-colors duration-500 ${editorSurface.closeIconClassName}`}
            />
          </button>
        </Dialog.Close>
      </div>
    </div>
  );
});

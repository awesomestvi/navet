import { memo, type ReactNode } from 'react';
import { CardDialogHeader } from '@/app/components/patterns';

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
  return (
    <CardDialogHeader
      title={title}
      description={description}
      showRoomSelector={false}
      trailing={trailing}
      supportingContent={
        supportingContent ? (
          <div className={supportingContentClassName}>{supportingContent}</div>
        ) : null
      }
      className={isOn ? undefined : 'text-slate-900'}
    />
  );
});

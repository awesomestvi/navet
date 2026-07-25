import { BaseCardDialog } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import type { FormEvent, ReactNode } from 'react';

interface RoomOperationDialogFrameProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: () => void;
  maxWidth?: 'sm' | 'md' | 'lg';
  contentClassName?: string;
}

export function RoomOperationDialogFrame({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  onSubmit,
  maxWidth = 'sm',
  contentClassName,
}: RoomOperationDialogFrameProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      theme={theme}
      maxWidth={maxWidth}
      height="capped"
      bodyPadding={false}
      contentClassName={contentClassName}
    >
      <form onSubmit={handleSubmit} className="flex max-h-[min(85dvh,46rem)] min-h-0 flex-col">
        <header className={cn('border-b px-5 py-5 max-sm:px-4 max-sm:py-4', surface.border)}>
          <h2 className={cn(navetTypographyTokens.featureHeading, surface.textPrimary)}>{title}</h2>
          {description ? (
            <p className={cn('mt-1.5', navetTypographyTokens.body, surface.textSecondary)}>
              {description}
            </p>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 max-sm:px-4 max-sm:py-4">
          {children}
        </div>

        <footer
          className={cn(
            'flex shrink-0 flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end',
            'max-sm:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]',
            surface.border
          )}
        >
          {footer}
        </footer>
      </form>
    </BaseCardDialog>
  );
}

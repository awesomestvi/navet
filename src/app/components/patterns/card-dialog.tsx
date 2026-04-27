import * as Dialog from '@radix-ui/react-dialog';
import { type LucideIcon, X } from 'lucide-react';
import { type CSSProperties, memo, type ReactNode } from 'react';
import { Button, InteractivePill } from '@/app/components/primitives';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useI18n } from '@/app/hooks';

interface CardDialogHeaderProps {
  title: string;
  description?: string;
  entityId?: string;
  eyebrow?: ReactNode;
  showRoomSelector?: boolean;
  forceDarkRoomSelector?: boolean;
  trailing?: ReactNode;
  supportingContent?: ReactNode;
  className?: string;
}

interface CardDialogSectionProps {
  children: ReactNode;
  className?: string;
  helperText?: string;
  helperTextClassName?: string;
  label?: string;
  labelClassName?: string;
}

interface CardDialogTabTriggerProps {
  active: boolean;
  children: ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

interface CardDialogChoicePillProps {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}

interface CardDialogDoneFooterProps {
  label: string;
  className?: string;
}

export const CardDialogHeader = memo(function CardDialogHeader({
  title,
  description,
  entityId,
  eyebrow,
  showRoomSelector = true,
  forceDarkRoomSelector = true,
  trailing,
  supportingContent,
  className,
}: CardDialogHeaderProps) {
  const { t } = useI18n();

  return (
    <div className={cn('mb-5 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ??
          (showRoomSelector && entityId ? (
            <EntityRoomSelector entityId={entityId} compact forceDark={forceDarkRoomSelector} />
          ) : null)}
        <Dialog.Title
          className={cn(
            'text-xl font-semibold text-white',
            eyebrow || (showRoomSelector && entityId) ? 'mt-1' : undefined
          )}
        >
          {title}
        </Dialog.Title>
        {description ? (
          <Dialog.Description
            className={cn('mt-1 truncate', navetTypographyTokens.body, 'text-white/82')}
          >
            {description}
          </Dialog.Description>
        ) : null}
        {supportingContent ? <div className="mt-2 min-w-0">{supportingContent}</div> : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        <Dialog.Close asChild>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-white/12 bg-white/8 p-2 text-white/82 transition-colors hover:bg-white/12 hover:text-white"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </Dialog.Close>
      </div>
    </div>
  );
});

export const CardDialogSection = memo(function CardDialogSection({
  children,
  className,
  helperText,
  helperTextClassName,
  label,
  labelClassName,
}: CardDialogSectionProps) {
  return (
    <div className={cn('mb-6 min-w-0 last:mb-0', className)}>
      {label ? (
        <div className={cn('mb-1 text-sm font-medium text-white', labelClassName)}>{label}</div>
      ) : null}
      {helperText ? (
        <p className={cn('mb-3', navetTypographyTokens.body, 'text-white/82', helperTextClassName)}>
          {helperText}
        </p>
      ) : null}
      {children}
    </div>
  );
});

export function CardDialogTabList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('mt-1 inline-flex items-center gap-1', className)}>{children}</div>;
}

export const CardDialogTabTrigger = memo(function CardDialogTabTrigger({
  active,
  children,
  icon,
  onClick,
  className,
}: CardDialogTabTriggerProps) {
  return (
    <InteractivePill
      active={active}
      size="compact"
      className={cn('text-xs', className)}
      icon={icon}
      onClick={onClick}
    >
      {children}
    </InteractivePill>
  );
});

export const CardDialogChoicePill = memo(function CardDialogChoicePill({
  active = false,
  children,
  className,
  onClick,
  style,
}: CardDialogChoicePillProps) {
  return (
    <InteractivePill
      active={active}
      onClick={onClick}
      className={cn('min-w-22', className)}
      style={style}
    >
      {children}
    </InteractivePill>
  );
});

export function CardDialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('mt-6 flex justify-end', className)}>{children}</div>;
}

export function CardDialogDoneFooter({ label, className }: CardDialogDoneFooterProps) {
  return (
    <CardDialogFooter>
      <Dialog.Close asChild>
        <Button variant="soft" size="small" className={className}>
          {label}
        </Button>
      </Dialog.Close>
    </CardDialogFooter>
  );
}

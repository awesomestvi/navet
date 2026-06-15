import { Button, Input, InteractivePill } from '@navet/app/components/primitives';
import { EntityRoomSelector } from '@navet/app/components/shared/entity-room-selector';
import { navetTypographyTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useIntegrationStore } from '@navet/app/hooks';
import { integrationAdminService } from '@navet/app/services/integration-admin.service';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { getProviderEntityTypeLabel } from '@navet/app/utils/provider-entity-label';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, type LucideIcon, X } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  memo,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

interface CardDialogHeaderProps {
  title: string;
  description?: string;
  entityId?: string;
  eyebrow?: ReactNode;
  showRoomSelector?: boolean;
  forceDarkRoomSelector?: boolean;
  roomSelectorFallbackRoomName?: string;
  roomSelectorCompactContentStyle?: CSSProperties;
  editableTitle?: boolean;
  onTitleChange?: (title: string) => void | Promise<void>;
  trailing?: ReactNode;
  supportingContent?: ReactNode;
  className?: string;
  titleStyle?: CSSProperties;
  descriptionStyle?: CSSProperties;
  actionButtonStyle?: CSSProperties;
}

interface CardDialogSectionProps {
  children: ReactNode;
  className?: string;
  helperText?: string;
  helperTextClassName?: string;
  label?: string;
  labelClassName?: string;
}

interface CardDialogBodyProps {
  children: ReactNode;
  className?: string;
}

interface CardDialogTabTriggerProps {
  active: boolean;
  children: ReactNode;
  accentColor?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

interface CardDialogChoicePillProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  size?: 'default' | 'small' | 'compact';
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
  roomSelectorFallbackRoomName,
  roomSelectorCompactContentStyle,
  editableTitle = true,
  onTitleChange,
  trailing,
  supportingContent,
  className,
  titleStyle,
  descriptionStyle,
  actionButtonStyle,
}: CardDialogHeaderProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(title);
  const [draftTitle, setDraftTitle] = useState(title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const canEditTitle = Boolean(editableTitle && (entityId || onTitleChange));
  const providerSessions = useIntegrationStore(integrationSelectors.providerSessions);
  const connectedProviderCount = Object.keys(providerSessions).length;
  const resolvedDescription =
    getProviderEntityTypeLabel(entityId, description, connectedProviderCount > 1) ?? description;
  const roomSelector =
    showRoomSelector && entityId ? (
      <EntityRoomSelector
        entityId={entityId}
        compact
        forceDark={forceDarkRoomSelector}
        fallbackRoomName={roomSelectorFallbackRoomName}
        compactContentStyle={roomSelectorCompactContentStyle}
        className="shrink-0"
      />
    ) : null;
  const editLabel = t('entityNameEditor.edit', { name: '' }).trim();

  useEffect(() => {
    setDisplayTitle(title);
  }, [title]);

  useEffect(() => {
    if (!isEditingTitle) {
      setDraftTitle(displayTitle);
    }
  }, [displayTitle, isEditingTitle]);

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus();
      const titleLength = inputRef.current?.value.length ?? 0;
      inputRef.current?.setSelectionRange(titleLength, titleLength);
    }
  }, [isEditingTitle]);

  const cancelTitleEdit = () => {
    setDraftTitle(displayTitle);
    setIsEditingTitle(false);
  };

  const saveTitleEdit = async () => {
    if (!entityId && !onTitleChange) {
      return;
    }

    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      toast.error(t('entityNameEditor.empty'));
      return;
    }

    if (nextTitle === displayTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    try {
      if (onTitleChange) {
        await onTitleChange(nextTitle);
      } else if (entityId) {
        await integrationAdminService.updateEntityName(entityId, nextTitle);
      }
      setDisplayTitle(nextTitle);
      if (entityId && !onTitleChange) {
        toast.success(t('entityNameEditor.saved', { name: nextTitle }));
      }
      setIsEditingTitle(false);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : t('entityNameEditor.failed');
      toast.error(message);
    } finally {
      setIsSavingTitle(false);
    }
  };

  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow}
        <div
          className={cn(
            'flex min-w-0 items-center',
            isEditingTitle ? 'gap-4' : 'gap-2',
            eyebrow ? 'mt-1' : undefined
          )}
        >
          <Dialog.Title asChild>
            <div
              className={cn(
                navetTypographyTokens.titleMd,
                'min-w-0 text-white',
                isEditingTitle ? 'flex-1' : 'truncate'
              )}
              style={titleStyle}
            >
              {isEditingTitle ? (
                <Input
                  ref={inputRef}
                  aria-label={t('entityNameEditor.inputLabel')}
                  value={draftTitle}
                  disabled={isSavingTitle}
                  size="small"
                  variant="soft"
                  containerClassName="min-w-0"
                  inputClassName="h-9 bg-white/10 text-base font-semibold text-white placeholder:text-white/45"
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void saveTitleEdit();
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelTitleEdit();
                    }
                  }}
                />
              ) : (
                displayTitle
              )}
            </div>
          </Dialog.Title>
          {canEditTitle ? (
            isEditingTitle ? (
              <div className="flex shrink-0 items-center gap-2.5">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/82 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('entityNameEditor.save')}
                  disabled={isSavingTitle}
                  onClick={() => void saveTitleEdit()}
                  style={actionButtonStyle}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/82 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('common.cancel')}
                  disabled={isSavingTitle}
                  onClick={cancelTitleEdit}
                  style={actionButtonStyle}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null
          ) : null}
        </div>
        {resolvedDescription || (canEditTitle && !isEditingTitle) ? (
          <Dialog.Description asChild>
            <div
              className={cn(
                '-mt-0.5 flex min-w-0 items-center gap-1.5',
                navetTypographyTokens.compactHelper,
                'text-white/82'
              )}
              style={descriptionStyle}
            >
              {resolvedDescription ? <span className="truncate">{resolvedDescription}</span> : null}
              {canEditTitle && !isEditingTitle ? (
                <>
                  {resolvedDescription ? (
                    <span aria-hidden="true" className="text-white/40">
                      •
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="shrink-0 text-inherit [font:inherit] transition-colors hover:text-white"
                    aria-label={t('entityNameEditor.edit', { name: displayTitle })}
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {editLabel}
                  </button>
                </>
              ) : null}
            </div>
          </Dialog.Description>
        ) : null}
        {supportingContent ? <div className="mt-2 min-w-0">{supportingContent}</div> : null}
      </div>

      <div
        className={cn(
          'flex shrink-0 items-center gap-2',
          isEditingTitle ? 'max-sm:hidden' : undefined
        )}
      >
        {!eyebrow ? roomSelector : null}
        {trailing}
        <Dialog.Close asChild>
          <button
            type="button"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/82 transition-colors hover:bg-white/12 hover:text-white"
            aria-label={t('common.close')}
            style={actionButtonStyle}
          >
            <X className="h-4 w-4" />
          </button>
        </Dialog.Close>
      </div>
    </div>
  );
});

export function CardDialogBody({ children, className }: CardDialogBodyProps) {
  return (
    <div className={cn('w-full min-w-0 p-6 max-sm:px-3.5 max-sm:pt-2 max-sm:pb-3', className)}>
      {children}
    </div>
  );
}

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
        <p
          className={cn('mb-3', navetTypographyTokens.helper, 'text-white/82', helperTextClassName)}
        >
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
  accentColor,
  icon,
  onClick,
  className,
  style,
}: CardDialogTabTriggerProps) {
  return (
    <InteractivePill
      active={active}
      accentColor={accentColor}
      size="compact"
      className={cn('text-xs', className)}
      icon={icon}
      onClick={onClick}
      style={style}
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
  size = 'default',
  style,
  ...props
}: CardDialogChoicePillProps) {
  return (
    <InteractivePill
      active={active}
      onClick={onClick}
      className={cn('min-w-22', className)}
      size={size}
      style={style}
      {...props}
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
  return (
    <div
      className={cn(
        'mt-6 flex justify-end max-sm:pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]',
        className
      )}
    >
      {children}
    </div>
  );
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

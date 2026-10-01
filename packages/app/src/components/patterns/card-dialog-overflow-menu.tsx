import { Button } from '@navet/app/components/primitives/button';
import type { BaseCardDialogTab } from '@navet/app/components/primitives/Cards/BaseCardDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { getProviderNativeId } from '@navet/app/utils/provider-ids';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useRef } from 'react';

/** Secondary card-dialog destinations, identity editing, and contextual removal. */
export function CardDialogOverflowMenu({
  theme,
  sections,
  onSectionChange,
  onEditName,
  entityId,
  onRemoveCard,
  removeCardLabel,
}: {
  theme: ThemeType;
  sections: Pick<BaseCardDialogTab, 'key' | 'label' | 'icon'>[];
  onSectionChange: (key: string) => void;
  onEditName?: () => void;
  entityId?: string;
  onRemoveCard?: () => void;
  removeCardLabel?: string;
}) {
  const { t } = useI18n();
  const editAfterClose = useRef(false);
  const separatorClassName = theme === 'light' ? undefined : 'bg-white/12';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          iconOnly
          variant="soft"
          label={t('common.moreActions')}
          className="pointer-events-auto h-10 w-10 rounded-full"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`w-56 ${theme === 'light' ? 'shadow-xl' : 'border-white/20 bg-zinc-800 bg-none shadow-xl'}`}
        onCloseAutoFocus={(event) => {
          if (editAfterClose.current) {
            event.preventDefault();
            editAfterClose.current = false;
            onEditName?.();
          }
        }}
      >
        {sections
          .filter((section) => section.key === 'room')
          .map(({ key, label, icon: Icon }) => (
            <DropdownMenuItem key={key} onSelect={() => onSectionChange(key)}>
              <Icon className="h-4 w-4" />
              {label}
            </DropdownMenuItem>
          ))}
        {onEditName && (
          <DropdownMenuItem
            onSelect={() => {
              editAfterClose.current = true;
            }}
          >
            <Pencil className="h-4 w-4" />
            {t('entityNameEditor.editCardName')}
          </DropdownMenuItem>
        )}
        {sections
          .filter((section) => section.key !== 'room')
          .map(({ key, label, icon: Icon }) => (
            <DropdownMenuItem key={key} onSelect={() => onSectionChange(key)}>
              <Icon className="h-4 w-4" />
              {label}
            </DropdownMenuItem>
          ))}
        {onRemoveCard && (
          <>
            <DropdownMenuSeparator className={separatorClassName} />
            <DropdownMenuItem variant="destructive" onSelect={onRemoveCard}>
              <Trash2 className="h-4 w-4" />
              {removeCardLabel ?? t('dashboard.roomsWorkspace.hideDevice')}
            </DropdownMenuItem>
          </>
        )}
        {entityId && (
          <>
            <DropdownMenuSeparator className={separatorClassName} />
            <DropdownMenuLabel className="space-y-1 font-normal">
              <span className="block text-xs text-muted-foreground">{t('common.entityId')}</span>
              <code className="block select-text break-all text-xs">
                {getProviderNativeId(entityId)}
              </code>
            </DropdownMenuLabel>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

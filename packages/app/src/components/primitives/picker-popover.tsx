import { getThemeDropdownSurfaceClasses } from '@navet/app/components/shared/theme/dropdown-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import * as Popover from '@radix-ui/react-popover';
import { type ReactNode, useEffect, useState } from 'react';

export function PickerPopover({
  trigger,
  children,
  label,
  disabled = false,
  onClose,
  wide = false,
}: {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClose?: () => void;
  wide?: boolean;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  return (
    <Popover.Root
      open={open && !disabled}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClose?.();
      }}
    >
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={label}
          align="start"
          sideOffset={10}
          collisionPadding={12}
          className={`${getThemeDropdownSurfaceClasses(theme)} z-[120] ${wide ? 'w-80' : 'w-64'} max-w-[calc(100vw-24px)] p-4 shadow-xl ${theme === 'glass' ? 'bg-slate-950/95' : ''}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronLeftIcon, CircleIcon } from 'lucide-react';
import type * as React from 'react';
import type { CSSProperties } from 'react';

import { getThemeDropdownSurfaceClasses } from '@/app/components/shared/theme/dropdown-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks';
import { useTheme } from '@/app/hooks';

import { cn } from './utils';

function getDropdownItemTone(theme: ThemeType, accentColor: string): CSSProperties {
  return {
    '--dropdown-menu-item-bg':
      theme === 'light'
        ? `${accentColor}14`
        : theme === 'glass'
          ? `${accentColor}1a`
          : `${accentColor}20`,
    '--dropdown-menu-item-border':
      theme === 'light'
        ? `${accentColor}33`
        : theme === 'glass'
          ? `${accentColor}40`
          : `${accentColor}4d`,
  } as CSSProperties;
}

function getDropdownSeparatorClassName(theme: ThemeType) {
  if (theme === 'light') {
    return 'bg-gray-200/90';
  }

  if (theme === 'glass') {
    return 'bg-white/12';
  }

  if (theme === 'black') {
    return 'bg-white/10';
  }

  return 'bg-zinc-800';
}

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const { theme } = useTheme();

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto p-1.5',
          getThemeDropdownSurfaceClasses(theme),
          theme === 'light' || theme === 'glass' ? 'backdrop-blur-xl' : 'shadow-md',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm outline-hidden transition-[background-color,border-color,color,opacity] select-none',
        surface.textPrimary,
        'data-[highlighted]:bg-[var(--dropdown-menu-item-bg)] data-[highlighted]:border-[var(--dropdown-menu-item-border)] data-[highlighted]:text-current focus:bg-[var(--dropdown-menu-item-bg)] focus:border-[var(--dropdown-menu-item-border)] focus:text-current',
        'data-[variant=destructive]:text-red-300 data-[variant=destructive]:data-[highlighted]:bg-red-500/12 data-[variant=destructive]:data-[highlighted]:border-red-400/25 data-[variant=destructive]:focus:bg-red-500/12 data-[variant=destructive]:focus:border-red-400/25 data-[variant=destructive]:focus:text-red-200',
        'data-[variant=destructive]:*:[svg]:!text-current/80',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-9',
        "[&_svg:not([class*='text-'])]:text-current/72 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      style={{ ...getDropdownItemTone(theme, accentColor), ...style }}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-xl border border-transparent py-2 pr-3 pl-9 text-sm outline-hidden transition-[background-color,border-color,color,opacity] select-none',
        surface.textPrimary,
        'data-[highlighted]:bg-[var(--dropdown-menu-item-bg)] data-[highlighted]:border-[var(--dropdown-menu-item-border)] data-[highlighted]:text-current focus:bg-[var(--dropdown-menu-item-bg)] focus:border-[var(--dropdown-menu-item-border)] focus:text-current',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        "[&_svg:not([class*='text-'])]:text-current/72 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      style={{ ...getDropdownItemTone(theme, accentColor), ...style }}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-xl border border-transparent py-2 pr-3 pl-9 text-sm outline-hidden transition-[background-color,border-color,color,opacity] select-none',
        surface.textPrimary,
        'data-[highlighted]:bg-[var(--dropdown-menu-item-bg)] data-[highlighted]:border-[var(--dropdown-menu-item-border)] data-[highlighted]:text-current focus:bg-[var(--dropdown-menu-item-bg)] focus:border-[var(--dropdown-menu-item-border)] focus:text-current',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        "[&_svg:not([class*='text-'])]:text-current/72 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      style={{ ...getDropdownItemTone(theme, accentColor), ...style }}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'px-3 py-2 text-sm font-medium data-[inset]:pl-9',
        surface.textSecondary,
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  const { theme } = useTheme();

  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-0.5 my-1 h-px', getDropdownSeparatorClassName(theme), className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('ml-auto text-xs tracking-widest', surface.textMuted, className)}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        'flex cursor-default items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm outline-hidden transition-[background-color,border-color,color] select-none',
        surface.textPrimary,
        'data-[state=open]:bg-[var(--dropdown-menu-item-bg)] data-[state=open]:border-[var(--dropdown-menu-item-border)] data-[state=open]:text-current',
        'focus:bg-[var(--dropdown-menu-item-bg)] focus:border-[var(--dropdown-menu-item-border)] focus:text-current data-[inset]:pl-9',
        className
      )}
      style={{ ...getDropdownItemTone(theme, accentColor), ...style }}
      {...props}
    >
      <ChevronLeftIcon className="size-4" />
      <span className="min-w-0 flex-1">{children}</span>
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  const { theme } = useTheme();

  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden p-1.5',
        getThemeDropdownSurfaceClasses(theme),
        theme === 'light' || theme === 'glass' ? 'backdrop-blur-xl' : 'shadow-md',
        className
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};

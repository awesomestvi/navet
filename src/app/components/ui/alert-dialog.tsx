'use client';

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as React from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { cn } from './utils';

function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

const AlertDialogTrigger = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Trigger>
>(function AlertDialogTrigger({ ...props }, ref) {
  return <AlertDialogPrimitive.Trigger ref={ref} data-slot="alert-dialog-trigger" {...props} />;
});

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function AlertDialogOverlay({ className, ...props }, ref) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      data-slot="alert-dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50',
        surface.dialogBackdrop,
        className
      )}
      {...props}
    />
  );
});

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className, ...props }, ref) {
  const { theme, primaryColor } = useTheme();
  const accentColor = getThemeColorValue(primaryColor);
  const surface = getThemeSurfaceTokens(theme);
  const surfaceClass = `${surface.borderStrong} ${surface.textPrimary}`;
  const background =
    theme === 'light'
      ? `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.92) 72%, ${accentColor}10 100%)`
      : theme === 'contrast'
        ? `linear-gradient(180deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.98) 72%, ${accentColor}18 100%)`
        : theme === 'glass'
          ? `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 72%, ${accentColor}1A 100%)`
          : `linear-gradient(180deg, rgba(18,18,20,0.96) 0%, rgba(12,12,14,0.94) 72%, ${accentColor}14 100%)`;

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        data-slot="alert-dialog-content"
        className={cn(
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-5 rounded-[32px] border p-6 shadow-2xl backdrop-blur-xl duration-200 sm:max-w-lg sm:p-8',
          surfaceClass,
          className
        )}
        style={{ background }}
        {...props}
      />
    </AlertDialogPortal>
  );
});

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn('flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      data-slot="alert-dialog-title"
      className={cn('text-xl font-semibold tracking-tight', className)}
      {...props}
    />
  );
});

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(function AlertDialogDescription({ className, ...props }, ref) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      data-slot="alert-dialog-description"
      className={cn('text-sm leading-relaxed', surface.textSecondary, className)}
      {...props}
    />
  );
});

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(function AlertDialogAction({ className, ...props }, ref) {
  const { primaryColor } = useTheme();
  const accentColor = getThemeColorValue(primaryColor);
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-full border-0 px-5 text-sm font-medium text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className
      )}
      style={{ backgroundColor: accentColor }}
      {...props}
    />
  );
});

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(function AlertDialogCancel({ className, ...props }, ref) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const cancelClass =
    theme === 'light'
      ? 'border-gray-200/80 bg-gray-100 text-gray-900 hover:bg-gray-200'
      : theme === 'contrast'
        ? 'border-white/16 bg-black text-white hover:bg-white/10'
        : theme === 'glass'
          ? 'border-white/18 bg-white/[0.08] text-white hover:bg-white/[0.14]'
          : 'border-white/10 bg-white/5 text-white hover:bg-white/10';

  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        surface.ringOffset,
        cancelClass,
        className
      )}
      {...props}
    />
  );
});

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};

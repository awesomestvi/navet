'use client';

import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as React from 'react';
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
>(function AlertDialogContent({ children, className, ...props }, ref) {
  const { theme, primaryColor } = useTheme();
  const accentColor = getThemeColorValue(primaryColor);
  const surface = getThemeSurfaceTokens(theme);
  const surfaceClass = `${surface.borderStrong} ${surface.textPrimary}`;
  const background =
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.92) 100%)'
      : theme === 'black'
        ? 'linear-gradient(180deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.98) 100%)'
        : theme === 'glass'
          ? 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.08) 100%)'
          : 'linear-gradient(180deg, rgba(18,18,20,0.96) 0%, rgba(12,12,14,0.94) 100%)';
  const glowBackground =
    theme === 'light'
      ? `radial-gradient(circle at 16% 14%, ${accentColor}1f, transparent 32%), linear-gradient(155deg, ${accentColor}14, transparent 58%)`
      : theme === 'black'
        ? `radial-gradient(circle at 14% 12%, ${accentColor}29, transparent 28%), linear-gradient(155deg, ${accentColor}0d, transparent 58%)`
        : theme === 'glass'
          ? `radial-gradient(circle at 16% 14%, ${accentColor}1f, transparent 32%), linear-gradient(155deg, ${accentColor}12, transparent 58%)`
          : `radial-gradient(circle at 16% 14%, ${accentColor}29, transparent 32%), linear-gradient(155deg, ${accentColor}14, transparent 58%)`;
  const glareBackground =
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0.12) 32%, transparent 72%)'
      : theme === 'black'
        ? 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012) 34%, transparent 68%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015) 34%, transparent 68%)';

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        data-slot="alert-dialog-content"
        className={cn(
          'fixed z-50 grid gap-5 overflow-y-auto border shadow-2xl backdrop-blur-xl duration-200 overscroll-contain sm:overflow-hidden',
          'right-0 bottom-0 left-0 max-h-[100dvh] rounded-t-[30px] rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4',
          'sm:top-[50%] sm:left-[50%] sm:right-auto sm:bottom-auto sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[32px] sm:p-8 sm:pb-8 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
          surfaceClass,
          className
        )}
        style={{ background }}
        {...props}
      >
        <div
          aria-hidden="true"
          className="relative z-10 mx-auto -mt-2 h-1 w-16 rounded-full bg-current/15 sm:hidden"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ background: glowBackground }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{ background: glareBackground }}
        />
        <div className="relative z-10 grid gap-5">{children}</div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
});

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2 text-left', className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'flex flex-nowrap items-center justify-end gap-2 pt-1 [&>*:first-child:not(:only-child)]:mr-auto',
        className
      )}
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
        'inline-flex h-10 items-center justify-center gap-2 rounded-full border-0 px-5 text-sm font-medium text-white shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
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
      : theme === 'black'
        ? 'border-white/16 bg-black text-white hover:bg-white/10'
        : theme === 'glass'
          ? 'border-white/18 bg-white/[0.08] text-white hover:bg-white/[0.14]'
          : 'border-white/10 bg-white/5 text-white hover:bg-white/10';

  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
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

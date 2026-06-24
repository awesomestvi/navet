import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { CheckCircle2, Info, LoaderCircle, OctagonAlert, X } from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function getToastSurfaceClass(theme: ReturnType<typeof useTheme>['theme']) {
  if (theme === 'light') {
    return 'bg-white';
  }

  if (theme === 'glass') {
    return 'bg-slate-950';
  }

  if (theme === 'black') {
    return 'bg-black';
  }

  return 'bg-zinc-950';
}

function getToastToneSurfaceClasses(
  theme: ReturnType<typeof useTheme>['theme'],
  tone: 'success' | 'error' | 'warning' | 'info'
) {
  if (theme === 'light') {
    switch (tone) {
      case 'success':
        return 'data-[type=success]:border-emerald-200 data-[type=success]:bg-emerald-50';
      case 'error':
        return 'data-[type=error]:border-red-200 data-[type=error]:bg-red-50';
      case 'warning':
        return 'data-[type=warning]:border-amber-200 data-[type=warning]:bg-amber-50';
      case 'info':
        return 'data-[type=info]:border-sky-200 data-[type=info]:bg-sky-50';
    }
  }

  switch (tone) {
    case 'success':
      return 'data-[type=success]:border-emerald-800 data-[type=success]:bg-emerald-950';
    case 'error':
      return 'data-[type=error]:border-red-800 data-[type=error]:bg-red-950';
    case 'warning':
      return 'data-[type=warning]:border-amber-800 data-[type=warning]:bg-amber-950';
    case 'info':
      return 'data-[type=info]:border-sky-800 data-[type=info]:bg-sky-950';
  }
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme, accentColor } = useTheme();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const surface = getThemeSurfaceTokens(theme);
  const focusRing = getThemeFocusRingClassName(theme);
  const toastSurfaceClassName = getToastSurfaceClass(theme);
  const defaultToastClassName = cn(
    'relative rounded-[24px] border px-4 py-3 pr-12 shadow-none',
    toastSurfaceClassName,
    surface.border,
    surface.cardShadow
  );
  const buttonBaseClassName = cn(
    'inline-flex min-h-9 items-center justify-center rounded-[16px] border px-3 py-2 text-sm font-medium transition-colors',
    focusRing
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewportMode = () => setIsMobileViewport(mediaQuery.matches);

    updateViewportMode();
    mediaQuery.addEventListener('change', updateViewportMode);

    return () => {
      mediaQuery.removeEventListener('change', updateViewportMode);
    };
  }, []);

  return (
    <Sonner
      theme={theme === 'light' ? 'light' : 'dark'}
      position="bottom-center"
      expand={!isMobileViewport}
      visibleToasts={isMobileViewport ? 2 : 4}
      closeButton
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <OctagonAlert className="h-4 w-4" />,
        error: <OctagonAlert className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
        close: <X className="h-4 w-4" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            defaultToastClassName,
            'group/toast flex w-full flex-wrap items-center gap-x-3 gap-y-2 overflow-hidden sm:items-start',
            getToastToneSurfaceClasses(theme, 'success'),
            getToastToneSurfaceClasses(theme, 'error'),
            getToastToneSurfaceClasses(theme, 'warning'),
            getToastToneSurfaceClasses(theme, 'info'),
            'data-[type=loading]:border-white/20'
          ),
          content:
            'order-2 flex min-w-0 flex-1 basis-0 flex-col justify-center gap-1 self-center pr-2 sm:basis-[14rem]',
          title: cn('text-sm font-semibold leading-5', surface.textPrimary),
          description: cn('text-sm leading-5', surface.textSecondary),
          icon: cn(
            'relative order-1 flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-[16px] border sm:self-start',
            surface.border,
            theme === 'light' ? 'bg-slate-100' : 'bg-zinc-900',
            surface.textPrimary,
            theme === 'light'
              ? 'group-data-[type=success]/toast:border-emerald-200 group-data-[type=success]/toast:bg-emerald-100 group-data-[type=success]/toast:text-emerald-900 group-data-[type=error]/toast:border-red-200 group-data-[type=error]/toast:bg-red-100 group-data-[type=error]/toast:text-red-900 group-data-[type=warning]/toast:border-amber-200 group-data-[type=warning]/toast:bg-amber-100 group-data-[type=warning]/toast:text-amber-900 group-data-[type=info]/toast:border-sky-200 group-data-[type=info]/toast:bg-sky-100 group-data-[type=info]/toast:text-sky-900'
              : 'group-data-[type=success]/toast:border-emerald-800 group-data-[type=success]/toast:bg-emerald-900 group-data-[type=success]/toast:text-emerald-100 group-data-[type=error]/toast:border-red-800 group-data-[type=error]/toast:bg-red-900 group-data-[type=error]/toast:text-red-100 group-data-[type=warning]/toast:border-amber-800 group-data-[type=warning]/toast:bg-amber-900 group-data-[type=warning]/toast:text-amber-100 group-data-[type=info]/toast:border-sky-800 group-data-[type=info]/toast:bg-sky-900 group-data-[type=info]/toast:text-sky-100'
          ),
          closeButton: cn(
            'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[14px] border transition-colors',
            surface.border,
            theme === 'light' ? 'bg-slate-100' : 'bg-zinc-900',
            surface.textMuted,
            surface.hoverBg,
            focusRing,
            theme === 'light'
              ? 'group-data-[type=success]/toast:border-emerald-200 group-data-[type=success]/toast:bg-emerald-100 group-data-[type=success]/toast:text-emerald-900 group-data-[type=error]/toast:border-red-200 group-data-[type=error]/toast:bg-red-100 group-data-[type=error]/toast:text-red-900 group-data-[type=warning]/toast:border-amber-200 group-data-[type=warning]/toast:bg-amber-100 group-data-[type=warning]/toast:text-amber-900 group-data-[type=info]/toast:border-sky-200 group-data-[type=info]/toast:bg-sky-100 group-data-[type=info]/toast:text-sky-900'
              : 'group-data-[type=success]/toast:border-emerald-800 group-data-[type=success]/toast:bg-emerald-900 group-data-[type=success]/toast:text-emerald-100 group-data-[type=error]/toast:border-red-800 group-data-[type=error]/toast:bg-red-900 group-data-[type=error]/toast:text-red-100 group-data-[type=warning]/toast:border-amber-800 group-data-[type=warning]/toast:bg-amber-900 group-data-[type=warning]/toast:text-amber-100 group-data-[type=info]/toast:border-sky-800 group-data-[type=info]/toast:bg-sky-900 group-data-[type=info]/toast:text-sky-100'
          ),
          actionButton: cn(
            buttonBaseClassName,
            'order-4 self-center',
            'border-transparent text-white',
            theme === 'light' ? 'bg-gray-900 hover:bg-gray-800' : 'bg-zinc-800 hover:bg-zinc-700'
          ),
          cancelButton: cn(
            buttonBaseClassName,
            'order-3 self-center',
            surface.border,
            theme === 'light' ? 'bg-slate-100' : 'bg-zinc-900',
            surface.textPrimary,
            surface.hoverBg
          ),
          success: cn(surface.textPrimary),
          error: cn(surface.textPrimary),
          warning: cn(surface.textPrimary),
          info: cn(surface.textPrimary),
          loading: cn(surface.textPrimary),
          default: cn(surface.textPrimary),
          loader: cn('text-current'),
        },
        style: {
          '--normal-bg': 'transparent',
          '--normal-border': 'transparent',
          '--normal-text': 'inherit',
          '--success-bg': 'transparent',
          '--success-border': 'transparent',
          '--error-bg': 'transparent',
          '--error-border': 'transparent',
          '--warning-bg': 'transparent',
          '--warning-border': 'transparent',
          '--info-bg': 'transparent',
          '--info-border': 'transparent',
          '--loading-bg': 'transparent',
          '--loading-border': 'transparent',
          '--toast-accent': accentColor,
        } as CSSProperties,
      }}
      offset={16}
      mobileOffset={88}
      style={
        {
          '--width': isMobileViewport ? 'calc(100vw - 1rem)' : '356px',
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

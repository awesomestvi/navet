import { CheckCircle2, Info, LoaderCircle, OctagonAlert, TriangleAlert, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const focusRing = getThemeFocusRingClassName(theme);
  const defaultToastClassName = cn(
    'relative rounded-[24px] border px-4 py-3 pr-12 backdrop-blur-xl shadow-none',
    surface.panel,
    surface.border,
    surface.cardShadow
  );
  const buttonBaseClassName = cn(
    'inline-flex min-h-9 items-center justify-center rounded-[16px] border px-3 py-2 text-sm font-medium transition-colors',
    focusRing
  );

  return (
    <Sonner
      theme={theme === 'light' ? 'light' : 'dark'}
      position="top-center"
      expand
      visibleToasts={4}
      closeButton
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonAlert className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
        close: <X className="h-4 w-4" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            defaultToastClassName,
            'group/toast flex w-full flex-wrap items-start gap-x-3 gap-y-2 overflow-hidden',
            'data-[type=success]:border-emerald-500/35 data-[type=success]:bg-emerald-500/10',
            'data-[type=error]:border-rose-500/35 data-[type=error]:bg-rose-500/10',
            'data-[type=warning]:border-amber-500/35 data-[type=warning]:bg-amber-500/10',
            'data-[type=info]:border-sky-500/35 data-[type=info]:bg-sky-500/10',
            'data-[type=loading]:border-white/20'
          ),
          content:
            'order-2 flex min-w-0 flex-1 basis-[14rem] flex-col justify-center gap-1 self-center pr-2',
          title: cn('text-sm font-semibold leading-5', surface.textPrimary),
          description: cn('text-sm leading-5', surface.textSecondary),
          icon: cn(
            'relative order-1 flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-[16px] border',
            surface.border,
            surface.iconBg,
            surface.textPrimary,
            'group-data-[type=success]/toast:border-emerald-400/25 group-data-[type=success]/toast:bg-emerald-400/14 group-data-[type=success]/toast:text-emerald-50',
            'group-data-[type=error]/toast:border-rose-400/25 group-data-[type=error]/toast:bg-rose-400/14 group-data-[type=error]/toast:text-rose-50',
            'group-data-[type=warning]/toast:border-amber-400/25 group-data-[type=warning]/toast:bg-amber-400/14 group-data-[type=warning]/toast:text-amber-50',
            'group-data-[type=info]/toast:border-sky-400/25 group-data-[type=info]/toast:bg-sky-400/14 group-data-[type=info]/toast:text-sky-50'
          ),
          closeButton: cn(
            'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[14px] border transition-colors',
            surface.border,
            surface.panelMuted,
            surface.textMuted,
            surface.hoverBg,
            focusRing,
            'group-data-[type=success]/toast:border-emerald-400/20 group-data-[type=success]/toast:bg-emerald-400/12 group-data-[type=success]/toast:text-emerald-50',
            'group-data-[type=error]/toast:border-rose-400/20 group-data-[type=error]/toast:bg-rose-400/12 group-data-[type=error]/toast:text-rose-50',
            'group-data-[type=warning]/toast:border-amber-400/20 group-data-[type=warning]/toast:bg-amber-400/12 group-data-[type=warning]/toast:text-amber-50',
            'group-data-[type=info]/toast:border-sky-400/20 group-data-[type=info]/toast:bg-sky-400/12 group-data-[type=info]/toast:text-sky-50'
          ),
          actionButton: cn(
            buttonBaseClassName,
            'order-4 self-center',
            'border-transparent text-white',
            theme === 'light' ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white/16 hover:bg-white/22'
          ),
          cancelButton: cn(
            buttonBaseClassName,
            'order-3 self-center',
            surface.border,
            surface.panelMuted,
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
      mobileOffset={16}
      {...props}
    />
  );
};

export { Toaster };

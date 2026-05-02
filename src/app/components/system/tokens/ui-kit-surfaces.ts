import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import type { ThemeType } from '@/app/hooks';

export type UiKitPanelVariant = 'default' | 'muted' | 'elevated';

export const navetUiKitRadiusTokens = {
  inset: 'rounded-[24px]',
  panel: 'rounded-[28px]',
  sheet: 'rounded-[30px]',
  dialog: 'rounded-[28px]',
  hero: 'rounded-[32px]',
} as const;

export function getUiKitPanelSurfaceClassName(
  theme: ThemeType,
  variant: UiKitPanelVariant = 'default'
) {
  const surface = getThemeSurfaceTokens(theme);

  if (variant === 'muted') {
    return cn('border', surface.border, surface.panelMuted);
  }

  if (variant === 'elevated') {
    return cn('border', surface.border, surface.panel, surface.cardShadow);
  }

  return cn('border', surface.border, surface.panel);
}

export function getUiKitModalContentClassName(theme: ThemeType) {
  const surface = getThemeSurfaceTokens(theme);

  return cn(
    'fixed left-1/2 top-1/2 z-50 w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200',
    navetUiKitRadiusTokens.dialog,
    surface.border,
    theme === 'glass' ? 'backdrop-blur-2xl' : '',
    surface.panel
  );
}

export function getUiKitSheetContentClassName(theme: ThemeType) {
  const surface = getThemeSurfaceTokens(theme);

  return cn(
    'fixed inset-x-0 bottom-0 z-50 mx-2 mb-2 overflow-hidden border p-0 shadow-2xl md:hidden',
    navetUiKitRadiusTokens.sheet,
    surface.border,
    theme === 'glass' ? 'backdrop-blur-2xl' : '',
    surface.panel
  );
}

export function getUiKitSheetOverlayClassName(theme: ThemeType) {
  const surface = getThemeSurfaceTokens(theme);
  return cn('animate-in fade-in bg-black/45 backdrop-blur-[2px] md:hidden', surface.dialogBackdrop);
}

export function getUiKitGlassSheetGlowClassName(theme: ThemeType) {
  return theme === 'glass'
    ? 'pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_42%)]'
    : undefined;
}

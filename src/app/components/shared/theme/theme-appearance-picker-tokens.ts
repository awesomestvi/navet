import type { ThemeType } from '@/app/hooks/use-theme';

export function getThemeAppearancePickerTokens(previewTheme: ThemeType, accentColor: string) {
  const isLight = previewTheme === 'light';
  const isGlass = previewTheme === 'glass';
  const isBlack = previewTheme === 'black';

  return {
    textClassName: isLight ? 'text-gray-900' : 'text-white',
    mutedClassName: isLight ? 'text-gray-600' : 'text-gray-300',
    optionCardClassName: isLight
      ? 'bg-gray-50 hover:bg-gray-100'
      : isBlack
        ? 'bg-black hover:bg-black'
        : isGlass
          ? 'bg-white/8 hover:bg-white/12'
          : 'bg-white/5 hover:bg-white/10',
    optionBorderClassName: isLight
      ? 'border-gray-200/80'
      : isBlack
        ? 'border-white/16'
        : isGlass
          ? 'border-white/16'
          : 'border-white/10',
    panelInsetClassName: isLight
      ? 'bg-gray-50/90 border-gray-200/80'
      : isBlack
        ? 'bg-black border-white/16'
        : isGlass
          ? 'bg-white/[0.06] border-white/16'
          : 'bg-white/[0.045] border-white/10',
    activeOptionStyle: {
      borderColor: `${accentColor}80`,
      backgroundColor: isBlack ? '#000000' : `${accentColor}14`,
    },
    accentRingShadow: `0 0 0 2px ${isLight ? '#ffffff' : '#111827'}, 0 0 0 4px `,
    previewBackground: isLight
      ? `linear-gradient(180deg, rgba(255,255,255,0.96), ${accentColor}10)`
      : isGlass
        ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))'
        : isBlack
          ? 'linear-gradient(180deg, rgba(0,0,0,1), rgba(0,0,0,0.985))'
          : 'linear-gradient(180deg, rgba(17,24,39,0.94), rgba(3,7,18,0.96))',
    previewCardBackground(index: number) {
      if (isLight) {
        return index === 0 ? `${accentColor}12` : 'rgba(255,255,255,0.92)';
      }

      if (isGlass) {
        return index === 0 ? `${accentColor}18` : 'rgba(255,255,255,0.06)';
      }

      if (isBlack) {
        return 'rgba(0,0,0,1)';
      }

      return index === 0 ? `${accentColor}16` : 'rgba(255,255,255,0.05)';
    },
    previewPrimaryBarColor: isLight
      ? 'rgba(203, 213, 225, 0.96)'
      : isGlass
        ? 'rgba(255,255,255,0.82)'
        : 'rgba(255,255,255,0.86)',
    previewSecondaryBarColor: isLight
      ? 'rgba(226, 232, 240, 0.95)'
      : isGlass
        ? 'rgba(255,255,255,0.32)'
        : 'rgba(255,255,255,0.26)',
  };
}

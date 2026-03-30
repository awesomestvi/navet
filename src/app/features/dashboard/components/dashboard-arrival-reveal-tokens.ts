import type { ThemeType } from '@/app/hooks/use-theme';

export function getDashboardArrivalRevealTokens(theme: ThemeType, accentColor: string) {
  const panelBackground =
    theme === 'light'
      ? 'rgba(255, 255, 255, 0.78)'
      : theme === 'contrast'
        ? 'rgba(0, 0, 0, 0.88)'
        : theme === 'glass'
          ? 'rgba(15, 23, 42, 0.48)'
          : 'rgba(10, 10, 10, 0.62)';
  const panelBackgroundBottom =
    theme === 'light'
      ? 'rgba(255,255,255,0.62)'
      : theme === 'contrast'
        ? 'rgba(0,0,0,0.94)'
        : theme === 'glass'
          ? 'rgba(15, 23, 42, 0.34)'
          : 'rgba(17, 24, 39, 0.52)';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const subtleColor =
    theme === 'light'
      ? '#4b5563'
      : theme === 'contrast'
        ? 'rgba(255,255,255,0.86)'
        : theme === 'glass'
          ? 'rgba(255,255,255,0.82)'
          : 'rgba(255,255,255,0.78)';
  const backdropColor =
    theme === 'light'
      ? 'rgba(248, 250, 252, 0.84)'
      : theme === 'contrast'
        ? 'rgba(0, 0, 0, 0.92)'
        : theme === 'glass'
          ? 'rgba(6, 10, 18, 0.72)'
          : 'rgba(3, 7, 18, 0.78)';
  const revealBorderColor =
    theme === 'light'
      ? `${accentColor}30`
      : theme === 'contrast'
        ? 'rgba(255,255,255,0.14)'
        : theme === 'glass'
          ? 'rgba(255,255,255,0.16)'
          : `${accentColor}33`;
  const revealButtonBackground =
    theme === 'light'
      ? `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
      : theme === 'contrast'
        ? `linear-gradient(135deg, ${accentColor}, ${accentColor})`
        : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`;
  const revealButtonShadow =
    theme === 'light'
      ? `0 18px 40px ${accentColor}38`
      : theme === 'contrast'
        ? '0 18px 40px rgba(0, 0, 0, 0.56)'
        : theme === 'glass'
          ? `0 18px 40px ${accentColor}44`
          : `0 18px 40px ${accentColor}55`;
  const panelShadow =
    theme === 'light'
      ? '0 24px 80px rgba(15, 23, 42, 0.16)'
      : theme === 'contrast'
        ? '0 24px 80px rgba(0, 0, 0, 0.56)'
        : theme === 'glass'
          ? '0 24px 80px rgba(5, 10, 20, 0.42)'
          : '0 24px 80px rgba(0, 0, 0, 0.38)';

  return {
    backdropColor,
    panelBackground,
    panelBackgroundBottom,
    panelShadow,
    revealBorderColor,
    revealButtonBackground,
    revealButtonShadow,
    subtleColor,
    textColor,
  };
}

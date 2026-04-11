import type { ThemeType } from '@/app/hooks/use-theme';

export function getDashboardArrivalRevealTokens(theme: ThemeType, accentColor: string) {
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const subtleColor =
    theme === 'light'
      ? '#4b5563'
      : theme === 'black'
        ? 'rgba(255,255,255,0.86)'
        : theme === 'glass'
          ? 'rgba(255,255,255,0.82)'
          : 'rgba(255,255,255,0.78)';
  const backdropColor =
    theme === 'light'
      ? '#f8fafc'
      : theme === 'black'
        ? '#000000'
        : theme === 'glass'
          ? '#060a12'
          : '#030712';
  const revealButtonBackground =
    theme === 'light'
      ? `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
      : theme === 'black'
        ? `linear-gradient(135deg, ${accentColor}, ${accentColor})`
        : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`;
  const revealButtonShadow =
    theme === 'light'
      ? `0 18px 40px ${accentColor}38`
      : theme === 'black'
        ? '0 18px 40px rgba(0, 0, 0, 0.56)'
        : theme === 'glass'
          ? `0 18px 40px ${accentColor}44`
          : `0 18px 40px ${accentColor}55`;
  return {
    backdropColor,
    revealButtonBackground,
    revealButtonShadow,
    subtleColor,
    textColor,
  };
}

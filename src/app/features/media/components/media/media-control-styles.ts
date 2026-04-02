import { getRoundControlStyles } from '@/app/components/shared/theme/round-control-styles';
import type { ThemeType } from '@/app/hooks/use-theme';

interface MediaControlStyles {
  primaryButton: string;
  secondaryButton: string;
  primaryIcon: string;
  secondaryIcon: string;
  trackBase: string;
  trackFill: string;
  trackThumb: string;
}

export function getMediaControlStyles(theme: ThemeType): MediaControlStyles {
  const roundControl = getRoundControlStyles(theme);

  if (theme === 'light') {
    return {
      primaryButton: roundControl.emphasisButton,
      secondaryButton: roundControl.defaultButton,
      primaryIcon: roundControl.emphasisIcon,
      secondaryIcon: roundControl.defaultIcon,
      trackBase: 'bg-white/28',
      trackFill: 'bg-white/88',
      trackThumb: 'bg-white',
    };
  }

  if (theme === 'glass') {
    return {
      primaryButton: roundControl.emphasisButton,
      secondaryButton: roundControl.defaultButton,
      primaryIcon: roundControl.emphasisIcon,
      secondaryIcon: roundControl.defaultIcon,
      trackBase: 'bg-white/16',
      trackFill: 'bg-white/80',
      trackThumb: 'bg-white/92',
    };
  }

  if (theme === 'black') {
    return {
      primaryButton: roundControl.emphasisButton,
      secondaryButton: roundControl.defaultButton,
      primaryIcon: roundControl.emphasisIcon,
      secondaryIcon: roundControl.defaultIcon,
      trackBase: 'bg-white/22',
      trackFill: 'bg-white',
      trackThumb: 'bg-white',
    };
  }

  return {
    primaryButton: roundControl.emphasisButton,
    secondaryButton: roundControl.defaultButton,
    primaryIcon: roundControl.emphasisIcon,
    secondaryIcon: roundControl.defaultIcon,
    trackBase: 'bg-white/24',
    trackFill: 'bg-white/86',
    trackThumb: 'bg-white',
  };
}

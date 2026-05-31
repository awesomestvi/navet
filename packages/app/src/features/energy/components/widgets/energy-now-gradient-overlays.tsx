import type { ThemeType } from '@navet/app/hooks/use-theme';

interface GradientOverlaysProps {
  theme: ThemeType;
  isSmall: boolean;
}

const GRADIENTS = {
  left: {
    light:
      'linear-gradient(90deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.14) 42%, rgba(255,255,255,0) 100%)',
    dark: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 100%)',
  },
  right: {
    light:
      'linear-gradient(270deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.14) 42%, rgba(255,255,255,0) 100%)',
    dark: 'linear-gradient(270deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 100%)',
  },
  bottom: {
    small: {
      light:
        'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 32%, rgba(248,250,252,0.48) 100%)',
      dark: 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.1) 32%, rgba(0,0,0,0.74) 100%)',
    },
    medium: {
      light:
        'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 34%, rgba(248,250,252,0.58) 100%)',
      dark: 'linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.03) 34%, rgba(0,0,0,0.64) 100%)',
    },
  },
} as const;

export function EnergyNowGradientOverlays({ theme, isSmall }: GradientOverlaysProps) {
  const isLight = theme === 'light';
  const leftGradient = isLight ? GRADIENTS.left.light : GRADIENTS.left.dark;
  const rightGradient = isLight ? GRADIENTS.right.light : GRADIENTS.right.dark;
  const bottomGradient = isLight
    ? isSmall
      ? GRADIENTS.bottom.small.light
      : GRADIENTS.bottom.medium.light
    : isSmall
      ? GRADIENTS.bottom.small.dark
      : GRADIENTS.bottom.medium.dark;

  return (
    <>
      <div
        className={`pointer-events-none absolute bottom-0 left-0 ${isSmall ? 'top-16 w-8' : 'top-20 w-10'}`}
        style={{ background: leftGradient }}
      />
      <div
        className={`pointer-events-none absolute right-0 bottom-0 ${isSmall ? 'top-16 w-8' : 'top-20 w-10'}`}
        style={{ background: rightGradient }}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 ${isSmall ? 'top-16' : 'top-20'}`}
        style={{ background: bottomGradient }}
      />
    </>
  );
}

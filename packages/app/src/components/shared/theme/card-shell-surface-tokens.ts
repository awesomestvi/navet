import type { CardSize } from '@navet/app/components/shared/card-size';
import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface CardShellSurfaceTokens {
  backdropClassName: string;
  sheenOverlayClassName: string | null;
  rootFrameClassName: string;
}

function isTallGlassCard(size?: CardSize) {
  return size === 'medium-vertical' || size === 'large' || size === 'extra-large';
}

export function getCardShellSurfaceTokens(
  theme: ThemeType,
  size?: CardSize
): CardShellSurfaceTokens {
  if (theme === 'glass') {
    const tallGlassCard = isTallGlassCard(size);

    return {
      backdropClassName: 'backdrop-blur-2xl saturate-[1.18]',
      sheenOverlayClassName: tallGlassCard
        ? 'absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.065),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.014)_12%,transparent_38%)]'
        : 'absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04)_20%,transparent_62%)]',
      rootFrameClassName: '',
    };
  }

  return {
    backdropClassName: '',
    sheenOverlayClassName: null,
    rootFrameClassName: '',
  };
}

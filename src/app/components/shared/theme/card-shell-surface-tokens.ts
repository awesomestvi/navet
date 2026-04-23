import type { ThemeType } from '@/app/hooks/use-theme';

export interface CardShellSurfaceTokens {
  backdropClassName: string;
  sheenOverlayClassName: string | null;
  rootFrameClassName: string;
}

export function getCardShellSurfaceTokens(theme: ThemeType): CardShellSurfaceTokens {
  if (theme === 'glass') {
    return {
      backdropClassName: 'backdrop-blur-2xl saturate-[1.18]',
      sheenOverlayClassName:
        'absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04)_20%,transparent_62%)]',
      rootFrameClassName: '',
    };
  }

  return {
    backdropClassName: '',
    sheenOverlayClassName: null,
    rootFrameClassName: '',
  };
}

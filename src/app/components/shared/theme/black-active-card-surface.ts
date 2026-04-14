import type { CSSProperties } from 'react';

interface BlackActiveCardSurfaceOptions {
  borderAlphaHex?: string;
  tintMidAlphaHex?: string;
  tintEndAlphaHex?: string;
  radialAlphaHex?: string;
}

export interface BlackActiveCardSurfaceTokens {
  cardStyle: CSSProperties;
  innerOverlayStyle: CSSProperties;
  shineOverlayClassName: string;
}

export function getBlackActiveCardSurfaceTokens(
  baseColor: string,
  options: BlackActiveCardSurfaceOptions = {}
): BlackActiveCardSurfaceTokens {
  const {
    borderAlphaHex = '47',
    tintMidAlphaHex = '14',
    tintEndAlphaHex = '26',
    radialAlphaHex = '30',
  } = options;

  return {
    cardStyle: {
      background: `linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, ${baseColor}${tintMidAlphaHex} 38%, ${baseColor}${tintEndAlphaHex} 100%), linear-gradient(180deg, #000000, #000000)`,
      backgroundColor: '#000000',
      borderColor: `${baseColor}${borderAlphaHex}`,
    },
    innerOverlayStyle: {
      background: `radial-gradient(circle_at_14%_0%, ${baseColor}${radialAlphaHex} 0%, transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.045), transparent 26%, rgba(0,0,0,0.08) 100%)`,
    },
    shineOverlayClassName:
      'absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_24%,transparent_62%)]',
  };
}

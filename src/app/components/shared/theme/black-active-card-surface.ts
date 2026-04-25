import type { CSSProperties } from 'react';

interface BlackActiveCardSurfaceOptions {
  borderAlphaHex?: string;
  tintStartAlphaHex?: string;
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
    tintStartAlphaHex = '20',
    tintMidAlphaHex = '2a',
    tintEndAlphaHex = '38',
    radialAlphaHex = '40',
  } = options;

  return {
    cardStyle: {
      background: `linear-gradient(135deg, ${baseColor}${tintStartAlphaHex} 0%, ${baseColor}${tintMidAlphaHex} 48%, ${baseColor}${tintEndAlphaHex} 100%), linear-gradient(180deg, #050505, #000000)`,
      backgroundColor: '#000000',
      borderColor: `${baseColor}${borderAlphaHex}`,
    },
    innerOverlayStyle: {
      background: `radial-gradient(circle_at_14%_0%, ${baseColor}${radialAlphaHex} 0%, transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.05), transparent 24%, rgba(0,0,0,0.1) 100%)`,
    },
    shineOverlayClassName:
      'absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_24%,transparent_62%)]',
  };
}

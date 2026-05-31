import { CSS, type Transform } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';

export function getDndTransformStyle(
  transform: Transform | null,
  transition?: string
): CSSProperties | undefined {
  if (!transform && !transition) {
    return undefined;
  }

  return {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
    willChange: transform ? 'transform' : undefined,
  };
}

export type CardSize =
  | 'tiny'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'medium-vertical'
  | 'large'
  | 'extra-large';

/** Tailwind class for the dashboard grid row height. Use this everywhere instead of hard-coding `auto-rows-[87px]`. */
export const CARD_GRID_ROW_CLASS = 'auto-rows-[87px]';

/**
 * Standard shell padding for card sizes that share the common dashboard card rhythm.
 * Cards with intentionally custom layouts can still opt out.
 */
export function getStandardCardPadding(size: CardSize) {
  if (size === 'tiny') {
    return 'px-3 py-2.5';
  }

  return 'p-3';
}

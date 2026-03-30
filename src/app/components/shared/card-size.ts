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

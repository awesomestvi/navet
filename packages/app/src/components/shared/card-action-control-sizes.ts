import { navetSizeTokens } from '../system/tokens/foundations';
import type { CardSize } from './card-size-selector';

export interface CardActionControlSizes {
  button: string;
  icon: string;
  inner: string;
  dot: string;
}

export function getCardActionControlSizes(size: CardSize | 'large'): CardActionControlSizes {
  if (size === 'tiny') {
    return {
      button: navetSizeTokens.iconButton.sm,
      icon: 'h-3 w-3',
      inner: 'h-3 w-3',
      dot: 'h-1.5 w-1.5',
    };
  }

  if (size === 'extra-small') {
    return {
      button: navetSizeTokens.iconButton.sm,
      icon: 'h-3.5 w-3.5',
      inner: 'h-3.5 w-3.5',
      dot: 'h-1.5 w-1.5',
    };
  }

  if (size === 'small') {
    return {
      button: navetSizeTokens.iconButton.sm,
      icon: 'h-3.5 w-3.5',
      inner: 'h-3.5 w-3.5',
      dot: 'h-1.5 w-1.5',
    };
  }

  if (size === 'medium') {
    return {
      button: navetSizeTokens.iconButton.sm,
      icon: 'h-4 w-4',
      inner: 'h-4 w-4',
      dot: 'h-2 w-2',
    };
  }

  if (size === 'large') {
    return {
      button: navetSizeTokens.iconButton.md,
      icon: 'h-4 w-4',
      inner: 'h-4 w-4',
      dot: 'h-2 w-2',
    };
  }

  return {
    button: navetSizeTokens.iconButton.sm,
    icon: 'h-4 w-4',
    inner: 'h-4 w-4',
    dot: 'h-2 w-2',
  };
}

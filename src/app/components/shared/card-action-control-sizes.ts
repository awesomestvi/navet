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
      button: 'h-6 w-6',
      icon: 'h-2.5 w-2.5',
      inner: 'h-3 w-3',
      dot: 'h-1.5 w-1.5',
    };
  }

  if (size === 'extra-small') {
    return {
      button: 'h-7 w-7',
      icon: 'h-3 w-3',
      inner: 'h-3.5 w-3.5',
      dot: 'h-1.5 w-1.5',
    };
  }

  if (size === 'small') {
    return {
      button: 'h-8 w-8',
      icon: 'h-3 w-3',
      inner: 'h-3.5 w-3.5',
      dot: 'h-1.5 w-1.5',
    };
  }

  if (size === 'medium') {
    return {
      button: 'h-8 w-8',
      icon: 'h-3.5 w-3.5',
      inner: 'h-4 w-4',
      dot: 'h-2 w-2',
    };
  }

  if (size === 'large') {
    return {
      button: 'h-9 w-9',
      icon: 'h-4 w-4',
      inner: 'h-4.5 w-4.5',
      dot: 'h-2.5 w-2.5',
    };
  }

  return {
    button: 'h-8 w-8',
    icon: 'h-3.5 w-3.5',
    inner: 'h-4 w-4',
    dot: 'h-2 w-2',
  };
}

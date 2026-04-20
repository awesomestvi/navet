import type { CardSize } from './card-size';

export type EditControlVariant = 'neutral' | 'destructive';
export type EditControlPlacement = 'top-left' | 'top-right';

export function getEditControlLayout(size: CardSize) {
  if (size === 'tiny') {
    return {
      isCompact: true,
      topLeftPosition: 'top-2 left-2',
      topRightPosition: 'top-2 right-2',
      buttonSize: 'h-6 w-6',
      iconSize: 'w-3 h-3',
    };
  }

  if (size === 'extra-small') {
    return {
      isCompact: true,
      topLeftPosition: 'top-3 left-3',
      topRightPosition: 'top-3 right-3',
      buttonSize: 'h-7 w-7',
      iconSize: 'w-3.5 h-3.5',
    };
  }

  return {
    isCompact: true,
    topLeftPosition: 'top-3 left-3',
    topRightPosition: 'top-3 right-3',
    buttonSize: 'h-8 w-8',
    iconSize: 'w-4 h-4',
  };
}

export function getEditControlButtonClass(variant: EditControlVariant = 'neutral') {
  const baseClass =
    'rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg transition-all duration-200';

  if (variant === 'destructive') {
    return `${baseClass} bg-red-500 hover:bg-red-600 text-white`;
  }

  return `${baseClass} bg-black/50 hover:bg-black/65 text-white`;
}

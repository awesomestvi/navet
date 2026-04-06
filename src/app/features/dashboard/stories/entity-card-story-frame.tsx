import type { ReactNode } from 'react';
import { type CardSize, cardSizeOverlayClass } from '@/app/components/shared/card-size-selector';

export function EntityCardStoryFrame({
  children,
  className,
  size = 'medium',
}: {
  children: ReactNode;
  className?: string;
  size?: CardSize;
}) {
  return <div className={className ?? getEntityCardStoryFrameClassName(size)}>{children}</div>;
}

export function noopCardSizeChange() {
  return;
}

export function getEntityCardStoryFrameClassName(size: CardSize) {
  return cardSizeOverlayClass[size];
}

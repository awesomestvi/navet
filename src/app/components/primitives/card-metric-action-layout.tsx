import type { ReactNode } from 'react';

type CardMetricActionLayoutSize = 'small' | 'medium' | 'large';

interface CardMetricActionLayoutProps {
  size: CardMetricActionLayoutSize;
  metric: ReactNode;
  actions: ReactNode;
  className?: string;
}

const actionSpacingBySize: Record<CardMetricActionLayoutSize, string> = {
  small: 'mt-3',
  medium: 'pt-3',
  large: 'pt-4',
};

export function CardMetricActionLayout({
  size,
  metric,
  actions,
  className = '',
}: CardMetricActionLayoutProps) {
  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="mt-auto">{metric}</div>
      <div className={actionSpacingBySize[size]}>{actions}</div>
    </div>
  );
}

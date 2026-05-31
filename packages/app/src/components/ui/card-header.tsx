import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { memo, type ReactNode } from 'react';

interface CardHeaderProps {
  title: string;
  icon?: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  titleColor?: string;
  size?: CardSize;
}

/**
 * Reusable card header component
 * Provides consistent header layout across all cards
 */
export const CardHeader = memo(function CardHeader({
  title,
  icon,
  iconBgColor = 'bg-white/10',
  iconColor = 'text-white',
  titleColor = 'text-white',
  size = 'medium',
}: CardHeaderProps) {
  const isSmall = isCompactCardSize(size);
  const iconSize = isSmall ? 'w-8 h-8' : 'w-10 h-10';
  const iconInnerSize = isSmall ? 'w-4 h-4' : 'w-5 h-5';
  const titleSize = isSmall ? 'text-xs' : 'text-sm';
  const marginBottom = isSmall ? 'mb-1' : 'mb-2';

  return (
    <div className={`flex items-start justify-between ${marginBottom}`}>
      <div className="min-w-0 flex-1">
        <h3
          className={`font-semibold ${titleColor} truncate ${titleSize} transition-colors duration-500`}
        >
          {title}
        </h3>
      </div>
      {icon && (
        <div
          className={`${iconSize} rounded-full ${iconBgColor} flex items-center justify-center flex-shrink-0 transition-all duration-500`}
        >
          <div className={`${iconInnerSize} ${iconColor} transition-colors duration-500`}>
            {icon}
          </div>
        </div>
      )}
    </div>
  );
});

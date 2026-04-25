import {
  type CSSProperties,
  type HTMLAttributes,
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { BaseCard } from '@/app/components/primitives';
import { useTheme } from '@/app/hooks';

interface CardWrapperProps {
  children: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLDivElement> | ReactKeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  style?: CSSProperties;
  isDisabled?: boolean;
  isActive?: boolean;
  activeColor?: string | null;
  lightOverlayClassName?: string;
  showShadow?: boolean;
  interactionProps?: HTMLAttributes<HTMLDivElement> & {
    'aria-label'?: string;
    'aria-pressed'?: boolean;
    'aria-disabled'?: boolean;
    tabIndex?: number;
    role?: string;
  };
}

/**
 * Reusable card wrapper component
 * Provides consistent card styling and behavior
 */
export const CardWrapper = memo(function CardWrapper({
  children,
  onClick,
  className = '',
  style,
  isDisabled = false,
  isActive = false,
  activeColor = null,
  lightOverlayClassName,
  showShadow = true,
  interactionProps,
}: CardWrapperProps) {
  const { theme } = useTheme();
  const { className: interactionClassName, ...restInteractionProps } = interactionProps || {};

  return (
    <BaseCard
      size="medium"
      fullBleed
      interactive={Boolean(onClick && !isDisabled)}
      isActive={isActive}
      activeColor={activeColor}
      role={interactionProps?.role || 'button'}
      aria-disabled={interactionProps?.['aria-disabled'] ?? (!onClick || isDisabled)}
      tabIndex={interactionProps?.tabIndex ?? (onClick && !isDisabled ? 0 : -1)}
      onClick={!isDisabled ? onClick : undefined}
      onKeyDown={(e) => {
        interactionProps?.onKeyDown?.(e);
        if (e.defaultPrevented) {
          return;
        }
        if (onClick && !isDisabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e);
        }
      }}
      disableDefaultSheen
      disableDefaultLightOverlay={!lightOverlayClassName}
      overlay={
        lightOverlayClassName ? (
          <div className={`pointer-events-none absolute inset-0 z-[1] ${lightOverlayClassName}`} />
        ) : null
      }
      frameClassName={`transition-all duration-500 ${interactionClassName || ''} ${className} ${
        showShadow && theme === 'light' ? 'shadow-lg' : ''
      }`}
      style={style}
      contentClassName="h-full"
      {...restInteractionProps}
    >
      {children}
    </BaseCard>
  );
});

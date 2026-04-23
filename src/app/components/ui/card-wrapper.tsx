import {
  type CSSProperties,
  type HTMLAttributes,
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';

interface CardWrapperProps {
  children: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLDivElement> | ReactKeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  style?: CSSProperties;
  isDisabled?: boolean;
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
  lightOverlayClassName,
  showShadow = true,
  interactionProps,
}: CardWrapperProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const cardShell = getCardShellSurfaceTokens(theme);
  const { className: interactionClassName, ...restInteractionProps } = interactionProps || {};

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: This wrapper intentionally uses a div with button semantics because nested controls make a native button invalid.
    <div
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
      className={`relative h-full rounded-3xl overflow-hidden transition-all duration-500 ${cardShell.rootFrameClassName} ${onClick && !isDisabled ? 'cursor-pointer' : ''} ${showShadow ? surface.cardShadow : ''} ${interactionClassName || ''} ${className}`}
      style={style}
      {...restInteractionProps}
    >
      {children}
      {cardShell.sheenOverlayClassName && (
        <>
          <div className="pointer-events-none absolute inset-x-5 top-0 z-[1] h-16 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.24),transparent_72%)] opacity-75 blur-xl" />
          <div className="pointer-events-none absolute inset-y-5 right-0 z-[1] w-20 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)] opacity-60 blur-lg" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-10 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.05))]" />
        </>
      )}
      {surface.lightOverlay && (
        <div
          className={`absolute inset-0 z-[1] pointer-events-none ${lightOverlayClassName || surface.lightOverlay}`}
        />
      )}
    </div>
  );
});

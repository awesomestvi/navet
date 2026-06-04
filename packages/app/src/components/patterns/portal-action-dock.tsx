import { withTintAlpha } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface PortalActionDockAnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PortalActionDockProps {
  accentColor: string;
  anchorRect: PortalActionDockAnchorRect | null;
  children: ReactNode;
  onClose: () => void;
  theme?: ThemeType;
  title: string;
  subtitle?: string;
}

export function PortalActionDock({
  accentColor,
  anchorRect,
  children,
  onClose,
  theme,
  title,
  subtitle,
}: PortalActionDockProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  const overlayWidth = anchorRect ? Math.max(272, Math.min(anchorRect.width + 72, 360)) : 320;
  const overlayLeft = anchorRect
    ? Math.max(
        16,
        Math.min(
          anchorRect.left + anchorRect.width / 2 - overlayWidth / 2,
          window.innerWidth - overlayWidth - 16
        )
      )
    : 16;
  const overlayTop = anchorRect
    ? Math.max(16, Math.min(anchorRect.top + anchorRect.height / 2 - 84, window.innerHeight - 196))
    : 16;
  const shellStyle =
    theme === 'glass'
      ? {
          border: '1px solid rgba(255,255,255,0.16)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08) 22%, rgba(255,255,255,0.03) 54%, rgba(8,14,24,0.1) 100%)',
          boxShadow:
            '0 26px 56px -34px rgba(4,10,22,0.9), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -14px 28px rgba(255,255,255,0.03)',
          backdropFilter: 'blur(28px) saturate(1.08)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.08)',
          padding: '10px',
        }
      : {
          border: `1px solid ${withTintAlpha(accentColor, 0.12)}`,
          background: '#161619',
          boxShadow: '0 18px 38px -22px rgba(0,0,0,0.82)',
          padding: '10px',
        };

  return createPortal(
    <div className="fixed inset-0 z-[900]" data-card-edit-dock="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/58"
        aria-label="Close action dock"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
      />
      <div
        className="absolute z-1"
        style={{
          left: `${overlayLeft}px`,
          top: `${overlayTop}px`,
          width: `${overlayWidth}px`,
        }}
      >
        <div
          className="pointer-events-auto flex w-full flex-col items-center rounded-[28px]"
          style={shellStyle}
        >
          <div className="px-3 pt-1 pb-2 text-center">
            {subtitle ? (
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/58">
                {subtitle}
              </div>
            ) : null}
            <div
              className={`${subtitle ? 'mt-1' : ''} text-sm font-semibold leading-tight text-white`}
            >
              {title}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function getPortalActionDockAnchorRect(target: HTMLElement): PortalActionDockAnchorRect {
  const cardRoot = target.closest<HTMLElement>(
    '[data-draggable-card="true"], [data-card-nodrag="true"]'
  );

  if (cardRoot) {
    const { top, left, width, height } = cardRoot.getBoundingClientRect();
    return { top, left, width, height };
  }

  const { top, left, width, height } = target.getBoundingClientRect();
  return { top, left, width, height };
}

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
} from 'react';

interface CoverPositionGestureSurfaceProps {
  position: number;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onPreviewPosition: (newPosition: number) => void;
  onCommitPosition: (newPosition: number) => void;
}

function clampPosition(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const DRAG_START_THRESHOLD_PX = 4;

function getGestureMappingBounds(element: HTMLElement) {
  const cardRoot = element.closest<HTMLElement>('[data-cover-card-root="true"]');
  const cardBounds = cardRoot?.getBoundingClientRect();

  if (cardBounds && cardBounds.height > 1) {
    return cardBounds;
  }

  return element.getBoundingClientRect();
}

function suppressNextCardClick(element: HTMLElement) {
  const cardRoot = element.closest<HTMLElement>('[data-cover-card-root="true"]');
  if (!cardRoot) {
    return;
  }

  cardRoot.dataset.coverPositionSuppressClick = 'true';
  window.setTimeout(() => {
    delete cardRoot.dataset.coverPositionSuppressClick;
  }, 250);
}

export function CoverPositionGestureSurface({
  position,
  ariaLabel,
  disabled = false,
  className = '',
  children,
  onPreviewPosition,
  onCommitPosition,
}: CoverPositionGestureSurfaceProps) {
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const startPositionRef = useRef(position);
  const surfaceTopRef = useRef(0);
  const heightRef = useRef(1);
  const previewPositionRef = useRef(position);
  const hasDraggedRef = useRef(false);

  const previewFromClientY = useCallback(
    (clientY: number) => {
      const deltaY = clientY - startYRef.current;
      if (!hasDraggedRef.current && Math.abs(deltaY) < DRAG_START_THRESHOLD_PX) {
        return;
      }
      if (!hasDraggedRef.current) {
        hasDraggedRef.current = true;
      }
      const pointerY = Math.max(0, Math.min(heightRef.current, clientY - surfaceTopRef.current));
      const nextPosition = clampPosition(100 - (pointerY / heightRef.current) * 100);
      previewPositionRef.current = nextPosition;
      onPreviewPosition(nextPosition);
    },
    [onPreviewPosition]
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const bounds = getGestureMappingBounds(event.currentTarget);
    pointerIdRef.current = event.pointerId;
    startYRef.current = event.clientY;
    startPositionRef.current = position;
    previewPositionRef.current = position;
    hasDraggedRef.current = false;
    surfaceTopRef.current = bounds.top;
    heightRef.current = Math.max(1, bounds.height);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.pointerId !== pointerIdRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    previewFromClientY(event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointerIdRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    previewFromClientY(event.clientY);
    if (hasDraggedRef.current) {
      if (previewPositionRef.current !== clampPosition(startPositionRef.current)) {
        onCommitPosition(previewPositionRef.current);
      }
      suppressNextCardClick(event.currentTarget);
    }
    pointerIdRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== pointerIdRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onPreviewPosition(startPositionRef.current);
    if (hasDraggedRef.current) {
      suppressNextCardClick(event.currentTarget);
    }
    pointerIdRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    const keyPositionChanges: Record<string, number> = {
      ArrowDown: -5,
      ArrowLeft: -5,
      ArrowRight: 5,
      ArrowUp: 5,
      PageDown: -10,
      PageUp: 10,
    };

    const delta = keyPositionChanges[event.key];
    const nextPosition =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 100
          : typeof delta === 'number'
            ? clampPosition(position + delta)
            : null;

    if (nextPosition === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onPreviewPosition(nextPosition);
    onCommitPosition(nextPosition);
  };

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={position}
      aria-disabled={disabled || undefined}
      data-cover-position-gesture="true"
      className={`${className} ${
        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-ns-resize touch-none select-none'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

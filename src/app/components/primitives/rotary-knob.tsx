import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface RotaryKnobProps {
  id: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  isOn?: boolean;
  className?: string;
  glowClassName?: string;
  bandStrokeWidth?: number;
  tickOffsetRem?: number;
  bandPrimaryColor: string;
  bandSecondaryColor: string;
  bandGlowColor: string;
  onValueChange?: (value: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function normalizeAngleDelta(delta: number) {
  if (delta > 180) {
    return delta - 360;
  }

  if (delta < -180) {
    return delta + 360;
  }

  return delta;
}

function getPointerAngle(element: HTMLDivElement | null, clientX: number, clientY: number) {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return normalizeAngle((Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI + 180);
}

function snapToStep(value: number, min: number, max: number, step: number) {
  const snappedValue = Math.round((value - min) / step) * step + min;
  return Number(clamp(snappedValue, min, max).toFixed(1));
}

export const RotaryKnob = memo(function RotaryKnob({
  id,
  value,
  min = 0,
  max = 100,
  step = 1,
  isOn = true,
  className,
  glowClassName,
  bandStrokeWidth = 22,
  tickOffsetRem = 9.25,
  bandPrimaryColor,
  bandSecondaryColor,
  bandGlowColor,
  onValueChange,
}: RotaryKnobProps) {
  const { theme } = useTheme();
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const dragStartValueRef = useRef<number>(value);
  const dragLastAngleRef = useRef<number | null>(null);
  const dragAccumulatedAngleRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const safeStep = step || 1;
  const knobTurns = (value - min) / safeStep;
  const tickRotation = normalizeAngle(knobTurns * 14);

  const resetDragState = useCallback(() => {
    activePointerIdRef.current = null;
    dragLastAngleRef.current = null;
    dragAccumulatedAngleRef.current = 0;
    setIsDragging(false);
  }, []);

  const commitValueChange = useCallback(
    (nextValue: number) => {
      if (!onValueChange) {
        return;
      }

      onValueChange(snapToStep(nextValue, min, max, safeStep));
    },
    [max, min, onValueChange, safeStep]
  );

  useEffect(() => {
    if (!isDragging || !onValueChange) {
      return;
    }

    const updateFromPointer = (clientX: number, clientY: number) => {
      const angle = getPointerAngle(knobRef.current, clientX, clientY);
      if (angle === null) {
        return;
      }

      if (dragLastAngleRef.current === null) {
        dragLastAngleRef.current = angle;
        return;
      }

      const angleDelta = normalizeAngleDelta(angle - dragLastAngleRef.current);
      dragAccumulatedAngleRef.current += angleDelta;
      dragLastAngleRef.current = angle;

      const nextValue =
        dragStartValueRef.current + (dragAccumulatedAngleRef.current / 18) * safeStep;
      commitValueChange(nextValue);
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      updateFromPointer(event.clientX, event.clientY);
    };

    const handleWindowPointerEnd = (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      resetDragState();
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, [commitValueChange, isDragging, onValueChange, resetDragState, safeStep]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isOn || !onValueChange) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    dragStartValueRef.current = value;
    dragAccumulatedAngleRef.current = 0;
    dragLastAngleRef.current = getPointerAngle(knobRef.current, event.clientX, event.clientY);
    setIsDragging(true);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetDragState();
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!isOn || !onValueChange) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    commitValueChange(value + direction * safeStep);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOn || !onValueChange) {
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      commitValueChange(value + safeStep);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      commitValueChange(value - safeStep);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      commitValueChange(min);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      commitValueChange(max);
    }
  };

  const knobVisual = (
    <>
      <svg
        className="pointer-events-none absolute inset-[-0.75rem] h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] overflow-visible"
        viewBox="0 0 352 352"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={`rotary-knob-band-${id}`}
            x1="176"
            y1="18"
            x2="176"
            y2="334"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={bandSecondaryColor} />
            <stop offset="50%" stopColor={bandPrimaryColor} />
            <stop offset="100%" stopColor={bandSecondaryColor} />
          </linearGradient>
          <filter id={`rotary-knob-band-glow-${id}`}>
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx="176"
          cy="176"
          r="163"
          fill="none"
          stroke={theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)'}
          strokeWidth={bandStrokeWidth}
          opacity={isOn ? 1 : 0.35}
        />
        <circle
          cx="176"
          cy="176"
          r="163"
          fill="none"
          stroke={`url(#rotary-knob-band-${id})`}
          strokeWidth={bandStrokeWidth}
          opacity={isOn ? 1 : 0.35}
          filter={isOn ? `url(#rotary-knob-band-glow-${id})` : 'none'}
          style={{
            filter: isOn ? `drop-shadow(0 0 16px ${bandGlowColor})` : 'none',
            transition: 'opacity 220ms ease, filter 220ms ease, stroke 220ms ease',
          }}
        />
      </svg>

      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            theme === 'light'
              ? 'radial-gradient(circle at 50% 46%, rgba(255,255,255,0.94), rgba(226,232,240,0.86) 42%, rgba(203,213,225,0.52) 66%, rgba(148,163,184,0.18) 100%)'
              : 'radial-gradient(circle at 50% 46%, rgba(255,255,255,0.18), rgba(255,255,255,0.10) 36%, rgba(255,255,255,0.05) 62%, rgba(255,255,255,0.02) 100%)',
          boxShadow: isOn
            ? `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -18px 44px rgba(0,0,0,0.26), 0 0 42px ${bandGlowColor}`
            : 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -18px 44px rgba(0,0,0,0.18)',
        }}
      />

      <div className="absolute inset-[1.1rem] rounded-full border border-white/10 bg-black/10" />

      <div
        className="absolute inset-[1.4rem] rounded-full"
        style={{
          background:
            theme === 'light'
              ? 'radial-gradient(circle at 42% 36%, rgba(255,255,255,0.88), rgba(248,250,252,0.68) 48%, rgba(226,232,240,0.34) 100%)'
              : 'radial-gradient(circle at 38% 34%, rgba(255,255,255,0.12), rgba(255,255,255,0.06) 52%, rgba(255,255,255,0.02) 100%)',
        }}
      />

      <div
        className={cn(
          'absolute inset-[0.65rem] rounded-full',
          isDragging ? '' : 'transition-transform duration-300 ease-out'
        )}
        style={{ transform: `rotate(${tickRotation}deg)` }}
      >
        {Array.from({ length: 40 }).map((_, index) => {
          const angle = index * 9;
          const isMajor = index % 5 === 0;

          return (
            <div
              key={angle}
              className="absolute left-1/2 top-1/2 origin-center"
              style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
            >
              <div
                className={cn('rounded-full', isMajor ? 'h-5 w-[2px]' : 'h-3.5 w-px')}
                style={{
                  transform: `translateY(-${tickOffsetRem}rem)`,
                  backgroundColor: isOn
                    ? isMajor
                      ? 'rgba(255,255,255,0.34)'
                      : 'rgba(255,255,255,0.22)'
                    : 'rgba(255,255,255,0.14)',
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        className="absolute inset-[4rem] rounded-full border border-white/10"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
      />
    </>
  );

  return (
    <div className={cn('relative h-[22rem] w-[22rem] overflow-visible', className)}>
      {isOn && glowClassName ? (
        <div
          className={cn(
            'pointer-events-none absolute right-[-6.5rem] top-1/2 h-80 w-80 -translate-y-1/2 rounded-full blur-3xl opacity-75',
            glowClassName
          )}
        />
      ) : null}

      {isOn && onValueChange ? (
        <div
          ref={knobRef}
          className={cn(
            'absolute inset-0 flex touch-none items-center justify-center cursor-grab active:cursor-grabbing'
          )}
          role="slider"
          tabIndex={0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
        >
          {knobVisual}
        </div>
      ) : (
        <div
          ref={knobRef}
          className="absolute inset-0 flex items-center justify-center"
          role="img"
          aria-hidden="true"
        >
          {knobVisual}
        </div>
      )}
    </div>
  );
});

import { ChevronRight } from 'lucide-react';
import {
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { HA_CONTROL_DEBOUNCE_MS } from '@/app/constants/interaction-timing';
import type { ThemeType } from '@/app/hooks/use-theme';

export interface SlideActionProps {
  actionLabel: string;
  ariaLabel: string;
  completionIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  disabled?: boolean;
  labelStyle?: CSSProperties;
  onComplete: () => void;
  size: 'extra-small' | 'small';
  theme: ThemeType;
  thumbClassName?: string;
  thumbIconClassName?: string;
  thumbIconStyle?: CSSProperties;
  thumbStyle?: CSSProperties;
}

const COMPLETE_THRESHOLD = 0.72;
const COMPLETION_HOLD_MS = 620;
const RETURN_ANIMATION_MS = 620;
const RELEASE_ANIMATION_MS = 200;

export function SlideAction({
  actionLabel,
  ariaLabel,
  completionIcon: CompletionIcon,
  disabled = false,
  labelStyle,
  onComplete,
  size,
  theme,
  thumbClassName,
  thumbIconClassName,
  thumbIconStyle,
  thumbStyle,
}: SlideActionProps) {
  const trackRef = useRef<HTMLButtonElement | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const returnTimerRef = useRef<number | null>(null);
  const resetFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    maxTravel: number;
    pointerId: number;
    startProgress: number;
    startX: number;
  } | null>(null);
  const progressRef = useRef(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      if (returnTimerRef.current !== null) {
        window.clearTimeout(returnTimerRef.current);
      }
      if (resetFrameRef.current !== null) {
        window.cancelAnimationFrame(resetFrameRef.current);
      }
    };
  }, []);

  const metrics =
    size === 'extra-small'
      ? {
          knobSize: 28,
          padding: 4,
          railClassName: 'h-11 rounded-[24px]',
          labelClassName: 'text-xs leading-[1.15] tracking-[0.01em]',
        }
      : {
          knobSize: 38,
          padding: 4,
          railClassName: 'h-12 rounded-[26px]',
          labelClassName: 'text-xs leading-[1.15] tracking-[0.01em]',
        };

  const trackSurfaceClassName =
    theme === 'light'
      ? 'border-black/8 bg-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]'
      : 'border-white/10 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';
  const labelColorClassName = theme === 'light' ? 'text-slate-700' : 'text-white/78';
  const defaultThumbClassName =
    theme === 'light'
      ? 'text-zinc-950 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.45)]'
      : 'text-zinc-950 shadow-[0_12px_24px_-16px_rgba(0,0,0,0.72)]';
  const progressFillClassName = theme === 'light' ? 'bg-white/44' : 'bg-white/10';

  const applyProgress = useCallback(
    (nextProgress: number) => {
      progressRef.current = nextProgress;
      const track = trackRef.current;
      if (!track) {
        return;
      }

      const idleTravel = Math.max(track.clientWidth - metrics.knobSize - metrics.padding * 2, 1);
      const progressTravel = dragStateRef.current?.maxTravel ?? idleTravel;
      const knobOffset = nextProgress * progressTravel;
      const clipInset = metrics.padding + knobOffset + metrics.knobSize * 0.82;
      const labelOpacity = 1 - Math.min(nextProgress * 0.6, 0.45);

      track.style.setProperty('--slide-knob-offset', `${knobOffset}px`);
      track.style.setProperty('--slide-fill-width', `${metrics.knobSize + knobOffset}px`);
      track.style.setProperty('--slide-label-clip-inset', `${clipInset}px`);
      track.style.setProperty('--slide-label-opacity', `${labelOpacity}`);
    },
    [metrics.knobSize, metrics.padding]
  );

  const setMotionDuration = useCallback((durationMs: number) => {
    trackRef.current?.style.setProperty('--slide-motion-duration', `${durationMs}ms`);
  }, []);

  useEffect(() => {
    applyProgress(progressRef.current);
  }, [applyProgress]);

  const runCompletion = () => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
    }
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    if (returnTimerRef.current !== null) {
      window.clearTimeout(returnTimerRef.current);
    }
    if (resetFrameRef.current !== null) {
      window.cancelAnimationFrame(resetFrameRef.current);
    }

    setIsCompleting(true);
    setIsReturning(false);
    setMotionDuration(0);
    applyProgress(1);
    completionTimerRef.current = window.setTimeout(() => {
      onComplete();
    }, HA_CONTROL_DEBOUNCE_MS);
    resetTimerRef.current = window.setTimeout(() => {
      setIsCompleting(false);
      setIsReturning(true);
      setMotionDuration(RETURN_ANIMATION_MS);
      resetFrameRef.current = window.requestAnimationFrame(() => {
        applyProgress(0);
        returnTimerRef.current = window.setTimeout(() => {
          setIsReturning(false);
        }, RETURN_ANIMATION_MS);
      });
    }, COMPLETION_HOLD_MS);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || isCompleting || isReturning) {
      return;
    }

    const track = trackRef.current;
    if (!track) {
      return;
    }

    const width = track.getBoundingClientRect().width;
    const nextMaxTravel = Math.max(width - metrics.knobSize - metrics.padding * 2, 1);

    dragStateRef.current = {
      maxTravel: nextMaxTravel,
      pointerId: event.pointerId,
      startProgress: progressRef.current,
      startX: event.clientX,
    };

    setMotionDuration(0);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const nextProgress = Math.min(
      1,
      Math.max(0, dragState.startProgress + deltaX / dragState.maxTravel)
    );

    applyProgress(nextProgress);
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    const shouldComplete = progressRef.current >= COMPLETE_THRESHOLD;
    dragStateRef.current = null;

    if (shouldComplete) {
      runCompletion();
      return;
    }

    setMotionDuration(RELEASE_ANIMATION_MS);
    window.requestAnimationFrame(() => applyProgress(0));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isCompleting || isReturning) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    runCompletion();
  };

  const labelPaddingLeft = metrics.knobSize + metrics.padding + 6;
  const labelPaddingRight = metrics.padding + 10;
  const slideActionStyle = {
    ['--slide-knob-offset' as string]: '0px',
    ['--slide-fill-width' as string]: `${metrics.knobSize}px`,
    ['--slide-label-clip-inset' as string]: `${metrics.padding + metrics.knobSize * 0.82}px`,
    ['--slide-label-opacity' as string]: '1',
    ['--slide-motion-duration' as string]: `${RELEASE_ANIMATION_MS}ms`,
  } as CSSProperties;

  return (
    <button
      type="button"
      ref={trackRef}
      aria-disabled={disabled || isCompleting || isReturning}
      aria-label={ariaLabel}
      className={`relative block w-full overflow-hidden border ${trackSurfaceClassName} ${metrics.railClassName} ${
        disabled || isCompleting || isReturning ? 'cursor-default opacity-85' : 'cursor-ew-resize'
      } select-none touch-none`}
      style={slideActionStyle}
      data-card-interactive="true"
      disabled={disabled || isCompleting || isReturning}
      tabIndex={disabled || isCompleting || isReturning ? -1 : 0}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      <div
        className={`absolute z-0 rounded-full ${progressFillClassName}`}
        style={{
          bottom: metrics.padding,
          left: metrics.padding,
          top: metrics.padding,
          transitionDuration: 'var(--slide-motion-duration)',
          transitionProperty: 'width',
          transitionTimingFunction: 'ease-out',
          width: 'var(--slide-fill-width)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
        style={{
          clipPath: 'inset(0 0 0 var(--slide-label-clip-inset))',
          paddingLeft: labelPaddingLeft,
          paddingRight: labelPaddingRight,
          transitionDuration: 'var(--slide-motion-duration)',
          transitionProperty: 'clip-path',
          transitionTimingFunction: 'ease-out',
        }}
      >
        <div
          className={`flex min-w-0 flex-col items-center justify-center font-medium ${metrics.labelClassName} ${labelColorClassName}`}
          style={{
            opacity: 'var(--slide-label-opacity)',
            transitionDuration: 'var(--slide-motion-duration)',
            transitionProperty: 'opacity',
            transitionTimingFunction: 'ease-out',
            ...labelStyle,
          }}
        >
          <span className="line-clamp-2 text-center">{actionLabel}</span>
        </div>
      </div>

      <div
        className={`absolute top-1/2 left-0 z-[2] flex items-center justify-center rounded-full ${defaultThumbClassName} ${thumbClassName ?? ''}`}
        style={{
          height: metrics.knobSize,
          width: metrics.knobSize,
          ...thumbStyle,
          transform: `translateX(calc(${metrics.padding}px + var(--slide-knob-offset))) translateY(-50%)`,
          transitionDuration: 'var(--slide-motion-duration)',
          transitionProperty: 'transform',
          transitionTimingFunction: 'ease-out',
        }}
      >
        {isCompleting && CompletionIcon ? (
          <CompletionIcon
            className={`${size === 'extra-small' ? 'h-4 w-4' : 'h-4.5 w-4.5'} ${thumbIconClassName ?? ''}`}
            style={thumbIconStyle}
          />
        ) : (
          <ChevronRight
            className={`${size === 'extra-small' ? 'h-4 w-4' : 'h-4.5 w-4.5'} ${thumbIconClassName ?? ''}`}
            style={thumbIconStyle}
          />
        )}
      </div>
    </button>
  );
}

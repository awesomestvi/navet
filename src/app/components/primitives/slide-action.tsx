import { ChevronRight } from 'lucide-react';
import {
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SVGProps,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ThemeType } from '@/app/hooks/use-theme';

export interface SlideActionProps {
  actionLabel: string;
  ariaLabel: string;
  completionIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  disabled?: boolean;
  onComplete: () => void;
  size: 'extra-small' | 'small';
  theme: ThemeType;
}

const COMPLETE_THRESHOLD = 0.72;

export function SlideAction({
  actionLabel,
  ariaLabel,
  completionIcon: CompletionIcon,
  disabled = false,
  onComplete,
  size,
  theme,
}: SlideActionProps) {
  const trackRef = useRef<HTMLButtonElement | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    maxTravel: number;
    pointerId: number;
    startProgress: number;
    startX: number;
  } | null>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const metrics =
    size === 'extra-small'
      ? {
          knobSize: 28,
          padding: 4,
          railClassName: 'h-11 rounded-[24px]',
          labelClassName: 'text-[9px] leading-[1.05] tracking-[0.02em]',
        }
      : {
          knobSize: 38,
          padding: 4,
          railClassName: 'h-12 rounded-[26px]',
          labelClassName: 'text-[9.5px] leading-[1.05] tracking-[0.02em]',
        };

  const trackSurfaceClassName =
    theme === 'light'
      ? 'border-black/8 bg-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]'
      : 'border-white/10 bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';
  const labelColorClassName = theme === 'light' ? 'text-black/60' : 'text-white/58';
  const thumbClassName =
    theme === 'light'
      ? 'bg-white text-zinc-950 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.45)]'
      : 'bg-white text-zinc-950 shadow-[0_12px_24px_-16px_rgba(0,0,0,0.72)]';
  const progressFillClassName = theme === 'light' ? 'bg-white/44' : 'bg-white/10';

  const runCompletion = () => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
    }

    setIsCompleting(true);
    setProgress(1);
    completionTimerRef.current = window.setTimeout(() => {
      onComplete();
      setIsCompleting(false);
      setProgress(0);
    }, 140);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || isCompleting) {
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
      startProgress: progress,
      startX: event.clientX,
    };

    setIsDragging(true);
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

    setProgress(nextProgress);
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
    setIsDragging(false);

    if (shouldComplete) {
      runCompletion();
      return;
    }

    setProgress(0);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isCompleting) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    runCompletion();
  };

  const idleTravel = trackRef.current
    ? Math.max(trackRef.current.clientWidth - metrics.knobSize - metrics.padding * 2, 1)
    : Math.max(metrics.knobSize, 1);
  const progressTravel = dragStateRef.current?.maxTravel ?? idleTravel;
  const knobOffset = progress * progressTravel;
  const labelPaddingLeft = metrics.knobSize + metrics.padding + 6;
  const labelPaddingRight = metrics.padding + 10;

  return (
    <button
      type="button"
      ref={trackRef}
      aria-disabled={disabled || isCompleting}
      aria-label={ariaLabel}
      className={`relative overflow-hidden border ${trackSurfaceClassName} ${metrics.railClassName} ${
        disabled || isCompleting ? 'cursor-default opacity-70' : 'cursor-ew-resize'
      } select-none touch-none`}
      data-card-interactive="true"
      disabled={disabled || isCompleting}
      tabIndex={disabled || isCompleting ? -1 : 0}
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
        className={`absolute rounded-full ${progressFillClassName}`}
        style={{
          bottom: metrics.padding,
          left: metrics.padding,
          top: metrics.padding,
          width: metrics.knobSize + knobOffset,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          clipPath: `inset(0 0 0 ${metrics.padding + knobOffset + metrics.knobSize * 0.82}px)`,
          paddingLeft: labelPaddingLeft,
          paddingRight: labelPaddingRight,
        }}
      >
        <div
          className={`flex min-w-0 flex-col items-center justify-center font-medium ${metrics.labelClassName} ${labelColorClassName}`}
          style={{ opacity: 1 - Math.min(progress * 0.6, 0.45) }}
        >
          <span className="line-clamp-2 text-center">{actionLabel}</span>
        </div>
      </div>

      <div
        className={`absolute top-1/2 flex items-center justify-center rounded-full ${thumbClassName} ${
          isDragging || isCompleting ? '' : 'transition-transform duration-200'
        }`}
        style={{
          height: metrics.knobSize,
          transform: `translateX(${metrics.padding + knobOffset}px) translateY(-50%)`,
          width: metrics.knobSize,
        }}
      >
        {isCompleting && CompletionIcon ? (
          <CompletionIcon className={size === 'extra-small' ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
        ) : (
          <ChevronRight className={size === 'extra-small' ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
        )}
      </div>
    </button>
  );
}

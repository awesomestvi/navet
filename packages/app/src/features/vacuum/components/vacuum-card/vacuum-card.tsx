import { cn } from '@navet/app/components/ui/utils';
import type { useTheme } from '@navet/app/hooks';
import { type CSSProperties, memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  getCompactVisualClassName,
  type MotionLevel,
  resolveVacuumIllustrationSurface,
  SharedVacuumCardShell,
  useVacuumCardState,
  type VacuumCardProps,
  type VacuumDisplayState,
} from './vacuum-card.shared';

interface CompactRobotPose {
  left: string;
  top: string;
  rotation: string;
}

function readRotationDegrees(transform: string): number {
  if (!transform || transform === 'none') {
    return 0;
  }

  const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
  if (!matrixMatch) {
    return 0;
  }

  const values = matrixMatch[1].split(',').map((value) => Number.parseFloat(value.trim()));
  const [a, b] = values;
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return 0;
  }

  const angle = (Math.atan2(b, a) * 180) / Math.PI;
  return Math.round(angle);
}

function VacuumSideBrush({
  subtitleColor,
  compact = false,
}: {
  subtitleColor: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-0 animate-[navet-vacuum-side-brush-spin_720ms_linear_infinite]',
        compact
          ? 'top-[0.72rem] right-[0.02rem] h-[1.05rem] w-[1.05rem]'
          : 'top-[0.72rem] right-[0.02rem] h-[1.2rem] w-[1.2rem]'
      )}
      aria-hidden="true"
      data-testid="vacuum-side-brush"
    >
      <span
        className="absolute left-1/2 top-1/2 h-[1px] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: subtitleColor, opacity: 0.9 }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-[1px] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full rotate-60"
        style={{ backgroundColor: subtitleColor, opacity: 0.72 }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-[1px] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full -rotate-60"
        style={{ backgroundColor: subtitleColor, opacity: 0.72 }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-zinc-950/90"
        style={{ borderColor: subtitleColor, opacity: 0.9 }}
      />
    </div>
  );
}

function VacuumRobotVisual({
  displayState,
  motionLevel,
  theme,
  titleColor,
  subtitleColor,
  variant = 'compact',
  className,
}: {
  displayState: VacuumDisplayState;
  motionLevel: MotionLevel;
  theme: ReturnType<typeof useTheme>['theme'];
  titleColor: string;
  subtitleColor: string;
  variant?: 'compact' | 'detail';
  className?: string;
}) {
  const isCleaning = displayState === 'cleaning' || displayState === 'mopping';
  const isReturning = displayState === 'returning';
  const isCharging =
    displayState === 'charging' ||
    displayState === 'charging-complete' ||
    displayState === 'docked';
  const isPaused = displayState === 'paused';
  const isUnavailable = displayState === 'unavailable';
  const isCompact = variant === 'compact';
  const showPulse = motionLevel !== 'low';
  const showSweep = !isCompact && motionLevel !== 'low' && (isCleaning || isReturning);
  const compactRobotRef = useRef<HTMLDivElement | null>(null);
  const lastMotionPoseRef = useRef<CompactRobotPose | null>(null);
  const previousDisplayStateRef = useRef<VacuumDisplayState>(displayState);
  const [returnStartPose, setReturnStartPose] = useState<CompactRobotPose | null>(null);
  const [pausedPose, setPausedPose] = useState<CompactRobotPose | null>(null);
  const compactPulseTransform = 'translate(-10px, 5px)';
  const detailRobotTransform = isReturning || isCharging ? 'translate(1rem, -0.35rem)' : undefined;
  const dockTransform = isCompact ? 'rotate(0deg) translate(-8px, 0px)' : 'translate(0px, 0px)';
  const compactMotionEnabled = isCompact && motionLevel !== 'low' && !isUnavailable;
  const compactRobotAnimation = compactMotionEnabled
    ? isCleaning
      ? 'navet-vacuum-cleaning-border-loop 24s linear infinite'
      : isReturning
        ? 'navet-vacuum-return-to-dock 4.8s linear forwards'
        : undefined
    : undefined;
  const compactRobotDockedPose = {
    left: 'calc(100% - 5.45rem)',
    top: '0.1rem',
    transform: 'rotate(0deg)',
  } satisfies CSSProperties;
  const compactRobotReturningPose = returnStartPose
    ? ({
        left: returnStartPose.left,
        top: returnStartPose.top,
        transform: `rotate(${returnStartPose.rotation})`,
      } satisfies CSSProperties)
    : ({
        left: '1rem',
        top: 'calc(100% - 6rem)',
        transform: 'rotate(90deg)',
      } satisfies CSSProperties);
  const compactRobotCleaningPose = {
    left: 'calc(100% - 5.45rem)',
    top: '0.1rem',
    transform: 'rotate(0deg)',
  } satisfies CSSProperties;
  const compactRobotPausedPose = pausedPose
    ? ({
        left: pausedPose.left,
        top: pausedPose.top,
        transform: `rotate(${pausedPose.rotation})`,
      } satisfies CSSProperties)
    : ({
        left: 'calc(100% - 9.5rem)',
        top: 'calc(100% - 5.5rem)',
        transform: 'rotate(90deg)',
      } satisfies CSSProperties);
  const compactRobotWrapperStyle = isCompact
    ? ({
        position: 'absolute',
        width: '4.9rem',
        height: '4.9rem',
        zIndex: 1,
        ...(isReturning && returnStartPose
          ? ({
              '--navet-vacuum-return-left': returnStartPose.left,
              '--navet-vacuum-return-top': returnStartPose.top,
              '--navet-vacuum-return-rotate': returnStartPose.rotation,
            } as CSSProperties)
          : {}),
        ...(isCharging
          ? compactRobotDockedPose
          : isReturning
            ? compactRobotReturningPose
            : isCleaning
              ? compactRobotCleaningPose
              : isPaused
                ? compactRobotPausedPose
                : compactRobotDockedPose),
        animation: compactRobotAnimation,
      } satisfies CSSProperties)
    : undefined;
  const detailRobotStyle = {
    transform: detailRobotTransform,
  } satisfies CSSProperties;
  const robotSurface = resolveVacuumIllustrationSurface({
    theme,
    displayState,
    titleColor,
  });
  const visualContainerClassName = isCompact
    ? 'relative flex h-full min-h-[8rem] items-start justify-end overflow-visible'
    : 'relative flex h-full min-h-[8rem] items-center justify-center overflow-hidden';

  useEffect(() => {
    if (!isCompact || (!isCleaning && !isReturning)) {
      return undefined;
    }

    const capturePose = () => {
      const node = compactRobotRef.current;
      if (node) {
        const style = window.getComputedStyle(node);
        lastMotionPoseRef.current = {
          left: style.left,
          top: style.top,
          rotation: `${readRotationDegrees(style.transform)}deg`,
        };
      }
    };

    capturePose();
    const intervalId = window.setInterval(capturePose, 240);
    return () => window.clearInterval(intervalId);
  }, [isCompact, isCleaning, isReturning]);

  useLayoutEffect(() => {
    const previousDisplayState = previousDisplayStateRef.current;
    if (
      isCompact &&
      isReturning &&
      (previousDisplayState === 'cleaning' || previousDisplayState === 'mopping') &&
      lastMotionPoseRef.current
    ) {
      setReturnStartPose(lastMotionPoseRef.current);
    }

    if (
      isCompact &&
      isPaused &&
      (previousDisplayState === 'cleaning' ||
        previousDisplayState === 'mopping' ||
        previousDisplayState === 'returning') &&
      lastMotionPoseRef.current
    ) {
      setPausedPose(lastMotionPoseRef.current);
    }

    if (!isReturning) {
      setReturnStartPose(null);
    }

    if (!isPaused) {
      setPausedPose(null);
    }

    previousDisplayStateRef.current = displayState;
  }, [displayState, isCompact, isPaused, isReturning]);

  return (
    <div className={cn(visualContainerClassName, className)}>
      <style>
        {`
              @keyframes navet-vacuum-side-brush-spin {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }

              ${
                isCompact
                  ? `
              @keyframes navet-vacuum-cleaning-border-loop {
                0% {
                  left: calc(100% - 5.45rem);
                  top: 0.1rem;
                  transform: rotate(0deg);
                }
                4% {
                  left: calc(100% - 5.45rem);
                  top: 0.1rem;
                  transform: rotate(-90deg);
                }
                38% {
                  left: 0.9rem;
                  top: 0.1rem;
                  transform: rotate(-90deg);
                }
                42% {
                  left: 0.9rem;
                  top: 0.1rem;
                  transform: rotate(-180deg);
                }
                54% {
                  left: 0.9rem;
                  top: calc(100% - 5.95rem);
                  transform: rotate(-180deg);
                }
                58% {
                  left: 0.9rem;
                  top: calc(100% - 5.95rem);
                  transform: rotate(-270deg);
                }
                86% {
                  left: calc(100% - 5.45rem);
                  top: calc(100% - 5.95rem);
                  transform: rotate(-270deg);
                }
                90% {
                  left: calc(100% - 5.45rem);
                  top: calc(100% - 5.95rem);
                  transform: rotate(-360deg);
                }
                100% {
                  left: calc(100% - 5.45rem);
                  top: 0.1rem;
                  transform: rotate(-360deg);
                }
              }

              @keyframes navet-vacuum-return-to-dock {
                0% {
                  left: var(--navet-vacuum-return-left, 0.9rem);
                  top: var(--navet-vacuum-return-top, calc(100% - 5.95rem));
                  transform: rotate(var(--navet-vacuum-return-rotate, 90deg));
                }
                48% {
                  left: calc(100% - 5.45rem);
                  top: calc(100% - 5.95rem);
                  transform: rotate(90deg);
                }
                54% {
                  left: calc(100% - 5.45rem);
                  top: calc(100% - 5.95rem);
                  transform: rotate(0deg);
                }
                88% {
                  left: calc(100% - 5.45rem);
                  top: 0.8rem;
                  transform: rotate(0deg);
                }
                94% {
                  left: calc(100% - 5.45rem);
                  top: 0.1rem;
                  transform: rotate(0deg);
                }
                100% {
                  left: calc(100% - 5.45rem);
                  top: 0.1rem;
                  transform: rotate(0deg);
                }
              }
            `
                  : ''
              }
            `}
      </style>
      <div
        className={cn(
          'absolute right-2 -top-4 h-5 w-16 transition-all duration-700',
          isCharging || isReturning ? 'opacity-100' : 'opacity-60'
        )}
        aria-hidden="true"
        style={{ transform: dockTransform }}
      >
        {!isCompact ? (
          <div
            className="absolute inset-x-1 top-0 h-2 rounded-full border"
            style={{ borderColor: subtitleColor, opacity: 0.72 }}
          />
        ) : null}
        <div
          className="absolute left-1 top-1 h-3 w-[1px]"
          style={{ backgroundColor: subtitleColor, opacity: 0.15 }}
        />
        <div
          className="absolute right-1 top-1 h-3 w-[1px]"
          style={{ backgroundColor: subtitleColor, opacity: 0.15 }}
        />
        {!isCompact ? (
          <div
            className="absolute inset-x-0 bottom-0 h-[2px] rounded-full"
            style={{ backgroundColor: subtitleColor, opacity: 0.55 }}
          />
        ) : null}
      </div>
      {showPulse ? (
        <div
          className="absolute h-24 w-24 -top-3 -right-2.5 rounded-full border border-white/10 animate-pulse"
          style={isCompact ? { transform: compactPulseTransform } : undefined}
        />
      ) : null}
      {isCompact ? (
        <div ref={compactRobotRef} style={compactRobotWrapperStyle}>
          {isCleaning ? <VacuumSideBrush subtitleColor={subtitleColor} compact /> : null}
          <div
            className={cn(
              'relative z-[1] flex h-[4.9rem] w-[4.9rem] items-center justify-center rounded-full border transition-all duration-700',
              isUnavailable && 'opacity-45 grayscale-[0.25]',
              isPaused && 'scale-[0.98]',
              displayState === 'error' && 'ring-1 ring-amber-400/30'
            )}
            style={{
              borderColor: titleColor,
              background: robotSurface.background,
              backgroundColor: robotSurface.baseColor,
              boxShadow: robotSurface.shadow,
            }}
            data-testid="vacuum-robot-surface"
          >
            <div
              className="absolute top-[0.88rem] h-[0.5rem] w-[0.5rem] rounded-full border bg-black/15"
              style={{ borderColor: subtitleColor }}
            />
            <div
              className="absolute bottom-[0.72rem] left-1/2 h-[0.28rem] w-[2.6rem] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: subtitleColor, opacity: 0.55 }}
            />
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-semibold"
              style={{ borderColor: subtitleColor, color: titleColor }}
            >
              N
            </div>
          </div>
        </div>
      ) : null}
      {!isCompact ? (
        <div className="relative" style={detailRobotStyle}>
          {isCleaning ? <VacuumSideBrush subtitleColor={subtitleColor} /> : null}
          <div
            className={cn(
              'relative z-[1] flex h-[4.9rem] w-[4.9rem] items-center justify-center rounded-full border transition-all duration-700',
              isUnavailable && 'opacity-45 grayscale-[0.25]',
              isPaused && 'scale-[0.98]',
              displayState === 'error' && 'ring-1 ring-amber-400/30'
            )}
            style={{
              borderColor: titleColor,
              background: robotSurface.background,
              backgroundColor: robotSurface.baseColor,
              boxShadow: robotSurface.shadow,
            }}
            data-testid="vacuum-robot-surface"
          >
            {showSweep ? (
              <div
                className="absolute inset-[0.32rem] rounded-full opacity-70"
                style={{
                  background: `conic-gradient(from 210deg, transparent 0deg, transparent 228deg, ${titleColor}18 270deg, transparent 318deg, transparent 360deg)`,
                }}
              />
            ) : null}
            <div
              className="absolute top-[0.88rem] h-[0.5rem] w-[0.5rem] rounded-full border bg-black/15"
              style={{ borderColor: subtitleColor }}
            />
            <div
              className="absolute bottom-[0.72rem] left-1/2 h-[0.28rem] w-[2.6rem] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: subtitleColor, opacity: 0.55 }}
            />
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-semibold"
              style={{ borderColor: subtitleColor, color: titleColor }}
            >
              N
            </div>
            {isPaused ? (
              <div
                className="absolute inset-x-0 -bottom-5 text-center text-[10px]"
                style={{ color: subtitleColor }}
              >
                Pause
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const VacuumCard = memo(function VacuumCard(props: VacuumCardProps) {
  const state = useVacuumCardState(props, { entityVariant: 'vacuum' });

  return (
    <SharedVacuumCardShell
      state={state}
      compactVisual={
        <VacuumRobotVisual
          displayState={state.displayState}
          motionLevel={state.motionLevel}
          theme={state.theme}
          titleColor={state.illustrationPalette.titleColor}
          subtitleColor={state.illustrationPalette.subtitleColor}
          variant="compact"
          className={getCompactVisualClassName(state.resolvedSize)}
        />
      }
    />
  );
});

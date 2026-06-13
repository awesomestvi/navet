import { BaseCard, CardMetric, CardMetricActionLayout } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { useEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import {
  useI18n,
  useProviderEntityModel,
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshot,
  useProviderEntitySnapshots,
  useTheme,
} from '@navet/app/hooks';
import { useIntegrationStore } from '@navet/app/hooks/use-integration-store';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { resolveEffectsQuality } from '@navet/app/utils/effects-quality';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { Battery, Bot, Clock3, Fan, History, ScanSearch } from 'lucide-react';
import { type CSSProperties, memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVacuumControl } from '../vacuum/use-vacuum-control';
import { resolveVacuumCardSummary } from '../vacuum/vacuum-card-summary';
import { VacuumControlsMedium } from '../vacuum/vacuum-controls-medium';
import { VacuumControlsSmall } from '../vacuum/vacuum-controls-small';
import { resolveVacuumCapabilities, type VacuumCapabilities } from '../vacuum/vacuum-features';
import { resolveVacuumGlanceMetrics } from '../vacuum/vacuum-metrics';
import { VacuumSettingsDialog } from '../vacuum/vacuum-settings-dialog';
import {
  getVacuumThemeStatus,
  normalizeVacuumStatus,
  type VacuumStatus,
} from '../vacuum/vacuum-utils';

type VacuumCardSize = 'small' | 'medium';
type VacuumDisplayState = VacuumStatus | 'unavailable';
type MotionLevel = 'high' | 'medium' | 'low';
type IllustrationPalette = {
  titleColor: string;
  subtitleColor: string;
};
type IllustrationSurface = {
  background: string;
  baseColor: string;
  shadow: string;
};

interface CompactRobotPose {
  left: string;
  top: string;
  rotation: string;
}

interface VacuumCardProps {
  id: string;
  name: string;
  providerId?: IntegrationProviderId;
  status: VacuumStatus;
  availability?: 'available' | 'unavailable' | 'unknown';
  battery?: number;
  cleanedArea?: string;
  cleaningTime?: string;
  nextCleaning?: string;
  waterLevel?: number | string;
  binLevel?: number | string;
  room?: string;
  lastCleaned?: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

function normalizeVacuumCardSize(size: CardSize): VacuumCardSize {
  if (size === 'small' || size === 'medium') {
    return size;
  }

  return 'medium';
}

function normalizeVacuumDisplayName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');

  if (parts.length % 2 === 0) {
    const half = parts.length / 2;
    const left = parts.slice(0, half).join(' ');
    const right = parts.slice(half).join(' ');

    if (left === right) {
      return left;
    }
  }

  return trimmed;
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

function useVacuumMotionLevel(): MotionLevel {
  const disableAnimations = useSettingsStore(settingsSelectors.disableAnimations);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return resolveEffectsQuality(
    effectsQuality,
    disableAnimations || lowPowerMode || prefersReducedMotion
  );
}

function resolveVacuumIllustrationPalette({
  theme,
  displayState,
  titleColor,
  subtitleColor,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  displayState: VacuumDisplayState;
  titleColor: string;
  subtitleColor: string;
}): IllustrationPalette {
  const isResting = displayState === 'idle' || displayState === 'docked';
  if (!isResting) {
    return { titleColor, subtitleColor };
  }

  switch (theme) {
    case 'light':
      return {
        titleColor: '#52525b',
        subtitleColor: '#71717a',
      };
    case 'glass':
      return {
        titleColor: '#d4d4d8',
        subtitleColor: '#a1a1aa',
      };
    default:
      return {
        titleColor: '#a1a1aa',
        subtitleColor: '#71717a',
      };
  }
}

function resolveVacuumIllustrationSurface({
  theme,
  displayState,
  titleColor,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  displayState: VacuumDisplayState;
  titleColor: string;
}): IllustrationSurface {
  if (displayState === 'error') {
    return {
      background: 'radial-gradient(circle at top, rgba(251,191,36,0.16), rgba(15,23,42,0.92) 66%)',
      baseColor: '#0f172a',
      shadow: `0 24px 54px -28px ${titleColor}33`,
    };
  }

  if (displayState === 'idle' || displayState === 'docked') {
    const restingBase =
      theme === 'light'
        ? 'rgba(39,39,42,0.92)'
        : theme === 'glass'
          ? 'rgba(24,24,27,0.86)'
          : 'rgba(24,24,27,0.96)';
    const restingBaseColor = theme === 'light' ? '#27272a' : '#18181b';

    return {
      background: `radial-gradient(circle at top, rgba(255,255,255,0.06), ${restingBase} 68%)`,
      baseColor: restingBaseColor,
      shadow: `0 18px 38px -28px ${titleColor}1f`,
    };
  }

  return {
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.18), rgba(15,23,42,0.94) 66%)',
    baseColor: '#0f172a',
    shadow: `0 24px 54px -28px ${titleColor}33`,
  };
}

function VacuumRobotVisual({
  displayState,
  motionLevel,
  theme,
  titleColor,
  subtitleColor,
  variant = 'detail',
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

    let frameId = 0;
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
      frameId = window.requestAnimationFrame(capturePose);
    };

    frameId = window.requestAnimationFrame(capturePose);
    return () => window.cancelAnimationFrame(frameId);
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
          className="absolute left-1 top-1 h-3 w-[1px] "
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
            {isPaused && !isCompact ? (
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

function VacuumStatusMetric({
  primaryText,
  secondaryFacts,
  size,
  titleColor,
  subtitleColor,
  theme,
  className,
}: {
  primaryText: string;
  secondaryFacts: ReturnType<typeof resolveVacuumCardSummary>['secondaryFacts'];
  size: VacuumCardSize;
  titleColor: string;
  subtitleColor: string;
  theme: ReturnType<typeof useTheme>['theme'];
  className?: string;
}) {
  const valueSizeStyle =
    size === 'medium'
      ? { fontSize: '1.6rem', lineHeight: 0.96 }
      : { fontSize: '1.2rem', lineHeight: 0.98 };
  const shouldWrapFacts = size === 'small' && secondaryFacts.length > 1;

  return (
    <CardMetric
      value={primaryText}
      label={
        secondaryFacts.length > 0 ? (
          <span
            className={cn(
              'min-w-0 text-xs leading-4 text-inherit',
              shouldWrapFacts
                ? 'flex flex-wrap items-start gap-x-2 gap-y-1 whitespace-normal'
                : 'flex items-center gap-2 overflow-hidden whitespace-nowrap'
            )}
          >
            {secondaryFacts.map((fact) => {
              const Icon =
                fact.kind === 'area'
                  ? ScanSearch
                  : fact.kind === 'battery'
                    ? Battery
                    : fact.kind === 'time'
                      ? Clock3
                      : fact.kind === 'speed'
                        ? Fan
                        : History;

              return (
                <span
                  key={`${fact.kind}-${fact.value}`}
                  className={cn(
                    'inline-flex min-w-0 items-center gap-2',
                    shouldWrapFacts ? 'max-w-full shrink-0' : 'shrink'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex min-w-0 items-center gap-1',
                      shouldWrapFacts ? 'max-w-full shrink-0' : 'shrink'
                    )}
                    title={`${fact.label} ${fact.value}`}
                  >
                    <Icon className="h-3 w-3 shrink-0 opacity-75" aria-hidden="true" />
                    <span className={shouldWrapFacts ? 'whitespace-normal' : 'truncate'}>
                      {fact.value}
                    </span>
                  </span>
                </span>
              );
            })}
          </span>
        ) : undefined
      }
      size="sm"
      isActive
      accentClassName="card-primary-text"
      theme={theme}
      className={className}
      valueStyle={{ color: titleColor, ...valueSizeStyle }}
      labelStyle={{ color: subtitleColor, fontSize: '0.75rem', lineHeight: '1rem' }}
      labelClassName="text-inherit"
    />
  );
}

function CompactMetricContent({
  size,
  summary,
  titleColor,
  subtitleColor,
  theme,
}: {
  size: VacuumCardSize;
  summary: ReturnType<typeof resolveVacuumCardSummary>;
  titleColor: string;
  subtitleColor: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const contentClassName = size === 'medium' ? 'min-w-0 flex-1 pr-24' : 'min-w-0 flex-1';

  return (
    <div className="flex min-h-0 items-start justify-start">
      <VacuumStatusMetric
        primaryText={summary.primaryText}
        secondaryFacts={summary.secondaryFacts}
        size={size}
        titleColor={titleColor}
        subtitleColor={subtitleColor}
        theme={theme}
        className={contentClassName}
      />
    </div>
  );
}

export const VacuumCard = memo(function VacuumCard({
  id,
  name,
  providerId,
  status,
  availability,
  battery,
  cleanedArea,
  cleaningTime,
  nextCleaning,
  waterLevel,
  binLevel,
  room,
  lastCleaned,
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: VacuumCardProps) {
  const resolvedSize = normalizeVacuumCardSize(size);
  const providerEntity = useProviderEntityModel(id);
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const resolvedProviderId =
    providerEntity?.providerId ??
    providerId ??
    parseProviderScopedId(id)?.providerId ??
    currentProviderId;
  const isHomeAssistantProvider = resolvedProviderId === 'home_assistant';
  const liveEntity = useProviderEntitySnapshot(id);
  const allEntities = useProviderEntitySnapshots({
    providerId: resolvedProviderId,
    enabled: isHomeAssistantProvider,
  });
  const entityRegistry = useProviderEntityRegistryEntries({
    providerId: resolvedProviderId,
    enabled: isHomeAssistantProvider,
  });
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);
  const liveAttrs = liveEntity?.attributes;
  const liveStatus = normalizeVacuumStatus(
    liveEntity?.state ||
      (typeof liveAttrs?.status === 'string' && liveAttrs.status) ||
      (typeof liveAttrs?.state === 'string' && liveAttrs.state) ||
      (typeof liveAttrs?.activity === 'string' && liveAttrs.activity),
    status
  );
  const vacuumCapabilities = resolveVacuumCapabilities({
    providerEntity,
    vacuumEntity: liveEntity,
  });
  const {
    currentStatus,
    isDialogOpen,
    setIsDialogOpen,
    isUpdatingFanSpeed,
    displayFanSpeed,
    handleStartCleaning,
    handleStartAreaCleaning,
    handlePause,
    handleStop,
    handleReturnHome,
    handleLocate,
    handleCleanSpot,
    handleSetFanSpeed,
  } = useVacuumControl({
    entityId: id,
    providerId: resolvedProviderId,
    initialStatus: liveStatus,
    currentFanSpeed: vacuumCapabilities.currentFanSpeed,
  });
  const motionLevel = useVacuumMotionLevel();
  useEditModeSettingsRequest(id, () => setIsDialogOpen(true), Boolean(_isEditMode));
  const liveName =
    typeof liveAttrs?.friendly_name === 'string' && liveAttrs.friendly_name.length > 0
      ? normalizeVacuumDisplayName(liveAttrs.friendly_name)
      : normalizeVacuumDisplayName(name);
  const glanceMetrics = resolveVacuumGlanceMetrics({
    vacuumEntity: liveEntity,
    vacuumEntityId: id,
    fallbackBattery: battery,
    fallbackCleanedArea: cleanedArea,
    fallbackCleaningTime: cleaningTime,
    fallbackNextCleaning: nextCleaning,
    fallbackWaterLevel: waterLevel,
    fallbackBinLevel: binLevel,
    use24HourTime,
    entities: allEntities,
    entityRegistry,
  });
  const liveBattery = glanceMetrics.battery;
  const liveFanSpeed = vacuumCapabilities.currentFanSpeed;
  const liveFanSpeeds = vacuumCapabilities.fanSpeedOptions;
  const computedStatus: VacuumStatus =
    currentStatus === 'charging'
      ? typeof liveBattery === 'number' && liveBattery >= 100
        ? 'charging-complete'
        : 'charging'
      : currentStatus === 'docked' && typeof liveBattery === 'number'
        ? liveBattery >= 100
          ? 'charging-complete'
          : 'charging'
        : currentStatus;
  const liveRoom =
    typeof liveAttrs?.current_room === 'string' && liveAttrs.current_room.length > 0
      ? liveAttrs.current_room
      : typeof liveAttrs?.current_zone === 'string' && liveAttrs.current_zone.length > 0
        ? liveAttrs.current_zone
        : typeof liveAttrs?.room === 'string' && liveAttrs.room.length > 0
          ? liveAttrs.room
          : room;
  const liveCurrentRoom =
    typeof liveAttrs?.current_room === 'string' && liveAttrs.current_room.length > 0
      ? liveAttrs.current_room
      : typeof liveAttrs?.current_zone === 'string' && liveAttrs.current_zone.length > 0
        ? liveAttrs.current_zone
        : undefined;
  const liveCleanedArea = glanceMetrics.cleanedArea;
  const liveCleaningTime = glanceMetrics.cleaningTime;
  const liveLastCleaned = glanceMetrics.lastCleaned ?? lastCleaned;
  const isUnavailable =
    availability === 'unavailable' ||
    providerEntity?.availability === 'unavailable' ||
    (typeof liveEntity?.state === 'string' && liveEntity.state.toLowerCase() === 'unavailable');
  const displayState: VacuumDisplayState = isUnavailable ? 'unavailable' : computedStatus;
  const { theme, colors, accentColor } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const { t } = useI18n();
  const isActive =
    displayState === 'cleaning' || displayState === 'mopping' || displayState === 'returning';
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const vacuumThemeStatus = getVacuumThemeStatus(
    displayState === 'unavailable' ? 'docked' : displayState
  );
  const cardColors = colors.vacuum[vacuumThemeStatus];
  const activeShellBackgroundClassName = isActive ? `bg-gradient-to-br ${cardColors.gradient}` : '';
  const frameClassName = cn(
    cardShell.rootFrameClassName,
    activeShellBackgroundClassName,
    cardColors.border,
    stateSurface.containerClassName,
    isUnavailable && 'opacity-80 saturate-[0.72]'
  );

  const headerTone =
    displayState === 'returning'
      ? 'purple'
      : displayState === 'cleaning' || displayState === 'mopping'
        ? 'primary'
        : displayState === 'error'
          ? 'amber'
          : 'neutral';
  const headerAccentColor = headerTone === 'primary' ? accentColor : null;
  const metricReadableTokens = getCardReadableTextTokens({
    theme,
    tone: headerTone,
    accentColor: headerAccentColor,
  });
  const illustrationPalette = resolveVacuumIllustrationPalette({
    theme,
    displayState,
    titleColor: metricReadableTokens.titleColor,
    subtitleColor: metricReadableTokens.subtitleColor,
  });
  const cardSummary = resolveVacuumCardSummary({
    status: displayState,
    currentRoom: liveCurrentRoom,
    battery: liveBattery,
    cleanedArea: liveCleanedArea,
    cleaningTime: liveCleaningTime,
    fanSpeed: displayFanSpeed,
    lastCleaned: liveLastCleaned,
    t: (key) => t(key as never),
  });
  const subtitle = t('vacuum.subtitle');
  const displayCapabilities: VacuumCapabilities = {
    ...vacuumCapabilities,
    currentFanSpeed: displayFanSpeed,
  };
  const controls = isCompactCardSize(resolvedSize) ? (
    <VacuumControlsSmall
      currentStatus={currentStatus}
      onStartCleaning={handleStartCleaning}
      onPause={handlePause}
      onStop={handleStop}
      onReturnHome={handleReturnHome}
      onLocate={handleLocate}
      onCleanSpot={handleCleanSpot}
      onCycleFanSpeed={handleSetFanSpeed}
      onOpenSettings={() => setIsDialogOpen(true)}
      theme={theme}
      capabilities={displayCapabilities}
      isUpdatingFanSpeed={isUpdatingFanSpeed}
      disabled={isUnavailable}
    />
  ) : (
    <VacuumControlsMedium
      currentStatus={currentStatus}
      onStartCleaning={handleStartCleaning}
      onPause={handlePause}
      onStop={handleStop}
      onReturnHome={handleReturnHome}
      onLocate={handleLocate}
      onCleanSpot={handleCleanSpot}
      onCycleFanSpeed={handleSetFanSpeed}
      onOpenSettings={() => setIsDialogOpen(true)}
      theme={theme}
      capabilities={displayCapabilities}
      isUpdatingFanSpeed={isUpdatingFanSpeed}
      disabled={isUnavailable}
    />
  );

  const compactMetric = (
    <CompactMetricContent
      size={resolvedSize}
      summary={cardSummary}
      titleColor={metricReadableTokens.titleColor}
      subtitleColor={metricReadableTokens.subtitleColor}
      theme={theme}
    />
  );
  const compactVisualClassName =
    resolvedSize === 'medium'
      ? 'pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-visible'
      : 'pointer-events-none absolute right-[-1.1rem] top-[-0.2rem] z-0 h-[6.3rem] min-h-0 w-[6.3rem]';

  return (
    <div className="relative h-full w-full">
      <BaseCard
        size={resolvedSize}
        frameClassName={frameClassName}
        disableDefaultSheen
        overlay={
          <>
            {isActive ? (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${cardColors.glow} to-transparent`}
              />
            ) : null}
            {stateSurface.overlayClassName ? (
              <div className={`absolute inset-0 ${stateSurface.overlayClassName}`} />
            ) : null}
            {isUnavailable ? <div className="absolute inset-0 bg-slate-950/12" /> : null}
          </>
        }
        contentClassName="h-full"
      >
        <div className="relative flex h-full flex-col">
          {resolvedSize === 'medium' ? (
            <VacuumRobotVisual
              displayState={displayState}
              motionLevel={motionLevel}
              theme={theme}
              titleColor={illustrationPalette.titleColor}
              subtitleColor={illustrationPalette.subtitleColor}
              variant="compact"
              className={compactVisualClassName}
            />
          ) : null}
          <div className="relative z-10 flex h-full flex-col">
            <EntityCardHeader
              title={liveName}
              subtitle={subtitle}
              layout="eyebrow-first"
              size={resolvedSize}
              accentColor={headerAccentColor}
              tone={headerTone}
              titleClassName={stateSurface.primaryTextClassName}
              subtitleClassName={stateSurface.mutedTextClassName}
              leading={
                <EntityCardHeaderIcon
                  IconComponent={Bot}
                  isActive={isActive}
                  size={resolvedSize}
                  baseColor={headerAccentColor}
                  tone={headerTone}
                />
              }
            />

            <CardMetricActionLayout
              size={resolvedSize}
              className="pt-1"
              metric={compactMetric}
              actions={controls}
            />
          </div>
        </div>
      </BaseCard>

      {isDialogOpen ? (
        <VacuumSettingsDialog
          entityId={id}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onStartCleaning={handleStartCleaning}
          onPauseCleaning={handlePause}
          onStopCleaning={handleStop}
          onReturnHome={handleReturnHome}
          name={liveName}
          room={liveRoom ?? ''}
          theme={theme}
          accentColorValue={accentColor}
          currentStatus={computedStatus}
          fanSpeed={liveFanSpeed}
          fanSpeeds={liveFanSpeeds}
          supportsFanSpeed={vacuumCapabilities.canSetFanSpeed}
          capabilities={vacuumCapabilities}
          onSetFanSpeed={handleSetFanSpeed}
          isUpdatingFanSpeed={isUpdatingFanSpeed}
          availableCleaningAreas={vacuumCapabilities.availableCleaningAreas}
          onStartAreaCleaning={handleStartAreaCleaning}
          onLocate={handleLocate}
          onCleanSpot={handleCleanSpot}
        />
      ) : null}
    </div>
  );
});

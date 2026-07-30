import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { Slider } from '@navet/app/components/primitives/slider';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { useEffectiveEffectsQuality } from '@navet/app/components/shared/theme/effective-effects-quality';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MediaEntityTypeKey } from '../media-card/get-media-entity-type-key';
import { getMediaDisplayVolume } from './media-card-style-utils';
import { MediaEntityHeader } from './media-entity-header';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import { MediaMarqueeText } from './media-marquee-text';
import { getMediaReadableForeground } from './media-readable-foreground';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import {
  getMediaArtworkPaletteSource,
  useMediaArtworkColors,
  withAlpha,
} from './use-media-artwork-colors';
import { useMediaVolumeMode } from './use-media-volume-mode';
import { useStableMediaArtwork } from './use-stable-media-artwork';

interface MediaSmallViewProps {
  entityId: string;
  artwork?: string | null;
  artworkResource?: ResolvedPlatformResource | null;
  onArtworkError?: (imageUrl?: string | null) => void;
  entityName: string;
  entityTypeKey: MediaEntityTypeKey;
  title: string;
  artist: string;
  isActive: boolean;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  elapsedSeconds: number;
  durationSeconds: number;
  theme: ThemeType;
  hideTransportControls?: boolean;
  onToggleMute: () => void;
  onPrevious: () => void;
  canPreviousTrack: boolean;
  onTogglePlay: () => void;
  canTogglePlayback: boolean;
  onNext: () => void;
  canNextTrack: boolean;
  canSeek: boolean;
  onSeek: (elapsedSeconds: number) => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
  onOpenDialog: () => void;
}

export function MediaSmallView({
  entityId,
  artwork,
  artworkResource,
  onArtworkError,
  entityName,
  entityTypeKey,
  title,
  artist,
  isActive,
  isPlaying,
  volume,
  isMuted,
  elapsedSeconds,
  durationSeconds,
  theme,
  hideTransportControls = false,
  onToggleMute,
  onPrevious,
  canPreviousTrack,
  onTogglePlay,
  canTogglePlayback,
  onNext,
  canNextTrack,
  canSeek,
  onSeek,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
  onOpenDialog,
}: MediaSmallViewProps) {
  const { t } = useI18n();
  const effectsQuality = useEffectiveEffectsQuality();
  const isLowEffects = effectsQuality === 'low';
  const { containerRef, isVolumeMode, registerVolumeInteraction, toggleVolumeMode } =
    useMediaVolumeMode();
  const stableArtwork = useStableMediaArtwork(artwork);

  const displayVolume = getMediaDisplayVolume(volume, isMuted);
  const durationLabel = formatMediaTime(Math.max(durationSeconds, elapsedSeconds));
  const hasSeekDuration = durationSeconds > 0;
  const [pendingSeek, setPendingSeek] = useState(elapsedSeconds);
  const [isSeeking, setIsSeeking] = useState(false);
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const paletteArtwork = getMediaArtworkPaletteSource(stableArtwork, artworkResource);
  const palette = useMediaArtworkColors(paletteArtwork, theme, entityId, `${title}::${artist}`);
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: palette.gradientEnd,
  });
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('medium');
  const subduedFallback = !stableArtwork && !isActive;
  const fallbackTitleColor =
    theme === 'light' && subduedFallback ? '#0f172a' : textTokens.titleColor;
  const fallbackSubtitleColor =
    theme === 'light' && subduedFallback ? '#475569' : textTokens.subtitleColor;
  const readableForeground = getMediaReadableForeground({
    theme,
    palette,
    titleColor: fallbackTitleColor,
    subtitleColor: fallbackSubtitleColor,
    hasArtwork: Boolean(stableArtwork),
  });
  const foreground = stableArtwork
    ? {
        titleColor: '#ffffff',
        subtitleColor: 'rgba(255,255,255,0.78)',
        titleStyle: {
          color: '#ffffff',
          textShadow: '0 1px 7px rgba(0,0,0,0.56)',
        },
        subtitleStyle: {
          color: 'rgba(255,255,255,0.84)',
          textShadow: '0 1px 6px rgba(0,0,0,0.5)',
        },
      }
    : readableForeground;
  const resolvedTitleColor = foreground.titleColor;
  const resolvedSubtitleColor = foreground.subtitleColor;
  const controlIconStyle = { color: resolvedTitleColor };
  const activeUtilityButtonStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
      palette.vibrant,
      0.44
    )} 100%)`,
    borderColor: withAlpha(resolvedSubtitleColor, 0.22),
    boxShadow: `0 10px 28px -18px ${withAlpha(palette.vibrant, 0.55)}, inset 0 1px 0 ${withAlpha(
      resolvedTitleColor,
      0.18
    )}`,
  };
  const volumeToggleButtonStyle = activeUtilityButtonStyle;
  const muteButtonStyle = activeUtilityButtonStyle;
  const trackBaseStyle = { backgroundColor: withAlpha(resolvedSubtitleColor, 0.24) };
  const trackFillStyle = {
    background: `linear-gradient(90deg, ${resolvedTitleColor} 0%, ${resolvedSubtitleColor} 100%)`,
    boxShadow: `0 0 18px ${withAlpha(resolvedTitleColor, 0.18)}`,
  };
  const trackThumbStyle = {
    backgroundColor: resolvedTitleColor,
    boxShadow: `0 0 0 1px ${withAlpha(resolvedTitleColor, 0.22)}, 0 0 14px ${withAlpha(
      resolvedTitleColor,
      0.32
    )}`,
  };
  const backgroundBaseStyle = isLowEffects
    ? { backgroundColor: palette.darkMuted }
    : {
        background: subduedFallback
          ? `linear-gradient(165deg, ${withAlpha(palette.dominant, 0.18)} 0%, ${withAlpha(
              palette.dominant,
              0.14
            )} 42%, ${withAlpha(palette.gradientEnd, 0.2)} 100%)`
          : `radial-gradient(circle at 18% 14%, ${withAlpha(
              palette.highlight,
              0.2
            )} 0%, transparent 34%), linear-gradient(165deg, ${withAlpha(
              palette.dominant,
              0.72
            )} 0%, ${withAlpha(palette.dominant, 0.62)} 42%, ${withAlpha(
              palette.gradientEnd,
              0.68
            )} 100%)`,
      };
  const colorTintStyle = {
    background: stableArtwork
      ? `linear-gradient(160deg, ${withAlpha(palette.dominant, 0.035)} 0%, ${withAlpha(
          palette.dominant,
          0.018
        )} 48%, ${withAlpha(palette.darkMuted, 0.03)} 100%)`
      : subduedFallback
        ? `linear-gradient(160deg, ${withAlpha(palette.dominant, 0.12)} 0%, ${withAlpha(
            palette.dominant,
            0.14
          )} 48%, ${withAlpha(palette.darkMuted, 0.18)} 100%)`
        : `linear-gradient(160deg, ${withAlpha(palette.dominant, 0.12)} 0%, ${withAlpha(
            palette.dominant,
            0.06
          )} 48%, ${withAlpha(palette.darkMuted, 0.08)} 100%)`,
  };
  const readabilityGradientStyle = {
    background:
      subduedFallback && theme === 'glass'
        ? `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.045)} 0%, ${withAlpha(
            palette.dominant,
            0.03
          )} 42%, ${withAlpha(palette.gradientEnd, 0.045)} 68%, ${withAlpha(
            palette.gradientEnd,
            0.065
          )} 100%)`
        : subduedFallback
          ? `linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.1) 42%, rgba(0,0,0,0.16) 68%, rgba(0,0,0,0.28) 100%)`
          : `radial-gradient(circle at 50% 46%, ${withAlpha(
              palette.highlight,
              0.04
            )} 0%, transparent 34%), linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.04) 34%, rgba(0,0,0,0.10) 68%, rgba(0,0,0,0.30) 100%)`,
  };
  const artworkAtmosphereStyle = {
    background: `radial-gradient(circle at 50% 50%, ${withAlpha(
      palette.dominant,
      subduedFallback ? 0.05 : 0.12
    )} 0%, transparent 72%)`,
  };
  const glassDepthOverlay =
    theme === 'glass' && !isLowEffects ? (
      stableArtwork ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,0.03),rgba(0,0,0,0)_42%,rgba(0,0,0,0.04)_100%)]"
            data-media-decorative-layer="glass-depth"
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-18px_34px_rgba(0,0,0,0.04)]"
            data-media-decorative-layer="glass-depth"
          />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04)_24%,rgba(255,255,255,0.015)_100%)]"
            data-media-decorative-layer="glass-depth"
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-16px_30px_rgba(255,255,255,0.03)]"
            data-media-decorative-layer="glass-depth"
          />
        </>
      )
    ) : null;

  useEffect(() => {
    if (!isSeeking) {
      setPendingSeek(elapsedSeconds);
    }
  }, [elapsedSeconds, isSeeking]);

  return (
    <div
      ref={containerRef}
      data-media-effects-quality={effectsQuality}
      className="relative -m-3 flex h-[calc(100%+1.5rem)] flex-col overflow-hidden rounded-[inherit]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        data-media-paint-layer="base"
        style={backgroundBaseStyle}
      />
      {stableArtwork ? (
        <img
          src={stableArtwork}
          alt=""
          aria-hidden="true"
          onError={() => onArtworkError?.(stableArtwork)}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${
            isLowEffects ? 'opacity-94' : 'scale-[1.03] opacity-92 saturate-[1.08] contrast-[1.04]'
          }`}
          decoding="async"
        />
      ) : (
        <MediaFallbackArtwork
          palette={palette}
          compact
          className={`absolute inset-0 ${subduedFallback ? 'opacity-28' : 'opacity-72'}`}
          style={{ transform: 'scale(1.02)' }}
        />
      )}
      {!isLowEffects ? (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            data-media-decorative-layer="atmosphere"
            style={artworkAtmosphereStyle}
          />
          <div
            className="pointer-events-none absolute inset-0"
            data-media-decorative-layer="tint"
            style={colorTintStyle}
          />
        </>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        data-media-paint-layer="readability"
        style={readabilityGradientStyle}
      />
      {glassDepthOverlay}

      <div className="relative z-[2] flex h-full flex-col p-3">
        <div className="flex items-start justify-between gap-3">
          <MediaEntityHeader
            entityName={entityName}
            entityType={t(entityTypeKey)}
            size="small"
            isActive={isActive}
            accentColor={palette.highlight}
            titleStyle={foreground.titleStyle}
            subtitleStyle={foreground.subtitleStyle}
          />
          <div className="flex shrink-0 items-center gap-2.5 self-start">
            <MediaVisualizerButton
              isPlaying={isPlaying}
              onClick={(event) => {
                event.stopPropagation();
                onOpenDialog();
              }}
              className={iconTone}
              style={foreground.titleStyle}
            />
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <MediaMarqueeText
                text={title}
                className={`text-xs font-semibold ${iconTone}`}
                style={foreground.titleStyle}
              />
              <MediaMarqueeText
                text={artist}
                className={`mt-0.5 text-xs ${subtitleTone}`}
                threshold={24}
                style={foreground.subtitleStyle}
              />
            </div>

            {!hideTransportControls ? (
              <div className="relative">
                <RoundControlButton
                  theme={theme}
                  size="medium"
                  variant="neutral"
                  aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
                  disabled={!canTogglePlayback}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!canTogglePlayback) return;
                    onTogglePlay();
                  }}
                  className="h-10 w-10 backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                  iconStyle={controlIconStyle}
                  style={subduedFallback ? undefined : activeUtilityButtonStyle}
                >
                  {isPlaying ? (
                    <Pause className={primaryControlSizes.icon} fill="currentColor" />
                  ) : (
                    <Play className={primaryControlSizes.icon} fill="currentColor" />
                  )}
                </RoundControlButton>
              </div>
            ) : null}
          </div>

          {!hideTransportControls ? (
            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 text-[10px] tabular-nums ${subtitleTone}`}
                style={foreground.subtitleStyle}
              >
                {formatMediaTime(hasSeekDuration ? Math.max(0, pendingSeek) : 0)}
              </span>
              <Slider
                value={hasSeekDuration ? Math.min(durationSeconds, pendingSeek) : 0}
                min={0}
                max={hasSeekDuration ? Math.max(durationSeconds, elapsedSeconds, pendingSeek) : 1}
                step={1}
                ariaLabel={t('media.seek')}
                onValueChange={(value) => {
                  if (hasSeekDuration && canSeek) {
                    setPendingSeek(value);
                  }
                }}
                onValueCommit={(value) => {
                  if (hasSeekDuration && canSeek) {
                    onSeek(value);
                  }
                }}
                onInteractionStart={() => {
                  if (hasSeekDuration && canSeek) {
                    setIsSeeking(true);
                  }
                }}
                onInteractionEnd={() => {
                  if (hasSeekDuration) {
                    setIsSeeking(false);
                  }
                }}
                disabled={!hasSeekDuration || !canSeek}
                rootClassName="relative flex h-4 min-w-0 flex-1 items-center touch-none select-none"
                trackClassName="relative h-[3px] grow rounded-full"
                rangeClassName="absolute h-full rounded-full"
                thumbClassName="block h-3 w-3 rounded-full outline-none"
                touchThumbClassName="block h-6 w-6 rounded-full outline-none"
                trackStyle={trackBaseStyle}
                rangeStyle={trackFillStyle}
                thumbStyle={trackThumbStyle}
              />
              <span
                className={`shrink-0 text-[10px] tabular-nums ${subtitleTone}`}
                style={foreground.subtitleStyle}
              >
                {hasSeekDuration ? durationLabel : formatMediaTime(0)}
              </span>
            </div>
          ) : null}
        </div>

        {!hideTransportControls ? (
          <div className="mt-2 flex items-center justify-between gap-1.5">
            <RoundControlButton
              theme={theme}
              size="small"
              variant="neutral"
              aria-label={t('media.volume')}
              onClick={(event) => {
                event.stopPropagation();
                toggleVolumeMode();
              }}
              className="backdrop-blur-xl transition-colors"
              iconStyle={controlIconStyle}
              style={volumeToggleButtonStyle}
            >
              {isMuted ? (
                <VolumeX className={controlSizes.icon} />
              ) : (
                <Volume2 className={controlSizes.icon} />
              )}
            </RoundControlButton>

            {isVolumeMode ? (
              <div className="relative min-w-0 flex-1">
                <Slider
                  value={displayVolume}
                  ariaLabel={t('media.volume')}
                  onValueChange={(value) => {
                    registerVolumeInteraction();
                    onVolumeChange(value);
                  }}
                  onInteractionStart={() => {
                    registerVolumeInteraction();
                    onVolumeInteractionStart();
                  }}
                  onInteractionEnd={onVolumeInteractionEnd}
                  rootClassName="relative flex h-6 w-full items-center touch-none select-none"
                  trackClassName="relative h-[3px] grow rounded-full"
                  rangeClassName="absolute h-full rounded-full"
                  thumbClassName="block h-4 w-4 rounded-full outline-none"
                  touchThumbClassName="block h-6 w-6 rounded-full outline-none"
                  trackStyle={trackBaseStyle}
                  rangeStyle={trackFillStyle}
                  thumbStyle={trackThumbStyle}
                />
              </div>
            ) : null}

            {isVolumeMode ? (
              <RoundControlButton
                theme={theme}
                size="small"
                variant="neutral"
                aria-label={isMuted ? t('media.unmuteVolume') : t('media.muteVolume')}
                aria-pressed={isMuted}
                onClick={(event) => {
                  event.stopPropagation();
                  registerVolumeInteraction();
                  onToggleMute();
                }}
                className="backdrop-blur-xl transition-colors"
                iconStyle={controlIconStyle}
                style={muteButtonStyle}
              >
                {isMuted ? (
                  <VolumeX className={controlSizes.icon} />
                ) : (
                  <Volume2 className={controlSizes.icon} />
                )}
              </RoundControlButton>
            ) : (
              <div className="flex shrink-0 items-center gap-1.5">
                <RoundControlButton
                  theme={theme}
                  size="small"
                  variant="neutral"
                  aria-label={t('media.previousTrack')}
                  disabled={!canPreviousTrack}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPrevious();
                  }}
                  className="backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                  iconStyle={controlIconStyle}
                  style={subduedFallback ? undefined : activeUtilityButtonStyle}
                >
                  <SkipBack className={controlSizes.icon} />
                </RoundControlButton>

                <RoundControlButton
                  theme={theme}
                  size="small"
                  variant="neutral"
                  aria-label={t('media.nextTrack')}
                  disabled={!canNextTrack}
                  onClick={(event) => {
                    event.stopPropagation();
                    onNext();
                  }}
                  className="backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                  iconStyle={controlIconStyle}
                  style={subduedFallback ? undefined : activeUtilityButtonStyle}
                >
                  <SkipForward className={controlSizes.icon} />
                </RoundControlButton>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

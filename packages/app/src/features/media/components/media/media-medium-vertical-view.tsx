import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { Slider } from '@navet/app/components/primitives/slider';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MediaEntityTypeKey } from '../media-card/get-media-entity-type-key';
import { MediaArtworkSurface } from './media-artwork-surface';
import { getMediaDisplayVolume } from './media-card-style-utils';
import { MediaEntityHeader } from './media-entity-header';
import { MediaMarqueeText } from './media-marquee-text';
import { getMediaReadableForeground } from './media-readable-foreground';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import { useArtworkEdgeBlur } from './use-artwork-edge-blur';
import {
  getMediaArtworkPaletteSource,
  useMediaArtworkColors,
  withAlpha,
} from './use-media-artwork-colors';
import { useMediaVolumeMode } from './use-media-volume-mode';
import { useStableMediaArtwork } from './use-stable-media-artwork';

interface MediaMediumVerticalViewProps {
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
  onOpenDialog?: () => void;
  onToggleMute: () => void;
  onPrevious: () => void;
  canPreviousTrack: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  canNextTrack: boolean;
  onSeek: (elapsedSeconds: number) => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
}

export function MediaMediumVerticalView({
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
  onOpenDialog,
  onToggleMute,
  onPrevious,
  canPreviousTrack,
  onTogglePlay,
  onNext,
  canNextTrack,
  onSeek,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: MediaMediumVerticalViewProps) {
  const { t } = useI18n();
  const { containerRef, isVolumeMode, registerVolumeInteraction, toggleVolumeMode } =
    useMediaVolumeMode();
  const displayVolume = getMediaDisplayVolume(volume, isMuted);
  const durationLabel = formatMediaTime(Math.max(durationSeconds, elapsedSeconds));
  const hasSeekDuration = durationSeconds > 0;
  const [pendingSeek, setPendingSeek] = useState(elapsedSeconds);
  const [isSeeking, setIsSeeking] = useState(false);
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const stableArtwork = useStableMediaArtwork(artwork);
  const artworkEdgeAnalysis = useArtworkEdgeBlur(stableArtwork, {
    preferEdge: 'bottom',
  });
  const paletteArtwork = getMediaArtworkPaletteSource(stableArtwork, artworkResource);
  const palette = useMediaArtworkColors(paletteArtwork, theme, entityId, `${title}::${artist}`);
  const textSideBackgroundColor = artworkEdgeAnalysis.preferredEdgeColor ?? palette.gradientEnd;
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: textSideBackgroundColor,
  });
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('medium');
  const subduedFallback = !stableArtwork;
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
    backgroundColorOverride: textSideBackgroundColor,
  });
  const resolvedTitleColor = readableForeground.titleColor;
  const resolvedSubtitleColor = readableForeground.subtitleColor;
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
  const glassDepthOverlay =
    theme === 'glass' ? (
      <>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04)_24%,rgba(255,255,255,0.015)_100%)]" />
        <div className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-16px_30px_rgba(255,255,255,0.03)]" />
      </>
    ) : null;

  useEffect(() => {
    if (!isSeeking) {
      setPendingSeek(elapsedSeconds);
    }
  }, [elapsedSeconds, isSeeking]);

  return (
    <div
      ref={containerRef}
      className="relative -m-3 flex h-[calc(100%+1.5rem)] flex-col overflow-hidden rounded-[inherit]"
    >
      <MediaArtworkSurface
        artwork={stableArtwork}
        onArtworkError={onArtworkError}
        palette={palette}
        theme={theme}
        layout="stacked"
        artRegionClassName="h-[52%]"
        imagePaddingClassName=""
        imageClassName="object-cover object-top"
        subduedFallback={!stableArtwork && !isActive}
      />
      {glassDepthOverlay}

      <div className="relative z-[2] flex h-full flex-col">
        <div className="h-[52%]" />

        <div className="flex min-h-0 flex-1 flex-col p-3">
          <div className="flex items-start justify-between gap-3">
            <MediaEntityHeader
              entityName={entityName}
              entityType={t(entityTypeKey)}
              size="medium-vertical"
              isActive={isActive}
              accentColor={palette.highlight}
              titleStyle={readableForeground.titleStyle}
              subtitleStyle={readableForeground.subtitleStyle}
            />
            <div className="flex shrink-0 items-center gap-3 self-start">
              <MediaVisualizerButton
                isPlaying={isPlaying}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDialog?.();
                }}
                className={iconTone}
                style={readableForeground.titleStyle}
              />
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <MediaMarqueeText
                  text={title}
                  className={`text-xs font-semibold ${iconTone}`}
                  style={readableForeground.titleStyle}
                />
                <MediaMarqueeText
                  text={artist}
                  className={`mt-0.5 text-xs ${subtitleTone}`}
                  threshold={24}
                  style={readableForeground.subtitleStyle}
                />
              </div>

              <div className="relative">
                <RoundControlButton
                  theme={theme}
                  size="large"
                  variant="neutral"
                  aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTogglePlay();
                  }}
                  className="h-10 w-10 backdrop-blur-xl transition-colors"
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
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 text-[10px] tabular-nums ${subtitleTone}`}
                style={readableForeground.subtitleStyle}
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
                  if (hasSeekDuration) {
                    setPendingSeek(value);
                  }
                }}
                onValueCommit={(value) => {
                  if (hasSeekDuration) {
                    onSeek(value);
                  }
                }}
                onInteractionStart={() => {
                  if (hasSeekDuration) {
                    setIsSeeking(true);
                  }
                }}
                onInteractionEnd={() => {
                  if (hasSeekDuration) {
                    setIsSeeking(false);
                  }
                }}
                disabled={!hasSeekDuration}
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
                style={readableForeground.subtitleStyle}
              >
                {hasSeekDuration ? durationLabel : formatMediaTime(0)}
              </span>
            </div>
          </div>

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
              <Volume2 className={controlSizes.icon} />
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
                onClick={(event) => {
                  event.stopPropagation();
                  registerVolumeInteraction();
                  onToggleMute();
                }}
                className="backdrop-blur-xl transition-colors"
                iconStyle={controlIconStyle}
                style={muteButtonStyle}
              >
                <VolumeX className={controlSizes.icon} />
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
        </div>
      </div>
    </div>
  );
}

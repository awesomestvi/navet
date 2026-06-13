import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { Slider } from '@navet/app/components/primitives/slider';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  RepeatOff,
  Shuffle,
  SkipBack,
  SkipForward,
  Slash,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MediaEntityTypeKey } from '../media-card/get-media-entity-type-key';
import { getMediaDisplayVolume } from './media-card-style-utils';
import { MediaEntityHeader } from './media-entity-header';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import { getMediaReadableForeground } from './media-readable-foreground';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import {
  getMediaArtworkPaletteSource,
  useMediaArtworkColors,
  withAlpha,
} from './use-media-artwork-colors';
import { useStableMediaArtwork } from './use-stable-media-artwork';

interface MediaLargeViewProps {
  entityId: string;
  artwork?: string | null;
  artworkResource?: ResolvedPlatformResource | null;
  onArtworkError?: (imageUrl?: string | null) => void;
  title: string;
  artist: string;
  entityName: string;
  entityTypeKey: MediaEntityTypeKey;
  isActive: boolean;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  elapsedSeconds: number;
  durationSeconds: number;
  theme: ThemeType;
  onOpenDialog: () => void;
  repeatMode: 'off' | 'one' | 'all';
  shuffleEnabled: boolean;
  canRepeat: boolean;
  canShuffle: boolean;
  onCycleRepeat: () => void;
  onSeek: (elapsedSeconds: number) => void;
  onToggleShuffle: () => void;
  onPrevious: () => void;
  canPreviousTrack: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  canNextTrack: boolean;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
}

export function MediaLargeView({
  entityId,
  artwork,
  artworkResource,
  onArtworkError,
  title,
  artist,
  entityName,
  entityTypeKey,
  isActive,
  isPlaying,
  volume,
  isMuted,
  elapsedSeconds,
  durationSeconds,
  theme,
  onOpenDialog,
  repeatMode,
  shuffleEnabled,
  canRepeat,
  canShuffle,
  onCycleRepeat,
  onSeek,
  onToggleShuffle,
  onPrevious,
  canPreviousTrack,
  onTogglePlay,
  onNext,
  canNextTrack,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: MediaLargeViewProps) {
  const { t } = useI18n();
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const stableArtwork = useStableMediaArtwork(artwork);
  const paletteArtwork = getMediaArtworkPaletteSource(stableArtwork, artworkResource);
  const palette = useMediaArtworkColors(paletteArtwork, theme, entityId, `${title}::${artist}`);
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: palette.gradientEnd,
  });
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const displayVolume = getMediaDisplayVolume(volume, isMuted);
  const durationLabel = formatMediaTime(Math.max(durationSeconds, elapsedSeconds));
  const hasSeekDuration = durationSeconds > 0;
  const [pendingSeek, setPendingSeek] = useState(elapsedSeconds);
  const [isSeeking, setIsSeeking] = useState(false);
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('large');
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
  const resolvedTitleColor = readableForeground.titleColor;
  const resolvedSubtitleColor = readableForeground.subtitleColor;
  const controlIconStyle = { color: resolvedTitleColor };
  const neutralButtonStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(resolvedSubtitleColor, 0.18),
    boxShadow: `inset 0 1px 0 ${withAlpha(resolvedTitleColor, 0.12)}`,
  };
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
  const backgroundBaseStyle = {
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
    background: subduedFallback
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
    background: subduedFallback
      ? `linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.1) 42%, rgba(0,0,0,0.16) 68%, rgba(0,0,0,0.28) 100%)`
      : `radial-gradient(circle at 50% 46%, ${withAlpha(
          palette.highlight,
          0.03
        )} 0%, transparent 34%), linear-gradient(180deg, rgba(0,0,0,0.035) 0%, rgba(0,0,0,0.01) 42%, rgba(0,0,0,0.03) 68%, rgba(0,0,0,0.07) 100%)`,
  };
  const artworkAtmosphereStyle = {
    background: `radial-gradient(circle at 50% 50%, ${withAlpha(
      palette.dominant,
      subduedFallback ? 0.05 : 0.12
    )} 0%, transparent 72%)`,
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

  const offToggleSlashClassName = 'absolute inset-0 m-auto h-3.5 w-3.5 stroke-[2.25]';
  const mirroredOffToggleSlashStyle = { transform: 'scaleX(-1)' };

  return (
    <div className="relative -m-3 flex h-[calc(100%+1.5rem)] flex-col overflow-hidden rounded-[inherit]">
      <div className="pointer-events-none absolute inset-0" style={backgroundBaseStyle} />
      {stableArtwork ? (
        <img
          src={stableArtwork}
          alt=""
          aria-hidden="true"
          onError={() => onArtworkError?.(stableArtwork)}
          className="pointer-events-none absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-56 saturate-[1.01] contrast-[0.98]"
          decoding="async"
        />
      ) : (
        <MediaFallbackArtwork
          palette={palette}
          className={`absolute inset-0 ${subduedFallback ? 'opacity-28' : 'opacity-72'}`}
          style={{ transform: 'scale(1.02)' }}
        />
      )}
      <div className="pointer-events-none absolute inset-0" style={artworkAtmosphereStyle} />
      <div className="pointer-events-none absolute inset-0" style={colorTintStyle} />
      <div className="pointer-events-none absolute inset-0" style={readabilityGradientStyle} />
      {glassDepthOverlay}

      <div className="relative z-[2] flex h-full min-h-0 flex-col p-3">
        <div className="flex min-h-0 flex-1 flex-col justify-end">
          <div className="flex items-center justify-between gap-3">
            <MediaEntityHeader
              entityName={entityName}
              entityType={t(entityTypeKey)}
              size="large"
              isActive={isActive}
              accentColor={palette.highlight}
              titleStyle={readableForeground.titleStyle}
              subtitleStyle={readableForeground.subtitleStyle}
            />
            <div className="flex shrink-0 items-center gap-2.5 self-start">
              <MediaVisualizerButton
                isPlaying={isPlaying}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDialog();
                }}
                className={iconTone}
                style={readableForeground.titleStyle}
              />
            </div>
          </div>

          <div className="mt-2.5 min-w-0">
            <div
              className={`truncate text-sm font-semibold ${iconTone}`}
              style={readableForeground.titleStyle}
            >
              {title}
            </div>
            <div
              className={`truncate text-xs ${subtitleTone}`}
              style={readableForeground.subtitleStyle}
            >
              {artist}
            </div>
          </div>

          <div className="mt-1.5">
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
              rootClassName="relative flex h-4.5 w-full items-center touch-none select-none"
              trackClassName="relative h-[3px] grow rounded-full"
              rangeClassName="absolute h-full rounded-full"
              thumbClassName="block h-3.5 w-3.5 rounded-full outline-none"
              touchThumbClassName="block h-6 w-6 rounded-full outline-none"
              trackStyle={trackBaseStyle}
              rangeStyle={trackFillStyle}
              thumbStyle={trackThumbStyle}
            />
            <div
              className={`mt-px flex items-center justify-between text-[10px] ${subtitleTone}`}
              style={readableForeground.subtitleStyle}
            >
              <span>{formatMediaTime(hasSeekDuration ? Math.max(0, pendingSeek) : 0)}</span>
              <span>{hasSeekDuration ? durationLabel : formatMediaTime(0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {canShuffle ? (
              <RoundControlButton
                theme={theme}
                size="small"
                variant="neutral"
                aria-label={shuffleEnabled ? t('media.shuffle') : t('media.linearPlayback')}
                aria-pressed={shuffleEnabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleShuffle();
                }}
                className="backdrop-blur-xl transition-colors"
                iconStyle={controlIconStyle}
                style={
                  subduedFallback
                    ? undefined
                    : shuffleEnabled
                      ? activeUtilityButtonStyle
                      : neutralButtonStyle
                }
              >
                {shuffleEnabled ? (
                  <Shuffle className={controlSizes.icon} />
                ) : (
                  <span className="relative flex items-center justify-center">
                    <Shuffle className={controlSizes.icon} />
                    <Slash
                      className={offToggleSlashClassName}
                      style={mirroredOffToggleSlashStyle}
                    />
                  </span>
                )}
              </RoundControlButton>
            ) : null}

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
                className="h-10.5 w-10.5 backdrop-blur-xl transition-colors"
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

            {canRepeat ? (
              <RoundControlButton
                theme={theme}
                size="small"
                variant="neutral"
                aria-label={
                  repeatMode === 'one'
                    ? t('media.repeatOne')
                    : repeatMode === 'all'
                      ? t('media.repeatAll')
                      : t('media.repeatOff')
                }
                aria-pressed={repeatMode !== 'off'}
                onClick={(event) => {
                  event.stopPropagation();
                  onCycleRepeat();
                }}
                className="backdrop-blur-xl transition-colors"
                iconStyle={controlIconStyle}
                style={
                  subduedFallback
                    ? undefined
                    : repeatMode !== 'off'
                      ? activeUtilityButtonStyle
                      : neutralButtonStyle
                }
              >
                {repeatMode === 'off' ? (
                  <RepeatOff className={controlSizes.icon} />
                ) : repeatMode === 'one' ? (
                  <Repeat1 className={controlSizes.icon} />
                ) : (
                  <Repeat className={controlSizes.icon} />
                )}
              </RoundControlButton>
            ) : null}
          </div>

          <div className="flex min-w-[34%] items-center gap-1.5">
            <RoundControlButton
              theme={theme}
              size="small"
              variant="neutral"
              aria-label={isMuted ? t('media.unmuteVolume') : t('media.muteVolume')}
              onClick={(event) => {
                event.stopPropagation();
                onToggleMute();
              }}
              className="backdrop-blur-xl transition-colors"
              iconStyle={controlIconStyle}
              style={subduedFallback ? undefined : muteButtonStyle}
            >
              {isMuted ? (
                <VolumeX className={controlSizes.icon} />
              ) : (
                <Volume2 className={controlSizes.icon} />
              )}
            </RoundControlButton>

            <div className="relative flex-1">
              <Slider
                value={displayVolume}
                ariaLabel={t('media.volume')}
                onValueChange={onVolumeChange}
                onInteractionStart={onVolumeInteractionStart}
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
          </div>
        </div>
      </div>
    </div>
  );
}

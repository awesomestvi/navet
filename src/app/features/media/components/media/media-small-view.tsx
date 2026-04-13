import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { Slider } from '@/app/components/primitives/slider';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { isMediaPlayerProxyUrl } from '@/app/utils/home-assistant-url';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import { MediaMarqueeText } from './media-marquee-text';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import { useMediaArtworkColors, withAlpha } from './use-media-artwork-colors';
import { useMediaVolumeMode } from './use-media-volume-mode';

interface MediaSmallViewProps {
  entityId: string;
  artwork?: string | null;
  onArtworkError?: (imageUrl?: string | null) => void;
  playerName: string;
  room: string;
  title: string;
  artist: string;
  isActive: boolean;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  elapsedSeconds: number;
  durationSeconds: number;
  theme: ThemeType;
  onToggleMute: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
  onOpenDialog: () => void;
}

export function MediaSmallView({
  entityId,
  artwork,
  onArtworkError,
  playerName,
  room,
  title,
  artist,
  isActive,
  isPlaying,
  volume,
  isMuted,
  elapsedSeconds,
  durationSeconds,
  theme,
  onToggleMute,
  onPrevious,
  onTogglePlay,
  onNext,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
  onOpenDialog,
}: MediaSmallViewProps) {
  const { t } = useI18n();
  const [showDeferredBackdrop, setShowDeferredBackdrop] = useState(false);
  const { containerRef, isVolumeMode, registerVolumeInteraction, toggleVolumeMode } =
    useMediaVolumeMode();

  useEffect(() => {
    setShowDeferredBackdrop(false);

    if (!artwork) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowDeferredBackdrop(true);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [artwork]);

  const displayVolume = Math.max(0, Math.min(100, isMuted ? 0 : volume));
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const displayRemaining = formatMediaTime(Math.max(0, durationSeconds - elapsedSeconds));
  const palette = useMediaArtworkColors(artwork, theme, entityId, `${title}::${artist}`);
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: palette.gradientEnd,
  });
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('medium');
  const subduedFallback = !artwork && !isActive;
  const neutralButtonStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(palette.highlight, 0.14),
    boxShadow: `inset 0 1px 0 ${withAlpha(palette.highlight, 0.12)}`,
  };
  const volumeToggleButtonStyle = isVolumeMode
    ? {
        background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
          palette.vibrant,
          0.44
        )} 100%)`,
        borderColor: withAlpha(palette.highlight, 0.22),
        boxShadow: `0 10px 28px -18px ${withAlpha(palette.vibrant, 0.55)}, inset 0 1px 0 ${withAlpha(
          palette.highlight,
          0.18
        )}`,
      }
    : neutralButtonStyle;
  const muteButtonStyle = isMuted
    ? {
        background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
          palette.vibrant,
          0.44
        )} 100%)`,
        borderColor: withAlpha(palette.highlight, 0.22),
        boxShadow: `0 10px 28px -18px ${withAlpha(palette.vibrant, 0.55)}, inset 0 1px 0 ${withAlpha(
          palette.highlight,
          0.18
        )}`,
      }
    : neutralButtonStyle;
  const playButtonStyle = {
    backgroundColor: withAlpha(palette.vibrant, 0.24),
    borderColor: withAlpha(palette.highlight, 0.18),
    boxShadow: `inset 0 1px 0 ${withAlpha(palette.highlight, 0.14)}`,
  };
  const trackBaseStyle = { backgroundColor: withAlpha(palette.highlight, 0.2) };
  const trackFillStyle = {
    background: `linear-gradient(90deg, ${palette.highlight} 0%, ${palette.vibrant} 100%)`,
    boxShadow: `0 0 18px ${withAlpha(palette.vibrant, 0.26)}`,
  };
  const trackThumbStyle = {
    backgroundColor: palette.highlight,
    boxShadow: `0 0 0 1px ${withAlpha(palette.highlight, 0.2)}, 0 0 14px ${withAlpha(
      palette.vibrant,
      0.32
    )}`,
  };
  const shouldRenderDecorativeArtworkLayers =
    artwork !== null &&
    artwork !== undefined &&
    (import.meta.env.DEV || !isMediaPlayerProxyUrl(artwork));
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

  return (
    <div
      ref={containerRef}
      className="relative -m-4 flex h-[calc(100%+2rem)] flex-col overflow-hidden rounded-[inherit]"
    >
      <div className="pointer-events-none absolute inset-0" style={backgroundBaseStyle} />
      {artwork ? (
        showDeferredBackdrop && shouldRenderDecorativeArtworkLayers ? (
          <>
            <img
              src={artwork}
              alt=""
              aria-hidden="true"
              onError={() => onArtworkError?.(artwork)}
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-58 saturate-[1.02] contrast-[0.98]"
              decoding="async"
            />
            <img
              src={artwork}
              alt=""
              aria-hidden="true"
              onError={() => onArtworkError?.(artwork)}
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.12] object-cover opacity-16 blur-[26px] saturate-[1.02]"
              decoding="async"
            />
          </>
        ) : null
      ) : (
        <MediaFallbackArtwork
          palette={palette}
          compact
          className={`absolute inset-0 ${subduedFallback ? 'opacity-28' : 'opacity-72'}`}
          style={{ transform: 'scale(1.02)' }}
        />
      )}
      <div className="pointer-events-none absolute inset-0" style={artworkAtmosphereStyle} />
      <div className="pointer-events-none absolute inset-0" style={colorTintStyle} />
      <div className="pointer-events-none absolute inset-0" style={readabilityGradientStyle} />

      <div className="relative flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`truncate text-[10px] tracking-normal ${subtitleTone}`}
              style={{ color: textTokens.subtitleColor }}
            >
              {playerName}
            </div>
            <div
              className={`truncate text-xs ${subtitleTone}`}
              style={{ color: textTokens.subtitleColor }}
            >
              {room || t('media.room')}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <MediaVisualizerButton
              isPlaying={isPlaying}
              onClick={(event) => {
                event.stopPropagation();
                onOpenDialog();
              }}
              className={iconTone}
              style={{ color: textTokens.titleColor }}
            />
            {isPlaying && durationSeconds > 0 && (
              <span className={`text-[11px] ${subtitleTone}`}>{displayRemaining}</span>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <MediaMarqueeText
              text={title}
              className={`text-xs font-semibold ${iconTone}`}
              style={{ color: textTokens.titleColor }}
            />
            <MediaMarqueeText
              text={artist}
              className={`mt-0.5 text-[10px] ${subtitleTone}`}
              threshold={24}
              style={{ color: textTokens.subtitleColor }}
            />
          </div>

          <div className="relative">
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="neutral"
              aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePlay();
              }}
              className="h-10.5 w-10.5 border backdrop-blur-xl transition-colors"
              iconClassName="!text-white/90"
              style={subduedFallback ? undefined : playButtonStyle}
            >
              {isPlaying ? (
                <Pause className={primaryControlSizes.icon} fill="currentColor" />
              ) : (
                <Play className={primaryControlSizes.icon} fill="currentColor" />
              )}
            </RoundControlButton>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <RoundControlButton
            theme={theme}
            size="small"
            variant="neutral"
            aria-label={t('media.volume')}
            onClick={(event) => {
              event.stopPropagation();
              toggleVolumeMode();
            }}
            className="border backdrop-blur-xl transition-colors"
            iconClassName="!text-white"
            style={volumeToggleButtonStyle}
          >
            <Volume2 className={controlSizes.icon} />
          </RoundControlButton>

          <div className="relative flex-1">
            {isVolumeMode ? (
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
            ) : null}
          </div>

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
              className="border backdrop-blur-xl transition-colors"
              iconClassName="!text-white"
              style={muteButtonStyle}
            >
              <VolumeX className={controlSizes.icon} />
            </RoundControlButton>
          ) : (
            <>
              <RoundControlButton
                theme={theme}
                size="small"
                variant="neutral"
                aria-label={t('media.previousTrack')}
                onClick={(event) => {
                  event.stopPropagation();
                  onPrevious();
                }}
                className="border backdrop-blur-xl transition-colors"
                iconClassName="!text-white/90"
                style={neutralButtonStyle}
              >
                <SkipBack className={controlSizes.icon} />
              </RoundControlButton>

              <RoundControlButton
                theme={theme}
                size="small"
                variant="neutral"
                aria-label={t('media.nextTrack')}
                onClick={(event) => {
                  event.stopPropagation();
                  onNext();
                }}
                className="border backdrop-blur-xl transition-colors"
                iconClassName="!text-white/90"
                style={neutralButtonStyle}
              >
                <SkipForward className={controlSizes.icon} />
              </RoundControlButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

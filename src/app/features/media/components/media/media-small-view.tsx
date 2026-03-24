import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { RoundControlButton } from '@/app/components/shared/round-control-button';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { isMediaPlayerProxyUrl } from '@/app/utils/home-assistant-url';
import { getMediaControlStyles } from './media-control-styles';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import { MediaMarqueeText } from './media-marquee-text';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import { useMediaArtworkColors, withAlpha } from './use-media-artwork-colors';

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
  elapsedSeconds: number;
  durationSeconds: number;
  theme: ThemeType;
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
  elapsedSeconds,
  durationSeconds,
  theme,
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

  const displayVolume = Math.max(0, Math.min(100, volume));
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const displayRemaining = formatMediaTime(Math.max(0, durationSeconds - elapsedSeconds));
  const controls = getMediaControlStyles(theme);
  const palette = useMediaArtworkColors(artwork, theme, `${entityId}::${title}::${artist}`);
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('medium');
  const subduedFallback = !artwork && !isActive;
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
      : `linear-gradient(160deg, ${withAlpha(palette.dominant, 0.52)} 0%, ${withAlpha(
          palette.dominant,
          0.3
        )} 48%, ${withAlpha(palette.darkMuted, 0.34)} 100%)`,
  };
  const readabilityGradientStyle = {
    background: subduedFallback
      ? `linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.1) 42%, rgba(0,0,0,0.16) 68%, rgba(0,0,0,0.28) 100%)`
      : `radial-gradient(circle at 50% 46%, ${withAlpha(
          palette.highlight,
          0.14
        )} 0%, transparent 34%), linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 42%, rgba(0,0,0,0.14) 68%, rgba(0,0,0,0.24) 100%)`,
  };
  const artworkAtmosphereStyle = {
    background: `radial-gradient(circle at 50% 50%, ${withAlpha(
      palette.dominant,
      subduedFallback ? 0.05 : 0.12
    )} 0%, transparent 72%)`,
  };

  return (
    <div className="relative -m-4 flex h-[calc(100%+2rem)] flex-col overflow-hidden rounded-[inherit]">
      <div className="pointer-events-none absolute inset-0" style={backgroundBaseStyle} />
      {artwork ? (
        showDeferredBackdrop && shouldRenderDecorativeArtworkLayers ? (
          <>
            <img
              src={artwork}
              alt=""
              aria-hidden="true"
              onError={() => onArtworkError?.(artwork)}
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-36 saturate-[0.98] contrast-[0.94]"
              decoding="async"
            />
            <img
              src={artwork}
              alt=""
              aria-hidden="true"
              onError={() => onArtworkError?.(artwork)}
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.12] object-cover opacity-22 blur-[26px] saturate-[1.02]"
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
            <div className={`truncate text-[10px] uppercase tracking-[0.16em] ${subtitleTone}`}>
              {playerName}
            </div>
            <div className={`truncate text-xs ${subtitleTone}`}>{room || t('media.room')}</div>
          </div>
          <div className="flex items-center gap-2.5">
            <MediaVisualizerButton
              isPlaying={isPlaying}
              onClick={(event) => {
                event.stopPropagation();
                onOpenDialog();
              }}
              className={iconTone}
            />
            {isPlaying && durationSeconds > 0 && (
              <span className={`text-[11px] ${subtitleTone}`}>{displayRemaining}</span>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <MediaMarqueeText text={title} className={`text-sm font-medium ${iconTone}`} />
            <MediaMarqueeText
              text={artist}
              className={`mt-0.5 text-[13px] ${subtitleTone}`}
              threshold={24}
            />
          </div>

          <RoundControlButton
            theme={theme}
            size="medium"
            variant="emphasis"
            aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
            onClick={(event) => {
              event.stopPropagation();
              onTogglePlay();
            }}
            className="h-12 w-12 hover:scale-[1.03] active:scale-95"
          >
            {isPlaying ? (
              <Pause className={primaryControlSizes.icon} fill="currentColor" />
            ) : (
              <Play className={primaryControlSizes.icon} fill="currentColor" />
            )}
          </RoundControlButton>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <RoundControlButton
            theme={theme}
            size="small"
            variant="neutral"
            aria-label={t('media.previousTrack')}
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            className="transition-colors"
          >
            <SkipBack className={controlSizes.icon} />
          </RoundControlButton>

          <div className="relative flex-1">
            <div
              className={`absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 ${controls.trackBase}`}
            />
            <div
              className={`absolute left-0 top-1/2 h-px -translate-y-1/2 ${controls.trackFill}`}
              style={{ width: `${displayVolume}%` }}
            />
            <div
              className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${controls.trackThumb}`}
              style={{ left: `calc(${displayVolume}% - 5px)` }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={displayVolume}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={onVolumeInteractionStart}
              onTouchStart={onVolumeInteractionStart}
              onKeyDown={onVolumeInteractionStart}
              onMouseUp={onVolumeInteractionEnd}
              onTouchEnd={onVolumeInteractionEnd}
              onKeyUp={onVolumeInteractionEnd}
              onBlur={onVolumeInteractionEnd}
              onChange={(event) => onVolumeChange(parseInt(event.target.value, 10))}
              className="absolute inset-0 h-6 w-full -translate-y-1/2 cursor-pointer opacity-0"
            />
          </div>

          <RoundControlButton
            theme={theme}
            size="small"
            variant="neutral"
            aria-label={t('media.nextTrack')}
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            className="transition-colors"
          >
            <SkipForward className={controlSizes.icon} />
          </RoundControlButton>
        </div>
      </div>
    </div>
  );
}

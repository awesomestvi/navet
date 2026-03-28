import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { RoundControlButton } from '@/app/components/shared/round-control-button';
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

interface MediaLargeViewProps {
  entityId: string;
  artwork?: string | null;
  onArtworkError?: (imageUrl?: string | null) => void;
  title: string;
  artist: string;
  playerName: string;
  room: string;
  isActive: boolean;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  elapsedSeconds: number;
  durationSeconds: number;
  theme: ThemeType;
  onOpenDialog: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
}

export function MediaLargeView({
  entityId,
  artwork,
  onArtworkError,
  title,
  artist,
  playerName,
  room,
  isActive,
  isPlaying,
  volume,
  isMuted,
  elapsedSeconds,
  durationSeconds,
  theme,
  onOpenDialog,
  onPrevious,
  onTogglePlay,
  onNext,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: MediaLargeViewProps) {
  const { t } = useI18n();
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const palette = useMediaArtworkColors(artwork, theme, `${entityId}::${title}::${artist}`);
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: palette.gradientEnd,
  });
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const displayVolume = Math.max(0, Math.min(100, isMuted ? 0 : volume));
  const elapsedLabel = formatMediaTime(Math.max(0, elapsedSeconds));
  const remainingLabel = formatMediaTime(Math.max(0, durationSeconds - elapsedSeconds));
  const durationLabel = formatMediaTime(Math.max(durationSeconds, elapsedSeconds));
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('large');
  const subduedFallback = !artwork && !isActive;
  const shouldRenderDecorativeArtworkLayers =
    artwork !== null &&
    artwork !== undefined &&
    (import.meta.env.DEV || !isMediaPlayerProxyUrl(artwork));
  const neutralButtonStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(palette.highlight, 0.14),
    boxShadow: `inset 0 1px 0 ${withAlpha(palette.highlight, 0.12)}`,
  };
  const playButtonStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.34)} 0%, ${withAlpha(
      palette.vibrant,
      0.62
    )} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.22),
    boxShadow: `0 18px 42px -18px ${withAlpha(palette.vibrant, 0.7)}, inset 0 1px 0 ${withAlpha(
      palette.highlight,
      0.22
    )}`,
  };
  const playGlowStyle = {
    background: `radial-gradient(circle, ${withAlpha(palette.vibrant, 0.48)} 0%, ${withAlpha(
      palette.highlight,
      0.18
    )} 38%, transparent 74%)`,
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
    <div className="relative -m-6 flex h-[calc(100%+3rem)] flex-col overflow-hidden rounded-[inherit]">
      <div className="pointer-events-none absolute inset-0" style={backgroundBaseStyle} />
      {artwork ? (
        shouldRenderDecorativeArtworkLayers ? (
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
          className={`absolute inset-0 ${subduedFallback ? 'opacity-28' : 'opacity-72'}`}
          style={{ transform: 'scale(1.02)' }}
        />
      )}
      <div className="pointer-events-none absolute inset-0" style={artworkAtmosphereStyle} />
      <div className="pointer-events-none absolute inset-0" style={colorTintStyle} />
      <div className="pointer-events-none absolute inset-0" style={readabilityGradientStyle} />

      <div className="relative z-[1] flex h-full min-h-0 flex-col px-5 pb-5 pt-4">
        <div className="flex min-h-0 flex-1 flex-col justify-end">
          <div className="flex items-center justify-between gap-3">
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
              <span className={`text-[11px] ${subtitleTone}`}>-{remainingLabel}</span>
            </div>
          </div>

          <div className="mt-3 min-w-0">
            <MediaMarqueeText
              text={title}
              className={`text-sm font-semibold ${iconTone}`}
              style={{ color: textTokens.titleColor }}
            />
            <MediaMarqueeText
              text={artist}
              className={`text-xs ${subtitleTone}`}
              threshold={28}
              style={{ color: textTokens.subtitleColor }}
            />
          </div>

          <div className="mt-3">
            <div className="relative">
              <div
                className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
                style={trackBaseStyle}
              />
              <div
                className="absolute left-0 top-1/2 h-px -translate-y-1/2"
                style={{
                  ...trackFillStyle,
                  width:
                    durationSeconds > 0
                      ? `${Math.max(0, Math.min(100, (elapsedSeconds / durationSeconds) * 100))}%`
                      : '0%',
                }}
              />
            </div>
            <div className={`mt-1.5 flex items-center justify-between text-[11px] ${subtitleTone}`}>
              <span>{elapsedLabel}</span>
              <span>{durationLabel}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
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

            <div className="relative">
              {!subduedFallback && (
                <div
                  className="pointer-events-none absolute inset-[-28%] rounded-full blur-3xl"
                  style={playGlowStyle}
                />
              )}
              <RoundControlButton
                theme={theme}
                size="large"
                variant="emphasis"
                aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePlay();
                }}
                className={`h-12 w-12 hover:scale-[1.03] active:scale-95 ${
                  subduedFallback ? '' : 'border backdrop-blur-xl'
                }`}
                iconClassName={subduedFallback ? undefined : '!text-white'}
                style={subduedFallback ? undefined : playButtonStyle}
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
              className="border backdrop-blur-xl transition-colors"
              iconClassName="!text-white/90"
              style={neutralButtonStyle}
            >
              {isMuted ? (
                <VolumeX className={controlSizes.icon} />
              ) : (
                <Volume2 className={controlSizes.icon} />
              )}
            </RoundControlButton>

            <div className="relative flex-1">
              <div
                className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
                style={trackBaseStyle}
              />
              <div
                className="absolute left-0 top-1/2 h-px -translate-y-1/2"
                style={{ ...trackFillStyle, width: `${displayVolume}%` }}
              />
              <div
                className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                style={{ ...trackThumbStyle, left: `calc(${displayVolume}% - 5px)` }}
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
          </div>
        </div>
      </div>
    </div>
  );
}

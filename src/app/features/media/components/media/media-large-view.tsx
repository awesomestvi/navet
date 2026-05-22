import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { Slider } from '@/app/components/primitives/slider';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { isMediaPlayerProxyUrl } from '@/app/utils/home-assistant-url';
import type { MediaEntityTypeKey } from '../media-card/get-media-entity-type-key';
import { getMediaDisplayVolume, getMediaProgressPercent } from './media-card-style-utils';
import { MediaEntityHeader } from './media-entity-header';
import { MediaFallbackArtwork } from './media-fallback-artwork';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import { useMediaArtworkColors, withAlpha } from './use-media-artwork-colors';
import { useStableMediaArtwork } from './use-stable-media-artwork';

interface MediaLargeViewProps {
  entityId: string;
  artwork?: string | null;
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
  const palette = useMediaArtworkColors(stableArtwork, theme, entityId, `${title}::${artist}`);
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: palette.gradientEnd,
  });
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const displayVolume = getMediaDisplayVolume(volume, isMuted);
  const elapsedLabel = formatMediaTime(Math.max(0, elapsedSeconds));
  const durationLabel = formatMediaTime(Math.max(durationSeconds, elapsedSeconds));
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('large');
  const subduedFallback = !stableArtwork && !isActive;
  const fallbackTitleColor =
    theme === 'light' && subduedFallback ? '#0f172a' : textTokens.titleColor;
  const fallbackSubtitleColor =
    theme === 'light' && subduedFallback ? '#475569' : textTokens.subtitleColor;
  const controlIconStyle = { color: fallbackTitleColor };
  const shouldRenderDecorativeArtworkLayers =
    stableArtwork !== null &&
    stableArtwork !== undefined &&
    (import.meta.env.DEV || !isMediaPlayerProxyUrl(stableArtwork));
  const neutralButtonStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(fallbackSubtitleColor, 0.18),
    boxShadow: `inset 0 1px 0 ${withAlpha(fallbackTitleColor, 0.12)}`,
  };
  const playButtonStyle = {
    backgroundColor: withAlpha(palette.vibrant, 0.24),
    borderColor: withAlpha(fallbackSubtitleColor, 0.22),
    boxShadow: `inset 0 1px 0 ${withAlpha(fallbackTitleColor, 0.14)}`,
  };
  const trackBaseStyle = { backgroundColor: withAlpha(fallbackSubtitleColor, 0.24) };
  const trackFillStyle = {
    background: `linear-gradient(90deg, ${fallbackTitleColor} 0%, ${fallbackSubtitleColor} 100%)`,
    boxShadow: `0 0 18px ${withAlpha(fallbackTitleColor, 0.18)}`,
  };
  const trackThumbStyle = {
    backgroundColor: fallbackTitleColor,
    boxShadow: `0 0 0 1px ${withAlpha(fallbackTitleColor, 0.22)}, 0 0 14px ${withAlpha(
      fallbackTitleColor,
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

  return (
    <div className="relative -m-3 flex h-[calc(100%+1.5rem)] flex-col overflow-hidden rounded-[inherit]">
      <div className="pointer-events-none absolute inset-0" style={backgroundBaseStyle} />
      {stableArtwork ? (
        shouldRenderDecorativeArtworkLayers ? (
          <>
            <img
              src={stableArtwork}
              alt=""
              aria-hidden="true"
              onError={() => onArtworkError?.(stableArtwork)}
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-58 saturate-[1.02] contrast-[0.98]"
              decoding="async"
            />
            <img
              src={stableArtwork}
              alt=""
              aria-hidden="true"
              onError={() => onArtworkError?.(stableArtwork)}
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.12] object-cover opacity-16 blur-[26px] saturate-[1.02]"
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

      <div className="relative z-1 flex h-full min-h-0 flex-col p-3">
        <div className="flex min-h-0 flex-1 flex-col justify-end">
          <div className="flex items-center justify-between gap-3">
            <MediaEntityHeader
              entityName={entityName}
              entityType={t(entityTypeKey)}
              size="large"
              isActive={isActive}
              accentColor={palette.highlight}
              titleStyle={{ color: fallbackTitleColor }}
              subtitleStyle={{ color: fallbackSubtitleColor }}
            />
            <div className="flex shrink-0 items-center gap-2.5 self-start">
              <MediaVisualizerButton
                isPlaying={isPlaying}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDialog();
                }}
                className={iconTone}
                style={{ color: textTokens.titleColor }}
              />
            </div>
          </div>

          <div className="mt-3 min-w-0">
            <div
              className={`truncate text-sm font-semibold ${iconTone}`}
              style={{ color: fallbackTitleColor }}
            >
              {title}
            </div>
            <div
              className={`truncate text-xs ${subtitleTone}`}
              style={{ color: fallbackSubtitleColor }}
            >
              {artist}
            </div>
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
                      ? `${getMediaProgressPercent(elapsedSeconds, durationSeconds)}%`
                      : '0%',
                }}
              />
            </div>
            <div
              className={`mt-1.5 flex items-center justify-between text-xs ${subtitleTone}`}
              style={{ color: fallbackSubtitleColor }}
            >
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
              disabled={!canPreviousTrack}
              onClick={(event) => {
                event.stopPropagation();
                onPrevious();
              }}
              className="border backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
              iconStyle={controlIconStyle}
              style={neutralButtonStyle}
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
                className="h-10.5 w-10.5 border backdrop-blur-xl transition-colors"
                iconStyle={controlIconStyle}
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
              disabled={!canNextTrack}
              onClick={(event) => {
                event.stopPropagation();
                onNext();
              }}
              className="border backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
              iconStyle={controlIconStyle}
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
              iconStyle={controlIconStyle}
              style={neutralButtonStyle}
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

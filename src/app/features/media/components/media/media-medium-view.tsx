import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { Slider } from '@/app/components/primitives/slider';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { MediaEntityTypeKey } from '../media-card/get-media-entity-type-key';
import { MediaArtworkSurface } from './media-artwork-surface';
import { MediaEntityHeader } from './media-entity-header';
import { MediaMarqueeText } from './media-marquee-text';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import { useMediaArtworkColors, withAlpha } from './use-media-artwork-colors';

interface MediaMediumViewProps {
  entityId: string;
  artwork?: string | null;
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
  onOpenDialog: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
}

export function MediaMediumView({
  entityId,
  artwork,
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
  onPrevious,
  onTogglePlay,
  onNext,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: MediaMediumViewProps) {
  const { t } = useI18n();
  const displayVolume = Math.max(0, Math.min(100, isMuted ? 0 : volume));
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const palette = useMediaArtworkColors(artwork, theme, entityId, `${title}::${artist}`);
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: palette.gradientEnd,
  });
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const elapsedLabel = formatMediaTime(Math.max(0, elapsedSeconds));
  const durationLabel = formatMediaTime(Math.max(durationSeconds, elapsedSeconds));
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('medium');
  const subduedFallback = !artwork;
  const neutralButtonStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(palette.highlight, 0.14),
    boxShadow: `inset 0 1px 0 ${withAlpha(palette.highlight, 0.12)}`,
  };
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

  return (
    <div className="relative -m-3 flex flex-1 overflow-hidden">
      <MediaArtworkSurface
        artwork={artwork}
        onArtworkError={onArtworkError}
        palette={palette}
        layout="split"
        artRegionClassName="w-[42%]"
        imagePaddingClassName=""
        imageClassName="object-cover object-left"
        subduedFallback={!artwork && !isActive}
      />

      <div className="relative z-[1] grid h-full w-full grid-cols-[44%_minmax(0,1fr)]">
        <div />

        <div className="flex min-w-0 flex-col pl-2 pr-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <MediaEntityHeader
              entityName={entityName}
              entityType={t(entityTypeKey)}
              size="medium"
              isActive={isActive}
              accentColor={palette.highlight}
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

          <div className="mt-auto flex items-end justify-between gap-5">
            <div className="min-w-0">
              <MediaMarqueeText
                text={title}
                className={`text-sm font-semibold ${iconTone}`}
                style={{ color: textTokens.titleColor }}
              />
              <MediaMarqueeText
                text={artist}
                className={`mt-0.5 text-xs ${subtitleTone}`}
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
                className="h-10 w-10 border backdrop-blur-xl transition-colors"
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

          <div className="mt-2.5">
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

          <div className="mt-3 flex items-center gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
}

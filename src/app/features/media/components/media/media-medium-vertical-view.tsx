import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { MediaArtworkSurface } from './media-artwork-surface';
import { getMediaControlStyles } from './media-control-styles';
import { MediaMarqueeText } from './media-marquee-text';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import { useMediaArtworkColors, withAlpha } from './use-media-artwork-colors';

interface MediaMediumVerticalViewProps {
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
  onOpenDialog?: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
}

export function MediaMediumVerticalView({
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
  onOpenDialog,
  onPrevious,
  onTogglePlay,
  onNext,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: MediaMediumVerticalViewProps) {
  const { t } = useI18n();
  const displayVolume = Math.max(0, Math.min(100, isMuted ? 0 : volume));
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const palette = useMediaArtworkColors(artwork, theme, `${entityId}::${title}::${artist}`);
  const textTokens = getCardReadableTextTokens({
    theme,
    baseColor: palette.highlight,
    backgroundColor: palette.gradientEnd,
  });
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const displayRemaining = formatMediaTime(Math.max(0, durationSeconds - elapsedSeconds));
  const controls = getMediaControlStyles(theme);
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('medium');
  const subduedFallback = !artwork;
  const playButtonStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.34)} 0%, ${withAlpha(palette.vibrant, 0.62)} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.22),
    boxShadow: `0 18px 42px -18px ${withAlpha(palette.vibrant, 0.7)}, inset 0 1px 0 ${withAlpha(palette.highlight, 0.22)}`,
  };
  const playGlowStyle = {
    background: `radial-gradient(circle, ${withAlpha(palette.vibrant, 0.5)} 0%, ${withAlpha(
      palette.highlight,
      0.2
    )} 38%, transparent 74%)`,
  };
  return (
    <div className="relative -m-6 flex h-[calc(100%+3rem)] flex-col overflow-hidden rounded-[inherit]">
      <MediaArtworkSurface
        artwork={artwork}
        onArtworkError={onArtworkError}
        palette={palette}
        layout="stacked"
        artRegionClassName="h-[52%]"
        imagePaddingClassName=""
        imageClassName="object-cover object-top"
        subduedFallback={!artwork && !isActive}
      />

      <div className="relative z-[1] flex h-full flex-col">
        <div className="h-[52%]" />

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-5">
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
            <div className="flex items-center gap-3">
              <MediaVisualizerButton
                isPlaying={isPlaying}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDialog?.();
                }}
                className={iconTone}
                style={{ color: textTokens.titleColor }}
              />
              {isPlaying && durationSeconds > 0 && (
                <span className={`text-xs ${subtitleTone}`}>{displayRemaining}</span>
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
              {!subduedFallback && (
                <div
                  className="pointer-events-none absolute inset-[-26%] rounded-full blur-3xl"
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
                aria-label={t('media.volume')}
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
    </div>
  );
}

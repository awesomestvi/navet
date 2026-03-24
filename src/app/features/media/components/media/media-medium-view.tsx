import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { RoundControlButton } from '@/app/components/shared/round-control-button';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { MediaArtworkSurface } from './media-artwork-surface';
import { MediaMarqueeText } from './media-marquee-text';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import { useMediaArtworkColors, withAlpha } from './use-media-artwork-colors';

interface MediaMediumViewProps {
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
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: MediaMediumViewProps) {
  const { t } = useI18n();
  const displayVolume = Math.max(0, Math.min(100, isMuted ? 0 : volume));
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const palette = useMediaArtworkColors(artwork, theme, `${entityId}::${title}::${artist}`);
  const iconTone = stateSurface.primaryTextClassName;
  const subtitleTone = stateSurface.secondaryTextClassName;
  const displayRemaining = formatMediaTime(Math.max(0, durationSeconds - elapsedSeconds));
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('medium');
  const subduedFallback = !artwork;
  const neutralButtonStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(palette.highlight, 0.14),
    boxShadow: `inset 0 1px 0 ${withAlpha(palette.highlight, 0.12)}`,
  };
  const playButtonStyle = {
    background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.34)} 0%, ${withAlpha(palette.vibrant, 0.62)} 100%)`,
    borderColor: withAlpha(palette.highlight, 0.22),
    boxShadow: `0 18px 42px -18px ${withAlpha(palette.vibrant, 0.7)}, inset 0 1px 0 ${withAlpha(palette.highlight, 0.22)}`,
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

  return (
    <div className="relative -m-5 flex flex-1 overflow-hidden">
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

        <div className="flex min-w-0 flex-col pl-2 pr-5 py-5">
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

          <div className="mt-auto flex items-end justify-between gap-5">
            <div className="min-w-0">
              <MediaMarqueeText text={title} className={`text-[15px] font-medium ${iconTone}`} />
              <MediaMarqueeText
                text={artist}
                className={`mt-0.5 text-[13px] ${subtitleTone}`}
                threshold={24}
              />
            </div>

            <div className="relative">
              {!subduedFallback && (
                <div
                  className="pointer-events-none absolute inset-[-26%] rounded-full blur-2xl"
                  style={playGlowStyle}
                />
              )}
              <RoundControlButton
                theme={theme}
                size="medium"
                variant="emphasis"
                aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePlay();
                }}
                className={`h-13 w-13 hover:scale-[1.03] active:scale-95 ${
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

          <div className="mt-4 flex items-center gap-2">
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

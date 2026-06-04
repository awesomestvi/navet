import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { Slider } from '@navet/app/components/primitives/slider';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { MediaEntityTypeKey } from '../media-card/get-media-entity-type-key';
import { MediaArtworkSurface } from './media-artwork-surface';
import { getMediaDisplayVolume, getMediaProgressPercent } from './media-card-style-utils';
import { MediaEntityHeader } from './media-entity-header';
import { MediaMarqueeText } from './media-marquee-text';
import { getMediaReadableForeground } from './media-readable-foreground';
import { formatMediaTime } from './media-time';
import { MediaVisualizerButton } from './media-visualizer-button';
import {
  getMediaArtworkPaletteSource,
  useMediaArtworkColors,
  withAlpha,
} from './use-media-artwork-colors';
import { useStableMediaArtwork } from './use-stable-media-artwork';

interface MediaMediumViewProps {
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

export function MediaMediumView({
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
  onPrevious,
  canPreviousTrack,
  onTogglePlay,
  onNext,
  canNextTrack,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: MediaMediumViewProps) {
  const { t } = useI18n();
  const displayVolume = getMediaDisplayVolume(volume, isMuted);
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
  const elapsedLabel = formatMediaTime(Math.max(0, elapsedSeconds));
  const durationLabel = formatMediaTime(Math.max(durationSeconds, elapsedSeconds));
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
  });
  const resolvedTitleColor = readableForeground.titleColor;
  const resolvedSubtitleColor = readableForeground.subtitleColor;
  const controlIconStyle = { color: resolvedTitleColor };
  const neutralButtonStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(resolvedSubtitleColor, 0.18),
    boxShadow: `inset 0 1px 0 ${withAlpha(resolvedTitleColor, 0.12)}`,
  };
  const playButtonStyle = {
    backgroundColor: withAlpha(palette.vibrant, 0.24),
    borderColor: withAlpha(resolvedSubtitleColor, 0.22),
    boxShadow: `inset 0 1px 0 ${withAlpha(resolvedTitleColor, 0.14)}`,
  };
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

  return (
    <div className="relative -m-3 flex flex-1 overflow-hidden rounded-[inherit]">
      {glassDepthOverlay}
      <MediaArtworkSurface
        artwork={stableArtwork}
        onArtworkError={onArtworkError}
        palette={palette}
        theme={theme}
        layout="split"
        artRegionClassName="w-[42%]"
        imagePaddingClassName=""
        imageClassName="object-cover object-left"
        subduedFallback={!stableArtwork && !isActive}
      />

      <div className="relative z-[2] grid h-full w-full grid-cols-[44%_minmax(0,1fr)]">
        <div />

        <div className="flex min-w-0 flex-col pl-3 pr-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <MediaEntityHeader
              entityName={entityName}
              entityType={t(entityTypeKey)}
              size="medium"
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

          <div className="mt-auto flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <MediaMarqueeText
                  text={title}
                  className={`text-sm font-semibold ${iconTone}`}
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
                  size="small"
                  variant="neutral"
                  aria-label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTogglePlay();
                  }}
                  className="h-9 w-9 border backdrop-blur-xl transition-colors"
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
            </div>

            <div>
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
                className={`mt-1 flex items-center justify-between text-xs ${subtitleTone}`}
                style={readableForeground.subtitleStyle}
              >
                <span>{elapsedLabel}</span>
                <span>{durationLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <RoundControlButton
                theme={theme}
                size="small"
                variant="neutral"
                aria-label={isMuted ? t('media.unmuteVolume') : t('media.muteVolume')}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleMute();
                }}
                className="h-8 w-8 border backdrop-blur-xl transition-colors"
                iconStyle={controlIconStyle}
                style={neutralButtonStyle}
              >
                {isMuted ? (
                  <VolumeX className={controlSizes.icon} />
                ) : (
                  <Volume2 className={controlSizes.icon} />
                )}
              </RoundControlButton>

              <div className="relative flex-1 px-1">
                <Slider
                  value={displayVolume}
                  ariaLabel={t('media.volume')}
                  onValueChange={onVolumeChange}
                  onInteractionStart={onVolumeInteractionStart}
                  onInteractionEnd={onVolumeInteractionEnd}
                  rootClassName="relative flex h-5 w-full items-center touch-none select-none"
                  trackClassName="relative h-[3px] grow rounded-full"
                  rangeClassName="absolute h-full rounded-full"
                  thumbClassName="block h-3.5 w-3.5 rounded-full outline-none"
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
                disabled={!canPreviousTrack}
                onClick={(event) => {
                  event.stopPropagation();
                  onPrevious();
                }}
                className="h-8 w-8 border backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                iconStyle={controlIconStyle}
                style={neutralButtonStyle}
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
                className="h-8 w-8 border backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                iconStyle={controlIconStyle}
                style={neutralButtonStyle}
              >
                <SkipForward className={controlSizes.icon} />
              </RoundControlButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

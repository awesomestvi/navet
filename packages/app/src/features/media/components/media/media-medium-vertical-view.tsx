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
import { getMediaDisplayVolume } from './media-card-style-utils';
import { MediaEntityHeader } from './media-entity-header';
import { MediaMarqueeText } from './media-marquee-text';
import { MediaVisualizerButton } from './media-visualizer-button';
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
  theme: ThemeType;
  onOpenDialog?: () => void;
  onToggleMute: () => void;
  onPrevious: () => void;
  canPreviousTrack: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  canNextTrack: boolean;
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
  theme,
  onOpenDialog,
  onToggleMute,
  onPrevious,
  canPreviousTrack,
  onTogglePlay,
  onNext,
  canNextTrack,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: MediaMediumVerticalViewProps) {
  const { t } = useI18n();
  const { containerRef, isVolumeMode, registerVolumeInteraction, toggleVolumeMode } =
    useMediaVolumeMode();
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
  const controlSizes = getCardActionControlSizes('small');
  const primaryControlSizes = getCardActionControlSizes('medium');
  const subduedFallback = !stableArtwork;
  const fallbackTitleColor =
    theme === 'light' && subduedFallback ? '#0f172a' : textTokens.titleColor;
  const fallbackSubtitleColor =
    theme === 'light' && subduedFallback ? '#475569' : textTokens.subtitleColor;
  const controlIconStyle = { color: fallbackTitleColor };
  const neutralButtonStyle = {
    backgroundColor: withAlpha(palette.darkMuted, 0.18),
    borderColor: withAlpha(fallbackSubtitleColor, 0.18),
    boxShadow: `inset 0 1px 0 ${withAlpha(fallbackTitleColor, 0.12)}`,
  };
  const volumeToggleButtonStyle = isVolumeMode
    ? {
        background: `linear-gradient(180deg, ${withAlpha(palette.highlight, 0.26)} 0%, ${withAlpha(
          palette.vibrant,
          0.44
        )} 100%)`,
        borderColor: withAlpha(fallbackSubtitleColor, 0.22),
        boxShadow: `0 10px 28px -18px ${withAlpha(palette.vibrant, 0.55)}, inset 0 1px 0 ${withAlpha(
          fallbackTitleColor,
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
        borderColor: withAlpha(fallbackSubtitleColor, 0.22),
        boxShadow: `0 10px 28px -18px ${withAlpha(palette.vibrant, 0.55)}, inset 0 1px 0 ${withAlpha(
          fallbackTitleColor,
          0.18
        )}`,
      }
    : neutralButtonStyle;
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
  return (
    <div
      ref={containerRef}
      className="relative -m-3 flex h-[calc(100%+1.5rem)] flex-col overflow-hidden rounded-[inherit]"
    >
      <MediaArtworkSurface
        artwork={stableArtwork}
        onArtworkError={onArtworkError}
        palette={palette}
        layout="stacked"
        artRegionClassName="h-[52%]"
        imagePaddingClassName=""
        imageClassName="object-cover object-top"
        subduedFallback={!stableArtwork && !isActive}
      />

      <div className="relative z-[1] flex h-full flex-col">
        <div className="h-[52%]" />

        <div className="flex min-h-0 flex-1 flex-col p-3">
          <div className="flex items-start justify-between gap-3">
            <MediaEntityHeader
              entityName={entityName}
              entityType={t(entityTypeKey)}
              size="medium-vertical"
              isActive={isActive}
              accentColor={palette.highlight}
              titleStyle={{ color: fallbackTitleColor }}
              subtitleStyle={{ color: fallbackSubtitleColor }}
            />
            <div className="flex shrink-0 items-center gap-3 self-start">
              <MediaVisualizerButton
                isPlaying={isPlaying}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDialog?.();
                }}
                className={iconTone}
                style={{ color: textTokens.titleColor }}
              />
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <MediaMarqueeText
                text={title}
                className={`text-xs font-semibold ${iconTone}`}
                style={{ color: fallbackTitleColor }}
              />
              <MediaMarqueeText
                text={artist}
                className={`mt-0.5 text-xs ${subtitleTone}`}
                threshold={24}
                style={{ color: fallbackSubtitleColor }}
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
                className="h-10 w-10 border backdrop-blur-xl transition-colors"
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

          <div className="mt-6 flex items-center gap-1.5">
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
              iconStyle={controlIconStyle}
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
                iconStyle={controlIconStyle}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

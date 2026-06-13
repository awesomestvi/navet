import type { TvRemoteAction } from '@navet/app/features/media/tv-remote-commands';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { House, Menu, Pause, Play, Undo2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { TvControlButton } from './tv-control-button';

interface TvTransportControlsProps {
  theme: ThemeType;
  isPlaying: boolean;
  remoteAvailable: boolean;
  controlStyle: CSSProperties;
  iconClassName: string;
  tvIconClass: string;
  playPauseSize?: 'small' | 'large';
  playPauseIconClass?: string;
  playPauseClassName?: string;
  showPlayPause?: boolean;
  onRemoteCommand: (action: TvRemoteAction) => void;
  onTogglePlay: () => void;
}

export function TvTransportControls({
  theme,
  isPlaying,
  remoteAvailable,
  controlStyle,
  iconClassName,
  tvIconClass,
  playPauseSize = 'small',
  playPauseIconClass,
  playPauseClassName,
  showPlayPause = true,
  onRemoteCommand,
  onTogglePlay,
}: TvTransportControlsProps) {
  const { t } = useI18n();

  return (
    <>
      {remoteAvailable ? (
        <TvControlButton
          theme={theme}
          size="small"
          label="Menu"
          style={controlStyle}
          iconClassName={iconClassName}
          onPress={() => onRemoteCommand('menu')}
        >
          <Menu className={tvIconClass} />
        </TvControlButton>
      ) : null}
      {remoteAvailable ? (
        <TvControlButton
          theme={theme}
          size="small"
          label="Home"
          style={controlStyle}
          iconClassName={iconClassName}
          onPress={() => onRemoteCommand('home')}
        >
          <House className={tvIconClass} />
        </TvControlButton>
      ) : null}
      {remoteAvailable ? (
        <TvControlButton
          theme={theme}
          size="small"
          label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
          style={controlStyle}
          className={playPauseClassName}
          iconClassName={iconClassName}
          onPress={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className={playPauseIconClass ?? tvIconClass} fill="currentColor" />
          ) : (
            <Play className={playPauseIconClass ?? tvIconClass} fill="currentColor" />
          )}
        </TvControlButton>
      ) : null}
      {remoteAvailable ? (
        <TvControlButton
          theme={theme}
          size="small"
          label="Back"
          style={controlStyle}
          iconClassName={iconClassName}
          onPress={() => onRemoteCommand('back')}
        >
          <Undo2 className={tvIconClass} />
        </TvControlButton>
      ) : null}
      {!remoteAvailable && showPlayPause ? (
        <TvControlButton
          theme={theme}
          size={playPauseSize}
          label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
          style={controlStyle}
          className={playPauseClassName}
          iconClassName={iconClassName}
          onPress={onTogglePlay}
        >
          {isPlaying ? (
            <Pause className={playPauseIconClass ?? tvIconClass} fill="currentColor" />
          ) : (
            <Play className={playPauseIconClass ?? tvIconClass} fill="currentColor" />
          )}
        </TvControlButton>
      ) : null}
    </>
  );
}

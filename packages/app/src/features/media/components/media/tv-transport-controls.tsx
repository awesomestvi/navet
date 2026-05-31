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
  onRemoteCommand,
  onTogglePlay,
}: TvTransportControlsProps) {
  const { t } = useI18n();

  return (
    <>
      <TvControlButton
        theme={theme}
        size="small"
        label="Menu"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('menu')}
      >
        <Menu className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label="Home"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('home')}
      >
        <House className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label="Back"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('back')}
      >
        <Undo2 className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label={isPlaying ? t('media.pausePlayback') : t('media.resumePlayback')}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={onTogglePlay}
      >
        {isPlaying ? (
          <Pause className={tvIconClass} fill="currentColor" />
        ) : (
          <Play className={tvIconClass} fill="currentColor" />
        )}
      </TvControlButton>
    </>
  );
}

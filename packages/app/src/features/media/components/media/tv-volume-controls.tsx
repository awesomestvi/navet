import type { TvRemoteAction } from '@navet/app/features/media/tv-remote-commands';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { ChevronDown, ChevronUp, Minus, Plus, Volume2, VolumeX } from 'lucide-react';
import type { CSSProperties } from 'react';
import { TvControlButton } from './tv-control-button';

interface TvVolumeControlsProps {
  theme: ThemeType;
  isMuted: boolean;
  volume: number;
  controlStyle: CSSProperties;
  iconClassName: string;
  tvIconClass: string;
  tvControlClusterGap: string;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onVolumeInteractionStart: () => void;
  onVolumeInteractionEnd: () => void;
}

export function TvVolumeControls({
  theme,
  isMuted,
  volume,
  controlStyle,
  iconClassName,
  tvIconClass,
  tvControlClusterGap,
  onToggleMute,
  onVolumeChange,
  onVolumeInteractionStart,
  onVolumeInteractionEnd,
}: TvVolumeControlsProps) {
  const { t } = useI18n();

  const updateVolume = (nextVolume: number) => {
    onVolumeInteractionStart();
    onVolumeChange(nextVolume);
    onVolumeInteractionEnd();
  };

  const handleVolumeUp = () => updateVolume(Math.min(100, volume + 10));
  const handleVolumeDown = () => updateVolume(Math.max(0, volume - 10));

  return (
    <div className={`flex min-w-0 items-center ${tvControlClusterGap}`}>
      <TvControlButton
        theme={theme}
        size="small"
        label="Volume down"
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={handleVolumeDown}
      >
        <Minus className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label={isMuted ? t('media.unmuteVolume') : t('media.muteVolume')}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={onToggleMute}
      >
        {isMuted ? <VolumeX className={tvIconClass} /> : <Volume2 className={tvIconClass} />}
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label="Volume up"
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={handleVolumeUp}
      >
        <Plus className={tvIconClass} />
      </TvControlButton>
    </div>
  );
}

interface TvChannelControlsProps {
  theme: ThemeType;
  remoteAvailable: boolean;
  controlStyle: CSSProperties;
  iconClassName: string;
  tvIconClass: string;
  tvControlClusterGap: string;
  onRemoteCommand: (action: TvRemoteAction) => void;
}

export function TvChannelControls({
  theme,
  remoteAvailable,
  controlStyle,
  iconClassName,
  tvIconClass,
  tvControlClusterGap,
  onRemoteCommand,
}: TvChannelControlsProps) {
  return (
    <div
      className={`flex min-w-0 items-center ${tvControlClusterGap} ${!remoteAvailable ? 'opacity-70' : ''}`}
    >
      <TvControlButton
        theme={theme}
        size="small"
        label="Channel down"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('channelDown')}
      >
        <ChevronDown className={tvIconClass} />
      </TvControlButton>
      <TvControlButton
        theme={theme}
        size="small"
        label="Channel up"
        disabled={!remoteAvailable}
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('channelUp')}
      >
        <ChevronUp className={tvIconClass} />
      </TvControlButton>
    </div>
  );
}

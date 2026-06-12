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
  canSetVolume: boolean;
  canMuteVolume: boolean;
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
  canSetVolume,
  canMuteVolume,
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

  if (!canSetVolume && !canMuteVolume) {
    return null;
  }

  return (
    <div className={`flex min-w-0 items-center ${tvControlClusterGap}`}>
      {canSetVolume ? (
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
      ) : null}
      {canMuteVolume ? (
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
      ) : null}
      {canSetVolume ? (
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
      ) : null}
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
  if (!remoteAvailable) {
    return null;
  }

  return (
    <div className={`flex min-w-0 items-center ${tvControlClusterGap}`}>
      <TvControlButton
        theme={theme}
        size="small"
        label="Channel down"
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
        style={controlStyle}
        iconClassName={iconClassName}
        onPress={() => onRemoteCommand('channelUp')}
      >
        <ChevronUp className={tvIconClass} />
      </TvControlButton>
    </div>
  );
}

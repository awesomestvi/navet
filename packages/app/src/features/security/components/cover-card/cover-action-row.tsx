import { CardActionRow } from '@navet/app/components/patterns/card-action-row';
import { CardSettingsActionButton } from '@navet/app/components/shared/card-settings-action-button';
import type { ThemeType } from '@navet/app/hooks';
import { useI18n } from '@navet/app/hooks';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CoverControlButton } from './cover-control-button';
import { CoverPauseIcon } from './cover-pause-icon';
import type { CoverIconButtonProps } from './types';

interface CoverActionRowProps {
  theme: ThemeType;
  size: 'small' | 'medium';
  position: number;
  settingsButtonProps: CoverIconButtonProps;
  onOpen: () => void;
  onStop: () => void;
  onClose: () => void;
  canOpen: boolean;
  canStop: boolean;
  canClose: boolean;
}

export function CoverActionRow({
  theme,
  size,
  position,
  settingsButtonProps,
  onOpen,
  onStop,
  onClose,
  canOpen,
  canStop,
  canClose,
}: CoverActionRowProps) {
  const { t } = useI18n();

  return (
    <CardActionRow
      theme={theme}
      size={size}
      leftContent={
        <div className="flex items-center gap-1.5">
          <CoverControlButton
            theme={theme}
            size={size}
            label={t('cover.open')}
            onClick={onOpen}
            disabled={!canOpen}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </CoverControlButton>
          <CoverControlButton
            theme={theme}
            size={size}
            label={t('cover.stop')}
            onClick={onStop}
            disabled={!canStop}
          >
            <CoverPauseIcon />
          </CoverControlButton>
          <CoverControlButton
            theme={theme}
            size={size}
            label={t('cover.close')}
            onClick={onClose}
            disabled={!canClose}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </CoverControlButton>
        </div>
      }
      rightContent={
        <CardSettingsActionButton
          {...settingsButtonProps}
          theme={theme}
          size={size}
          variant="soft"
          tone={position > 0 ? 'default' : 'muted'}
        />
      }
    />
  );
}

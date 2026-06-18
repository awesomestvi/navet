import { CardDialogChoicePill, CardDialogSection } from '@navet/app/components/patterns';
import { BaseCardDialogWithState, IconButton, Input } from '@navet/app/components/primitives';
import { getInheritedDialogSectionStyle } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { PhotoFrameSourceMode } from './photo-frame-types';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface PhotoFrameSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomValue: string;
  roomLabel: string;
  roomOptions: Array<{ label: string; value: string }>;
  onRoomChange?: (room: string) => void;
  sourceMode: PhotoFrameSourceMode;
  onSourceModeChange: (mode: PhotoFrameSourceMode) => void;
  photoUrls: string[];
  onUpdateUrls: (urls: string[]) => void;
  mediaSourceId?: string;
  onMediaSourceIdChange: (mediaSourceId: string) => void;
  shuffleEnabled?: boolean;
  onShuffleEnabledChange?: (enabled: boolean) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function PhotoFrameSettingsDialog({
  isOpen,
  onOpenChange,
  roomValue,
  roomLabel,
  roomOptions,
  onRoomChange,
  sourceMode,
  onSourceModeChange,
  photoUrls,
  onUpdateUrls,
  mediaSourceId,
  onMediaSourceIdChange,
  shuffleEnabled = true,
  onShuffleEnabledChange,
  tintColor,
  onTintColorChange,
}: PhotoFrameSettingsDialogProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const [inputValue, setInputValue] = useState('');
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor);
  const fieldStyle = {
    ...sectionStyle,
    background: surface.subtleFill,
  };
  const deleteButtonStyle = {
    borderColor:
      typeof sectionStyle?.borderColor === 'string' ? sectionStyle.borderColor : undefined,
    background: 'transparent',
  };
  const placeholderClassName =
    theme !== 'light' ? 'placeholder:text-white/72' : 'placeholder:text-gray-600';

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onUpdateUrls([...photoUrls, trimmed]);
    setInputValue('');
  };

  const handleRemove = (index: number) => {
    onUpdateUrls(photoUrls.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  const controlsTabContent = (
    <div className="space-y-4">
      <CardDialogSection label={t('widgets.photoFrame.settings.source')}>
        <div className="inline-flex items-center gap-1">
          <CardDialogChoicePill
            active={sourceMode === 'urls'}
            size="compact"
            onClick={() => onSourceModeChange('urls')}
          >
            {t('widgets.photoFrame.settings.sourceUrls')}
          </CardDialogChoicePill>
          <CardDialogChoicePill
            active={sourceMode === 'home-assistant'}
            size="compact"
            onClick={() => onSourceModeChange('home-assistant')}
          >
            {t('widgets.photoFrame.settings.sourceHomeAssistant')}
          </CardDialogChoicePill>
        </div>
      </CardDialogSection>

      {onShuffleEnabledChange ? (
        <CardDialogSection
          label={t('widgets.photoFrame.settings.shuffle')}
          helperText={t('widgets.photoFrame.settings.shuffleDescription')}
        >
          <div className="inline-flex items-center gap-1">
            <CardDialogChoicePill
              active={shuffleEnabled}
              size="compact"
              onClick={() => onShuffleEnabledChange(true)}
            >
              On
            </CardDialogChoicePill>
            <CardDialogChoicePill
              active={!shuffleEnabled}
              size="compact"
              onClick={() => onShuffleEnabledChange(false)}
            >
              Off
            </CardDialogChoicePill>
          </div>
        </CardDialogSection>
      ) : null}

      {sourceMode === 'urls' ? (
        <>
          <CardDialogSection label={t('widgets.photoFrame.settings.addUrl')} className="mb-4">
            <div className="flex gap-2">
              <Input
                type="url"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('widgets.photoFrame.settings.urlPlaceholder')}
                inputClassName={`flex-1 ${surface.borderClassName} bg-transparent ${surface.textPrimary} ${placeholderClassName} rounded-xl py-2`}
                style={fieldStyle}
              />
              <IconButton
                onClick={handleAdd}
                label={t('widgets.photoFrame.settings.addUrl')}
                icon={<Plus className={`h-4 w-4 ${surface.textSecondary}`} />}
                size="small"
                variant="subtle"
                className={`shrink-0 rounded-xl ${surface.borderClassName}`}
                style={fieldStyle}
              />
            </div>
          </CardDialogSection>

          <CardDialogSection label={t('widgets.photoFrame.settings.photos')}>
            {photoUrls.length === 0 ? (
              <p className={`py-4 text-center text-sm ${surface.textMuted}`}>
                {t('widgets.photoFrame.settings.noPhotos')}
              </p>
            ) : (
              <ul className="max-h-60 min-w-0 max-w-full space-y-1.5 overflow-y-auto">
                {photoUrls.map((url, index) => (
                  <li
                    key={`${url}-${index}`}
                    className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-sm"
                    style={{ background: surface.subtleFill }}
                  >
                    <span
                      className={`block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${surface.textSecondary}`}
                      title={url}
                    >
                      {url}
                    </span>
                    <IconButton
                      onClick={() => handleRemove(index)}
                      label={t('widgets.delete')}
                      icon={<Trash2 className={`h-3.5 w-3.5 ${surface.textSecondary}`} />}
                      size="small"
                      variant="ghost"
                      className={`shrink-0 rounded-xl ${surface.borderClassName}`}
                      style={deleteButtonStyle}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardDialogSection>
        </>
      ) : (
        <CardDialogSection
          label={t('widgets.photoFrame.settings.homeAssistantMedia')}
          helperText={t('widgets.photoFrame.settings.homeAssistantMediaDescription')}
        >
          <Input
            value={mediaSourceId ?? ''}
            onChange={(event) => onMediaSourceIdChange(event.target.value)}
            placeholder={t('widgets.photoFrame.settings.homeAssistantMediaPlaceholder')}
            inputClassName={`w-full ${surface.borderClassName} bg-transparent ${surface.textPrimary} ${placeholderClassName} rounded-xl py-2`}
            style={fieldStyle}
          />
        </CardDialogSection>
      )}
    </div>
  );

  return (
    <BaseCardDialogWithState
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('widgets.photoFrame.settings.title')}
      roomSelector={{
        value: roomValue,
        label: roomLabel,
        options: roomOptions,
        onChange: onRoomChange,
      }}
      controlsTabContent={controlsTabContent}
      tintColor={tintColor}
      onTintColorChange={onTintColorChange}
      defaultTintAccent="#f97316"
      theme={theme}
      height="capped"
    />
  );
}

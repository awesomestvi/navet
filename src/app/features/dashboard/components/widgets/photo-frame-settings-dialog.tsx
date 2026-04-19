import { Palette, Plus, Sliders, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  CardDialogChoicePill,
  CardDialogDoneFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';
import {
  customCardDialogShellProps,
  DialogShell,
  IconButton,
  Input,
} from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import {
  CompactRoomSelector,
  CustomCardTintPicker,
  CustomScrollbar,
} from '@/app/components/shared/device-editor';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { useI18n, useTheme } from '@/app/hooks';
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
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    {
      padding: false,
      height: 'capped',
    }
  );
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'controls' | 'card'>('controls');
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
    theme === 'light' ? 'placeholder:text-gray-600' : 'placeholder:text-white/72';
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

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <CustomScrollbar isOn={theme !== 'light'}>
        <div className="p-6">
          <CardDialogHeader
            title={t('widgets.photoFrame.settings.title')}
            showRoomSelector={false}
            eyebrow={
              <CompactRoomSelector
                value={roomValue}
                label={roomLabel}
                options={roomOptions}
                onChange={onRoomChange}
              />
            }
          />

          <Tabs
            value={activeTab}
            defaultValue="controls"
            onValueChange={(value) => setActiveTab(value as 'controls' | 'card')}
          >
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </CardDialogTabTrigger>
              {onTintColorChange ? (
                <CardDialogTabTrigger
                  active={activeTab === 'card'}
                  icon={Palette}
                  onClick={() => setActiveTab('card')}
                >
                  Customize
                </CardDialogTabTrigger>
              ) : null}
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5 space-y-4">
              <CardDialogSection label={t('widgets.photoFrame.settings.source')}>
                <div className="inline-flex items-center gap-1">
                  <CardDialogChoicePill
                    active={sourceMode === 'urls'}
                    onClick={() => onSourceModeChange('urls')}
                  >
                    {t('widgets.photoFrame.settings.sourceUrls')}
                  </CardDialogChoicePill>
                  <CardDialogChoicePill
                    active={sourceMode === 'home-assistant'}
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
                      onClick={() => onShuffleEnabledChange(true)}
                    >
                      On
                    </CardDialogChoicePill>
                    <CardDialogChoicePill
                      active={!shuffleEnabled}
                      onClick={() => onShuffleEnabledChange(false)}
                    >
                      Off
                    </CardDialogChoicePill>
                  </div>
                </CardDialogSection>
              ) : null}

              {sourceMode === 'urls' ? (
                <>
                  <CardDialogSection
                    label={t('widgets.photoFrame.settings.addUrl')}
                    className="mb-4"
                  >
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
            </TabPanel>

            {onTintColorChange ? (
              <TabPanel value="card" className="mt-5">
                <CustomCardTintPicker
                  value={tintColor}
                  onChange={onTintColorChange}
                  defaultColor="#f97316"
                  className={surface.textMuted}
                />
              </TabPanel>
            ) : null}
          </Tabs>

          <CardDialogDoneFooter label={t('common.done')} />
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
}

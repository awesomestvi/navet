import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  customCardDialogShellProps,
  DialogShell,
  IconButton,
  Input,
  Select,
  Switch,
} from '@/app/components/primitives';
import {
  CustomCardTintPicker,
  DialogHeader,
  DialogSectionRow,
} from '@/app/components/shared/device-editor';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@/app/hooks';
import type { PhotoFrameSourceMode } from './photo-frame-types';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface PhotoFrameSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    {
      fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl ${surface.panelClassName}`,
    }
  );
  const [inputValue, setInputValue] = useState('');
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor);
  const resolvedAccentColor =
    normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const fieldStyle = {
    ...sectionStyle,
    background: surface.subtleFill,
  };
  const switchStyle = shuffleEnabled
    ? {
        backgroundColor: resolvedAccentColor,
        borderColor: withTintAlpha(resolvedAccentColor, theme === 'light' ? 0.34 : 0.42),
      }
    : fieldStyle;
  const deleteButtonStyle = {
    borderColor:
      typeof sectionStyle?.borderColor === 'string' ? sectionStyle.borderColor : undefined,
    background: 'transparent',
  };
  const placeholderClassName =
    theme === 'light' ? 'placeholder:text-gray-600' : 'placeholder:text-white/72';
  const selectIndicatorClassName = theme === 'light' ? 'text-gray-600' : 'text-white/72';

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
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <DialogHeader title={t('widgets.photoFrame.settings.title')} isOn={theme !== 'light'} />

      {onTintColorChange ? (
        <CustomCardTintPicker
          value={tintColor}
          onChange={onTintColorChange}
          defaultColor="#f97316"
          className={surface.textMuted}
        />
      ) : null}

      <DialogSectionRow label={t('widgets.photoFrame.settings.source')}>
        <Select
          value={sourceMode}
          onChange={(event) => onSourceModeChange(event.target.value as PhotoFrameSourceMode)}
          selectClassName={`rounded-2xl border ${surface.borderClassName} bg-transparent ${surface.textPrimary}`}
          indicatorClassName={selectIndicatorClassName}
          style={fieldStyle}
        >
          <option value="urls">{t('widgets.photoFrame.settings.sourceUrls')}</option>
          <option value="home-assistant">
            {t('widgets.photoFrame.settings.sourceHomeAssistant')}
          </option>
        </Select>
      </DialogSectionRow>

      {onShuffleEnabledChange ? (
        <DialogSectionRow label={t('widgets.photoFrame.settings.shuffle')}>
          <div
            className={`flex items-center justify-between gap-4 rounded-2xl border px-3 py-3 text-sm ${surface.borderClassName}`}
            style={fieldStyle}
          >
            <div className="min-w-0">
              <p className={surface.textPrimary}>{t('widgets.photoFrame.settings.shuffle')}</p>
              <p className={`mt-1 text-xs ${surface.textSecondary}`}>
                {t('widgets.photoFrame.settings.shuffleDescription')}
              </p>
            </div>
            <Switch
              checked={shuffleEnabled}
              onCheckedChange={onShuffleEnabledChange}
              className={surface.borderClassName}
              style={switchStyle}
            />
          </div>
        </DialogSectionRow>
      ) : null}

      {sourceMode === 'urls' ? (
        <>
          <DialogSectionRow label={t('widgets.photoFrame.settings.addUrl')} className="mb-4">
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
          </DialogSectionRow>

          <DialogSectionRow label={t('widgets.photoFrame.settings.photos')}>
            {photoUrls.length === 0 ? (
              <p className={`py-4 text-center text-sm ${surface.textMuted}`}>
                {t('widgets.photoFrame.settings.noPhotos')}
              </p>
            ) : (
              <ul className="max-h-60 space-y-1.5 overflow-y-auto">
                {photoUrls.map((url, index) => (
                  <li
                    key={`${url}-${index}`}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
                    style={{ background: surface.subtleFill }}
                  >
                    <span className={`flex-1 truncate ${surface.textSecondary}`}>{url}</span>
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
          </DialogSectionRow>
        </>
      ) : (
        <DialogSectionRow label={t('widgets.photoFrame.settings.homeAssistantMedia')}>
          <div className="space-y-3">
            <Input
              value={mediaSourceId ?? ''}
              onChange={(event) => onMediaSourceIdChange(event.target.value)}
              placeholder={t('widgets.photoFrame.settings.homeAssistantMediaPlaceholder')}
              inputClassName={`w-full ${surface.borderClassName} bg-transparent ${surface.textPrimary} ${placeholderClassName} rounded-xl py-2`}
              style={fieldStyle}
            />
            <p className={`text-xs leading-5 ${surface.textMuted}`}>
              {t('widgets.photoFrame.settings.homeAssistantMediaDescription')}
            </p>
          </div>
        </DialogSectionRow>
      )}
    </DialogShell>
  );
}

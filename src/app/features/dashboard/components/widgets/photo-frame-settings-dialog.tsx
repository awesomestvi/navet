import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CustomCardTintPicker, DialogHeader } from '@/app/components/shared/device-editor';
import { customCardDialogShellProps, DialogShell } from '@/app/components/shared/dialog-shell';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { useI18n, useTheme } from '@/app/hooks';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface PhotoFrameSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrls: string[];
  onUpdateUrls: (urls: string[]) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function PhotoFrameSettingsDialog({
  isOpen,
  onOpenChange,
  photoUrls,
  onUpdateUrls,
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
      fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl ${surface.panelClassName}`,
    }
  );
  const [inputValue, setInputValue] = useState('');

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

      <div className="mb-3 flex gap-2">
        <input
          type="url"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('widgets.photoFrame.settings.urlPlaceholder')}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none ${surface.borderClassName} bg-transparent ${surface.textPrimary} placeholder:${surface.textMuted}`}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex h-9 w-9 items-center justify-center rounded-xl border transition-opacity hover:opacity-70"
          style={{ borderColor: surface.subtleFill }}
        >
          <Plus className={`h-4 w-4 ${surface.textSecondary}`} />
        </button>
      </div>

      {photoUrls.length === 0 ? (
        <p className={`py-4 text-center text-sm ${surface.textMuted}`}>
          {t('widgets.photoFrame.settings.noPhotos')}
        </p>
      ) : (
        <ul className="max-h-60 space-y-1.5 overflow-y-auto">
          {photoUrls.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm`}
              style={{ background: surface.subtleFill }}
            >
              <span className={`flex-1 truncate ${surface.textSecondary}`}>{url}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className={`shrink-0 ${surface.textMuted} hover:opacity-70`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </DialogShell>
  );
}

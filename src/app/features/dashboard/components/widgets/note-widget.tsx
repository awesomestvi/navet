import { Check, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { customCardDialogShellProps, DialogShell } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { CustomCardTintPicker, DialogHeader } from '@/app/components/shared/device-editor';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@/app/hooks';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface NoteWidgetProps {
  size?: CardSize;
  initialNote?: string;
  onNoteChange?: (note: string) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function NoteWidget({
  initialNote = '',
  onNoteChange,
  tintColor,
  onTintColorChange,
}: Omit<NoteWidgetProps, 'size'>) {
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
  const emptyNote = t('widgets.note.emptyState');
  const [note, setNote] = useState(initialNote || emptyNote);
  const [isEditing, setIsEditing] = useState(false);
  const [tempNote, setTempNote] = useState(note);

  const handleStartEdit = () => {
    setTempNote(note);
    setIsEditing(true);
  };

  const handleSave = () => {
    setNote(tempNote);
    setIsEditing(false);
    if (onNoteChange) {
      onNoteChange(tempNote);
    }
  };

  const handleCancel = () => {
    setTempNote(note);
    setIsEditing(false);
  };

  return (
    <div
      className={`${surface.panelClassName} relative flex h-full flex-col`}
      style={surface.panelStyle}
    >
      {surface.glowStyle ? <div className="absolute inset-0" style={surface.glowStyle} /> : null}
      {surface.overlayClassName ? (
        <div className={`pointer-events-none absolute inset-0 ${surface.overlayClassName}`} />
      ) : null}

      <div className="relative z-[2] flex h-full flex-col">
        {!isEditing ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: surface.subtleFill }}
          >
            <Edit2 className={`h-4 w-4 ${surface.textSecondary}`} />
          </button>
        ) : null}

        <div className="flex flex-1 flex-col">
          {isEditing ? null : (
            <button
              type="button"
              onClick={handleStartEdit}
              className={`flex-1 cursor-pointer rounded-xl p-3 text-left text-sm transition-colors ${
                note === emptyNote ? surface.textSecondary : surface.textPrimary
              }`}
              style={{ backgroundColor: surface.subtleFill }}
            >
              <p className="whitespace-pre-wrap">{note}</p>
            </button>
          )}
        </div>

        <DialogShell
          isOpen={isEditing}
          onOpenChange={(open) => {
            if (!open) {
              handleCancel();
            }
          }}
          overlayClassName={surface.dialogBackdrop}
          contentClassName={dialogShell.contentClassName}
          contentStyle={dialogShell.contentStyle}
          contentGlowStyle={dialogShell.contentGlowStyle}
          contentOverlayClassName={dialogShell.contentOverlayClassName}
        >
          <DialogHeader title={t('widgets.note.title')} isOn={theme !== 'light'} />

          {onTintColorChange ? (
            <CustomCardTintPicker
              value={tintColor}
              onChange={onTintColorChange}
              defaultColor="#f97316"
              className={surface.textMuted}
            />
          ) : null}

          <textarea
            value={tempNote}
            onChange={(e) => setTempNote(e.target.value)}
            className={`min-h-40 w-full resize-none rounded-xl p-3 text-sm focus:outline-none ${surface.textPrimary}`}
            style={{
              backgroundColor: surface.subtleFill,
              border: `2px solid ${getThemeColorValue(primaryColor)}`,
            }}
            placeholder={t('widgets.note.placeholder')}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${surface.textSecondary}`}
              style={{ backgroundColor: surface.subtleFill }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-lg py-2 text-xs font-medium text-white transition-colors"
              style={{ backgroundColor: getThemeColorValue(primaryColor) }}
            >
              <div className="flex items-center justify-center gap-1">
                <Check className="h-3 w-3" />
                <span>{t('widgets.note.save')}</span>
              </div>
            </button>
          </div>
        </DialogShell>
      </div>
    </div>
  );
}

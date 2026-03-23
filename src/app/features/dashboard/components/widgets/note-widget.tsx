import { Check, Edit2, StickyNote } from 'lucide-react';
import { useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useI18n, useTheme } from '@/app/hooks';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface NoteWidgetProps {
  size?: CardSize;
  initialNote?: string;
  onNoteChange?: (note: string) => void;
}

export function NoteWidget({ initialNote = '', onNoteChange }: Omit<NoteWidgetProps, 'size'>) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme);
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
    <div className={`${surface.panelClassName} h-full flex flex-col`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${getThemeColorValue(primaryColor)}20`,
            color: getThemeColorValue(primaryColor),
          }}
        >
          <StickyNote className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${surface.textPrimary}`}>
            {t('widgets.note.title')}
          </h3>
          <p className={`text-[10px] ${surface.textMuted} truncate`}>
            {t('widgets.common.widget')}
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: surface.subtleFill }}
          >
            <Edit2 className={`w-4 h-4 ${surface.textSecondary}`} />
          </button>
        )}
      </div>

      {/* Note Content */}
      <div className="flex-1 flex flex-col">
        {isEditing ? (
          <>
            <textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              className={`flex-1 resize-none rounded-xl p-3 text-sm focus:outline-none ${surface.textPrimary}`}
              style={{
                backgroundColor: surface.subtleFill,
                border: `2px solid ${getThemeColorValue(primaryColor)}`,
              }}
              placeholder={t('widgets.note.placeholder')}
            />
            <div className="flex gap-2 mt-3">
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
                className="flex-1 py-2 rounded-lg text-xs font-medium text-white transition-colors"
                style={{ backgroundColor: getThemeColorValue(primaryColor) }}
              >
                <div className="flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{t('widgets.note.save')}</span>
                </div>
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={handleStartEdit}
            className={`flex-1 p-3 rounded-xl text-sm cursor-pointer transition-colors text-left ${
              note === emptyNote ? surface.textSecondary : surface.textPrimary
            }`}
            style={{ backgroundColor: surface.subtleFill }}
          >
            <p className="whitespace-pre-wrap">{note}</p>
          </button>
        )}
      </div>
    </div>
  );
}

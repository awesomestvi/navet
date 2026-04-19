import { Edit2 } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  customCardDialogShellProps,
  DialogShell,
  Textarea,
} from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { CustomCardTintPicker, DialogHeader } from '@/app/components/shared/device-editor';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
  withTintAlpha,
} from '@/app/components/shared/theme/custom-card-tint-surface';
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
  const accentColor = normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    { maxWidth: 'md' }
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

  const paperShellClassName =
    theme === 'light'
      ? 'border-black/5 bg-[linear-gradient(180deg,rgba(255,252,244,0.98)_0%,rgba(255,248,232,0.98)_100%)]'
      : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,247,224,0.96)_0%,rgba(248,236,205,0.96)_100%)]';
  const ruledLineClassName =
    theme === 'light'
      ? 'bg-[repeating-linear-gradient(180deg,transparent_0,transparent_27px,rgba(148,163,184,0.22)_27px,rgba(148,163,184,0.22)_28px)]'
      : 'bg-[repeating-linear-gradient(180deg,transparent_0,transparent_27px,rgba(120,113,108,0.22)_27px,rgba(120,113,108,0.22)_28px)]';
  const editorPaperStyle = {
    background:
      theme === 'light'
        ? 'linear-gradient(180deg, rgba(255,252,244,0.99) 0%, rgba(255,248,232,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(255,250,236,0.96) 0%, rgba(248,236,205,0.94) 100%)',
    borderColor: theme === 'light' ? 'rgba(120, 113, 108, 0.18)' : 'rgba(255, 255, 255, 0.18)',
    boxShadow:
      theme === 'light'
        ? '0 18px 38px -30px rgba(120, 113, 108, 0.18)'
        : '0 18px 38px -30px rgba(15, 23, 42, 0.34)',
  };
  const editorTopSheenStyle = {
    background:
      theme === 'light'
        ? 'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 100%)',
  };
  const editorRuledLineStyle = {
    backgroundImage:
      theme === 'light'
        ? 'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(148,163,184,0.16) 27px, rgba(148,163,184,0.16) 28px)'
        : 'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(120,113,108,0.16) 27px, rgba(120,113,108,0.16) 28px)',
  };
  const binderHolesStyle = {
    backgroundImage:
      'radial-gradient(circle 6.5px at center 7px, rgba(255,255,255,0.68) 0 74%, rgba(0,0,0,0.14) 75% 88%, transparent 89%)',
    backgroundRepeat: 'repeat-y',
    backgroundSize: '14px 30px',
    backgroundPosition: 'center top',
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[28px]">
      <div className="relative z-[2] flex h-full flex-col">
        {!isEditing ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="absolute bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/70 text-amber-950/70 shadow-[0_6px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-opacity hover:opacity-90"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        ) : null}

        <div className={`relative flex flex-1 flex-col border ${paperShellClassName}`}>
          <div className="absolute inset-x-0 top-0 h-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.38),rgba(255,255,255,0.04))]" />
          <div
            className="absolute inset-y-0 left-3 w-3"
            style={binderHolesStyle}
            aria-hidden="true"
          />
          <div className={`absolute inset-0 ${ruledLineClassName}`} />

          {isEditing ? null : (
            <p
              className={`relative z-10 flex-1 whitespace-pre-wrap pb-[15px] pl-[35px] pr-[15px] pt-[30px] text-left text-[15px] leading-7 [text-wrap:pretty] ${
                note === emptyNote ? 'text-amber-950/45' : 'text-amber-950/85'
              }`}
            >
              {note}
            </p>
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

          <div className="relative overflow-hidden rounded-[24px] border" style={editorPaperStyle}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-10"
              style={editorTopSheenStyle}
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-3 w-3"
              style={binderHolesStyle}
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute inset-0" style={editorRuledLineStyle} />
            <Textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              containerClassName="w-full"
              textareaClassName="h-40 min-h-40 w-full resize-none border-0 bg-transparent pb-[15px] pl-[35px] pr-[15px] pt-[30px] align-top text-[15px] leading-7 text-amber-950/85 placeholder:text-amber-950/35 shadow-none"
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
              }}
              placeholder={t('widgets.note.placeholder')}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleCancel}
              variant="secondary"
              className="flex-1 rounded-full border py-2 text-xs shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
              style={{
                backgroundColor: withTintAlpha(accentColor, theme === 'light' ? 0.08 : 0.14),
                borderColor: withTintAlpha(accentColor, theme === 'light' ? 0.18 : 0.24),
                color: theme === 'light' ? '#6b4a2d' : 'rgba(255,255,255,0.78)',
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 rounded-full py-2 text-xs text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)]"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 10px 24px -12px ${withTintAlpha(accentColor, 0.55)}`,
              }}
            >
              {t('widgets.note.save')}
            </Button>
          </div>
        </DialogShell>
      </div>
    </div>
  );
}

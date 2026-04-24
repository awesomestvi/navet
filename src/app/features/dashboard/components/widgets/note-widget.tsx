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

  const noteTheme =
    theme === 'light'
      ? {
          paperShellClassName:
            'border-black/5 bg-[linear-gradient(180deg,rgba(255,252,244,0.98)_0%,rgba(255,248,232,0.98)_100%)]',
          ruledLineClassName:
            'bg-[repeating-linear-gradient(180deg,transparent_0,transparent_27px,rgba(148,163,184,0.22)_27px,rgba(148,163,184,0.22)_28px)]',
          editorPaperStyle: {
            background:
              'linear-gradient(180deg, rgba(255,252,244,0.99) 0%, rgba(255,248,232,0.98) 100%)',
            borderColor: 'rgba(120, 113, 108, 0.18)',
            boxShadow: '0 18px 38px -30px rgba(120, 113, 108, 0.18)',
          },
          editorTopSheenStyle: {
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 100%)',
          },
          editorRuledLineStyle: {
            backgroundImage:
              'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(148,163,184,0.16) 27px, rgba(148,163,184,0.16) 28px)',
          },
          noteTextClassName: 'text-amber-950/85',
          emptyNoteTextClassName: 'text-amber-950/45',
          editButtonClassName:
            'border border-black/10 bg-white/70 text-amber-950/70 shadow-[0_6px_24px_rgba(15,23,42,0.12)]',
          textareaClassName:
            'h-40 min-h-40 w-full resize-none border-0 bg-transparent pb-[15px] pl-[35px] pr-[15px] pt-[30px] align-top text-[15px] leading-7 text-amber-950/85 placeholder:text-amber-950/35 shadow-none',
        }
      : theme === 'black'
        ? {
            paperShellClassName:
              'border-white/8 bg-[linear-gradient(180deg,rgba(5,5,5,0.98)_0%,rgba(11,11,11,0.98)_100%)]',
            ruledLineClassName:
              'bg-[repeating-linear-gradient(180deg,transparent_0,transparent_27px,rgba(113,113,122,0.18)_27px,rgba(113,113,122,0.18)_28px)]',
            editorPaperStyle: {
              background: 'linear-gradient(180deg, rgba(5,5,5,0.99) 0%, rgba(11,11,11,0.98) 100%)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '0 18px 38px -30px rgba(0, 0, 0, 0.58)',
            },
            editorTopSheenStyle: {
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 100%)',
            },
            editorRuledLineStyle: {
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(113,113,122,0.14) 27px, rgba(113,113,122,0.14) 28px)',
            },
            noteTextClassName: 'text-zinc-100/88',
            emptyNoteTextClassName: 'text-zinc-500/80',
            editButtonClassName:
              'border border-white/10 bg-black/72 text-zinc-100/72 shadow-[0_10px_30px_rgba(0,0,0,0.42)]',
            textareaClassName:
              'h-40 min-h-40 w-full resize-none border-0 bg-transparent pb-[15px] pl-[35px] pr-[15px] pt-[30px] align-top text-[15px] leading-7 text-zinc-100/88 placeholder:text-zinc-500/72 shadow-none',
          }
        : {
            paperShellClassName:
              'border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(17,24,39,0.98)_46%,rgba(12,18,31,0.98)_100%)]',
            ruledLineClassName:
              'bg-[repeating-linear-gradient(180deg,transparent_0,transparent_27px,rgba(148,163,184,0.16)_27px,rgba(148,163,184,0.16)_28px)]',
            editorPaperStyle: {
              background:
                'linear-gradient(180deg, rgba(15,23,42,0.99) 0%, rgba(17,24,39,0.98) 46%, rgba(12,18,31,0.98) 100%)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              boxShadow: '0 18px 38px -30px rgba(2, 6, 23, 0.52)',
            },
            editorTopSheenStyle: {
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%)',
            },
            editorRuledLineStyle: {
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(148,163,184,0.12) 27px, rgba(148,163,184,0.12) 28px)',
            },
            noteTextClassName: 'text-slate-100/88',
            emptyNoteTextClassName: 'text-slate-400/70',
            editButtonClassName:
              'border border-white/12 bg-slate-950/70 text-slate-100/72 shadow-[0_10px_30px_rgba(2,6,23,0.38)]',
            textareaClassName:
              'h-40 min-h-40 w-full resize-none border-0 bg-transparent pb-[15px] pl-[35px] pr-[15px] pt-[30px] align-top text-[15px] leading-7 text-slate-100/88 placeholder:text-slate-400/68 shadow-none',
          };
  const binderHolesStyle = {
    backgroundImage:
      theme === 'light'
        ? 'radial-gradient(circle 6.5px at center 7px, rgba(255,255,255,0.68) 0 74%, rgba(0,0,0,0.14) 75% 88%, transparent 89%)'
        : theme === 'black'
          ? 'radial-gradient(circle 6.5px at center 7px, rgba(255,255,255,0.12) 0 72%, rgba(0,0,0,0.58) 73% 88%, transparent 89%)'
          : 'radial-gradient(circle 6.5px at center 7px, rgba(255,255,255,0.18) 0 72%, rgba(2,6,23,0.46) 73% 88%, transparent 89%)',
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
            className={`absolute bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-opacity hover:opacity-90 ${noteTheme.editButtonClassName}`}
          >
            <Edit2 className="h-4 w-4" />
          </button>
        ) : null}

        <div className={`relative flex flex-1 flex-col border ${noteTheme.paperShellClassName}`}>
          <div className="absolute inset-x-0 top-0 h-8" style={noteTheme.editorTopSheenStyle} />
          <div
            className="absolute inset-y-0 left-3 w-3"
            style={binderHolesStyle}
            aria-hidden="true"
          />
          <div className={`absolute inset-0 ${noteTheme.ruledLineClassName}`} />

          {isEditing ? null : (
            <p
              className={`relative z-10 flex-1 whitespace-pre-wrap pb-[15px] pl-[35px] pr-[15px] pt-[30px] text-left text-[15px] leading-7 [text-wrap:pretty] ${
                note === emptyNote ? noteTheme.emptyNoteTextClassName : noteTheme.noteTextClassName
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

          <div
            className="relative overflow-hidden rounded-[24px] border"
            style={noteTheme.editorPaperStyle}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-10"
              style={noteTheme.editorTopSheenStyle}
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-3 w-3"
              style={binderHolesStyle}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={noteTheme.editorRuledLineStyle}
            />
            <Textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              containerClassName="w-full"
              textareaClassName={noteTheme.textareaClassName}
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

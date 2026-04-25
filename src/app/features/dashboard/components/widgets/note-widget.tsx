import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button, Text, Textarea } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { getGradientColors } from '@/app/utils/color-utils';
import { DashboardCustomCardShell } from './dashboard-custom-card-shell';

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
  tintColor: _tintColor,
}: Omit<NoteWidgetProps, 'size'>) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const offStateGradient = getGradientColors(false, null, theme);
  const emptyNote = t('widgets.note.emptyState');
  const [note, setNote] = useState(initialNote);
  const [isEditing, setIsEditing] = useState(false);
  const [draftNote, setDraftNote] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleStartEdit = () => {
    setDraftNote(note);
    setIsEditing(true);
  };

  const handleSave = () => {
    const nextNote = draftNote.trim().length === 0 ? '' : draftNote;
    setNote(nextNote);
    setIsEditing(false);
    if (onNoteChange) {
      onNoteChange(nextNote);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.focus();
    const caretPosition = textarea.value.length;
    textarea.setSelectionRange(caretPosition, caretPosition);
  }, [isEditing]);

  const noteCardClassName = [
    'relative z-10 flex h-full flex-col overflow-hidden rounded-[22px] border',
    offStateGradient.border,
    offStateGradient.customGradient
      ? ''
      : `bg-gradient-to-br ${offStateGradient.from} ${offStateGradient.to}`,
  ]
    .filter(Boolean)
    .join(' ');
  const noteCardStyle: CSSProperties | undefined = offStateGradient.customGradient
    ? { background: offStateGradient.customGradient }
    : undefined;
  const noteReadInsetClassName = 'pl-8.75 pr-3 pt-3';
  const noteEditInsetClassName = 'pl-8.75 pr-3 pt-3';
  const noteTheme =
    theme === 'light'
      ? {
          ruledLineClassName:
            'bg-[repeating-linear-gradient(180deg,transparent_0,transparent_23px,rgba(115,115,115,0.08)_23px,rgba(115,115,115,0.08)_24px)] bg-[position:0_12px]',
          editorTopSheenStyle: {
            background: 'transparent',
          },
          noteTextClassName: 'text-[var(--color-gray-300)]',
          emptyNoteTextClassName: 'text-[color-mix(in_srgb,var(--color-gray-300)_72%,transparent)]',
          textareaClassName: `h-full min-h-0 w-full resize-none border-0 bg-transparent pb-[68px] ${noteEditInsetClassName} align-top ${navetTypographyTokens.body} text-[var(--color-gray-300)] placeholder:text-[color-mix(in_srgb,var(--color-gray-300)_56%,transparent)] shadow-none`,
        }
      : theme === 'black'
        ? {
            ruledLineClassName:
              'bg-[repeating-linear-gradient(180deg,transparent_0,transparent_23px,rgba(113,113,122,0.18)_23px,rgba(113,113,122,0.18)_24px)] bg-[position:0_12px]',
            editorTopSheenStyle: {
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 100%)',
            },
            noteTextClassName: 'text-[var(--color-gray-300)]',
            emptyNoteTextClassName:
              'text-[color-mix(in_srgb,var(--color-gray-300)_72%,transparent)]',
            textareaClassName: `h-full min-h-0 w-full resize-none border-0 bg-transparent pb-[68px] ${noteEditInsetClassName} align-top ${navetTypographyTokens.body} text-[var(--color-gray-300)] placeholder:text-[color-mix(in_srgb,var(--color-gray-300)_56%,transparent)] shadow-none`,
          }
        : {
            ruledLineClassName:
              'bg-[repeating-linear-gradient(180deg,transparent_0,transparent_23px,rgba(148,163,184,0.16)_23px,rgba(148,163,184,0.16)_24px)] bg-[position:0_12px]',
            editorTopSheenStyle: {
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%)',
            },
            noteTextClassName: 'text-[var(--color-gray-300)]',
            emptyNoteTextClassName:
              'text-[color-mix(in_srgb,var(--color-gray-300)_72%,transparent)]',
            textareaClassName: `h-full min-h-0 w-full resize-none border-0 bg-transparent pb-[68px] ${noteEditInsetClassName} align-top ${navetTypographyTokens.body} text-[var(--color-gray-300)] placeholder:text-[color-mix(in_srgb,var(--color-gray-300)_56%,transparent)] shadow-none`,
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
    <DashboardCustomCardShell theme={theme} size="large" tintColor={_tintColor}>
      <div className="relative flex h-full flex-col">
        <div className={noteCardClassName} style={noteCardStyle}>
          <div
            className="pointer-events-none absolute inset-y-0 left-3 w-3"
            style={binderHolesStyle}
            aria-hidden="true"
          />
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 bottom-6 ${noteTheme.ruledLineClassName}`}
          />

          {isEditing ? (
            <>
              <Textarea
                ref={textareaRef}
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                containerClassName="flex-1"
                textareaClassName={noteTheme.textareaClassName}
                style={{
                  background: 'transparent',
                  borderWidth: 0,
                  borderStyle: 'solid',
                  boxShadow: 'none',
                }}
                aria-label={t('widgets.note.title')}
              />
              <div className="absolute bottom-3 right-3 z-20">
                <Button
                  onClick={handleSave}
                  iconOnly
                  size="compact"
                  label={t('widgets.note.save')}
                  className="rounded-full border-transparent text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)]"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </Button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="relative flex flex-1 flex-col text-left transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
            >
              <Text
                as="p"
                className={`relative z-10 flex-1 whitespace-pre-wrap pb-3 ${noteReadInsetClassName} text-left text-pretty ${
                  note.length === 0 ? noteTheme.emptyNoteTextClassName : noteTheme.noteTextClassName
                }`}
              >
                {note.length === 0 ? emptyNote : note}
              </Text>
            </button>
          )}
        </div>
      </div>
    </DashboardCustomCardShell>
  );
}

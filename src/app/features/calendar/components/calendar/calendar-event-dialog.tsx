import * as Dialog from '@radix-ui/react-dialog';
import { Calendar, CalendarDays, ExternalLink, FileText, MapPin } from 'lucide-react';
import { DialogHeader } from '@/app/components/shared/device-editor';
import { DialogShell } from '@/app/components/shared/dialog-shell';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { formatCalendarEventTimeLabel } from './calendar-formatters';
import type { CalendarEvent } from './types';

interface CalendarEventDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeType;
}

export function CalendarEventDialog({
  event,
  isOpen,
  onOpenChange,
  theme,
}: CalendarEventDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const isOn = theme !== 'light';

  if (!event) {
    return null;
  }

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={`fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${surface.panel} ${surface.border}`}
    >
      <DialogHeader
        title={event.title}
        description={formatCalendarEventTimeLabel(event, t('calendar.allDay'))}
        isOn={isOn}
      />

      <div className="space-y-4">
        <div className={`rounded-2xl border p-4 ${surface.border} ${surface.subtleBg}`}>
          <div className={`mb-3 text-xs font-medium ${surface.textSecondary}`}>
            {t('calendar.event.details')}
          </div>
          <div className="space-y-3 text-sm">
            <div className={`flex items-center gap-2 ${surface.textPrimary}`}>
              <CalendarDays className="h-4 w-4" />
              <span>{event.sourceName ?? t('calendar.defaultSourceName')}</span>
            </div>

            <div className={`flex items-center gap-2 ${surface.textPrimary}`}>
              <Calendar className="h-4 w-4" />
              <span>{t('calendar.event.type')}</span>
            </div>

            {event.location && (
              <div className={`flex items-start gap-2 ${surface.textPrimary}`}>
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{event.location}</span>
              </div>
            )}

            {event.description && (
              <div className={`flex items-start gap-2 ${surface.textPrimary}`}>
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="whitespace-pre-wrap">{event.description}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {event.location && (
            <button
              type="button"
              onClick={() => {
                const location = event.location;
                if (!location) {
                  return;
                }

                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  location
                )}`;
                window.open(mapsUrl, '_blank', 'noopener,noreferrer');
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${surface.textPrimary} ${surface.subtleBg} ${surface.hoverBg}`}
            >
              <ExternalLink className="h-4 w-4" />
              {t('calendar.event.openMap')}
            </button>
          )}

          <Dialog.Close asChild>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-medium ${surface.textPrimary} ${surface.subtleBg} ${surface.hoverBg}`}
            >
              {t('common.done')}
            </button>
          </Dialog.Close>
        </div>
      </div>
    </DialogShell>
  );
}

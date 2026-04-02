import { Home, Play } from 'lucide-react';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import { DialogHeader } from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { getVacuumSettingsDialogSurface } from './vacuum-settings-dialog-surface';

interface VacuumSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartCleaning: () => void;
  onReturnHome: () => void;
  name: string;
  room: string;
  theme: ThemeType;
  accentColorValue: string;
}

export function VacuumSettingsDialog({
  entityId,
  isOpen,
  onClose,
  onStartCleaning,
  onReturnHome,
  name,
  room,
  theme,
  accentColorValue,
}: VacuumSettingsDialogProps) {
  const { t } = useI18n();
  const dialogSurface = getVacuumSettingsDialogSurface(theme);
  const fanSpeeds = [t('vacuum.speed.quiet'), t('vacuum.speed.standard'), t('vacuum.speed.max')];

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={() => onClose()}
      overlayClassName={dialogSurface.surface.dialogBackdrop}
      contentClassName={`fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border shadow-2xl ${dialogSurface.contentClassName} ${dialogSurface.surface.border}`}
    >
      <div className="p-6 pb-0">
        <DialogHeader
          title={t('vacuum.settings.title', { name })}
          description={`${name} - ${room}`}
          isOn={theme !== 'light'}
          supportingContent={
            <EntityRoomSelector entityId={entityId} label={t('vacuum.settings.room')} compact />
          }
        />
      </div>

      <div className="p-6 space-y-6">
        {/* Cleaning Modes */}
        <div>
          <h3 className={`mb-3 text-sm font-semibold ${dialogSurface.headingClassName}`}>
            {t('vacuum.settings.cleaningMode')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              t('vacuum.mode.auto'),
              t('vacuum.mode.spot'),
              t('vacuum.mode.edge'),
              t('vacuum.mode.room'),
            ].map((mode) => (
              <button
                type="button"
                key={mode}
                className={`rounded-xl border-2 py-3 text-sm font-medium transition-all hover:opacity-100 ${dialogSurface.optionButtonClassName}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Fan Speed */}
        <div>
          <h3 className={`mb-3 text-sm font-semibold ${dialogSurface.headingClassName}`}>
            {t('vacuum.settings.fanSpeed')}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {fanSpeeds.map((speed) => (
              <button
                type="button"
                key={speed}
                className={`rounded-xl border-2 py-3 text-sm font-medium transition-all hover:opacity-100 ${dialogSurface.optionButtonClassName}`}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div>
          <h3 className={`mb-3 text-sm font-semibold ${dialogSurface.headingClassName}`}>
            {t('vacuum.settings.actions')}
          </h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={onStartCleaning}
              className="w-full py-3 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColorValue }}
            >
              <Play className="w-4 h-4" />
              {t('vacuum.action.startCleaning')}
            </button>
            <button
              type="button"
              onClick={onReturnHome}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium transition-colors ${dialogSurface.secondaryButtonClassName}`}
            >
              <Home className="w-4 h-4" />
              {t('vacuum.action.returnToDock')}
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

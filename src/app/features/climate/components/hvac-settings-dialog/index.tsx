import { Flame, Power, Snowflake, Wind } from 'lucide-react';
import { memo } from 'react';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import { CustomScrollbar, DialogHeader } from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { getHVACSettingsDialogStyles } from './styles';
import type { HVACSettingsDialogProps } from './types';

export const HVACSettingsDialog = memo(function HVACSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  name,
  room,
  isOn,
  mode,
  targetTemp,
  currentTemp,
  onModeChange,
  onTogglePower,
}: HVACSettingsDialogProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const styles = getHVACSettingsDialogStyles(mode, isOn);

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={`fixed top-1/2 left-1/2 z-50 h-auto max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 ${styles.contentClassName}`}
    >
      <CustomScrollbar isOn={isOn}>
        <div className="p-8">
          <DialogHeader
            title={t('climate.settings.title')}
            description={`${name} - ${room}`}
            isOn={isOn}
            supportingContent={
              <EntityRoomSelector entityId={entityId} label={t('climate.settings.room')} compact />
            }
          />

          <div className="space-y-8">
            {/* Temperature Display */}
            <div>
              <div className={`mb-3 text-xs ${styles.sectionLabelClassName}`}>
                {t('climate.temperature')}
              </div>
              <div className={styles.infoPanelClassName}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xs ${styles.sectionLabelClassName}`}>
                      {t('climate.target')}
                    </div>
                    <div
                      className={`mt-1 text-4xl font-bold leading-none ${styles.targetValueClassName}`}
                    >
                      {targetTemp}°C
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs ${styles.sectionLabelClassName}`}>
                      {t('climate.current')}
                    </div>
                    <div
                      className={`mt-1 text-2xl font-bold leading-none ${styles.currentValueClassName}`}
                    >
                      {currentTemp}°C
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mode Selection */}
            <div>
              <div className={`mb-3 text-xs ${styles.sectionLabelClassName}`}>
                {t('climate.mode')}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => onModeChange('cool')}
                  disabled={!isOn}
                  className={`flex flex-col items-center gap-3 rounded-2xl p-4 transition-all disabled:opacity-50 ${styles.modeButtonClassName('cool')}`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${styles.modeIconWrapClassName('cool')}`}
                  >
                    <Snowflake className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">{t('climate.mode.cool')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onModeChange('heat')}
                  disabled={!isOn}
                  className={`flex flex-col items-center gap-3 rounded-2xl p-4 transition-all disabled:opacity-50 ${styles.modeButtonClassName('heat')}`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${styles.modeIconWrapClassName('heat')}`}
                  >
                    <Flame className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">{t('climate.mode.heat')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onModeChange('fan')}
                  disabled={!isOn}
                  className={`flex flex-col items-center gap-3 rounded-2xl p-4 transition-all disabled:opacity-50 ${styles.modeButtonClassName('fan')}`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${styles.modeIconWrapClassName('fan')}`}
                  >
                    <Wind className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">{t('climate.mode.fan')}</span>
                </button>
              </div>
            </div>

            {/* Power Control */}
            <div>
              <div className={`mb-3 text-xs ${styles.sectionLabelClassName}`}>
                {t('climate.power')}
              </div>
              <button
                type="button"
                onClick={onTogglePower}
                className={`flex w-full items-center justify-between rounded-2xl p-4 transition-all ${styles.powerButtonClassName}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${styles.powerIconWrapClassName}`}
                  >
                    <Power className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {isOn ? t('climate.turnOff') : t('climate.turnOn')}
                  </span>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${styles.powerStatusClassName}`}
                >
                  {isOn ? t('common.on') : t('common.off')}
                </div>
              </button>
            </div>
          </div>
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
});

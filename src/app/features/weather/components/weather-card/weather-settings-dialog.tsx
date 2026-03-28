import { DialogHeader, DialogSectionRow } from '@/app/components/shared/device-editor';
import { DialogShell } from '@/app/components/shared/dialog-shell';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';

interface WeatherSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeType;
  title: string;
  location: string;
}

export function WeatherSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  theme,
  title,
  location,
}: WeatherSettingsDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const isOn = theme !== 'light';

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={`fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-6 shadow-2xl backdrop-blur-xl ${surface.panel} ${surface.border}`}
    >
      <DialogHeader
        title={t('weather.settings.title', { name: title })}
        description={location}
        isOn={isOn}
      />
      <DialogSectionRow label={t('common.room')}>
        <EntityRoomSelector entityId={entityId} label={t('common.room')} compact />
      </DialogSectionRow>
    </DialogShell>
  );
}

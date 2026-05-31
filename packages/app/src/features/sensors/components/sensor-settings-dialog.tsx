import { CardDialogBody, CardDialogHeader } from '@navet/app/components/patterns';
import { DialogDoneFooter, ModalSurface } from '@navet/app/components/primitives';
import { CustomScrollbar, IconPicker } from '@navet/app/components/shared/device-editor';
import { useI18n } from '@navet/app/hooks';
import { Palette } from 'lucide-react';
import { memo } from 'react';

interface SensorSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  entityType: string;
  selectedIcon: string;
  onIconChange: (iconName: string) => void;
}

export const SensorSettingsDialog = memo(function SensorSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  name,
  entityType,
  selectedIcon,
  onIconChange,
}: SensorSettingsDialogProps) {
  const { t } = useI18n();

  return (
    <ModalSurface
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={name}
      description={entityType}
      disableOpenAutoFocus
      contentClassName="h-auto max-h-[85vh] max-w-md"
    >
      <CustomScrollbar>
        <CardDialogBody>
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />

          <div className="mt-5 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-medium text-white/82">
              <Palette className="h-3.5 w-3.5" />
              {t('common.customize')}
            </div>

            <IconPicker
              selectedIcon={selectedIcon}
              onIconChange={onIconChange}
              isLightOn={false}
              label={t('sensors.card.icon')}
            />
          </div>

          <DialogDoneFooter label={t('common.done')} />
        </CardDialogBody>
      </CustomScrollbar>
    </ModalSurface>
  );
});

import { CardDialogBody, CardDialogHeader } from '@navet/app/components/patterns';
import { BaseCardDialog, Button } from '@navet/app/components/primitives';
import { CustomScrollbar, IconPicker } from '@navet/app/components/shared/device-editor';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
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
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <BaseCardDialog
      variant="modal"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={name}
      description={entityType}
      theme={theme}
      disableOpenAutoFocus
      contentClassName="h-auto max-h-[85vh] max-w-md"
      bodyPadding={false}
    >
      <CustomScrollbar>
        <CardDialogBody>
          <CardDialogHeader
            title={name}
            description={entityType}
            entityId={entityId}
            theme={theme}
          />

          <div className="mt-5 space-y-6">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${surface.textSecondary} ${surface.border} ${surface.subtleBg}`}
            >
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

          <div className="mt-6 flex justify-end">
            <Button variant="soft" size="small" onClick={() => onOpenChange(false)}>
              {t('common.done')}
            </Button>
          </div>
        </CardDialogBody>
      </CustomScrollbar>
    </BaseCardDialog>
  );
});
